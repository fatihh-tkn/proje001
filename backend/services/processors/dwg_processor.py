"""
processors/dwg_processor.py
────────────────────────────────────────────────────────────────────
DWG → DXF (ODA File Converter) → text extraction (ezdxf) → AI

Pipeline:
  1. ODA File Converter ile DWG → DXF (subprocess, timeout korumalı)
  2. ezdxf ile DXF'ten TEXT/MTEXT entity'lerini çıkar (hızlı, güvenilir)
  3. Çıkarılan metni DWG promptuyla AI'ya gönder → JSON çıktı
"""

from __future__ import annotations
import re
import uuid
import os
import json
import shutil
import tempfile
import subprocess


# ── dwg2dxf (LibreDWG) yolu ──────────────────────────────────────

def _find_dwg2dxf() -> str | None:
    """dwg2dxf komutunu bulur (Linux/Windows)."""
    found = shutil.which("dwg2dxf")
    if found:
        return found
    candidates = [
        "/usr/bin/dwg2dxf",
        "/usr/local/bin/dwg2dxf",
        r"C:\Program Files\LibreDWG\dwg2dxf.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\LibreDWG\dwg2dxf.exe"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


# ── DWG → DXF dönüşümü ───────────────────────────────────────────

def _dwg_to_dxf(dwg_path: str, timeout: int = 30) -> tuple[str | None, str]:
    """
    LibreDWG dwg2dxf ile DWG → DXF.
    Komut: dwg2dxf input.dwg -o output.dxf
    Dönüş: (dxf_path | None, error_msg)
    """
    exe = _find_dwg2dxf()
    if not exe:
        return None, (
            "dwg2dxf bulunamadı. "
            "Docker: libredwg-utils paketi kurulu olmalı. "
            "Windows: https://github.com/LibreDWG/libredwg/releases"
        )

    dxf_path = os.path.join(tempfile.gettempdir(), f"dwg_{uuid.uuid4().hex}.dxf")

    try:
        result = subprocess.run(
            [exe, dwg_path, "-o", dxf_path],
            timeout=timeout,
            capture_output=True,
            text=True,
        )

        if os.path.exists(dxf_path) and os.path.getsize(dxf_path) > 0:
            return dxf_path, ""

        stderr = (result.stderr or "").strip()[:200]
        return None, f"dwg2dxf başarısız — {stderr or 'DXF üretilemedi'}"

    except subprocess.TimeoutExpired:
        return None, f"dwg2dxf {timeout}s zaman aşımı"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


# ── DXF text extraction ───────────────────────────────────────────

def _extract_dxf_texts(dxf_path: str) -> list[str]:
    """ezdxf ile DXF dosyasından TEXT/MTEXT entity'lerini çıkarır."""
    try:
        import ezdxf
        doc = ezdxf.readfile(dxf_path)
        texts: list[str] = []
        seen:  set[str]  = set()
        for layout in doc.layouts:
            for entity in layout:
                t = ""
                try:
                    dt = entity.dxftype()
                    if dt == "TEXT":
                        t = (entity.dxf.get("text") or "").strip()
                    elif dt == "MTEXT":
                        t = entity.plain_mtext().strip()
                    elif dt in ("ATTDEF", "ATTRIB"):
                        t = (entity.dxf.get("text") or "").strip()
                except Exception:
                    pass
                if t and t not in seen:
                    seen.add(t)
                    texts.append(t)
        return texts
    except Exception as e:
        print(f"[dwg_processor] ezdxf hatası: {e}")
        return []


# ── DWG özel promptu ─────────────────────────────────────────────

def _get_dwg_prompt() -> str:
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select
        with get_session() as db:
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "doc_processing_dwg_prompt"))
        custom = (row.deger if row else "").strip() if row else ""
        if custom:
            return custom
    except Exception:
        pass
    from services.processors.image_processor import _get_active_prompt
    return _get_active_prompt()


# ── SAP no fallback ───────────────────────────────────────────────

def _fill_sap_from_filename(vision_data: dict, basename: str) -> None:
    """baslik_bloku.kimlik_numarasi boşsa dosya adındaki 7-10 haneli sayıyı SAP no olarak doldurur."""
    bb = vision_data.setdefault("baslik_bloku", {})
    if bb.get("kimlik_numarasi"):
        return
    m = re.search(r'\b(\d{7,10})\b', basename)
    if m:
        bb["kimlik_numarasi"] = m.group(1)


