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

_PROMPT = """Bu görseli analiz et. Görsel türünü belirle ve aşağıdaki JSON formatında yanıt ver.

GÖRSEL TÜRLERİ:
- teknik_resim: TEK bir parçanın veya montajın imalat/tasarım çizimi. Başlık bloğu, ölçüler, toleranslar, projeksiyon görünüşleri, kesit çizimleri içerir. CAD programından alınan tek parça çıktısı.
- nesting: Birden fazla parçanın bir levha/sac üzerine yerleşimini gösteren kesim planı. Genellikle "kullanım oranı / fire oranı", NC program adı, farklı şekillerde çok sayıda parça, levha boyutu bilgisi içerir. CNC/lazer/plazma kesim için üretilir.
- sap_ekrani: SAP veya kurumsal ERP/yazılım ekranı, form, menü
- form: Doldurulan belge, anket, tablo
- sema: Akış şeması, süreç diyagramı, organizasyon şeması, devre şeması
- fotograf: Ürün/nesne/kişi fotoğrafı
- diger: Diğer

Teknik resim için YANIT FORMATI (SADECE JSON, başka hiçbir şey yazma):
{
  "image_type": "teknik_resim",
  "baslik_bloku": {
    "cizim_numarasi": "",
    "revizyon": "",
    "olcek": "",
    "tarih": "",
    "cizen": "",
    "onaylayan": "",
    "firma": "",
    "proje": "",
    "baslik": ""
  },
  "parca_listesi": [
    {"poz": "", "adet": "", "malzeme": "", "aciklama": ""}
  ],
  "olcular": [],
  "toleranslar": [],
  "notlar": [],
  "yuzey_islemleri": [],
  "projeksiyon_acisi": "",
  "kesitler": [],
  "genel_metin": "Çizimdeki tüm görünen metnin özeti"
}

Nesting için YANIT FORMATI:
{
  "image_type": "nesting",
  "program_adi": "NC / nesting program adı (varsa)",
  "malzeme_numarasi": "Parça/sipariş/malzeme numarası (örn: 92530740)",
  "levha_boyutu": "Levha/sac boyutu (örn: 3000x1500x3mm)",
  "malzeme": "Malzeme türü / cinsi (örn: ST37, S355J2+AR, AISI 304, Alüminyum 5083)",
  "kalinlik": "Kalınlık (örn: 3mm, 6MM)",
  "kullanim_orani": "Malzeme kullanım yüzdesi (örn: 87.3%)",
  "fire_orani": "Fire/atık yüzdesi (örn: 12.7%)",
  "toplam_parca_adedi": "Toplam parça adedi",
  "islemler": ["lazer kesim", "plazma kesim", "bükme", "delme", "kaynak"],
  "parca_listesi": [
    {"parca_adi": "", "adet": "", "malzeme": ""}
  ],
  "notlar": [],
  "genel_metin": "Nesting planındaki tüm görünen metin ve bilgilerin özeti"
}

Diğer türler için YANIT FORMATI:
{
  "image_type": "sap_ekrani | form | sema | fotograf | diger",
  "baslik": "",
  "icerik": "Tüm görünen metinler, tablo verileri, buton/menü metinleri dahil",
  "genel_metin": "Özet"
}

Boş alanları boş string veya boş liste olarak bırak.
SADECE JSON döndür, markdown kod bloğu veya açıklama yazma."""


def parse_image(
    file_path: str,
    original_name: str | None = None,
) -> list[dict]:
    file_basename = original_name or os.path.basename(file_path)
    ext = file_basename.rsplit(".", 1)[-1].lower() if "." in file_basename else "img"

    vision_data = _read_with_vision(file_path)

    if vision_data:
        text = _build_rag_text(file_basename, ext, vision_data)
        img_type = vision_data.get("image_type", "diger")
        chunk_type = (
            "teknik_resim" if img_type == "teknik_resim"
            else "nesting"  if img_type == "nesting"
            else "image_vision"
        )
    else:
        size_kb = round(os.path.getsize(file_path) / 1024, 1)
        text = (
            f"[{file_basename} | Görsel]\n"
            f"DOSYA TÜRÜ: {ext.upper()}\n"
            f"BOYUT: {size_kb} KB\n"
            "[Not: Vision API anahtarı olmadığından içerik okunamadı. "
            "Dosya kaydedildi, görsel önizleme mevcut.]"
        )
        chunk_type = "image_metadata_only"
        vision_data = None

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
        }
    }

    if vision_data:
        chunk["metadata"]["vision_data"] = vision_data

    return [chunk]


