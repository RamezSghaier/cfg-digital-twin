"""
GET /api/segments — all rail segments with pre-computed rail risk scores.
Accessible by all authenticated users.
"""
from fastapi import APIRouter, Depends, Request

from deps.auth import get_current_user
from services.mongodb_service import get_all_segments
from services.rail_risk import calculate_rail_risk_score

router = APIRouter()


@router.get("/segments")
async def list_segments(
    request: Request,
    _user: dict = Depends(get_current_user),
):
    """Return all rail segments enriched with real-time rail risk scores."""
    db = request.app.state.db
    segments = await get_all_segments(db)

    enriched = []
    for seg in segments:
        risk = calculate_rail_risk_score(seg)
        health = max(0, 100 - risk["score"])

        # Map risk level to display color
        color = risk["color"]

        # French status label
        if risk["level"] == "CRITICAL":
            status = "CRITIQUE"
        elif risk["level"] == "HIGH":
            status = "ÉLEVÉ"
        elif risk["level"] == "MEDIUM":
            status = "MODÉRÉ"
        else:
            status = "BON"

        enriched.append({
            **seg,
            "rail_risk": risk,
            "health": health,
            "color": color,
            "status": status,
        })

    return {"segments": enriched}
