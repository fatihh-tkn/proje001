import sqlite3
import os

db_path = os.path.join("backend", "app.db")
if not os.path.exists(db_path):
    print("Veritabanı bulunamadı.")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Tüm tabloların içeriğini sil
        cursor.execute("DELETE FROM bilgi_iliskileri;")
        cursor.execute("DELETE FROM vektor_parcalari;")
        cursor.execute("DELETE FROM belgeler;")
        cursor.execute("DELETE FROM sohbet_mesajlari;")
        cursor.execute("DELETE FROM sohbet_oturumlari;")
        
        conn.commit()
        print("Tüm belgeler, vektör parçaları ve ilişkiler başarıyla temizlendi!")
        
    except sqlite3.Error as e:
        print(f"Sqlite hatası: {e}")
    finally:
        if conn:
            conn.close()