def _build_rag_text(basename: str, ext: str, data: dict) -> str:
    """Yapılandırılmış JSON'dan RAG arama için zengin metin üretir."""
    img_type = data.get("image_type", "diger")
    lines = [f"[{basename} | {img_type.upper()}]", f"DOSYA TÜRÜ: {ext.upper()} görseli", ""]

    if img_type == "nesting":
        for label, key in [
            ("Program",           "program_adi"),
            ("Malzeme No",        "malzeme_numarasi"),
            ("Levha Boyutu",      "levha_boyutu"),
            ("Malzeme",           "malzeme"),
            ("Kalınlık",          "kalinlik"),
            ("Kullanım Oranı",    "kullanim_orani"),
            ("Fire Oranı",        "fire_orani"),
            ("Toplam Parça",      "toplam_parca_adedi"),
        ]:
            val = data.get(key, "")
            if val:
                lines.append(f"{label}: {val}")
        lines.append("")

        parcalar = data.get("parca_listesi", [])
        if parcalar:
            lines.append("── PARÇA LİSTESİ ──")
            for p in parcalar:
                parts = [
                    p.get("parca_adi", ""),
                    f"Adet:{p['adet']}"       if p.get("adet")    else "",
                    f"Malzeme:{p['malzeme']}" if p.get("malzeme") else "",
                ]
                line = " | ".join(x for x in parts if x)
                if line:
                    lines.append(line)
            lines.append("")

        islemler = data.get("islemler", [])
        if islemler:
            lines.append("── YAPILACAK İŞLEMLER ──")
            lines.append(", ".join(str(i) for i in islemler))
            lines.append("")

        notlar = data.get("notlar", [])
        if notlar:
            lines.append("── NOTLAR ──")
            for n in notlar:
                lines.append(f"• {n}")
            lines.append("")

    elif img_type == "teknik_resim":
        bb = data.get("baslik_bloku", {})
        if any(v for v in bb.values() if v):
            lines.append("── BAŞLIK BLOĞU ──")
            for label, key in [
                ("Çizim No",  "cizim_numarasi"),
                ("Revizyon",  "revizyon"),
                ("Ölçek",     "olcek"),
                ("Tarih",     "tarih"),
                ("Çizen",     "cizen"),
                ("Onaylayan", "onaylayan"),
                ("Firma",     "firma"),
                ("Proje",     "proje"),
                ("Başlık",    "baslik"),
            ]:
                val = bb.get(key, "")
                if val:
                    lines.append(f"{label}: {val}")
            lines.append("")

        parcalar = data.get("parca_listesi", [])
        if parcalar:
            lines.append("── PARÇA LİSTESİ ──")
            for p in parcalar:
                parts = [
                    f"Poz:{p['poz']}"         if p.get("poz")      else "",
                    f"Adet:{p['adet']}"        if p.get("adet")     else "",
                    f"Malzeme:{p['malzeme']}"  if p.get("malzeme")  else "",
                    p.get("aciklama", ""),
                ]
                line = " | ".join(x for x in parts if x)
                if line:
                    lines.append(line)
            lines.append("")

        for label, key in [
            ("ÖLÇÜLER",           "olcular"),
            ("TOLERANSLAR",       "toleranslar"),
            ("YÜZEY İŞLEMLERİ",  "yuzey_islemleri"),
            ("KESİTLER",          "kesitler"),
        ]:
            items = data.get(key, [])
            if items:
                lines.append(f"── {label} ──")
                lines.append(", ".join(str(i) for i in items))
                lines.append("")

        notlar = data.get("notlar", [])
        if notlar:
            lines.append("── NOTLAR ──")
            for n in notlar:
                lines.append(f"• {n}")
            lines.append("")

        proj = data.get("projeksiyon_acisi", "")
        if proj:
            lines.append(f"Projeksiyon: {proj}")
            lines.append("")

    else:
        baslik = data.get("baslik", "")
        if baslik:
            lines.append(f"BAŞLIK: {baslik}")
            lines.append("")
        icerik = data.get("icerik", "")
        if icerik:
            lines.append("İÇERİK:")
            lines.append(icerik)
            lines.append("")

    genel_metin = data.get("genel_metin", "")
    if genel_metin:
        lines.append("── GENEL METİN ──")
        lines.append(genel_metin)

    return "\n".join(lines)


def _get_active_prompt() -> str:
    """Aktif promptu döner: custom > field-based > hardcoded default."""
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select
        import json as _json

        with get_session() as db:
            rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

        # Custom prompt öncelikli
        custom = (rows.get("doc_processing_prompt") or "").strip()
        if custom:
            return custom

        # Field toggle'larından dinamik prompt üret
        raw = rows.get("doc_output_fields")
        saved = _json.loads(raw) if raw else {}
        from api.routes.settings import DOC_OUTPUT_GROUPS, _build_prompt_from_groups
        all_keys = {f["key"] for g in DOC_OUTPUT_GROUPS for f in g["fields"]}
        enabled = {k for k in all_keys if saved.get(k, True)}
        if enabled:
            return _build_prompt_from_groups(enabled)
    except Exception:
        pass
    return _PROMPT


def _read_with_vision(image_path: str) -> dict | None:
    """Vision AI ile görsel analiz eder. JSON dict döner, başarısızsa None."""
    try:
        from services.processors.vision_utils import get_vision_config
        from services.processors.process_progress import step as _step
        api_key, model_name = get_vision_config()
        if not api_key:
            return None

        import google.generativeai as genai
        from PIL import Image

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        img = Image.open(image_path)

        _step(f"Vision AI'ya gönderiliyor ({model_name})…")
        prompt = _get_active_prompt()
        response = model.generate_content([prompt, img])
        _step("Analiz sonuçları işleniyor…")
        raw = (response.text or "").strip()
        result = _parse_json_response(raw)
        if result:
            img_type = result.get("image_type", "diger")
            label = {"teknik_resim": "Teknik Resim", "nesting": "Nesting"}.get(img_type, img_type)
            _step(f"Tür tespit edildi: {label}")
        return result

    except Exception as e:
        print(f"[image_processor] Vision hatası: {e}")
        return None


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
