"""Add dual pool RAG: havuz_turu on belgeler, dosya_limiti + depolama_limiti_mb on kullanicilar

Revision ID: f8c3d2e1a9b0
Revises: d47b84b778b8
Create Date: 2026-04-22 10:00:00.000000

Değişiklikler:
  belgeler.havuz_turu        VARCHAR(16) NOT NULL DEFAULT 'sistem'
  kullanicilar.dosya_limiti  INTEGER NULL
  kullanicilar.depolama_limiti_mb FLOAT NULL
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f8c3d2e1a9b0'
down_revision: Union[str, Sequence[str], None] = 'd47b84b778b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # belgeler tablosuna havuz_turu ekle
    # Mevcut tüm kayıtlar 'sistem' havuzunda başlar
    op.add_column(
        'belgeler',
        sa.Column('havuz_turu', sa.String(16), nullable=False, server_default='sistem')
    )
    op.create_index('ix_belgeler_havuz_turu', 'belgeler', ['havuz_turu'])

    # kullanicilar tablosuna kota alanları ekle
    op.add_column(
        'kullanicilar',
        sa.Column('dosya_limiti', sa.Integer(), nullable=True)
    )
    op.add_column(
        'kullanicilar',
        sa.Column('depolama_limiti_mb', sa.Float(), nullable=True)
    )


def downgrade() -> None:
    op.drop_index('ix_belgeler_havuz_turu', table_name='belgeler')
    op.drop_column('belgeler', 'havuz_turu')
    op.drop_column('kullanicilar', 'dosya_limiti')
    op.drop_column('kullanicilar', 'depolama_limiti_mb')
