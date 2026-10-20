import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any

FEATURE_COLS = [
    "complaints_lag_1",
    "complaints_lag_2",
    "complaints_lag_3",
    "complaints_roll_mean_2w",
    "avg_severity",
    "backlog_ratio",
    "pct_road_damage",
    "pct_garbage",
    "pct_drainage",
    "pct_water_leak",
    "pct_streetlight",
    "month",
    "week_of_year",
]

def build_aggregated_features(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform granular daily issue reports into weekly area-level time series
    with chronological lag features and forward 7-day target.
    Prevents lookahead leakage.
    """
    df = raw_df.copy()
    if not np.issubdtype(df["date"].dtype, np.datetime64):
        df["date"] = pd.to_datetime(df["date"])

    if "week_index" not in df.columns:
        min_date = df["date"].min()
        df["week_index"] = ((df["date"] - min_date).dt.days // 7).astype(int)

    grouped = []
    unique_areas = df[["area", "city", "lat", "lng"]].drop_duplicates("area")
    area_geo = unique_areas.set_index("area").to_dict(orient="index")

    all_weeks = sorted(df["week_index"].unique())
    areas = df["area"].unique()

    for area in areas:
        area_df = df[df["area"] == area]
        city = area_geo.get(area, {}).get("city", "Vijayawada")
        lat = area_geo.get(area, {}).get("lat", 16.5062)
        lng = area_geo.get(area, {}).get("lng", 80.6480)

        for w in all_weeks:
            w_df = area_df[area_df["week_index"] == w]
            count = len(w_df)
            avg_sev = w_df["severity"].mean() if count > 0 else 6.0
            
            unresolved = len(w_df[w_df["status"].isin(["Pending", "Assigned", "In Progress"])])
            backlog_ratio = (unresolved / count) if count > 0 else 0.5

            n_road = len(w_df[w_df["type"] == "Road Damage"])
            n_garb = len(w_df[w_df["type"] == "Garbage Accumulation"])
            n_drain = len(w_df[w_df["type"] == "Drainage Blockage"])
            n_water = len(w_df[w_df["type"] == "Water Leakage"])
            n_light = len(w_df[w_df["type"] == "Streetlight Failure"])

            pct_road = (n_road / count) if count > 0 else 0.2
            pct_garb = (n_garb / count) if count > 0 else 0.2
            pct_drain = (n_drain / count) if count > 0 else 0.2
            pct_water = (n_water / count) if count > 0 else 0.2
            pct_light = (n_light / count) if count > 0 else 0.2

            sample_date = w_df["date"].iloc[0] if count > 0 else (df["date"].min() + pd.Timedelta(weeks=w))

            grouped.append({
                "area": area,
                "city": city,
                "lat": lat,
                "lng": lng,
                "week_index": w,
                "date": sample_date,
                "complaints_count": count,
                "avg_severity": avg_sev,
                "backlog_ratio": backlog_ratio,
                "pct_road_damage": pct_road,
                "pct_garbage": pct_garb,
                "pct_drainage": pct_drain,
                "pct_water_leak": pct_water,
                "pct_streetlight": pct_light,
                "month": sample_date.month,
                "week_of_year": sample_date.isocalendar()[1],
            })

    panel_df = pd.DataFrame(grouped).sort_values(["area", "week_index"]).reset_index(drop=True)

    panel_df["complaints_lag_1"] = panel_df.groupby("area")["complaints_count"].shift(1)
    panel_df["complaints_lag_2"] = panel_df.groupby("area")["complaints_count"].shift(2)
    panel_df["complaints_lag_3"] = panel_df.groupby("area")["complaints_count"].shift(3)
    panel_df["complaints_roll_mean_2w"] = (panel_df["complaints_lag_1"] + panel_df["complaints_lag_2"]) / 2.0

    panel_df["target_next_week_count"] = panel_df.groupby("area")["complaints_count"].shift(-1)

    valid_df = panel_df.dropna(subset=FEATURE_COLS + ["target_next_week_count"]).copy()
    return valid_df

def derive_risk_level(predicted_count: float) -> Tuple[str, str]:
    """
    Derive documented risk level and operational priority ranking from continuous prediction.
    Thresholds:
      - Critical: >= 28 complaints / week
      - High: >= 18 complaints / week
      - Medium: >= 9 complaints / week
      - Low: < 9 complaints / week
    """
    val = float(predicted_count)
    if val >= 28.0:
        return "Critical", "Critical"
    elif val >= 18.0:
        return "High", "High"
    elif val >= 9.0:
        return "Medium", "Medium"
    else:
        return "Low", "Low"
