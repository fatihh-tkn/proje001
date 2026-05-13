"""
processors/dwg_processor.py
────────────────────────────────────────────────────────────────────
DWG / DXF → RAG chunk üretici (ezdxf tabanlı).

Strateji:
  1. ezdxf ile dosyayı aç (DWG R2004+ ve tüm DXF sürümleri desteklenir)
  2. TEXT / MTEXT / ATTRIB / ATTDEF entity'lerini koordinatlarıyla çıkar
  3. Regex ile parça numarası + işlem sırası bul (hızlı, ücretsiz)
  4. Regex bulamazsa → Gemini Flash fallback (opsiyonel)
  5. SVG export → tarayıcıda görüntülenebilir önizleme
  6. image_processor ile birebir uyumlu vision_data sözlüğü üret

Paralel toplu işleme:
  process_dwg_batch(file_list, max_workers=N) — ProcessPool ile
"""

from __future__ import annotations

import json
import os
import re
import uuid
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Iterable

# ── Regex desenleri (modül yüklenirken bir kez compile) ─────────────────────

_PART_NO_RE = re.compile(
    r"(?:P/?N|PART\s*NO|PARCA\s*NO|DRAW(?:ING)?\s*NO|"
    r"ÇİZİM\s*NO|MALZ?(?:EME)?\s*NO|RESIM\s*NO|"
    r"PART\s*NUMBER|DWG\s*NO)"
    r"\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-_./]{2,})",
    re.IGNORECASE,
)

_LOOSE_PART_NO_RE = re.compile(r"\b([A-Z]{1,4}[-_/]?\d{4,}(?:[-_/][A-Z0-9]+)?)\b")

_OP_KEYWORDS = (
    "lazer", "laser", "büküm", "bukum", "kaynak", "boya", "boyama",
    "taşlama", "taslama", "delik", "delme", "kesim", "freze", "torna",
    "montaj", "zımpara", "zimpara", "tavlama", "presleme", "kalıp",
    "kalip", "matkap", "ovalama", "rodüksiyon", "fosfat", "galvaniz",
    "anodize", "lehim", "punto", "tig", "mig", "co2",
)
_OP_PATTERN = "|".join(_OP_KEYWORDS)
_OP_SEQ_RE = re.compile(
    rf"(\d{{1,2}})\s*[\.\)\-]\s*({_OP_PATTERN})\b",
    re.IGNORECASE,
)

_REVISION_RE = re.compile(r"\bREV(?:IZYON|ISION)?[\s:.\-]*([A-Z0-9]{1,4})\b", re.IGNORECASE)
_SCALE_RE = re.compile(r"\bÖLÇE[KK]?[\s:.\-]*(\d+[\s:./]\d+|\d+/\d+|1:\d+|\d+:\d+)", re.IGNORECASE)
_MATERIAL_RE = re.compile(r"\b(?:MALZEME|MATERIAL)[\s:.\-]+([A-Z0-9][A-Z0-9\-\s+]{1,30})", re.IGNORECASE)


# ── Ana giriş noktası ────────────────────────────────────────────────

