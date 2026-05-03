"""
Journal routes:
  GET  /api/journal                  — list of simulation history entries
  GET  /api/journal/{date}           — single entry for YYYY-MM-DD (null if none)
  GET  /api/journal/{date}/predict   — AI scenario prediction for a date
  POST /api/journal                  — create a new entry when a scenario is launched
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from agents.journal_agent import run_journal_agent
from deps.auth import get_current_user
from services.mongodb_service import (
    get_journal_entries,
    get_journal_entry_by_date,
    save_journal_entry,
)

router = APIRouter()


class JournalCreateBody(BaseModel):
    date: str          # YYYY-MM-DD
    scenario_id: str
    mode: str          # AUTO | MANUAL
    summary: str


@router.get("/journal")
async def list_journal(
    request: Request,
    month: int = None,
    year: int = None,
    limit: int = 50,
):
    db = request.app.state.db
    try:
        entries = await get_journal_entries(db, month=month, year=year, limit=limit)
        return {"entries": entries, "total": len(entries)}
    except Exception as e:
        print(f"[JOURNAL ROUTE] Error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Journal temporairement indisponible.",
        )


@router.get("/journal/{date}")
async def get_journal_date(date: str, request: Request):
    """Return a specific journal entry or null — frontend shows normal simulation if null."""
    db = request.app.state.db
    try:
        entry = await get_journal_entry_by_date(db, date)
        return {"entry": entry}
    except Exception as e:
        print(f"[JOURNAL ROUTE] Error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Journal temporairement indisponible.",
        )


@router.get("/journal/{date}/predict")
async def predict_scenario(
    date: str,
    request: Request,
    _user: dict = Depends(get_current_user),
):
    """
    AI prediction of the best scenario to simulate for a given date.
    Uses Open-Meteo historical weather + MongoDB segment data + Groq LLM.
    """
    db = request.app.state.db
    try:
        result = await run_journal_agent(db, date)
        return result
    except Exception as e:
        print(f"[JOURNAL ROUTE] Predict error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la génération de la prédiction IA.",
        )


@router.post("/journal")
async def create_journal_entry(body: JournalCreateBody, request: Request):
    """Called when an operator launches a scenario simulation."""
    db = request.app.state.db
    try:
        await save_journal_entry(db, body.model_dump())
        return {"success": True, "date": body.date}
    except Exception as e:
        print(f"[JOURNAL ROUTE] Create error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Impossible de créer l'entrée de journal.",
        )
