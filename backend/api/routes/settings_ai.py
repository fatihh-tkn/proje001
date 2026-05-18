"""
settings_ai.py — AI ve sistem konfigürasyonu endpoint'leri.

Kapsam:
  - RAG kalibrasyon parametreleri (/rag)
  - Feature flag'ler (/feature-flags)
  - Vision model seçimi (/vision-model)
  - Teknik döküman işleme ayarları (/doc-processing)
  - Global zeka modeli ayarları (/intelligence-model)
  - Agent rol atamaları (/agent-assignments)
  - Prompt şablonları (/prompts, /prompts/reset/{key})
"""

from fastapi import APIRouter, HTTPException

router = APIRouter()


# ── RAG Kalibrasyon (SistemAyari tablosu) ────────────────────────────────────

RAG_KEYS = [
    {"key": "GENERAL_RAG_TOP_K",                   "label": "Genel RAG Top-K",              "type": "int",   "default": 10,   "min": 1,  "max": 50,  "desc": "Semantik aramada kaç sonuç getirileceği"},
    {"key": "FILE_MODE_MAX_CHUNKS",                 "label": "Dosya Modu Maks. Chunk",       "type": "int",   "default": 40,   "min": 5,  "max": 200, "desc": "Dosya bazlı sorguda maksimum parça sayısı"},
    {"key": "CHUNK_CHAR_LIMIT",                     "label": "Chunk Karakter Limiti",        "type": "int",   "default": 2000, "min": 500,"max": 8000,"desc": "Her parçanın LLM'e gönderilecek karakter limiti"},
    {"key": "MAX_HISTORY_TURNS",                    "label": "Konuşma Hafızası (Tur)",       "type": "int",   "default": 2,    "min": 0,  "max": 20,  "desc": "LLM'e dahil edilecek geçmiş konuşma turu sayısı"},
    {"key": "LLM_PRE_FILTER_DISTANCE_THRESHOLD",   "label": "Mesafe Eşiği (Distance)",      "type": "float", "default": 1.6,  "min": 0.1,"max": 3.0, "desc": "Vektör uzaklığı bu değeri aşan sonuçlar elenir (düşük = daha katı)"},
    {"key": "daily_cost_cap_usd",                  "label": "Günlük Maliyet Tavanı ($)",     "type": "float", "default": 0.0,  "min": 0.0,"max": 10000.0, "desc": "0 = devre dışı. Aşıldığında LLM çağrıları durur, kullanıcıya uyarı döner."},
    {"key": "monthly_cost_cap_usd",                "label": "Aylık Maliyet Tavanı ($)",      "type": "float", "default": 0.0,  "min": 0.0,"max": 100000.0,"desc": "0 = devre dışı. Bu ay için toplam harcamayı sınırlar."},
]


@router.get("/rag")
def get_rag_settings():
    """SistemAyari tablosundan RAG parametrelerini okur."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select

    with get_session() as db:
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

    result = []
    for meta in RAG_KEYS:
        raw = rows.get(meta["key"])
        if raw is not None:
            try:
                value = float(raw) if meta["type"] == "float" else int(raw)
            except (TypeError, ValueError):
                value = meta["default"]
        else:
            value = meta["default"]
        result.append({**meta, "value": value})
    return {"settings": result}


@router.post("/rag")
def save_rag_settings(body: dict):
    """RAG parametrelerini SistemAyari tablosuna yazar."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    updates: dict = body.get("settings", {})
    allowed_keys = {m["key"] for m in RAG_KEYS}

    with get_session() as db:
        for key, value in updates.items():
            if key not in allowed_keys:
                continue
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == key))
            now = datetime.datetime.utcnow().isoformat()
            if row:
                row.deger = value
                row.guncelleme_tarihi = now
            else:
                db.add(SistemAyari(
                    anahtar=key,
                    deger=value,
                    aciklama=next((m["desc"] for m in RAG_KEYS if m["key"] == key), ""),
                    hassas_mi=False,
                    olusturulma_tarihi=now,
                    guncelleme_tarihi=now,
                ))
        db.commit()
    return {"ok": True}


# ── Feature Flags (Boolean SistemAyari kayıtları) ─────────────────────────────

FEATURE_FLAGS = [
    {
        "key": "agent_graph_enabled",
        "label": "LangGraph Pipeline (multi-agent)",
        "desc": (
            "Sohbet istekleri supervisor → uzman ajanlar (RAG + hata çözümü "
            "+ Z'li rapor + n8n) → birleştirici → revize akışından geçer. "
            "Kapalıyken klasik AIService akışına düşer (acil rollback için)."
        ),
        "default": True,
    },
]


