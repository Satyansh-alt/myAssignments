from pydantic import BaseModel
from datetime import date


class CompletionToggle(BaseModel):
    occurrence_date: date
    completed: bool
