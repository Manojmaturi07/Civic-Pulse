import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from datetime import datetime, timezone
from app.core.config import settings
from app.core.security import hash_password
from app.db.mongodb import db_manager
try:
    from scripts.bootstrap_admin import bootstrap_admin
except ImportError:
    from backend.scripts.bootstrap_admin import bootstrap_admin
from app.services.prediction_service import PredictionService
from app.services.resource_service import ResourceService

INITIAL_ISSUES = [
    {
        "issue_code": "CP-1042",
        "type": "Road Damage",
        "description": "Deep potholes along the market stretch causing vehicle damage.",
        "city": "Vijayawada",
        "area": "Benz Circle",
        "location": {"type": "Point", "coordinates": [80.6480, 16.5062]},
        "lat": 16.5062,
        "lng": 80.6480,
        "status": "Pending",
        "priority": "High",
        "score": 91,
        "severity": 9,
        "reports": 48,
        "department": "Roads & Transport",
        "date": "2026-09-12",
    },
    {
        "issue_code": "CP-1038",
        "type": "Garbage Accumulation",
        "description": "Overflowing bins near residential colony for 11 days.",
        "city": "Guntur",
        "area": "Brodipet",
        "location": {"type": "Point", "coordinates": [80.4365, 16.3067]},
        "lat": 16.3067,
        "lng": 80.4365,
        "status": "Assigned",
        "priority": "High",
        "score": 86,
        "severity": 8,
        "reports": 37,
        "department": "Sanitation",
        "date": "2026-09-10",
    },
    {
        "issue_code": "CP-1021",
        "type": "Water Leakage",
        "description": "Main pipeline leak flooding the lane every morning.",
        "city": "Vijayawada",
        "area": "Governorpet",
        "location": {"type": "Point", "coordinates": [80.6200, 16.5150]},
        "lat": 16.5150,
        "lng": 80.6200,
        "status": "In Progress",
        "priority": "High",
        "score": 84,
        "severity": 8,
        "reports": 29,
        "department": "Water Supply",
        "date": "2026-09-08",
    },
    {
        "issue_code": "CP-1014",
        "type": "Drainage Blockage",
        "description": "Stagnant water after rainfall, mosquito breeding risk.",
        "city": "Tenali",
        "area": "Gandhi Chowk",
        "location": {"type": "Point", "coordinates": [80.6404, 16.2428]},
        "lat": 16.2428,
        "lng": 80.6404,
        "status": "Pending",
        "priority": "Medium",
        "score": 71,
        "severity": 7,
        "reports": 18,
        "department": "Public Works",
        "date": "2026-09-07",
    },
    {
        "issue_code": "CP-0998",
        "type": "Streetlight Failure",
        "description": "Entire stretch dark after 7 PM, safety concern for pedestrians.",
        "city": "Mangalagiri",
        "area": "NH-16 Corridor",
        "location": {"type": "Point", "coordinates": [80.5680, 16.4308]},
        "lat": 16.4308,
        "lng": 80.5680,
        "status": "Resolved",
        "priority": "Medium",
        "score": 64,
        "severity": 5,
        "reports": 12,
        "department": "Electrical",
        "date": "2026-08-29",
    },
    {
        "issue_code": "CP-0981",
        "type": "Road Damage",
        "description": "Cracked shoulder near school zone.",
        "city": "Guntur",
        "area": "Arundelpet",
        "location": {"type": "Point", "coordinates": [80.4500, 16.3000]},
        "lat": 16.3000,
        "lng": 80.4500,
        "status": "Pending",
        "priority": "Medium",
        "score": 68,
        "severity": 6,
        "reports": 15,
        "department": "Roads & Transport",
        "date": "2026-09-05",
    },
    {
        "issue_code": "CP-0966",
        "type": "Garbage Accumulation",
        "description": "Dumping behind bus stand despite prior complaints.",
        "city": "Vijayawada",
        "area": "PNBS",
        "location": {"type": "Point", "coordinates": [80.6300, 16.5180]},
        "lat": 16.5180,
        "lng": 80.6300,
        "status": "Assigned",
        "priority": "High",
        "score": 88,
        "severity": 8,
        "reports": 41,
        "department": "Sanitation",
        "date": "2026-09-11",
    },
    {
        "issue_code": "CP-0944",
        "type": "Water Leakage",
        "description": "Intermittent supply plus visible leak at junction.",
        "city": "Tenali",
        "area": "Chenchupet",
        "location": {"type": "Point", "coordinates": [80.6500, 16.2500]},
        "lat": 16.2500,
        "lng": 80.6500,
        "status": "Resolved",
        "priority": "Low",
        "score": 42,
        "severity": 4,
        "reports": 6,
        "department": "Water Supply",
        "date": "2026-08-21",
    },
    {
        "issue_code": "CP-0930",
        "type": "Streetlight Failure",
        "description": "Three poles out near park entrance.",
        "city": "Guntur",
        "area": "Nagarampalem",
        "location": {"type": "Point", "coordinates": [80.4200, 16.3200]},
        "lat": 16.3200,
        "lng": 80.4200,
        "status": "In Progress",
        "priority": "Low",
        "score": 39,
        "severity": 3,
        "reports": 8,
        "department": "Electrical",
        "date": "2026-09-03",
    },
    {
        "issue_code": "CP-0912",
        "type": "Drainage Blockage",
        "description": "Manhole overflow during peak hours.",
        "city": "Vijayawada",
        "area": "Patamata",
        "location": {"type": "Point", "coordinates": [80.6700, 16.4900]},
        "lat": 16.4900,
        "lng": 80.6700,
        "status": "Pending",
        "priority": "High",
        "score": 82,
        "severity": 8,
        "reports": 26,
        "department": "Public Works",
        "date": "2026-09-13",
    },
]

