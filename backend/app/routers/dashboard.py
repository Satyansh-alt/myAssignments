from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

RECURRENCE_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}


def _next_occurrence(base: datetime, pattern: str, after: datetime) -> datetime | None:
    delta = timedelta(days=RECURRENCE_DAYS.get(pattern, 7))
    current = base
    while current <= after:
        current += delta
    return current


@router.get("")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today_start + timedelta(days=7)

    courses = {c.id: c for c in db.query(Course).filter(Course.user_id == current_user.id).all()}
    assignments = db.query(Assignment).filter(Assignment.course_id.in_(courses.keys())).all()

    today_items = []
    upcoming_items = []

    for a in assignments:
        if a.is_recurring and a.due_date and a.recurrence_pattern:
            due = a.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            # advance past occurrences until we find one in or after today
            delta = timedelta(days=RECURRENCE_DAYS.get(a.recurrence_pattern, 7))
            while due < today_start:
                due += delta
                if a.recurrence_end_date and due.date() > a.recurrence_end_date:
                    due = None
                    break
            if due is None:
                continue
            occurrences = []
            candidate = due
            while candidate <= week_end:
                if a.recurrence_end_date and candidate.date() > a.recurrence_end_date:
                    break
                occurrences.append(candidate)
                candidate += delta
        elif a.due_date:
            due = a.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if today_start <= due <= week_end:
                occurrences = [due]
            else:
                continue
        else:
            continue

        course = courses.get(a.course_id)
        for occ in occurrences:
            item = {
                "assignment_id": a.id,
                "name": a.name,
                "due_date": occ.isoformat(),
                "course_id": a.course_id,
                "course_name": course.name if course else "",
                "course_color": course.color if course else "#4f46e5",
                "earned_score": a.earned_score,
                "max_score": a.max_score,
                "is_graded": a.earned_score is not None,
                "is_recurring": a.is_recurring,
            }
            if occ < today_start + timedelta(days=1):
                today_items.append(item)
            else:
                upcoming_items.append(item)

    today_items.sort(key=lambda x: x["due_date"])
    upcoming_items.sort(key=lambda x: x["due_date"])
    return {"today": today_items, "upcoming": upcoming_items}
