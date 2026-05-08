"""add_model_locked_to_ai_agents

Revision ID: a1b2c3d4e5f6
Revises: c7a1f5b2e890
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c7a1f5b2e890'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('ai_agents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('model_locked', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    with op.batch_alter_table('ai_agents', schema=None) as batch_op:
        batch_op.drop_column('model_locked')
