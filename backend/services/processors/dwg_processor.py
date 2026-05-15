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
    """
    ezdxf ile DXF dosyasından TEXT/MTEXT/ATTRIB entity'lerini çıkarır.
    INSERT bloklarındaki ATTRIB'ler (başlık bloğu alanları) 'TAG: değer' olarak eklenir.
    Y koordinatına göre sıralar (başlık bloğu genelde altta = küçük Y).
    """
    try:
        try:
            import ezdxf
            doc = ezdxf.readfile(dxf_path)
        except Exception:
            import ezdxf.recover as _rec
            doc, _ = _rec.readfile(dxf_path)

        items: list[tuple[float, float, str]] = []  # (x, y, text)
        seen: set[str] = set()

        def _add(text: str, x: float, y: float) -> None:
            if text and text not in seen:
                seen.add(text)
                items.append((x, y, text))

        for layout in doc.layouts:
            for entity in layout:
                try:
                    dt = entity.dxftype()
                    ins = entity.dxf.get("insert")
                    ex = ins.x if ins else 0.0
                    ey = ins.y if ins else 0.0

                    if dt == "TEXT":
                        t = (entity.dxf.get("text") or "").strip()
                        if t:
                            _add(t, ex, ey)

                    elif dt == "MTEXT":
                        t = entity.plain_mtext().strip()
                        if t:
                            _add(t, ex, ey)

                    elif dt in ("ATTDEF", "ATTRIB"):
                        t = (entity.dxf.get("text") or "").strip()
                        if t:
                            _add(t, ex, ey)

                    elif dt == "INSERT":
                        # Başlık bloğu alanları INSERT içindeki ATTRIB olarak saklanır
                        for attrib in entity.attribs:
                            val = (attrib.dxf.get("text") or "").strip()
                            tag = (attrib.dxf.get("tag") or "").strip()
                            ai  = attrib.dxf.get("insert")
                            ax  = ai.x if ai else ex
                            ay  = ai.y if ai else ey
                            if tag and val:
                                _add(f"{tag}: {val}", ax, ay)
                            elif val:
                                _add(val, ax, ay)

                except Exception:
                    pass

        items.sort(key=lambda t: t[1])
        return [t for _, _, t in items]

    except Exception as e:
        print(f"[dwg_processor] ezdxf hatası: {e}")
        return []


# ── DXF → PNG render (ezdxf matplotlib backend) ──────────────────

def _dxf_to_png(dxf_path: str, out_path: str) -> bool:
    """
    ezdxf matplotlib backend ile DXF'i PNG görseline dönüştürür.
    Başarılıysa True, herhangi bir hata / eksik kütüphane varsa False döner.
    """
    try:
        import ezdxf
        from ezdxf.addons.drawing import RenderContext, Frontend  # type: ignore
        from ezdxf.addons.drawing.matplotlib import MatplotlibBackend  # type: ignore
        import matplotlib  # type: ignore
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt  # type: ignore

        try:
            doc = ezdxf.readfile(dxf_path)
        except Exception:
            import ezdxf.recover as _rec
            doc, _ = _rec.readfile(dxf_path)

        msp = doc.modelspace()
        fig = plt.figure(figsize=(20, 15), dpi=1)
        ax = fig.add_axes([0, 0, 1, 1])
        ctx = RenderContext(doc)
        out_backend = MatplotlibBackend(ax)
        Frontend(ctx, out_backend).draw_layout(msp, finalize=True)
        fig.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        return os.path.exists(out_path) and os.path.getsize(out_path) > 1024
    except Exception as e:
        print(f"[dwg_processor] DXF→PNG render hatası: {e}")
        return False


# ── SAP no fallback ───────────────────────────────────────────────

