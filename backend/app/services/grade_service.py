from sqlalchemy.orm import Session
from app.models.category import GradeCategory
from app.models.assignment import Assignment


def _ratio(a) -> float:
    # Guards against max_score == 0 (an assignment worth 0 points).
    if a.earned_score is None or not a.max_score:
        return 0.0
    return a.earned_score / a.max_score


def _category_percent(assignments, drop_count: int, treat_ungraded_as_zero: bool):
    """Returns the category's raw fraction (0.0-1.0+) after drops, or None if it can't be scored."""
    if not assignments:
        return None
    sorted_asc = sorted(assignments, key=_ratio)
    effective_drop = min(drop_count, len(sorted_asc) - 1)
    after_drop = sorted_asc[effective_drop:]
    denom = sum(a.max_score for a in after_drop)
    if denom <= 0:
        return None
    earned = sum((a.earned_score or 0.0) if treat_ungraded_as_zero else a.earned_score for a in after_drop)
    return earned / denom


def calculate_course_grade(course_id: int, db: Session) -> dict:
    categories = db.query(GradeCategory).filter(GradeCategory.course_id == course_id).all()
    breakdown = []

    current_weighted_sum = 0.0
    current_weight_counted = 0.0
    total_weighted_sum = 0.0
    total_weight_counted = 0.0

    for cat in categories:
        graded = [a for a in cat.assignments if a.earned_score is not None]

        # "Current" grade — graded assignments only.
        current_raw = _category_percent(graded, cat.drop_count, treat_ungraded_as_zero=False) if graded else None
        if current_raw is not None and cat.weight > 0:
            current_weighted_sum += current_raw * cat.weight
            current_weight_counted += cat.weight

        # "Total" grade — every assignment, ungraded counts as zero.
        total_raw = _category_percent(list(cat.assignments), cat.drop_count, treat_ungraded_as_zero=True)
        if total_raw is not None and cat.weight > 0:
            total_weighted_sum += total_raw * cat.weight
            total_weight_counted += cat.weight

        breakdown.append({
            "category_id": cat.id,
            "category_name": cat.name,
            "weight_percent": round(cat.weight * 100, 2),
            "drop_count": cat.drop_count,
            "total_assignments": len(cat.assignments),
            "graded_assignments": len(graded),
            "raw_percent": round(current_raw * 100, 2) if current_raw is not None else None,
            "contribution": round(current_raw * cat.weight * 100, 2) if current_raw is not None else None,
            "letter_grade": _letter(current_raw * 100) if current_raw is not None else None,
        })

    current_percent = round(current_weighted_sum / current_weight_counted * 100, 2) if current_weight_counted > 0 else None
    total_percent = round(total_weighted_sum / total_weight_counted * 100, 2) if total_weight_counted > 0 else None

    return {
        "current_percent": current_percent,
        "current_letter": _letter(current_percent) if current_percent is not None else None,
        "total_percent": total_percent,
        "total_letter": _letter(total_percent) if total_percent is not None else None,
        "weight_graded_so_far": round(current_weight_counted * 100, 2),
        # Back-compat aliases so an older frontend keeps working during rollout.
        "overall_percent": current_percent,
        "letter_grade": _letter(current_percent) if current_percent is not None else None,
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