def parse_dwg(
    file_path: str,
    original_name: str | None = None,
    use_llm_fallback: bool = True,
    export_svg: bool = True,
) -> list[dict]:
    """
    DWG / DXF dosyasını işleyip image_processor formatında chunk listesi döner.

    Geri dönüş şablonu (chunk[0]):
      {
        "id": "...",
        "text": "RAG için zenginleştirilmiş metin",
        "metadata": {
          "type": "teknik_resim",
          "source": "...",
          "vision_data": {
            "image_type": "teknik_resim",
            "baslik_bloku": {...},
            "parca_listesi": [...],
            "islem_sirasi": [{"sira": 1, "ad": "lazer"}, ...],
            "olcular": [], "toleranslar": [], "notlar": [], "yuzey_islemleri": [],
            "projeksiyon_acisi": "", "kesitler": [],
            "genel_metin": "..."
          },
          "image_path": "<svg önizleme yolu>",
          "extraction_source": "regex" | "llm" | "hybrid"
        }
      }
    """
    file_basename = original_name or os.path.basename(file_path)
    ext = file_basename.rsplit(".", 1)[-1].lower() if "." in file_basename else "dwg"

    try:
        import ezdxf
        from ezdxf import recover
    except ImportError:
        return _fallback_chunk(
            file_path, file_basename, ext,
            "[Hata] ezdxf kurulu değil. `pip install ezdxf` ile yükleyin.",
        )

    # 1) Dosyayı aç (recover modu hatalı DWG'leri kurtarır)
    try:
        if ext == "dxf":
            doc, auditor = recover.readfile(file_path)
        else:
            # ezdxf, R2004+ DWG'leri okuyabilir
            doc = ezdxf.readfile(file_path)
            auditor = None
    except Exception as e:
        return _fallback_chunk(
            file_path, file_basename, ext,
            f"[Hata] Dosya açılamadı: {e}. DXF olarak export edip tekrar deneyin.",
        )

    # 2) Entity'leri çıkar
    entities = _extract_text_entities(doc)
    if not entities:
        return _fallback_chunk(
            file_path, file_basename, ext,
            "[Uyarı] Dosyada okunabilir metin entity'si bulunamadı.",
        )

    # 3) Regex ile veri çıkarımı
    extracted = _extract_with_regex(entities)
    extraction_source = "regex"

    # 4) LLM fallback (sadece regex eksik kalırsa)
    if use_llm_fallback and _needs_llm(extracted):
        llm_data = _extract_with_llm(entities, file_basename)
        if llm_data:
            extracted = _merge(extracted, llm_data)
            extraction_source = "hybrid" if extraction_source == "regex" else "llm"

    # 5) SVG export (görüntüleme için)
    svg_path = None
    if export_svg:
        try:
            svg_path = _export_svg(doc, file_path)
        except Exception:
            svg_path = None

    # 6) vision_data sözlüğünü kur (image_processor formatı)
    vision_data = _build_vision_data(extracted, entities)

    # 7) RAG metni
    rag_text = _build_rag_text(file_basename, ext, vision_data)

    chunk = {
        "id": str(uuid.uuid4()),
        "text": rag_text,
        "metadata": {
            "page": 1,
            "chunk_index": 1,
            "source": file_basename,
            "type": "teknik_resim",
            "image_path": svg_path or file_path,
            "total_pages": 1,
            "vision_data": vision_data,
            "extraction_source": extraction_source,
            "original_ext": ext,
        },
    }
    return [chunk]


# ── Entity çıkarımı ────────────────────────────────────────────────────

def _extract_text_entities(doc) -> list[dict]:
    """Tüm modelspace + layout'lardan metin entity'lerini koordinatlarıyla çıkarır."""
    entities: list[dict] = []

    layouts = [doc.modelspace()]
    try:
        layouts.extend(doc.layouts)
    except Exception:
        pass

    seen_ids: set[int] = set()
    for layout in layouts:
        try:
            for e in layout:
                if id(e) in seen_ids:
                    continue
                seen_ids.add(id(e))
                entities.extend(_entity_to_dict(e))
        except Exception:
            continue

    # Blokların içindeki ATTRIB / ATTDEF
    try:
        for block in doc.blocks:
            try:
                for e in block:
                    if id(e) in seen_ids:
                        continue
                    seen_ids.add(id(e))
                    entities.extend(_entity_to_dict(e, layer_prefix=f"BLOCK:{block.name}"))
            except Exception:
                continue
    except Exception:
        pass

    return entities