# ── JSON parse ────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict | None:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except Exception:
        m = re.search(r"\{[\s\S]+\}", cleaned)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return None


# ── AI analiz ────────────────────────────────────────────────────

def _analyze_texts(texts: list[str]) -> tuple[dict | None, str]:
    """Çıkarılan metinleri AI'ya gönderir, JSON döndürür."""
    try:
        from services.processors.vision_utils import get_doc_processing_config
        from services.processors.process_progress import step as _step

        api_key, model_name, provider, base_url = get_doc_processing_config()
        if not api_key:
            return None, "API anahtarı yapılandırılmamış"

        custom = _get_dwg_prompt()
        joined = "\n".join(texts[:500])

        if custom and "görsel" not in custom.lower() and len(custom) > 100:
            full_prompt = f"{custom}\n\nÇİZİM METİNLERİ:\n{joined}"
        else:
            from services.processors.stp_processor import _build_text_prompt
            full_prompt = _build_text_prompt(joined)

        raw = ""
        _step(f"DWG metinleri AI'ya gönderiliyor ({model_name})…")

        if provider in ("openai", "openai_compat", "openrouter", "groq"):
            from openai import OpenAI
            kwargs: dict = {"api_key": api_key, "timeout": 60.0}
            if base_url:
                kwargs["base_url"] = base_url
            resp = OpenAI(**kwargs).chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": full_prompt}],
                max_tokens=4096,
            )
            raw = (resp.choices[0].message.content or "").strip()

        elif provider == "anthropic":
            import anthropic
            msg = anthropic.Anthropic(api_key=api_key, timeout=60.0).messages.create(
                model=model_name,
                max_tokens=4096,
                messages=[{"role": "user", "content": full_prompt}],
            )
            raw = (msg.content[0].text or "").strip()

        else:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            response = genai.GenerativeModel(model_name).generate_content(
                full_prompt,
                request_options={"timeout": 60},
            )
            raw = (response.text or "").strip()

        if not raw:
            return None, "API boş yanıt döndü"

        result = _parse_json(raw)
        if not result:
            return None, "JSON parse edilemedi"

        result.setdefault("image_type", "teknik_resim")
        return result, ""

    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        print(f"[dwg_processor] AI hatası: {err}")
        return None, err


# ── Ana giriş noktası ─────────────────────────────────────────────

def parse_dwg(file_path: str, original_name: str | None = None) -> list[dict]:
    from services.processors.process_progress import step as _step

    basename = original_name or os.path.basename(file_path)
    dxf_path = None

    try:
        # 1. DWG → DXF
        _step("DWG → DXF dönüştürülüyor (ODA)…")
        dxf_path, oda_err = _dwg_to_dxf(file_path, timeout=30)

        if not dxf_path:
            return _error_chunk(basename, oda_err)

        # 2. DXF → text entity'leri
        _step("DXF metin içeriği okunuyor…")
        texts = _extract_dxf_texts(dxf_path)

        if not texts:
            return _error_chunk(basename, "DXF dosyasında okunabilir metin bulunamadı")

        # 3. Metinleri AI'ya gönder
        vision_data, ai_err = _analyze_texts(texts)

        if vision_data:
            _fill_sap_from_filename(vision_data, basename)
            from services.processors.image_processor import _build_rag_text
            ext      = basename.rsplit(".", 1)[-1].lower() if "." in basename else "dwg"
            img_type = vision_data.get("image_type", "teknik_resim")
            chunk_type = "nesting" if img_type == "nesting" else "teknik_resim"
            return [{
                "id": str(uuid.uuid4()),
                "text": _build_rag_text(basename, ext, vision_data),
                "metadata": {
                    "page": 1, "chunk_index": 1,
                    "source": basename, "type": chunk_type,
                    "total_pages": 1, "vision_data": vision_data,
                },
            }]

        return _error_chunk(basename, ai_err)

    finally:
        if dxf_path and os.path.exists(dxf_path):
            try:
                os.remove(dxf_path)
            except Exception:
                pass


def _error_chunk(basename: str, err: str) -> list[dict]:
    from services.processors.process_progress import step as _step
    _step("DWG işleme başarısız.")
    print(f"[dwg_processor] hata: {err}")
    return [{
        "id": str(uuid.uuid4()),
        "text": f"[{basename} | DWG]\n{err}",
        "metadata": {
            "page": 1, "chunk_index": 1,
            "source": basename, "type": "dwg_hata",
            "total_pages": 1, "vision_error": err, "error": err,
        },
    }]