def _fill_sap_from_filename(vision_data: dict, basename: str) -> None:
    """
    parca_tanim.kimlik_numarasi boşsa dosya adındaki sayıyı SAP no olarak doldurur.
    Hem düz (92530740) hem noktalı Almanca format (92.530.740) desteklenir.
    """
    bb = vision_data.setdefault("parca_tanim", {})
    if bb.get("kimlik_numarasi"):
        return
    # Önce uzun SAP (7-10 hane, düz)
    m = re.search(r'\b(\d{7,10})\b', basename)
    if m:
        bb["kimlik_numarasi"] = m.group(1)
        return
    # Almanca noktalı format: "2.840.123" → "2840123" (7+ hane)
    m = re.search(r'\b(\d{1,3}(?:\.\d{3}){2,})\b', basename)
    if m:
        normalized = m.group(1).replace(".", "")
        if len(normalized) >= 7:
            bb["kimlik_numarasi"] = normalized


# ── DWG metin ön-işleme ───────────────────────────────────────────

# "92530740 - 6 MM - S355J2+AR" veya "92530740 - 6MM - S355J2+AR"
# Hem düz hem Almanca noktalı format (92.530.740) desteklenir
_PART_LINE = re.compile(
    r'\b(\d{1,3}(?:\.\d{3})+|\d{7,10})\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|MM)\s*[-–]\s*([A-Z0-9+/\-\.]+)',
    re.IGNORECASE,
)

# "Ident nummer", "Identnr", "Sachnummer", "Part No", "Malzeme No" gibi etiket kalıpları
_IDENT_LABEL = re.compile(
    r'(?:ident\s*(?:nummer|[-.]?\s*nr\.?|[-.]?\s*no\.?)?'
    r'|zeichn(?:ungs)?\s*[-.]?\s*(?:nummer|nr\.?|no\.?)?'
    r'|part\s*[-.]?\s*(?:number|no\.?|nr\.?)'
    r'|malzeme\s*[-.]?\s*no(?:\.?|su)?'
    r'|sap\s*[-.]?\s*no\.?'
    r'|kimlik\s*[-.]?\s*no\.?'
    r'|bauteil\s*[-.]?\s*nr\.?'
    r'|sach\s*(?:nummer|nr\.?))',
    re.IGNORECASE,
)

# Avrupa (Almanca) noktalı sayı formatı: 92.530.740 veya düz 7-10 haneli rakam
_EU_NUMBER = re.compile(r'\b(\d{1,3}(?:\.\d{3})+|\d{7,10})\b')


def _norm_number(s: str) -> str:
    """Avrupa noktalı sayıdaki ayırıcı noktaları kaldırır: '92.530.740' → '92530740'."""
    return s.replace(".", "")


# Bilinen imalat operasyonları (Türkçe)
_OP_KEYWORDS = re.compile(
    r'lazer|laser|kesim|bükm|büküm|kaynak|delm|tel kesim|pres|boya|kumlam'
    r'|fosfat|galvan|nikel|krom|kaplam|montaj|markalama|çapak|vibrasy',
    re.IGNORECASE,
)


