from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.user import User
from app.services.ai_service import chat, execute_tool
from app.dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: List[Message] = []


class ConfirmRequest(BaseModel):
    tool: str
    args: dict
    confirmed: bool


@router.post("/chat")
def ai_chat(body: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    history = [{"role": m.role, "content": m.content} for m in body.conversation_history]
    return chat(body.message, history, current_user.id, db)


@router.post("/confirm")
def ai_confirm(body: ConfirmRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.confirmed:
        return {"response": "Got it, I won't make that change.", "executed": False}
    result = execute_tool(body.tool, body.args, current_user.id, db)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return {"response": "Done! I've made that change.", "executed": True, "result": result}
