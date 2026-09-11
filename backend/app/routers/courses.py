from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.course import Course
from app.models.user import User
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/courses", tags=["courses"])


def _get_course_or_404(course_id: int, user: User, db: Session) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("", response_model=List[CourseOut])
def list_courses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.user_id == current_user.id).all()


@router.post("", response_model=CourseOut, status_code=201)
def create_course(body: CourseCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = Course(user_id=current_user.id, **body.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_course_or_404(course_id, current_user, db)


@router.put("/{course_id}", response_model=CourseOut)
def update_course(course_id: int, body: CourseUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _get_course_or_404(course_id, current_user, db)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _get_course_or_404(course_id, current_user, db)
    db.delete(course)
    db.commit()
