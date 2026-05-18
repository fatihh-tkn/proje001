"""
settings.py — Yönlendirici shim.

Tüm endpoint'ler ayrı modüllere taşındı:
  - settings_ai.py   → AI / sistem konfigürasyonu (rag, feature-flags, vision-model,
                        doc-processing, intelligence-model, agent-assignments, prompts)
  - settings_user.py → Oturum yönetimi ve hazır cevaplar (sessions, canned-responses)

Bu dosya geriye dönük uyumluluk için router'ı dışa aktarır; api/main.py bu modülü
import eder ve `/settings` prefix'i altında kaydeder.
"""

from fastapi import APIRouter

from api.routes.settings_ai import router as _ai_router
from api.routes.settings_user import router as _user_router

router = APIRouter()
router.include_router(_ai_router)
router.include_router(_user_router)
