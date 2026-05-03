"""
Auth routes:
  POST /api/auth/sync — called by frontend after login to mirror Firestore
                        role into MongoDB so the backend can enforce it.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from deps.auth import get_current_user

router = APIRouter()


class SyncPayload(BaseModel):
    role: str   # 'admin' or 'user'


@router.post("/auth/sync")
async def sync_user(
    payload: SyncPayload,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Upserts { uid, role, email } in MongoDB `users` collection.
    The Firebase token in the Authorization header is verified first,
    so the uid cannot be spoofed.
    Only 'admin' and 'user' are accepted roles.
    """
    if payload.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Rôle invalide. Valeurs acceptées: 'admin', 'user'.")

    db = request.app.state.db
    await db.users.update_one(
        {"uid": current_user["uid"]},
        {
            "$set": {
                "uid": current_user["uid"],
                "role": payload.role,
                "email": current_user.get("email", ""),
            }
        },
        upsert=True,
    )
    return {"success": True, "uid": current_user["uid"], "role": payload.role}


@router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Returns the current user's uid, role and email."""
    return current_user
