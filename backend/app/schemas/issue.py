from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class IssueCreate(BaseModel):
    type: str = Field(..., min_length=2)
    description: str = Field(..., min_length=5)
    area: str = Field(..., min_length=2)
    city: str = Field(default="Vijayawada")
    lat: Optional[float] = None
    lng: Optional[float] = None
    photo: Optional[str] = None

class IssueUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Pending|Assigned|In Progress|Resolved)$")
    department: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(Low|Medium|High|Critical)$")
    description: Optional[str] = None
    severity: Optional[int] = Field(None, ge=1, le=10)

class IssueResponse(BaseModel):
    id: str
    issue_code: str
    user_id: Optional[str] = None
    type: str
    description: str
    city: str
    area: str
    lat: float
    lng: float
    status: str
    priority: str
    score: int
    severity: int
    reports: int = 1
    department: str
    date: str
    photo: Optional[str] = None
    isUserCreated: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

class IssueListResponse(BaseModel):
    items: List[IssueResponse]
    total: int
    page: int = 1
    limit: int = 50
