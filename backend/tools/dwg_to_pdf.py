"""
tools/dwg_to_pdf.py
────────────────────────────────────────────────────────────────
DWG → PDF Dönüştürme Aracı

accoreconsole.exe (DWG TrueView veya AutoCAD) kullanarak DWG
dosyalarını arka planda sessizce PDF'e çevirir.

Sabit (kod düzeyinde):
  - Plot alanı: Extents (tüm çizim)
  - Merkeze hizala: Evet
  - Ölçek: Fit (sayfaya sığdır)

Kullanıcı tarafından ayarlanabilir:
  - Çıktı formatı (printer .pc3)
  - Plot stili (.ctb)
  - Kağıt boyutu & yönü
  - Layout seçimi
  - Paralel worker sayısı
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)
from pathlib import Path
from typing import Optional, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

# ── Sabit listeler — dwg_presets.json'dan yüklenir ───────────────────────────
_PRESETS = json.loads(
    open(os.path.join(os.path.dirname(__file__), "dwg_presets.json"), encoding="utf-8").read()
)
PRINTER_OPTIONS: list[dict]       = _PRESETS["printer_options"]
PLOT_STYLE_OPTIONS: list[dict]    = _PRESETS["plot_style_options"]
PAPER_SIZE_OPTIONS: list[str]     = _PRESETS["paper_size_options"]
# accoreconsole.exe yaygın kurulum yolları (sırayla denenir)
_CONSOLE_SEARCH_PATHS: list[str]  = _PRESETS["console_search_paths"]


# ── Pydantic şemalar ──────────────────────────────────────────────────────────

class DwgConvertParams(BaseModel):
    dwg_files: list[str] = Field(..., description="Dönüştürülecek DWG dosya yolları listesi")
    output_dir: str = Field(..., description="PDF çıktı klasörü")
    printer: str = Field(
        "DWG To PDF.pc3",
        description="Kullanılacak plotter/printer (.pc3 dosyası)",
    )
    plot_style: str = Field(
        ".",
        description="Plot stili (.ctb dosyası). '.' = Yok",
    )
    paper_size: str = Field(
        "ISO_A0_(841.00_x_1189.00_MM)",
        description="Kağıt boyutu. Varsayılan A0 — Extents+Fit ile her boyut sığar.",
    )
    orientation: Literal["Landscape", "Portrait"] = Field(
        "Landscape",
        description="Kağıt yönü",
    )
    layout: str = Field(
        "Model",
        description="Çizilecek layout. 'Model' veya layout sekme adı",
    )
    max_workers: int = Field(
        2,
        ge=1,
        le=8,
        description="Eş zamanlı dönüştürme sayısı",
    )
    accoreconsole_path: Optional[str] = Field(
        None,
        description="accoreconsole.exe yolu. Boş bırakılırsa otomatik aranır.",
    )
    method: Literal["gui", "oda"] = Field(
        "gui",
        description="Dönüştürme yöntemi. gui=TrueView pencere otomasyonu. oda=ODA+ezdxf pipeline.",
    )


class ConvertFileResult(BaseModel):
    source: str
    output: str
    status: Literal["converted", "error", "skipped"]
    message: str
    method_used: str = ""


class DwgConvertResult(BaseModel):
    total: int
    converted: int
    errors: int
    notifications: list[dict]
    files: list[ConvertFileResult]
    accoreconsole_used: str


# ── accoreconsole.exe bulma ───────────────────────────────────────────────────

def find_accoreconsole(custom_path: Optional[str] = None) -> Optional[str]:
    if custom_path and Path(custom_path).is_file():
        return custom_path
    # Önce sabit listede ara
    for path in _CONSOLE_SEARCH_PATHS:
        if Path(path).is_file():
            return path
    # Sabit listede bulunamazsa Autodesk klasörünü dinamik tara
    autodesk_root = Path(r"C:\Program Files\Autodesk")
    if autodesk_root.is_dir():
        candidates = sorted(autodesk_root.iterdir(), reverse=True)  # yeniden eskiye
        for folder in candidates:
            exe = folder / "accoreconsole.exe"
            if exe.is_file():
                return str(exe)
    return None


# ── Script üretici ────────────────────────────────────────────────────────────

def _build_script(output_pdf: str) -> str:
    lines = [
        "-EXPORTPDF",
        output_pdf,
        "",                         # Varsayılan ayarları kabul et
        "QUIT",
        "Y",
    ]
    return "\n".join(lines) + "\n"


# ── Tek dosya dönüştürme ──────────────────────────────────────────────────────

def _convert_one(
    dwg_path: str,
    params: DwgConvertParams,
    console_exe: str,
) -> ConvertFileResult:
    src = Path(dwg_path)
    if not src.is_file():
        return ConvertFileResult(
            source=dwg_path,
            output="",
            status="error",
            message=f"Dosya bulunamadı: {dwg_path}",
        )

    out_dir = Path(params.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    output_pdf = str(out_dir / (src.stem + ".pdf"))

    script_content = _build_script(output_pdf)

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".scr", delete=False, encoding="utf-8"
    ) as scr:
        scr.write(script_content)
        scr_path = scr.name

    try:
        result = subprocess.run(
            [console_exe, "/i", str(src), "/s", scr_path],
            capture_output=True,
            timeout=120,
        )

        def _decode(b: bytes) -> str:
            for enc in ("utf-16", "utf-8", "cp1254", "cp1252", "latin-1"):
                try:
                    return b.decode(enc)
                except Exception:
                    continue
            return b.decode("latin-1", errors="replace")

        stdout = _decode(result.stdout)
        stderr = _decode(result.stderr)

        if Path(output_pdf).is_file():
            return ConvertFileResult(
                source=dwg_path,
                output=output_pdf,
                status="converted",
                message="Başarıyla dönüştürüldü",
            )

        stdout_tail = stdout[-800:]
        stderr_tail = stderr[-300:]
        logger.warning("[dwg_to_pdf] %s → PDF yok\nSTDOUT:\n%s\nSTDERR:\n%s",
                       src.name, stdout_tail, stderr_tail)
        debug = f"STDOUT: {stdout_tail} | STDERR: {stderr_tail}".strip()
        return ConvertFileResult(
            source=dwg_path,
            output="",
            status="error",
            message=f"PDF oluşturulamadı. {debug}",
        )
    except subprocess.TimeoutExpired:
        return ConvertFileResult(
            source=dwg_path,
            output="",
            status="error",
            message="Zaman aşımı (120s) — dosya çok büyük veya program yanıt vermiyor",
        )
    except Exception as exc:
        return ConvertFileResult(
            source=dwg_path,
            output="",
            status="error",
            message=str(exc),
        )
    finally:
        try:
            os.unlink(scr_path)
        except OSError:
            pass


# ── COM otomasyonu ────────────────────────────────────────────────────────────

# TrueView/AutoCAD COM ProgID'leri — yeniden eskiye
_COM_PROG_IDS: list[str]       = _PRESETS["com_prog_ids"]
_PLOT_ROTATION: dict[str, int] = _PRESETS["plot_rotation"]


def _convert_one_com(dwg_path: str, params: DwgConvertParams) -> ConvertFileResult:
    """TrueView/AutoCAD COM API üzerinden DWG → PDF. accoreconsole'u bypass eder."""
    try:
        import pythoncom
        import win32com.client
    except ImportError:
        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message="pywin32 kurulu değil. Backend venv'de 'pip install pywin32' çalıştırın.",
            method_used="com",
        )

    src = Path(dwg_path)
    if not src.is_file():
        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message=f"Dosya bulunamadı: {dwg_path}", method_used="com",
        )

    out_dir = Path(params.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    output_pdf = str(out_dir / (src.stem + ".pdf"))

    pythoncom.CoInitialize()
    acad = None
    doc  = None
    try:
        # Çalışan instance'a bağlan, yoksa yeni aç
        for prog_id in _COM_PROG_IDS:
            try:
                acad = win32com.client.GetActiveObject(prog_id)
                break
            except Exception:
                try:
                    acad = win32com.client.Dispatch(prog_id)
                    break
                except Exception:
                    continue

        if acad is None:
            return ConvertFileResult(
                source=dwg_path, output="", status="error",
                message="TrueView/AutoCAD COM sunucusuna bağlanılamadı.",
                method_used="com",
            )

        acad.Visible = False

        doc = acad.Documents.Open(str(src.resolve()))

        # Layout seç
        try:
            layout = doc.Layouts.Item(params.layout)
        except Exception:
            layout = doc.Layouts.Item("Model")

        # Plot ayarlarını layout üzerinden uygula
        layout.ConfigName      = params.printer
        layout.PlotType        = 0    # Extents
        layout.UseStandardScale = True
        layout.StandardScale   = 0   # Fit to paper
        layout.CenterPlot      = True
        layout.PlotRotation    = _PLOT_ROTATION.get(params.orientation, 1)

        if params.plot_style and params.plot_style != ".":
            layout.StyleSheet = params.plot_style

        try:
            layout.CanonicalMediaName = params.paper_size
        except Exception:
            pass  # Kağıt boyutu uyumsuzsa devam et

        # PDF'e plot et
        plot = doc.Plot
        plot_ok = plot.PlotToFile(output_pdf, [layout.Name])

        doc.Close(False)
        doc = None

        if Path(output_pdf).is_file():
            return ConvertFileResult(
                source=dwg_path, output=output_pdf,
                status="converted", message="COM ile başarıyla dönüştürüldü",
                method_used="com",
            )

        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message=f"COM plot tamamlandı fakat PDF oluşmadı (PlotToFile={plot_ok})",
            method_used="com",
        )

    except Exception as exc:
        logger.warning("[dwg_to_pdf COM] %s → hata: %s", src.name, exc)
        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message=f"COM hatası: {exc}", method_used="com",
        )
    finally:
        if doc:
            try:
                doc.Close(False)
            except Exception:
                pass
        pythoncom.CoUninitialize()


