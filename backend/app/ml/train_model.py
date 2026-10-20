import os
import json
import argparse
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from app.ml.preprocessing import build_aggregated_features, FEATURE_COLS

def train_and_evaluate(data_path: str, artifact_dir: str):
    """
    Train Random Forest regressor on chronological split to predict 7-day future complaint count.
    Saves trained pipeline and evaluation metrics.
    """
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Training dataset not found at: {data_path}")

    print(f"Loading dataset from: {data_path}...")
    raw_df = pd.read_csv(data_path)
    print(f"Raw grievance rows: {len(raw_df)}")

    feature_df = build_aggregated_features(raw_df)
    print(f"Processed panel feature rows: {len(feature_df)}")

    max_week = feature_df["week_index"].max()
    min_week = feature_df["week_index"].min()
    cutoff_week = int(min_week + 0.80 * (max_week - min_week))

    train_df = feature_df[feature_df["week_index"] < cutoff_week]
    test_df = feature_df[feature_df["week_index"] >= cutoff_week]

    print(f"Chronological split at Week {cutoff_week}: Train rows = {len(train_df)}, Test rows = {len(test_df)}")

    X_train = train_df[FEATURE_COLS]
    y_train = train_df["target_next_week_count"]
    X_test = test_df[FEATURE_COLS]
    y_test = test_df["target_next_week_count"]

    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        min_samples_leaf=2,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)

    y_pred = rf_model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    baseline_pred = test_df["complaints_roll_mean_2w"].values
    baseline_mae = float(mean_absolute_error(y_test, baseline_pred))

    print("\n" + "="*50)
    print("CIVICPULSE RANDOM FOREST HOTSPOT MODEL METRICS")
    print("="*50)
    print(f"Target: Expected complaint count in next 7 days per area")
    print(f"Test MAE: {mae:.2f} complaints (Baseline MAE: {baseline_mae:.2f})")
    print(f"Test RMSE: {rmse:.2f}")
    print(f"Test R^2: {r2:.3f}")
    improvement = ((baseline_mae - mae) / baseline_mae) * 100
    print(f"Accuracy Improvement over naive baseline: {improvement:.1f}%")
    print("="*50 + "\n")

    importances = dict(zip(FEATURE_COLS, [round(float(v), 4) for v in rf_model.feature_importances_]))

    os.makedirs(artifact_dir, exist_ok=True)
    model_path = os.path.join(artifact_dir, "model.joblib")
    joblib.dump(rf_model, model_path)
    print(f"Saved trained Random Forest model to: {model_path}")

    metrics = {
        "model_name": "CivicPulse Random Forest Hotspot Forecaster",
        "model_version": "v1.2.0",
        "algorithm": "RandomForestRegressor(n_estimators=100, max_depth=8)",
        "target_definition": "Predicted civic complaints in zone over next 7 days",
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 3),
        "baseline_mae": round(baseline_mae, 2),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sample_count": int(len(train_df) + len(test_df)),
        "features": FEATURE_COLS,
        "feature_importances": importances,
        "risk_thresholds": {
            "Critical": ">= 28 complaints/week",
            "High": "18 - 27 complaints/week",
            "Medium": "9 - 17 complaints/week",
            "Low": "< 9 complaints/week"
        },
        "is_trained": True
    }

    metrics_path = os.path.join(artifact_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved evaluation metrics to: {metrics_path}")

    return rf_model, metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CivicPulse Hotspot Prediction Model")
    parser.add_argument(
        "--data-path",
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "datasets", "historical_issues.csv"),
        help="Path to historical issues CSV"
    )
    parser.add_argument(
        "--artifact-dir",
        default=os.path.join(os.path.dirname(__file__), "artifacts"),
        help="Directory to save model artifacts"
    )
    args = parser.parse_args()
    train_and_evaluate(args.data_path, args.artifact_dir)
