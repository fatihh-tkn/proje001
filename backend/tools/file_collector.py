"""
tools/file_collector.py
────────────────────────────────────────────────────────────────
Dosya Toplama Aracı

Verilen kaynak klasörü (ve alt klasörleri) gezer; uzantı, isim
deseni ve tarih aralığına göre filtrelenmiş dosyaları hedef
klasöre kopyalar.

Kullanım şekilleri:
  1. Doğrudan Python  → run_file_collector(params)
  2. LangGraph ajanı  → AGENT_TOOL  (tools/__init__.py üzerinden)
  3. HTTP endpoint    → ROUTER       (tools/__init__.py üzerinden)
"""

from __future__ import annotations

import fnmatch
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

# ── Pydantic şemalar ──────────────────────────────────────────────────────────

class FileCollectParams(BaseModel):
    source_dir: str = Field(..., description="Taranacak kaynak klasör yolu")
    target_dir: str = Field(..., description="Kopyalanacak hedef klasör yolu")
    extensions: list[str] = Field(
        default_factory=list,
        description="Uzantı filtresi, örn. ['.pdf', '.dwg']. Boş = hepsi.",
    )
    name_pattern: Optional[str] = Field(
        None,
        description="Glob isim deseni, örn. 'proje_*' veya '*_v2.*'",
    )
    date_from: Optional[datetime] = Field(
        None,
        description="Değiştirilme tarihi başlangıcı (dahil). ISO 8601 formatı.",
    )
    date_to: Optional[datetime] = Field(
        None,
        description="Değiştirilme tarihi sonu (dahil). ISO 8601 formatı.",
    )
    recursive: bool = Field(True, description="Alt klasörlere de in")
    dry_run: bool = Field(False, description="True ise kopyalama yapma, sadece önizle")
    overwrite: bool = Field(False, description="Hedefte aynı isim varsa üzerine yaz")


class FileCollectResult(BaseModel):
    total_found: int
    total_copied: int
    total_skipped: int
    total_error: int
    total_size_bytes: int
    files: list[dict]
    errors: list[str]
    dry_run: bool


# ── Çekirdek fonksiyon ────────────────────────────────────────────────────────

def run_file_collector(params: FileCollectParams) -> FileCollectResult:
    """
    Dosyaları tarar, filtreler ve kopyalar.
    dry_run=True ise yalnızca önizleme döner, hiçbir şey yazmaz.
    """
    src = Path(params.source_dir)
    dst = Path(params.target_dir)

    errors: list[str] = []
    files_out: list[dict] = []
    total_size = 0

    if not src.exists():
        return FileCollectResult(
            total_found=0, total_copied=0, total_skipped=0,
            total_error=1, total_size_bytes=0, files=[],
            errors=[f"Kaynak klasör bulunamadı: {src}"],
            dry_run=params.dry_run,
        )

    # Uzantıları normalize et (.pdf, .DWG → .pdf, .dwg)
    exts = {e.lower() if e.startswith(".") else f".{e.lower()}"
            for e in params.extensions}

    # Tarih aralığını UTC'ye sabitle
    def _ts(dt: Optional[datetime]) -> Optional[float]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    ts_from = _ts(params.date_from)
    ts_to   = _ts(params.date_to)

    walker = os.walk(src) if params.recursive else [(str(src), [], os.listdir(src))]

    for dirpath, _dirs, filenames in walker:
        for fname in filenames:
            full_src = Path(dirpath) / fname
            if not full_src.is_file():
                continue

            ext = full_src.suffix.lower()

            # Uzantı filtresi
            if exts and ext not in exts:
                continue

            # İsim deseni filtresi
            if params.name_pattern and not fnmatch.fnmatch(fname, params.name_pattern):
                continue

            # Tarih filtresi
            try:
                mtime = full_src.stat().st_mtime
            except OSError:
                errors.append(f"stat hatası: {full_src}")
                continue

            if ts_from is not None and mtime < ts_from:
                continue
            if ts_to is not None and mtime > ts_to:
                continue

            # Hedef yol: kaynak içindeki göreli yapıyı koru
            rel = full_src.relative_to(src)
            full_dst = dst / rel
            size = full_src.stat().st_size

            entry: dict = {
                "source": str(full_src),
                "target": str(full_dst),
                "name": fname,
                "ext": ext,
                "size_bytes": size,
                "modified": datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat(),
                "status": "preview",
            }

            if not params.dry_run:
                if full_dst.exists() and not params.overwrite:
                    entry["status"] = "skipped"
                else:
                    try:
                        full_dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(full_src, full_dst)
                        entry["status"] = "copied"
                        total_size += size
                    except Exception as exc:
                        entry["status"] = "error"
                        errors.append(f"{full_src}: {exc}")
            else:
                total_size += size

            files_out.append(entry)

    copied  = sum(1 for f in files_out if f["status"] == "copied")
    skipped = sum(1 for f in files_out if f["status"] == "skipped")
    errored = sum(1 for f in files_out if f["status"] == "error")

    return FileCollectResult(
        total_found=len(files_out),
        total_copied=copied,
        total_skipped=skipped,
        total_error=errored + len(errors),
        total_size_bytes=total_size,
        files=files_out,
        errors=errors,
        dry_run=params.dry_run,
    )