@router.get("/feature-flags")
def get_feature_flags():
    """SistemAyari tablosundan boolean özellik bayraklarını döner."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select

    with get_session() as db:
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

    def _to_bool(raw, default):
        if raw is None:
            return bool(default)
        return str(raw).strip().lower() in ("1", "true", "yes", "on")

    flags = []
    for meta in FEATURE_FLAGS:
        flags.append({**meta, "value": _to_bool(rows.get(meta["key"]), meta["default"])})
    return {"flags": flags}


@router.post("/feature-flags")
def save_feature_flags(body: dict):
    """Boolean özellik bayraklarını yazar."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    updates: dict = body.get("flags", {})
    allowed_keys = {m["key"] for m in FEATURE_FLAGS}

    with get_session() as db:
        for key, value in updates.items():
            if key not in allowed_keys:
                continue
            str_val = "true" if bool(value) else "false"
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == key))
            now = datetime.datetime.utcnow().isoformat()
            if row:
                row.deger = str_val
                row.guncelleme_tarihi = now
            else:
                db.add(SistemAyari(
                    anahtar=key,
                    deger=str_val,
                    aciklama=next((m["desc"] for m in FEATURE_FLAGS if m["key"] == key), ""),
                    hassas_mi=False,
                    olusturulma_tarihi=now,
                    guncelleme_tarihi=now,
                ))
        db.commit()
    return {"ok": True}


# ── Vision Model (Derin AI Görsel Okuma için kullanılacak model) ──────────────

@router.get("/vision-model")
def get_vision_model():
    """Mevcut vision model seçimini ve kullanılabilir modelleri döner."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari, AIModeli
    from services.crypto_service import decrypt as _decrypt
    from sqlalchemy import select

    with get_session() as db:
        row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "vision_model_id"))
        selected_id = str(row.deger) if row and row.deger else None

        rows = list(db.scalars(
            select(AIModeli).where(AIModeli.aktif_mi == True).order_by(AIModeli.olusturulma_tarihi)
        ).all())
        models = []
        for m in rows:
            key = _decrypt(m.api_anahtari) or ""
            masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
            models.append({
                "id": m.kimlik,
                "name": m.ad,
                "provider": m.tedarikci or "",
                "masked_key": masked,
                "model_id": m.model_id or "",
                "ready": bool(m.model_id and m.model_id.strip()),
            })

    return {"models": models, "selected_id": selected_id}


@router.post("/vision-model")
def save_vision_model(body: dict):
    """Vision model seçimini SistemAyari tablosuna yazar. model_id=None → seçimi kaldır."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    model_id = body.get("model_id")
    now = datetime.datetime.utcnow().isoformat()

    with get_session() as db:
        row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "vision_model_id"))
        if row:
            row.deger = model_id
            row.guncelleme_tarihi = now
        else:
            db.add(SistemAyari(
                anahtar="vision_model_id",
                deger=model_id,
                aciklama="Derin AI Görsel Okuma için kullanılacak AIModeli ID'si",
                hassas_mi=False,
                olusturulma_tarihi=now,
                guncelleme_tarihi=now,
            ))
        db.commit()
    return {"ok": True}


# ── Teknik Döküman İşleme Ayarları ───────────────────────────────────────────

DOC_MACHINE_OUTPUT_GROUPS = [
    {
        "group_key": "makine_kimlik",
        "label": "Makine Kimlik Bilgileri",
        "fields": [
            {"key": "makine_tipi",      "label": "Makine Tipi"},
            {"key": "marka_model",      "label": "Marka / Model"},
            {"key": "uretim_yili",      "label": "Üretim Yılı"},
            {"key": "seri_numarasi",    "label": "Seri Numarası"},
        ],
    },
    {
        "group_key": "calisma_mantigi",
        "label": "Çalışma Mantığı",
        "fields": [
            {"key": "calisma_prensibi",  "label": "Çalışma Prensibi"},
            {"key": "kontrol_sistemi",   "label": "Kontrol Sistemi"},
            {"key": "uretim_kapasitesi", "label": "Üretim Kapasitesi (adet/saat, m/dak vb.)"},
            {"key": "hassasiyet",        "label": "İşleme Hassasiyeti"},
            {"key": "malzeme_uyumlulugu","label": "Uyumlu Malzeme Türleri"},
        ],
    },
    {
        "group_key": "enerji_teknik",
        "label": "Enerji & Teknik Özellikler",
        "fields": [
            {"key": "motor_gucu",       "label": "Motor Gücü (kW / hp)"},
            {"key": "enerji_tipi",      "label": "Enerji Tipi"},
            {"key": "sicaklik_araligi", "label": "Çalışma Sıcaklık Aralığı"},
            {"key": "devir_hizi",       "label": "Devir / Hız (RPM, m/dak)"},
            {"key": "besleme_gerilimi", "label": "Besleme Gerilimi / Faz"},
        ],
    },
    {
        "group_key": "maliyet_sure",
        "label": "Maliyet & Süre Çıktıları",
        "fields": [
            {"key": "tahmini_islem_suresi",  "label": "Tahmini İşlem Süresi (dak)"},
            {"key": "tahmini_maliyet",       "label": "Tahmini Maliyet (TL)"},
            {"key": "hazirlik_suresi",       "label": "Hazırlık / Setup Süresi (dak)"},
            {"key": "enerji_tuketimi",       "label": "Enerji Tüketimi (kWh/adet)"},
        ],
    },
]

