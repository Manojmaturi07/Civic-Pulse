# CivicPulse — Backend API & Machine Learning Engine

FastAPI backend and Scikit-Learn Random Forest regression engine for forward civic complaint hotspot forecasting and municipal crew allocation.

---

## 📁 Directory Structure

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py           # Pydantic v2 application settings from .env
│   │   ├── security.py         # Argon2 password hashing and JWT token handling
│   │   └── dependencies.py     # FastAPI dependencies (get_current_user, require_admin)
│   ├── db/
│   │   └── mongodb.py          # PyMongo client with resilient persistent offline JSON fallback
│   ├── ml/
│   │   ├── artifacts/
│   │   │   ├── model.joblib    # Trained Random Forest Regressor artifact
│   │   │   └── metrics.json    # Version, MAE, RMSE, and feature list
│   │   ├── preprocessing.py    # Lag features, rolling statistics, category mix, risk thresholds
│   │   ├── train_model.py      # Chronological split training script (Week 1-24 vs 25-32)
│   │   └── predict.py          # Production inference wrapper
│   ├── routers/
│   │   ├── auth.py             # Public registration (citizen-only), login, profile
│   │   ├── users.py            # Admin-only user management
│   │   ├── issues.py           # Civic complaint tickets CRUD & RBAC permissions
│   │   ├── hotspots.py         # Forward 7-day predicted hotspot endpoints
│   │   ├── analytics.py        # KPIs, trends, category mix, model metrics
│   │   ├── resources.py        # Crew allocations & approval workflows
│   │   └── health.py           # Readiness and database status probe
│   ├── schemas/                # Pydantic validation models
│   ├── services/               # Issue, prediction, resource, and analytics domain logic
│   └── main.py                 # FastAPI application factory and lifespan hooks
├── datasets/
│   ├── historical_issues.csv   # 4,020 verified civic complaint records (32 continuous weeks)
│   ├── offline_db.json         # Resilient local JSON database store
│   ├── generate_historical_data.py
│   └── README.md
├── scripts/
│   ├── bootstrap_admin.py      # Idempotent administrator account creation
│   └── seed_db.py              # Full database seeder (users, issues, forecasts, allocations)
├── tests/
│   └── test_api.py             # 10 comprehensive Pytest integration tests
└── requirements.txt
```

---

## ⚡ ML Preprocessing & Feature Pipeline

1. **Panel Aggregation:** Civic records are partitioned by ward (`area`) and calendar week.
2. **Lag Features:**
   - `complaints_lag_1`: Complaint volume in the preceding week.
   - `complaints_lag_2`: Complaint volume 2 weeks prior.
   - `complaints_lag_3`: Complaint volume 3 weeks prior.
   - `complaints_roll_mean_2w`: 2-week rolling moving average.
3. **Domain Drivers:**
   - `avg_severity`: Mean severity rating of complaints in the zone.
   - `backlog_ratio`: Ratio of pending/unresolved complaints to total volume.
   - Category proportions: `pct_road_damage`, `pct_garbage`, `pct_drainage`, `pct_water_leak`, `pct_streetlight`.
4. **Calendar Features:** `month`, `week_of_year`.
5. **Target Variable:** Total complaints filed in the forward 7-day period.

---

## 🛡️ Security & Access Control
 
 - **Argon2 Password Hashing:** State-of-the-art memory-hard hashing resistant to GPU cracking.
 - **JWT Tokens:** HS256 signed tokens with configurable expiration (default 24h).
 - **Public Registration:** Hard-enforces `citizen` role. Administrative accounts can only be provisioned via admin APIs or command-line scripts.
 - **Ticket Permissions:**
   - Citizens can submit reports, view community reports, and edit descriptions on their own pending reports.
   - Municipal administrators can update lifecycle status (`Pending` -> `Assigned` -> `In Progress` -> `Resolved`), assign departments, modify priority ratings, and approve crew resource plans.

---

## 🚀 Setup & Execution

### 1. Configure MongoDB Atlas
1. Create a MongoDB Atlas cluster and a database user with read/write access.
2. Whitelist your IP (or `0.0.0.0/0`) in Network Access.
3. Copy `backend/.env.example` to `backend/.env` and insert your Atlas connection string:
   ```ini
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DATABASE=CivicPulse
   ```

### 2. Commands
```bash
# Install dependencies
pip install -r requirements.txt

# Train Random Forest Regressor
python -m app.ml.train_model

# Bootstrap Administrator
python scripts/bootstrap_admin.py --interactive

# Launch API Server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Execute Test Suite
pytest tests/
```
