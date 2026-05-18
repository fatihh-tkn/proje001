"""
backend/services/archive_service.py
----------------------------------------------------------------------
Arşiv arka plan servisleri: transkripsiyon, vektörizasyon ve otomatik
dosya bağlantısı (auto-link) mantığı.

Bu modül FastAPI route'larından bağımsız olarak test edilebilir;
hiçbir router/FastAPI nesnesi içermez.
"""
import os
import logging
import threading

from core.logger import get_logger

logger = get_logger("services.archive")

# ── Ses / Video uzantıları ──────────────────────────────────────────
AUDIO_EXTS = {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma"}
VIDEO_EXTS = {"mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"}
AV_EXTS    = AUDIO_EXTS | VIDEO_EXTS

# ── Eş zamanlı yükleme race condition çözümü ───────────────────────
# İşlendi ama eşleşme bulunamayan dosyalar buraya eklenir.
# Yeni bir dosya işlenince _try_batch_relink tüm bekleyenleri yeniden dener.
_PENDING_RELINK: dict = {}
_RELINK_LOCK    = threading.Lock()


# ── Yardımcı ───────────────────────────────────────────────────────

def _set_transcription_status(doc_id: str, status: str, error_msg: str = "") -> None:
    """Transkripsiyon durumunu DB'de günceller."""
    from database.sql.session import get_session
    from database.sql.models import Belge
    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if belge:
                meta = dict(belge.meta or {})
                meta["transcription_status"] = status
                if error_msg:
                    meta["transcription_error"] = error_msg
                belge.meta = meta
                db.commit()
    except Exception as e:
        logger.error("Durum güncelleme hatası: %s", e)


# ── Transkripsiyon ─────────────────────────────────────────────────

def run_transcription(doc_id: str) -> None:
    """
    Arka planda çalışan transkripsiyon işlevi.
    - Belgeyi DB'den alır
    - audio_processor ile Whisper transkripsiyon yapar
    - Chunk'ları ChromaDB + SQL'e kaydeder
    - meta.transcription_status = "done" günceller
    - Video dosyaları: orijinal video arşivde kalır, sadece ses işlenir
    """
    import uuid as _uuid
    from database.sql.session import get_session
    from database.sql.models import Belge, VektorParcasi, BilgiIliskisi
    from services.processors.audio_processor import parse_audio
    from database.vector.pgvector_db import vector_db
    from sqlalchemy import select

    logger.info("Transkripsiyon başlıyor: doc_id=%s", doc_id)

    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if not belge:
                logger.error("Belge bulunamadı: %s", doc_id)
                return

            b_depo = belge.depolama_yolu
            b_ad   = belge.dosya_adi

            if not b_depo or not os.path.exists(b_depo):
                logger.error("Dosya diskde yok: %s", b_depo)
                _set_transcription_status(doc_id, "failed", "Dosya diskde bulunamadı.")
                return

            meta = dict(belge.meta or {})
            meta["transcription_status"] = "processing"
            belge.meta = meta
            db.commit()

        result = parse_audio(file_path=b_depo, original_name=b_ad, task_id=doc_id)

        chunks         = result.get("chunks", [])
        formatted_text = result.get("formatted_text", "")
        raw_text       = result.get("raw_text", "")

        if not chunks:
            _set_transcription_status(doc_id, "failed", "Transkripsiyon boş döndü.")
            return

        if len(chunks) == 1 and chunks[0].get("metadata", {}).get("type") == "error":
            err_text = chunks[0]["text"]
            logger.error("Transkripsiyon hatası: %s", err_text)
            _set_transcription_status(doc_id, "failed", err_text[:300])
            return

        coll_name = "yilgenci_collection"
        texts     = [c["text"] for c in chunks]
        metadatas = []
        ids       = []
        for c in chunks:
            cid  = c.get("id") or str(_uuid.uuid4())
            meta = c.get("metadata", {})
            clean = {"sql_doc_id": doc_id, "sqlite_doc_id": doc_id}
            for k, v in meta.items():
                clean[k] = v if isinstance(v, (str, int, float, bool)) else str(v)
            metadatas.append(clean)
            ids.append(cid)

        vector_db.add_documents(
            collection_name=coll_name,
            documents=texts,
            metadatas=metadatas,
            ids=ids,
        )
        logger.info("ChromaDB'ye %d chunk yazıldı.", len(ids))

        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if not belge:
                return

            eski = list(db.scalars(
                select(VektorParcasi).where(VektorParcasi.belge_kimlik == doc_id)
            ).all())
            if eski:
                for p in eski:
                    db.delete(p)
                db.flush()

            yeni_parcalar = []
            for i, c in enumerate(chunks):
                m = c.get("metadata", {})
                start_fmt = m.get("start_time_fmt", "")
                end_fmt   = m.get("end_time_fmt", "")
                ts_prefix = f"[{start_fmt} - {end_fmt}] " if start_fmt else ""
                p = VektorParcasi(
                    belge_kimlik=doc_id,
                    chromadb_kimlik=ids[i],
                    icerik=(ts_prefix + c["text"])[:1000],
                    konum_imi=(
                        f"{m.get('source', b_ad)} | "
                        f"{start_fmt} - {end_fmt}"
                    ),
                )
                yeni_parcalar.append(p)

            db.add_all(yeni_parcalar)
            db.flush()

            for i in range(len(yeni_parcalar) - 1):
                db.add(BilgiIliskisi(
                    kaynak_parca_kimlik=yeni_parcalar[i].kimlik,
                    hedef_parca_kimlik=yeni_parcalar[i + 1].kimlik,
                    iliski_turu="next_chunk",
                    agirlik=1.0,
                ))

            meta = dict(belge.meta or {})
            meta["transcription_status"]      = "done"
            meta["transcription_chunk_count"] = len(chunks)
            meta["transcription_language"]    = (
                chunks[0].get("metadata", {}).get("language", "?") if chunks else "?"
            )
            meta.pop("transcription_error", None)
            meta["transcription_full_text"] = formatted_text or raw_text
            meta["transcription_raw_text"]  = raw_text
            meta["transcription_preview"]   = raw_text[:600]

            belge.meta               = meta
            belge.vektorlestirildi_mi = True
            belge.vektordb_koleksiyon = coll_name
            belge.parca_sayisi        = len(chunks)
            db.commit()

        logger.info("Transkripsiyon tamamlandı: doc_id=%s, %d chunk", doc_id, len(chunks))

    except Exception as e:
        logger.exception("Transkripsiyon işlem hatası: %s", e)
        _set_transcription_status(doc_id, "failed", str(e)[:300])


# ── Vektörizasyon ──────────────────────────────────────────────────

def run_vectorization(doc_id: str) -> None:
    """
    Arka planda çalışan vektörizasyon işlevi.
    PDF/DOCX/TXT/görsel dosyaları işler; teknik_resim kategorisi vision pipeline'a girer.
    """
    import uuid as _uuid
    from database.sql.session import get_session
    from database.sql.models import Belge, VektorParcasi, BilgiIliskisi
    from services.processors import dispatch
    from services.processors.process_progress import (
        set_current_doc, update as pg_update, step as pg_step,
        done as pg_done, fail as pg_fail,
    )
    from database.vector.pgvector_db import vector_db
    from sqlalchemy import select

    logger.info("Vektörizasyon başlıyor: doc_id=%s", doc_id)
    set_current_doc(doc_id)
    pg_update(doc_id, "Dosya işleme alındı…")

    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if not belge:
                logger.error("Belge bulunamadı: %s", doc_id)
                return

            b_depo = belge.depolama_yolu
            b_ad   = belge.dosya_adi
            b_turu = belge.dosya_turu
            b_kat  = belge.kategori

            if not b_depo or not os.path.exists(b_depo):
                logger.error("Dosya diskde yok: %s", b_depo)
                _set_transcription_status(doc_id, "failed", "Dosya diskde bulunamadı.")
                pg_fail(doc_id, "Dosya diskde bulunamadı")
                return

            meta = dict(belge.meta or {})
            meta["transcription_status"] = "processing"
            belge.meta = meta
            db.commit()

        if b_kat == "teknik_resim":
            pg_step("Teknik dosya hazırlanıyor…")
        else:
            pg_step("İçerik ayrıştırılıyor…")

        chunks, _ = dispatch(
            file_path=b_depo,
            ext=b_turu,
            use_vision=False,
            original_name=b_ad,
            kategori=b_kat,
        )

        pptx_pdf_path = None
        if b_turu in ("pptx", "ppt"):
            basename     = os.path.splitext(os.path.basename(b_depo))[0]
            expected_pdf = os.path.join(os.path.dirname(b_depo), f"{basename}.pdf")
            if os.path.exists(expected_pdf):
                pptx_pdf_path = expected_pdf

        if not chunks:
            _set_transcription_status(doc_id, "failed", "Vektörizasyon boş döndü.")
            pg_fail(doc_id, "İçerik çıkarılamadı")
            return

        if len(chunks) == 1:
            c0_meta = chunks[0].get("metadata", {})
            c0_type = c0_meta.get("type", "")
            if "error" in c0_meta or c0_type in ("error", "unsupported", "dwg_hata"):
                err_text = c0_meta.get("error") or c0_meta.get("vision_error") or chunks[0]["text"]
                logger.error("Vektörizasyon hatası: %s", err_text)
                _set_transcription_status(doc_id, "failed", str(err_text)[:300])
                pg_fail(doc_id, f"Hata: {str(err_text)[:60]}")
                return

        saved_vision_data = None

        if b_kat == "teknik_resim":
            pg_step("Vision verisi kaydediliyor…")
            chunk_meta   = chunks[0].get("metadata", {}) if chunks else {}
            vision_data  = chunk_meta.get("vision_data")
            vision_error = chunk_meta.get("vision_error", "")
            with get_session() as db:
                belge = db.get(Belge, doc_id)
                if not belge:
                    return
                meta = dict(belge.meta or {})
                if vision_data:
                    meta["transcription_status"] = "done"
                    meta.pop("transcription_error", None)
                    meta["vision_analysis"] = vision_data
                    meta.pop("vision_error", None)
                    saved_vision_data = vision_data
                    img_type = vision_data.get("image_type", "")
                    if img_type == "nesting":
                        meta["cad_turu"] = "nesting"
                    elif img_type in ("teknik_resim", "step_model"):
                        meta["cad_turu"] = "cad"
                else:
                    meta["transcription_status"] = "failed"
                    meta["transcription_error"]  = vision_error or "Vision analizi sonuç üretemedi"
                    if vision_error:
                        meta["vision_error"] = vision_error
                    logger.error("Vision AI hatası: doc_id=%s hata=%s", doc_id, vision_error)
                belge.meta = meta
                belge.vektorlestirildi_mi = bool(vision_data)
                db.commit()
            if vision_data:
                logger.info("Teknik resim analizi tamamlandı: doc_id=%s", doc_id)
            else:
                pg_fail(doc_id, f"Vision hatası: {(vision_error or '')[:60]}")
                return

        else:
            pg_step(f"Vektörler hesaplanıyor… ({len(chunks)} parça)")

            coll_name = "yilgenci_collection"
            texts     = [c["text"] for c in chunks]
            metadatas = []
            ids       = []
            for c in chunks:
                cid       = c.get("id") or str(_uuid.uuid4())
                meta_data = c.get("metadata", {})
                clean = {"sql_doc_id": doc_id, "sqlite_doc_id": doc_id}
                for k, v in meta_data.items():
                    clean[k] = v if isinstance(v, (str, int, float, bool)) else str(v)
                metadatas.append(clean)
                ids.append(cid)

            vector_db.add_documents(
                collection_name=coll_name,
                documents=texts,
                metadatas=metadatas,
                ids=ids,
            )
            logger.info("ChromaDB'ye %d text chunk yazıldı.", len(ids))

            pg_step("Veritabanına kaydediliyor…")

            with get_session() as db:
                belge = db.get(Belge, doc_id)
                if not belge:
                    return

                eski = list(db.scalars(
                    select(VektorParcasi).where(VektorParcasi.belge_kimlik == doc_id)
                ).all())
                if eski:
                    for p in eski:
                        db.delete(p)
                    db.flush()

                yeni_parcalar = []
                for i, c in enumerate(chunks):
                    p = VektorParcasi(
                        belge_kimlik=doc_id,
                        chromadb_kimlik=ids[i],
                        icerik=c["text"][:1000],
                        konum_imi=f"Sayfa/Parça {c.get('metadata', {}).get('page', i+1)}",
                    )
                    yeni_parcalar.append(p)

                db.add_all(yeni_parcalar)
                db.flush()

                for i in range(len(yeni_parcalar) - 1):
                    db.add(BilgiIliskisi(
                        kaynak_parca_kimlik=yeni_parcalar[i].kimlik,
                        hedef_parca_kimlik=yeni_parcalar[i + 1].kimlik,
                        iliski_turu="next_chunk",
                        agirlik=1.0,
                    ))

                if pptx_pdf_path:
                    belge.meta = dict(belge.meta or {})
                    belge.meta["orijinal_format"] = b_turu
                    belge.meta["orijinal_yol"]    = b_depo
                    belge.dosya_adi               = os.path.splitext(b_ad)[0] + ".pdf"
                    belge.dosya_turu              = "pdf"
                    belge.depolama_yolu           = pptx_pdf_path
                    belge.dosya_boyutu_bayt       = os.path.getsize(pptx_pdf_path)

                meta = dict(belge.meta or {})
                meta["transcription_status"]      = "done"
                meta["transcription_chunk_count"] = len(chunks)
                meta.pop("transcription_error", None)

                if chunks:
                    vision_data = chunks[0].get("metadata", {}).get("vision_data")
                    if vision_data:
                        meta["vision_analysis"] = vision_data
                        saved_vision_data = vision_data

                belge.meta                = meta
                belge.vektorlestirildi_mi = True
                belge.vektordb_koleksiyon = coll_name
                belge.parca_sayisi        = len(chunks)
                db.commit()

            logger.info("Vektörizasyon tamamlandı: doc_id=%s, %d chunk", doc_id, len(chunks))

        if saved_vision_data and b_kat == "teknik_resim":
            pg_step("Malzeme numarası eşleştiriliyor…")
            linked = try_auto_link_by_number(doc_id, saved_vision_data)
            if not linked:
                with _RELINK_LOCK:
                    _PENDING_RELINK[doc_id] = saved_vision_data
            try_batch_relink(doc_id)

        pg_done(doc_id, "Analiz tamamlandı ✓")

    except Exception as e:
        logger.exception("Vektörizasyon işlem hatası: %s", e)
        _set_transcription_status(doc_id, "failed", str(e)[:300])
        pg_fail(doc_id, f"Hata: {str(e)[:80]}")


# ── Otomatik bağlantı ──────────────────────────────────────────────

def try_auto_link_by_number(doc_id: str, vision_data: dict) -> bool:
    """
    Vision analizi tamamlandıktan sonra malzeme numarası veya dosya adına
    göre otomatik bağlantı kurar. Bağlantı kurulursa True döner.
    """
    import re as _re
    from database.sql.session import get_session
    from database.sql.models import Belge
    from sqlalchemy import select

    _TEKNIK  = {"teknik_resim", "step_model"}
    _NESTING = {"nesting"}

    def _norm(s: str) -> str:
        return _re.sub(r"[^A-Z0-9]", "", s.upper())

    _SAP_RE = _re.compile(r'\b(\d{7,10})\b')

    def _number_keys(vd: dict, filename: str = "") -> set:
        keys: set = set()
        for section_key in ("parca_tanim", "geometrik", "malzeme_uretim", "toleranslar", "izlenebilirlik"):
            section = vd.get(section_key) or {}
            if not isinstance(section, dict):
                continue
            for val in section.values():
                if not val:
                    continue
                for m in _SAP_RE.finditer(str(val)):
                    keys.add(m.group(1))
        if filename:
            stem = filename.rsplit(".", 1)[0] if "." in filename else filename
            for part in _re.split(r'[-.,\s_/]+', stem):
                clean = part.replace(".", "")
                if _re.fullmatch(r'\d{7,10}', clean):
                    keys.add(clean)
        return keys

    def _name_key(filename: str) -> str:
        stem = filename.rsplit(".", 1)[0] if "." in filename else filename
        return _norm(stem)

    def _nesting_ids(bagli: dict) -> list:
        n = bagli.get("nesting")
        if not n:
            return []
        return n if isinstance(n, list) else [n]

    def _do_link(db, src_id: str, tgt_id: str, reason: str) -> bool:
        src = db.get(Belge, src_id)
        tgt = db.get(Belge, tgt_id)
        if not src or not tgt:
            return False
        sm = dict(src.meta or {})
        sb = sm.setdefault("bagli_dosyalar", {})
        existing = _nesting_ids(sb)
        if tgt_id in existing:
            return False
        sb["nesting"] = existing + [tgt_id]
        src.meta = sm
        tm = dict(tgt.meta or {})
        tm.setdefault("bagli_dosyalar", {})["cizim"] = src_id
        tgt.meta = tm
        db.commit()
        logger.info("Otomatik eşleşme: %s ↔ %s (%s)", src_id, tgt_id, reason)
        return True

    img_type = vision_data.get("image_type", "")
    if img_type not in _TEKNIK and img_type not in _NESTING:
        return False

    try:
        with get_session() as db:
            current = db.get(Belge, doc_id)
            if not current:
                return False

            cur_bagli = (current.meta or {}).get("bagli_dosyalar", {})
            if img_type in _NESTING and cur_bagli.get("cizim"):
                return False
            if img_type in _TEKNIK and cur_bagli.get("cad"):
                return False

            candidates = list(db.scalars(
                select(Belge).where(
                    Belge.kategori == "teknik_resim",
                    Belge.kimlik != doc_id,
                )
            ).all())

            def _valid_cands(cands):
                for c in cands:
                    c_vision = (c.meta or {}).get("vision_analysis")
                    if not c_vision:
                        continue
                    c_type = c_vision.get("image_type", "")
                    if img_type in _TEKNIK  and c_type not in _NESTING:
                        continue
                    if img_type in _NESTING and c_type not in _TEKNIK:
                        continue
                    c_bagli = (c.meta or {}).get("bagli_dosyalar", {})
                    if img_type in _TEKNIK:
                        if c_bagli.get("cizim") or c_bagli.get("cad"):
                            continue
                    else:
                        if c_bagli.get("cad"):
                            continue
                        if doc_id in _nesting_ids(c_bagli):
                            continue
                    yield c, c_vision

            def _src_tgt(cand_id: str) -> tuple:
                if img_type in _TEKNIK:
                    return doc_id, cand_id
                return cand_id, doc_id

            my_num_keys = _number_keys(vision_data, current.dosya_adi or "")

            for cand, c_vision in _valid_cands(candidates):
                matched = my_num_keys & _number_keys(c_vision, cand.dosya_adi or "")
                if matched:
                    src_id, tgt_id = _src_tgt(cand.kimlik)
                    if _do_link(db, src_id, tgt_id, f"numara:{next(iter(matched))}"):
                        return True

            my_name = _name_key(current.dosya_adi or "")
            if not my_name:
                return False

            for cand, _ in _valid_cands(candidates):
                if _name_key(cand.dosya_adi or "") == my_name:
                    src_id, tgt_id = _src_tgt(cand.kimlik)
                    if _do_link(db, src_id, tgt_id, f"dosya_adi:{my_name}"):
                        return True

            return False

    except Exception as e:
        logger.warning("Otomatik bağlantı hatası: %s", e)
    return False


def try_batch_relink(trigger_doc_id: str) -> None:
    """
    Yeni bir dosya işlenince daha önce eşleşme bulamayan belgeler için
    yeniden bağlantı denemesi yapar.
    """
    from database.sql.session import get_session
    from database.sql.models import Belge

    with _RELINK_LOCK:
        if not _PENDING_RELINK:
            return
        pending = list(_PENDING_RELINK.items())

    for doc_id, v_data in pending:
        if doc_id == trigger_doc_id:
            continue
        try:
            with get_session() as db:
                belge = db.get(Belge, doc_id)
                if not belge:
                    with _RELINK_LOCK:
                        _PENDING_RELINK.pop(doc_id, None)
                    continue
                bagli = (belge.meta or {}).get("bagli_dosyalar", {})
                if bagli.get("nesting") or bagli.get("cizim") or bagli.get("cad"):
                    with _RELINK_LOCK:
                        _PENDING_RELINK.pop(doc_id, None)
                    continue

            linked = try_auto_link_by_number(doc_id, v_data)
            if linked:
                with _RELINK_LOCK:
                    _PENDING_RELINK.pop(doc_id, None)
                logger.info("Geç eşleşme başarılı: %s (tetikleyen: %s)", doc_id, trigger_doc_id)
        except Exception as e:
            logger.warning("Batch relink hatası doc_id=%s: %s", doc_id, e)
