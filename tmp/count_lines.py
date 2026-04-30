import os

exts = {".py", ".js", ".jsx", ".css", ".html"}
ignore_dirs = {"node_modules", ".git", "dist", "tmp", ".agents", ".vscode", ".claude", "backend/.venv", "backend/data"}

counts = {"backend": 0, "frontend": 0, "other": 0}

total_lines = 0
total_files = 0
blank_lines = 0

for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in ignore_dirs and "n8n" not in d.lower() and "archive_uploads" not in d and "chroma" not in d.lower()]
    for file in files:
        if any(file.endswith(ext) for ext in exts) and not file.endswith(".min.js"):
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
                    
                    if "backend" in path.replace("\\", "/"):
                        counts["backend"] += file_lines
                    elif "src" in path.replace("\\", "/"):
                        counts["frontend"] += file_lines
                    else:
                        counts["other"] += file_lines
            except Exception:
                pass

print(f"Toplam Dosya Sayısı: {total_files}")
print(f"Toplam Satır: {total_lines} (Bunun {blank_lines} kadarı boş satır)")
print("-" * 30)
print(f"Backend (Python): {counts['backend']} satır")
print(f"Frontend (React/JS/CSS): {counts['frontend']} satır")
print(f"Diğer Yapılandırma Dosyaları: {counts['other']} satır")
