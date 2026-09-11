import json
from datetime import datetime
from sqlalchemy.orm import Session
import anthropic
from app.config import get_settings
from app.models.course import Course
from app.models.category import GradeCategory
from app.models.assignment import Assignment
from app.services.grade_service import calculate_course_grade

settings = get_settings()

AI_TOOLS = [
    {
        "name": "get_grade_summary",
        "description": "Get the current grade summary for a specific course.",
        "input_schema": {
            "type": "object",
            "properties": {"course_id": {"type": "integer", "description": "The course ID"}},
            "required": ["course_id"],
        },
    },
    {
        "name": "add_assignment",
        "description": "Add a new assignment to a grade category.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {"type": "integer"},
                "name": {"type": "string"},
                "max_score": {"type": "number"},
                "earned_score": {"type": "number", "description": "Omit if not yet graded"},
                "due_date": {"type": "string", "description": "ISO 8601 datetime or null"},
                "notes": {"type": "string"},
            },
            "required": ["category_id", "name", "max_score"],
        },
    },
    {
        "name": "update_assignment",
        "description": "Update an existing assignment (e.g., add a score after grading).",
        "input_schema": {
            "type": "object",
            "properties": {
                "assignment_id": {"type": "integer"},
                "name": {"type": "string"},
                "earned_score": {"type": "number"},
                "max_score": {"type": "number"},
                "due_date": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["assignment_id"],
        },
    },
    {
        "name": "delete_assignment",
        "description": "Delete an assignment by ID.",
        "input_schema": {
            "type": "object",
            "properties": {"assignment_id": {"type": "integer"}},
            "required": ["assignment_id"],
        },
    },
    {
        "name": "add_category",
        "description": "Add a grade category to a course.",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {"type": "integer"},
                "name": {"type": "string"},
                "weight_percent": {"type": "number", "description": "0–100"},
                "drop_count": {"type": "integer", "description": "How many lowest scores to drop"},
            },
            "required": ["course_id", "name", "weight_percent"],
        },
    },
]

WRITE_TOOLS = {"add_assignment", "update_assignment", "delete_assignment", "add_category"}


def _build_context(user_id: int, db: Session) -> str:
    courses = db.query(Course).filter(Course.user_id == user_id).all()
    data = []
    for course in courses:
        cats = []
        for cat in course.categories:
            assignments = []
            for a in cat.assignments:
                assignments.append({
                    "id": a.id,
                    "name": a.name,
                    "max_score": a.max_score,
                    "earned_score": a.earned_score,
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                    "graded": a.earned_score is not None,
                })
            cats.append({
                "id": cat.id,
                "name": cat.name,
                "weight_percent": round(cat.weight * 100, 2),
                "drop_count": cat.drop_count,
                "assignments": assignments,
            })
        data.append({"id": course.id, "name": course.name, "semester": course.semester, "categories": cats})
    return json.dumps(data, indent=2)


def execute_tool(tool_name: str, tool_input: dict, user_id: int, db: Session) -> dict:
    if tool_name == "get_grade_summary":
        course_id = tool_input["course_id"]
        course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
        if not course:
            return {"error": "Course not found"}
        return calculate_course_grade(course_id, db)

    if tool_name == "add_assignment":
        cat = db.query(GradeCategory).filter(GradeCategory.id == tool_input["category_id"]).first()
        if not cat:
            return {"error": "Category not found"}
        due = None
        if tool_input.get("due_date"):
            try:
                due = datetime.fromisoformat(tool_input["due_date"])
            except ValueError:
                pass
        assignment = Assignment(
            category_id=cat.id,
            course_id=cat.course_id,
            name=tool_input["name"],
            max_score=tool_input["max_score"],
            earned_score=tool_input.get("earned_score"),
            due_date=due,
            notes=tool_input.get("notes"),
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return {"success": True, "assignment_id": assignment.id, "name": assignment.name}

    if tool_name == "update_assignment":
        a = db.query(Assignment).filter(Assignment.id == tool_input["assignment_id"]).first()
        if not a:
            return {"error": "Assignment not found"}
        for field in ("name", "earned_score", "max_score", "notes"):
            if field in tool_input:
                setattr(a, field, tool_input[field])
        if "due_date" in tool_input and tool_input["due_date"]:
            try:
                a.due_date = datetime.fromisoformat(tool_input["due_date"])
            except ValueError:
                pass
        db.commit()
        return {"success": True, "assignment_id": a.id}

    if tool_name == "delete_assignment":
        a = db.query(Assignment).filter(Assignment.id == tool_input["assignment_id"]).first()
        if not a:
            return {"error": "Assignment not found"}
        db.delete(a)
        db.commit()
        return {"success": True}

    if tool_name == "add_category":
        cat = GradeCategory(
            course_id=tool_input["course_id"],
            name=tool_input["name"],
            weight=tool_input["weight_percent"] / 100,
            drop_count=tool_input.get("drop_count", 0),
        )
        db.add(cat)
        db.commit()
        db.refresh(cat)
        return {"success": True, "category_id": cat.id}

    return {"error": f"Unknown tool: {tool_name}"}


def chat(message: str, conversation_history: list, user_id: int, db: Session) -> dict:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    context = _build_context(user_id, db)
    system = (
        f"You are a helpful grade tracking assistant. You have full access to the user's course data below.\n\n"
        f"Current data (today is {datetime.now().strftime('%Y-%m-%d')}):\n{context}\n\n"
        "Rules:\n"
        "- For read-only questions, answer directly and helpfully.\n"
        "- Before calling any write tool (add_assignment, update_assignment, delete_assignment, add_category), "
        "first describe what you plan to do in plain language and ask the user to confirm. "
        "Only call write tools AFTER the user says yes or confirms.\n"
        "- If the user confirms a pending action you described, go ahead and call the tool.\n"
        "- Be concise and friendly."
    )
    messages = list(conversation_history) + [{"role": "user", "content": message}]
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system,
        tools=AI_TOOLS,
        messages=messages,
    )

    # Check if AI wants to call a write tool — intercept it
    for block in response.content:
        if block.type == "tool_use" and block.name in WRITE_TOOLS:
            text_blocks = [b.text for b in response.content if b.type == "text"]
            description = text_blocks[0] if text_blocks else f"I'd like to {block.name.replace('_', ' ')}."
            return {
                "response": description,
                "pending_action": {"tool": block.name, "args": block.input, "tool_use_id": block.id},
                "stop_reason": "pending_confirmation",
            }

    # Handle read-only tool calls (get_grade_summary) by executing them inline
    if response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input, user_id, db)
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result)})

        messages_with_result = messages + [
            {"role": "assistant", "content": response.content},
            {"role": "user", "content": tool_results},
        ]
        follow_up = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=system,
            tools=AI_TOOLS,
            messages=messages_with_result,
        )
        text = " ".join(b.text for b in follow_up.content if b.type == "text")
        return {"response": text, "pending_action": None}

    text = " ".join(b.text for b in response.content if b.type == "text")
    return {"response": text, "pending_action": None}
