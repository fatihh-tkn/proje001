"""
database/base.py
────────────────
Tüm ORM model sınıflarının miras aldığı tek Base nesnesi.
Alembic bu dosyayı import ederek tüm tabloları keşfeder.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Tüm modeller bu Base'den türer:
        class User(Base): ...
    """
    pass