def _entity_to_dict(e, layer_prefix: str = "") -> list[dict]:
    """Tek bir entity'yi (varsa) standart sözlüğe çevirir."""
    out: list[dict] = []
    etype = e.dxftype()

    try:
        layer = getattr(e.dxf, "layer", "") or ""
        if layer_prefix:
            layer = f"{layer_prefix}|{layer}"

        if etype == "TEXT":
            txt = (e.dxf.text or "").strip()
            if txt:
                ip = getattr(e.dxf, "insert", None)
                out.append({
                    "type": "TEXT",
                    "text": txt,
                    "layer": layer,
                    "x": float(ip[0]) if ip else 0.0,
                    "y": float(ip[1]) if ip else 0.0,
                    "height": float(getattr(e.dxf, "height", 0.0) or 0.0),
                })

        elif etype == "MTEXT":
            try:
                txt = e.plain_text()
            except Exception:
                txt = (getattr(e, "text", "") or "").strip()
            if txt:
                ip = getattr(e.dxf, "insert", None)
                out.append({
                    "type": "MTEXT",
                    "text": txt.strip(),
                    "layer": layer,
                    "x": float(ip[0]) if ip else 0.0,
                    "y": float(ip[1]) if ip else 0.0,
                    "height": float(getattr(e.dxf, "char_height", 0.0) or 0.0),
                })

        elif etype in ("ATTRIB", "ATTDEF"):
            txt = (getattr(e.dxf, "text", "") or "").strip()
            tag = (getattr(e.dxf, "tag", "") or "").strip()
            if txt or tag:
                ip = getattr(e.dxf, "insert", None)
                out.append({
                    "type": etype,
                    "text": txt,
                    "tag": tag,
                    "layer": layer,
                    "x": float(ip[0]) if ip else 0.0,
                    "y": float(ip[1]) if ip else 0.0,
                })

        elif etype == "INSERT":
            try:
                for attrib in e.attribs:
                    out.extend(_entity_to_dict(attrib, layer_prefix=layer))
            except Exception:
                pass
    except Exception:
        pass

    return out


# ── Regex tabanlı çıkarım ─────────────────────────────────────────────

def _extract_with_regex(entities: list[dict]) -> dict:
    """Entity listesinden parca_no, islem_sirasi, vb. çıkarır."""
    all_text = "\n".join(e["text"] for e in entities if e.get("text"))
    tagged_text = "\n".join(
        f"{e.get('tag','')}={e.get('text','')}"
        for e in entities
        if e.get("type") in ("ATTRIB", "ATTDEF") and (e.get("tag") or e.get("text"))
    )
    haystack = all_text + "\n" + tagged_text

    parca_no = ""
    m = _PART_NO_RE.search(haystack)
    if m:
        parca_no = m.group(1).strip()
    else:
        m2 = _LOOSE_PART_NO_RE.search(haystack)
        if m2:
            parca_no = m2.group(1).strip()

    revizyon = ""
    m = _REVISION_RE.search(haystack)
    if m:
        revizyon = m.group(1).strip()

    olcek = ""
    m = _SCALE_RE.search(haystack)
    if m:
        olcek = m.group(1).strip()

    malzeme = ""
    m = _MATERIAL_RE.search(haystack)
    if m:
        malzeme = m.group(1).strip()

    # İşlem sırası: tüm eşleşmeleri topla, sıraya göre sirala, tekrarlananları ayıkla
    seen_seq: set[tuple[int, str]] = set()
    islem_sirasi: list[dict] = []
    for sira_str, ad in _OP_SEQ_RE.findall(haystack):
        try:
            sira = int(sira_str)
        except ValueError:
            continue
        key = (sira, ad.lower())
        if key in seen_seq:
            continue
        seen_seq.add(key)
        islem_sirasi.append({"sira": sira, "ad": ad.lower()})
    islem_sirasi.sort(key=lambda x: x["sira"])

    return {
        "parca_no": parca_no,
        "revizyon": revizyon,
        "olcek": olcek,
        "malzeme": malzeme,
        "islem_sirasi": islem_sirasi,
    }


def _needs_llm(extracted: dict) -> bool:
    """Regex çıkarımı yeterince zenginse LLM atla."""
    if not extracted.get("parca_no"):
        return True
    if len(extracted.get("islem_sirasi", [])) < 1:
        return True
    return False


