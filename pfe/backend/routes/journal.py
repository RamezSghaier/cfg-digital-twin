"""
Journal routes:
  GET  /api/journal                        — list of simulation history entries
  GET  /api/journal/future-predictions     — stored AI predictions for future dates
  POST /api/journal/analyze-upcoming       — batch-predict next N days and cache results
  GET  /api/journal/{date}                 — single entry for YYYY-MM-DD (null if none)
  GET  /api/journal/{date}/predict         — AI scenario prediction for a date (auto-saved)
  POST /api/journal                        — create a new entry when a scenario is launched
"""
import asyncio
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from agents.journal_agent import run_journal_agent
from deps.auth import get_current_user
from services.mongodb_service import (
    get_future_predictions,
    get_journal_entries,
    get_journal_entry_by_date,
    save_journal_entry,
    save_prediction,
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
        raise HTTPException(status_code=503, detail="Journal temporairement indisponible.")


# ── Must be defined BEFORE /{date} to avoid route shadowing ──────────────────

@router.get("/journal/future-predictions")
async def future_predictions(
    request: Request,
    _user: dict = Depends(get_current_user),
):
    """Return all stored predictions for today and beyond."""
    db = request.app.state.db
    from_date = date.today().isoformat()
    try:
        preds = await get_future_predictions(db, from_date)
        return {"predictions": preds}
    except Exception as e:
        print(f"[JOURNAL ROUTE] future-predictions error: {e}")
        raise HTTPException(status_code=503, detail="Prédictions temporairement indisponibles.")


@router.post("/journal/analyze-upcoming")
async def analyze_upcoming(
    request: Request,
    days: int = Query(default=14, ge=1, le=30),
    _user: dict = Depends(get_current_user),
):
    """
    Pre-compute and cache AI predictions for the next `days` days.
    Already-cached dates are skipped. Returns all predictions when done.
    """
    db = request.app.state.db
    today = date.today()
    target_dates = [
        (today + timedelta(days=i + 1)).isoformat() for i in range(days)
    ]

    # Fetch already-cached dates to skip them
    existing = await get_future_predictions(db, today.isoformat())
    cached_dates = {p["date"] for p in existing}
    to_compute = [d for d in target_dates if d not in cached_dates]

    # Run predictions in batches of 3 to avoid rate-limiting
    new_predictions = []
    for i in range(0, len(to_compute), 3):
        batch = to_compute[i:i + 3]
        results = await asyncio.gather(
            *[run_journal_agent(db, d) for d in batch],
            return_exceptions=True,
        )
        for d, result in zip(batch, results):
            if isinstance(result, Exception):
                print(f"[JOURNAL ROUTE] Batch prediction error for {d}: {result}")
                continue
            await save_prediction(db, d, result)
            new_predictions.append(result)
        if i + 3 < len(to_compute):
            await asyncio.sleep(0.5)

    all_predictions = await get_future_predictions(db, today.isoformat())
    return {
        "predictions": all_predictions,
        "computed": len(new_predictions),
        "skipped": len(cached_dates),
    }


# ── Parameterised routes (must come after literal routes above) ───────────────

@router.get("/journal/{date}")
async def get_journal_date(date: str, request: Request):
    """Return a specific journal entry or null."""
    db = request.app.state.db
    try:
        entry = await get_journal_entry_by_date(db, date)
        return {"entry": entry}
    except Exception as e:
        print(f"[JOURNAL ROUTE] Error: {e}")
        raise HTTPException(status_code=503, detail="Journal temporairement indisponible.")


@router.get("/journal/{date}/predict")
async def predict_scenario(
    date: str,
    request: Request,
    _user: dict = Depends(get_current_user),
):
    """
    AI prediction for a given date. Result is automatically saved to the
    predictions collection so it appears on the calendar.
    """
    db = request.app.state.db
    try:
        result = await run_journal_agent(db, date)
        result["date"] = date  # ensure date is always present (fallback may omit it)
        await save_prediction(db, date, result)
        return result
    except Exception as e:
        print(f"[JOURNAL ROUTE] Predict error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la génération de la prédiction IA.")


@router.post("/journal")
async def create_journal_entry(body: JournalCreateBody, request: Request):
    """Called when an operator launches a scenario simulation."""
    db = request.app.state.db
    try:
        await save_journal_entry(db, body.model_dump())
        return {"success": True, "date": body.date}
    except Exception as e:
        print(f"[JOURNAL ROUTE] Create error: {e}")
        raise HTTPException(status_code=500, detail="Impossible de créer l'entrée de journal.")
