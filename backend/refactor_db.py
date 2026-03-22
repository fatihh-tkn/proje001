import os
import shutil
import glob

def refactor():
    base = os.path.dirname(os.path.abspath(__file__))
    db_dir = os.path.join(base, "database")
    sql_dir = os.path.join(db_dir, "sql")
    vector_dir = os.path.join(db_dir, "vector")
    graph_dir = os.path.join(db_dir, "graph")

    # Create directories
    os.makedirs(sql_dir, exist_ok=True)
    os.makedirs(vector_dir, exist_ok=True)
    os.makedirs(graph_dir, exist_ok=True)

    # 1. Move SQL files
    sql_files = ["base.py", "init_db.py", "models.py", "session.py"]
    for f in sql_files:
        src = os.path.join(db_dir, f)
        dst = os.path.join(sql_dir, f)
        if os.path.exists(src):
            shutil.move(src, dst)
            
    repos_src = os.path.join(db_dir, "repositories")
    repos_dst = os.path.join(sql_dir, "repositories")
    if os.path.exists(repos_src):
        shutil.move(repos_src, repos_dst)

    # 2. Move Vector files
    svcs = os.path.join(base, "services")
    if os.path.exists(os.path.join(svcs, "vector_db_service.py")):
        shutil.move(os.path.join(svcs, "vector_db_service.py"), os.path.join(vector_dir, "provider.py"))
    if os.path.exists(os.path.join(svcs, "chroma_service.py")):
        shutil.move(os.path.join(svcs, "chroma_service.py"), os.path.join(vector_dir, "chroma_db.py"))

    # 3. Move Graph files
    if os.path.exists(os.path.join(svcs, "graph_service.py")):
        shutil.move(os.path.join(svcs, "graph_service.py"), os.path.join(graph_dir, "networkx_db.py"))

    # Import replacements
    replacements = {
        "from database.sql.models": "from database.sql.models",
        "import database.sql.models": "import database.sql.models",
        "from database.sql.session": "from database.sql.session",
        "import database.sql.session": "import database.sql.session",
        "from database.sql.base": "from database.sql.base",
        "import database.sql.base": "import database.sql.base",
        "from database.sql.init_db": "from database.sql.init_db",
        "import database.sql.init_db": "import database.sql.init_db",
        "from database.sql.repositories": "from database.sql.repositories",
        "import database.sql.repositories": "import database.sql.repositories",
        "from database.vector.provider": "from database.vector.provider",
        "import database.vector.provider": "import database.vector.provider",
        "from database.vector.chroma_db": "from database.vector.chroma_db",
        "import database.vector.chroma_db": "import database.vector.chroma_db",
        "from database.graph.networkx_db": "from database.graph.networkx_db",
        "import database.graph.networkx_db": "import database.graph.networkx_db",
        # Fix inner graph_service naming if we missed something
        "from database.vector.provider import VectorDBProvider": "from database.vector.provider import VectorDBProvider"
    }

    # Iterate all internal python files
    for root, dirs, files in os.walk(base):
        if "venv" in root or "__pycache__" in root or ".git" in root:
            continue
        for f in files:
            if f.endswith(".py"):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8") as f_in:
                    content = f_in.read()
                
                new_content = content
                for old, new in replacements.items():
                    new_content = new_content.replace(old, new)

                if new_content != content:
                    with open(path, "w", encoding="utf-8") as f_out:
                        f_out.write(new_content)
                        print(f"Updated imports in: {path}")

    # Add init files
    for d in [sql_dir, vector_dir, graph_dir]:
        init_path = os.path.join(d, "__init__.py")
        if not os.path.exists(init_path):
            with open(init_path, "w", encoding="utf-8") as f:
                f.write("")

    print("Refactoring completed.")

if __name__ == "__main__":
    refactor()