_MACHINE_PROMPT_INSTRUCTION = """Bu teknik çizim veya makine belgesi için aşağıdaki JSON formatında makine analizi yap.
SADECE JSON döndür, markdown kod bloğu veya açıklama yazma. Bulunamayan alanları boş string olarak bırak.
Maliyet ve süre hesaplamasında sağlanan parametre değerlerini kullan."""


def _build_machine_prompt_from_groups(enabled_keys: set, params: dict) -> str:
    import json as _json
    schema: dict = {"image_type": "makine_belgesi"}
    for group in DOC_MACHINE_OUTPUT_GROUPS:
        group_schema = {f["key"]: "" for f in group["fields"] if f["key"] in enabled_keys}
        if group_schema:
            schema[group["group_key"]] = group_schema
    if params:
        schema["hesaplama_parametreleri"] = {
            "saat_ucreti_tl":  params.get("saat_ucreti", 0),
            "setup_suresi_dk": params.get("setup_suresi", 0),
            "verimlilik_pct":  params.get("verimlilik", 85),
        }
    return _MACHINE_PROMPT_INSTRUCTION + "\n\n" + _json.dumps(schema, indent=2, ensure_ascii=False)


DOC_PROCESSING_FLAGS = [
    {
        "key": "doc_machine_enabled",
        "label": "Makine Bilgisi Analizi",
        "desc": "Teknik çizimden makine tipi, çalışma prensibi ve kapasite bilgilerini çıkarır; maliyet ve süre hesaplaması yapar.",
        "default": False,
    },
    {
        "key": "doc_vision_enabled",
        "label": "Görsel Analiz (PNG/JPG/WEBP/TIFF)",
        "desc": "Arşive yüklenen görsel dosyalar Vision AI ile analiz edilir; teknik çizim detayları RAG'a eklenir.",
        "default": True,
    },
    {
        "key": "doc_pdf_vision_enabled",
        "label": "PDF Vision Analizi",
        "desc": "PDF yüklendiğinde sayfalar görüntüye çevrilip Vision AI'a gönderilir. Taranmış veya CAD çıktısı PDF'ler için önerilir.",
        "default": False,
    },
    {
        "key": "doc_pptx_vision_enabled",
        "label": "PPTX Slayt Analizi",
        "desc": "Yüklenen PPTX dosyalarının slaytları görüntüye dönüştürülerek Vision AI ile analiz edilir.",
        "default": False,
    },
    {
        "key": "doc_auto_vectorize",
        "label": "Otomatik Vektörizasyon",
        "desc": "Yükleme sonrasında belgeler arka planda otomatik vektörize edilir ve RAG havuzuna eklenir.",
        "default": True,
    },
]

DOC_OUTPUT_GROUPS = [
    {
        "group_key": "parca_tanim",
        "label": "Parça Tanım Bilgileri",
        "fields": [
            {"key": "parca_adi",       "label": "Parça Adı (Benennung)"},
            {"key": "parca_kodu",      "label": "Parça Kodu"},
            {"key": "cizim_numarasi",  "label": "Çizim Numarası (Zeichnungsnummer)"},
            {"key": "kimlik_numarasi", "label": "Kimlik Numarası (Identnummer)"},
            {"key": "sayfa_bilgisi",   "label": "Sayfa Bilgisi"},
        ],
    },
    {
        "group_key": "geometrik",
        "label": "Geometrik / Boyutsal Bilgiler",
        "fields": [
            {"key": "acilim_uzunlugu",  "label": "Açılım Uzunluğu (Abwicklung)"},
            {"key": "boyutlar",         "label": "Boyutlar (en, boy, yükseklik)"},
            {"key": "bukme_yaricapi",   "label": "Bükme Yarıçapı"},
            {"key": "kenar_mesafeleri", "label": "Kenar Mesafeleri"},
            {"key": "kesit",            "label": "Kesit (genişlik × kalınlık)"},
            {"key": "olcek",            "label": "Ölçek (Maßstab)"},
        ],
    },
    {
        "group_key": "malzeme_uretim",
        "label": "Malzeme ve Üretim Bilgileri",
        "fields": [
            {"key": "malzeme",         "label": "Malzeme"},
            {"key": "agirlik",         "label": "Ağırlık (Fertiggewicht)"},
            {"key": "yuzey_standardi", "label": "Yüzey İşlem Standardı"},
            {"key": "kesim_standardi", "label": "Kesim Standardı"},
            {"key": "sayfa_formati",   "label": "Sayfa Formatı"},
        ],
    },
    {
        "group_key": "toleranslar",
        "label": "Tolerans Standartları",
        "fields": [
            {"key": "talasli_tolerans",  "label": "Talaşlı İmalat (Spanende Bearbeitung)"},
            {"key": "talassiz_tolerans", "label": "Talaşsız İmalat (Spanlose Bearbeitung)"},
            {"key": "kaynakli_tolerans", "label": "Kaynaklı Konstrüksiyon"},
            {"key": "dokum_tolerans",    "label": "Döküm Parçalar (Gussstelle)"},
        ],
    },
    {
        "group_key": "izlenebilirlik",
        "label": "İzlenebilirlik / Onay Bilgileri",
        "fields": [
            {"key": "cizim_tarihi",   "label": "Çizim Tarihi"},
            {"key": "cizen",          "label": "Çizen (Gez.)"},
            {"key": "onaylayan",      "label": "Onaylayan"},
            {"key": "kalite_kontrol", "label": "Kalite Kontrol"},
            {"key": "cad_bilgisi",    "label": "CAD Çizim Bilgisi (3D)"},
        ],
    },
]

