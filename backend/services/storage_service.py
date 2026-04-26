"""
services/storage_service.py
────────────────────────────
Kullanıcı depolama / belge istatistikleri.

- Sistem geneli özet (tüm dosyalar, toplam boyut, vektör parça sayısı)
- Kullanıcı bazlı kullanım (kota, kalan alan, dosya sayısı)
- Bir kullanıcının tüm belgelerinin detayı
- Kota güncelleme
"""

from __future__ import annotations

from typing import Optional, Any
from sqlalchemy import func

from database.sql.session import get_session
from database.sql.models import Kullanici, Belge, VektorParcasi


def _bytes_to_mb(b: Optional[int]) -> float:
    if not b:
        return 0.0
    return round(b / (1024 * 1024), 3)


def get_storage_overview() -> dict[str, Any]:
    """
    Sistem geneli depolama özeti + kullanıcı bazlı liste.
    Returns:
        {
            "totals": {
                "total_users": int,
                "total_files": int,
                "total_size_mb": float,
                "total_chunks": int,
                "vectorized_files": int,
                "vectorized_pct": int,
            },
            "users": [
                {
                    "id": str, "name": str, "email": str,
                    "role": str, "status": str,
                    "quota_mb": float | None,
                    "quota_files": int | None,
                    "used_mb": float, "used_files": int,
                    "remaining_mb": float | None,
                    "usage_pct": int,            # 0-100, sınırsızsa 0
                    "vectorized_files": int,
                },
                ...
            ]
        }
    """
    with get_session() as db:
        # Sistem geneli sayaçlar
        total_users = db.query(func.count(Kullanici.kimlik)).scalar() or 0
        total_files = db.query(func.count(Belge.kimlik)).scalar() or 0
        total_bytes = db.query(func.coalesce(func.sum(Belge.dosya_boyutu_bayt), 0)).scalar() or 0
        total_chunks = db.query(func.count(VektorParcasi.kimlik)).scalar() or 0
        vectorized_files = (
            db.query(func.count(Belge.kimlik))
            .filter(Belge.vektorlestirildi_mi == True)
            .scalar() or 0
        )
        vectorized_pct = round((vectorized_files / total_files) * 100) if total_files else 0

        # Kullanıcı bazlı kullanım: belgeler tablosunu yukleyen_kimlik ile group
        usage_rows = (
            db.query(
                Belge.yukleyen_kimlik.label("user_id"),
                func.count(Belge.kimlik).label("file_count"),
                func.coalesce(func.sum(Belge.dosya_boyutu_bayt), 0).label("size_bytes"),
            )
            .filter(Belge.yukleyen_kimlik.isnot(None))
            .group_by(Belge.yukleyen_kimlik)
            .all()
        )

        # Vektörleştirilen dosya sayısı — ayrı sorgu
        vec_rows = (
            db.query(
                Belge.yukleyen_kimlik,
                func.count(Belge.kimlik),
            )
            .filter(Belge.vektorlestirildi_mi == True)
            .filter(Belge.yukleyen_kimlik.isnot(None))
            .group_by(Belge.yukleyen_kimlik)
            .all()
        )
        vec_map = {row[0]: row[1] for row in vec_rows}

        usage_map: dict[str, dict] = {}
        for row in usage_rows:
            usage_map[row.user_id] = {
                "file_count": int(row.file_count or 0),
                "size_mb": _bytes_to_mb(int(row.size_bytes or 0)),
            }

        # Tüm kullanıcıları çek (belge yüklememiş olanlar dahil)
        users = db.query(Kullanici).all()
        users_payload = []
        for u in users:
            usage = usage_map.get(u.kimlik, {"file_count": 0, "size_mb": 0.0})
            quota_mb = u.depolama_limiti_mb
            used_mb = usage["size_mb"]
            remaining_mb = (round(quota_mb - used_mb, 3) if quota_mb is not None else None)
            usage_pct = (
                round((used_mb / quota_mb) * 100) if quota_mb and quota_mb > 0 else 0
            )
            users_payload.append({
                "id": u.kimlik,
                "name": u.tam_ad,
                "email": u.eposta,
                "role": "Sistem Yöneticisi" if u.super_kullanici_mi else "Standart Kullanıcı",
                "status": "Aktif" if u.aktif_mi else "Askıya Alındı",
                "department": (u.meta or {}).get("department"),
                "quota_mb": quota_mb,
                "quota_files": u.dosya_limiti,
                "used_mb": used_mb,
                "used_files": usage["file_count"],
                "remaining_mb": remaining_mb,
                "usage_pct": min(usage_pct, 999),
                "vectorized_files": int(vec_map.get(u.kimlik, 0)),
            })

        # En çok kullanan üstte
        users_payload.sort(key=lambda x: -x["used_mb"])

        return {
            "totals": {
                "total_users": total_users,
                "total_files": total_files,
                "total_size_mb": _bytes_to_mb(total_bytes),
                "total_chunks": total_chunks,
                "vectorized_files": vectorized_files,
                "vectorized_pct": vectorized_pct,
            },
            "users": users_payload,
        }


def get_user_documents(user_id: str) -> list[dict]:
    """Kullanıcının yüklediği tüm belgelerin detayı."""
    with get_session() as db:
        rows = (
            db.query(Belge)
            .filter(Belge.yukleyen_kimlik == user_id)
            .order_by(Belge.olusturulma_tarihi.desc())
            .all()
        )
        return [
            {
                "id": b.kimlik,
                "name": b.dosya_adi,
                "type": b.dosya_turu,
                "size_mb": _bytes_to_mb(b.dosya_boyutu_bayt),
                "size_bytes": b.dosya_boyutu_bayt or 0,
                "status": b.durum,
                "vectorized": bool(b.vektorlestirildi_mi),
                "chunk_count": b.parca_sayisi or 0,
                "access_policy": b.erisim_politikasi,
                "pool_type": b.havuz_turu,
                "uploaded_at": b.olusturulma_tarihi,
                "last_query": b.son_sorgulama_tarihi,
                "error_code": b.hata_kodu,
            }
            for b in rows
        ]


def update_user_quota(
    user_id: str,
    quota_mb: Optional[float] = None,
    quota_files: Optional[int] = None,
) -> bool:
    """Kullanıcı kotasını günceller. None gönderirsen 'sınırsız' demektir."""
    with get_session() as db:
        u = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
        if not u:
            return False
        # quota_mb / quota_files alanları "değiştirme" sinyali için None değil,
        # özel bir sentinel kullanmalıyız. Burada -1 = sınırsız (NULL), >=0 = değer.
        if quota_mb is not None:
            u.depolama_limiti_mb = None if quota_mb < 0 else float(quota_mb)
        if quota_files is not None:
            u.dosya_limiti = None if quota_files < 0 else int(quota_files)
        db.commit()
        return True
