import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.db.mongodb import db_manager
from app.ml.predict import predictor
from app.routers import auth, users, issues, hotspots, analytics, resources, health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("civicpulse")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan lifecycle for database connection and model loading."""
    logger.info("Starting CivicPulse Backend Services...")
    # 1. Connect database & initialize indexes
    try:
        db_manager.connect()
    except Exception as e:
        logger.warning(f"Initial MongoDB connection notice: {e}")

    # 2. Idempotent check & seed of admin if database has no users
    try:
        try:
            from scripts.bootstrap_admin import bootstrap_admin
        except ImportError:
            from backend.scripts.bootstrap_admin import bootstrap_admin
        bootstrap_admin()
    except Exception as e:
        logger.warning(f"Admin bootstrap check warning: {e}")

    # 3. Check ML model status
    predictor.load_artifacts()
    if predictor.is_loaded:
        logger.info(f"Machine learning model online (version: {predictor.metrics.get('model_version', 'unknown')}).")
    else:
        logger.warning("ML model artifact not found. Please run: python -m app.ml.train_model")

    yield

    logger.info("Shutting down CivicPulse Backend Services...")
    db_manager.disconnect()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API and Random Forest ML Engine for CivicPulse Hotspot Prediction and Municipal Resource Planning",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for credentialed frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Standardized validation error response."""
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append(f"{loc}: {err.get('msg', 'Invalid field')}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "detail": "Validation error", "errors": errors}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Safe fallback exception handler avoiding internal stack trace leakage."""
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "detail": "An internal server error occurred. Please try again later."}
    )

# Mount API Routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(issues.router, prefix="/api")
app.include_router(hotspots.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(resources.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
