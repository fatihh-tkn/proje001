"""
services/teknik_dokuman_agent.py
────────────────────────────────────────────────────────────────────
Teknik Döküman Ajanı — arşivdeki teknik resimler üzerinde
işlem odaklı AI aksiyonları çalıştırır.

Desteklenen aksiyonlar:
  summarize  — vision_analysis'ten Türkçe özet üretir (streaming)
  query      — doküman hakkında doğal dil sorusu yanıtlar (streaming)
  enrich     — meta alanlarını (aciklama, etiketler, cad_turu) otomatik doldurur
  analyze    — görseli yeniden vision AI ile analiz eder, DB'ye kaydeder

Tetiklenme: POST /api/archive/teknik-agent  ← frontend butonu
"""

from __future__ import annotations

import json
import re
from typing import AsyncIterator

from core.logger import get_logger
from database.sql.session import get_session
from database.sql.models import Belge

logger = get_logger("teknik_dokuman_agent")


# ── Sistem promptları ────────────────────────────────────────────────────────

_SUMMARIZE_SYS = """Sen bir teknik döküman uzmanısın. Verilen teknik resim analiz verisinden
kısa, profesyonel bir Türkçe özet raporu oluştur.

Özete şunları dahil et:
- Parça adı ve tanımlayıcı numara
- Temel ölçüler ve geometrik özellikler
- Malzeme ve üretim bilgileri
- Önemli toleranslar
- Varsa özel notlar veya gereksinimler

Markdown kullan (## başlık, - madde). Maksimum 300 kelime. Analiz verisi yoksa bunu belirt."""


_QUERY_SYS = """Sen bir teknik döküman asistanısın. Verilen teknik resim analiz verisini
kullanarak kullanıcının sorusunu kısa ve doğru şekilde yanıtla.

Kurallar:
- Yalnızca analiz verisindeki bilgileri kullan.
- Bilgi yoksa "Bu bilgi dokümanda bulunmuyor." de.
- Türkçe yanıt ver, teknik terimler kullan."""


_ENRICH_SYS = """Sen teknik veri çıkarma uzmanısın. Teknik resim analiz verisinden
aşağıdaki alanlar için değerleri çıkar.

YALNIZCA geçerli bir JSON nesnesi döndür, başka hiçbir şey yazma:
{
  "aciklama": "<kısa Türkçe açıklama veya null>",
  "etiketler": ["<etiket1>", "<etiket2>"],
  "cad_turu": "<cad veya nesting veya null>"
}

Etiketler için: malzeme türü, imalat prosesi, ürün tipi, boyut aralığı gibi kısa teknik
anahtar kelimeler kullan. cad_turu: "cad" = teknik çizim/STEP, "nesting" = sac nesting planı.
Çıkaramazsan null veya boş liste."""


# ── Yardımcılar ──────────────────────────────────────────────────────────────

