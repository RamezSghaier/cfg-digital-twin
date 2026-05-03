"""
Firebase JWT verification + role-based access control.

Flow:
  1. Frontend sends Firebase ID token in `Authorization: Bearer <token>` header.
  2. `get_current_user` fetches Google's public certs, verifies the JWT,
     and looks up the user's role in MongoDB `users` collection.
  3. `require_admin` wraps `get_current_user` and rejects non-admins with 403.

No Firebase Admin SDK or service account required — verification uses
Google's public RSA keys (JWKS-style X.509 certs, auto-cached in memory).
"""
from typing import Optional

import httpx
from fastapi import Depends, Header, HTTPException, Request
from jose import ExpiredSignatureError, JWTError, jwt

FIREBASE_PROJECT_ID = "jumeau-numerique-77bfa"
_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

# In-memory cert cache — cleared on kid miss so keys rotate automatically
_cert_cache: dict[str, str] = {}


async def _get_certs() -> dict[str, str]:
    global _cert_cache
    if _cert_cache:
        return _cert_cache
    async with httpx.AsyncClient() as client:
        resp = await client.get(_CERTS_URL, timeout=10)
        resp.raise_for_status()
        _cert_cache = resp.json()
    return _cert_cache


async def _verify_token(token: str) -> dict:
    """Decode and verify a Firebase ID token. Returns the JWT payload."""
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        certs = await _get_certs()

        if kid not in certs:
            _cert_cache.clear()
            certs = await _get_certs()

        if kid not in certs:
            raise HTTPException(status_code=401, detail="Clé de signature Firebase invalide.")

        payload = jwt.decode(
            token,
            certs[kid],
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
        )
        return payload

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée. Veuillez vous reconnecter.")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Token invalide: {exc}")


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    FastAPI dependency — extracts and verifies the Bearer token,
    then resolves the user's role from MongoDB.

    Returns: { uid, role, email }
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token d'authentification manquant. Incluez 'Authorization: Bearer <token>'.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    payload = await _verify_token(token)

    uid: Optional[str] = payload.get("user_id") or payload.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="UID introuvable dans le token.")

    db = request.app.state.db
    user_doc = await db.users.find_one({"uid": uid}, {"_id": 0})
    role = user_doc.get("role", "user") if user_doc else "user"

    return {"uid": uid, "role": role, "email": payload.get("email", "")}


async def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    FastAPI dependency — same as get_current_user but raises 403 if not admin.
    Use as: `current_user: dict = Depends(require_admin)`
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux administrateurs.",
        )
    return current_user