_PROMPT_INSTRUCTION = """Bu teknik çizimi analiz et ve aşağıdaki JSON formatında yanıt ver.
SADECE JSON döndür, markdown kod bloğu veya açıklama yazma. Bulunamayan alanları boş string olarak bırak."""


def _build_prompt_from_groups(enabled_keys: set) -> str:
    """Aktif alanlara göre dinamik JSON şeması üretir."""
    import json as _json

    schema: dict = {"image_type": "teknik_resim"}
    for group in DOC_OUTPUT_GROUPS:
        group_schema = {
            f["key"]: ""
            for f in group["fields"]
            if f["key"] in enabled_keys
        }
        if group_schema:
            schema[group["group_key"]] = group_schema

    return _PROMPT_INSTRUCTION + "\n\n" + _json.dumps(schema, indent=2, ensure_ascii=False)


def _upsert_setting(db, key: str, value: str, desc: str = "", now: str = ""):
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == key))
    if row:
        row.deger = value
        row.guncelleme_tarihi = now
    else:
        db.add(SistemAyari(
            anahtar=key, deger=value, aciklama=desc,
            hassas_mi=False, olusturulma_tarihi=now, guncelleme_tarihi=now,
        ))


@router.get("/doc-processing")
def get_doc_processing():
    """Teknik döküman işleme ayarlarını döner (model, prompt, output fields, flags)."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari, AIModeli
    from services.crypto_service import decrypt as _decrypt
    from sqlalchemy import select
    import json as _json

    with get_session() as db:
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

        ai_rows = list(db.scalars(
            select(AIModeli).where(AIModeli.aktif_mi == True).order_by(AIModeli.olusturulma_tarihi)
        ).all())
        models = []
        for m in ai_rows:
            key = _decrypt(m.api_anahtari) or ""
            masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
            models.append({
                "id": m.kimlik,
                "name": m.ad,
                "provider": m.tedarikci or "",
                "masked_key": masked,
                "model_id": m.model_id or "",
                "ready": bool(m.model_id and m.model_id.strip()),
            })

    def _bool(raw, default):
        if raw is None:
            return bool(default)
        return str(raw).strip().lower() in ("1", "true", "yes", "on")

    # Output field toggle'ları — DB'de yoksa tümü aktif
    raw_fields = rows.get("doc_output_fields")
    try:
        saved_fields = _json.loads(raw_fields) if raw_fields else {}
    except Exception:
        saved_fields = {}

    # Tüm field key'leri — enabled setini hesapla
    all_keys = {f["key"] for g in DOC_OUTPUT_GROUPS for f in g["fields"]}
    enabled_keys = {k for k in all_keys if saved_fields.get(k, True)}

    # Gruplu output yapısı
    output_groups = [
        {
            "group_key": g["group_key"],
            "label": g["label"],
            "fields": [
                {**f, "enabled": f["key"] in enabled_keys}
                for f in g["fields"]
            ],
        }
        for g in DOC_OUTPUT_GROUPS
    ]

    # Efektif prompt: custom varsa onu, yoksa field'lardan otomatik üret
    custom_prompt = rows.get("doc_processing_prompt") or ""
    is_custom = bool(custom_prompt.strip())
    effective_prompt = custom_prompt if is_custom else _build_prompt_from_groups(enabled_keys)

    # DWG/DXF özel promptu
    dwg_prompt = rows.get("doc_processing_dwg_prompt") or ""
    dwg_is_custom = bool(dwg_prompt.strip())

    def _int(raw, default):
        try: return int(raw) if raw is not None else default
        except Exception: return default

    def _float(raw, default):
        try: return float(raw) if raw is not None else default
        except Exception: return default

    # ── Makine Bilgisi alanları ───────────────────────────────────────────────
    raw_machine_fields = rows.get("doc_machine_output_fields")
    try:
        saved_machine_fields = _json.loads(raw_machine_fields) if raw_machine_fields else {}
    except Exception:
        saved_machine_fields = {}

    all_machine_keys = {f["key"] for g in DOC_MACHINE_OUTPUT_GROUPS for f in g["fields"]}
    enabled_machine_keys = {k for k in all_machine_keys if saved_machine_fields.get(k, True)}

    machine_groups = [
        {
            "group_key": g["group_key"],
            "label": g["label"],
            "fields": [{**f, "enabled": f["key"] in enabled_machine_keys} for f in g["fields"]],
        }
        for g in DOC_MACHINE_OUTPUT_GROUPS
    ]

    machine_params = {
        "saat_ucreti":  _float(rows.get("doc_machine_saat_ucreti"), 0.0),
        "setup_suresi": _int(rows.get("doc_machine_setup_suresi"), 0),
        "verimlilik":   _int(rows.get("doc_machine_verimlilik"), 85),
    }

    custom_machine_prompt = rows.get("doc_machine_prompt") or ""
    machine_is_custom = bool(custom_machine_prompt.strip())
    effective_machine_prompt = (
        custom_machine_prompt if machine_is_custom
        else _build_machine_prompt_from_groups(enabled_machine_keys, machine_params)
    )

    return {
        "models": models,
        "selected_model_id": rows.get("doc_processing_model_id"),
        "prompt": effective_prompt,
        "is_custom_prompt": is_custom,
        "output_groups": output_groups,
        "flags": [
            {**f, "value": _bool(rows.get(f["key"]), f["default"])}
            for f in DOC_PROCESSING_FLAGS
        ],
        "dwg_prompt": dwg_prompt,
        "dwg_is_custom_prompt": dwg_is_custom,
        "pipeline": {
            "output_folder":    rows.get("doc_output_folder") or "",
            "watch_folder":     rows.get("doc_watch_folder") or "",
            "parallel_workers": _int(rows.get("doc_parallel_workers"), 2),
            "pdf_dpi":          _int(rows.get("doc_pdf_dpi"), 200),
        },
        "machine_groups":           machine_groups,
        "machine_params":           machine_params,
        "machine_prompt":           effective_machine_prompt,
        "machine_is_custom_prompt": machine_is_custom,
    }


@router.post("/doc-processing")
def save_doc_processing(body: dict):
    """Teknik döküman işleme ayarlarını yazar. model_id / prompt / output_fields / flags."""
    from database.sql.session import get_session
    from sqlalchemy import select
    import datetime
    import json as _json

    now = datetime.datetime.utcnow().isoformat()

    with get_session() as db:
        # Model seçimi
        if "model_id" in body:
            val = body["model_id"] or ""
            _upsert_setting(db, "doc_processing_model_id", val, "Teknik döküman işleme modeli", now)

        # Prompt
        if "prompt" in body:
            val = body["prompt"] or ""
            _upsert_setting(db, "doc_processing_prompt", val, "Teknik döküman Vision AI promptu", now)

        # DWG/DXF özel promptu
        if "dwg_prompt" in body:
            val = body["dwg_prompt"] or ""
            _upsert_setting(db, "doc_processing_dwg_prompt", val, "DWG/DXF işleme özel promptu", now)

        # Output fields
        if "output_fields" in body:
            val = _json.dumps(body["output_fields"])
            _upsert_setting(db, "doc_output_fields", val, "Çıktı alanı toggle'ları", now)

        # Boolean flags
        if "flags" in body:
            allowed = {f["key"] for f in DOC_PROCESSING_FLAGS}
            for key, value in body["flags"].items():
                if key not in allowed:
                    continue
                str_val = "true" if bool(value) else "false"
                desc = next((f["desc"] for f in DOC_PROCESSING_FLAGS if f["key"] == key), "")
                _upsert_setting(db, key, str_val, desc, now)

        # Makine çıktı alanları
        if "machine_fields" in body:
            val = _json.dumps(body["machine_fields"])
            _upsert_setting(db, "doc_machine_output_fields", val, "Makine bilgisi çıktı alanı toggle'ları", now)

        # Makine özel promptu
        if "machine_prompt" in body:
            val = body["machine_prompt"] or ""
            _upsert_setting(db, "doc_machine_prompt", val, "Makine bilgisi analiz promptu", now)

        # Makine maliyet parametreleri
        if "machine_params" in body:
            mp = body["machine_params"]
            if "saat_ucreti" in mp:
                _upsert_setting(db, "doc_machine_saat_ucreti", str(float(mp["saat_ucreti"] or 0)), "Makine saat ücreti (TL)", now)
            if "setup_suresi" in mp:
                _upsert_setting(db, "doc_machine_setup_suresi", str(max(0, int(mp["setup_suresi"] or 0))), "Makine setup süresi (dak)", now)
            if "verimlilik" in mp:
                val = max(1, min(100, int(mp["verimlilik"] or 85)))
                _upsert_setting(db, "doc_machine_verimlilik", str(val), "Makine verimlilik oranı (%)", now)

        # Pipeline / dosya yolu ayarları
        if "pipeline" in body:
            p = body["pipeline"]
            if "output_folder" in p:
                _upsert_setting(db, "doc_output_folder", str(p["output_folder"] or ""), "İşlenmiş döküman çıktı klasörü", now)
            if "watch_folder" in p:
                _upsert_setting(db, "doc_watch_folder", str(p["watch_folder"] or ""), "Otomatik izlenen giriş klasörü", now)
            if "parallel_workers" in p:
                val = max(1, min(16, int(p.get("parallel_workers") or 2)))
                _upsert_setting(db, "doc_parallel_workers", str(val), "Aynı anda işlenecek paralel dosya sayısı", now)
            if "pdf_dpi" in p:
                allowed_dpi = {72, 96, 150, 200, 300}
                val = int(p.get("pdf_dpi") or 200)
                if val not in allowed_dpi:
                    val = 200
                _upsert_setting(db, "doc_pdf_dpi", str(val), "PDF sayfa render kalitesi (DPI)", now)

        db.commit()
    return {"ok": True}


# ── Zeka Modeli (Global AI Model + Parametreler) ─────────────────────────────

@router.get("/intelligence-model")
def get_intelligence_model():
    """Global zeka modeli ayarlarını döner: mevcut model, parametreler, model listesi."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari, AIModeli, AIAgent
    from services.crypto_service import decrypt as _decrypt
    from sqlalchemy import select

    with get_session() as db:
        # Kilitli olmayan ilk aktif ajandan mevcut global modeli oku
        agent = db.scalars(
            select(AIAgent)
            .where(AIAgent.model_locked == False, AIAgent.aktif_mi == True)
            .order_by(AIAgent.olusturulma_tarihi)
        ).first()
        current_model = agent.model if agent else None

        # SistemAyari'den parametreler
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

        # Model listesi
        ai_rows = list(db.scalars(
            select(AIModeli).where(AIModeli.aktif_mi == True).order_by(AIModeli.olusturulma_tarihi)
        ).all())
        models = []
        for m in ai_rows:
            key = _decrypt(m.api_anahtari) or ""
            masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
            models.append({
                "id": m.kimlik,
                "name": m.ad,
                "provider": m.tedarikci or "",
                "model_id": m.model_id or "",
                "masked_key": masked,
                "ready": bool(m.model_id and m.model_id.strip()),
            })

    def _float(raw, default):
        try: return float(raw) if raw is not None else default
        except: return default

    def _int(raw, default):
        try: return int(raw) if raw is not None else default
        except: return default

    return {
        "current_model": current_model,
        "models": models,
        "temperature": _float(rows.get("global_temperature"), 0.7),
        "max_tokens":  _int(rows.get("global_max_tokens"), 4096),
        "language":    rows.get("global_language") or "auto",
    }


