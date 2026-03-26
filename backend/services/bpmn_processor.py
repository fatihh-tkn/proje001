
"""
bpmn_processor.py
─────────────────────────────────────────────────────────────────────────
BPMN (XML) dosyalarını RAG-hazır chunk'lara dönüştüren parser.

Her görev/karar noktası için üretilen chunk yapısı:
  [Dosya Adı | Görev: <ad>]
  TÜR: <userTask / exclusiveGateway / ...>
  AÇIKLAMA: <documentation>
  NOT: <textAnnotation>  (varsa)
  GELIYOR: <önceki görevler>
  GİDİYOR:  <sonraki görevler>
  EKRAN/BÖLÜM: <grup/kategori adı>  (varsa)
─────────────────────────────────────────────────────────────────────────
"""

import os
import uuid
import xml.etree.ElementTree as ET


# BPMN XML namespace'leri
NS = {
    "bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
    "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
}

# Desteklenen element türleri → insanın anlayacağı etiket
ELEMENT_LABELS = {
    "task":              "Görev",
    "userTask":          "Kullanıcı Görevi",
    "serviceTask":       "Otomatik Görev",
    "manualTask":        "Manuel Görev",
    "scriptTask":        "Hesaplama Görevi",
    "exclusiveGateway":  "Karar Noktası (XOR)",
    "parallelGateway":   "Paralel Dağılım (AND)",
    "inclusiveGateway":  "Kapsayıcı Karar (OR)",
    "startEvent":        "Başlangıç",
    "endEvent":          "Bitiş",
    "intermediateCatchEvent": "Ara Olay",
}


def _tag(element) -> str:
    """'{namespace}localname' → 'localname'"""
    return element.tag.split("}")[-1] if "}" in element.tag else element.tag


