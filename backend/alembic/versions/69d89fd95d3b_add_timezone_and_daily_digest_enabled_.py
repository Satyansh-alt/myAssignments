"""add timezone and daily_digest_enabled to users

Revision ID: 69d89fd95d3b
Revises: 
Create Date: 2026-09-11 21:41:28.794090

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '69d89fd95d3b'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
    )
    op.add_column(
        "users",
        sa.Column("daily_digest_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("users", "daily_digest_enabled")
    op.drop_column("users", "timezone")
