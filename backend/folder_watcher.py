"""
backend/folder_watcher.py
──────────────────────────────────────────────────────────────────────────────
Belirtilen klasörü izler; yeni dosya gelince /api/archive/direct-upload'a
asyncio.Queue + worker havuzu aracılığıyla yükler.

Başlatma:
    SYNC_FOLDER="C:/izle" venv/Scripts/python.exe folder_watcher.py

Env değişkenleri:
    SYNC_FOLDER        Izlenecek klasor yolu    (varsayilan: ./watched_folder)
    API_BASE           Backend adresi           (varsayilan: http://127.0.0.1:8000)
    WATCH_MAX_WORKERS  Es zamanli upload sayisi  (varsayilan: 3)
    WATCH_WRITE_DELAY  Dosya yazilma bekleme sn  (varsayilan: 1.0)
"""

import asyncio
import logging
import mimetypes
import os
from pathlib import Path

import aiohttp
from watchdog.events import FileCreatedEvent, FileMovedEvent, FileSystemEventHandler
from watchdog.observers import Observer

# ── Konfigürasyon ──────────────────────────────────────────────────────────────
SYNC_FOLDER  = Path(os.getenv("SYNC_FOLDER", "./watched_folder"))
API_BASE     = os.getenv("API_BASE", "http://127.0.0.1:8000")
MAX_WORKERS  = int(os.getenv("WATCH_MAX_WORKERS", "3"))
WRITE_DELAY  = float(os.getenv("WATCH_WRITE_DELAY", "1.0"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("folder_watcher")


# ── Watchdog handler ───────────────────────────────────────────────────────────
class NewFileHandler(FileSystemEventHandler):
    """Watchdog thread'inden asyncio queue'ya dosya yolu atar."""

    def __init__(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue):
        self._loop  = loop
        self._queue = queue

    def _enqueue(self, path: str) -> None:
        self._loop.call_soon_threadsafe(self._queue.put_nowait, Path(path))

    def on_created(self, event: FileCreatedEvent) -> None:
        if not event.is_directory:
            self._enqueue(event.src_path)

    def on_moved(self, event: FileMovedEvent) -> None:
        # Başka yerden bu klasöre taşınan dosyaları da yakala
        if not event.is_directory:
            self._enqueue(event.dest_path)


# ── Upload işçisi ──────────────────────────────────────────────────────────────
async def _worker(worker_id: int, queue: asyncio.Queue, session: aiohttp.ClientSession) -> None:
    while True:
        path: Path = await queue.get()
        try:
            await _upload(path, session, worker_id)
        except Exception as exc:
            log.error("Worker-%d | hata: %s | dosya: %s", worker_id, exc, path)
        finally:
            queue.task_done()


async def _upload(path: Path, session: aiohttp.ClientSession, worker_id: int) -> None:
    # Dosyanın tamamen yazılmasını bekle
    await asyncio.sleep(WRITE_DELAY)

    if not path.exists():
        log.warning("Worker-%d | dosya bulunamadı (silindi?): %s", worker_id, path)
        return

    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"

    try:
        # CAD/teknik dosya uzantıları için kategori belirt
        _CAD_EXTS = {".dwg", ".dxf", ".stp", ".step", ".awg",
                     ".png", ".jpg", ".jpeg", ".pdf"}
        kategori = "teknik_resim" if path.suffix.lower() in _CAD_EXTS else None

        with path.open("rb") as fh:
            data = aiohttp.FormData()
            data.add_field("file", fh, filename=path.name, content_type=mime)
            if kategori:
                data.add_field("kategori", kategori)

            async with session.post(
                f"{API_BASE}/api/archive/direct-upload",
                data=data,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as resp:
                if resp.status == 200:
                    log.info("Worker-%d | ✓ yüklendi: %s", worker_id, path.name)
                else:
                    body = await resp.text()
                    log.warning(
                        "Worker-%d | ✗ %d — %s | %s",
                        worker_id, resp.status, path.name, body[:200],
                    )
    except OSError as exc:
        log.error("Worker-%d | dosya okunamadı: %s | %s", worker_id, path, exc)


# ── Ana döngü ──────────────────────────────────────────────────────────────────
async def run() -> None:
    SYNC_FOLDER.mkdir(parents=True, exist_ok=True)
    loop  = asyncio.get_running_loop()
    queue: asyncio.Queue[Path] = asyncio.Queue()

    handler  = NewFileHandler(loop, queue)
    observer = Observer()
    observer.schedule(handler, str(SYNC_FOLDER), recursive=True)
    observer.start()

    log.info("Klasör izleniyor : %s", SYNC_FOLDER.resolve())
    log.info("Worker sayısı    : %d", MAX_WORKERS)
    log.info("API hedefi       : %s", API_BASE)

    async with aiohttp.ClientSession() as session:
        workers = [
            asyncio.create_task(_worker(i + 1, queue, session))
            for i in range(MAX_WORKERS)
        ]
        try:
            await asyncio.Event().wait()  # Ctrl+C'ye kadar çalış
        except asyncio.CancelledError:
            pass
        finally:
            observer.stop()
            observer.join()
            for w in workers:
                w.cancel()
            await asyncio.gather(*workers, return_exceptions=True)
            log.info("Watcher durduruldu.")


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