# ── LISP otomasyonu ───────────────────────────────────────────────────────────

def _build_lisp(params: DwgConvertParams, output_pdf: str) -> str:
    """
    AutoLISP script üretir. (command "._-plot" ...) ile -PLOT'u
    komut parser'ı yerine doğrudan iç API üzerinden çağırır.
    """
    orient_char = "L" if params.orientation == "Landscape" else "P"
    paper_units = "M"
    if "Inches" in params.paper_size:
        paper_units = "I"
    has_style  = params.plot_style != "."
    use_style  = "Y" if has_style else "N"
    style_arg  = params.plot_style if has_style else "."
    # Çıktı yolundaki ters eğik çizgileri LISP için escape et
    pdf_escaped = output_pdf.replace("\\", "\\\\")

    return f'''(defun c:DOPDF ( / )
  (command "._-plot"
    "Y"
    "{params.layout}"
    "{params.printer}"
    "{params.paper_size}"
    "{paper_units}"
    "{orient_char}"
    "N"
    "E"
    "C"
    "F"
    "{style_arg}"
    "{use_style}"
    "Y"
    "N"
    "N"
    "N"
    "{pdf_escaped}"
    "Y"
  )
  (princ)
)
(c:DOPDF)
'''


def _convert_one_lisp(
    dwg_path: str,
    params: DwgConvertParams,
    console_exe: str,
) -> ConvertFileResult:
    """AutoLISP üzerinden dönüştürme — accoreconsole komut kısıtlamasını bypass eder."""
    src = Path(dwg_path)
    if not src.is_file():
        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message=f"Dosya bulunamadı: {dwg_path}", method_used="lisp",
        )

    out_dir = Path(params.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    output_pdf = str(out_dir / (src.stem + ".pdf"))

    lisp_content = _build_lisp(params, output_pdf)
    lsp_path = scr_path = ""

    try:
        # .lsp dosyası
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".lsp", delete=False, encoding="utf-8"
        ) as lsp:
            lsp.write(lisp_content)
            lsp_path = lsp.name

        # .scr dosyası — lsp'yi yükler ve DOPDF komutunu çalıştırır
        lsp_escaped = lsp_path.replace("\\", "/")
        scr_content = f'(load "{lsp_escaped}")\nDOPDF\nQUIT\nY\n'
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".scr", delete=False, encoding="utf-8"
        ) as scr:
            scr.write(scr_content)
            scr_path = scr.name

        result = subprocess.run(
            [console_exe, "/i", str(src), "/s", scr_path],
            capture_output=True,
            timeout=120,
        )

        def _decode(b: bytes) -> str:
            for enc in ("utf-16", "utf-8", "cp1254", "cp1252", "latin-1"):
                try:
                    return b.decode(enc)
                except Exception:
                    continue
            return b.decode("latin-1", errors="replace")

        stdout = _decode(result.stdout)

        if Path(output_pdf).is_file():
            return ConvertFileResult(
                source=dwg_path, output=output_pdf,
                status="converted", message="LISP ile başarıyla dönüştürüldü",
                method_used="lisp",
            )

        logger.warning("[dwg_to_pdf LISP] %s → PDF yok\nSTDOUT:\n%s", src.name, stdout[-600:])
        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message=f"LISP plot başarısız. {stdout[-400:]}".strip(),
            method_used="lisp",
        )

    except subprocess.TimeoutExpired:
        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message="Zaman aşımı (120s)", method_used="lisp",
        )
    except Exception as exc:
        return ConvertFileResult(
            source=dwg_path, output="", status="error",
            message=str(exc), method_used="lisp",
        )
    finally:
        for p in (lsp_path, scr_path):
            if p:
                try:
                    os.unlink(p)
                except OSError:
                    pass


