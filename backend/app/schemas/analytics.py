from typing import List, Optional
from pydantic import BaseModel

class AnalyticsOverview(BaseModel):
    total: int
    pending: int
    assigned: int
    resolved: int
    in_progress: int = 0
    high_priority: int
    resolution_rate: int
    avg_resolution_days: float = 3.8
    high_risk_hotspots: int = 0

class CategoryCount(BaseModel):
    type: str
    count: int

class TrendPoint(BaseModel):
    month: str
    issues: int
    resolved: int
    forecast: Optional[int] = None
    date: Optional[str] = None

class AreaComparisonPoint(BaseModel):
    area: str
    city: str = "Vijayawada"
    historical: int
    predicted: float
    open_issues: int = 0

class WorkloadSummary(BaseModel):
    department: str
    open: int
    crew: int
    need: str
    suggested_allocation: str
