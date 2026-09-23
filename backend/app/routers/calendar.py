import calendar as calendar_module
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.user import User
from app.models.completion import AssignmentCompletion
from app.services.occurrence_service import occurrences_in_range
from app.dependencies import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("")
def month_view(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    range_start = datetime(year, month, 1)
    days_in_month = calendar_module.monthrange(year, month)[1]
    range_end = datetime(year, month, days_in_month, 23, 59, 59)

    courses = {c.id: c for c in db.query(Course).filter(Course.user_id == current_user.id).all()}
    assignments = db.query(Assignment).filter(Assignment.course_id.in_(courses.keys())).all()

    completions = set()
    if assignments:
        rows = (
            db.query(AssignmentCompletion.assignment_id, AssignmentCompletion.occurrence_date)
            .filter(AssignmentCompletion.assignment_id.in_([a.id for a in assignments]))
            .all()
        )
        completions = {(assignment_id, occurrence_date) for assignment_id, occurrence_date in rows}

    days: dict[str, list] = {}
    for a in assignments:
        occurrences = occurrences_in_range(a, range_start, range_end)
        if not occurrences:
            continue
        course = courses.get(a.course_id)
        for occ in occurrences:
            key = occ.date().isoformat()
            days.setdefault(key, []).append({
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
                "completed": (a.id, occ.date()) in completions,
            })

    for key in days:
        days[key].sort(key=lambda x: x["due_date"])

    return {"year": year, "month": month, "days": days}