@router.post("/intelligence-model")
def save_intelligence_model(body: dict):
    """Global zeka modeli ayarlarını yazar."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari, AIAgent
    from sqlalchemy import select
    import datetime

    now = datetime.datetime.utcnow().isoformat()

    with get_session() as db:
        # Model değişikliği → kilitli olmayan tüm ajanlara uygula
        if "model" in body:
            model_name = (body["model"] or "").strip()
            if model_name:
                agents = list(db.scalars(
                    select(AIAgent).where(AIAgent.model_locked == False)
                ).all())
                for a in agents:
                    a.model = model_name

        # Parametre güncellemeleri
        param_map = {
            "temperature": ("global_temperature", "Varsayılan LLM sıcaklığı"),
            "max_tokens":  ("global_max_tokens",  "Varsayılan maksimum token sayısı"),
            "language":    ("global_language",    "Varsayılan yanıt dili"),
        }
        for field, (key, desc) in param_map.items():
            if field in body:
                _upsert_setting(db, key, str(body[field]), desc, now)

        db.commit()

    # Cache'i geçersiz kıl
    try:
        from core.db_bridge import invalidate_settings_cache
        invalidate_settings_cache()
    except Exception:
        pass

    return {"ok": True}


# ── Agent Assignments (Graph rolü → AIAgent eşleştirmesi) ─────────────────────

# UI'da dropdown sırası ve insan-okur etiketler
AGENT_ROLES = [
    {"key": "supervisor",   "label": "Supervisor (intent + plan)",          "default_kind": "chatbot"},
    {"key": "aggregator",   "label": "Aggregator (sentez + RAG)",            "default_kind": "chatbot"},
    {"key": "error_solver", "label": "Hata Çözücü (specialist)",             "default_kind": "chatbot"},
    {"key": "zli_finder",   "label": "Z'li Rapor (specialist)",              "default_kind": "chatbot"},
    {"key": "msg_polish",   "label": "Mesaj Revize (post-process)",          "default_kind": "worker"},
    {"key": "n8n_trigger",  "label": "n8n Tetikleyici (router)",             "default_kind": "router"},
]


@router.get("/agent-assignments")
def get_agent_assignments_route():
    """
    Graph rolleri ↔ atanmış agent_id eşleşmesini döner.
    Mevcut atama yoksa o role default_kind ajanını fallback olarak gösterir.
    """
    from core.db_bridge import get_agent_assignments, get_ai_agent

    saved = get_agent_assignments()
    out = []
    for role in AGENT_ROLES:
        assigned_id = saved.get(role["key"])
        # UI bilgi amaçlı: fallback olarak hangi ajanın çalışacağını da hesapla
        from core.db_bridge import get_assigned_agent
        try:
            effective = get_assigned_agent(role["key"]) or {}
            effective_id = effective.get("id")
        except Exception:
            effective_id = None
        out.append({
            **role,
            "assigned_id": assigned_id,
            "effective_id": effective_id,
        })
    return {"roles": out}


@router.post("/agent-assignments")
def save_agent_assignments_route(body: dict):
    """
    Atamaları toplu günceller. Her role için agent_id veya null kabul edilir.
    null/eksik roller mevcut ataması varsa silinir → fallback'e düşer.
    """
    from core.db_bridge import set_agent_assignments
    incoming = body.get("assignments", {}) or {}
    allowed_roles = {r["key"] for r in AGENT_ROLES}
    cleaned = {}
    for k, v in incoming.items():
        if k not in allowed_roles:
            continue
        if v:  # null / "" / 0 atlanır → o rol fallback'e düşer
            cleaned[k] = str(v)
    set_agent_assignments(cleaned)
    try:
        from core.db_bridge import invalidate_settings_cache
        invalidate_settings_cache()
    except Exception:
        pass
    return {"ok": True, "saved": cleaned}


# ── Prompt Şablonları ─────────────────────────────────────────────────────────

PROMPT_DEFAULTS = {
    "aggregator_system": (
        "Sen şirket içi yapay zeka asistanısın. Kullanıcının sorusuna açık, "
        "kısa ve doğru cevap ver. Türkçe yaz. Bilgi tabanı bağlamı (RAG) "
        "varsa onu temel al."
    ),
    "general_rag": (
        "Sen çok yetenekli bir asistansın. Aşağıda kullanıcının sistemine yüklenmiş "
        "belgelerden elde edilen ilgili bilgiler yer almaktadır. Bu bilgileri kullanarak "
        "soruyu cevapla. Eğer bilgi bulunmuyorsa kendi genel bilginle yanıt ver.\n\n"
    ),
    "file_qa": (
        "PROFILIN: Sen çok üst düzey, bağımsız düşünebilen bir yapay zeka ve danışmansın.\n"
        "KULLANICI TALEBİ: Sana bir soru soruyor ve arka planda belgenin veritabanı tarama sonuçlarını (gizli bağlam olarak) sağlıyor.\n\n"
        "KATI KURALLAR:\n"
        "1. KESİNLİKLE belgeyi özetleme, 'Belgede şu yazıyor' diye madde madde sayma veya metni kopyala-yapıştır yapma!\n"
        "2. Kullanıcının ne istediğini ANLA ve sanki hiçbir belge yokmuş gibi, DİREKT konuyu anlatan, çözüm sunan, kendi yorumlarını katan bir cevap yaz.\n"
        "3. Gelen veritabanı sonuçlarını sadece 'kendi bilgini zenginleştirmek' ve 'haklı çıkmak' için arka planda kullan.\n"
        "4. Yan sekmede dökümanı referans gösterecek bir ui_action arayüze dönecek, o yüzden ekrana çok uzun metinler yazıp kalabalık yapma.\n"
    ),
    "chat_memory": (
        "=== ESKİ SOHBET GEÇMİŞİ (HATIRLAMAN GEREKENLER) ===\n"
        "Kullanıcının şu anki sorusuyla bağlantılı olarak daha önce konuştuğunuz bazı konuşma kesitleri aşağıdadır:\n"
        "{chat_memory}\n"
        "====================================================\n\n"
    ),
    "supervisor_classifier": (
        "Sen bir intent sınıflandırıcısın. Kullanıcının mesajını okur ve şu "
        "kategorilerden birini seçersin:\n\n"
        "- general: Şirkete, iş süreçlerine, prosedürlere, politikalara, SAP'a veya "
        "şirket bilgi tabanındaki herhangi bir konuya ilişkin soru. SAP transaction kodu "
        "(CS01, FB60, ME083...), SAP modülü (MM, SD, FI, CO, PP, HR, PM...), "
        "iş süreci, BPMN akışı, kurumsal sistem, insan kaynakları, finans, bütçe, "
        "izin, görevlendirme, tedarik veya diğer kurumsal konular dahildir. "
        "Belirsiz durumlarda bu kategoriyi seç — bilgi tabanında aranması zararsız.\n"
        "- serbest: AÇIKÇA genel bilgi/teknoloji sorusu; Python, Java, matematik, "
        "fizik, tarih, coğrafya, internet teknolojileri gibi konular ve şirkete "
        "HİÇBİR bağlantısı olmayan sorular. Bilgi tabanı aramasına gerek yok.\n"
        "- hata_cozumu: Bir SİSTEM HATASI/ARIZA bildirimi. Kullanıcı 'şu hata "
        "veriyor', 'dump alıyor', 'çalışmıyor', 'ekran kilitlendi' gibi sorun "
        "ifadeleri kullanıyor. Sadece kod (ör. ME083) verilse bile bağlam bir "
        "SORUN tarifi olmalı.\n"
        "- rapor_arama: Z'li rapor (ZMM_, ZSD_), 'rapor bulamıyorum' tarzı rapor arama.\n"
        "- n8n: net bir otomasyon tetikleme isteği (toplantı kaydet, rapor gönder, görev oluştur).\n"
        "- dosya_qa: belirli bir dosya hakkında soru.\n"
        "- skill_query: sistemin yetenekleri, araçları veya nasıl kullanıldığı hakkında "
        "soru (ör. 'neler yapabilirsin', 'hangi özelliklerin var', 'bana nasıl yardım edersin').\n\n"
        "KARAR KURALI: Açıkça genel bilgi sorusu (Python, matematik, tarih vs.) ise → serbest. "
        "Şirkete/iş süreçlerine ilişkin olabilecek her türlü soru → general. "
        "Belirsiz → general (bilgi tabanını aramak her zaman güvenli). "
        "Sistem yetenekleri sorusuysa → skill_query.\n\n"
        "SADECE şu JSON formatında cevap ver, başka HİÇBİR şey yazma:\n"
        "{\"intent\": \"<kategori>\", \"confidence\": 0.0-1.0, \"complexity\": \"low|medium|high\", "
        "\"needs_polish\": <bool>, \"reasoning\": \"<1-cümle-gerekçe>\"}\n\n"
        "confidence: sınıflandırma güven skoru (0.8+ → eminsin, 0.5–0.8 → belirsiz, <0.5 → çok belirsiz).\n"
        "complexity: low=kısa/basit soru, medium=açıklama/adım gerektiriyor, high=çok boyutlu analiz.\n"
        "needs_polish: cevabın tonunun resmi/uzun olması gerekiyorsa true, kısa/teknik/JSON cevap için false."
    ),
    "msg_polish_base": (
        "Sana verilen metni imla, akıcılık ve okunabilirlik açısından hafifçe iyileştir. "
        "Bilgileri, anlamı ve yapıyı değiştirme. Yeni soru veya içerik ekleme. "
        "Sadece revize edilmiş metni döndür, başka hiçbir şey yazma."
    ),
}

PROMPT_META = [
    {"key": "aggregator_system",     "label": "Temel Asistan Kimliği",           "desc": "Asistanın kimliğini ve temel yanıt davranışını belirleyen prompt",        "category": "aggregator", "node": "Aggregator"},
    {"key": "general_rag",           "label": "Genel RAG Sistem Promptu",         "desc": "Belge tabanlı genel sohbet için kullanılan sistem promptu",               "category": "aggregator", "node": "Aggregator"},
    {"key": "file_qa",               "label": "Dosya Q&A Sistem Promptu",          "desc": "Belge/dosya sorgularında kullanılan sistem promptu",                      "category": "aggregator", "node": "Aggregator"},
    {"key": "chat_memory",           "label": "Konuşma Hafızası Şablonu",          "desc": "Geçmiş sohbet bağlamı eklenirken kullanılan şablon",                      "category": "aggregator", "node": "Aggregator"},
    {"key": "supervisor_classifier", "label": "Intent Sınıflandırıcı Promptu",    "desc": "Kullanıcı mesajını kategorize etmek için kullanılan supervisor promptu",   "category": "supervisor", "node": "Supervisor"},
    {"key": "msg_polish_base",       "label": "Mesaj Revizyonu Temel Promptu",     "desc": "Yanıtları imla ve akıcılık açısından iyileştiren revizyon talimatı",       "category": "polish",     "node": "Msg Polish"},
]


@router.get("/prompts")
def get_prompts():
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select

    with get_session() as db:
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

    result = []
    for meta in PROMPT_META:
        db_key = f"prompt_template_{meta['key']}"
        value = rows.get(db_key) or PROMPT_DEFAULTS.get(meta["key"], "")
        result.append({**meta, "value": str(value)})
    return {"prompts": result}


@router.post("/prompts")
def save_prompts(body: dict):
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    updates: dict = body.get("prompts", {})
    allowed_keys = {m["key"] for m in PROMPT_META}

    with get_session() as db:
        for key, value in updates.items():
            if key not in allowed_keys:
                continue
            db_key = f"prompt_template_{key}"
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == db_key))
            now = datetime.datetime.utcnow().isoformat()
            if row:
                row.deger = value
                row.guncelleme_tarihi = now
            else:
                db.add(SistemAyari(
                    anahtar=db_key,
                    deger=value,
                    aciklama=next((m["desc"] for m in PROMPT_META if m["key"] == key), ""),
                    hassas_mi=False,
                    olusturulma_tarihi=now,
                    guncelleme_tarihi=now,
                ))
        db.commit()
    return {"ok": True}


@router.post("/prompts/reset/{key}")
def reset_prompt(key: str):
    """Bir prompt şablonunu varsayılana sıfırlar."""
    if key not in PROMPT_DEFAULTS:
        raise HTTPException(status_code=404, detail="Prompt anahtarı bulunamadı")
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    db_key = f"prompt_template_{key}"
    with get_session() as db:
        row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == db_key))
        if row:
            row.deger = PROMPT_DEFAULTS[key]
            row.guncelleme_tarihi = datetime.datetime.utcnow().isoformat()
            db.commit()
    return {"ok": True, "value": PROMPT_DEFAULTS[key]}
