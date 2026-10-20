from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.mongodb import get_database
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserUpdateRequest, UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

def format_user_response(user_doc: dict) -> UserResponse:
    return UserResponse(
        id=str(user_doc.get("_id", user_doc.get("id"))),
        name=user_doc.get("name", "User"),
        email=user_doc.get("email", ""),
        role=user_doc.get("role", "citizen"),
        city=user_doc.get("city", "Vijayawada"),
        department=user_doc.get("department", "Resident"),
        avatar=user_doc.get("avatar", "👤"),
        is_active=user_doc.get("is_active", True),
        created_at=user_doc.get("created_at")
    )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegisterRequest, db = Depends(get_database)):
    """
    Public registration endpoint.
    MANDATORY SECURITY RULE: All public registrations are STRICTLY assigned the 'citizen' role.
    No administrative or officer accounts can be provisioned through public registration.
    """
    clean_email = req.email.strip().lower()
    existing = db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in instead."
        )

    now = datetime.now(timezone.utc)
    hashed = hash_password(req.password)

    user_doc = {
        "name": req.name.strip(),
        "email": clean_email,
        "password_hash": hashed,
        "role": "citizen",  # Strictly enforce citizen role
        "city": req.city or "Vijayawada",
        "department": req.department or "Resident",
        "avatar": "👤",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    res = db.users.insert_one(user_doc)
    user_doc["_id"] = str(getattr(res, "inserted_id", clean_email))

    token = create_access_token(
        subject=user_doc["_id"],
        role=user_doc["role"],
        email=user_doc["email"]
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=format_user_response(user_doc)
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest, db = Depends(get_database)):
    """Authenticate registered users via email and Argon2 password verification."""
    clean_email = req.email.strip().lower()
    user = db.users.find_one({"email": clean_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact municipal support."
        )

    password_hash = user.get("password_hash")
    if not password_hash or not verify_password(req.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    user_id = str(user.get("_id", clean_email))
    token = create_access_token(
        subject=user_id,
        role=user.get("role", "citizen"),
        email=user.get("email")
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=format_user_response(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve currently authenticated user profile based on bearer JWT token."""
    return format_user_response(current_user)

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    req: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update profile details for the authenticated user."""
    user_id = str(current_user.get("_id", current_user.get("id")))
    updates = {}
    if req.name is not None and req.name.strip():
        updates["name"] = req.name.strip()
    if req.city is not None:
        updates["city"] = req.city.strip()
    if req.department is not None:
        updates["department"] = req.department.strip()
    if req.avatar is not None:
        updates["avatar"] = req.avatar

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        db.users.update_one(
            {"$or": [{"_id": user_id}, {"id": user_id}, {"email": current_user.get("email")}]},
            {"$set": updates}
        )
        current_user.update(updates)

    return format_user_response(current_user)

@router.post("/logout")
async def logout():
    """Invalidate or acknowledge client-side session termination."""
    return {"success": True, "message": "Successfully logged out."}
