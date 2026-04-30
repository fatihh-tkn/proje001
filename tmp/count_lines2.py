import os

exts = {".py", ".js", ".jsx", ".css", ".html"}
# Dir names to completely skip
ignore_names = {"node_modules", ".git", "dist", "tmp", ".agents", ".vscode", ".claude", ".venv", "__pycache__", ".pytest_cache", "data", "archive_uploads"}

counts = {"backend": 0, "frontend": 0, "other": 0}

total_lines = 0
total_files = 0
blank_lines = 0

for root, dirs, files in os.walk("."):
    # Filter out directories we don't want to scan
    dirs[:] = [d for d in dirs if d not in ignore_names and not d.startswith(".") and "n8n" not in d.lower() and "chroma" not in d.lower()]
    
    for file in files:
        if any(file.endswith(ext) for ext in exts) and not file.endswith(".min.js") and not file.endswith("-lock.json"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    file_lines = 0
                    for line in f:
                        file_lines += 1
                        if not line.strip():
                            blank_lines += 1
                    
                    total_lines += file_lines
                    total_files += 1
                    
                    # Group counts
                    npath = path.replace("\\", "/")
                    if "/backend/" in npath or npath.startswith("./backend/"):
                        counts["backend"] += file_lines
                    elif "/src/" in npath or npath.startswith("./src/"):
                        counts["frontend"] += file_lines
                    else:
                        counts["other"] += file_lines
            except Exception:
                pass

print(f"Toplam Kod Dosyasi: {total_files}")
print(f"Toplam Satir: {total_lines} (Bos satirlar: {blank_lines})")
print(f"Gercek Kod Satiri (Dolular): {total_lines - blank_lines}")
print("-" * 30)
print(f"Backend (Python): {counts['backend']} satir")
print(f"Frontend (React/JS/CSS vb.): {counts['frontend']} satir")
print(f"Diger dosyalar (Kök dizin vb.): {counts['other']} satir")
