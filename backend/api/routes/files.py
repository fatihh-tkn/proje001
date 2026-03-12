import os
import urllib.parse

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from services.file_parser import file_parser

router = APIRouter()


@router.post("/parse")
async def parse_file(file: UploadFile = File(...)):
    """
    Kullanıcıdan bir dosya alır (Excel)
    ve içini okuyup JSON tipinde yanıt döner.
    """

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Dosya adı bulunamadı.")

    file_name = file.filename.lower()
    content_bytes = await file.read()

    if file_name.endswith(".xlsx") or file_name.endswith(".xls"):
        result = file_parser.parse_excel(content_bytes)
        return result

    else:
        raise HTTPException(status_code=400, detail="Sadece .xlsx ve .xls desteklenmektedir.")


@router.get("/tree")
async def get_file_tree(path: str):
    """
    Verilen yoldaki klasör yapısını döndürür.
    """
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Invalid path or path does not exist")

    def build_tree(current_path):
        try:
            name = os.path.basename(current_path.rstrip("/\\"))
            if not name:
                name = current_path

            if os.path.isdir(current_path):
                raw_children = os.listdir(current_path)
                children = []
                for child in raw_children:
                    child_node = build_tree(os.path.join(current_path, child))
                    if child_node:
                        children.append(child_node)
                return {
                    "id": current_path,
                    "name": name,
                    "type": "folder",
                    "children": children,
                }
            else:
                ext = name.split(".")[-1].lower() if "." in name else ""
                url = f"/api/files/download?path={urllib.parse.quote(current_path)}"
                return {
                    "id": current_path,
                    "name": name,
                    "type": "file",
                    "extension": ext,
                    "url": url,
                }
        except Exception:
            return None

    try:
        root_node = build_tree(path)
        nodes = [root_node] if root_node else []
        return {"success": True, "nodes": nodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dialog")
async def open_folder_dialog():
    """
    Yerel makinede (Windows) klasör seçici penceresi açar ve yolu döner.
    Tkinter'ı izole bir subprocess içinde çalıştırır (ASGI donması engellenir).
    """
    import asyncio
    import subprocess
    import sys

    def _pick_folder():
        script = (
            "import tkinter as tk\n"
            "from tkinter import filedialog\n"
            "root = tk.Tk()\n"
            "root.withdraw()\n"
            "root.attributes('-topmost', True)\n"
            "root.focus_force()\n"
            "res = filedialog.askdirectory(parent=root, title='Klasoru Secin')\n"
            "root.destroy()\n"
            "print(res if res else '')\n"
        )
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            print("Dialog subprocess hata:", result.stderr)
            return ""
        return result.stdout.strip()

    try:
        loop = asyncio.get_event_loop()
        folder_path = await loop.run_in_executor(None, _pick_folder)
        return {"path": folder_path}
    except Exception as e:
        print("open_folder_dialog Exception:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dialog_file")
async def open_file_dialog():
    """
    Yerel makinede (Windows) dosya seçici penceresi açar ve seçilen dosyaların yollarını döner.
    Tkinter'ı izole bir subprocess içinde çalıştırır (ASGI donması engellenir).
    """
    import asyncio
    import subprocess
    import sys

    def _pick_files():
        script = (
            "import tkinter as tk\n"
            "from tkinter import filedialog\n"
            "import sys\n"
            "root = tk.Tk()\n"
            "root.withdraw()\n"
            "root.attributes('-topmost', True)\n"
            "root.focus_force()\n"
            "res = filedialog.askopenfilenames(\n"
            "    parent=root, title='Dosyalari Secin',\n"
            "    filetypes=[('Desteklenen Dosyalar', '*.pdf *.bpmn *.xlsx *.xls *.txt *.docx'), "
            "('Tum Dosyalar', '*.*')]\n"
            ")\n"
            "root.destroy()\n"
            "sys.stdout.write('||'.join(res) if res else '')\n"
        )
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            print("File dialog subprocess hata:", result.stderr)
            return []
        output = result.stdout.strip()
        if output:
            return [p for p in output.split("||") if p]
        return []

    try:
        loop = asyncio.get_event_loop()
        file_paths = await loop.run_in_executor(None, _pick_files)
        return {"paths": file_paths}
    except Exception as e:
        print("open_file_dialog Exception:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_file(path: str):
    """
    Verilen dosya yolundaki dosyayı indirir veya inline olarak gönderir.
    """
    if not path or not os.path.exists(path) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")

    name = os.path.basename(path)
    return FileResponse(
        path=path,
        filename=name,
        media_type="application/octet-stream",
        content_disposition_type="inline",
    )
