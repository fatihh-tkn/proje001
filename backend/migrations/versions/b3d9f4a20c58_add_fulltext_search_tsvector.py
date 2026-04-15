"""add_fulltext_search_tsvector

Revision ID: b3d9f4a20c58
Revises: a2c8f3e19b47
Create Date: 2026-04-15 14:55:00.000000

vektor_parcalari tablosuna Full-Text Search (tsvector) sütunu ve GIN indeksi ekler.
Mevcut icerik alanındaki verilerden tsvector oluşturur.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'b3d9f4a20c58'
down_revision = 'a2c8f3e19b47'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. tsvector sütunu ekle
    op.execute("""
        ALTER TABLE vektor_parcalari
        ADD COLUMN IF NOT EXISTS arama_vektoru tsvector;
    """)

    # 2. Mevcut verileri güncelle (Türkçe + İngilizce ağırlıklı)
    op.execute("""
        UPDATE vektor_parcalari
        SET arama_vektoru = to_tsvector('simple', COALESCE(icerik, ''))
        WHERE arama_vektoru IS NULL AND icerik IS NOT NULL;
    """)

    # 3. GIN indeksi oluştur (Full-Text arama performansı için kritik)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_vektor_parcalari_arama_vektoru
        ON vektor_parcalari USING GIN (arama_vektoru);
    """)

    # 4. Otomatik güncelleme trigger'ı — yeni kayıtlarda tsvector otomatik oluşsun
    op.execute("""
        CREATE OR REPLACE FUNCTION vektor_parcalari_tsvector_update() RETURNS trigger AS $$
        BEGIN
            NEW.arama_vektoru := to_tsvector('simple', COALESCE(NEW.icerik, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        DROP TRIGGER IF EXISTS trg_vektor_parcalari_tsvector ON vektor_parcalari;
        CREATE TRIGGER trg_vektor_parcalari_tsvector
        BEFORE INSERT OR UPDATE OF icerik ON vektor_parcalari
        FOR EACH ROW
        EXECUTE FUNCTION vektor_parcalari_tsvector_update();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_vektor_parcalari_tsvector ON vektor_parcalari;")
    op.execute("DROP FUNCTION IF EXISTS vektor_parcalari_tsvector_update();")
    op.execute("DROP INDEX IF EXISTS ix_vektor_parcalari_arama_vektoru;")
    op.execute("ALTER TABLE vektor_parcalari DROP COLUMN IF EXISTS arama_vektoru;")
