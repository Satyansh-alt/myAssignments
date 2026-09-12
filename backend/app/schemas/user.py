from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    timezone: str = "UTC"


class UserUpdate(BaseModel):
    full_name: str | None = None
    timezone: str | None = None
    daily_digest_enabled: bool | None = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    timezone: str
    daily_digest_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
