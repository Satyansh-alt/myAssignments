from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class AssignmentCreate(BaseModel):
    category_id: int
    name: str
    max_score: float
    earned_score: Optional[float] = None
    due_date: Optional[datetime] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # "weekly", "biweekly", "monthly"
    recurrence_end_date: Optional[date] = None
    notes: Optional[str] = None


class AssignmentUpdate(BaseModel):
    name: Optional[str] = None
    max_score: Optional[float] = None
    earned_score: Optional[float] = None
    due_date: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[date] = None
    notes: Optional[str] = None


class AssignmentOut(BaseModel):
    id: int
    category_id: int
    course_id: int
    name: str
    max_score: float
    earned_score: Optional[float]
    due_date: Optional[datetime]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_end_date: Optional[date]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
