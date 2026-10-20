import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.schemas.issue import IssueCreate, IssueUpdate

DEPARTMENT_MAP = {
    "Road Damage": "Roads & Transport",
    "Water Leakage": "Water Supply",
    "Drainage Blockage": "Public Works",
    "Garbage Accumulation": "Sanitation",
    "Streetlight Failure": "Electrical",
}

CATEGORY_SEVERITY_DEFAULT = {
    "Road Damage": 8,
    "Drainage Blockage": 8,
    "Water Leakage": 7,
    "Garbage Accumulation": 7,
    "Streetlight Failure": 5,
}

CITY_DEFAULT_COORDS = {
    "vijayawada": {"lat": 16.5062, "lng": 80.6480},
    "guntur": {"lat": 16.3067, "lng": 80.4365},
    "tenali": {"lat": 16.2428, "lng": 80.6404},
    "mangalagiri": {"lat": 16.4308, "lng": 80.5680},
}

def calculate_priority_score(severity: int, reports: int = 1, issue_type: str = "") -> tuple[int, str]:
    """Calculate intelligent priority score and rank category."""
    base_severity = max(1, min(10, severity))
    type_weight = 8 if issue_type in ["Road Damage", "Drainage Blockage"] else 6
    score = int((base_severity * 6.5) + (min(reports, 10) * 1.5) + type_weight)
    score = max(20, min(98, score))

    if score >= 85:
        priority = "Critical"
    elif score >= 75:
        priority = "High"
    elif score >= 55:
        priority = "Medium"
    else:
        priority = "Low"

    return score, priority

def format_issue_doc(doc: Dict[str, Any], current_user_id: Optional[str] = None) -> Dict[str, Any]:
    """Format MongoDB issue document for safe, consistent frontend consumption."""
    coords = [80.6480, 16.5062]
    loc = doc.get("location")
    if loc and isinstance(loc, dict) and "coordinates" in loc:
        coords = loc.get("coordinates", coords)
    
    lng = doc.get("lng") if doc.get("lng") is not None else (coords[0] if len(coords) > 0 else 80.6480)
    lat = doc.get("lat") if doc.get("lat") is not None else (coords[1] if len(coords) > 1 else 16.5062)

    created_at = doc.get("created_at")
    date_str = doc.get("date")
    if not date_str and created_at:
        if isinstance(created_at, datetime):
            date_str = created_at.strftime("%Y-%m-%d")
        else:
            date_str = str(created_at)[:10]

    issue_code = doc.get("issue_code") or f"CP-{str(doc.get('_id', uuid.uuid4()))[:6].upper()}"

    is_user_created = False
    if current_user_id and doc.get("user_id"):
        is_user_created = str(doc.get("user_id")) == str(current_user_id)

    return {
        "id": issue_code,
        "_id": str(doc.get("_id", issue_code)),
        "issue_code": issue_code,
        "user_id": str(doc.get("user_id", "")),
        "type": doc.get("type", "General Civic Issue"),
        "description": doc.get("description", ""),
        "city": doc.get("city", "Vijayawada"),
        "area": doc.get("area", "Downtown"),
        "lat": float(lat),
        "lng": float(lng),
        "status": doc.get("status", "Pending"),
        "priority": doc.get("priority", "Medium"),
        "score": int(doc.get("score", 70)),
        "severity": int(doc.get("severity", 6)),
        "reports": int(doc.get("reports", 1)),
        "department": doc.get("department") or DEPARTMENT_MAP.get(doc.get("type", ""), "Public Works"),
        "date": date_str or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "photo": doc.get("photo"),
        "isUserCreated": is_user_created,
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "resolved_at": doc.get("resolved_at"),
    }

