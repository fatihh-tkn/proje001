"""
nodes/critic.py
────────────────────────────────────────────────────────────────────
Denetleyici (Critic) ajan. Aggregator'ın ürettiği `final_reply`'ı
kullanıcı sorusuyla karşılaştırarak değerlendirir.

Davranış:
  • JSON/yapılandırılmış cevaplar (error_solver / zli_finder kartları)
    otomatik onaylanır — sözdizimi/stil denetimi gerekmez.

  • revision_count >= MAX_REVISIONS ise zorla onaylar: sonsuz döngü riski yok.

  • LLM'e özlü bir değerlendirme sorusu sorar, JSON parse eder.
    • "approved": true  → aggregator çıktısı yeterli, devam et
    • "approved": false → `feedback` alanı aggregator'a geri gönderilir,
                          aggregator bunu sistem prompt'una ekleyerek
                          cevabı yeniden üretir.

Çıktı:
    {
      "critic_approved":  bool,
      "critic_feedback":  str,      # boş string onaylandığında
      "revision_count":   int,      # false → +1 artırılmış değer
      "nodes_executed":   ["critic"],
      "node_timings":     {"critic": ms},
    }
"""

from __future__ import annotations

import json
import re
import time

from core.logger import get_logger
from ..state import AgentState, get_agent_config
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.critic")

MAX_REVISIONS = 2

_SYSTEM_PROMPT = """\
Sen bir kalite denetçisisin. Kullanıcının sorusunu ve AI asistanın verdiği cevabı \
değerlendirip kısa bir JSON döndüreceksin.

Değerlendirme kriterleri — YALNIZCA şu ciddi problemler için "approved": false döndür:
1. Cevap kullanıcının sorusunu hiç yanıtlamamış (tamamen alakasız veya boş).
2. Cevap açıkça yanlış veya yanıltıcı bilgi içeriyor.
3. Cevap sorunun temel gereksinimini atlamış (ör. adımlar istendi, liste yok).

Küçük stil sorunları, farklı kelime tercihi, eksik detay için TRUE döndür.
Eğer cevap makul düzeyde doğru ve yararlıysa kesinlikle TRUE döndür.

YALNIZCA şu JSON formatında cevap ver, başka hiçbir şey yazma:
{"approved": true/false, "feedback": "eğer false ise kısa Türkçe düzeltme notu, true ise boş string"}
"""


def _strip_json(text: str) -> str:
    m = re.search(r"\{[\s\S]*\}", text or "")
    return m.group(0) if m else ""


async def critic_node(state: AgentState) -> dict:
    t0 = time.time()
    final_reply = (state.get("final_reply") or "").strip()
    user_msg = state.get("user_message") or state.get("original_message") or ""
    revision_count = state.get("revision_count") or 0

    # ── 0a) Hazır cevap / chitchat / serbest — denetim gereksiz ────────
    intent = state.get("intent") or ""
    if intent in ("sohbet", "serbest"):
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.debug("[critic] intent=%s → otomatik onay (LLM atlandı)", intent)
        return {
            "critic_approved": True,
            "critic_feedback": "",
            "nodes_executed": ["critic"],
            "node_timings": {"critic": elapsed_ms},
        }

    # ── 0b) Maksimum revizyon sayısına ulaşıldıysa zorla onayla ─────────
    if revision_count >= MAX_REVISIONS:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info("[critic] max revizyon (%d) ulaşıldı → zorla onay", MAX_REVISIONS)
        return {
            "critic_approved": True,
            "critic_feedback": "",
            "nodes_executed": ["critic"],
            "node_timings": {"critic": elapsed_ms},
        }

    # ── 1) Yapılandırılmış (JSON kart) cevaplar → otomatik onayla ───────
    trimmed = final_reply.lstrip()
    if trimmed.startswith("{") or "```json" in trimmed[:20]:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info("[critic] JSON pass-through → otomatik onay (%d ms)", elapsed_ms)
        return {
            "critic_approved": True,
            "critic_feedback": "",
            "nodes_executed": ["critic"],
            "node_timings": {"critic": elapsed_ms},
        }

    # ── 2) LLM değerlendirmesi ───────────────────────────────────────────
    try:
        agent_config = get_agent_config(state, "critic")

        user_content = (
            f"[KULLANICI SORUSU]\n{user_msg}\n\n"
            f"[AI CEVABI]\n{final_reply}"
        )
        messages = build_messages(
            system=_SYSTEM_PROMPT,
            history=[],
            user=user_content,
        )

        result = await call_llm(
            agent_config,
            messages,
            temperature=0.0,
            response_format="json_object",
            max_tokens=120,
            timeout=20.0,
        )
        raw = (result.get("text") or "").strip()
        parsed = json.loads(_strip_json(raw) or '{"approved": true, "feedback": ""}')

        approved = bool(parsed.get("approved", True))
        feedback = (parsed.get("feedback") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        logger.info(
            "[critic] rev=%d approved=%s feedback='%s' %d ms",
            revision_count, approved, feedback[:80], elapsed_ms,
        )

        if approved:
            return {
                "critic_approved": True,
                "critic_feedback": "",
                "nodes_executed": ["critic"],
                "node_timings": {"critic": elapsed_ms},
            }
        else:
            return {
                "critic_approved": False,
                "critic_feedback": feedback,
                "revision_count": revision_count + 1,
                "nodes_executed": ["critic"],
                "node_timings": {"critic": elapsed_ms},
            }

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.warning("[critic] değerlendirme hatası → zorla onay: %s", e)
        # Hata durumunda bloklamamak için onayla
        return {
            "critic_approved": True,
            "critic_feedback": "",
            "nodes_executed": ["critic"],
            "node_timings": {"critic": elapsed_ms},
            "node_errors": {"critic": str(e)},
        }
