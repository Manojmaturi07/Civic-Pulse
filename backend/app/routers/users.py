from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.mongodb import get_database
from app.core.security import hash_password
from app.core.dependencies import require_admin
from app.schemas.auth import AdminCreateUserRequest, UserResponse
from app.routers.auth import format_user_response

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=List[UserResponse])
async def list_users(
    admin_user: dict = Depends(require_admin),
    db = Depends(get_database)
):
    """Admin-only: Retrieve all registered municipal users and citizens."""
    users = list(db.users.find())
    return [format_user_response(u) for u in users]

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    req: AdminCreateUserRequest,
    admin_user: dict = Depends(require_admin),
    db = Depends(get_database)
):
    """
    Admin-only: Provision internal municipal staff or officer accounts with elevated roles.
    """
    clean_email = req.email.strip().lower()
    existing = db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": req.name.strip(),
        "email": clean_email,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "city": req.city or "Vijayawada",
        "department": req.department or "Municipal Administration",
        "avatar": "👷" if req.role == "admin" else "👤",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    res = db.users.insert_one(user_doc)
    user_doc["_id"] = str(getattr(res, "inserted_id", clean_email))
    return format_user_response(user_doc)
