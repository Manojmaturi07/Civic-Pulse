from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from app.ml.predict import predictor
from app.ml.preprocessing import derive_risk_level

MONITORED_ZONES = [
    {"area": "Benz Circle", "city": "Vijayawada", "lat": 16.5062, "lng": 80.6480, "name": "Benz Circle, Vijayawada"},
    {"area": "PNBS", "city": "Vijayawada", "lat": 16.5180, "lng": 80.6300, "name": "PNBS, Vijayawada"},
    {"area": "Patamata", "city": "Vijayawada", "lat": 16.4900, "lng": 80.6700, "name": "Patamata, Vijayawada"},
    {"area": "Governorpet", "city": "Vijayawada", "lat": 16.5150, "lng": 80.6200, "name": "Governorpet, Vijayawada"},
    {"area": "Brodipet", "city": "Guntur", "lat": 16.3067, "lng": 80.4365, "name": "Brodipet, Guntur"},
    {"area": "Arundelpet", "city": "Guntur", "lat": 16.3000, "lng": 80.4500, "name": "Arundelpet, Guntur"},
    {"area": "Nagarampalem", "city": "Guntur", "lat": 16.3200, "lng": 80.4200, "name": "Nagarampalem, Guntur"},
    {"area": "Gandhi Chowk", "city": "Tenali", "lat": 16.2428, "lng": 80.6404, "name": "Gandhi Chowk, Tenali"},
    {"area": "Chenchupet", "city": "Tenali", "lat": 16.2500, "lng": 80.6500, "name": "Chenchupet, Tenali"},
    {"area": "NH-16 Corridor", "city": "Mangalagiri", "lat": 16.4308, "lng": 80.5680, "name": "NH-16, Mangalagiri"},
]

class PredictionService:
    def __init__(self, db):
        self.db = db

    def get_or_run_predictions(self, force_refresh: bool = False, days_ahead: int = 7) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        if not force_refresh:
            saved = list(self.db.predictions.find({"period_start": {"$gte": today_str}}))
            if len(saved) >= len(MONITORED_ZONES):
                return self._format_predictions(saved)

        feature_rows = []
        zone_context = []

        period_start = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        period_end = (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

        for zone in MONITORED_ZONES:
            area = zone["area"]
            city = zone["city"]

            recent_issues = list(self.db.issues.find({"area": area}))
            count = len(recent_issues)
            unresolved = len([i for i in recent_issues if i.get("status") in ["Pending", "Assigned", "In Progress"]])
            backlog_ratio = (unresolved / count) if count > 0 else 0.4
            avg_sev = float(sum(i.get("severity", 6) for i in recent_issues) / count) if count > 0 else 7.0

            counts_by_type = {}
            for i in recent_issues:
                t = i.get("type", "Other")
                counts_by_type[t] = counts_by_type.get(t, 0) + 1
            
            pct_road = (counts_by_type.get("Road Damage", 0) / count) if count > 0 else 0.3
            pct_garb = (counts_by_type.get("Garbage Accumulation", 0) / count) if count > 0 else 0.25
            pct_drain = (counts_by_type.get("Drainage Blockage", 0) / count) if count > 0 else 0.2
            pct_water = (counts_by_type.get("Water Leakage", 0) / count) if count > 0 else 0.15
            pct_light = (counts_by_type.get("Streetlight Failure", 0) / count) if count > 0 else 0.1

            lag1 = float(max(5, count // 3))
            lag2 = float(max(4, lag1 - 1))
            lag3 = float(max(3, lag2 - 1))

            feature_rows.append({
                "complaints_lag_1": lag1,
                "complaints_lag_2": lag2,
                "complaints_lag_3": lag3,
                "complaints_roll_mean_2w": (lag1 + lag2) / 2.0,
                "avg_severity": avg_sev,
                "backlog_ratio": backlog_ratio,
                "pct_road_damage": pct_road,
                "pct_garbage": pct_garb,
                "pct_drainage": pct_drain,
                "pct_water_leak": pct_water,
                "pct_streetlight": pct_light,
                "month": now.month,
                "week_of_year": now.isocalendar()[1],
            })

            top_cats = sorted(counts_by_type.items(), key=lambda x: x[1], reverse=True)
            top_cat_names = [c[0] for c in top_cats[:2]] if top_cats else ["Road Damage", "Sanitation"]

            zone_context.append({
                "area": area,
                "city": city,
                "name": zone["name"],
                "lat": zone["lat"],
                "lng": zone["lng"],
                "issues": max(count, int(lag1 * 2)),
                "top_categories": top_cat_names,
            })

        preds = predictor.predict(feature_rows)

        results = []
        for z, p in zip(zone_context, preds):
            doc = {
                "name": z["name"],
                "area": z["area"],
                "city": z["city"],
                "lat": z["lat"],
                "lng": z["lng"],
                "period_start": period_start,
                "period_end": period_end,
                "predicted_issue_count": p["predicted_count"],
                "risk_level": p["risk_level"],
                "priority": p["priority"],
                "issues": z["issues"],
                "top_categories": z["top_categories"],
                "model_version": p["model_version"],
                "created_at": now.isoformat(),
            }

            self.db.predictions.update_one(
                {"area": z["area"], "period_start": period_start},
                {"$set": doc},
                upsert=True
            )
            results.append(doc)

        return self._format_predictions(results)

    def _format_predictions(self, raw_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for d in raw_list:
            pred_count = float(d.get("predicted_issue_count", 15.0))
            risk, prio = derive_risk_level(pred_count)
            formatted.append({
                "id": str(d.get("_id", f"pred-{d.get('area', '').lower().replace(' ', '-')}")),
                "name": d.get("name") or f"{d.get('area')}, {d.get('city')}",
                "area": d.get("area"),
                "city": d.get("city", "Vijayawada"),
                "lat": float(d.get("lat", 16.5062)),
                "lng": float(d.get("lng", 80.6480)),
                "period_start": str(d.get("period_start", "")),
                "period_end": str(d.get("period_end", "")),
                "predicted_issue_count": round(pred_count, 1),
                "risk_level": d.get("risk_level") or risk,
                "priority": d.get("priority") or prio,
                "issues": int(d.get("issues", 30)),
                "top_categories": d.get("top_categories", ["Road Damage", "Drainage Blockage"]),
                "model_version": d.get("model_version", "v1.2.0"),
                "created_at": str(d.get("created_at", "")),
            })
        formatted.sort(key=lambda x: x["predicted_issue_count"], reverse=True)
        return formatted