def _extract_dwg_meta(texts: list[str]) -> dict:
    """
    DWG metin entity'lerinden AI öncesi ön-bilgi çıkarır.
    Döner: kimlik_numarasi, malzeme, kalinlik, islem_sirasi (varsa).
    """
    result: dict = {}

    # Strateji 1: "92530740 - 6 MM - S355J2+AR" tek satır formatı
    for t in texts:
        m = _PART_LINE.search(t.strip())
        if m:
            raw_id = m.group(1)
            result["kimlik_numarasi"] = _norm_number(raw_id)
            result["kalinlik"]        = m.group(2).replace(",", ".")
            result["malzeme"]         = m.group(3).strip().rstrip("-").strip()
            break

    # Strateji 2: "TAG: değer" formatı — "IDENT: 92530740" veya "Ident nummer: 92530740"
    if not result.get("kimlik_numarasi"):
        for t in texts:
            if ":" not in t:
                continue
            label, _, value = t.partition(":")
            label = label.strip()
            value = value.strip()
            if _IDENT_LABEL.fullmatch(label) or _IDENT_LABEL.search(label):
                m = _EU_NUMBER.search(value)
                if m:
                    result["kimlik_numarasi"] = _norm_number(m.group(1))
                    break

    # Strateji 3: Ardışık entity'ler — etiket satırı + değer satırı
    if not result.get("kimlik_numarasi"):
        for i, t in enumerate(texts[:-1]):
            if _IDENT_LABEL.fullmatch(t.strip()):
                nxt = texts[i + 1].strip()
                m = _EU_NUMBER.search(nxt)
                if m:
                    result["kimlik_numarasi"] = _norm_number(m.group(1))
                    break

    # Operasyon listesi: "Operasyon" başlığı + sıra no + operasyon adı heuristic
    ops: list[dict] = []
    pending_sira: str | None = None
    in_op_section = False

    for t in texts:
        t_clean = t.strip()
        if not t_clean:
            continue

        if re.match(r'^operasyon[lar]*$', t_clean, re.IGNORECASE):
            in_op_section = True
            continue

        if in_op_section:
            if re.match(r'^\d{1,3}$', t_clean):
                pending_sira = t_clean
            elif _OP_KEYWORDS.search(t_clean):
                ops.append({
                    "sira":     pending_sira or str(len(ops) + 1),
                    "islem":    t_clean,
                    "aciklama": "",
                })
                pending_sira = None
            elif re.match(r'^s[ı|i]ra$', t_clean, re.IGNORECASE):
                pass  # başlık satırı
            elif len(t_clean) > 40:
                in_op_section = False  # uzun metin → operasyon bölümü bitti

    if ops:
        result["islem_sirasi"] = ops

    return result


def _merge_dwg_meta(vision_data: dict, dwg_meta: dict) -> None:
    """AI sonucuna regex ön-bilgilerini yeni şemaya göre ekler (boş alanları doldurur)."""
    if not dwg_meta:
        return
    pt = vision_data.setdefault("parca_tanim", {})
    if not pt.get("kimlik_numarasi") and dwg_meta.get("kimlik_numarasi"):
        pt["kimlik_numarasi"] = dwg_meta["kimlik_numarasi"]
    mu = vision_data.setdefault("malzeme_uretim", {})
    if not mu.get("malzeme") and dwg_meta.get("malzeme"):
        mu["malzeme"] = dwg_meta["malzeme"]
    geo = vision_data.setdefault("geometrik", {})
    if not geo.get("boyutlar") and dwg_meta.get("kalinlik"):
        geo["boyutlar"] = f"Kalınlık: {dwg_meta['kalinlik']} mm"


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

