from sqlalchemy import Column, Integer, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class AssignmentCompletion(Base):
    __tablename__ = "assignment_completions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "occurrence_date", name="uq_assignment_occurrence"),
    )

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    occurrence_date = Column(Date, nullable=False)

    assignment = relationship("Assignment")
