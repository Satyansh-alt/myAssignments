import json
from io import BytesIO
import pdfplumber
import anthropic
from app.config import get_settings

settings = get_settings()


def _extract_pdf_text(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return "\n".join(text_parts)


def parse_syllabus_text(text: str) -> list[dict]:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    prompt = (
        "You are a syllabus parser. Extract grade categories from the following syllabus text. "
        "Return ONLY valid JSON — an array of objects with keys: name (string), weight_percent (number 0-100), drop_count (integer, default 0). "
        "If you cannot find grade categories, return an empty array []. "
        "Do not include any explanation or markdown — just the raw JSON array.\n\n"
        f"Syllabus:\n{text}"
    )
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    categories = json.loads(raw)
    _validate_weights(categories)
    return categories


def parse_syllabus_pdf(file_bytes: bytes) -> list[dict]:
    text = _extract_pdf_text(file_bytes)
    if not text.strip():
        raise ValueError("Could not extract text from PDF")
    return parse_syllabus_text(text)


def parse_assignments_text(text: str, categories: list[dict]) -> list[dict]:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    category_names = ", ".join(c["name"] for c in categories) if categories else "Homework, Exam, Quiz, Lab, Project"
    prompt = (
        "You are a course schedule parser. Extract every assignment, quiz, exam, homework, lab, and project deadline "
        "from the following course schedule text.\n\n"
        f"The course has these grade categories: {category_names}\n\n"
        "Return ONLY valid JSON — an array of objects with these keys:\n"
        "  - name (string): descriptive assignment name e.g. 'Homework 1', 'Reading Quiz Week 2', 'Exam 1'\n"
        "  - due_date (string): ISO 8601 format YYYY-MM-DDTHH:MM:SS, use 23:59:00 if no time given. If the year is not specified assume 2026.\n"
        "  - category_name (string): must be one of the provided category names, pick the best match\n"
        "  - max_score (number): default 100 unless stated otherwise\n\n"
        "Rules:\n"
        "- Include every deadline you find\n"
        "- If an item says 'by 3pm' use T15:00:00\n"
        "- Do not include lecture dates, only deadlines/submissions\n"
        "- Return empty array [] if nothing found\n"
        "- No markdown, no explanation — raw JSON array only\n\n"
        f"Schedule:\n{text}"
    )
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def parse_assignments_pdf(file_bytes: bytes, categories: list[dict]) -> list[dict]:
    text = _extract_pdf_text(file_bytes)
    if not text.strip():
        raise ValueError("Could not extract text from PDF")
    return parse_assignments_text(text, categories)


def _validate_weights(categories: list[dict]) -> None:
    if not categories:
        return
    total = sum(c.get("weight_percent", 0) for c in categories)
    if not (99 <= total <= 101):
        raise ValueError(f"Weights sum to {total:.1f}%, expected ~100%")