def _build_dwg_text_prompt(texts: list[str], dwg_meta: dict) -> str:
    """DXF metin entity'leri için odaklı AI promptu oluşturur."""
    joined = "\n".join(texts[:1000])

    meta_hint = ""
    if dwg_meta:
        parts = []
        if dwg_meta.get("kimlik_numarasi"):
            parts.append(f"  Kimlik/SAP No: {dwg_meta['kimlik_numarasi']}")
        if dwg_meta.get("malzeme"):
            parts.append(f"  Malzeme: {dwg_meta['malzeme']}")
        if dwg_meta.get("kalinlik"):
            parts.append(f"  Kalınlık: {dwg_meta['kalinlik']} mm")
        if parts:
            meta_hint = "Regex ile önceden tespit edilen değerler (doğrula ve kullan):\n" + "\n".join(parts) + "\n\n"

    return f"""Aşağıda bir DWG/DXF teknik çiziminden ezdxf ile çıkarılan ham metin entity'leri var.
Bu metinleri analiz ederek teknik çizimin tüm bilgilerini JSON formatında çıkar.

{meta_hint}KURALLAR:
- SADECE JSON döndür — markdown, kod bloğu, açıklama YAZMA
- Bulamadığın alanı ekleme — boş bırakmak yerine o alanı tamamen çıkar
- "TAG: Değer" formatındaki entity'leri doğrudan eşleştir
- Çizimde hangi alanlar varsa hepsini çıkar, sadece örneklerle sınırlı değilsin

ALAN EŞLEMELERİ (başlık bloğu / title block alanları):
- parca_tanim.kimlik_numarasi → SAP/ident/malzeme no (7-10 haneli rakam; noktalı format 92.530.740 → 92530740)
- parca_tanim.parca_adi → bileşen adı (Benennung, Bezeichnung, Parça Adı, Name gibi tag'lerin değeri)
- parca_tanim.cizim_numarasi → çizim/Zeichnung no
- parca_tanim.revizyon → revizyon (Rev, Revision)
- malzeme_uretim.malzeme → malzeme (Material, Malzeme, Werkstoff)
- malzeme_uretim.agirlik → ağırlık (Gewicht, Ağırlık, Weight)
- malzeme_uretim.yuzey_standardi → yüzey işlemi (Oberfläche, Surface Finish)
- geometrik.boyutlar → boyutlar mm cinsinden
- geometrik.olcek → ölçek (Maßstab, Scale, Ölçek)
- toleranslar.talasli_tolerans → talaşlı tolerans (ISO 2768-m, ISO 286 vb.)
- toleranslar.talassiz_tolerans → talaşsız tolerans
- izlenebilirlik.cizim_tarihi → tarih (Datum, Date, Tarih)
- izlenebilirlik.cizen → çizen (Gezeichnet, Drawn, Çizen)
- izlenebilirlik.onaylayan → onaylayan (Geprüft, Checked, Freigegeben, Onaylayan)

ÖRNEK FORMAT:
{{
  "image_type": "teknik_resim",
  "parca_tanim": {{
    "kimlik_numarasi": "92530740",
    "parca_adi": "Bağlantı Sacı",
    "cizim_numarasi": "MEC-2024-001",
    "revizyon": "A"
  }},
  "malzeme_uretim": {{
    "malzeme": "S355J2+AR",
    "agirlik": "2.5 kg"
  }},
  "geometrik": {{
    "boyutlar": "150 x 80 x 6 mm",
    "olcek": "1:2"
  }},
  "toleranslar": {{
    "talasli_tolerans": "ISO 2768-m",
    "talassiz_tolerans": "ISO 2768-K"
  }},
  "izlenebilirlik": {{
    "cizim_tarihi": "15.05.2024",
    "cizen": "A. Yılmaz",
    "onaylayan": "B. Demir"
  }}
}}

DXF METİN VERİLERİ:
{joined}"""


def _analyze_texts(texts: list[str], dwg_meta: dict | None = None) -> tuple[dict | None, str]:
    """Çıkarılan metinleri AI'ya gönderir, JSON döndürür."""
    try:
        from services.processors.vision_utils import get_doc_processing_config
        from services.processors.process_progress import step as _step

        api_key, model_name, provider, base_url = get_doc_processing_config()
        if not api_key:
            return None, "API anahtarı yapılandırılmamış"

        full_prompt = _build_dwg_text_prompt(texts, dwg_meta or {})

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


# ── Chunk builder (ortak) ────────────────────────────────────────

def _build_chunk(
    basename: str,
    vision_data: dict,
    dwg_meta: dict | None = None,
    render_path: str | None = None,
) -> list[dict]:
    if dwg_meta:
        _merge_dwg_meta(vision_data, dwg_meta)
    _fill_sap_from_filename(vision_data, basename)
    from services.processors.image_processor import _build_rag_text
    ext        = basename.rsplit(".", 1)[-1].lower() if "." in basename else "dwg"
    img_type   = vision_data.get("image_type", "teknik_resim")
    chunk_type = "nesting" if img_type == "nesting" else "teknik_resim"
    meta = {
        "page": 1, "chunk_index": 1,
        "source": basename, "type": chunk_type,
        "total_pages": 1, "vision_data": vision_data,
    }
    if render_path and os.path.exists(render_path):
        meta["render_path"] = render_path
    return [{"id": str(uuid.uuid4()), "text": _build_rag_text(basename, ext, vision_data), "metadata": meta}]


# ── Ana giriş noktası ─────────────────────────────────────────────

