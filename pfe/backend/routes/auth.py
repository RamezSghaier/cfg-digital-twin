"""
Auth routes:
  POST /api/auth/sync                        — mirror role to MongoDB after login
  GET  /api/auth/me                          — current user info
  GET  /api/auth/pending-admins              — list pending admin requests (admin only)
  POST /api/auth/pending-admins/{uid}/approve — approve a pending admin (admin only)
  POST /api/auth/pending-admins/{uid}/reject  — reject → downgrade to user (admin only)
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from config import settings
from deps.auth import get_current_user, require_admin
from services.mongodb_service import serialize_doc

router = APIRouter()


class SyncPayload(BaseModel):
    role: str   # 'admin', 'user', or 'pending_admin'


@router.post("/auth/sync")
async def sync_user(
    payload: SyncPayload,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    if payload.role not in ("admin", "user", "pending_admin"):
        raise HTTPException(status_code=400, detail="Rôle invalide.")

    db = request.app.state.db

    # First-admin bootstrap: promote only if no admins exist AND this is the
    # designated first-admin email (set via FIRST_ADMIN_EMAIL in .env).
    # If FIRST_ADMIN_EMAIL is not configured, nobody is auto-promoted.
    effective_role = payload.role
    if payload.role == "pending_admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        user_email = current_user.get("email", "")
        if admin_count == 0 and settings.first_admin_email and user_email.strip().lower() == settings.first_admin_email.strip().lower():
            effective_role = "admin"

    await db.users.update_one(
        {"uid": current_user["uid"]},
        {
            "$set": {
                "uid": current_user["uid"],
                "role": effective_role,
                "email": current_user.get("email", ""),
                "updated_at": datetime.utcnow(),
            },
            "$setOnInsert": {"created_at": datetime.utcnow()},
        },
        upsert=True,
    )
    return {"success": True, "uid": current_user["uid"], "role": effective_role}


@router.get("/auth/me")
async def me(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Returns uid, role, email, and whether a MongoDB profile exists."""
    db = request.app.state.db
    doc = await db.users.find_one({"uid": current_user["uid"]}, {"_id": 0})
    profile_exists = doc is not None
    # Use role from MongoDB doc directly so profile_exists=False is never masked
    role = doc.get("role", "user") if doc else None
    return {
        "uid": current_user["uid"],
        "email": current_user["email"],
        "role": role,
        "profile_exists": profile_exists,
    }


# ── Pending admin requests ────────────────────────────────────────────────────

@router.get("/auth/pending-admins")
async def get_pending_admins(
    request: Request,
    _admin: dict = Depends(require_admin),
):
    """List all users with role pending_admin. Admin only."""
    db = request.app.state.db
    cursor = db.users.find({"role": "pending_admin"}, {"_id": 0})
    docs = [serialize_doc(d) async for d in cursor]
    return {"pending_admins": docs, "count": len(docs)}


@router.post("/auth/pending-admins/{uid}/approve")
async def approve_admin(
    uid: str,
    request: Request,
    admin: dict = Depends(require_admin),
):
    """Promote a pending_admin to admin. Admin only."""
    db = request.app.state.db
    result = await db.users.update_one(
        {"uid": uid, "role": "pending_admin"},
        {"$set": {
            "role": "admin",
            "approved_by": admin["uid"],
            "approved_at": datetime.utcnow(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande introuvable ou déjà traitée.")
    return {"success": True}


@router.post("/auth/pending-admins/{uid}/reject")
async def reject_admin(
    uid: str,
    request: Request,
    admin: dict = Depends(require_admin),
):
    """Reject a pending_admin request — downgrade to regular user. Admin only."""
    db = request.app.state.db
    result = await db.users.update_one(
        {"uid": uid, "role": "pending_admin"},
        {"$set": {
            "role": "user",
            "rejected_by": admin["uid"],
            "rejected_at": datetime.utcnow(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande introuvable ou déjà traitée.")
    return {"success": True}
