# Delhi Air Quality Forecasting System - Documentation

## 1. Project Overview
This system generates 72-hour air quality forecasts (PM2.5) for Delhi NCR. It uses a **Hybrid Physics-Aware Deep Learning Model** that integrates historical data, real-time safety checks, and sequential baselines. 

**Key Features:**
- **Source of Truth:** Exclusive reliance on **CPCB RSS Feed** for real-time validation.
- **Adaptive Weighting:** Dynamically trusts the model vs. real-time baseline based on divergence.
- **Sequential Forecasting:** Uses Day 1 forecast as the baseline for Day 2, ensuring smooth trajectories.
- **Unified Dataset:** Single merged dataset (2020-2025) used for all operations.

---

## 2. File Structure & Responsibilities

### root/
- **`run_pipeline.bat`**
  - **Type:** Batch Script / Entry Point
  - **Purpose:** The main orchestrator. Run this to execute the full pipeline (Data Prep -> Hybrid Inference).
  - **Workflow:** 
    1. Calls `src_deep_model/01_data_prep.py`
    2. Calls `src_deep_model/04_hybrid_inference.py`

- **`merged_aqi_dataset.csv`**
  - **Type:** Data File (CSV)
  - **Purpose:** The primary dataset containing historical and recent AQI/Weather data from 2020 to 2025.
  - **Attributes:** Imputed weather data (Temp, RH, WS) and calibrated PM2.5 values.

- **`cpcb_safety_layer.json`**
  - **Type:** Data File (JSON)
  - **Purpose:** A cache of the latest real-time data fetched from the CPCB RSS feed. Used as the "Safety Layer" to ground forecasts in reality.

- **`forecast_safety_hybrid.json`**
  - **Type:** Data File (JSON)
  - **Purpose:** The **Final Output**. Contains the generated forecasts, geo-coordinates, prominent pollutants, and trust scores for all stations.

- **`fetch_cpcb_safety.py`**
  - **Type:** Utility Script
  - **Purpose:** Fetches the XML RSS feed from CPCB, extracts Sub-Indices/Prominent Pollutants, and saves them to `cpcb_safety_layer.json`.

- **`fetch_realtime_now.py`**
  - **Type:** Utility Script
  - **Purpose:** (Optional) CLI Dashboard to view the current status of stations directly from the `cpcb_safety_layer.json`.

### src_deep_model/
- **`01_data_prep.py`**
  - **Purpose:** Preprocesses the `merged_aqi_dataset.csv`.
  - **Actions:** Normalization, station encoding, missing value handling, and sequence generation (sliding windows) for the Deep Learning model.
  - **Outputs:** `deep_model_data/dl_ready.npz`, `scalers.pkl`, `meta_data.pkl`.

- **`03_inference.py`**
  - **Purpose:** **Core Model Module**. Contains the `DeepCaster` class definition which loads the `.h5` model and performs the raw sequence predictions.
  - **Note:** Called internally by `04_hybrid_inference.py`.

- **`04_hybrid_inference.py`**
  - **Purpose:** **Main Inference Engine**. 
  - **Workflow:** 
    1. Loads `DeepCaster` to get raw predictions.
    2. Loads `cpcb_safety_layer.json`.
    3. Blends Model + Real-time data using Adaptive Weighting.
    4. Generates proper JSON structure with Station Metadata (Lat/Lon).

### models_production/
- **`best_physics_dl_pm25_model.h5`**
  - **Purpose:** Pre-trained BiLSTM Deep Learning Model weights.

### deep_model_data/
- **`scalers.pkl` / `meta_data.pkl`**
  - **Purpose:** Artifacts required to normalize inputs and inverse-transform outputs during inference.

---

## 3. Usage Guide
1. **Update Real-Time Data:** Run `python fetch_cpcb_safety.py` (Optional, usually automated).
2. **Generate Forecast:** Double click `run_pipeline.bat`.
3. **View Results:** Open `forecast_safety_hybrid.json`.

## 4. Dependencies
- **Python 3.x**
- **Libraries:** `pandas`, `numpy`, `tensorflow`, `requests`, `joblib`
