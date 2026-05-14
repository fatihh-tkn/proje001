"""
processors/stp_processor.py
────────────────────────────────────────────────────────────────────
STEP / STP (ISO 10303-21) dosyalarından metadata çıkarır + AI analiz.

Pipeline:
  1. STEP ASCII içeriğinden HEADER ve PRODUCT entity'lerini çıkar
  2. Çıkarılan metin + raw başlangıç içeriği AI'ya gönderilir
  3. AI JSON döndürür (DWG promptuyla uyumlu)
"""

from __future__ import annotations
import os
import re
import uuid
import json


def _extract_step_header(content: str) -> dict:
    """STEP HEADER bölümünden temel metadata çıkarır."""
    result = {}

    m = re.search(
        r"FILE_NAME\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*\(([^)]*)\)\s*,\s*\(([^)]*)\)",
        content, re.IGNORECASE,
    )
    if m:
        result["dosya_adi_step"] = m.group(1).strip()
        result["tarih"]          = m.group(2).strip()[:19]
        authors = re.findall(r"'([^']+)'", m.group(3))
        if authors:
            result["yazar"] = ", ".join(a for a in authors if a.strip())
        orgs = re.findall(r"'([^']+)'", m.group(4))
        if orgs:
            result["organizasyon"] = ", ".join(o for o in orgs if o.strip())

    m = re.search(r"FILE_DESCRIPTION\s*\(\s*\(([^)]*)\)", content, re.IGNORECASE)
    if m:
        descs = re.findall(r"'([^']+)'", m.group(1))
        if descs:
            result["aciklama"] = " | ".join(d for d in descs if d.strip())

    m = re.search(r"FILE_SCHEMA\s*\(\s*\('([^']+)'", content, re.IGNORECASE)
    if m:
        result["step_schema"] = m.group(1).strip()

    return result


def _extract_product_names(content: str) -> list[str]:
    """DATA bölümündeki PRODUCT entity'lerinden ürün adlarını çıkarır."""
    products = re.findall(r"PRODUCT\s*\(\s*'[^']*'\s*,\s*'([^']+)'", content, re.IGNORECASE)
    seen = set()
    unique = []
    for p in products:
        p = p.strip()
        if p and p not in seen and p.upper() not in ("NONE", "NULL", ""):
            seen.add(p)
            unique.append(p)
    return unique[:20]


def _get_stp_prompt() -> str:
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


def _build_text_prompt(content: str) -> str:
    """STEP/DWG metin içeriği için görsel analiz promptu yerine text-specific prompt üretir."""
    return f"""Sen bir CAD/CAM ve üretim dosyası analiz uzmanısın. Aşağıda bir STEP veya DWG dosyasından çıkarılan METİN içeriği verilmiştir. Bu bir görsel değil, ham dosya metnidir.

ÖNEMLİ FORMAT BİLGİSİ:
- DWG dosyalarında parça bilgisi genellikle şu formattadır: "92530740 - 6 MM - S355J2+AR"
  → SAP/Parça No: ilk 7-10 haneli rakam
  → Kalınlık: ortadaki sayı (MM)
  → Malzeme: son kısım (çelik sınıfı: S355J2+AR, S235JR, DX51D vb.)
- "Operasyon" başlığının altındaki metinler sıralı imalat işlemleridir
- "[ÖN-BİLGİ: ...]" satırı varsa regex ile doğrulanmış veridir — öncelikli kullan

İçeriği analiz et ve şu iki formattan uygun olanı seç:

Eğer içerik bir NESTING PLANI ise (sac levha kesim planı, birden fazla parça, lazer/plazma/bükme işlemleri, kullanım oranı):
{{
  "image_type": "nesting",
  "program_adi": "NC/nesting program adı",
  "malzeme_numarasi": "SAP veya sipariş numarası",
  "levha_boyutu": "örn: 3000x1500x2mm",
  "malzeme": "malzeme türü (örn: S235 JR, DX51D)",
  "kalinlik": "kalınlık (örn: 2.00)",
  "kullanim_orani": "kullanım yüzdesi (örn: 87.3%)",
  "fire_orani": "fire yüzdesi (örn: 12.7%)",
  "toplam_parca_adedi": "toplam parça sayısı",
  "islemler": ["Lazer Kesim", "Bükme"],
  "parca_listesi": [
    {{"parca_kodu": "SAP/ERP parça kodu veya numarası", "parca_adi": "parça adı", "adet": "10", "malzeme": "S235 JR", "kalinlik": "2.00"}}
  ],
  "notlar": ["varsa notlar"],
  "genel_metin": "özet"
}}

Eğer içerik bir TEKNİK ÇİZİM ise (tek bir parça veya profil, ölçüler, toleranslar, operasyon listesi):
{{
  "image_type": "teknik_resim",
  "baslik_bloku": {{
    "cizim_numarasi": "çizim no",
    "kimlik_numarasi": "SAP/ERP malzeme no (7-10 haneli rakam)",
    "baslik": "parça adı",
    "malzeme": "malzeme kodu (örn: S355J2+AR, S235JR, DX51D)",
    "kalinlik": "kalınlık mm, sadece sayı (örn: 6)",
    "firma": "firma adı",
    "tarih": "tarih",
    "revizyon": "revizyon"
  }},
  "islem_sirasi": [
    {{"sira": "1", "islem": "Lazer Kesim", "aciklama": ""}},
    {{"sira": "2", "islem": "Bükme", "aciklama": ""}}
  ],
  "parca_listesi": [{{"parca_kodu": "", "parca_adi": "", "adet": "", "malzeme": ""}}],
  "notlar": [],
  "genel_metin": "özet"
}}

SADECE JSON döndür, başka hiçbir açıklama yazma.

DOSYA İÇERİĞİ:
{content}"""