class IssueService:
    def __init__(self, db):
        self.db = db

    def generate_next_code(self) -> str:
        """Generate human-readable unique issue ticket code like CP-1043."""
        latest = self.db.issues.find_one(sort=[("created_at", -1)])
        next_num = 1043
        if latest and "issue_code" in latest:
            try:
                num = int(str(latest["issue_code"]).replace("CP-", ""))
                next_num = max(next_num, num + 1)
            except Exception:
                pass
        return f"CP-{next_num}"

    def create_issue(self, payload: IssueCreate, user: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new citizen issue report with spatial coordinates and priority scoring."""
        city_clean = (payload.city or "Vijayawada").strip()
        area_clean = (payload.area or "Downtown").strip()
        
        lat = payload.lat
        lng = payload.lng
        if lat is None or lng is None:
            city_key = city_clean.lower()
            coords = CITY_DEFAULT_COORDS.get(city_key, CITY_DEFAULT_COORDS["vijayawada"])
            lat = coords["lat"]
            lng = coords["lng"]

        severity = CATEGORY_SEVERITY_DEFAULT.get(payload.type, 7)
        score, priority = calculate_priority_score(severity, reports=1, issue_type=payload.type)
        department = DEPARTMENT_MAP.get(payload.type, "Public Works")
        issue_code = self.generate_next_code()
        now = datetime.now(timezone.utc)

        doc = {
            "issue_code": issue_code,
            "user_id": str(user["id"]),
            "type": payload.type,
            "description": payload.description.strip(),
            "city": city_clean,
            "area": area_clean,
            "location": {
                "type": "Point",
                "coordinates": [float(lng), float(lat)]
            },
            "lat": float(lat),
            "lng": float(lng),
            "severity": severity,
            "score": score,
            "priority": priority,
            "status": "Pending",
            "department": department,
            "reports": 1,
            "photo": payload.photo,
            "created_at": now,
            "updated_at": now,
            "date": now.strftime("%Y-%m-%d"),
        }

        res = self.db.issues.insert_one(doc)
        doc["_id"] = str(getattr(res, "inserted_id", issue_code))
        return format_issue_doc(doc, current_user_id=user["id"])

    def list_issues(
        self,
        city: Optional[str] = None,
        type_: Optional[str] = None,
        status_: Optional[str] = None,
        area: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        current_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List issues matching filters, sorted by creation date descending."""
        query = {}
        if city and city != "All":
            query["city"] = city
        if type_ and type_ != "All":
            query["type"] = type_
        if status_ and status_ != "All":
            query["status"] = status_
        if area and area != "All":
            query["area"] = area

        if search:
            search_clean = search.strip().lower()
            query["$or"] = [
                {"issue_code": {"$regex": search_clean, "$options": "i"}},
                {"description": {"$regex": search_clean, "$options": "i"}},
                {"area": {"$regex": search_clean, "$options": "i"}},
                {"city": {"$regex": search_clean, "$options": "i"}},
            ]

        cursor = self.db.issues.find(query, sort=[("created_at", -1)], skip=skip, limit=limit)
        return [format_issue_doc(doc, current_user_id=current_user_id) for doc in cursor]

    def get_by_id_or_code(self, issue_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Lookup by internal _id or public issue_code (e.g. CP-1042)."""
        doc = self.db.issues.find_one({"$or": [{"_id": issue_id}, {"issue_code": issue_id}]})
        if not doc:
            return None
        return format_issue_doc(doc, current_user_id=current_user_id)

    def get_user_reports(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch all reports filed by the citizen."""
        cursor = self.db.issues.find({"user_id": str(user_id)}, sort=[("created_at", -1)])
        return [format_issue_doc(doc, current_user_id=user_id) for doc in cursor]

    def update_issue(self, issue_id: str, payload: IssueUpdate, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update issue fields under strict role-based permission rules."""
        issue = self.db.issues.find_one({"$or": [{"_id": issue_id}, {"issue_code": issue_id}]})
        if not issue:
            return None

        is_admin = user.get("role") == "admin"
        is_owner = str(issue.get("user_id")) == str(user.get("id"))

        update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}

        if is_admin:
            if payload.status:
                update_fields["status"] = payload.status
                if payload.status == "Resolved":
                    update_fields["resolved_at"] = datetime.now(timezone.utc)
            if payload.department:
                update_fields["department"] = payload.department
            if payload.priority:
                update_fields["priority"] = payload.priority
            if payload.severity is not None:
                update_fields["severity"] = payload.severity
                score, priority = calculate_priority_score(
                    payload.severity,
                    reports=issue.get("reports", 1),
                    issue_type=issue.get("type", "")
                )
                update_fields["score"] = score
                if not payload.priority:
                    update_fields["priority"] = priority
            if payload.description:
                update_fields["description"] = payload.description.strip()
        elif is_owner:
            if issue.get("status") != "Pending":
                raise PermissionError("Cannot modify a report that has already been assigned or processed.")
            if payload.description:
                update_fields["description"] = payload.description.strip()
        else:
            raise PermissionError("You do not have permission to modify this civic report.")

        self.db.issues.update_one(
            {"$or": [{"_id": issue.get("_id")}, {"issue_code": issue.get("issue_code")}]},
            {"$set": update_fields}
        )

        updated_doc = self.db.issues.find_one({"$or": [{"_id": issue.get("_id")}, {"issue_code": issue.get("issue_code")}]})
        return format_issue_doc(updated_doc, current_user_id=user.get("id"))

    def delete_issue(self, issue_id: str, user: Dict[str, Any]) -> bool:
        """Delete issue: allowed for Admin or Citizen if report is still Pending."""
        issue = self.db.issues.find_one({"$or": [{"_id": issue_id}, {"issue_code": issue_id}]})
        if not issue:
            return False

        is_admin = user.get("role") == "admin"
        is_owner = str(issue.get("user_id")) == str(user.get("id"))

        if not is_admin and not (is_owner and issue.get("status") == "Pending"):
            raise PermissionError("Only municipal administrators or the author of a pending ticket can delete this record.")

        res = self.db.issues.delete_one({"$or": [{"_id": issue.get("_id")}, {"issue_code": issue.get("issue_code")}]})
        return getattr(res, "deleted_count", 0) > 0
