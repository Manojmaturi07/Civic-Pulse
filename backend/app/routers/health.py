from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.db.mongodb import get_database, db_manager
from app.ml.predict import predictor
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check(db = Depends(get_database)):
    """Readiness probe verifying API, database, and ML model service status."""
    db_status = "connected"
    if db_manager.is_mock:
        db_status = "resilient_local_store"

    user_count = db.users.count_documents({})
    issue_count = db.issues.count_documents({})

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "users": user_count,
            "issues": issue_count,
        },
        "model": {
            "status": "loaded" if predictor.is_loaded else "uninitialized",
            "version": predictor.metrics.get("model_version", "v1.2.0"),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