# ── LLM fallback (Gemini Flash) ─────────────────────────────────────────────

def _extract_with_llm(entities: list[dict], filename: str) -> dict | None:
    """Regex eksik kaldığında Gemini Flash'a tüm metni gönderir."""
    try:
        from core.config import settings
        api_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        import google.generativeai as genai
    except ImportError:
        return None
    except Exception:
        return None

    # Metni kompakt sun: en alt sağ bloktaki entity'leri başa al (genelde başlık bloğu)
    sorted_ents = sorted(entities, key=lambda e: (-e.get("x", 0), -e.get("y", 0)))
    payload_lines = []
    for e in sorted_ents[:200]:
        line = e.get("text", "")
        tag = e.get("tag", "")
        if tag:
            line = f"{tag}={line}"
        if line.strip():
            payload_lines.append(line.strip())
    payload = "\n".join(payload_lines)

    if not payload.strip():
        return None

    prompt = f"""Bu bir mekanik imalat çiziminin (DWG/DXF) metin içeriğidir. SADECE JSON dön.

{{
  "parca_no": "parça numarası / çizim numarası",
  "revizyon": "",
  "olcek": "",
  "malzeme": "",
  "islem_sirasi": [
    {{"sira": 1, "ad": "lazer"}},
    {{"sira": 2, "ad": "büküm"}}
  ]
}}

Bulamadığın alanlar boş string ya da boş liste. Markdown veya açıklama yazma.

Dosya: {filename}

METIN:
{payload[:8000]}
"""

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(prompt, generation_config={"temperature": 0.1})
        raw = (resp.text or "").strip()
        # Olası markdown bloğunu ayıkla
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except Exception:
        return None
    return None


def _merge(base: dict, override: dict) -> dict:
    """Regex sonuçları baz, LLM doldurur (regex boş ise)."""
    out = dict(base)
    for k, v in (override or {}).items():
        if not out.get(k):
            out[k] = v
        elif k == "islem_sirasi" and not out[k] and v:
            out[k] = v
    return out


# ── SVG export ─────────────────────────────────────────────────────────────

def _export_svg(doc, source_path: str) -> str | None:
    """ezdxf'in SVG backend'i ile çizimi tek dosyaya export eder."""
    try:
        from ezdxf.addons.drawing import RenderContext, Frontend
        from ezdxf.addons.drawing import svg
    except ImportError:
        return None

    base, _ = os.path.splitext(source_path)
    svg_path = base + ".svg"
    try:
        msp = doc.modelspace()
        backend = svg.SVGBackend()
        Frontend(RenderContext(doc), backend).draw_layout(msp)
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(backend.get_string())
        return svg_path
    except Exception:
        return None


# ── vision_data ve RAG metin üretimi ──────────────────────────────────────

def _build_vision_data(extracted: dict, entities: list[dict]) -> dict:
    """image_processor.parse_image çıktısıyla birebir uyumlu sözlük."""
    genel_metin = " | ".join(
        e.get("text", "").strip()
        for e in entities[:80]
        if e.get("text", "").strip()
    )
    return {
        "image_type": "teknik_resim",
        "baslik_bloku": {
            "cizim_numarasi": extracted.get("parca_no", ""),
            "revizyon": extracted.get("revizyon", ""),
            "olcek": extracted.get("olcek", ""),
            "tarih": "",
            "cizen": "",
            "onaylayan": "",
            "firma": "",
            "proje": "",
            "baslik": "",
        },
        "parca_listesi": (
            [{"poz": "", "adet": "", "malzeme": extracted.get("malzeme", ""), "aciklama": ""}]
            if extracted.get("malzeme") else []
        ),
        "olcular": [],
        "toleranslar": [],
        "notlar": [],
        "yuzey_islemleri": [],
        "projeksiyon_acisi": "",
        "kesitler": [],
        "islem_sirasi": extracted.get("islem_sirasi", []),
        "genel_metin": genel_metin[:2000],
    }


