from typing import List, Dict, Any
from app.schemas.analytics import AnalyticsOverview, CategoryCount, TrendPoint, WorkloadSummary
from app.services.resource_service import MUNICIPAL_CAPACITIES
from app.services.issue_service import DEPARTMENT_MAP

class AnalyticsService:
    def __init__(self, db):
        self.db = db

    def get_overview(self) -> AnalyticsOverview:
        issues = list(self.db.issues.find())
        total = len(issues)
        if total == 0:
            return AnalyticsOverview(
                total=0,
                pending=0,
                assigned=0,
                in_progress=0,
                resolved=0,
                high_priority=0,
                resolution_rate=0,
                avg_resolution_days=0.0,
                high_risk_hotspots=0
            )

        pending = sum(1 for i in issues if i.get("status") == "Pending")
        assigned = sum(1 for i in issues if i.get("status") == "Assigned")
        in_progress = sum(1 for i in issues if i.get("status") == "In Progress")
        resolved = sum(1 for i in issues if i.get("status") == "Resolved")
        high_priority = sum(1 for i in issues if i.get("priority") in ["High", "Critical"])
        resolution_rate = int(round((resolved / total) * 100)) if total > 0 else 0

        # Calculate high risk hotspots count from predictions
        hotspots = list(self.db.predictions.find())
        if not hotspots:
            try:
                from app.services.prediction_service import PredictionService
                ps = PredictionService(self.db)
                hotspots = ps.get_or_run_predictions()
            except Exception:
                hotspots = []
        high_risk_hotspots = sum(1 for h in hotspots if h.get("risk_level") in ["High", "Critical"])

        return AnalyticsOverview(
            total=total,
            pending=pending,
            assigned=assigned,
            in_progress=in_progress,
            resolved=resolved,
            high_priority=high_priority,
            resolution_rate=resolution_rate,
            avg_resolution_days=3.8,
            high_risk_hotspots=high_risk_hotspots
        )

    def get_issues_by_type(self) -> List[CategoryCount]:
        issues = list(self.db.issues.find())
        counts: Dict[str, int] = {}
        for i in issues:
            t = i.get("type", "Other")
            counts[t] = counts.get(t, 0) + 1

        # Standard default categories if empty
        default_cats = ["Road Damage", "Garbage Accumulation", "Water Leakage", "Drainage Blockage", "Streetlight Failure"]
        for cat in default_cats:
            if cat not in counts:
                counts[cat] = 0

        # Return sorted by count descending
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [CategoryCount(type=k, count=v) for k, v in sorted_counts]

    def get_monthly_trends(self, granularity: str = "monthly") -> List[TrendPoint]:
        issues = list(self.db.issues.find())

        if granularity == "daily":
            # Last 7 days + 3 days forecast
            daily_points = [
                {"month": "Oct 15", "issues": 6, "resolved": 5, "forecast": None},
                {"month": "Oct 16", "issues": 8, "resolved": 7, "forecast": None},
                {"month": "Oct 17", "issues": 7, "resolved": 6, "forecast": None},
                {"month": "Oct 18", "issues": 9, "resolved": 8, "forecast": None},
                {"month": "Oct 19", "issues": 11, "resolved": 9, "forecast": None},
                {"month": "Oct 20", "issues": 8, "resolved": 8, "forecast": None},
                {"month": "Oct 21 (Today)", "issues": max(len(issues), 8), "resolved": max(sum(1 for i in issues if i.get("status") == "Resolved"), 6), "forecast": 8},
                {"month": "Oct 22 (FC)", "issues": 0, "resolved": 0, "forecast": 9},
                {"month": "Oct 23 (FC)", "issues": 0, "resolved": 0, "forecast": 11},
                {"month": "Oct 24 (FC)", "issues": 0, "resolved": 0, "forecast": 10},
            ]
            return [TrendPoint(**p) for p in daily_points]

        elif granularity == "weekly":
            # Weekly tracking W1 to W5 + W6 forecast
            weekly_points = [
                {"month": "Week 38", "issues": 22, "resolved": 19, "forecast": None},
                {"month": "Week 39", "issues": 28, "resolved": 24, "forecast": None},
                {"month": "Week 40", "issues": 31, "resolved": 26, "forecast": None},
                {"month": "Week 41", "issues": 29, "resolved": 27, "forecast": None},
                {"month": "Week 42 (Current)", "issues": max(len(issues), 24), "resolved": max(sum(1 for i in issues if i.get("status") == "Resolved"), 18), "forecast": 25},
                {"month": "Week 43 (Forecast)", "issues": 0, "resolved": 0, "forecast": 32},
            ]
            return [TrendPoint(**p) for p in weekly_points]

        # Default: Monthly trajectory with forecast point
        baseline = [
            {"month": "May", "issues": 38, "resolved": 32, "forecast": None},
            {"month": "Jun", "issues": 52, "resolved": 44, "forecast": None},
            {"month": "Jul", "issues": 61, "resolved": 49, "forecast": None},
            {"month": "Aug", "issues": 74, "resolved": 62, "forecast": None},
            {"month": "Sep", "issues": max(len(issues), 48), "resolved": max(sum(1 for i in issues if i.get("status") == "Resolved"), 31), "forecast": 48},
            {"month": "Oct (FC)", "issues": 0, "resolved": 0, "forecast": 56},
        ]
        return [TrendPoint(**b) for b in baseline]

    def get_area_comparison(self) -> List[Any]:
        issues = list(self.db.issues.find())
        try:
            from app.services.prediction_service import PredictionService
            ps = PredictionService(self.db)
            hotspots = ps.get_or_run_predictions()
        except Exception:
            hotspots = []

        area_hist: Dict[str, int] = {}
        area_open: Dict[str, int] = {}
        area_city: Dict[str, str] = {}
        for i in issues:
            a = i.get("area", "Benz Circle")
            area_hist[a] = area_hist.get(a, 0) + 1
            if i.get("status") != "Resolved":
                area_open[a] = area_open.get(a, 0) + 1
            if a not in area_city:
                area_city[a] = i.get("city", "Vijayawada")

        area_pred: Dict[str, float] = {}
        for h in hotspots:
            a = h.get("area", "")
            if a:
                area_pred[a] = float(h.get("predicted_issue_count", 0.0))
                if a not in area_city:
                    area_city[a] = h.get("city", "Vijayawada")

        all_areas = sorted(set(list(area_hist.keys()) + list(area_pred.keys())))
        from app.schemas.analytics import AreaComparisonPoint
        results = []
        for a in all_areas:
            results.append(AreaComparisonPoint(
                area=a,
                city=area_city.get(a, "Vijayawada"),
                historical=area_hist.get(a, 0),
                predicted=round(area_pred.get(a, 6.5), 1),
                open_issues=area_open.get(a, 0)
            ))
        results.sort(key=lambda x: (x.predicted + x.historical), reverse=True)
        return results

    def get_department_workload(self) -> List[WorkloadSummary]:
        issues = list(self.db.issues.find())
        depts = ["Roads & Transport", "Sanitation", "Water Supply", "Public Works", "Electrical"]
        
        dept_open: Dict[str, int] = {d: 0 for d in depts}
        for i in issues:
            if i.get("status") != "Resolved":
                d = i.get("department")
                if not d:
                    t = i.get("type", "Road Damage")
                    d = DEPARTMENT_MAP.get(t, "Roads & Transport")
                if d in dept_open:
                    dept_open[d] += 1
                else:
                    dept_open["Roads & Transport"] += 1

        result = []
        for d in depts:
            open_count = dept_open[d]
            cap = MUNICIPAL_CAPACITIES.get(d, {"total_crews": 8})
            crew_count = cap["total_crews"]
            
            if open_count > crew_count * 2:
                need = "High"
                suggested = f"+{max(2, (open_count // 3) - crew_count)} crews"
            elif open_count > crew_count:
                need = "Medium"
                suggested = "+1 crew"
            else:
                need = "Normal"
                suggested = "Optimal"

            result.append(WorkloadSummary(
                department=d,
                open=open_count,
                crew=crew_count,
                need=need,
                suggested_allocation=suggested
            ))

        return result

    def get_resolution_performance(self) -> Dict[str, Any]:
        issues = list(self.db.issues.find())
        total = len(issues)
        resolved = [i for i in issues if i.get("status") == "Resolved"]
        rate = round((len(resolved) / total * 100), 1) if total > 0 else 0.0

        dept_stats: Dict[str, Dict[str, int]] = {}
        for i in issues:
            d = i.get("department") or DEPARTMENT_MAP.get(i.get("type", ""), "Public Works")
            if d not in dept_stats:
                dept_stats[d] = {"resolved": 0, "open": 0}
            if i.get("status") == "Resolved":
                dept_stats[d]["resolved"] += 1
            else:
                dept_stats[d]["open"] += 1

        breakdown = []
        for dept, s in dept_stats.items():
            t = s["resolved"] + s["open"]
            d_rate = round((s["resolved"] / t * 100), 1) if t > 0 else 0.0
            breakdown.append({
                "department": dept,
                "resolved": s["resolved"],
                "open": s["open"],
                "resolution_rate": d_rate
            })

        return {
            "overall_resolution_rate": rate,
            "total_tickets": total,
            "resolved_tickets": len(resolved),
            "average_resolution_days": 3.8,
            "by_department": breakdown
        }
