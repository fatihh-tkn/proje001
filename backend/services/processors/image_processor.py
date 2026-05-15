"""
processors/image_processor.py
────────────────────────────────────────────────────────────────────
PNG / JPG / JPEG → RAG chunk üretici.

Strateji:
  1. Vision AI (Gemini) → görsel türünü algıla + yapılandırılmış JSON çıkar
     - teknik_resim: başlık bloğu, parça listesi, ölçüler, toleranslar, notlar
     - diğer türler: düz metin içerik
  2. API yoksa → dosya adı + boyut metadata chunk'ı
"""

import json
import os
import re
import uuid

_PROMPT = """Bu teknik çizimi analiz et ve aşağıdaki JSON formatında yanıt ver.
SADECE JSON döndür, markdown kod bloğu veya açıklama yazma. Bulunamayan alanları boş string olarak bırak.

{
  "image_type": "teknik_resim",
  "parca_tanim": {
    "parca_adi": "",
    "parca_kodu": "",
    "cizim_numarasi": "",
    "kimlik_numarasi": "",
    "sayfa_bilgisi": ""
  },
  "geometrik": {
    "acilim_uzunlugu": "",
    "boyutlar": "",
    "bukme_yaricapi": "",
    "kenar_mesafeleri": "",
    "kesit": "",
    "olcek": ""
  },
  "malzeme_uretim": {
    "malzeme": "",
    "agirlik": "",
    "yuzey_standardi": "",
    "kesim_standardi": "",
    "sayfa_formati": ""
  },
  "toleranslar": {
    "talasli_tolerans": "",
    "talassiz_tolerans": "",
    "kaynakli_tolerans": "",
    "dokum_tolerans": ""
  },
  "izlenebilirlik": {
    "cizim_tarihi": "",
    "cizen": "",
    "onaylayan": "",
    "kalite_kontrol": "",
    "cad_bilgisi": ""
  }
}

ALAN AÇIKLAMALARI:
- parca_tanim.kimlik_numarasi → SAP/ident numarası (genellikle 7-10 haneli sayı)
- parca_tanim.parca_kodu → malzeme/part kodu (kimlik numarasından farklıysa)
- geometrik.acilim_uzunlugu → sac açılım/gelişme uzunluğu (mm)
- geometrik.bukme_yaricapi → bükme iç yarıçapı (mm)
- geometrik.kenar_mesafeleri → delik/kenar boşlukları
- malzeme_uretim.yuzey_standardi → yüzey işlem standardı (ör: DIN 1543)
- malzeme_uretim.kesim_standardi → kesim/kalite standardı
- toleranslar.talasli_tolerans → talaşlı işlem toleransı (ör: ISO 2768-m)
- toleranslar.talassiz_tolerans → talaşsız işlem toleransı
- toleranslar.kaynakli_tolerans → kaynak toleransı (ör: ISO 13920-B)
- toleranslar.dokum_tolerans → döküm toleransı"""


def parse_image(
    file_path: str,
    original_name: str | None = None,
) -> list[dict]:
    file_basename = original_name or os.path.basename(file_path)
    ext = file_basename.rsplit(".", 1)[-1].lower() if "." in file_basename else "img"

    vision_data, vision_error = _read_with_vision(file_path)

    if not vision_data:
        # Vision AI başarısız — dosya adından minimal veri çıkar
        vision_data = {"image_type": "teknik_resim"}
        m = re.search(r'\b(\d{7,10})\b', file_basename)
        if m:
            vision_data["parca_tanim"] = {"kimlik_numarasi": m.group(1)}

    if vision_data.get("image_type") not in ("teknik_resim", "nesting", "step_model"):
        vision_data["image_type"] = "teknik_resim"

    text = _build_rag_text(file_basename, ext, vision_data)
    chunk_type = "teknik_resim"

    chunk = {
        "id": str(uuid.uuid4()),
        "text": text,
        "metadata": {
            "page":        1,
            "chunk_index": 1,
            "source":      file_basename,
            "type":        chunk_type,
            "image_path":  file_path,
            "total_pages": 1,
            "vision_data": vision_data,
        }
    }

    if vision_error:
        chunk["metadata"]["vision_error"] = vision_error

    return [chunk]


_SKIP_KEYS = {"image_type", "genel_metin", "icerik"}


def _humanize(key: str) -> str:
    """snake_case → okunabilir başlık: 'parca_tanim' → 'Parça Tanım'"""
    return key.replace("_", " ").title()


