from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class HotspotPredictionRequest(BaseModel):
    area: Optional[str] = None
    city: Optional[str] = None
    days_ahead: int = Field(default=7, ge=1, le=30)

class HotspotPredictionResponse(BaseModel):
    id: Optional[str] = None
    name: str
    area: str
    city: str
    lat: float
    lng: float
    period_start: str
    period_end: str
    predicted_issue_count: float
    risk_level: str
    priority: str
    model_version: str
    created_at: str
    issues: int
    top_categories: List[str] = []

class ModelMetricsResponse(BaseModel):
    model_name: str
    model_version: str
    algorithm: str
    target_definition: str
    mae: float
    rmse: float
    r2: float
    baseline_mae: float
    trained_at: str
    sample_count: int
    features: List[str]
    risk_thresholds: Dict[str, str]
    is_trained: bool = True