def _pick_converter(params: DwgConvertParams, console_exe: Optional[str]):
    """Parametreye göre dönüştürme fonksiyonu döner."""
    if params.method in ("gui", "oda"):
        # Bu modlar toplu çalışır — run_dwg_to_pdf içinde özel işlenir
        return None
    if params.method == "com":
        return lambda f: _convert_one_com(f, params)
    if params.method == "lisp":
        if not console_exe:
            return lambda f: ConvertFileResult(
                source=f, output="", status="error",
                message="accoreconsole.exe bulunamadı (LISP için gerekli).", method_used="lisp",
            )
        return lambda f: _convert_one_lisp(f, params, console_exe)
    if params.method == "accoreconsole":
        if not console_exe:
            return lambda f: ConvertFileResult(
                source=f, output="", status="error",
                message="accoreconsole.exe bulunamadı.", method_used="accoreconsole",
            )
        return lambda f: _convert_one(f, params, console_exe)
    # auto: COM → LISP → accoreconsole sırasıyla dene
    def _auto(f: str) -> ConvertFileResult:
        res = _convert_one_com(f, params)
        if res.status == "converted":
            return res
        if console_exe:
            logger.info("[dwg_to_pdf] COM başarısız, LISP deneniyor...")
            res = _convert_one_lisp(f, params, console_exe)
            if res.status == "converted":
                return res
            logger.info("[dwg_to_pdf] LISP başarısız, accoreconsole deneniyor...")
            return _convert_one(f, params, console_exe)
        return res
    return _auto


