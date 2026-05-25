"""
Segment routes:
  GET    /api/segments              — all segments with risk scores (all auth users)
  PUT    /api/segments/{segment_id} — update editable fields (admin only)
  DELETE /api/segments/{segment_id} — delete a segment (admin only)
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from deps.auth import get_current_user, require_admin
from services.mongodb_service import delete_segment, get_all_segments, update_segment
from services.rail_risk import calculate_rail_risk_score

router = APIRouter()


class SegmentUpdatePayload(BaseModel):
    rayon_m:     Optional[float] = None
    devers_mm:   Optional[float] = None
    statut:      Optional[str]   = None   # "NORMAL" | "ALERTE"
    gare_proche: Optional[str]   = None


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
        color = risk["color"]

        if risk["level"] == "CRITICAL":
            status = "CRITIQUE"
        elif risk["level"] == "HIGH":
            status = "ÉLEVÉ"
        elif risk["level"] == "MEDIUM":
            status = "MODÉRÉ"
        else:
            status = "BON"

        enriched.append({**seg, "rail_risk": risk, "health": health, "color": color, "status": status})

    return {"segments": enriched}


@router.put("/segments/{segment_id}")
async def update_segment_route(
    segment_id: str,
    payload: SegmentUpdatePayload,
    request: Request,
    _admin: dict = Depends(require_admin),
):
    """Update editable fields on a segment. Admin only."""
    db = request.app.state.db
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour.")
    updated = await update_segment(db, segment_id, fields)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Segment '{segment_id}' introuvable.")
    return {"success": True, "segment": updated}


@router.delete("/segments/{segment_id}")
async def delete_segment_route(
    segment_id: str,
    request: Request,
    _admin: dict = Depends(require_admin),
):
    """Delete a segment. Admin only."""
    db = request.app.state.db
    deleted = await delete_segment(db, segment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Segment '{segment_id}' introuvable.")
    return {"success": True}
