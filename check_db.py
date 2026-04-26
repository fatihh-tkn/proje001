import sqlite3
import os

db_path = 'backend/app.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in app.db:")
for t in tables:
    print(f"- {t[0]}")

# Check for agents/models
actual_tables = ['ai_modelleri', 'ai_agents', 'sistem_ayarlari']
for table in actual_tables:
    if (table,) in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"Count in {table}: {count}")
    else:
        print(f"Table {table} MISSING")

conn.close()
