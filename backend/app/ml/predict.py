import os
import json
import logging
import joblib
import pandas as pd
from typing import Dict, Any, List, Optional
from app.ml.preprocessing import FEATURE_COLS, derive_risk_level

logger = logging.getLogger("civicpulse.ml")

class HotspotPredictor:
    def __init__(self, artifact_dir: Optional[str] = None):
        if not artifact_dir:
            artifact_dir = os.path.join(os.path.dirname(__file__), "artifacts")
        self.artifact_dir = artifact_dir
        self.model = None
        self.metrics = {}
        self.is_loaded = False
        self.load_artifacts()

    def load_artifacts(self):
        """Load trained model and metrics from disk."""
        model_path = os.path.join(self.artifact_dir, "model.joblib")
        metrics_path = os.path.join(self.artifact_dir, "metrics.json")

        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                self.is_loaded = True
                logger.info(f"Loaded Random Forest model from: {model_path}")
            except Exception as e:
                logger.error(f"Failed to load model artifact: {e}")
                self.model = None
                self.is_loaded = False
        else:
            logger.warning(f"No trained model artifact found at {model_path}")
            self.model = None
            self.is_loaded = False

        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load metrics: {e}")
                self.metrics = {}

    def predict(self, feature_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predict future complaint count for each feature row."""
        if not self.is_loaded or self.model is None:
            results = []
            for row in feature_rows:
                lag = float(row.get("complaints_lag_1", 14.0))
                predicted = max(2.0, lag * 1.05)
                risk, prio = derive_risk_level(predicted)
                results.append({
                    "predicted_count": round(predicted, 1),
                    "risk_level": risk,
                    "priority": prio,
                    "model_version": "fallback-heuristic"
                })
            return results

        df = pd.DataFrame(feature_rows)
        for col in FEATURE_COLS:
            if col not in df.columns:
                df[col] = 0.0

        X = df[FEATURE_COLS]
        predictions = self.model.predict(X)
        
        results = []
        for pred in predictions:
            pred_val = max(1.0, float(pred))
            risk, prio = derive_risk_level(pred_val)
            results.append({
                "predicted_count": round(pred_val, 1),
                "risk_level": risk,
                "priority": prio,
                "model_version": self.metrics.get("model_version", "v1.2.0")
            })
        return results

predictor = HotspotPredictor()