def _fill_sap_from_filename(vision_data: dict, basename: str) -> None:
    """
    baslik_bloku.kimlik_numarasi boşsa dosya adındaki sayıyı SAP no olarak doldurur.
    Hem düz (92530740) hem noktalı Almanca format (92.530.740) desteklenir.
    """
    bb = vision_data.setdefault("baslik_bloku", {})
    if bb.get("kimlik_numarasi"):
        return
    m = re.search(r'(?<![/\\])\b(\d{7,10})\b', basename)
    if m:
        bb["kimlik_numarasi"] = m.group(1)
        return
    m = re.search(r'\b(\d{1,3}(?:\.\d{3}){2,})\b', basename)
    if m:
        normalized = m.group(1).replace(".", "")
        if len(normalized) >= 7:
            bb["kimlik_numarasi"] = normalized


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


def _analyze_with_ai(texts: list[str]) -> dict | None:
    """Çıkarılan STEP metinlerini AI'ya gönderir."""
    try:
        from services.processors.vision_utils import get_doc_processing_config
        from services.processors.process_progress import step as _step

        api_key, model_name, provider, base_url = get_doc_processing_config()
        if not api_key:
            return None

        custom = _get_stp_prompt()
        joined = "\n".join(texts[:300])

        # Özel prompt varsa kullan; yoksa text-specific prompt oluştur
        if custom and "görsel" not in custom.lower() and len(custom) > 100:
            full_prompt = f"{custom}\n\nDOSYA İÇERİĞİ:\n{joined}"
        else:
            full_prompt = _build_text_prompt(joined)

        raw = ""
        _step(f"STEP içeriği AI'ya gönderiliyor ({model_name})…")

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
            return None

        return _parse_json(raw)

    except Exception as e:
        print(f"[stp_processor] AI hatası: {type(e).__name__}: {e}")
        return None


def parse_stp(file_path: str, original_name: str | None = None) -> list[dict]:
    from services.processors.process_progress import step as _step

    basename = original_name or os.path.basename(file_path)
    size_kb  = round(os.path.getsize(file_path) / 1024, 1)

    _step("STEP dosyası okunuyor…")

    content = ""
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            with open(file_path, "r", encoding=enc, errors="replace") as f:
                content = f.read(200_000)
            break
        except Exception:
            continue

    header   = _extract_step_header(content) if content else {}
    products = _extract_product_names(content) if content else []

    # AI'ya gönderilecek metin listesi
    ai_texts: list[str] = []
    if header:
        for k, v in header.items():
            if v:
                ai_texts.append(f"{k}: {v}")
    if products:
        ai_texts.append("Ürün Adları: " + ", ".join(products))
    # Ham başlık bloğunu da ekle (ilk 3000 karakter)
    if content:
        ai_texts.append("\n--- HAM STEP BAŞLIĞI ---\n" + content[:3000])

    # AI analizi dene
    vision_data = None
    if ai_texts:
        _step("STEP metinleri AI'ya gönderiliyor…")
        vision_data = _analyze_with_ai(ai_texts)

    # AI başarılıysa sonucu kullan
    if vision_data:
        _fill_sap_from_filename(vision_data, basename)
        from services.processors.image_processor import _build_rag_text
        vision_data.setdefault("image_type", "teknik_resim")
        img_type   = vision_data.get("image_type", "teknik_resim")
        chunk_type = "nesting" if img_type == "nesting" else "teknik_resim"
        return [{
            "id": str(uuid.uuid4()),
            "text": _build_rag_text(basename, "stp", vision_data),
            "metadata": {
                "page": 1, "chunk_index": 1,
                "source": basename, "type": chunk_type,
                "total_pages": 1, "vision_data": vision_data,
            },
        }]

    # Fallback: regex ile çıkarılan ham veriyle chunk oluştur
    lines = [f"[{basename} | STEP 3D MODEL]", "DOSYA TÜRÜ: STP/STEP (ISO 10303-21)", ""]
    if header.get("aciklama"):
        lines.append(f"Açıklama: {header['aciklama']}")
    if products:
        lines.append(f"Ürün Adları: {', '.join(products)}")
    if header.get("tarih"):
        lines.append(f"Tarih: {header['tarih']}")
    if header.get("yazar"):
        lines.append(f"Yazar: {header['yazar']}")
    if header.get("organizasyon"):
        lines.append(f"Organizasyon: {header['organizasyon']}")
    if header.get("step_schema"):
        lines.append(f"STEP Şeması: {header['step_schema']}")
    lines.append(f"Dosya Boyutu: {size_kb} KB")
    if not header and not products:
        lines.append("[Not: STEP dosyası okundu ancak başlık bilgisi çıkarılamadı.]")

    text = "\n".join(lines)
    fallback_vision = {
        "image_type": "step_model",
        "baslik_bloku": {
            "baslik":        ", ".join(products[:3]) if products else "",
            "tarih":         header.get("tarih", ""),
            "cizen":         header.get("yazar", ""),
            "firma":         header.get("organizasyon", ""),
            "aciklama_step": header.get("aciklama", ""),
            "step_schema":   header.get("step_schema", ""),
        },
        "parca_listesi": [{"aciklama": p} for p in products],
        "genel_metin":   text,
    }

    return [{
        "id": str(uuid.uuid4()),
        "text": text,
        "metadata": {
            "page": 1, "chunk_index": 1,
            "source": basename, "type": "step_model",
            "total_pages": 1, "vision_data": fallback_vision,
        },
    }]
