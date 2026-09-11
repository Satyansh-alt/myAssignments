from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.course import Course
from app.models.category import GradeCategory
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from app.dependencies import get_current_user

router = APIRouter(tags=["categories"])


def _own_course(course_id: int, user: User, db: Session) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _own_category(category_id: int, user: User, db: Session) -> GradeCategory:
    cat = db.query(GradeCategory).filter(GradeCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    _own_course(cat.course_id, user, db)
    return cat


@router.get("/courses/{course_id}/categories", response_model=List[CategoryOut])
def list_categories(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_course(course_id, current_user, db)
    cats = db.query(GradeCategory).filter(GradeCategory.course_id == course_id).all()
    return [CategoryOut.from_orm_with_percent(c) for c in cats]


@router.post("/courses/{course_id}/categories", response_model=CategoryOut, status_code=201)
def create_category(course_id: int, body: CategoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_course(course_id, current_user, db)
    cat = GradeCategory(course_id=course_id, name=body.name, weight=body.weight_percent / 100, drop_count=body.drop_count)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryOut.from_orm_with_percent(cat)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, body: CategoryUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = _own_category(category_id, current_user, db)
    if body.name is not None:
        cat.name = body.name
    if body.weight_percent is not None:
        cat.weight = body.weight_percent / 100
    if body.drop_count is not None:
        cat.drop_count = body.drop_count
    db.commit()
    db.refresh(cat)
    return CategoryOut.from_orm_with_percent(cat)


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = _own_category(category_id, current_user, db)
    db.delete(cat)
    db.commit()
