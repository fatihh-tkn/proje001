import os

counts = {}

for root, dirs, files in os.walk("backend"):
    if ".venv" in root or "__pycache__" in root:
        continue
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    lines = sum(1 for _ in f)
                    top_level = root.split(os.sep)[1] if len(root.split(os.sep)) > 1 else 'root'
                    counts[top_level] = counts.get(top_level, 0) + lines
            except Exception:
                pass

for k, v in sorted(counts.items(), key=lambda item: item[1], reverse=True):
    print(f"{k}: {v}")
