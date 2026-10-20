from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.db.mongodb import get_database

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db = Depends(get_database)
) -> Dict[str, Any]:
    """Retrieve and validate authenticated user from Bearer header or HttpOnly cookie."""
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication session. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub") or payload.get("user_id")
    email = payload.get("email")

    user = None
    if user_id:
        user = db.users.find_one({"_id": user_id})
    if not user and email:
        user = db.users.find_one({"email": email.lower()})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account matching token does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account has been deactivated.",
        )

    user["id"] = str(user.get("_id", user_id))
    return user

async def get_optional_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db = Depends(get_database)
) -> Optional[Dict[str, Any]]:
    """Optionally resolve user if token is provided, without throwing 401 if missing."""
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        return None

    try:
        payload = decode_access_token(token)
        if not payload:
            return None
        user_id = payload.get("sub") or payload.get("user_id")
        email = payload.get("email")
        user = None
        if user_id:
            user = db.users.find_one({"_id": user_id})
        if not user and email:
            user = db.users.find_one({"email": email.lower()})
        if user and user.get("is_active", True):
            user["id"] = str(user.get("_id", user_id))
            return user
    except Exception:
        return None
    return None

def require_role(*allowed_roles: str):
    """Enforce role-based access control (e.g. require_role('admin'))."""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "citizen")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of authorized roles: {', '.join(allowed_roles)}.",
            )
        return current_user
    return role_checker

require_admin = require_role("admin")
require_citizen_or_admin = require_role("citizen", "admin")
