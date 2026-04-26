import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import text
from database.sql.session import engine
from database.sql.base import Base
from database.sql import models

def init_db():
    print("Tablolar oluşturuluyor...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    print("Tablolar oluşturuldu.")

if __name__ == "__main__":
    init_db()
