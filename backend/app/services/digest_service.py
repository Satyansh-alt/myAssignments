from datetime import datetime, date
from zoneinfo import ZoneInfo
import httpx
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.user import User
from app.models.assignment import Assignment
from app.models.course import Course

settings = get_settings()

RESEND_API_URL = "https://api.resend.com/emails"


def users_due_for_digest(db: Session, now_utc: datetime) -> list[User]:
    """Users whose local time is currently within the 8:00-8:59am hour."""
    due = []
    for user in db.query(User).filter(User.daily_digest_enabled.is_(True)).all():
        try:
            local_now = now_utc.astimezone(ZoneInfo(user.timezone))
        except Exception:
            continue
        if local_now.hour == 8:
            due.append(user)
    return due


def assignments_due_today(db: Session, user: User, local_today: date) -> list[Assignment]:
    course_ids = [c.id for c in db.query(Course).filter(Course.user_id == user.id).all()]
    if not course_ids:
        return []
    assignments = (
        db.query(Assignment)
        .filter(Assignment.course_id.in_(course_ids), Assignment.due_date.isnot(None))
        .all()
    )
    return [a for a in assignments if a.due_date.date() == local_today]


def render_digest_email(user: User, assignments: list[Assignment], courses_by_id: dict) -> str:
    if not assignments:
        return None
    items = sorted(assignments, key=lambda a: a.due_date)
    rows = "".join(
        f"<li><strong>{a.name}</strong> — {courses_by_id.get(a.course_id, '')} "
        f"(due {a.due_date.strftime('%I:%M %p').lstrip('0')})</li>"
        for a in items
    )
    return (
        f"<p>Hi {user.full_name},</p>"
        f"<p>You have {len(items)} assignment(s) due today:</p>"
        f"<ul>{rows}</ul>"
        f"<p>— myAssignments</p>"
    )


def send_email(to_email: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        return False
    response = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json={
            "from": settings.DIGEST_FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html,
        },
        timeout=10,
    )
    return response.status_code < 300


def run_daily_digest(db: Session, now_utc: datetime | None = None) -> dict:
    now_utc = now_utc or datetime.now(ZoneInfo("UTC"))
    sent = []
    skipped_empty = []
    failed = []

    for user in users_due_for_digest(db, now_utc):
        local_today = now_utc.astimezone(ZoneInfo(user.timezone)).date()
        assignments = assignments_due_today(db, user, local_today)
        if not assignments:
            skipped_empty.append(user.email)
            continue

        courses = {c.id: c.name for c in db.query(Course).filter(Course.user_id == user.id).all()}
        html = render_digest_email(user, assignments, courses)
        if send_email(user.email, f"{len(assignments)} assignment(s) due today", html):
            sent.append(user.email)
        else:
            failed.append(user.email)

    return {"sent": sent, "skipped_empty": skipped_empty, "failed": failed}
