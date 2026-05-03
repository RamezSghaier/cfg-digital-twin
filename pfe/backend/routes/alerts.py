"""
Alert routes:
  GET  /api/alerts          — all unacknowledged alerts (runs fresh curvature check)
  POST /api/alerts/{id}/acknowledge — mark alert as read
  GET  /api/alerts/count    — badge count for the frontend bell icon
"""
from fastapi import APIRouter, Depends, HTTPException, Request

from agents.curvature_agent import run_curvature_agent
from deps.auth import require_admin
from services.mongodb_service import (
    acknowledge_alert,
    count_active_alerts,
    get_unacknowledged_alerts,
)

router = APIRouter()


@router.get("/alerts")
async def get_alerts(
    request: Request,
    _admin: dict = Depends(require_admin),
):
    """Return all unacknowledged alerts after running a fresh curvature check. Admin only."""
    db = request.app.state.db

    # Run curvature agent to discover and store any new alerts
    try:
        await run_curvature_agent(db)
    except Exception as e:
        print(f"[ALERTS ROUTE] Curvature agent error: {e}")

    try:
        alerts = await get_unacknowledged_alerts(db)
        return {"alerts": alerts, "count": len(alerts)}
    except Exception as e:
        print(f"[ALERTS ROUTE] DB error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Impossible de récupérer les alertes. Base de données indisponible.",
        )


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge(
    alert_id: str,
    request: Request,
    _admin: dict = Depends(require_admin),
):
    """Mark an alert as acknowledged. Admin only."""
    db = request.app.state.db
    try:
        updated = await acknowledge_alert(db, alert_id)
        if updated is None:
            raise HTTPException(status_code=404, detail="Alerte introuvable.")
        return {"success": True, "alert": updated}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ALERTS ROUTE] Acknowledge error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de l'acquittement de l'alerte.",
        )


@router.get("/alerts/count")
async def alerts_count(
    request: Request,
    _admin: dict = Depends(require_admin),
):
    """Return the number of unacknowledged alerts (used by the frontend badge). Admin only."""
    db = request.app.state.db
    try:
        count = await count_active_alerts(db)
        return {"count": count}
    except Exception as e:
        print(f"[ALERTS ROUTE] Count error: {e}")
        return {"count": 0}
