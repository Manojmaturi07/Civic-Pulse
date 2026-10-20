from typing import List
from fastapi import APIRouter, Depends, Query
from app.db.mongodb import get_database
from app.core.dependencies import require_admin
from app.schemas.prediction import HotspotPredictionResponse, HotspotPredictionRequest
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/hotspots", tags=["Hotspot Prediction"])

@router.get("", response_model=List[HotspotPredictionResponse])
async def get_hotspots(
    force_refresh: bool = Query(False),
    days_ahead: int = Query(7, ge=1, le=30),
    db = Depends(get_database),
):
    """
    Retrieve forward 7-day predicted civic complaint hotspots and risk levels across monitored zones.
    Powered by the trained Scikit-Learn Random Forest regression model.
    """
    service = PredictionService(db)
    return service.get_or_run_predictions(force_refresh=force_refresh, days_ahead=days_ahead)

@router.get("/{area}", response_model=HotspotPredictionResponse)
async def get_hotspot_by_area(
    area: str,
    db = Depends(get_database),
):
    """Retrieve forward prediction details for a specific monitored municipal ward."""
    service = PredictionService(db)
    all_hotspots = service.get_or_run_predictions(force_refresh=False)
    for h in all_hotspots:
        if h["area"].lower() == area.lower() or h["name"].lower() == area.lower():
            return h
    from fastapi import HTTPException, status
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Hotspot area '{area}' not found.")

@router.post("/predict", response_model=List[HotspotPredictionResponse])
async def trigger_prediction_pipeline(
    req: HotspotPredictionRequest,
    admin_user: dict = Depends(require_admin),
    db = Depends(get_database),
):
    """
    Admin-only: Trigger ML pipeline recalculation on current database feature aggregates.
    """
    service = PredictionService(db)
    return service.get_or_run_predictions(force_refresh=True, days_ahead=req.days_ahead)
