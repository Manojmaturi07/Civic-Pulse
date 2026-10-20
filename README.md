# CivicPulse — Urban Issue Hotspot Prediction & Resource Planning System

CivicPulse is a full-stack, machine learning-driven civic intelligence platform designed to turn scattered citizen complaints into geospatial hotspot forecasts, priority rankings, and optimized municipal crew dispatch plans.

---

## 🏛️ System Architecture

- **Frontend:** React 18, Vite, React Router v6, Leaflet Maps, Vanilla CSS Design System.
- **Backend:** Python 3.12, FastAPI, Pydantic v2 Settings & Validation, Uvicorn.
- **Database:** MongoDB with resilient local persistent JSON fallback (`backend/datasets/offline_db.json`) for zero-downtime offline execution.
- **Machine Learning:** Pandas, NumPy, Scikit-Learn `RandomForestRegressor` with chronological temporal cross-validation.
- **Authentication & Security:** Argon2 password hashing (`argon2-cffi`), JWT access tokens (`python-jose`), and strict Role-Based Access Control (RBAC).

---

## 🤖 Machine Learning Model Summary

| Metric / Parameter | Value | Description |
| :--- | :--- | :--- |
| **Model Algorithm** | `RandomForestRegressor(n_estimators=100, max_depth=8)` | Scikit-Learn Random Forest Ensemble |
| **Training Records** | **4,020 civic records** across 32 continuous weeks | Generated across 10 monitored wards in Vijayawada, Guntur, Tenali, Mangalagiri |
| **Target Variable** | Forward 7-Day Complaint Volume | Number of civic grievances reported per ward in the subsequent 7 days |
| **Temporal Split** | Chronological at Week 24 | Prevents data leakage: Train on W1–W24, Test on W25–W32 |
| **Test MAE** | **2.35 complaints** | **8.5% improvement** over baseline rolling median |
| **Baseline MAE** | **2.56 complaints** | 2-week rolling median baseline benchmark |
| **Test RMSE** | **2.83** | Root Mean Squared Error on forward test partition |
| **Test R²** | **0.391** | Positive explanatory power on forward civic volume |
| **Artifact Location** | `backend/app/ml/artifacts/model.joblib` | Persisted model artifact and `metrics.json` |

---

## 🚀 Setup & Execution Guide

### 1. MongoDB Atlas Configuration

1. **Create an Atlas Cluster:**
   - Log in to [MongoDB Atlas](https://cloud.mongodb.com).
   - Create a free **M0 cluster** (or select an existing cluster).

2. **Configure Database User:**
   - Navigate to **Security** -> **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**. Set a username and secure password (avoid special characters like `@` or `:` or URL-encode them).
   - Database User Privileges: Select **Read and write to any database** (or assign privileges for `CivicPulse`).

3. **Configure Network Access:**
   - Navigate to **Security** -> **Network Access**.
   - Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`) for development/cloud deployment, or add your current IP address.

4. **Obtain Connection String:**
   - On the Database Deployments screen, click **Connect**.
   - Select **Drivers** (Python, version 3.6 or later).
   - Copy the SRV connection URI:
     `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

5. **Configure Backend Environment:**
   - In the `backend/` folder, copy `.env.example` to `.env`:
     ```bash
     cd backend
     copy .env.example .env
     ```
   - Edit `backend/.env` with your actual credentials:
     ```ini
     MONGODB_URI=mongodb+srv://<db_user>:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     MONGODB_DATABASE=CivicPulse
     JWT_SECRET_KEY=generate_a_random_64_character_hex_string
     ```

6. **Configure Frontend Environment:**
   - In the root folder, copy `.env.example` to `.env`:
     ```bash
     copy .env.example .env
     ```
   - Content:
     ```ini
     VITE_API_BASE_URL=http://localhost:8000/api
     ```

---

### 2. Backend Setup & Run

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Train or verify ML model pipeline (generates model.joblib & metrics.json)
python -m app.ml.train_model

# 4. Bootstrap the initial municipal administrator account
# Option A: Automatic via environment variables in backend/.env
python scripts/bootstrap_admin.py

# Option B: Interactive password prompt
python scripts/bootstrap_admin.py --interactive

# 5. (Optional) Seed realistic civic complaints and initial forecasts
python scripts/seed_db.py

# 6. Start FastAPI server (runs on port 8000)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI Swagger documentation is available at `http://localhost:8000/docs`.

---

### 3. Frontend Setup & Run

```bash
# 1. From the project root, install frontend dependencies
npm install

# 2. Launch Vite development server (runs on port 5173)
npm run dev

# 3. (Optional) Test production build
npm run build
```

Open `http://localhost:5173` in your browser.

---

### 4. Running the Test Suite

```bash
# Run backend pytest suite (all 14 integration tests)
pytest backend/tests
```

All 14 integration and unit tests execute against the FastAPI endpoints (Auth, RBAC, Issue lifecycle, ML predictions, Capacity limits).
