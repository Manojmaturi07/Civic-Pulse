from typing import Optional, List
from pydantic import BaseModel, Field

class ResourceAllocationResponse(BaseModel):
    id: str
    area: str
    city: str
    department: str
    predicted_demand: float
    available_crews: int
    recommended_crews: int
    equipment_requirements: List[str]
    priority: str
    allocation_status: str
    notes: Optional[str] = None
    updated_at: str

class ResourceApprovalRequest(BaseModel):
    allocation_status: str = Field(..., pattern="^(Approved|Rejected|Deployed)$")
    approved_crews: Optional[int] = None
    notes: Optional[str] = None
