"""
nodes/surec_ajan.py
────────────────────────────────────────────────────────────────────
Süreç Ajanı — BPMN ve PDF belgelerindeki iş süreçlerini analiz eder,
kullanıcıya adım adım, akış tabanlı şekilde sunar.

Girdi kaynakları (öncelik sırasıyla):
  1. state["rag_context"] — rag_search paralel olarak BPMN/süreç
     parçalarını zaten çekmiştir.
  2. file_name / file_names — doğrudan dosya referansı varsa
     arşiv dizininden BPMN parse edilir.

Çıktı:
    {
      "surec_draft":    str,   # Markdown formatında süreç analizi
      "nodes_executed": [...],
      "node_timings":   {...},
      "total_tokens":   {...},
    }
"""

from __future__ import annotations

import os
import time
from pathlib import Path

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from ..state import AgentState, get_agent_config
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.surec_ajan")

_ARCHIVE_DIR = Path(__file__).resolve().parents[3] / "archive_uploads"

_DEFAULT_SYSTEM = (
    "Sen bir iş süreci analisti ve BPMN uzmanısın. "
    "Sana verilen belge içeriğini (BPMN akışı, PDF prosedür, iş süreci tanımı) "
    "analiz ederek kullanıcıya Türkçe, açık ve yapılandırılmış şekilde sunarsın.\n\n"
    "Analiz çıktın şu bölümleri içermeli:\n"
    "1. **Süreç Adı ve Özeti** — Kısa açıklama (2-3 cümle)\n"
    "2. **Aktörler / Roller** — Kim bu süreçte yer alıyor?\n"
    "3. **Süreç Adımları** — Numaralı liste, her adım için:\n"
    "   - Adım adı ve tipi (Kullanıcı Görevi / Otomatik Görev / Karar Noktası)\n"
    "   - Kısa açıklama (varsa)\n"
    "   - Bir önceki ve sonraki adımla bağlantısı\n"
    "4. **Karar Noktaları** — XOR/OR gateway'leri, koşullar\n"
    "5. **Başlangıç ve Bitiş Koşulları**\n\n"
    "Belge içeriği BPMN chunk'larından oluşuyorsa her chunk ayrı bir süreç "
    "elemanını temsil eder — hepsini birleştirerek bütünsel akışı çıkar.\n"
    "Bilgi eksikse 'Belgede bu bilgi yer almıyor' de, tahmin yapma."
)


def _try_load_bpmn_direct(state: AgentState) -> str:
    """
    file_name / file_names içinde .bpmn veya .xml uzantılı dosya varsa
    archive_uploads dizininde eşleşen dosyayı parse eder.
    Ham chunk metnini döner; bulamazsa boş string.
    """
    names: list[str] = []
    fn = state.get("file_name")
    if fn:
        names.append(fn)
    names.extend(state.get("file_names") or [])

    for name in names:
        lower = (name or "").lower()
        if not (lower.endswith(".bpmn") or lower.endswith(".xml")):
            continue
        if not _ARCHIVE_DIR.exists():
            continue
        # archive_uploads'daki dosyalar "<hash>_<orijinal_ad>" formatında saklanır
        for candidate in _ARCHIVE_DIR.iterdir():
            cname = candidate.name
            # Tam eşleşme veya suffix eşleşme
            if cname == name or cname.endswith(f"_{name}"):
                try:
                    from services.bpmn_processor import parse_bpmn
                    chunks = parse_bpmn(str(candidate), original_name=name)
                    texts = [c.get("text", "") for c in chunks if c.get("text")]
                    result = "\n\n---\n\n".join(texts)
                    logger.info(
                        "[surec_ajan] BPMN doğrudan yüklendi: %s (%d chunk, %d karakter)",
                        name, len(chunks), len(result),
                    )
                    return result
                except Exception as e:
                    logger.warning("[surec_ajan] BPMN parse hatası (%s): %s", name, e)
    return ""


def _resolve_system(agent_config: dict | None) -> str:
    if agent_config:
        prompt = (agent_config.get("prompt") or "").strip()
        if prompt:
            return prompt
    return _DEFAULT_SYSTEM


async def surec_ajan_node(state: AgentState) -> dict:
    t0 = time.time()
    role = "surec_ajan"

    try:
        agent_config = get_agent_config(state, role)

        rag_context = (state.get("rag_context") or "").strip()

        # BPMN doğrudan erişim: rag boşsa ve file_name .bpmn ise dene
        bpmn_direct = ""
        if not rag_context:
            bpmn_direct = await run_in_threadpool(_try_load_bpmn_direct, state)

        context = bpmn_direct or rag_context

        if not context:
            elapsed_ms = int((time.time() - t0) * 1000)
            logger.info("[surec_ajan] Süreç içeriği bulunamadı (%d ms)", elapsed_ms)
            return {
                "surec_draft": (
                    "Süreç analizi için yeterli içerik bulunamadı. "
                    "Lütfen bir BPMN veya süreç belgesi yükleyin ya da "
                    "analiz edilecek süreci daha ayrıntılı belirtin."
                ),
                "nodes_executed": [role],
                "node_timings": {role: elapsed_ms},
            }

        user_msg = state.get("user_message") or state.get("original_message") or ""
        system = _resolve_system(agent_config)

        # Bağlamı kullanıcı mesajına ekle — BPMN parçaları büyük olabilir, kes
        max_ctx = int(((agent_config or {}).get("node_config") or {}).get("max_context_chars", 16000))
        ctx_trimmed = context[:max_ctx]
        if len(context) > max_ctx:
            ctx_trimmed += "\n\n[...içerik kesildi, belge çok uzun...]"

        user_prompt = (
            f"{user_msg}\n\n[SÜREÇ BELGESİ İÇERİĞİ]\n{ctx_trimmed}"
        )

        messages = build_messages(system=system, history=None, user=user_prompt)

        temperature = (agent_config or {}).get("temperature", 0.3)
        max_tokens = (agent_config or {}).get("max_tokens") or 2000

        result = await call_llm(
            agent_config,
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=60.0,
        )

        text = (result.get("text") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        tokens = result.get("usage") or {}
        logger.info(
            "[surec_ajan] tamamlandı — %d karakter, %d ms",
            len(text), elapsed_ms,
        )

        out: dict = {
            "surec_draft": text,
            "nodes_executed": [role],
            "node_timings": {role: elapsed_ms},
        }
        if tokens:
            out["total_tokens"] = {role: {"p": tokens.get("prompt_tokens", 0), "c": tokens.get("completion_tokens", 0)}}
        return out

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[surec_ajan] hata: %s", e, exc_info=True)
        return {
            "surec_draft": "",
            "nodes_executed": [role],
            "node_timings": {role: elapsed_ms},
            "node_errors": {role: str(e)},
        }
