"""add_temel_url_to_ai_modelleri

Revision ID: c7a1f5b2e890
Revises: ea59fb26e0da
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7a1f5b2e890'
down_revision: Union[str, Sequence[str], None] = 'ea59fb26e0da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('ai_modelleri', schema=None) as batch_op:
        batch_op.add_column(sa.Column('temel_url', sa.String(length=512), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('ai_modelleri', schema=None) as batch_op:
        batch_op.drop_column('temel_url')
