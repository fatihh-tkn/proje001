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
- teknik_resim: TEK bir parçanın veya montajın imalat/tasarım çizimi. Başlık bloğu, ölçüler, toleranslar, projeksiyon görünüşleri, kesit çizimleri içerir.
- nesting: Birden fazla parçanın bir levha/sac üzerine yerleşimini gösteren kesim planı. Kullanım oranı, NC program adı, levha boyutu, çok sayıda parça içerir.
- sap_ekrani: SAP veya kurumsal ERP/yazılım ekranı
- form: Doldurulan belge, anket, tablo
- sema: Akış şeması, süreç diyagramı, devre şeması
- fotograf: Ürün/nesne/kişi fotoğrafı
- diger: Diğer

Teknik resim için YANIT FORMATI (SADECE JSON, başka hiçbir şey yazma):
{
  "image_type": "teknik_resim",
  "baslik_bloku": {
    "cizim_numarasi": "Çizim/parça numarası (Zeichnungsnummer, Drawing No, Drw No)",
    "kimlik_numarasi": "ERP/SAP malzeme numarası (Identnummer, Ident-Nr, Part No, Malzeme No)",
    "revizyon": "Revizyon kodu (örn: A, B, Rev.2, Index)",
    "olcek": "Ölçek (örn: 1:1, 1:2, 1:10, Maßstab)",
    "tarih": "Çizim tarihi (Datum)",
    "cizen": "Çizen kişi/departman (Gez., Drawn by)",
    "onaylayan": "Onaylayan kişi (Gepr., Approved by)",
    "kontrol_eden": "Kontrol eden kişi",
    "firma": "Firma/şirket adı",
    "proje": "Proje adı veya numarası",
    "baslik": "Parça/montaj adı/başlığı (Benennung, Title, Description)",
    "blatt_format": "Sayfa formatı (A4, A3, A0 vb.)",
    "malzeme": "Malzeme cinsi (Werkstoff, Material — örn: ST37, S235JR, AISI 304)",
    "yuzey_islem": "Yüzey işlemi (Oberflächenbehandlung, Surface treatment)",
    "sertlik": "Sertlik değeri (varsa)",
    "agirlik": "Parça ağırlığı (Fertiggewicht, Weight — varsa)",
    "birim": "Kullanılan birim (mm, cm, inch)",
    "sayfa": "Sayfa numarası / toplam sayfa (Blatt X von Y)"
  },
  "olcular": [
    {
      "etiket": "Ölçünün adı/etiketi (örn: Uzunluk, Genişlik, Yükseklik, Çap, Yarıçap, Et kalınlığı, Delik çapı, Açı, Adım, Diş adımı)",
      "deger": "Sayısal değer (örn: 852, 25.4, 120.5)",
      "birim": "Birim (mm, cm, inch, derece)",
      "tolerans": "Bu ölçüye ait tolerans (örn: ±0.1, +0.2/-0.1, H7, k6)",
      "aciklama": "Ek not veya bağlam (varsa)"
    }
  ],
  "parca_listesi": [
    {
      "poz": "Pozisyon numarası",
      "adet": "Adet",
      "cizim_no": "Alt parça çizim numarası",
      "malzeme": "Malzeme",
      "yarim_mamul": "Yarı mamul boyutu (varsa, örn: Ø20x100)",
      "aciklama": "Parça açıklaması / standart adı"
    }
  ],
  "toleranslar": [
    {
      "tip": "Tolerans tipi (örn: Genel tolerans, Form toleransı, Konum toleransı, Yüzey pürüzlülüğü)",
      "deger": "Tolerans değeri veya standardı (örn: ISO 2768-m, DIN 7168-m, Ra 3.2)",
      "aciklama": "Uygulanan yüzey veya özellik"
    }
  ],
  "islem_sirasi": [
    {
      "sira": "İşlem sıra numarası",
      "islem": "İşlem adı (Lazer kesim, Bükme, Kaynak, Delme, Tornalama, Frezeleme, Boyama vb.)",
      "aciklama": "Varsa ek detay"
    }
  ],
  "yuzey_islemleri": [],
  "notlar": [],
  "kesitler": [],
  "projeksiyon_acisi": "1. açı veya 3. açı projeksiyon",
  "genel_metin": "Çizimdeki tüm görünen metin, not, sembol ve bilgilerin kapsamlı özeti"
}

ÖLÇÜ ÇIKARMA KURALLARI:
- Çizimdeki HER ölçüyü ayrı bir eleman olarak listele
- Ölçüye bağlı etiket yoksa geometrik konumuna göre tahmin et (en uzun kenar → Uzunluk, vb.)
- Çap işaretli (Ø) ölçüler → etiket "Çap", yarıçap (R) → "Yarıçap"
- Açı ölçüleri → etiket "Açı", birim "derece"
- Diş ve adım ölçülerini (M, pitch) ayrıca belirt

