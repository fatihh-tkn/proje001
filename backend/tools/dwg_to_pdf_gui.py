"""
tools/dwg_to_pdf_gui.py
────────────────────────────────────────────────────────────────
TrueView GUI Otomasyonu — pywinauto ile DWG → PDF

TrueView bir kez açılır, tüm dosyalar sırayla içinden geçer,
en son kapanır. Pencere win32 API ile gizlenir.

Gereksinim: pip install pywinauto  (pywin32 zaten mevcut)
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# TrueView / AutoCAD dwgviewr.exe arama yolları
_VIEWER_SEARCH_PATHS = [
    r"C:\Program Files\Autodesk\DWG TrueView 2027 - English\dwgviewr.exe",
    r"C:\Program Files\Autodesk\DWG TrueView 2027 - Turkish\dwgviewr.exe",
    r"C:\Program Files\Autodesk\DWG TrueView 2027\dwgviewr.exe",
    r"C:\Program Files\Autodesk\DWG TrueView 2026 - English\dwgviewr.exe",
    r"C:\Program Files\Autodesk\DWG TrueView 2026\dwgviewr.exe",
    r"C:\Program Files\Autodesk\DWG TrueView 2025 - English\dwgviewr.exe",
    r"C:\Program Files\Autodesk\DWG TrueView 2025\dwgviewr.exe",
    r"C:\Program Files\Autodesk\AutoCAD 2027\acad.exe",
    r"C:\Program Files\Autodesk\AutoCAD 2026\acad.exe",
    r"C:\Program Files\Autodesk\AutoCAD 2025\acad.exe",
]


def find_trueview_exe() -> Optional[str]:
    for p in _VIEWER_SEARCH_PATHS:
        if Path(p).is_file():
            return p
    autodesk = Path(r"C:\Program Files\Autodesk")
    if autodesk.is_dir():
        for folder in sorted(autodesk.iterdir(), reverse=True):
            for exe_name in ("dwgviewr.exe", "acad.exe"):
                exe = folder / exe_name
                if exe.is_file():
                    return str(exe)
    return None


class TrueViewSession:
    """
    TrueView'ı tek seferlik açar, dosyaları sırayla işler.
    context manager olarak kullanılır:
        with TrueViewSession(printer, plot_style) as tv:
            result = tv.convert("file.dwg", "out.pdf")
    """

    def __init__(self, printer: str, plot_style: str, orientation: str,
                 first_file: str = ""):
        self.printer     = printer
        self.plot_style  = plot_style
        self.orientation = orientation
        self.first_file  = first_file   # CLI argümanı — Ctrl+O diyaloğuna gerek yok
        self._app    = None
        self._win    = None
        self._hwnd   = None

    # ── Başlatma / Kapatma ──────────────────────────────────────────────────

    def __enter__(self):
        self._start()
        return self

    def __exit__(self, *_):
        self._close()

    def _start(self):
        from pywinauto import Application
        import win32gui, win32con

        exe = find_trueview_exe()
        if not exe:
            raise RuntimeError("TrueView / AutoCAD bulunamadı.")

        logger.info("[GUI] TrueView başlatılıyor: %s", exe)

        # İlk dosya varsa CLI argümanı olarak ver — Ctrl+O diyaloğu açılmaz
        cmd = f'"{exe}"'
        if self.first_file and Path(self.first_file).is_file():
            cmd = f'"{exe}" "{self.first_file}"'
            logger.info("[GUI] İlk dosya CLI argümanı: %s", self.first_file)

        self._app = Application(backend="win32").start(cmd, timeout=30)

        # Ana pencereyi bekle
        self._win = self._app.window(title_re=r".*(TrueView|AutoCAD).*")
        self._win.wait("exists visible", timeout=20)
        time.sleep(3 if self.first_file else 2)

        # Pencereyi gizle
        self._hwnd = self._win.handle
        win32gui.ShowWindow(self._hwnd, win32con.SW_HIDE)
        logger.info("[GUI] Pencere gizlendi.")

    def _close(self):
        try:
            if self._app:
                self._app.kill()
                logger.info("[GUI] TrueView kapatıldı.")
        except Exception:
            pass

    # ── Dosya Açma ──────────────────────────────────────────────────────────

    def _open_file(self, dwg_path: str):
        import win32gui, win32con

        # Pencereyi geçici göster, Ctrl+O gönder, tekrar gizle
        win32gui.ShowWindow(self._hwnd, win32con.SW_SHOW)
        self._win.set_focus()
        self._win.type_keys("^o", pause=0.3)
        win32gui.ShowWindow(self._hwnd, win32con.SW_HIDE)

        # Standart Windows "Dosya Aç" diyaloğu
        try:
            dlg = self._app.window(title_re=r".*(Select File|Open|Dosya|Aç).*")
            dlg.wait("visible", timeout=10)
        except Exception:
            # Alternatif: child dialog
            dlg = self._win.child_window(class_name="#32770")
            dlg.wait("visible", timeout=10)

        # Dosya yolunu doğrudan filename kutusuna yaz
        try:
            fn_edit = dlg.child_window(class_name="Edit", found_index=0)
            fn_edit.set_edit_text(dwg_path)
        except Exception:
            # Alternatif yol: ComboBoxEx32
            fn_edit = dlg.child_window(class_name="ComboBoxEx32")
            fn_edit.child_window(class_name="Edit").set_edit_text(dwg_path)

        fn_edit.type_keys("{ENTER}", pause=0.2)
        logger.info("[GUI] Dosya açılıyor: %s", Path(dwg_path).name)

        # Dosya yüklenene kadar bekle (progress bar kaybolana kadar)
        time.sleep(4)

    # ── PDF'e Yazdırma ──────────────────────────────────────────────────────

    def _print_to_pdf(self, output_pdf: str) -> bool:
        import win32gui, win32con

        Path(output_pdf).parent.mkdir(parents=True, exist_ok=True)

        # Ctrl+P — Plot diyaloğu
        win32gui.ShowWindow(self._hwnd, win32con.SW_SHOW)
        self._win.set_focus()
        self._win.type_keys("^p", pause=0.5)
        win32gui.ShowWindow(self._hwnd, win32con.SW_HIDE)

        # Plot / Print diyaloğunu bekle
        try:
            plot_dlg = self._app.window(title_re=r".*(Plot|Print|Yazdır).*")
            plot_dlg.wait("visible", timeout=10)
        except Exception:
            logger.warning("[GUI] Plot diyaloğu bulunamadı")
            return False

        # Yazıcı seçimi — ComboBox'ta printer adını bul
        try:
            printer_combo = plot_dlg.child_window(
                class_name="ComboBox", found_index=0
            )
            printer_combo.select(self.printer)
            time.sleep(0.5)
        except Exception:
            logger.warning("[GUI] Yazıcı seçilemedi, mevcut ayarla devam ediliyor")

        # "Plot to File" kutucuğunu işaretle (checkbox)
        try:
            for cb in plot_dlg.children(class_name="Button"):
                if "file" in (cb.window_text() or "").lower():
                    if not cb.get_check_state():
                        cb.click_input()
                    break
        except Exception:
            pass

        # OK / Plot butonu
        try:
            ok_btn = plot_dlg.child_window(title_re=r"OK|Plot|Tamam", class_name="Button")
            ok_btn.click_input()
        except Exception:
            plot_dlg.type_keys("{ENTER}", pause=0.3)

        # Kayıt yeri diyaloğu (browse for filename)
        time.sleep(1.5)
        try:
            save_dlg = self._app.window(title_re=r".*(Save|Browse|Kaydet|PDF).*")
            save_dlg.wait("visible", timeout=8)
            fn_edit = save_dlg.child_window(class_name="Edit", found_index=0)
            fn_edit.set_edit_text(output_pdf)
            fn_edit.type_keys("{ENTER}", pause=0.3)
            logger.info("[GUI] PDF yolu girildi: %s", output_pdf)
        except Exception:
            # Bazı plotter'lar diyalog açmadan doğrudan yazar
            logger.info("[GUI] Kayıt diyaloğu yok, plotter kendi kaydediyor")

        # PDF dosyasının oluşmasını bekle (max 30sn)
        for _ in range(30):
            if Path(output_pdf).is_file() and Path(output_pdf).stat().st_size > 0:
                return True
            time.sleep(1)

        return False

    # ── Belgeyi Kapat ────────────────────────────────────────────────────────

    def _close_document(self):
        try:
            self._win.type_keys("^{F4}", pause=0.5)
            # "Kaydetmek ister misiniz?" diyaloğunu reddet
            try:
                msg = self._app.window(title_re=r".*(Save|Kaydet|DWG).*")
                msg.wait("visible", timeout=3)
                no_btn = msg.child_window(title_re=r"No|Hayır", class_name="Button")
                no_btn.click_input()
            except Exception:
                pass
            time.sleep(1)
        except Exception:
            pass

    # ── Ana Dönüştürme Metodu ────────────────────────────────────────────────

    def convert(self, dwg_path: str, output_pdf: str,
                skip_open: bool = False) -> tuple[bool, str]:
        """
        Tek dosyayı dönüştürür.
        skip_open=True: dosya zaten açık (CLI arg ile açıldı), Ctrl+O atlanır.
        """
        try:
            if not skip_open:
                self._open_file(dwg_path)
            success = self._print_to_pdf(output_pdf)
            self._close_document()
            if success:
                return True, "GUI otomasyonu ile dönüştürüldü"
            return False, "PDF oluşturulamadı"
        except Exception as exc:
            logger.exception("[GUI] Dönüştürme hatası: %s", exc)
            return False, str(exc)


# ── Toplu dönüştürme (dwg_to_pdf.py'den çağrılır) ───────────────────────────

def convert_batch_gui(
    dwg_files: list[str],
    output_dir: str,
    printer: str,
    plot_style: str,
    orientation: str,
) -> list[dict]:
    """
    TrueView'ı bir kez açıp tüm dosyaları sırayla dönüştürür.
    Her dosya için dict döner: {source, output, status, message, method_used}
    """
    results = []
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        # İlk dosyayı CLI argümanı olarak ver — TrueView doğrudan o dosyayla açılır
        first = dwg_files[0] if dwg_files else ""
        with TrueViewSession(printer, plot_style, orientation,
                             first_file=first) as tv:
            for i, dwg_path in enumerate(dwg_files):
                src  = Path(dwg_path)
                pdf  = str(out_dir / (src.stem + ".pdf"))
                # İlk dosya zaten CLI ile açık — Ctrl+O diyaloğu atla
                skip_open = (i == 0 and bool(first))
                ok, msg = tv.convert(dwg_path, pdf, skip_open=skip_open)
                results.append({
                    "source":      dwg_path,
                    "output":      pdf if ok else "",
                    "status":      "converted" if ok else "error",
                    "message":     msg,
                    "method_used": "gui",
                })
                logger.info("[GUI] %s → %s", src.name, "OK" if ok else "HATA")
    except Exception as exc:
        # TrueView açılamadıysa tüm dosyaları hata olarak işaretle
        for dwg_path in dwg_files:
            results.append({
                "source":      dwg_path,
                "output":      "",
                "status":      "error",
                "message":     f"TrueView başlatılamadı: {exc}",
                "method_used": "gui",
            })

    return results


# ── Dialog Tarama — kontrolları keşfet ──────────────────────────────────────

def _find_sample_dwg() -> str:
    """Tarama için kullanılacak örnek DWG dosyasını bulur."""
    candidates = [
        # TrueView şablonları
        r"C:\Users\fatih\AppData\Local\Autodesk\DWG TrueView 2027 - English\R25\enu\Template\Architectural Title Block.dwg",
        r"C:\Users\fatih\AppData\Local\Autodesk\DWG TrueView 2027 - English\R25\enu\Template\Generic 24in x 36in Title Block.dwg",
    ]
    for p in candidates:
        if Path(p).is_file():
            return p
    # Kullanıcının AppData'sından herhangi bir DWG
    import glob
    found = glob.glob(r"C:\Users\fatih\AppData\Local\Autodesk\**\*.dwg", recursive=True)
    if found:
        return found[0]
    return ""


def scan_plot_dialog(dwg_path: str = "") -> dict:
    """
    TrueView'ı bir DWG dosyasıyla açar, Plot (Ctrl+P) diyaloğunu tetikler ve
    içindeki tüm UI kontrollerini döker.
    Sonuç: { exe, controls: [{name, class_name, auto_id, control_type, rect}] }
    """
    exe = find_trueview_exe()
    if not exe:
        return {"error": "TrueView / AutoCAD bulunamadı.", "controls": []}

    # Kullanılacak DWG dosyasını belirle
    sample = dwg_path if (dwg_path and Path(dwg_path).is_file()) else _find_sample_dwg()
    if not sample:
        return {"error": "Tarama için DWG dosyası bulunamadı. Lütfen bir DWG yolu belirtin.", "controls": []}

    controls: list[dict] = []

    try:
        from pywinauto import Application

        # DWG dosyasıyla aç — dosya menüsü yerine gerçek çizim yüklenir
        logger.info("[GUI Scan] TrueView açılıyor: %s", sample)
        app = Application(backend="uia").start(f'"{exe}" "{sample}"', timeout=30)
        win = app.window(title_re=r".*(TrueView|AutoCAD).*")
        win.wait("exists visible", timeout=20)
        time.sleep(4)  # Dosyanın yüklenmesi için bekle

        # Plot diyaloğunu aç — pencereyi görünür tut (tarama amaçlı)
        win.set_focus()
        win.type_keys("^p", pause=0.6)
        time.sleep(2)

        # Diyaloğu bul
        plot_dlg = None
        for title_pat in [r".*(Plot|Print|Yazdır).*", r".*Plot.*"]:
            try:
                plot_dlg = app.window(title_re=title_pat)
                plot_dlg.wait("visible", timeout=6)
                break
            except Exception:
                continue

        if plot_dlg is None:
            app.kill()
            return {"error": "Plot diyaloğu açılamadı.", "controls": []}

        # Tüm alt kontrolleri yürü
        for ctrl in plot_dlg.descendants():
            try:
                ei = ctrl.element_info
                name      = (ei.name or "").strip()[:80]
                auto_id   = (ei.automation_id or "").strip()[:80]
                class_nm  = (ei.class_name or "").strip()[:40]
                ctrl_type = str(ei.control_type).split(".")[-1]  # "Button", "Edit" vb.
                rect      = ei.rectangle
                controls.append({
                    "name":         name,
                    "auto_id":      auto_id,
                    "class_name":   class_nm,
                    "control_type": ctrl_type,
                    "rect":         {
                        "left": rect.left, "top": rect.top,
                        "right": rect.right, "bottom": rect.bottom,
                    } if rect else None,
                })
            except Exception:
                pass

        # Dialog ve uygulama kapat
        try:
            plot_dlg.type_keys("{ESCAPE}", pause=0.3)
        except Exception:
            pass
        time.sleep(0.5)
        app.kill()

    except Exception as exc:
        logger.exception("[GUI Scan] Hata: %s", exc)
        return {"error": str(exc), "controls": []}

    # Boş name+auto_id+class olan satırları filtrele
    controls = [c for c in controls if c["name"] or c["auto_id"] or c["class_name"]]

    return {"exe": exe, "controls": controls}
