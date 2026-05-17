"""
tools/dwg_to_pdf_recorder.py
────────────────────────────────────────────────────────────────
Makro Kaydedici

Kullanıcı TrueView üzerinde işlem yaparken her tıklama;
kontrolün adı, sınıfı ve automation ID'si ile birlikte
kaydedilir. Koordinat değil nesne adı saklanır — pencere
konumu değişse bile makro çalışmaya devam eder.

Kullanım:
  start_recording(dwg_path)  → TrueView açılır, kayıt başlar
  get_steps()                → anlık adım listesi
  stop_recording()           → kayıt durur, adımlar döner
  save_steps(steps, path)    → JSON'a yaz
  load_steps(path)           → JSON'dan oku
  replay_steps(steps, app)   → kayıtlı adımları oynat
"""

from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

import win32gui

logger = logging.getLogger(__name__)

# ── Global kayıt durumu ───────────────────────────────────────────────────────

_state: dict = {
    "recording":  False,
    "steps":      [],
    "app":        None,   # pywinauto Application
    "listener":   None,   # pynput listener
    "trueview_hwnd": None,
}

_MACRO_FILE = Path(__file__).parent / "macro_steps.json"


# ── Kontrol bilgisi al ────────────────────────────────────────────────────────

def _ctrl_info_at(x: int, y: int) -> dict:
    """Ekrandaki (x,y) noktasındaki Windows kontrolünün bilgisini döner."""
    hwnd = win32gui.WindowFromPoint((x, y))
    name       = ""
    class_name = ""
    auto_id    = ""
    ctrl_type  = ""
    parent_name = ""

    try:
        name       = (win32gui.GetWindowText(hwnd) or "").strip()[:80]
        class_name = (win32gui.GetClassName(hwnd) or "").strip()[:40]
    except Exception:
        pass

    # pywinauto UIA ile automation_id ve control_type dene
    try:
        from pywinauto import Desktop
        ctrl = Desktop(backend="uia").from_point(x, y)
        ei = ctrl.element_info
        auto_id   = (ei.automation_id or "").strip()[:80]
        ctrl_type = str(ei.control_type).split(".")[-1]
        if not name:
            name = (ei.name or "").strip()[:80]
        # Üst pencere adı (hangi diyalog içinde?)
        try:
            parent_name = (ei.parent.name or "").strip()[:60]
        except Exception:
            pass
    except Exception:
        pass

    return {
        "hwnd":        hwnd,
        "name":        name,
        "class_name":  class_name,
        "auto_id":     auto_id,
        "control_type": ctrl_type,
        "parent_name": parent_name,
        "x": x, "y": y,
    }


# ── Kayıt başlat / durdur ─────────────────────────────────────────────────────

def start_recording(dwg_path: str = "") -> dict:
    """
    Global fare tıklamalarını kaydetmeye başlar.
    TrueView kuruluysa açılır; kurulu değilse kayıt yine de başlar.
    """
    if _state["recording"]:
        return {"error": "Kayıt zaten devam ediyor."}

    _state["steps"] = []
    _state["recording"] = True

    # TrueView açmayı dene (opsiyonel)
    trueview_opened = False
    try:
        from tools.dwg_to_pdf_gui import find_trueview_exe
        exe = find_trueview_exe()
        if exe:
            from pywinauto import Application
            cmd = f'"{exe}"'
            if dwg_path and Path(dwg_path).is_file():
                cmd = f'"{exe}" "{dwg_path}"'
            app = Application(backend="uia").start(cmd, timeout=30)
            win = app.window(title_re=r".*(TrueView|AutoCAD).*")
            win.wait("exists visible", timeout=20)
            win.set_focus()
            _state["app"] = app
            _state["trueview_hwnd"] = win.handle
            trueview_opened = True
    except Exception as exc:
        logger.warning("[REC] TrueView açılamadı (kayıt yine de başlıyor): %s", exc)

    # Global fare hook (pynput)
    try:
        from pynput import mouse as pynput_mouse

        def _on_click(x, y, button, pressed):
            if not pressed or not _state["recording"]:
                return
            if str(button) != "Button.left":
                return

            info = _ctrl_info_at(x, y)

            step = {
                "id":           str(uuid.uuid4())[:8],
                "action":       "click",
                "name":         info["name"],
                "auto_id":      info["auto_id"],
                "class_name":   info["class_name"],
                "control_type": info["control_type"],
                "parent_name":  info["parent_name"],
                "x": x, "y": y,
                "note":         info["name"] or info["class_name"] or f"({x},{y})",
            }
            _state["steps"].append(step)
            logger.info("[REC] Adım %d: %s / %s / %s",
                        len(_state["steps"]), step["name"], step["class_name"], step["auto_id"])

        listener = pynput_mouse.Listener(on_click=_on_click)
        listener.start()
        _state["listener"] = listener
    except Exception as exc:
        _state["recording"] = False
        return {"error": f"pynput başlatılamadı: {exc}"}

    msg = "Kayıt başladı."
    if trueview_opened:
        msg += " TrueView açık ve görünür — işlemlerinizi yapın."
    else:
        msg += " Ekranda istediğiniz yere tıklayın, tüm tıklamalar kaydedilecek."

    logger.info("[REC] %s", msg)
    return {"status": "recording", "message": msg, "trueview_opened": trueview_opened}


