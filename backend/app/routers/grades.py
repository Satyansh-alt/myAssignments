from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.course import Course
from app.models.user import User
from app.services.grade_service import calculate_course_grade
from app.dependencies import get_current_user

router = APIRouter(prefix="/grades", tags=["grades"])


@router.get("/course/{course_id}")
def grade_for_course(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    result = calculate_course_grade(course_id, db)
    result["course_id"] = course_id
    result["course_name"] = course.name
    return result


@router.get("/summary")
def grade_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    courses = db.query(Course).filter(Course.user_id == current_user.id).all()
    summary = []
    for course in courses:
        grade = calculate_course_grade(course.id, db)
        summary.append({
            "course_id": course.id,
            "course_name": course.name,
            "semester": course.semester,
            "color": course.color,
            "overall_percent": grade["overall_percent"],
            "letter_grade": grade["letter_grade"],
            "weight_graded_so_far": grade["weight_graded_so_far"],
        })
    return summary
