"""
Service suspension routes (admin only):

  POST /api/suspension          — create a suspension
  GET  /api/suspension/active   — current active suspension (all users)
  GET  /api/suspension/history  — past + active suspensions (admin)
  DELETE /api/suspension/{id}   — cancel a suspension early (admin)
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from deps.auth import get_current_user, require_admin
from services.mongodb_service import serialize_doc

router = APIRouter()


class SuspensionPayload(BaseModel):
    segment_id: str          # 'ALL' or a specific segment like 'B-01'
    reason: str              # 'TECHNIQUE' or 'METEOROLOGIQUE'
    message: str             # Custom message shown to all users
    end_date: str            # ISO string: "2026-05-04T18:00:00"


# ── Create suspension (admin only) ────────────────────────────────────────────

@router.post("/suspension")
async def create_suspension(
    payload: SuspensionPayload,
    request: Request,
    admin: dict = Depends(require_admin),
):
    try:
        end_dt = datetime.fromisoformat(payload.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide. Utilisez ISO 8601.")

    if end_dt <= datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="La date de fin doit être dans le futur.")

    db = request.app.state.db
    doc = {
        "segment_id": payload.segment_id,
        "reason": payload.reason,
        "message": payload.message,
        "created_by": admin["uid"],
        "created_at": datetime.utcnow(),
        "end_date": end_dt,
        "cancelled": False,
    }
    result = await db.suspensions.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"success": True, "suspension": serialize_doc(doc)}


# ── Get active suspension (all authenticated users) ───────────────────────────

@router.get("/suspension/active")
async def get_active_suspension(
    request: Request,
    _user: dict = Depends(get_current_user),
):
    """Returns the first active (non-cancelled, not expired) suspension if any."""
    db = request.app.state.db
    now = datetime.utcnow()
    doc = await db.suspensions.find_one(
        {"cancelled": False, "end_date": {"$gt": now}},
        sort=[("created_at", -1)],
    )
    if not doc:
        return {"active": False, "suspension": None}
    return {"active": True, "suspension": serialize_doc(doc)}


# ── Suspension history (admin only) ───────────────────────────────────────────

@router.get("/suspension/history")
async def suspension_history(
    request: Request,
    _admin: dict = Depends(require_admin),
):
    db = request.app.state.db
    cursor = db.suspensions.find({}, sort=[("created_at", -1)]).limit(50)
    docs = [serialize_doc(d) async for d in cursor]
    return {"suspensions": docs}


# ── Cancel suspension (admin only) ────────────────────────────────────────────

@router.delete("/suspension/{suspension_id}")
async def cancel_suspension(
    suspension_id: str,
    request: Request,
    _admin: dict = Depends(require_admin),
):
    try:
        oid = ObjectId(suspension_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID de suspension invalide.")

    db = request.app.state.db
    result = await db.suspensions.update_one(
        {"_id": oid, "cancelled": False},
        {"$set": {"cancelled": True, "cancelled_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Suspension introuvable ou déjà annulée.")
    return {"success": True}
