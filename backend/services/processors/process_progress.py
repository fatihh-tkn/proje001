"""
services/processors/process_progress.py
──────────────────────────────────────────────────────────────────────
Arka planda işlenen belgeler için thread-safe ilerleme kaydı.
SSE endpoint bu store'u okur, frontend loading toast'ı canlı günceller.

Kullanım:
    set_current_doc(doc_id)   # işlem başında — thread-local kaydeder
    step("Vision AI'ya gönderiliyor...")  # her aşamada çağrılır
    done(doc_id)              # başarıyla bitti
    error(doc_id, "Hata: …")  # hatayla bitti
"""

from __future__ import annotations
import time
import threading

_lock  = threading.Lock()
_store: dict[str, dict] = {}
_local = threading.local()   # her thread kendi doc_id'sini tutar


# ── Yazma ─────────────────────────────────────────────────────────────

def set_current_doc(doc_id: str) -> None:
    """Mevcut thread'de işlenen doc_id'yi ayarla."""
    _local.doc_id = doc_id


def update(doc_id: str, step_text: str, *, done: bool = False, error: bool = False) -> None:
    with _lock:
        _store[doc_id] = {
            "step":  step_text,
            "done":  done,
            "error": error,
            "ts":    time.time(),
        }


def step(step_text: str) -> None:
    """Mevcut thread'in doc_id'sine göre adım günceller (doc_id bilinmeden çağrılır)."""
    doc_id = getattr(_local, "doc_id", None)
    if doc_id:
        update(doc_id, step_text)


def done(doc_id: str, step_text: str = "Tamamlandı") -> None:
    update(doc_id, step_text, done=True)


def fail(doc_id: str, step_text: str = "Hata oluştu") -> None:
    update(doc_id, step_text, error=True)


# ── Okuma / temizlik ───────────────────────────────────────────────────

def get(doc_id: str) -> dict | None:
    with _lock:
        return dict(_store[doc_id]) if doc_id in _store else None


def clear(doc_id: str) -> None:
    with _lock:
        _store.pop(doc_id, None)