def get_steps() -> list[dict]:
    """Anlık kayıtlı adımları döner."""
    return list(_state["steps"])


def stop_recording() -> dict:
    """Kaydı durdurur, adımları döner ve TrueView'ı kapatır."""
    if not _state["recording"]:
        return {"error": "Aktif kayıt yok.", "steps": []}

    _state["recording"] = False

    # Dinleyiciyi durdur
    try:
        if _state["listener"]:
            _state["listener"].stop()
            _state["listener"] = None
    except Exception:
        pass

    steps = list(_state["steps"])

    # TrueView'ı kapat
    try:
        if _state["app"]:
            _state["app"].kill()
            _state["app"] = None
    except Exception:
        pass

    # Otomatik kaydet
    save_steps(steps)

    logger.info("[REC] Kayıt tamamlandı. %d adım kaydedildi.", len(steps))
    return {"status": "stopped", "steps": steps, "count": len(steps)}


# ── JSON kayıt / yükle ────────────────────────────────────────────────────────

def save_steps(steps: list[dict], path: Optional[str] = None) -> str:
    """Adımları JSON dosyasına yazar."""
    target = Path(path) if path else _MACRO_FILE
    target.write_text(json.dumps(steps, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("[REC] %d adım kaydedildi → %s", len(steps), target)
    return str(target)


def load_steps(path: Optional[str] = None) -> list[dict]:
    """JSON dosyasından adımları yükler."""
    target = Path(path) if path else _MACRO_FILE
    if not target.is_file():
        return []
    return json.loads(target.read_text(encoding="utf-8"))


# ── Adımları oynat ────────────────────────────────────────────────────────────

def replay_steps(steps: list[dict], app) -> list[dict]:
    """
    Kaydedilmiş adımları pywinauto ile oynatır.
    Her adımı önce automation_id, sonra name, sonra class_name ile arar.
    Bulamazsa koordinat ile tıklar (fallback).
    Sonuç: her adım için {id, status, message}
    """
    results = []

    for step in steps:
        action = step.get("action", "click")
        sid    = step.get("id", "?")

        if action != "click":
            results.append({"id": sid, "status": "skip", "message": "Bilinmeyen aksiyon"})
            continue

        clicked = False
        msg     = ""

        # 1. automation_id ile bul
        if step.get("auto_id"):
            try:
                ctrl = app.window(auto_id=step["auto_id"])
                ctrl.click_input()
                clicked = True
                msg = f"auto_id ile tıklandı: {step['auto_id']}"
            except Exception as e:
                msg = str(e)

        # 2. name + control_type ile bul
        if not clicked and step.get("name"):
            try:
                kwargs = {"title": step["name"]}
                if step.get("control_type"):
                    kwargs["control_type"] = step["control_type"]
                ctrl = app.window(**kwargs)
                ctrl.click_input()
                clicked = True
                msg = f"name ile tıklandı: {step['name']}"
            except Exception as e:
                msg = str(e)

        # 3. class_name ile bul
        if not clicked and step.get("class_name"):
            try:
                ctrl = app.window(class_name=step["class_name"])
                ctrl.click_input()
                clicked = True
                msg = f"class ile tıklandı: {step['class_name']}"
            except Exception as e:
                msg = str(e)

        # 4. Koordinat fallback
        if not clicked and step.get("x") is not None:
            try:
                import win32api, win32con
                win32api.SetCursorPos((step["x"], step["y"]))
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, step["x"], step["y"], 0, 0)
                time.sleep(0.05)
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, step["x"], step["y"], 0, 0)
                clicked = True
                msg = f"koordinat fallback: ({step['x']}, {step['y']})"
            except Exception as e:
                msg = str(e)

        results.append({
            "id":      sid,
            "status":  "ok" if clicked else "error",
            "message": msg,
        })
        time.sleep(0.3)  # Adımlar arası kısa bekleme

    return results
