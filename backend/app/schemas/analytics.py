from typing import List
from pydantic import BaseModel

class AnalyticsOverview(BaseModel):
    total: int
    pending: int
    assigned: int
    resolved: int
    high_priority: int
    resolution_rate: int

class CategoryCount(BaseModel):
    type: str
    count: int

class TrendPoint(BaseModel):
    month: str
    issues: int
    resolved: int

class WorkloadSummary(BaseModel):
    department: str
    open: int
    crew: int
    need: str
    suggested_allocation: str
