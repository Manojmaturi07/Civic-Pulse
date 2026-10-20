from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=4, max_length=128)
    city: Optional[str] = "Vijayawada"
    department: Optional[str] = "Resident"

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    department: Optional[str] = None
    avatar: Optional[str] = None

class AdminCreateUserRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=4)
    role: str = Field("admin", pattern="^(admin|citizen)$")
    city: Optional[str] = "Vijayawada"
    department: Optional[str] = "Municipal Administration"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    city: str
    department: str
    avatar: str = "👤"
    is_active: bool = True
    created_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
