import os
import sys
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from app.db.mongodb import db_manager

@pytest.fixture(scope="session", autouse=True)
def setup_backend():
    db_manager.connect()
    from scripts.seed_db import seed_database
    seed_database()
    yield
    # Cleanup if needed

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["model"]["status"] == "loaded"

def test_citizen_registration_strictly_forces_citizen_role(client):
    import uuid
    random_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Citizen Ramesh",
        "email": random_email,
        "password": "strongpassword123",
        "city": "Vijayawada",
        "department": "Resident",
        # Attempt to inject admin role
        "role": "admin"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    # Security requirement: Role MUST be citizen, rejecting any client attempt to elevate
    assert data["user"]["role"] == "citizen"
    assert data["user"]["email"] == random_email

def test_duplicate_registration_rejected(client):
    payload = {
        "name": "Duplicate User",
        "email": "citizen@civicpulse.app",
        "password": "any_password",
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]

def test_login_success_and_failure(client):
    # Valid citizen login
    res = client.post("/api/auth/login", json={
        "email": "citizen@civicpulse.app",
        "password": "civicpulse"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "citizen"

    # Invalid password
    res_bad = client.post("/api/auth/login", json={
        "email": "citizen@civicpulse.app",
        "password": "wrongpassword"
    })
    assert res_bad.status_code == 401

def test_get_current_user_me(client):
    # Login citizen
    login_res = client.post("/api/auth/login", json={
        "email": "citizen@civicpulse.app",
        "password": "civicpulse"
    })
    token = login_res.json()["access_token"]
    
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "citizen@civicpulse.app"

def test_issues_listing_and_filtering(client):
    res = client.get("/api/issues")
    assert res.status_code == 200
    issues = res.json()
    assert isinstance(issues, list)
    assert len(issues) >= 10

    # Filter by city
    res_vja = client.get("/api/issues?city=Vijayawada")
    assert res_vja.status_code == 200
    for item in res_vja.json():
        assert item["city"] == "Vijayawada"

def test_issue_lifecycle_and_permissions(client):
    # 1. Login citizen
    cit_res = client.post("/api/auth/login", json={
        "email": "citizen@civicpulse.app",
        "password": "civicpulse"
    })
    cit_token = cit_res.json()["access_token"]
    cit_headers = {"Authorization": f"Bearer {cit_token}"}

    # 2. Citizen creates issue
    create_payload = {
        "type": "Road Damage",
        "description": "Large dangerous pothole right in front of bus stand",
        "city": "Vijayawada",
        "area": "Benz Circle",
        "lat": 16.5062,
        "lng": 80.6480
    }
    create_res = client.post("/api/issues", json=create_payload, headers=cit_headers)
    assert create_res.status_code == 201
    new_issue = create_res.json()
    issue_code = new_issue["issue_code"]
    assert issue_code.startswith("CP-")
    assert new_issue["status"] == "Pending"
    assert new_issue["isUserCreated"] is True

    # 3. Citizen can update description while pending
    update_res = client.put(f"/api/issues/{issue_code}", json={
        "description": "Updated: Large dangerous pothole right in front of bus stand with sharp edge"
    }, headers=cit_headers)
    assert update_res.status_code == 200
    assert "sharp edge" in update_res.json()["description"]

    # 4. Citizen CANNOT change status to Resolved
    cit_resolve_res = client.put(f"/api/issues/{issue_code}", json={
        "status": "Resolved"
    }, headers=cit_headers)
    # The citizen's update will ignore or throw on status
    assert cit_resolve_res.json()["status"] != "Resolved"

    # 5. Admin logs in and resolves issue
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@city.gov",
        "password": "civicpulse"
    })
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    admin_update_res = client.put(f"/api/issues/{issue_code}", json={
        "status": "Resolved",
        "department": "Roads & Transport"
    }, headers=admin_headers)
    assert admin_update_res.status_code == 200
    assert admin_update_res.json()["status"] == "Resolved"

def test_hotspots_ml_predictions(client):
    res = client.get("/api/hotspots")
    assert res.status_code == 200
    hotspots = res.json()
    assert isinstance(hotspots, list)
    assert len(hotspots) == 10
    first = hotspots[0]
    assert "predicted_issue_count" in first
    assert "risk_level" in first
    assert first["risk_level"] in ["Critical", "High", "Medium", "Low"]
    assert first["lat"] > 0 and first["lng"] > 0

def test_model_metrics(client):
    res = client.get("/api/analytics/model-metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["is_trained"] is True
    assert "mae" in metrics
    assert metrics["mae"] < 3.0  # Random forest achieves ~2.35 MAE
    assert "features" in metrics
    assert len(metrics["features"]) >= 10

def test_resource_planning(client):
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@city.gov",
        "password": "civicpulse"
    })
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/resources", headers=admin_headers)
    assert res.status_code == 200
    allocations = res.json()
    assert isinstance(allocations, list)
    assert len(allocations) > 0
    first = allocations[0]
    assert "recommended_crews" in first
    assert "department" in first
    assert "equipment_requirements" in first

def test_auth_logout(client):
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_issues_mine_and_patch(client):
    cit_res = client.post("/api/auth/login", json={
        "email": "citizen@civicpulse.app",
        "password": "civicpulse"
    })
    cit_token = cit_res.json()["access_token"]
    cit_headers = {"Authorization": f"Bearer {cit_token}"}

    # Test GET /api/issues/mine
    mine_res = client.get("/api/issues/mine", headers=cit_headers)
    assert mine_res.status_code == 200
    assert isinstance(mine_res.json(), list)

    # Test PATCH /api/issues/{id}
    if len(mine_res.json()) > 0:
        first_code = mine_res.json()[0]["issue_code"]
        patch_res = client.patch(f"/api/issues/{first_code}", json={"description": "Patched description test"}, headers=cit_headers)
        assert patch_res.status_code in [200, 403]

def test_hotspot_by_area(client):
    res = client.get("/api/hotspots/Benz Circle")
    assert res.status_code == 200
    data = res.json()
    assert "Benz Circle" in data["area"] or "Benz Circle" in data["name"]
    assert "predicted_issue_count" in data

def test_analytics_resolution_performance(client):
    res = client.get("/api/analytics/resolution-performance")
    assert res.status_code == 200
    data = res.json()
    assert "overall_resolution_rate" in data
    assert "by_department" in data
    assert isinstance(data["by_department"], list)
