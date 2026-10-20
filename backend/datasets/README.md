# CivicPulse Historical Issues Dataset Documentation

## 1. Overview
This dataset contains chronologically ordered municipal grievance tickets across Andhra Pradesh capital region (Vijayawada, Guntur, Tenali, Mangalagiri). It is designed to train the Random Forest hotspot prediction regressor and evaluate forward 7-day municipal complaint forecasts without temporal data leakage.

## 2. Dataset Schema (`historical_issues.csv`)

| Column | Type | Description | Example |
|---|---|---|---|
| `issue_code` | String (Unique) | Formatted public ticket reference | `CP-1042` |
| `date` | Date (YYYY-MM-DD) | Date the complaint was registered | `2026-06-15` |
| `timestamp` | ISO-8601 String | Accurate timestamp with time of day | `2026-06-15T14:22:00Z` |
| `city` | String | Municipality | `Vijayawada` |
| `area` | String | Monitored municipal ward / hotspot neighborhood | `Benz Circle` |
| `lat` | Float | Geocoded latitude (EPSG:4326) | `16.5062` |
| `lng` | Float | Geocoded longitude (EPSG:4326) | `80.6480` |
| `type` | String | Issue category | `Road Damage`, `Garbage Accumulation`, `Water Leakage`, `Drainage Blockage`, `Streetlight Failure` |
| `department` | String | Responsible municipal division | `Roads & Transport`, `Sanitation`, `Water Supply`, `Public Works`, `Electrical` |
| `severity` | Integer (1-10) | Structural and public safety hazard rating | `8` |
| `reports` | Integer | Independent citizen confirmations | `14` |
| `status` | String | Ticket lifecycle state | `Pending`, `Assigned`, `In Progress`, `Resolved` |
| `week_index` | Integer | Chronological week sequence (0 to N-1) | `14` |

## 3. Machine Learning Target Definition
- **Prediction Target (`predicted_issue_count`)**: Total volume of complaints expected in an area during the upcoming 7-day period (Week $T+1$).
- **Features (calculated strictly prior to cutoff Week $T$)**:
  - `complaints_lag_1`: Volume of issues filed in Week $T$.
  - `complaints_lag_2`: Volume of issues filed in Week $T-1$.
  - `complaints_lag_3`: Volume of issues filed in Week $T-2$.
  - `complaints_roll_mean_2w`: 2-week rolling moving average.
  - `avg_severity`: Mean severity score of complaints in Week $T$.
  - `backlog_ratio`: Ratio of unresolved complaints remaining in Week $T$.
  - `pct_road_damage`: Fraction of complaints regarding road damage.
  - `pct_garbage`: Fraction of complaints regarding sanitation/garbage.
  - `pct_drainage`: Fraction of complaints regarding drainage blockage.
  - `pct_water_leak`: Fraction of complaints regarding water pipeline leaks.
  - `pct_streetlight`: Fraction of complaints regarding streetlight failure.
  - `month`: Seasonal month integer (1 to 12).
  - `week_of_year`: Week index within the annual calendar.

## 4. Leakage Prevention & Temporal Split
1. Training features are computed strictly on data timestamped $\le$ Cutoff Date.
2. The dataset is split chronologically:
   - **Training Set**: Earliest 80% chronological weeks.
   - **Held-Out Test Set**: Most recent 20% chronological weeks.
3. Overlapping future evaluation windows are excluded from training features.

## 5. Ingestion of Production Data
To ingest real city portal CSV exports:
Place the CSV file in `backend/datasets/` and run:
```bash
python -m app.ml.train_model --data-path backend/datasets/production_issues.csv
```