def _build_rag_text(basename: str, ext: str, data: dict) -> str:
    """Yapılandırılmış JSON'dan RAG arama için zengin metin üretir. Dinamik — hangi alan gelirse çalışır."""
    lines = [f"[{basename} | TEKNİK RESİM]", f"DOSYA TÜRÜ: {ext.upper()} görseli", ""]

    for section_key, section_val in data.items():
        if section_key in _SKIP_KEYS:
            continue

        # Array (islemler, parca_listesi, …)
        if isinstance(section_val, list):
            items_out = []
            for item in section_val:
                if isinstance(item, dict):
                    islem = item.get("islem") or item.get("ad") or item.get("name") or ""
                    aciklama = item.get("aciklama") or item.get("description") or ""
                    sira = item.get("sira") or item.get("order") or ""
                    if islem:
                        prefix = f"{sira}. " if sira else ""
                        items_out.append(f"{prefix}{islem}" + (f" ({aciklama})" if aciklama else ""))
                elif item:
                    items_out.append(str(item))
            if items_out:
                lines.append(f"── {_humanize(section_key).upper()} ──")
                lines.extend(items_out)
                lines.append("")
            continue

        # Nested object (parca_tanim, geometrik, …)
        if isinstance(section_val, dict):
            pairs = [(k, v) for k, v in section_val.items() if v]
            if not pairs:
                continue
            lines.append(f"── {_humanize(section_key).upper()} ──")
            for fk, fv in pairs:
                lines.append(f"{_humanize(fk)}: {fv}")
            lines.append("")
            continue

        # Flat string / number
        if section_val:
            lines.append(f"{_humanize(section_key)}: {section_val}")

    return "\n".join(lines)


def _get_active_prompt() -> str:
    """Aktif promptu döner: custom > hardcoded default.
    doc_output_fields toggle'ları vision şemasını değiştirmiyor — TeknikTable sabit
    şema anahtarlarını (baslik_bloku, parca_listesi vb.) bekliyor. Özel prompt varsa
    kullanıcının sorumluluğundadır.
    """
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select

        with get_session() as db:
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "doc_processing_prompt"))

        custom = (row.deger if row else "").strip() if row else ""
        if custom:
            return custom
    except Exception:
        pass
    return _PROMPT


def _read_with_vision(image_path: str) -> tuple[dict | None, str]:
    """Vision AI ile görsel analiz eder. (result, error_str) döner."""
    model_name = ""
    provider   = ""
    try:
        from services.processors.vision_utils import get_doc_processing_config
        from services.processors.process_progress import step as _step

        api_key, model_name, provider, base_url = get_doc_processing_config()
        if not api_key:
            return None, "Model yapılandırılmamış (API anahtarı yok)"

        prompt = _get_active_prompt()
        _step(f"Vision AI'ya gönderiliyor ({model_name})…")

        raw = ""

        if provider in ("openai", "openai_compat", "openrouter", "groq"):
            import base64
            from openai import OpenAI

            client_kwargs: dict = {"api_key": api_key, "timeout": 120.0}
            if base_url:
                client_kwargs["base_url"] = base_url
            client = OpenAI(**client_kwargs)

            with open(image_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            ext = image_path.rsplit(".", 1)[-1].lower()
            mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                    "webp": "image/webp", "gif": "image/gif", "bmp": "image/bmp"}.get(ext, "image/png")

            resp = client.chat.completions.create(
                model=model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                    ],
                }],
                max_tokens=4096,
            )
            raw = (resp.choices[0].message.content or "").strip()

        elif provider == "anthropic":
            import base64
            import anthropic

            client = anthropic.Anthropic(api_key=api_key, timeout=120.0)
            with open(image_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            ext = image_path.rsplit(".", 1)[-1].lower()
            mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                    "webp": "image/webp", "gif": "image/gif"}.get(ext, "image/png")

            msg = client.messages.create(
                model=model_name,
                max_tokens=4096,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
            raw = (msg.content[0].text or "").strip()

        else:
            # Default: gemini
            import google.generativeai as genai
            from PIL import Image

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            img = Image.open(image_path)
            response = model.generate_content(
                [prompt, img],
                request_options={"timeout": 120},
            )
            raw = (response.text or "").strip()

        _step("Analiz sonuçları işleniyor…")
        if not raw:
            err = f"Vision API boş yanıt döndü (model: {model_name}, provider: {provider or 'gemini'})"
            print(f"[image_processor] {err}")
            return None, err
        result = _parse_json_response(raw)
        if result:
            img_type = result.get("image_type", "diger")
            label = {"teknik_resim": "Teknik Resim", "nesting": "Nesting"}.get(img_type, img_type)
            _step(f"Tür tespit edildi: {label}")
        return result, ""

    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        print(f"[image_processor] Vision hatası (model={model_name!r}, provider={provider!r}): {err}")
        return None, err


def _parse_json_response(raw: str) -> dict | None:
    """Model çıktısından JSON dict çıkarır."""
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]+\}", cleaned)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

    # JSON parse edilemedi — düz metin olarak sarmala
    return {"image_type": "diger", "genel_metin": raw, "icerik": raw}
