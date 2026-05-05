"""
encrypt_existing_keys.py
────────────────────────────────────────────────────────────────────
Bir kerelik geçiş scripti: ai_modelleri tablosundaki düz metin
api_anahtari değerlerini Fernet ile şifreler.

Önkoşullar:
  - backend/.env'de FERNET_KEY tanımlı olmalı
  - backend kapalı veya read-only modda olmalı (yarış koşullarını önlemek için)

Çalıştırma:
  cd backend
  python -m scripts.encrypt_existing_keys              # dry-run (yalnızca rapor)
  python -m scripts.encrypt_existing_keys --apply      # gerçek yazım

Idempotent: Şifreli (fer:v1: prefix'li) kayıtlar atlanır, ikinci çalıştırma
sorunsuz biter. Geri alma için: 'decrypt' moduyla çıktıyı al, manuel düzenle —
ama bu prod'da tehlikelidir, gerek olmamalı.
"""

from __future__ import annotations

import sys
import argparse


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="Sadece raporlama yapma; gerçek yazımı uygula.")
    args = parser.parse_args()

    # Backend modüllerini bul
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from services.crypto_service import (
        encryption_enabled, encrypt as _encrypt, _PREFIX,
    )
    from database.sql.session import get_session
    from database.sql.models import AIModeli
    from sqlalchemy import select

    if not encryption_enabled():
        print("HATA: FERNET_KEY tanımlı değil. backend/.env'e ekle ve tekrar çalıştır.")
        print("Yeni key üretmek için:")
        print("  python -c \"from cryptography.fernet import Fernet; "
              "print(Fernet.generate_key().decode())\"")
        return 1

    plain_count = 0
    encrypted_count = 0
    rows_to_update: list[tuple[str, str, str]] = []  # (id, ad, new_token)

    with get_session() as db:
        rows = list(db.scalars(select(AIModeli)).all())
        print(f"\nBulunan toplam kayıt: {len(rows)}\n")

        for m in rows:
            key = m.api_anahtari or ""
            if key.startswith(_PREFIX):
                encrypted_count += 1
                print(f"  [OK]  {m.ad} (id={m.kimlik}) — zaten şifreli, atlanıyor.")
                continue
            plain_count += 1
            new_token = _encrypt(key)
            rows_to_update.append((m.kimlik, m.ad, new_token))
            print(f"  [TBD] {m.ad} (id={m.kimlik}) — düz metin → şifrelenecek "
                  f"(eski uzunluk={len(key)}, yeni uzunluk={len(new_token)})")

        print(f"\nÖzet: {encrypted_count} kayıt zaten şifreli, "
              f"{plain_count} kayıt şifrelenecek.")

        if not args.apply:
            print("\n--apply geçilmedi → DRY-RUN. Veri yazılmadı.")
            print("Uygulamak için: python -m scripts.encrypt_existing_keys --apply")
            return 0

        if plain_count == 0:
            print("Yapılacak iş yok.")
            return 0

        print("\nYazım başlıyor...")
        for model_id, ad, new_token in rows_to_update:
            row = db.scalars(
                select(AIModeli).where(AIModeli.kimlik == model_id)
            ).first()
            if row is None:
                print(f"  ! {ad} (id={model_id}) yazım sırasında kayboldu, atlanıyor.")
                continue
            row.api_anahtari = new_token
            print(f"  [✓] {ad} → şifrelendi.")
        db.commit()
        print(f"\nBitti. {len(rows_to_update)} kayıt şifrelendi.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
