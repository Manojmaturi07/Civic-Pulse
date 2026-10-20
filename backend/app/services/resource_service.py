import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.services.prediction_service import PredictionService

MUNICIPAL_CAPACITIES = {
    "Roads & Transport": {"total_crews": 14, "trucks": 8, "heavy_machinery": 4},
    "Sanitation": {"total_crews": 12, "trucks": 10, "heavy_machinery": 2},
    "Water Supply": {"total_crews": 10, "trucks": 6, "heavy_machinery": 3},
    "Public Works": {"total_crews": 10, "trucks": 5, "heavy_machinery": 3},
    "Electrical": {"total_crews": 8, "trucks": 4, "heavy_machinery": 2},
}

EQUIPMENT_RULES = {
    "Roads & Transport": ["Asphalt roller", "Patch truck", "Safety barricades"],
    "Sanitation": ["Compactor truck", "Disposal skips", "PPE sets"],
    "Water Supply": ["Excavator", "High-pressure pump", "Pipe-couplers"],
    "Public Works": ["Silt cleaner", "Trenching tool", "Dewatering unit"],
    "Electrical": ["Hydraulic lift truck", "Replacement LED fixtures", "Voltage tester"],
}

class ResourceService:
    def __init__(self, db):
        self.db = db
        self.prediction_service = PredictionService(db)

    def generate_recommendations(self) -> List[Dict[str, Any]]:
        hotspots = self.prediction_service.get_or_run_predictions()
        allocations = []
        now_str = datetime.now(timezone.utc).isoformat()
        crew_usage = {dept: 0 for dept in MUNICIPAL_CAPACITIES}

        for h in hotspots:
            area = h["area"]
            city = h["city"]
            pred_demand = h["predicted_issue_count"]
            risk = h["risk_level"]
            top_cats = h.get("top_categories", ["Road Damage", "Sanitation"])
            
            primary_cat = top_cats[0] if top_cats else "Road Damage"
            from app.services.issue_service import DEPARTMENT_MAP
            dept = DEPARTMENT_MAP.get(primary_cat, "Roads & Transport")

            capacity = MUNICIPAL_CAPACITIES.get(dept, {"total_crews": 8})
            available_crews = capacity["total_crews"]

            raw_crews_needed = math.ceil(pred_demand / 6.0)
            remaining_crews = max(1, available_crews - crew_usage[dept])
            recommended = min(raw_crews_needed, remaining_crews)
            crew_usage[dept] += recommended

            equip = EQUIPMENT_RULES.get(dept, ["Service van", "Standard toolkit"])

            doc_id = f"res-{area.lower().replace(' ', '-')}-{dept.lower().replace(' ', '-')}"
            doc = {
                "id": doc_id,
                "area": area,
                "city": city,
                "department": dept,
                "predicted_demand": round(pred_demand, 1),
                "available_crews": available_crews,
                "recommended_crews": recommended,
                "equipment_requirements": equip,
                "priority": risk,
                "allocation_status": "Pending Review",
                "updated_at": now_str,
            }

            self.db.resource_allocations.update_one(
                {"area": area, "department": dept},
                {"$set": doc},
                upsert=True
            )
            allocations.append(doc)

        return allocations

    def get_allocations(self) -> List[Dict[str, Any]]:
        existing = list(self.db.resource_allocations.find())
        if not existing:
            return self.generate_recommendations()
        
        results = []
        for d in existing:
            results.append({
                "id": str(d.get("_id", d.get("id"))),
                "area": d.get("area"),
                "city": d.get("city", "Vijayawada"),
                "department": d.get("department", "Roads & Transport"),
                "predicted_demand": float(d.get("predicted_demand", 10.0)),
                "available_crews": int(d.get("available_crews", 8)),
                "recommended_crews": int(d.get("recommended_crews", 2)),
                "equipment_requirements": d.get("equipment_requirements", []),
                "priority": d.get("priority", "Medium"),
                "allocation_status": d.get("allocation_status", "Pending Review"),
                "updated_at": str(d.get("updated_at", "")),
            })
        return results

    def approve_or_update(self, alloc_id: str, status: str, approved_crews: Optional[int] = None, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        target = self.db.resource_allocations.find_one({"$or": [{"_id": alloc_id}, {"id": alloc_id}]})
        if not target:
            return None

        update_dict = {
            "allocation_status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if approved_crews is not None:
            update_dict["recommended_crews"] = approved_crews
        if notes:
            update_dict["notes"] = notes

        self.db.resource_allocations.update_one(
            {"$or": [{"_id": target.get("_id")}, {"id": target.get("id")}]},
            {"$set": update_dict}
        )
        updated = self.db.resource_allocations.find_one({"$or": [{"_id": target.get("_id")}, {"id": target.get("id")}]})
        return {
            "id": str(updated.get("_id", updated.get("id"))),
            "area": updated.get("area"),
            "city": updated.get("city"),
            "department": updated.get("department"),
            "predicted_demand": updated.get("predicted_demand"),
            "available_crews": updated.get("available_crews"),
            "recommended_crews": updated.get("recommended_crews"),
            "equipment_requirements": updated.get("equipment_requirements"),
            "priority": updated.get("priority"),
            "allocation_status": updated.get("allocation_status"),
            "updated_at": updated.get("updated_at"),
        }
