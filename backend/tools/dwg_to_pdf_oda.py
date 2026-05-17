"""
tools/dwg_to_pdf_oda.py
────────────────────────────────────────────────────────────────
ODA File Converter ile DWG → DXF dönüşümü.

ODA File Converter doğrudan PDF üretemiyor; çıktı DXF formatındadır.
Hızlı, kararlı, TrueView veya AutoCAD gerektirmiyor.

İndirme: https://www.opendesign.com/guestfiles/oda_file_converter
"""

from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_ODA_SEARCH_PATHS = [
    r"C:\Program Files\ODA\ODAFileConverter 27.1.0\ODAFileConverter.exe",
    r"C:\Program Files\ODA\ODAFileConverter 26.6.0\ODAFileConverter.exe",
    r"C:\Program Files\ODA\ODAFileConverter 26.3.0\ODAFileConverter.exe",
    r"C:\Program Files\ODA\ODAFileConverter 25.12.0\ODAFileConverter.exe",
    r"C:\Program Files\ODA\OdaFileConverter 22.12\OdaFileConverter.exe",
    r"C:\Program Files\ODA\OdaFileConverter\OdaFileConverter.exe",
]


def find_oda_exe() -> Optional[str]:
    for p in _ODA_SEARCH_PATHS:
        if Path(p).is_file():
            return p
    oda_root = Path(r"C:\Program Files\ODA")
    if oda_root.is_dir():
        for folder in sorted(oda_root.iterdir(), reverse=True):
            for name in ("ODAFileConverter.exe", "OdaFileConverter.exe"):
                exe = folder / name
                if exe.is_file():
                    return str(exe)
    return None


def _dxf_to_pdf(dxf_path: str, pdf_path: str) -> tuple[bool, str]:
    """ezdxf + matplotlib ile DXF → PDF (siyah-beyaz, extents'e zoom)."""
    try:
        import ezdxf
        from ezdxf.addons.drawing import RenderContext, Frontend
        from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()

        # Render config — siyah-beyaz, beyaz arka plan
        try:
            from ezdxf.addons.drawing.config import (
                Configuration, ColorPolicy, BackgroundPolicy, LineweightPolicy
            )
            config = Configuration.defaults().with_changes(
                color_policy=ColorPolicy.BLACK,
                background_policy=BackgroundPolicy.WHITE,
                lineweight_policy=LineweightPolicy.ABSOLUTE,
            )
        except ImportError:
            config = None  # eski ezdxf sürümü — varsayılan ayar

        fig = plt.figure(figsize=(16.54, 11.69))  # A3 landscape
        ax  = fig.add_axes([0, 0, 1, 1])
        ax.set_axis_off()
        ax.set_facecolor("white")
        fig.patch.set_facecolor("white")

        ctx = RenderContext(doc)
        out = MatplotlibBackend(ax)

        if config:
            Frontend(ctx, out, config=config).draw_layout(msp, finalize=True)
        else:
            Frontend(ctx, out).draw_layout(msp, finalize=True)

        # Extents'e sıkı zoom — boş beyaz alanı kaldır
        ax.autoscale_view()
        ax.set_aspect("equal")

        fig.savefig(pdf_path, format="pdf", dpi=200,
                    bbox_inches="tight", pad_inches=0.05,
                    facecolor="white")
        plt.close(fig)
        return True, "ezdxf ile PDF oluşturuldu"
    except ImportError:
        return False, "ezdxf kurulu değil — 'pip install ezdxf[draw]' çalıştırın"
    except Exception as exc:
        return False, f"ezdxf hatası: {exc}"


def convert_batch_oda(
    dwg_files: list[str],
    output_dir: str,
    version: str = "ACAD2018",
    recurse: bool = False,
    audit: bool = True,
) -> list[dict]:
    """
    ODA File Converter: DWG → DXF, ardından ezdxf: DXF → PDF.
    PDF oluşturulamazsa DXF çıktısını döner.
    """
    oda_exe = find_oda_exe()
    if not oda_exe:
        return [{
            "source": f, "output": "", "status": "error",
            "message": "ODA File Converter bulunamadı. "
                       "https://www.opendesign.com/guestfiles/oda_file_converter adresinden indirin.",
            "method_used": "oda",
        } for f in dwg_files]

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # ODA klasör bazlı çalışır; dosyaları kaynak dizinlerine göre grupla
    groups: dict[str, list[Path]] = {}
    for f in dwg_files:
        p = Path(f)
        groups.setdefault(str(p.parent), []).append(p)

    results: list[dict] = []

    for src_dir_str, files in groups.items():
        # Geçici input klasörü — sadece dönüştürülecek dosyaları içerir
        tmp_in  = tempfile.mkdtemp()
        tmp_out = tempfile.mkdtemp()
        try:
            for fp in files:
                shutil.copy2(fp, tmp_in)

            cmd = [
                oda_exe,
                tmp_in,
                tmp_out,
                version,
                "DXF",
                "1" if recurse else "0",
                "1" if audit else "0",
            ]
            r = subprocess.run(cmd, capture_output=True, timeout=120)
            logger.info("[ODA] exit=%d, files=%d", r.returncode, len(files))

            for fp in files:
                dxf_name = fp.stem + ".dxf"
                tmp_dxf  = Path(tmp_out) / dxf_name
                dst_dxf  = out_dir / dxf_name

                if tmp_dxf.is_file():
                    # DXF'i her zaman çıktı klasörüne kaydet
                    shutil.copy2(str(tmp_dxf), str(dst_dxf))

                    # DXF → PDF (ezdxf)
                    pdf_path = str(out_dir / (fp.stem + ".pdf"))
                    ok, msg = _dxf_to_pdf(str(tmp_dxf), pdf_path)
                    if ok:
                        results.append({
                            "source": str(fp),
                            "output": pdf_path,
                            "status": "converted",
                            "message": f"PDF + DXF kaydedildi → {fp.stem}.pdf / {fp.stem}.dxf",
                            "method_used": "oda",
                        })
                    else:
                        results.append({
                            "source": str(fp),
                            "output": str(dst_dxf),
                            "status": "converted",
                            "message": f"DXF kaydedildi. PDF adımı başarısız: {msg}",
                            "method_used": "oda",
                        })
                else:
                    results.append({
                        "source": str(fp),
                        "output": "",
                        "status": "error",
                        "message": f"DXF çıktısı oluşmadı (ODA exit={r.returncode})",
                        "method_used": "oda",
                    })
        except subprocess.TimeoutExpired:
            for fp in files:
                results.append({
                    "source": str(fp), "output": "", "status": "error",
                    "message": "Zaman aşımı (120s)", "method_used": "oda",
                })
        except Exception as exc:
            for fp in files:
                results.append({
                    "source": str(fp), "output": "", "status": "error",
                    "message": str(exc), "method_used": "oda",
                })
        finally:
            shutil.rmtree(tmp_in,  ignore_errors=True)
            shutil.rmtree(tmp_out, ignore_errors=True)

    return results