Nesting için YANIT FORMATI:
{
  "image_type": "nesting",
  "program_adi": "NC / nesting program adı (varsa)",
  "malzeme_numarasi": "Parça/sipariş/malzeme numarası",
  "levha_boyutu": "Levha/sac boyutu (örn: 3000x1500x3mm)",
  "malzeme": "Malzeme türü (örn: ST37, S355J2+AR, AISI 304)",
  "kalinlik": "Kalınlık (örn: 3mm)",
  "kullanim_orani": "Kullanım yüzdesi (örn: 87.3%)",
  "fire_orani": "Fire/atık yüzdesi (örn: 12.7%)",
  "toplam_parca_adedi": "Toplam parça adedi",
  "islemler": ["lazer kesim", "plazma kesim", "bükme", "delme", "kaynak"],
  "parca_listesi": [
    {"parca_adi": "", "adet": "", "malzeme": "", "kalinlik": ""}
  ],
  "notlar": [],
  "genel_metin": "Nesting planındaki tüm görünen metin ve bilgilerin özeti"
}

Diğer türler için YANIT FORMATI:
{
  "image_type": "sap_ekrani | form | sema | fotograf | diger",
  "baslik": "",
  "icerik": "Tüm görünen metinler, tablo verileri dahil",
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

    vision_data, vision_error = _read_with_vision(file_path)

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
    if vision_error:
        chunk["metadata"]["vision_error"] = vision_error

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
                ("Çizim No",       "cizim_numarasi"),
                ("Kimlik No",      "kimlik_numarasi"),
                ("Başlık",         "baslik"),
                ("Revizyon",       "revizyon"),
                ("Ölçek",          "olcek"),
                ("Tarih",          "tarih"),
                ("Çizen",          "cizen"),
                ("Onaylayan",      "onaylayan"),
                ("Kontrol Eden",   "kontrol_eden"),
                ("Firma",          "firma"),
                ("Proje",          "proje"),
                ("Malzeme",        "malzeme"),
                ("Yüzey İşlemi",   "yuzey_islem"),
                ("Sertlik",        "sertlik"),
                ("Ağırlık",        "agirlik"),
                ("Birim",          "birim"),
                ("Format",         "blatt_format"),
                ("Sayfa",          "sayfa"),
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
                    f"Poz:{p['poz']}"              if p.get("poz")         else "",
                    f"Adet:{p['adet']}"             if p.get("adet")        else "",
                    f"Malzeme:{p['malzeme']}"       if p.get("malzeme")     else "",
                    f"Yarı mamul:{p['yarim_mamul']}" if p.get("yarim_mamul") else "",
                    p.get("aciklama", ""),
                ]
                line = " | ".join(x for x in parts if x)
                if line:
                    lines.append(line)
            lines.append("")

        # Ölçüler: obje dizisi (yeni format) veya düz dizi (eski/custom)
        olcular = data.get("olcular", [])
        if olcular:
            lines.append("── ÖLÇÜLER ──")
            for o in olcular:
                if isinstance(o, dict):
                    etiket = o.get("etiket", "")
                    deger  = o.get("deger", "")
                    birim  = o.get("birim", "mm")
                    tol    = o.get("tolerans", "")
                    line   = f"{etiket}: {deger} {birim}".strip()
                    if tol:
                        line += f" [{tol}]"
                    if line.strip(": "):
                        lines.append(line)
                else:
                    lines.append(str(o))
            lines.append("")

        # Toleranslar: obje dizisi veya düz dizi
        toleranslar = data.get("toleranslar", [])
        if toleranslar:
            lines.append("── TOLERANSLAR ──")
            for t in toleranslar:
                if isinstance(t, dict):
                    tip    = t.get("tip", "")
                    deger  = t.get("deger", "")
                    acikl  = t.get("aciklama", "")
                    parts  = [x for x in [tip, deger, acikl] if x]
                    lines.append(" | ".join(parts))
                else:
                    lines.append(str(t))
            lines.append("")

        # İşlem sırası: obje dizisi veya düz dizi
        islem_sirasi = data.get("islem_sirasi", [])
        if islem_sirasi:
            lines.append("── İŞLEM SIRASI ──")
            for s in islem_sirasi:
                if isinstance(s, dict):
                    sira   = s.get("sira", "")
                    islem  = s.get("islem", "")
                    acikl  = s.get("aciklama", "")
                    line   = f"{sira} - {islem}" if sira else islem
                    if acikl:
                        line += f" ({acikl})"
                    if line.strip("- "):
                        lines.append(line)
                else:
                    lines.append(str(s))
            lines.append("")

        for label, key in [
            ("YÜZEY İŞLEMLERİ", "yuzey_islemleri"),
            ("KESİTLER",        "kesitler"),
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