def _va_to_text(va: dict) -> str:
    """vision_analysis dict → AI'ya beslenebilecek düz metin."""
    if not va:
        return "(Vision analizi mevcut değil)"
    skip = {"image_type", "genel_metin"}
    parts = []
    for k, v in va.items():
        if k in skip or not v:
            continue
        if isinstance(v, (dict, list)):
            parts.append(f"{k}:\n{json.dumps(v, ensure_ascii=False, indent=2)}")
        else:
            parts.append(f"{k}: {v}")
    return "\n\n".join(parts) or "(Analiz verisi boş)"


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _try_parse_json(raw: str) -> dict:
    """JSON parse; başarısız olursa blok içini dene."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                pass
    return {}


# ── Genel aksiyon çalıştırıcı ────────────────────────────────────────────────

async def run_action(
    doc_id: str,
    action: str,
    query: str | None = None,
) -> AsyncIterator[str]:
    """
    Teknik döküman ajanını çalıştırır.
    SSE uyumlu `data: {...}\\n\\n` satırları yield eder.
    """
    from core.db_bridge import get_assigned_agent

    yield _sse({"type": "progress", "text": "Belge yükleniyor…"})

    with get_session() as db:
        belge = db.get(Belge, doc_id)
        if not belge:
            yield _sse({"type": "error", "text": "Belge bulunamadı."})
            return
        filename  = belge.dosya_adi or ""
        file_path = belge.depolama_yolu or ""
        meta      = dict(belge.meta or {})

    va      = meta.get("vision_analysis") or {}
    va_text = _va_to_text(va)
    agent_config = get_assigned_agent("teknik_dokuman")

    if action == "summarize":
        async for chunk in _summarize(filename, va_text, agent_config):
            yield chunk
    elif action == "query":
        if not (query or "").strip():
            yield _sse({"type": "error", "text": "Soru boş olamaz."})
            return
        async for chunk in _query(filename, va_text, query or "", agent_config):
            yield chunk
    elif action == "enrich":
        async for chunk in _enrich(doc_id, filename, va_text, agent_config):
            yield chunk
    elif action == "analyze":
        async for chunk in _analyze(doc_id, filename, file_path, agent_config):
            yield chunk
    else:
        yield _sse({"type": "error", "text": f"Bilinmeyen aksiyon: {action}"})


# ── Aksiyon implementasyonları ───────────────────────────────────────────────

async def _summarize(filename: str, va_text: str, agent_config) -> AsyncIterator[str]:
    from services.agent_graph.llm_adapter import stream_llm, build_messages

    yield _sse({"type": "progress", "text": "Özet hazırlanıyor…"})

    messages = build_messages(
        system=_SUMMARIZE_SYS,
        user=f"Dosya: {filename}\n\nAnaliz verisi:\n{va_text}",
    )
    full = ""
    async for chunk in stream_llm(agent_config, messages, temperature=0.3, max_tokens=800):
        if chunk["type"] == "token":
            full += chunk["text"]
            yield _sse({"type": "token", "text": chunk["text"]})
        elif chunk["type"] == "done":
            yield _sse({"type": "done", "action": "summarize", "result": full, "model": chunk.get("model", "")})


async def _query(filename: str, va_text: str, question: str, agent_config) -> AsyncIterator[str]:
    from services.agent_graph.llm_adapter import stream_llm, build_messages

    yield _sse({"type": "progress", "text": "Soru yanıtlanıyor…"})

    messages = build_messages(
        system=_QUERY_SYS,
        user=f"Dosya: {filename}\n\nAnaliz verisi:\n{va_text}\n\nSoru: {question}",
    )
    full = ""
    async for chunk in stream_llm(agent_config, messages, temperature=0.2, max_tokens=600):
        if chunk["type"] == "token":
            full += chunk["text"]
            yield _sse({"type": "token", "text": chunk["text"]})
        elif chunk["type"] == "done":
            yield _sse({"type": "done", "action": "query", "result": full, "model": chunk.get("model", "")})


async def _enrich(doc_id: str, filename: str, va_text: str, agent_config) -> AsyncIterator[str]:
    from services.agent_graph.llm_adapter import call_llm, build_messages

    yield _sse({"type": "progress", "text": "Meta veriler çıkarılıyor…"})

    messages = build_messages(
        system=_ENRICH_SYS,
        user=f"Dosya: {filename}\n\nAnaliz verisi:\n{va_text}",
    )
    try:
        result = await call_llm(
            agent_config, messages,
            temperature=0.0, response_format="json_object", max_tokens=300,
        )
        extracted = _try_parse_json(result.get("text", ""))
    except Exception as e:
        yield _sse({"type": "error", "text": f"Meta çıkarma hatası: {e}"})
        return

    yield _sse({"type": "progress", "text": "Veritabanı güncelleniyor…"})
    updated: dict = {}
    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if belge:
                meta = dict(belge.meta or {})
                if extracted.get("aciklama"):
                    meta["aciklama"] = extracted["aciklama"]
                    updated["aciklama"] = extracted["aciklama"]
                if extracted.get("etiketler"):
                    meta["etiketler"] = list(extracted["etiketler"])
                    updated["etiketler"] = list(extracted["etiketler"])
                if extracted.get("cad_turu") in ("cad", "nesting"):
                    meta["cad_turu"] = extracted["cad_turu"]
                    updated["cad_turu"] = extracted["cad_turu"]
                belge.meta = meta
                db.commit()
    except Exception as e:
        yield _sse({"type": "error", "text": f"DB güncelleme hatası: {e}"})
        return

    yield _sse({"type": "done", "action": "enrich", "result": updated, "model": result.get("model", "")})


async def _analyze(doc_id: str, filename: str, file_path: str, agent_config) -> AsyncIterator[str]:
    """
    Görseli mevcut ayarlarla (çıktı alanları + model) yeniden analiz eder.
    _read_with_vision → _get_active_prompt() → ayarlardaki alan seçimi otomatik uygulanır.
    """
    from fastapi.concurrency import run_in_threadpool
    from services.processors.image_processor import _read_with_vision

    yield _sse({"type": "progress", "text": "Görsel hazırlanıyor…"})

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"}

    if ext not in IMAGE_EXTS:
        yield _sse({"type": "error", "text": (
            "Görsel analizi yalnızca PNG/JPG/WEBP formatları için desteklenir. "
            "DWG/DXF dosyalarını önce PNG olarak dışa aktarın."
        )})
        return

    yield _sse({"type": "progress", "text": "Vision AI analiz ediyor…"})

    # Ayarlardaki prompt + model + alan seçimi ile analiz — image_processor ile aynı yol
    vision_data, vision_error = await run_in_threadpool(_read_with_vision, file_path)

    if vision_error:
        yield _sse({"type": "error", "text": f"Vision analizi hatası: {vision_error}"})
        return
    if not vision_data:
        yield _sse({"type": "error", "text": "Vision AI boş yanıt döndürdü."})
        return

    yield _sse({"type": "progress", "text": "Analiz kaydediliyor…"})
    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if belge:
                meta = dict(belge.meta or {})
                meta["vision_analysis"] = vision_data
                meta["transcription_status"] = "done"
                img_type = vision_data.get("image_type", "")
                if img_type in ("teknik_resim", "step_model"):
                    meta["cad_turu"] = "cad"
                elif img_type == "nesting":
                    meta["cad_turu"] = "nesting"
                belge.meta = meta
                db.commit()
    except Exception as e:
        yield _sse({"type": "error", "text": f"DB güncelleme hatası: {e}"})
        return

    yield _sse({"type": "done", "action": "analyze", "result": vision_data, "model": ""})
