from sqlalchemy.orm import Session
from app.models.category import GradeCategory
from app.models.assignment import Assignment


def calculate_course_grade(course_id: int, db: Session) -> dict:
    categories = db.query(GradeCategory).filter(GradeCategory.course_id == course_id).all()
    breakdown = []
    overall = 0.0
    total_weight_counted = 0.0

    for cat in categories:
        graded = [a for a in cat.assignments if a.earned_score is not None]
        entry = {
            "category_id": cat.id,
            "category_name": cat.name,
            "weight_percent": round(cat.weight * 100, 2),
            "drop_count": cat.drop_count,
            "total_assignments": len(cat.assignments),
            "graded_assignments": len(graded),
            "raw_percent": None,
            "contribution": None,
            "letter_grade": None,
        }

        if len(graded) == 0:
            breakdown.append(entry)
            continue

        sorted_asc = sorted(graded, key=lambda a: a.earned_score / a.max_score)
        effective_drop = min(cat.drop_count, len(sorted_asc) - 1) if len(sorted_asc) > 0 else 0
        after_drop = sorted_asc[effective_drop:]

        if not after_drop:
            breakdown.append(entry)
            continue

        raw = sum(a.earned_score for a in after_drop) / sum(a.max_score for a in after_drop)
        contribution = raw * cat.weight
        overall += contribution
        total_weight_counted += cat.weight

        entry["raw_percent"] = round(raw * 100, 2)
        entry["contribution"] = round(contribution * 100, 2)
        entry["letter_grade"] = _letter(raw * 100)
        breakdown.append(entry)

    return {
        "overall_percent": round(overall * 100, 2) if total_weight_counted > 0 else None,
        "letter_grade": _letter(overall * 100) if total_weight_counted > 0 else None,
        "weight_graded_so_far": round(total_weight_counted * 100, 2),
        "breakdown": breakdown,
    }


def _letter(pct: float) -> str:
    if pct >= 90:
        return "A"
    if pct >= 80:
        return "B"
    if pct >= 70:
        return "C"
    if pct >= 60:
        return "D"
    return "F"
