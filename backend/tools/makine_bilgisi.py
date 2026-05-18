"""
tools/makine_bilgisi.py
────────────────────────────────────────────────────────────────
Makine Bilgisi analiz aracı.

POST /api/tools/makine-bilgisi/analiz
  files: List[UploadFile]  — PNG/JPG/WEBP/PDF (birden fazla)

Her dosya vision AI'ya gönderilir; sonuçlar birleştirilip döner.
Kullanılan model  : doc_processing_model_id (teknik döküman modeli ile aynı)
Kullanılan prompt : doc_machine_prompt (özel) veya _build_machine_prompt() (otomatik)
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from typing import List

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.concurrency import run_in_threadpool

ROUTER     = APIRouter()
AGENT_TOOL = None   # Ajan aracı olarak kullanılmıyor

IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "bmp", "tiff"}


# ── Yardımcılar ───────────────────────────────────────────────────────────────

def _get_machine_prompt() -> str:
    """DB'den makine promptunu okur. Özel yoksa auto-build yapar."""
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select

        with get_session() as db:
            rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari).where(
                SistemAyari.anahtar.in_(["doc_machine_prompt", "doc_machine_output_fields"])
            )).all()}

        custom = (rows.get("doc_machine_prompt") or "").strip()
        if custom:
            return custom

        # Otomatik: etkin alanları çek
        try:
            saved = json.loads(rows.get("doc_machine_output_fields") or "{}")
        except Exception:
            saved = {}

        from api.routes.settings import DOC_MACHINE_OUTPUT_GROUPS, _build_machine_prompt_from_groups
        all_keys = {f["key"] for g in DOC_MACHINE_OUTPUT_GROUPS for f in g["fields"]}
        enabled  = {k for k in all_keys if saved.get(k, True)}
        return _build_machine_prompt_from_groups(enabled, {})
    except Exception:
        return (
            "Bu makine belgesini analiz et ve aşağıdaki JSON formatında yanıt ver.\n"
            "SADECE JSON döndür.\n\n"
            '{"makine_tipi":"","calisma_prensibi":"","uretim_kapasitesi":""}'
        )


def _call_vision(image_path: str, prompt: str) -> dict | None:
    """Vision AI'ya dosya + prompt gönderir, JSON dict döner."""
    try:
        from services.processors.vision_utils import get_doc_processing_config
        api_key, model_name, provider, base_url = get_doc_processing_config()
        if not api_key:
            return None

        raw = ""

        if provider in ("openai", "openai_compat", "openrouter", "groq"):
            import base64
            from openai import OpenAI
            kwargs: dict = {"api_key": api_key, "timeout": 120.0}
            if base_url:
                kwargs["base_url"] = base_url
            client = OpenAI(**kwargs)
            with open(image_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            ext  = image_path.rsplit(".", 1)[-1].lower()
            mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                    "webp": "image/webp"}.get(ext, "image/png")
            resp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": [
                    {"type": "text",      "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ]}],
                max_tokens=4096,
            )
            raw = (resp.choices[0].message.content or "").strip()

        elif provider == "anthropic":
            import base64
            import anthropic
            with open(image_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            ext  = image_path.rsplit(".", 1)[-1].lower()
            mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                    "webp": "image/webp"}.get(ext, "image/png")
            client = anthropic.Anthropic(api_key=api_key, timeout=120.0)
            msg = client.messages.create(
                model=model_name,
                max_tokens=4096,
                messages=[{"role": "user", "content": [
                    {"type": "image",  "source": {"type": "base64", "media_type": mime, "data": b64}},
                    {"type": "text",   "text": prompt},
                ]}],
            )
            raw = (msg.content[0].text or "").strip()

        elif provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            import PIL.Image
            img  = PIL.Image.open(image_path)
            resp = model.generate_content([prompt, img])
            raw  = (resp.text or "").strip()

        # JSON extract
        if not raw:
            return None
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1:
            return None
        return json.loads(raw[start:end])

    except Exception:
        return None


def _pdf_first_page_to_png(pdf_path: str, out_dir: str, dpi: int = 200) -> str | None:
    """PDF'in ilk sayfasını PNG'e çevirir."""
    out = os.path.join(out_dir, "page_0.png")
    try:
        import fitz
        doc  = fitz.open(pdf_path)
        if not len(doc):
            doc.close()
            return None
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72), colorspace=fitz.csRGB)
        pix.save(out)
        doc.close()
        return out
    except Exception:
        pass
    try:
        from pdf2image import convert_from_path
        imgs = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=dpi)
        if imgs:
            imgs[0].save(out, "PNG")
            return out
    except Exception:
        pass
    return None


def _merge(base: dict, extra: dict) -> dict:
    """İki dict'i recursive birleştirir; boş olmayan değerler öncelikli."""
    result = dict(base)
    for k, v in extra.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = _merge(result[k], v)
        elif v not in (None, "", [], {}):
            result[k] = v
        elif k not in result:
            result[k] = v
    return result


def _analyze_file(file_path: str, original_name: str, prompt: str) -> dict:
    """Tek dosyayı analiz eder; vision_data dict döner."""
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    tmp_dir = None

    if ext in IMAGE_EXTS:
        result = _call_vision(file_path, prompt) or {}
    elif ext == "pdf":
        tmp_dir = tempfile.mkdtemp()
        img_path = _pdf_first_page_to_png(file_path, tmp_dir)
        result   = (_call_vision(img_path, prompt) if img_path else None) or {}
    else:
        result = {}

    if tmp_dir:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    return result


# ── Endpoint ─────────────────────────────────────────────────────────────────

@ROUTER.post("/analiz", summary="Dökümanları vision AI ile analiz et, makine bilgisi çıkar")
async def analiz_et(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="En az bir dosya gerekli.")

    prompt  = await run_in_threadpool(_get_machine_prompt)
    merged  = {}
    results = []
    tmp_dir = tempfile.mkdtemp()

    try:
        for upload in files:
            suffix   = "." + (upload.filename or "file.bin").rsplit(".", 1)[-1].lower()
            tmp_path = os.path.join(tmp_dir, upload.filename or ("file" + suffix))
            content  = await upload.read()
            with open(tmp_path, "wb") as f:
                f.write(content)

            data = await run_in_threadpool(_analyze_file, tmp_path, upload.filename or "file", prompt)
            results.append({"filename": upload.filename, "data": data})
            merged = _merge(merged, data)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return {
        "ok":     True,
        "merged": merged,
        "files":  results,
    }