def parse_bpmn(file_path: str, original_name: str | None = None) -> list[dict]:
    """
    BPMN dosyasını parse edip chunk listesi döner.
    Her anlamlı element (görev, karar, olay) kendi chunk'ına dönüşür.
    """
    file_basename = original_name if original_name else os.path.basename(file_path)
    chunks: list[dict] = []

    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
    except ET.ParseError as e:
        return [{
            "id":       f"error-{uuid.uuid4()}",
            "text":     f"BPMN dosyası ayrıştırılamadı: {e}",
            "metadata": {"source": file_basename, "error": str(e)},
        }]

    # ── 1. Yardımcı tablolar ──────────────────────────────────────────
    # id → element adı
    id_to_name: dict[str, str] = {}
    # id → documentation metni
    id_to_doc:  dict[str, str] = {}
    # id → TextAnnotation metni
    annotation_texts: dict[str, str] = {}
    # element_id → annotation_id (Association bağlantısı)
    element_to_annotation: dict[str, str] = {}
    # element_id → group/category adı
    element_to_group: dict[str, str] = {}
    # id → gelen/giden flow id'leri
    incoming: dict[str, list[str]] = {}
    outgoing: dict[str, list[str]] = {}
    # flow_id → (source_id, target_id, name)
    flows: dict[str, tuple[str, str, str]] = {}
    # Category değer tablosu
    category_values: dict[str, str] = {}

    def find_all(tag: str):
        return root.iter(f"{{{NS['bpmn']}}}{tag}")

    # Category değerleri
    for cv in find_all("categoryValue"):
        category_values[cv.get("id", "")] = cv.get("value", "")

    # TextAnnotation'lar
    for ann in find_all("textAnnotation"):
        ann_id   = ann.get("id", "")
        text_el  = ann.find(f"{{{NS['bpmn']}}}text")
        ann_text = text_el.text.strip() if text_el is not None and text_el.text else ""
        annotation_texts[ann_id] = ann_text

    # Association'lar (element ↔ annotation bağlantısı)
    for assoc in find_all("association"):
        src = assoc.get("sourceRef", "")
        tgt = assoc.get("targetRef", "")
        if tgt in annotation_texts:
            element_to_annotation[src] = tgt
        elif src in annotation_texts:
            element_to_annotation[tgt] = src

    # Sequence flow'lar
    for flow in find_all("sequenceFlow"):
        fid  = flow.get("id", "")
        src  = flow.get("sourceRef", "")
        tgt  = flow.get("targetRef", "")
        name = flow.get("name", "")
        flows[fid] = (src, tgt, name)
        outgoing.setdefault(src, []).append(fid)
        incoming.setdefault(tgt, []).append(fid)

    # Group → category bağlantısı
    for group in find_all("group"):
        gid    = group.get("id", "")
        cat_id = group.get("categoryValueRef", "")
        # Hangi elementler bu grubun içinde? (Shape by group — pozisyon bazlı,
        # basit yaklaşım: category adını flow'lar aracılığıyla tahmin edeceğiz)
        # Şimdilik sadece category adını saklıyoruz
        if cat_id in category_values:
            element_to_group[gid] = category_values[cat_id]

    # ── 2. Ana elementler ─────────────────────────────────────────────
    process_elements = list(find_all("process"))
    all_elements = []
    for proc in process_elements:
        for child in proc:
            tag = _tag(child)
            if tag in ELEMENT_LABELS:
                all_elements.append(child)

    # id → name tablosu (flow çözümlemesi için)
    for el in all_elements:
        eid  = el.get("id", "")
        name = el.get("name", "").replace("&#34;", '"').strip()
        id_to_name[eid] = name
        doc_el = el.find(f"{{{NS['bpmn']}}}documentation")
        if doc_el is not None and doc_el.text:
            id_to_doc[eid] = doc_el.text.strip()

    # ── 3. Özet chunk: tüm görev isimleri ────────────────────────────
    task_labels = [
        f"  • {id_to_name[el.get('id','')]}"
        for el in all_elements
        if _tag(el) in ("task","userTask","serviceTask","manualTask","scriptTask")
        and id_to_name.get(el.get("id",""), "").strip()
    ]
    if task_labels:
        summary = (
            f"BPMN DOSYASI: {file_basename}\n"
            f"TOPLAM ADIM: {len(task_labels)}\n\n"
            "── İŞ AKIŞI GÖREVLERİ ──\n"
            + "\n".join(task_labels)
        )
        chunks.append({
            "id":   str(uuid.uuid4()),
            "text": summary,
            "metadata": {
                "page":        0,
                "chunk_index": 0,
                "source":      file_basename,
                "type":        "bpmn_summary",
                "total_pages": len(all_elements),
            }
        })

    # ── 4. Element başına chunk ───────────────────────────────────────
    for idx, el in enumerate(all_elements):
        eid   = el.get("id", "")
        name  = id_to_name.get(eid, "").replace("&#34;", '"').strip()
        tag   = _tag(el)
        label = ELEMENT_LABELS.get(tag, tag)

        if not name and tag in ("startEvent", "endEvent"):
            name = "Başlangıç" if "start" in tag.lower() else "Bitiş"

        # Açıklama
        doc = id_to_doc.get(eid, "")

        # Bağlı not kutusu
        ann_note = ""
        ann_id   = element_to_annotation.get(eid)
        if ann_id:
            ann_note = annotation_texts.get(ann_id, "")

        # Gelen akışlar
        in_flows  = incoming.get(eid, [])
        out_flows = outgoing.get(eid, [])

        def flow_desc(fids: list[str], direction: str) -> str:
            parts = []
            for fid in fids:
                if fid not in flows:
                    continue
                src, tgt, fname = flows[fid]
                other = tgt if direction == "out" else src
                other_name = id_to_name.get(other, other)
                if fname:
                    parts.append(f"{other_name} [{fname}]")
                else:
                    parts.append(other_name)
            return " | ".join(p for p in parts if p)

        incoming_desc = flow_desc(in_flows, "in")
        outgoing_desc = flow_desc(out_flows, "out")

        # Chunk metni oluştur
        lines = [f"[{file_basename} | {label}: {name}]"]
        if doc:
            lines.append(f"AÇIKLAMA: {doc}")
        if ann_note:
            lines.append(f"NOT/DEĞER: {ann_note}")
        if incoming_desc:
            lines.append(f"GELİYOR: {incoming_desc}")
        if outgoing_desc:
            lines.append(f"GİDİYOR: {outgoing_desc}")

        text = "\n".join(lines)

        # Çok kısa ve bilgisiz elementleri atla (gateway isimsiz kalabilir)
        if len(text.strip()) < 20:
            continue

        chunks.append({
            "id":   str(uuid.uuid4()),
            "text": text,
            "metadata": {
                "page":        idx + 1,
                "chunk_index": idx + 1,
                "source":      file_basename,
                "type":        f"bpmn_{tag}",
                "element_id":  eid,
                "element_name": name,
                "total_pages": len(all_elements),
            }
        })

    if not chunks:
        chunks.append({
            "id":   f"error-{uuid.uuid4()}",
            "text": f"[{file_basename}] BPMN dosyası boş veya okunamadı.",
            "metadata": {"source": file_basename}
        })

    return chunks