def parse_dwg(file_path: str, original_name: str | None = None) -> list[dict]:
    from services.processors.process_progress import step as _step

    basename = original_name or os.path.basename(file_path)
    dxf_path = None
    png_path = None

    try:
        # 1. DWG → DXF
        _step("DWG → DXF dönüştürülüyor…")
        dxf_path, oda_err = _dwg_to_dxf(file_path, timeout=30)

        if not dxf_path:
            return _error_chunk(basename, oda_err)

        # 2. DXF → metin (her iki yol için de meta çıkarımında kullanılır)
        _step("DXF metin içeriği okunuyor…")
        texts    = _extract_dxf_texts(dxf_path)
        dwg_meta = _extract_dwg_meta(texts) if texts else {}
        print(f"[dwg_processor] {basename}: {len(texts)} metin entity çıkarıldı")
        if texts:
            print(f"[dwg_processor] İlk 20 entity: {texts[:20]}")

        # 3. DXF → PNG → vision AI (görsel analiz; yetersizse metin analizine düşer)
        _SCHEMA_KEYS = ("parca_tanim", "geometrik", "malzeme_uretim", "toleranslar", "izlenebilirlik")
        png_path = os.path.join(tempfile.gettempdir(), f"dwg_{uuid.uuid4().hex}.png")
        _step("DXF görsele dönüştürülüyor…")
        # DWG ile aynı klasörde kalıcı render PNG: uuid_dosyaadi_render.png
        render_png = os.path.splitext(file_path)[0] + "_render.png"
        png_vision_data = None  # vision AI'dan gelen veri (yedek olarak sakla)
        if _dxf_to_png(dxf_path, png_path):
            try:
                shutil.copy2(png_path, render_png)
            except Exception:
                render_png = None
            _step("DXF görseli yapay zekaya gönderiliyor…")
            try:
                from services.processors.image_processor import parse_image
                vision_chunks = parse_image(png_path, original_name=basename)
                if vision_chunks:
                    vd = vision_chunks[0]["metadata"].get("vision_data")
                    if vd and isinstance(vd, dict):
                        # image_type "diger" ise teknik_resim'e normalize et
                        if vd.get("image_type") != "teknik_resim":
                            vd = {"image_type": "teknik_resim", **{
                                k: v for k, v in vd.items()
                                if k not in ("image_type", "genel_metin", "icerik")
                            }}
                        filled = sum(
                            1 for k in _SCHEMA_KEYS
                            if isinstance(vd.get(k), dict) and any(v for v in vd.get(k, {}).values() if v)
                        )
                        if filled >= 2:
                            return _build_chunk(basename, vd, dwg_meta, render_png)
                        png_vision_data = vd
                    _step("Görsel analiz yetersiz, DXF metin analizine geçiliyor…")
            except Exception as e:
                print(f"[dwg_processor] Vision AI hatasi: {e}")

        # 4. Fallback: metin → AI text analysis
        if not texts:
            if png_vision_data:
                _step("Metin yok, görsel analiz sonucu kullanılıyor…")
                return _build_chunk(basename, png_vision_data, dwg_meta, render_png)
            _step("DXF boş, dosya adından minimal veri oluşturuluyor…")
            return _build_chunk(basename, {"image_type": "teknik_resim"}, dwg_meta, render_png)

        _step("DWG metinleri AI'ya gönderiliyor…")
        vision_data, ai_err = _analyze_texts(texts, dwg_meta)
        if vision_data:
            return _build_chunk(basename, vision_data, dwg_meta, render_png)

        # Metin AI başarısız oldu — görsel analiz sonucu veya minimal chunk dön
        if png_vision_data:
            return _build_chunk(basename, png_vision_data, dwg_meta, render_png)
        if render_png and os.path.exists(render_png):
            return _build_chunk(basename, {"image_type": "teknik_resim"}, dwg_meta, render_png)
        return _error_chunk(basename, ai_err)

    finally:
        for tmp in (dxf_path, png_path):
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
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
