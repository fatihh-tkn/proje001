import sqlite3
import os

db_path = os.path.join("backend", "app.db")
if not os.path.exists(db_path):
    print(f"Database file not found: {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT count(*) FROM vektor_parcalari;")
        vektor_parcalari_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT count(*) FROM bilgi_iliskileri;")
        bilgi_iliskileri_count = cursor.fetchone()[0]
        
        print(f"Vektör Parçaları Sayısı: {vektor_parcalari_count}")
        print(f"Bilgi İlişkileri Sayısı: {bilgi_iliskileri_count}")
        
    except sqlite3.Error as e:
        print(f"Sqlite3 error: {e}")
    finally:
        if conn:
            conn.close()