# ── Çekirdek fonksiyon ────────────────────────────────────────────────────────

def run_dwg_to_pdf(params: DwgConvertParams) -> DwgConvertResult:
    console_exe = find_accoreconsole(params.accoreconsole_path)

    # ODA modu — ODA File Converter ile DWG → DXF
    if params.method == "oda":
        from tools.dwg_to_pdf_oda import convert_batch_oda
        raw = convert_batch_oda(
            dwg_files=params.dwg_files,
            output_dir=params.output_dir,
        )
        results = [ConvertFileResult(**r) for r in raw]
        notifications: list[dict] = [
            {"type": "warning", "message": f"ODA hatası — {Path(r.source).name}: {r.message}"}
            for r in results if r.status == "error"
        ]
        converted = sum(1 for r in results if r.status == "converted")
        if converted:
            notifications.insert(0, {"type": "success", "message": f"{converted} DWG → DXF dönüştürüldü (ODA)."})
        return DwgConvertResult(
            total=len(results), converted=converted,
            errors=len(results) - converted,
            notifications=notifications, files=results,
            accoreconsole_used="",
        )

    # GUI modu — TrueView tek instance, sıralı çalışır
    if params.method == "gui":
        from tools.dwg_to_pdf_gui import convert_batch_gui
        raw = convert_batch_gui(
            dwg_files=params.dwg_files,
            output_dir=params.output_dir,
            printer=params.printer,
            plot_style=params.plot_style,
            orientation=params.orientation,
        )
        results = [ConvertFileResult(**r) for r in raw]
        notifications: list[dict] = [
            {"type": "warning", "message": f"Dönüştürme hatası — {Path(r.source).name}: {r.message}"}
            for r in results if r.status == "error"
        ]
        converted = sum(1 for r in results if r.status == "converted")
        if converted:
            notifications.insert(0, {"type": "success", "message": f"{converted} DWG başarıyla PDF'e dönüştürüldü (GUI)."})
        return DwgConvertResult(
            total=len(results), converted=converted,
            errors=len(results) - converted,
            notifications=notifications, files=results,
            accoreconsole_used="",
        )

    converter = _pick_converter(params, console_exe)

    results: list[ConvertFileResult] = []
    notifications: list[dict] = []

    with ThreadPoolExecutor(max_workers=params.max_workers) as pool:
        futures = {pool.submit(converter, f): f for f in params.dwg_files}
        for future in as_completed(futures):
            res: ConvertFileResult = future.result()
            results.append(res)
            if res.status == "error":
                notifications.append({
                    "type": "warning",
                    "message": f"Dönüştürme hatası — {Path(res.source).name}: {res.message}",
                })

    converted = sum(1 for r in results if r.status == "converted")
    errors    = sum(1 for r in results if r.status == "error")

    if converted > 0:
        notifications.insert(0, {
            "type": "success",
            "message": f"{converted} DWG başarıyla PDF'e dönüştürüldü.",
        })

    return DwgConvertResult(
        total=len(params.dwg_files),
        converted=converted,
        errors=errors,
        notifications=notifications,
        files=results,
        accoreconsole_used=console_exe or "",
    )


