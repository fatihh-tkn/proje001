"""
nodes/skill_reader.py
────────────────────────────────────────────────────────────────────
Skill okuyucu uzmanı. Proje kökündeki `.claude/skills/*/SKILL.md`
dosyalarını okuyarak `skill_context` alanına yazar.

Şu anda iskelet aşamasında: AI işleme yapmaz, yalnızca skill
belgelerini toplar ve state'e koyar. Aggregator bu bağlamı
kullanabilir.

Çıktı:
    {
      "skill_context":  "<birleşik SKILL.md içeriği>",
      "nodes_executed": ["skill_reader"],
      "node_timings":   {"skill_reader": ms},
    }
"""

from __future__ import annotations

import time
from pathlib import Path

from core.logger import get_logger
from ..state import AgentState

logger = get_logger("agent_graph.skill_reader")

# .claude/skills/ kökü: bu dosyadan 5 üst dizin = proje kökü
_PROJECT_ROOT = Path(__file__).resolve().parents[4]
_SKILLS_DIR = _PROJECT_ROOT / ".claude" / "skills"


def _load_skills() -> str:
    """Tüm SKILL.md dosyalarını okuyup tek string döner."""
    if not _SKILLS_DIR.exists():
        logger.warning("[skill_reader] skills dizini bulunamadı: %s", _SKILLS_DIR)
        return ""

    parts: list[str] = []
    for skill_md in sorted(_SKILLS_DIR.glob("*/SKILL.md")):
        skill_name = skill_md.parent.name
        try:
            content = skill_md.read_text(encoding="utf-8")
            parts.append(f"## {skill_name}\n\n{content}")
            logger.debug("[skill_reader] yüklendi: %s (%d karakter)", skill_name, len(content))
        except Exception as e:
            logger.warning("[skill_reader] okunamadı: %s — %s", skill_md, e)

    return "\n\n---\n\n".join(parts)


async def skill_reader_node(state: AgentState) -> dict:
    t0 = time.time()

    try:
        skill_context = _load_skills()
        elapsed_ms = int((time.time() - t0) * 1000)

        logger.info(
            "[skill_reader] %d skill yüklendi, %d karakter, %d ms",
            skill_context.count("## "),
            len(skill_context),
            elapsed_ms,
        )
        return {
            "skill_context": skill_context,
            "nodes_executed": ["skill_reader"],
            "node_timings": {"skill_reader": elapsed_ms},
        }

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[skill_reader] hata: %s", e, exc_info=True)
        return {
            "skill_context": "",
            "nodes_executed": ["skill_reader"],
            "node_timings": {"skill_reader": elapsed_ms},
            "node_errors": {"skill_reader": str(e)},
        }
