from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class CategoryCreate(BaseModel):
    name: str
    weight_percent: float  # 0–100, converted to 0–1 in service
    drop_count: int = 0

    @field_validator("weight_percent")
    @classmethod
    def weight_in_range(cls, v):
        if not (0 < v <= 100):
            raise ValueError("weight_percent must be between 0 and 100")
        return v


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    weight_percent: Optional[float] = None
    drop_count: Optional[int] = None


class CategoryOut(BaseModel):
    id: int
    course_id: int
    name: str
    weight_percent: float  # returned as 0–100 for display
    drop_count: int
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_percent(cls, obj):
        return cls(
            id=obj.id,
            course_id=obj.course_id,
            name=obj.name,
            weight_percent=round(obj.weight * 100, 4),
            drop_count=obj.drop_count,
            created_at=obj.created_at,
        )