# ── LangGraph / LangChain ajan aracı ─────────────────────────────────────────

def _build_agent_tool():
    """
    LangChain @tool tanımı. Import zamanında langchain yüklememek için
    lazy wrap kullanılır — araç kayıt defterine eklendiğinde çalışır.
    """
    try:
        from langchain_core.tools import tool

        @tool
        def file_collector(
            source_dir: str,
            target_dir: str,
            extensions: str = "",
            name_pattern: str = "",
            date_from: str = "",
            date_to: str = "",
            recursive: bool = True,
            dry_run: bool = True,
            overwrite: bool = False,
        ) -> str:
            """
            Belirtilen klasördeki dosyaları filtreler ve hedef klasöre kopyalar.

            Args:
                source_dir: Taranacak kaynak klasör yolu
                target_dir: Kopyalanacak hedef klasör yolu
                extensions: Virgülle ayrılmış uzantı listesi, örn. '.pdf,.dwg,.step'
                name_pattern: Glob isim deseni, örn. 'proje_*'
                date_from: ISO tarih başlangıcı, örn. '2024-01-01'
                date_to: ISO tarih sonu, örn. '2024-12-31'
                recursive: Alt klasörlere de in (varsayılan: True)
                dry_run: Sadece önizle, kopyalama yapma (varsayılan: True)
                overwrite: Mevcut dosyaların üzerine yaz (varsayılan: False)
            """
            exts = [e.strip() for e in extensions.split(",") if e.strip()]

            def _parse_dt(s: str) -> Optional[datetime]:
                if not s:
                    return None
                try:
                    return datetime.fromisoformat(s)
                except ValueError:
                    return None

            params = FileCollectParams(
                source_dir=source_dir,
                target_dir=target_dir,
                extensions=exts,
                name_pattern=name_pattern or None,
                date_from=_parse_dt(date_from),
                date_to=_parse_dt(date_to),
                recursive=recursive,
                dry_run=dry_run,
                overwrite=overwrite,
            )
            result = run_file_collector(params)
            mode = "ÖNİZLEME" if result.dry_run else "KOPYALAMA"
            lines = [
                f"[{mode}] Bulunan: {result.total_found} | "
                f"Kopyalanan: {result.total_copied} | "
                f"Atlanan: {result.total_skipped} | "
                f"Hata: {result.total_error}",
            ]
            for f in result.files[:20]:
                lines.append(f"  {f['status'].upper():8s} {f['name']}  ({f['size_bytes']:,} B)")
            if len(result.files) > 20:
                lines.append(f"  ... ve {len(result.files) - 20} dosya daha")
            if result.errors:
                lines.append("Hatalar:")
                lines.extend(f"  - {e}" for e in result.errors[:5])
            return "\n".join(lines)

        return file_collector

    except ImportError:
        return None


AGENT_TOOL = _build_agent_tool()


# ── FastAPI router (HTTP erişimi için) ────────────────────────────────────────

ROUTER = APIRouter()


def _default_target_dir() -> str:
    return str(Path.home() / "Desktop" / "Teknik Çizim")


@ROUTER.get("/default-target", summary="Varsayılan hedef klasör")
def default_target_endpoint():
    return {"path": _default_target_dir()}


@ROUTER.post("/collect", summary="Dosya topla ve kopyala")
def collect_endpoint(req: FileCollectParams) -> FileCollectResult:
    """
    Verilen parametrelerle dosyaları tarar ve kopyalar.
    dry_run=True ile önce önizleme yapılması önerilir.
    """
    if not req.target_dir:
        req = req.model_copy(update={"target_dir": _default_target_dir()})
    return run_file_collector(req)


@ROUTER.get("/browse", summary="Klasör seçici (OS diyaloğu)")
def browse_folder():
    """Yerel OS klasör seçici açar, seçilen yolu döner."""
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        pass
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askdirectory(title="Klasör Seç")
        root.destroy()
        return {"path": path or ""}
    except Exception as exc:
        return {"path": "", "error": str(exc)}
