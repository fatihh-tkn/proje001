"""
tools/__init__.py — Araç Kayıt Defteri
────────────────────────────────────────────────────────────────
Yeni araç eklemek:
  1. tools/<araç_adı>.py oluştur (AGENT_TOOL + ROUTER tanımla)
  2. Aşağıdaki iki listeye birer satır ekle

Araç çıkarmak:
  - Satırı yorum satırı yap. Başka dosyaya dokunma.
"""

from .file_collector import AGENT_TOOL as _file_collector_tool
from .file_collector import ROUTER     as _file_collector_router
from .dwg_to_pdf     import AGENT_TOOL as _dwg_to_pdf_tool
from .dwg_to_pdf     import ROUTER     as _dwg_to_pdf_router

# ── Ajanlara verilecek araç listesi ──────────────────────────────────────────
AGENT_TOOLS: list = [t for t in [
    _file_collector_tool,   # Dosya toplama ve kopyalama
    _dwg_to_pdf_tool,       # DWG → PDF dönüştürme
    # yeni araç buraya
] if t is not None]

# ── FastAPI router kayıtları ──────────────────────────────────────────────────
API_ROUTERS: list[tuple] = [
    ("/tools/file-collector", _file_collector_router, ["tools"]),
    ("/tools/dwg-to-pdf",     _dwg_to_pdf_router,     ["tools"]),
    # yeni router buraya
]