# ── LangGraph ajan aracı ──────────────────────────────────────────────────────

def _build_agent_tool():
    try:
        from langchain_core.tools import tool

        @tool
        def dwg_to_pdf(
            dwg_files: str,
            output_dir: str,
            printer: str = "DWG To PDF.pc3",
            plot_style: str = ".",
            paper_size: str = "ISO_A4_(210.00_x_297.00_MM)",
            orientation: str = "Landscape",
            layout: str = "Model",
            max_workers: int = 2,
        ) -> str:
            """
            DWG dosyalarını PDF'e dönüştürür.

            Args:
                dwg_files: Virgülle ayrılmış DWG dosya yolları
                output_dir: PDF çıktı klasörü
                printer: Plotter adı (örn. 'DWG To PDF.pc3')
                plot_style: Plot stili (örn. 'monochrome.ctb' veya '.' yok için)
                paper_size: Kağıt boyutu (örn. 'ISO_A4_(210.00_x_297.00_MM)')
                orientation: 'Landscape' veya 'Portrait'
                layout: Layout adı (örn. 'Model' veya 'Layout1')
                max_workers: Eş zamanlı dönüştürme sayısı (1-8)
            """
            files = [f.strip() for f in dwg_files.split(",") if f.strip()]
            p = DwgConvertParams(
                dwg_files=files,
                output_dir=output_dir,
                printer=printer,
                plot_style=plot_style,
                paper_size=paper_size,
                orientation=orientation,  # type: ignore
                layout=layout,
                max_workers=max_workers,
            )
            result = run_dwg_to_pdf(p)
            lines = [
                f"Toplam: {result.total} | Dönüştürüldü: {result.converted} | Hata: {result.errors}",
                f"accoreconsole: {result.accoreconsole_used or 'bulunamadı'}",
            ]
            for f in result.files:
                icon = "✓" if f.status == "converted" else "✗"
                lines.append(f"  {icon} {Path(f.source).name} → {f.output or f.message}")
            return "\n".join(lines)

        return dwg_to_pdf
    except ImportError:
        return None


