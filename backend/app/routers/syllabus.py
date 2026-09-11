from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.course import Course
from app.models.category import GradeCategory
from app.models.assignment import Assignment
from app.models.user import User
from app.services.syllabus_service import (
    parse_syllabus_text, parse_syllabus_pdf,
    parse_assignments_text, parse_assignments_pdf,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/syllabus", tags=["syllabus"])


class ParseTextRequest(BaseModel):
    course_id: int
    text: str


class CategoryApply(BaseModel):
    name: str
    weight_percent: float
    drop_count: int = 0


class ApplyRequest(BaseModel):
    course_id: int
    categories: List[CategoryApply]


class AssignmentImport(BaseModel):
    name: str
    due_date: Optional[str] = None
    category_name: str
    max_score: float = 100


class ApplyAssignmentsRequest(BaseModel):
    course_id: int
    assignments: List[AssignmentImport]


def _own_course(course_id: int, user: User, db: Session) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_categories(course_id: int, db: Session) -> list[dict]:
    cats = db.query(GradeCategory).filter(GradeCategory.course_id == course_id).all()
    return [{"id": c.id, "name": c.name} for c in cats]


# ── Grade category endpoints ──────────────────────────────────────────────────

@router.post("/parse-text")
def parse_text(body: ParseTextRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_course(body.course_id, current_user, db)
    try:
        categories = parse_syllabus_text(body.text)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"categories": categories}


@router.post("/parse-pdf")
async def parse_pdf(
    course_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_course(course_id, current_user, db)
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    file_bytes = await file.read()
    try:
        categories = parse_syllabus_pdf(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"categories": categories}


@router.post("/apply", status_code=201)
def apply_categories(body: ApplyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_course(body.course_id, current_user, db)
    created = []
    for c in body.categories:
        cat = GradeCategory(course_id=body.course_id, name=c.name, weight=c.weight_percent / 100, drop_count=c.drop_count)
        db.add(cat)
        db.flush()
        created.append({"id": cat.id, "name": cat.name, "weight_percent": c.weight_percent})
    db.commit()
    return {"created": created}


# ── Assignment import endpoints ───────────────────────────────────────────────

@router.post("/parse-assignments-text")
def parse_asgn_text(body: ParseTextRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_course(body.course_id, current_user, db)
    categories = _get_categories(body.course_id, db)
    try:
        assignments = parse_assignments_text(body.text, categories)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"assignments": assignments, "categories": categories}


@router.post("/parse-assignments-pdf")
async def parse_asgn_pdf(
    course_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_course(course_id, current_user, db)
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    file_bytes = await file.read()
    categories = _get_categories(course_id, db)
    try:
        assignments = parse_assignments_pdf(file_bytes, categories)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"assignments": assignments, "categories": categories}


@router.post("/apply-assignments", status_code=201)
def apply_assignments(body: ApplyAssignmentsRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_course(body.course_id, current_user, db)
    cats = {c.name.lower(): c for c in db.query(GradeCategory).filter(GradeCategory.course_id == body.course_id).all()}
    created = []
    skipped = []
    for a in body.assignments:
        cat = cats.get(a.category_name.lower())
        if not cat:
            # fuzzy match — find category whose name contains the given name or vice versa
            for cname, cobj in cats.items():
                if a.category_name.lower() in cname or cname in a.category_name.lower():
                    cat = cobj
                    break
        if not cat:
            skipped.append(a.name)
            continue
        due = None
        if a.due_date:
            try:
                due = datetime.fromisoformat(a.due_date)
            except ValueError:
                pass
        assignment = Assignment(
            category_id=cat.id,
            course_id=body.course_id,
            name=a.name,
            max_score=a.max_score,
            due_date=due,
        )
        db.add(assignment)
        created.append(a.name)
    db.commit()
    return {"created": len(created), "skipped": skipped}