def seed_database():
    """Seed initial administrator, demo users, and verified civic records."""
    db_manager.connect()
    db = db_manager.db

    # 1. Administrator bootstrap
    admin = bootstrap_admin()
    admin_id = str(admin["_id"])

    # 2. Demo users
    demo_citizen_email = "citizen@civicpulse.app"
    citizen = db.users.find_one({"email": demo_citizen_email})
    if not citizen:
        now = datetime.now(timezone.utc)
        citizen_doc = {
            "name": "Ananya Kumar",
            "email": demo_citizen_email,
            "password_hash": hash_password("civicpulse"),
            "role": "citizen",
            "city": "Vijayawada",
            "department": "Resident",
            "avatar": "👤",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        res = db.users.insert_one(citizen_doc)
        citizen_id = str(getattr(res, "inserted_id", demo_citizen_email))
        print(f"[SUCCESS] Seeded demo citizen: {demo_citizen_email}")
    else:
        citizen_id = str(citizen["_id"])

    demo_engineer_email = "engineer@city.gov"
    engineer = db.users.find_one({"email": demo_engineer_email})
    if not engineer:
        now = datetime.now(timezone.utc)
        eng_doc = {
            "name": "Priya Sharma (Assistant Engineer)",
            "email": demo_engineer_email,
            "password_hash": hash_password("civicpulse"),
            "role": "admin",
            "city": "Vijayawada",
            "department": "Roads & Transport",
            "avatar": "👷‍♀️",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        db.users.insert_one(eng_doc)
        print(f"[SUCCESS] Seeded demo engineer: {demo_engineer_email}")

    # 3. Seed initial issues
    now = datetime.now(timezone.utc)
    for idx, iss in enumerate(INITIAL_ISSUES):
        existing = db.issues.find_one({"issue_code": iss["issue_code"]})
        if not existing:
            doc = iss.copy()
            doc["user_id"] = citizen_id if idx % 2 == 0 else admin_id
            doc["created_at"] = now
            doc["updated_at"] = now
            db.issues.insert_one(doc)

    print(f"[SUCCESS] Seeded verified civic complaint tickets ({len(INITIAL_ISSUES)} records).")

    # 4. Generate initial hotspot predictions and resource planning records
    pred_svc = PredictionService(db)
    pred_svc.get_or_run_predictions(force_refresh=True)
    print("[SUCCESS] Initial ML hotspot forecasts generated and cached.")

    res_svc = ResourceService(db)
    res_svc.generate_recommendations()
    print("[SUCCESS] Initial municipal resource planning allocations generated.")

    print("\n[ALL SEEDING COMPLETED SUCCESSFULLY]")

if __name__ == "__main__":
    seed_database()
