"""
POST /api/train/position — receives real-time GPS data from the ESP32.
GET  /api/train/latest   — most recent GPS fix from MongoDB.
"""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from deps.auth import get_current_user
from services.mongodb_service import serialize_doc

router = APIRouter()


# ── Pydantic model ─────────────────────────────────────────────────────────

class TrainPosition(BaseModel):
    lat:        float = Field(..., ge=-90,   le=90,   description="Latitude (WGS-84)")
    lng:        float = Field(..., ge=-180,  le=180,  description="Longitude (WGS-84)")
    speed_kmh:  float = Field(..., ge=0,              description="Speed in km/h")
    altitude_m: float = Field(...,                    description="Altitude in metres")
    satellites: int   = Field(..., ge=0,              description="GPS satellites used")
    timestamp:  str   = Field(...,                    description="ISO 8601 UTC timestamp from GPS")


# ── Helpers ────────────────────────────────────────────────────────────────

def _compute_risk(speed_kmh: float) -> Literal["LOW", "MEDIUM", "HIGH"]:
    """
    Simple speed-based risk level.
    Segment B-01 (Redeyef — M'dhilla) has the sharpest curves (rayon 310 m);
    at high speed, curve stress rises sharply — flag it early.
    """
    if speed_kmh > 90:
        return "HIGH"
    if speed_kmh > 60:
        return "MEDIUM"
    return "LOW"


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/train/latest")
async def latest_position(
    request: Request,
    _user: dict = Depends(get_current_user),
):
    """Return the most recent GPS fix received from the ESP32, or null."""
    db = request.app.state.db
    doc = await db.train_positions.find_one(
        {}, sort=[("received_at", -1)]
    )
    if not doc:
        return {"position": None}
    return {"position": serialize_doc(doc)}


@router.post("/train/position")
async def receive_train_position(request: Request, body: TrainPosition):
    """
    Called by the ESP32 every 3 seconds.
    Stores the GPS fix in the `train_positions` collection and returns
    a risk assessment the ESP32 can optionally display on an LED/screen.
    """
    db = request.app.state.db

    doc = {
        **body.model_dump(),
        "received_at": datetime.utcnow(),
    }
    await db.train_positions.insert_one(doc)

    risk = _compute_risk(body.speed_kmh)
    print(
        f"[TRAIN] lat={body.lat:.5f}  lng={body.lng:.5f}  "
        f"speed={body.speed_kmh:.1f} km/h  sats={body.satellites}  "
        f"risk={risk}"
    )

    return {"status": "ok", "risk_level": risk}
