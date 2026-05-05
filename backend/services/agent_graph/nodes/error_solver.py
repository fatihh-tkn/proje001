"""
nodes/error_solver.py
────────────────────────────────────────────────────────────────────
SAP/sistem hatalarını yapılandırılmış JSON çıktıyla çözümleyen uzman.

Mevcut akıştaki `command="error_solve"` davranışını birebir korur —
front-end aynı şemayı (`type: "error_solution"`) parse ediyor.

RAG bağlamı varsa (rag_search node'u paralel çalıştığında) onu da
prompt'a ekler ki çözüm önerileri kurum içi belgelere dayansın.

Çıktı:
    {
      "error_solution": {parsed_json},     # aggregator'ın UI'ya yansıttığı dict
      "chat_draft":     "<json-string>",   # ham JSON metni (frontend parser)
      "nodes_executed": ["error_solver"],
      "node_timings":   {"error_solver": ms},
      "total_tokens":   {"error_solver": {p, c}},
    }
"""

from __future__ import annotations

import json
import re
import time

from core.logger import get_logger
from core.db_bridge import get_assigned_agent
from ..state import AgentState, get_agent_config
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.error_solver")


_SYSTEM_BASE = (
    "Sen bir SAP & kurumsal sistem destek uzmanısın. Kullanıcının "
    "bildirdiği hatayı analiz eder, çözüm adımlarını üretirsin.\n\n"
    "[HATA ÇÖZÜMÜ MODU]\n"
    "Kullanıcının mesajı bir SAP/sistem hatası hakkında. "
    "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. "
    "JSON dışında HİÇBİR metin yazma. Eksik bilgi varsa ilgili alanı "
    "boş bırak veya tahmin etmeden makul varsayılan kullan.\n\n"
    "```json\n"
    "{\n"
    '  "type": "error_solution",\n'
    '  "id": "<hata_kodu_ör_ME083>",\n'
    '  "title": "<kısa_başlık>",\n'
    '  "module": "<SAP_modülü_ör_MM/PP/SD>",\n'
    '  "severity": "low|medium|high|critical",\n'
    '  "frequency": <int_geçmişte_kaç_kez_görüldü_bilinmiyorsa_0>,\n'
    '  "summary": "<1-2_cümle_genel_özet>",\n'
    '  "cause": "<hatanın_tespit_edilen_nedeni>",\n'
    '  "steps": [\n'
    '    {"title": "<adım_başlığı>", "tcode": "<varsa_T-kod>", "detail": "<detay>"}\n'
    "  ],\n"
    '  "docs": [{"name": "<dosya_adı>", "page": <int|null>}],\n'
    '  "similar": [{"code": "<hata_kodu>", "title": "<başlık>", "count": <int>}]\n'
    "}\n"
    "```"
)


def _strip_json_fence(text: str) -> str:
    t = (text or "").strip()
    # Önce ```json ... ``` bloğunu yakalamayı dene
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t)
    if fence:
        return fence.group(1).strip()
    # Olmazsa ilk { ... } bloğunu döndür
    m = re.search(r"\{[\s\S]*\}", t)
    return m.group(0) if m else t


async def error_solver_node(state: AgentState) -> dict:
    t0 = time.time()
    user_msg = state.get("user_message") or state.get("original_message") or ""
    rag_ctx = state.get("rag_context") or ""

    agent_config = get_agent_config(state, "error_solver")
    if agent_config is None:
        try:
            agent_config = get_assigned_agent("error_solver")
        except Exception:
            pass

    # DB'den prompt çek; yoksa kod fallback'ini kullan.
    system_prompt = ((agent_config or {}).get("prompt") or "").strip() or _SYSTEM_BASE
    negative = ((agent_config or {}).get("negative_prompt") or "").strip()
    if negative:
        system_prompt += f"\n\n[KESİNLİKLE YAPMAMAN GEREKENLER]\n{negative}"

    node_cfg = (agent_config or {}).get("node_config") or {}
    use_rag_context = node_cfg.get("use_rag_context", True)

    # Sistem prompt'una RAG bağlamı varsa ekle (node_config ile kapatılabilir)
    system = system_prompt
    if rag_ctx and use_rag_context:
        system += (
            "\n\n[BİLGİ TABANI BAĞLAMI]\n"
            "Aşağıdaki kurum içi belge alıntılarını çözüm adımlarını ve "
            "`docs` alanını üretirken kullan. Çelişen bilgi varsa belgeyi "
            "esas al.\n\n" + rag_ctx
        )

    try:
        temperature = (agent_config or {}).get("temperature", 0.2)
        max_tokens = (agent_config or {}).get("max_tokens") or None
        messages = build_messages(system=system, history=None, user=user_msg)
        result = await call_llm(
            agent_config,
            messages,
            temperature=temperature,
            response_format="json_object",
            max_tokens=max_tokens,
            timeout=45.0,
        )
        raw = (result.get("text") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        parsed: dict | None = None
        try:
            parsed = json.loads(_strip_json_fence(raw))
        except Exception as pe:
            logger.warning("[error_solver] JSON parse başarısız: %s", pe)

        logger.info("[error_solver] parsed=%s, %d ms",
                    bool(parsed), elapsed_ms)

        out: dict = {
            "chat_draft": raw,
            "model_used": result.get("model", ""),
            "provider_used": result.get("provider", ""),
            "nodes_executed": ["error_solver"],
            "node_timings": {"error_solver": elapsed_ms},
            "total_tokens": {"error_solver": {
                "p": result.get("prompt_tokens", 0),
                "c": result.get("completion_tokens", 0),
            }},
        }
        if parsed:
            out["error_solution"] = parsed
        return out

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[error_solver] hata: %s", e, exc_info=True)
        return {
            "chat_draft": "",
            "nodes_executed": ["error_solver"],
            "node_timings": {"error_solver": elapsed_ms},
            "node_errors": {"error_solver": str(e)},
        }
