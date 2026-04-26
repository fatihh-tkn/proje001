"""
services/session_service.py
────────────────────────────
PC bazlı oturum yönetimi.

Her tarayıcı profili bir PC'yi temsil eder (pc_id = localStorage fingerprint).
Her tarayıcı sekmesi ayrı bir oturumdur (tab_id = sessionStorage token).
Bir PC'de aynı anda en fazla MAX_SESSIONS_PER_PC aktif oturum açılabilir.
IDLE_THRESHOLD_SECONDS saniye boyunca heartbeat gelmezse oturum otomatik kapanır.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from database.sql.session import get_session
from database.sql.models import BilgisayarOturumu, Kullanici

MAX_SESSIONS_PER_PC = 5
IDLE_THRESHOLD_SECONDS = 120


class SessionLimitError(Exception):
    pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _idle_cutoff() -> str:
    return (datetime.now(timezone.utc) - timedelta(seconds=IDLE_THRESHOLD_SECONDS)).isoformat()


# ── İç Yardımcılar ────────────────────────────────────────────────────────────

def _cleanup_idle(db: Session, pc_id: str) -> None:
    """Belirtilen PC'ye ait idle oturumları devre dışı bırakır."""
    cutoff = _idle_cutoff()
    rows = (
        db.query(BilgisayarOturumu)
        .filter(
            BilgisayarOturumu.mac_adresi == pc_id,
            BilgisayarOturumu.aktif_mi == True,
            BilgisayarOturumu.son_aktivite_tarihi < cutoff,
        )
        .all()
    )
    for row in rows:
        row.aktif_mi = False
    if rows:
        db.commit()


def _cleanup_idle_all(db: Session) -> None:
    """Tüm PC'lere ait idle oturumları devre dışı bırakır."""
    cutoff = _idle_cutoff()
    rows = (
        db.query(BilgisayarOturumu)
        .filter(
            BilgisayarOturumu.aktif_mi == True,
            BilgisayarOturumu.son_aktivite_tarihi < cutoff,
        )
        .all()
    )
    for row in rows:
        row.aktif_mi = False
    if rows:
        db.commit()


# ── Genel API ─────────────────────────────────────────────────────────────────

