import os
import random
import pandas as pd
from datetime import datetime, timedelta, timezone

random.seed(42)

AREAS = [
    {"name": "Benz Circle", "city": "Vijayawada", "lat": 16.5062, "lng": 80.6480, "base_intensity": 1.4},
    {"name": "PNBS", "city": "Vijayawada", "lat": 16.5180, "lng": 80.6300, "base_intensity": 1.2},
    {"name": "Patamata", "city": "Vijayawada", "lat": 16.4900, "lng": 80.6700, "base_intensity": 1.0},
    {"name": "Governorpet", "city": "Vijayawada", "lat": 16.5150, "lng": 80.6200, "base_intensity": 0.8},
    {"name": "Brodipet", "city": "Guntur", "lat": 16.3067, "lng": 80.4365, "base_intensity": 1.1},
    {"name": "Arundelpet", "city": "Guntur", "lat": 16.3000, "lng": 80.4500, "base_intensity": 0.9},
    {"name": "Nagarampalem", "city": "Guntur", "lat": 16.3200, "lng": 80.4200, "base_intensity": 0.7},
    {"name": "Gandhi Chowk", "city": "Tenali", "lat": 16.2428, "lng": 80.6404, "base_intensity": 0.8},
    {"name": "Chenchupet", "city": "Tenali", "lat": 16.2500, "lng": 80.6500, "base_intensity": 0.6},
    {"name": "NH-16 Corridor", "city": "Mangalagiri", "lat": 16.4308, "lng": 80.5680, "base_intensity": 0.7},
]

CATEGORIES = [
    ("Road Damage", "Roads & Transport", 8),
    ("Garbage Accumulation", "Sanitation", 7),
    ("Water Leakage", "Water Supply", 7),
    ("Drainage Blockage", "Public Works", 8),
    ("Streetlight Failure", "Electrical", 5),
]

def generate_dataset(weeks_history: int = 32, output_csv: str = "backend/datasets/historical_issues.csv"):
    records = []
    start_date = datetime.now(timezone.utc) - timedelta(weeks=weeks_history)

    current_code = 100

    for week in range(weeks_history):
        week_start = start_date + timedelta(weeks=week)
        monsoon_factor = 1.4 if 12 <= week <= 22 else 1.0

        for area_info in AREAS:
            area_name = area_info["name"]
            city = area_info["city"]
            base_count = int(12 * area_info["base_intensity"] * monsoon_factor + random.randint(-3, 4))
            base_count = max(3, base_count)

            for _ in range(base_count):
                day_offset = random.randint(0, 6)
                hour_offset = random.randint(6, 21)
                minute_offset = random.randint(0, 59)
                timestamp = week_start + timedelta(days=day_offset, hours=hour_offset, minutes=minute_offset)
                
                weights = [0.28, 0.22, 0.20, 0.18, 0.12]
                if monsoon_factor > 1.0:
                    weights = [0.35, 0.18, 0.15, 0.25, 0.07]
                
                cat_tuple = random.choices(CATEGORIES, weights=weights)[0]
                issue_type, department, base_sev = cat_tuple
                
                severity = max(1, min(10, base_sev + random.randint(-1, 2)))
                reports = max(1, int(random.expovariate(0.3)))
                
                lat_jitter = area_info["lat"] + random.uniform(-0.003, 0.003)
                lng_jitter = area_info["lng"] + random.uniform(-0.003, 0.003)

                age_days = (datetime.now(timezone.utc) - timestamp).days
                if age_days > 28:
                    status = random.choices(["Resolved", "Assigned"], weights=[0.88, 0.12])[0]
                elif age_days > 7:
                    status = random.choices(["Resolved", "In Progress", "Assigned"], weights=[0.55, 0.30, 0.15])[0]
                else:
                    status = random.choices(["Pending", "Assigned", "In Progress"], weights=[0.50, 0.35, 0.15])[0]

                records.append({
                    "issue_code": f"CP-{current_code}",
                    "date": timestamp.strftime("%Y-%m-%d"),
                    "timestamp": timestamp.isoformat(),
                    "city": city,
                    "area": area_name,
                    "lat": round(lat_jitter, 5),
                    "lng": round(lng_jitter, 5),
                    "type": issue_type,
                    "department": department,
                    "severity": severity,
                    "reports": reports,
                    "status": status,
                    "week_index": week,
                })
                current_code += 1

    df = pd.DataFrame(records)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"Generated {len(df)} historical civic grievance records saved to {output_csv}")
    return df

if __name__ == "__main__":
    generate_dataset()
