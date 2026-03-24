import sqlite3
import os

db_path = os.path.join("backend", "app.db")
if not os.path.exists(db_path):
    print(f"Database file not found: {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM vektor_parcalari;")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
        
    except sqlite3.Error as e:
        print(f"Sqlite3 error: {e}")
    finally:
        if conn:
            conn.close()
