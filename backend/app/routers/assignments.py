from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.assignment import Assignment
from app.models.category import GradeCategory
from app.models.course import Course
from app.models.user import User
from app.models.completion import AssignmentCompletion
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentOut
from app.schemas.completion import CompletionToggle
from app.dependencies import get_current_user

router = APIRouter(tags=["assignments"])


def _own_category(category_id: int, user: User, db: Session) -> GradeCategory:
    cat = db.query(GradeCategory).filter(GradeCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    course = db.query(Course).filter(Course.id == cat.course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


def _own_assignment(assignment_id: int, user: User, db: Session) -> Assignment:
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    course = db.query(Course).filter(Course.id == a.course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return a


@router.get("/courses/{course_id}/assignments", response_model=List[AssignmentOut])
def list_by_course(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.query(Assignment).filter(Assignment.course_id == course_id).all()


@router.get("/categories/{category_id}/assignments", response_model=List[AssignmentOut])
def list_by_category(category_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_category(category_id, current_user, db)
    return db.query(Assignment).filter(Assignment.category_id == category_id).all()


@router.post("/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(body: AssignmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = _own_category(body.category_id, current_user, db)
    data = body.model_dump()
    data["course_id"] = cat.course_id
    a = Assignment(**data)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(assignment_id: int, body: AssignmentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own_assignment(assignment_id, current_user, db)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own_assignment(assignment_id, current_user, db)
    db.delete(a)
    db.commit()


@router.put("/assignments/{assignment_id}/complete", status_code=204)
def set_completion(
    assignment_id: int,
    body: CompletionToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_assignment(assignment_id, current_user, db)
    existing = (
        db.query(AssignmentCompletion)
        .filter(
            AssignmentCompletion.assignment_id == assignment_id,
            AssignmentCompletion.occurrence_date == body.occurrence_date,
        )
        .first()
    )
    if body.completed and not existing:
        db.add(AssignmentCompletion(assignment_id=assignment_id, occurrence_date=body.occurrence_date))
        db.commit()
    elif not body.completed and existing:
        db.delete(existing)
        db.commit()


@router.get("/assignments/completions", response_model=List[date])
def list_completions_for_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_assignment(assignment_id, current_user, db)
    rows = db.query(AssignmentCompletion.occurrence_date).filter(AssignmentCompletion.assignment_id == assignment_id).all()
    return [r[0] for r in rows]
