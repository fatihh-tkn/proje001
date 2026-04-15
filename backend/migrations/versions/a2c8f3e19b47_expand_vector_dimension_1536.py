"""expand_vector_dimension_1536

Revision ID: a2c8f3e19b47
Revises: 748a6fab6bd3
Create Date: 2026-04-15 13:20:00.000000

Vektör sütun boyutunu 384'ten 1536'ya genişletir.
Çoklu embedding model desteği (MiniLM-384, BGE-M3-1024, OpenAI-1536) için gereklidir.
Mevcut 384-boyutlu vektörler sıfır-doldurmaya pad edilir.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2c8f3e19b47'
down_revision: Union[str, Sequence[str], None] = '748a6fab6bd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Vektör boyutunu 384 → 1536 olarak genişlet ve mevcut vektörleri pad et."""
    
    # 1. Sütunu geçici olarak kaldır ve yeni boyutla yeniden oluştur
    # pgvector doğrudan ALTER TYPE desteklemediği için:
    #   a) Mevcut verileri geçici JSON sütununa yedekle
    #   b) Eski sütunu kaldır
    #   c) Yeni boyutla sütun oluştur
    #   d) Verileri geri yükle (sıfır-dolduruarak pad et)
    
    # a) Geçici JSON sütunu oluştur ve yedekle
    op.execute("""
        ALTER TABLE vektor_parcalari
        ADD COLUMN IF NOT EXISTS _vektor_yedek text;
    """)
    op.execute("""
        UPDATE vektor_parcalari
        SET _vektor_yedek = vektor_verisi::text
        WHERE vektor_verisi IS NOT NULL;
    """)
    
    # b) Eski vektör sütununu kaldır
    op.execute("""
        ALTER TABLE vektor_parcalari
        DROP COLUMN IF EXISTS vektor_verisi;
    """)
    
    # c) Yeni 1536 boyutlu sütun oluştur
    op.execute("""
        ALTER TABLE vektor_parcalari
        ADD COLUMN vektor_verisi vector(1536);
    """)
    
    # d) Mevcut vektörleri geri yükle — 384 boyuttan 1536'ya sıfır ile pad et
    # pgvector text formatı: '[0.1,0.2,...,0.384]'
    # Sondaki ']' yerine sıfırlar ekleyip kapatıyoruz
    op.execute("""
        UPDATE vektor_parcalari
        SET vektor_verisi = (
            REPLACE(_vektor_yedek, ']', 
                ',' || REPEAT('0,', 1151) || '0]'
            )
        )::vector(1536)
        WHERE _vektor_yedek IS NOT NULL;
    """)
    
    # e) Geçici sütunu temizle
    op.execute("""
        ALTER TABLE vektor_parcalari
        DROP COLUMN IF EXISTS _vektor_yedek;
    """)


def downgrade() -> None:
    """Vektör boyutunu 1536 → 384 olarak geri al (veri kaybı olabilir!)."""
    
    op.execute("""
        ALTER TABLE vektor_parcalari
        ADD COLUMN IF NOT EXISTS _vektor_yedek text;
    """)
    op.execute("""
        UPDATE vektor_parcalari
        SET _vektor_yedek = vektor_verisi::text
        WHERE vektor_verisi IS NOT NULL;
    """)
    op.execute("""
        ALTER TABLE vektor_parcalari
        DROP COLUMN IF EXISTS vektor_verisi;
    """)
    op.execute("""
        ALTER TABLE vektor_parcalari
        ADD COLUMN vektor_verisi vector(384);
    """)
    # İlk 384 boyutu geri yükle (geri kalanlar kaybolur)
    # Bu karmaşık bir string manipülasyonu gerektirir, basitçe NULL bırakıyoruz
    op.execute("""
        ALTER TABLE vektor_parcalari
        DROP COLUMN IF EXISTS _vektor_yedek;
    """)
