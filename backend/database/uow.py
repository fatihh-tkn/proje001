"""
backend/database/uow.py
-----------------------
Unit of Work (UoW) şablonu. Veritabanı işlemlerinin "ya hepsi ya hiçbiri" 
prensibiyle (Atomik) işlenmesini sağlar. Ayrıca SQL harici (VektörDB vb.) 
dış sistemlerde yapılan eylemleri geri alabilmek için "Compensating Transactions" 
(Telafi İşlemleri) destekler.
"""

import logging
from typing import Callable, List
from database.sql.session import SessionLocal

logger = logging.getLogger("uow")

class UnitOfWork:
    """
    Kullanım:
        with UnitOfWork() as uow:
            db = uow.session
            db.add(yeni_kayit)
            
            # Vektör DB (Dış Sistem) kaydı yapıldığında, SQL hatası olursa 
            # geri alması için telafi fonksiyonu kaydet:
            uow.register_compensation(lambda: vector_db.delete(yeni_kayit.id))
            
            # (hata yoksa block sonunda SQL otomatik commitlenir)
    """

    def __init__(self):
        self.session = None
        self._on_rollback_callbacks: List[Callable] = []
        self._on_commit_callbacks: List[Callable] = []

    def __enter__(self):
        self.session = SessionLocal()
        self._on_rollback_callbacks = []
        self._on_commit_callbacks = []
        return self

    def __exit__(self, exc_type, exc_val, traceback):
        # Herhangi bir Python veya SQLAlchemy Exception'ı fırlatıldıysa
        if exc_type is not None:
            self.rollback()
        else:
            try:
                self.commit()
            except Exception as e:
                # SQL Commit sırasında IntegrityError veya OperationalError alınırsa
                self.rollback()
                raise e
                
        # Session işlemler tamamlanınca kapatılır (Connection havuza döner)
        if self.session:
            self.session.close()

    def commit(self):
        """SQL işlemlerini topluca DB'ye yazar (Commit)."""
        if self.session:
            # Commit esnasında flush tetiklenir, DB'ye yazılır. Hata çıkarsa üstte yakalanır.
            self.session.commit()
            
            # Commit tam olarak başarılı olduysa, tetiklenmesi gereken yan-etkiler çalıştırılır.
            for callback in self._on_commit_callbacks:
                try:
                    callback()
                except Exception as e:
                    logger.error(f"UoW on_commit yan-etki hatası: {e}")

    def rollback(self):
        """
        1. SQL'deki henüz commitlenmemiş memory datalarını geri alır.
        2. Dış sistemlere (Chroma, Disk vb.) yapılmış ama geri alınması gereken
           ön-geçici kayıtları siler (Compensating Transaction).
        """
        if self.session:
            self.session.rollback()
            
        # Telafi (Compensation) zincirini ters sırayla çalıştır
        # (Son yapılan işlemi ilk geri al)
        for callback in reversed(self._on_rollback_callbacks):
            try:
                callback()
            except Exception as e:
                logger.error(f"UoW on_rollback (Kompanzasyon) hatası: {e}")

    def register_compensation(self, func: Callable):
        """
        Eğer block bir hatayla (Exception) veya SQL kural ihlaliyle sonlanırsa
        otomatik çalıştırılarak dış durumu temizleyen fonksiyon.
        """
        self._on_rollback_callbacks.append(func)

    def register_after_commit(self, func: Callable):
        """
        Eğer SQL commit %100 başarılı olursa (ve transaction kapanırsa) 
        otomatik çalıştırılarak dış sistemleri güncelleyen fonksiyon.
        """
        self._on_commit_callbacks.append(func)