def _build_rag_text(basename: str, ext: str, vd: dict) -> str:
    lines = [f"[{basename} | DWG/DXF Teknik Resim]", f"DOSYA TÜRÜ: {ext.upper()}", ""]
    bb = vd.get("baslik_bloku", {})
    if bb.get("cizim_numarasi"):
        lines.append(f"Çizim/Parça No: {bb['cizim_numarasi']}")
    if bb.get("revizyon"):
        lines.append(f"Revizyon: {bb['revizyon']}")
    if bb.get("olcek"):
        lines.append(f"Ölçek: {bb['olcek']}")

    parcalar = vd.get("parca_listesi", [])
    for p in parcalar:
        if p.get("malzeme"):
            lines.append(f"Malzeme: {p['malzeme']}")

    islemler = vd.get("islem_sirasi", [])
    if islemler:
        lines.append("")
        lines.append("İşLEM SIRASI:")
        for op in islemler:
            lines.append(f"  {op.get('sira')}. {op.get('ad')}")

    gm = vd.get("genel_metin", "")
    if gm:
        lines.append("")
        lines.append("GENEL METIN:")
        lines.append(gm)

    return "\n".join(lines)


# ── Hata / fallback chunk üretici ─────────────────────────────────────────

def _fallback_chunk(path: str, basename: str, ext: str, message: str) -> list[dict]:
    size_kb = round(os.path.getsize(path) / 1024, 1) if os.path.exists(path) else 0
    return [{
        "id": str(uuid.uuid4()),
        "text": f"[{basename}]\nDOSYA TÜRÜ: {ext.upper()}\nBOYUT: {size_kb} KB\n{message}",
        "metadata": {
            "page": 1,
            "chunk_index": 1,
            "source": basename,
            "type": "teknik_resim",
            "image_path": path,
            "total_pages": 1,
            "vision_data": None,
            "extraction_source": "failed",
            "original_ext": ext,
        },
    }]


# ── Paralel toplu işleme ─────────────────────────────────────────────────

def _worker(args: tuple) -> tuple[str, list[dict]]:
    file_path, original_name, use_llm, export_svg = args
    try:
        chunks = parse_dwg(
            file_path,
            original_name=original_name,
            use_llm_fallback=use_llm,
            export_svg=export_svg,
        )
        return file_path, chunks
    except Exception as e:
        return file_path, _fallback_chunk(
            file_path,
            original_name or os.path.basename(file_path),
            "dwg",
            f"[Hata] İşlem başarısız: {e}",
        )


def process_dwg_batch(
    file_list: Iterable[str],
    max_workers: int | None = None,
    use_llm_fallback: bool = True,
    export_svg: bool = True,
    on_progress=None,
):
    """
    Birden fazla DWG/DXF dosyasını paralel işler (ProcessPoolExecutor).

    Args:
      file_list: dosya yolları listesi
      max_workers: paralel worker sayısı (varsayılan: CPU sayısı)
      use_llm_fallback: regex eksik kaldığında Gemini Flash kullan
      export_svg: her dosya için SVG önizleme üret
      on_progress: callback(done, total, file_path)

    Yields:
      (file_path, chunks) ikilileri (tamamlandıkça)
    """
    files = list(file_list)
    total = len(files)
    if not files:
        return

    workers = max_workers or max(1, (os.cpu_count() or 2))
    args_list = [(fp, None, use_llm_fallback, export_svg) for fp in files]

    done = 0
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_worker, args): args[0] for args in args_list}
        for fut in as_completed(futures):
            file_path = futures[fut]
            try:
                fp, chunks = fut.result()
            except Exception as e:
                fp = file_path
                chunks = _fallback_chunk(
                    file_path, os.path.basename(file_path), "dwg",
                    f"[Hata] Worker çöktü: {e}",
                )
            done += 1
            if on_progress:
                try:
                    on_progress(done, total, fp)
                except Exception:
                    pass
            yield fp, chunks
