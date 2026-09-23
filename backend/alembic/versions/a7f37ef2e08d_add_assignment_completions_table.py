"""add assignment_completions table

Revision ID: a7f37ef2e08d
Revises: 
Create Date: 2026-09-22 19:25:49.178410

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a7f37ef2e08d'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assignment_completions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("occurrence_date", sa.Date(), nullable=False),
        sa.UniqueConstraint("assignment_id", "occurrence_date", name="uq_assignment_occurrence"),
    )


def downgrade() -> None:
    op.drop_table("assignment_completions")
