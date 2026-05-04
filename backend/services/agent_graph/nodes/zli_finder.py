"""
nodes/zli_finder.py
────────────────────────────────────────────────────────────────────
Z'li rapor (özelleştirilmiş ABAP rapor) sorgusu uzmanı.

İki adımda çalışır:
  1. SQL üzerinden token-bazlı eşleşme (mevcut `_fetch_zli_report_matches`).
  2. Aday raporları LLM'e verip best_match + alternatives JSON üret.

Çıktı:
    {
      "zli_matches":   [aday raporlar (ham SQL)],
      "chat_draft":    "JSON cevap (string)",       # aggregator burayı kullanır
      "nodes_executed":["zli_finder"],
      "node_timings":  {"zli_finder": ms},
      "total_tokens":  {"zli_finder": {p, c}},
    }
"""

from __future__ import annotations

import json
import time

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from core.db_bridge import get_assigned_agent
from ..state import AgentState
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.zli_finder")


_SYSTEM_TEMPLATE = (
    "[Z'Lİ RAPOR SORGUSU MODU]\n"
    "Kullanıcı sistemde yüklü Z'li raporlardan birini arıyor. "
    "Aşağıda SQL'den gelen aday raporlar var; en uygun olanı ve "
    "alternatifleri seç. Eşleşme yoksa best_match=null ver.\n\n"
    "ADAY RAPORLAR:\n{matches_block}\n\n"
    "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. "
    "JSON dışında HİÇBİR metin yazma.\n\n"
    "```json\n"
    "{{\n"
    '  "type": "zli_report_query",\n'
    '  "query": "<kullanıcının_isteğinin_kısa_özeti>",\n'
    '  "best_match": {{"kod": "...", "ad": "...", "aciklama": "...", '
    '"modul": "...", "kullanim_alani": "...", "neden": "<neden_uygun>"}} | null,\n'
    '  "alternatives": [{{"kod": "...", "ad": "...", "aciklama": "..."}}],\n'
    '  "no_match_reason": "<eşleşme_yoksa_kısa_açıklama_yoksa_boş>"\n'
    "}}\n"
    "```"
)


def _format_matches(matches: list[dict]) -> str:
    if not matches:
        return "(eşleşme yok)"
    lines = []
    for m in matches:
        parca = f"- {m['kod']}: {m['ad']}"
        if m.get("modul"):
            parca += f" [{m['modul']}]"
        parca += f"\n    Açıklama: {m.get('aciklama', '')}"
        if m.get("kullanim_alani"):
            parca += f"\n    Kullanım: {m['kullanim_alani']}"
        lines.append(parca)
    return "\n".join(lines)


async def zli_finder_node(state: AgentState) -> dict:
    t0 = time.time()
    user_msg = state.get("user_message") or state.get("original_message") or ""

    agent_config = None
    try:
        agent_config = get_assigned_agent("zli_finder")
    except Exception:
        pass

    node_cfg = (agent_config or {}).get("node_config") or {}
    sql_match_limit = int(node_cfg.get("sql_match_limit", 5) or 5)

    try:
        from services.ai_service import _fetch_zli_report_matches
        matches = await run_in_threadpool(_fetch_zli_report_matches, user_msg, sql_match_limit)
    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[zli_finder] SQL eşleşme hatası: %s", e, exc_info=True)
        return {
            "zli_matches": [],
            "nodes_executed": ["zli_finder"],
            "node_timings": {"zli_finder": elapsed_ms},
            "node_errors": {"zli_finder": f"sql: {e}"},
        }

    matches_block = _format_matches(matches)

    # DB prompt'u varsa onu kullan + matches_block'u "ADAY RAPORLAR" başlığıyla
    # ekle. Yoksa kod fallback şablonunu format'la.
    db_prompt = ((agent_config or {}).get("prompt") or "").strip()
    if db_prompt:
        system = (
            db_prompt
            + "\n\nADAY RAPORLAR:\n"
            + matches_block
        )
        negative = ((agent_config or {}).get("negative_prompt") or "").strip()
        if negative:
            system += f"\n\n[KESİNLİKLE YAPMAMAN GEREKENLER]\n{negative}"
    else:
        system = _SYSTEM_TEMPLATE.format(matches_block=matches_block)

    try:
        temperature = (agent_config or {}).get("temperature", 0.0)
        max_tokens = (agent_config or {}).get("max_tokens") or None
        messages = build_messages(system=system, history=None, user=user_msg)
        result = await call_llm(
            agent_config,
            messages,
            temperature=temperature,
            response_format="json_object",
            max_tokens=max_tokens,
            timeout=30.0,
        )
        text = (result.get("text") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        logger.info("[zli_finder] %d aday, %d ms", len(matches), elapsed_ms)

        return {
            "zli_matches": matches,
            "chat_draft": text,
            "model_used": result.get("model", ""),
            "provider_used": result.get("provider", ""),
            "nodes_executed": ["zli_finder"],
            "node_timings": {"zli_finder": elapsed_ms},
            "total_tokens": {"zli_finder": {
                "p": result.get("prompt_tokens", 0),
                "c": result.get("completion_tokens", 0),
            }},
        }
    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[zli_finder] LLM hatası: %s", e, exc_info=True)
        # En azından SQL adaylarını fallback olarak JSON üret
        fallback = json.dumps({
            "type": "zli_report_query",
            "query": user_msg[:120],
            "best_match": (
                {"kod": matches[0]["kod"], "ad": matches[0]["ad"],
                 "aciklama": matches[0].get("aciklama", ""),
                 "modul": matches[0].get("modul", ""),
                 "kullanim_alani": matches[0].get("kullanim_alani", ""),
                 "neden": "SQL en yüksek skor"} if matches else None
            ),
            "alternatives": [
                {"kod": m["kod"], "ad": m["ad"], "aciklama": m.get("aciklama", "")}
                for m in matches[1:5]
            ],
            "no_match_reason": "" if matches else "LLM erişilemedi, SQL eşleşmesi de yok.",
        }, ensure_ascii=False)
        return {
            "zli_matches": matches,
            "chat_draft": fallback,
            "nodes_executed": ["zli_finder"],
            "node_timings": {"zli_finder": elapsed_ms},
            "node_errors": {"zli_finder": str(e)},
        }