AGENT_TOOL = _build_agent_tool()


# ── FastAPI router ────────────────────────────────────────────────────────────

ROUTER = APIRouter()


def _default_output_dir() -> str:
    return str(Path.home() / "Desktop" / "dwg to pdf")


@ROUTER.get("/default-output", summary="Varsayılan PDF çıktı klasörü")
def default_output_endpoint():
    return {"path": _default_output_dir()}


@ROUTER.post("/convert", summary="DWG dosyaları PDF'e dönüştür")
def convert_endpoint(req: DwgConvertParams) -> DwgConvertResult:
    if not req.output_dir:
        req = req.model_copy(update={"output_dir": _default_output_dir()})
    return run_dwg_to_pdf(req)


@ROUTER.get("/find-console", summary="accoreconsole.exe konumunu bul")
def find_console_endpoint(custom_path: Optional[str] = None):
    path = find_accoreconsole(custom_path)
    return {"found": path is not None, "path": path or ""}


@ROUTER.get("/scan-gui", summary="TrueView Plot diyaloğundaki UI kontrollerini tara")
def scan_gui_endpoint(dwg_path: Optional[str] = None):
    from tools.dwg_to_pdf_gui import scan_plot_dialog
    return scan_plot_dialog(dwg_path or "")


# ── Makro Kaydedici endpoint'leri ────────────────────────────────────────────

class _MacroStartReq(BaseModel):
    dwg_path: str = ""

@ROUTER.post("/macro/start", summary="Makro kaydını başlat")
def macro_start_endpoint(req: _MacroStartReq):
    from tools.dwg_to_pdf_recorder import start_recording
    return start_recording(req.dwg_path)


@ROUTER.get("/macro/steps", summary="Anlık kayıtlı adımları getir")
def macro_steps_endpoint():
    from tools.dwg_to_pdf_recorder import get_steps
    return {"steps": get_steps(), "count": len(get_steps())}


@ROUTER.post("/macro/stop", summary="Makro kaydını durdur ve kaydet")
def macro_stop_endpoint():
    from tools.dwg_to_pdf_recorder import stop_recording
    return stop_recording()


@ROUTER.get("/macro/load", summary="Kayıtlı makroyu yükle")
def macro_load_endpoint():
    from tools.dwg_to_pdf_recorder import load_steps
    steps = load_steps()
    return {"steps": steps, "count": len(steps)}


@ROUTER.put("/macro/steps", summary="Makro adımlarını güncelle")
def macro_update_endpoint(body: dict):
    from tools.dwg_to_pdf_recorder import save_steps
    steps = body.get("steps", [])
    save_steps(steps)
    return {"saved": len(steps)}


@ROUTER.delete("/macro/step/{step_id}", summary="Belirli adımı sil")
def macro_delete_step_endpoint(step_id: str):
    from tools.dwg_to_pdf_recorder import get_steps, save_steps
    steps = [s for s in get_steps() if s.get("id") != step_id]
    save_steps(steps)
    from tools.dwg_to_pdf_recorder import _state
    _state["steps"] = steps
    return {"deleted": step_id, "remaining": len(steps)}


class _MacroRunFolderReq(BaseModel):
    source_dir: str


@ROUTER.post("/macro/run-folder", summary="Kayıtlı makroyu klasördeki her dosya için sırayla çalıştır")
def macro_run_folder_endpoint(req: _MacroRunFolderReq):
    from tools.dwg_to_pdf_recorder import run_macro_on_folder
    return run_macro_on_folder(req.source_dir)


@ROUTER.get("/options", summary="Seçilebilir seçenekler listesi")
def options_endpoint():
    return {
        "printers": PRINTER_OPTIONS,
        "plot_styles": PLOT_STYLE_OPTIONS,
        "paper_sizes": PAPER_SIZE_OPTIONS,
        "orientations": ["Landscape", "Portrait"],
    }