def register_or_touch(
    pc_id: str,
    tab_id: str,
    user_id: Optional[str] = None,
    ip: Optional[str] = None,
) -> str:
    """
    Bir sekme/oturumu kaydeder ya da son aktivite zamanını günceller.
    Yeni oturum ise PC için 5-limit kontrolü yapar.
    Limit aşılırsa SessionLimitError fırlatır.
    Returns: BilgisayarOturumu.kimlik
    """
    with get_session() as db:
        # Önce bu PC'nin idle oturumlarını temizle
        _cleanup_idle(db, pc_id)

        # Mevcut sekme kaydı var mı?
        existing = (
            db.query(BilgisayarOturumu)
            .filter(
                BilgisayarOturumu.mac_adresi == pc_id,
                BilgisayarOturumu.bilgisayar_adi == tab_id,
            )
            .first()
        )

        if existing:
            existing.aktif_mi = True
            existing.son_aktivite_tarihi = _now()
            if ip and not existing.ip_adresi:
                existing.ip_adresi = ip
            if user_id and not existing.kullanici_kimlik:
                existing.kullanici_kimlik = user_id
            db.commit()
            return existing.kimlik

        # Yeni oturum — limit kontrolü
        active_count = (
            db.query(BilgisayarOturumu)
            .filter(
                BilgisayarOturumu.mac_adresi == pc_id,
                BilgisayarOturumu.aktif_mi == True,
            )
            .count()
        )
        if active_count >= MAX_SESSIONS_PER_PC:
            raise SessionLimitError(
                f"Bu bilgisayarda en fazla {MAX_SESSIONS_PER_PC} eşzamanlı oturum "
                "açılabilir. Lütfen başka bir sekmeyi kapatın ve tekrar deneyin."
            )

        session = BilgisayarOturumu(
            kullanici_kimlik=user_id,
            ip_adresi=ip,
            mac_adresi=pc_id,
            bilgisayar_adi=tab_id,
            aktif_mi=True,
            son_aktivite_tarihi=_now(),
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session.kimlik


def heartbeat(
    pc_id: str,
    tab_id: str,
    user_id: Optional[str] = None,
    ip: Optional[str] = None,
) -> None:
    """
    Uygulama açıkken periyodik olarak çağrılır.
    Mevcut oturumu günceller; yoksa sessizce oluşturur (limit hatasız).
    """
    with get_session() as db:
        _cleanup_idle(db, pc_id)

        existing = (
            db.query(BilgisayarOturumu)
            .filter(
                BilgisayarOturumu.mac_adresi == pc_id,
                BilgisayarOturumu.bilgisayar_adi == tab_id,
            )
            .first()
        )

        if existing:
            existing.aktif_mi = True
            existing.son_aktivite_tarihi = _now()
            if ip and not existing.ip_adresi:
                existing.ip_adresi = ip
            if user_id and not existing.kullanici_kimlik:
                existing.kullanici_kimlik = user_id
            db.commit()
            return

        # Yeni kayıt — limit kontrolü YOK (heartbeat asla bloklamaz)
        active_count = (
            db.query(BilgisayarOturumu)
            .filter(
                BilgisayarOturumu.mac_adresi == pc_id,
                BilgisayarOturumu.aktif_mi == True,
            )
            .count()
        )
        if active_count >= MAX_SESSIONS_PER_PC:
            return  # Zaten dolu, sessizce çık

        row = BilgisayarOturumu(
            kullanici_kimlik=user_id,
            ip_adresi=ip,
            mac_adresi=pc_id,
            bilgisayar_adi=tab_id,
            aktif_mi=True,
            son_aktivite_tarihi=_now(),
        )
        db.add(row)
        db.commit()


def deactivate_session(session_kimlik: str) -> bool:
    """Belirli bir oturumu kapatır (admin kick). True döner başarılıysa."""
    with get_session() as db:
        row = db.query(BilgisayarOturumu).filter(BilgisayarOturumu.kimlik == session_kimlik).first()
        if not row:
            return False
        row.aktif_mi = False
        db.commit()
        return True


def get_pcs_with_sessions() -> list[dict]:
    """
    Tüm PC'leri döner. Her PC altında tüm oturumlar (aktif + pasif) listelenir.
    Her oturuma bağlı kullanıcının isim/eposta/rol/departman bilgileri eklenir.
    """
    with get_session() as db:
        _cleanup_idle_all(db)

        # BilgisayarOturumu + Kullanici LEFT JOIN
        rows = (
            db.query(BilgisayarOturumu, Kullanici)
            .outerjoin(Kullanici, BilgisayarOturumu.kullanici_kimlik == Kullanici.kimlik)
            .order_by(BilgisayarOturumu.ilk_baglanti_tarihi)
            .all()
        )

        pc_map: dict[str, dict] = {}
        for oturum, kullanici in rows:
            pc_id = oturum.mac_adresi or "unknown"
            if pc_id not in pc_map:
                pc_map[pc_id] = {
                    "pc_id": pc_id,
                    "ip": oturum.ip_adresi,
                    "first_seen": oturum.ilk_baglanti_tarihi,
                    "last_active": oturum.son_aktivite_tarihi,
                    "active_count": 0,
                    "total_sessions": 0,
                    "sessions": [],
                }

            entry = pc_map[pc_id]

            if oturum.ip_adresi:
                entry["ip"] = oturum.ip_adresi

            if oturum.son_aktivite_tarihi and (
                not entry["last_active"] or oturum.son_aktivite_tarihi > entry["last_active"]
            ):
                entry["last_active"] = oturum.son_aktivite_tarihi

            entry["total_sessions"] += 1
            if oturum.aktif_mi:
                entry["active_count"] += 1

            # Kullanıcı detayları (şifre hariç)
            user_detail: dict | None = None
            if kullanici:
                meta = kullanici.meta or {}
                user_detail = {
                    "id": kullanici.kimlik,
                    "name": kullanici.tam_ad,
                    "email": kullanici.eposta,
                    "role": "Sistem Yöneticisi" if kullanici.super_kullanici_mi else "Standart Kullanıcı",
                    "status": "Aktif" if kullanici.aktif_mi else "Askıya Alındı",
                    "department": meta.get("department", ""),
                    "position": meta.get("position", ""),
                    "avatar_url": meta.get("avatar_url", ""),
                    "last_login": kullanici.son_giris_tarihi,
                    "created_at": kullanici.olusturulma_tarihi,
                }

            entry["sessions"].append({
                "id": oturum.kimlik,
                "tab_id": oturum.bilgisayar_adi,
                "active": oturum.aktif_mi,
                "started": oturum.ilk_baglanti_tarihi,
                "last_active": oturum.son_aktivite_tarihi,
                "user": user_detail,
            })

        result = list(pc_map.values())
        # Aktif oturumu olanlar önce, sonra son aktiviteye göre
        result.sort(key=lambda x: (-x["active_count"], x["last_active"] or ""), reverse=False)
        return result
