from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    semester: Optional[str] = None
    color: Optional[str] = "#4f46e5"


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    semester: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class CourseOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    semester: Optional[str]
    color: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
