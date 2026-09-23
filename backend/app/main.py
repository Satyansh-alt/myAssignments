from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import Base, engine
from app import models  # noqa: F401 — ensures all models are registered before create_all
from app.routers import auth, courses, categories, assignments, grades, dashboard, syllabus, ai, calendar

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="myAssignments API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(grades.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(syllabus.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
