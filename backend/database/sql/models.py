"""
database/sql/models.py
──────────────────────────────────────────────────────────────────────
Geriye dönük uyumluluk facade'ı.

Tüm ORM modelleri konu bazlı alt dosyalarda tanımlanmıştır:
  - models_auth.py    → Kullanici (kimlik & yetki)
  - models_chat.py    → SohbetOturumu, SohbetMesaji, Toplanti*, GlobalKanal, GlobalMesaj
  - models_archive.py → Belge, VektorParcasi, BilgiIliskisi
  - models_ai.py      → AIModeli, BilgisayarOturumu, SistemAyari, DenetimIzi,
                         AIAgent, ApiLogu, N8nWorkflowCache, Hata, KullaniciHataKaydi,
                         AjanCalismaSirasi
  - models_lms.py     → Egitim, EgitimBolumu, KullaniciEgitimProfili,
                         KullaniciEgitimAtama, KullaniciTalebi, ZliRapor

Bu dosyadan yapılan tüm mevcut import'lar (`from database.sql.models import X`)
wildcard re-export sayesinde kırılmadan çalışmaya devam eder.

Alembic modelleri otomatik keşfetmek için bu dosyayı import eder
(init_db.py → `from database.sql import models`).
"""

from __future__ import annotations

# Alt modülleri Base metadata'ya kaydet (Alembic + init_db için zorunlu)
from database.sql.models_auth import *        # noqa: F401, F403
from database.sql.models_chat import *        # noqa: F401, F403
from database.sql.models_archive import *     # noqa: F401, F403
from database.sql.models_ai import *          # noqa: F401, F403
from database.sql.models_lms import *         # noqa: F401, F403

# Yardımcı fonksiyonlar (bazı route'lar doğrudan import eder — ör. egitim.py)
from database.sql.models_auth import _uuid, _simdi  # noqa: F401

# Base ve metadata (alembic env.py için)
from database.sql.base import Base  # noqa: F401

# ═══════════════════════════════════════════════════════════════════
# GERİYE DÖNÜK UYUMLULUK KISAYOLLARI
# ═══════════════════════════════════════════════════════════════════
from database.sql.models_auth import Kullanici
from database.sql.models_chat import SohbetOturumu, SohbetMesaji
from database.sql.models_archive import Belge, VektorParcasi, BilgiIliskisi
from database.sql.models_ai import AIModeli, AIAgent, ApiLogu

User        = Kullanici
ChatSession = SohbetOturumu
ChatMessage = SohbetMesaji
Document    = Belge
Node        = VektorParcasi
Relation    = BilgiIliskisi
UserModel   = AIModeli
Agent       = AIAgent
ApiLog      = ApiLogu
