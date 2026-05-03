"""
POST /api/chat — main entry point for operator questions.
Calls the orchestrator and logs the exchange to MongoDB.
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from agents.orchestrator import orchestrate
from models.schemas import ChatRequest, ChatResponse
from services.mongodb_service import log_conversation

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    db = request.app.state.db

    try:
        result = await orchestrate(
            message=body.message,
            history=[m.model_dump() for m in body.history],
            user_role=body.user_role,
            db=db,
        )
    except Exception as e:
        print(f"[CHAT ROUTE] Orchestrator error: {e}")
        raise HTTPException(
            status_code=503,
            detail=(
                "Le service IA est temporairement indisponible. "
                "Veuillez réessayer dans quelques instants."
            ),
        )

    # Persist the conversation to MongoDB (fire-and-forget)
    try:
        await log_conversation(db, body.message, result, body.user_role)
    except Exception as e:
        print(f"[CHAT ROUTE] Failed to log conversation: {e}")

    result["timestamp"] = datetime.utcnow().isoformat()
    return result
