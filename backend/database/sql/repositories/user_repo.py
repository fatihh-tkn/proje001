"""
database/repositories/user_repo.py
────────────────────────────────────
User, Role ve UserRole için veri erişim katmanı.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from database.sql.models import Rol, Kullanici, KullaniciRol

# Backward compatibility
Role = Rol
User = Kullanici
UserRole = KullaniciRol


class UserRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Kullanıcı işlemleri ───────────────────────────────────────

    def create(
        self,
        email: str,
        full_name: str,
        hashed_password: Optional[str] = None,
        is_superuser: bool = False,
        meta: Optional[dict] = None,
    ) -> Kullanici:
        user = Kullanici(
            eposta=email,
            tam_ad=full_name,
            sifre_karma=hashed_password,
            is_superuser=is_superuser,
            meta=meta or {},
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: str) -> Optional[Kullanici]:
        return self.db.get(Kullanici, user_id)

    def get_by_email(self, email: str) -> Optional[Kullanici]:
        stmt = select(Kullanici).where(Kullanici.eposta == email)
        return self.db.scalar(stmt)

    def list_all(self, limit: int = 100) -> list[Kullanici]:
        stmt = select(Kullanici).order_by(Kullanici.olusturulma_tarihi).limit(limit)
        return list(self.db.scalars(stmt).all())

    def update(self, user_id: str, **kwargs) -> Optional[Kullanici]:
        user = self.db.get(Kullanici, user_id)
        if user:
            # Map old English names to Turkish if they come from kwargs
            mapping = {
                "email": "eposta",
                "full_name": "tam_ad",
                "hashed_password": "sifre_karma"
            }
            for key, value in kwargs.items():
                target_key = mapping.get(key, key)
                if hasattr(user, target_key):
                    setattr(user, target_key, value)
            self.db.commit()
            self.db.refresh(user)
        return user

    def delete(self, user_id: str) -> bool:
        user = self.db.get(Kullanici, user_id)
        if user:
            self.db.delete(user)
            self.db.commit()
            return True
        return False

    # ── Rol işlemleri ─────────────────────────────────────────────

    def create_role(
        self,
        name: str,
        description: Optional[str] = None,
        permissions: Optional[list] = None,
    ) -> Rol:
        role = Rol(ad=name, aciklama=description, izinler=permissions or [])
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def get_role(self, role_id: str) -> Optional[Rol]:
        return self.db.get(Rol, role_id)

    def get_role_by_name(self, name: str) -> Optional[Rol]:
        stmt = select(Rol).where(Rol.ad == name)
        return self.db.scalar(stmt)

    def list_roles(self) -> list[Rol]:
        stmt = select(Rol).order_by(Rol.ad)
        return list(self.db.scalars(stmt).all())

    def assign_role(self, user_id: str, role_id: str) -> KullaniciRole:
        """Kullanıcıya rol ata. Zaten atanmışsa tekrar eklemez."""
        existing = self.db.get(KullaniciRole, (user_id, role_id))
        if existing:
            return existing
        ur = KullaniciRole(kullanici_kimlik=user_id, rol_kimlik=role_id)
        self.db.add(ur)
        self.db.commit()
        return ur

    def revoke_role(self, user_id: str, role_id: str) -> bool:
        ur = self.db.get(KullaniciRole, (user_id, role_id))
        if ur:
            self.db.delete(ur)
            self.db.commit()
            return True
        return False

    def get_user_roles(self, user_id: str) -> list[Rol]:
        stmt = (
            select(Rol)
            .join(KullaniciRole, KullaniciRole.rol_kimlik == Rol.kimlik)
            .where(KullaniciRole.kullanici_kimlik == user_id)
        )
        return list(self.db.scalars(stmt).all())
