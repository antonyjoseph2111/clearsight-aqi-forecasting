
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
import joblib
import os
import json

# ====================================================
# CONFIGURATION
# ====================================================
# Dynamic Base Directory (Parent of src_deep_model)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_DIR = os.path.join(BASE_DIR, "models_production")
MODEL_PATH = os.path.join(MODEL_DIR, "best_physics_dl_pm25_model.keras")

SCALER_FILE = os.path.join(BASE_DIR, "deep_model_data", "scalers.pkl")
META_FILE = os.path.join(BASE_DIR, "deep_model_data", "meta_data.pkl")

# Safety Limits (Anti-Insanity)
MAX_PM25 = 800.0
MIN_PM25 = 0.0
MAX_JUMP = 300.0 # Max allowed jump in prediction from previous forecast (per day)

# ====================================================
# 1. REAL-TIME VALIDATION
# ====================================================
def validate_and_clean_realtime(df_rt):
    """
    Validates real-time input data.
    - Limits physical ranges.
    - Interpolates NaNs.
    - Detects massive spikes.
    """
    print("   🛡️ Validating Real-Time Data...")
    df = df_rt.copy()
    
    # 1. Physical Range Clipping
    limits = {
        'PM2.5': (0, 800),
        'PM10': (0, 1000),
        'Temp': (-5, 55),
        'RH': (0, 100),
        'WS': (0, 30),
        'NO2': (0, 500),
        'SO2': (0, 500),
        'CO': (0, 50),
        'O3_final': (0, 500)
    }
    
    for col, (vmin, vmax) in limits.items():
        if col in df.columns:
            # Check for violations
            violations = df[(df[col] < vmin) | (df[col] > vmax)]
            if not violations.empty:
                print(f"      ⚠️ Found {len(violations)} violations in {col}. Clipping.")
            df[col] = df[col].clip(vmin, vmax)
            
    # 2. Spike Detection (vs recent history)
    # Simple check: if current value is > 4x mean of previous 24h? 
    # Or just hard clip? Hard clip is safer for "Anti-Insanity".
    # We already hard clipped above.
    
    # 3. Missing Value Handling
    # Interpolate linearly limit direction='both' to fill gaps
    df = df.interpolate(method='linear', limit_direction='both')
    
    # Identify Remaining NaNs
    if df.isnull().values.any():
        print("      ⚠️ Remaining NaNs found. Forward/Backward filling.")
        df = df.ffill().bfill()
        
    return df

# ====================================================
# 2. FEATURE ENGINEERING (ON THE FLY)
# ====================================================
def compute_features(df):
    """
    Computes derived physics/chemistry features.
    Must match 01_data_prep.py logic EXACTLY.
    """
    # Ensure Date
    df['From Date'] = pd.to_datetime(df['From Date'])
    
    # 1. Seasons/Time
    df['Month'] = df['From Date'].dt.month
    df['Hour'] = df['From Date'].dt.hour
    
    df['is_winter'] = df['Month'].isin([12, 1, 2]).astype(int)
    df['is_premonsoon'] = df['Month'].isin([3, 4, 5]).astype(int)
    df['is_monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
    df['is_postmonsoon'] = df['Month'].isin([10, 11]).astype(int)
    
    df['is_night'] = df['Hour'].isin([0, 1, 2, 3, 4, 5, 22, 23]).astype(int)
    df['is_peak_traffic'] = df['Hour'].isin([7, 8, 9, 10, 18, 19, 20, 21]).astype(int)
    
    # 2. Physics
    # Ventilation
    if 'WS' in df.columns and 'Temp' in df.columns:
        df['Ventilation'] = df['WS'] * (df['Temp'] + 273.15)
    else:
        df['Ventilation'] = 0.0
        
    # Stagnation
    if 'WS' in df.columns and 'RH' in df.columns and 'Temp' in df.columns:
        df['Stagnation'] = ((df['WS'] < 0.5) & (df['RH'] > 70) & (df['Temp'] < 20)).astype(int)
    else:
        df['Stagnation'] = 0
        
    # 3. Chemistry
    eps = 1e-6
    if 'NO2' in df.columns and 'NO' in df.columns:
         df['NOx_calc'] = df['NO'] + df['NO2']
    else:
         df['NOx_calc'] = 0.0 # fallback
         
    if 'NO2' in df.columns:
        df['Ratio_NO2_NOx'] = df['NO2'] / (df['NOx_calc'].replace(0, eps))
    else:
        df['Ratio_NO2_NOx'] = 0.0
        
    if 'PM2.5' in df.columns and 'PM10' in df.columns:
        df['Ratio_PM25_PM10'] = df['PM2.5'] / (df['PM10'].replace(0, eps))
        df['Ratio_PM25_PM10'] = df['Ratio_PM25_PM10'].clip(0, 1)
    else:
        df['Ratio_PM25_PM10'] = 0.5
        
    if 'NO2' in df.columns and 'O3_final' in df.columns:
        df['Interaction_NO2_O3'] = df['NO2'] * df['O3_final']
    else:
        df['Interaction_NO2_O3'] = 0.0
        
    return df

# ====================================================
# 3. PREDICTION STABILIZATION
# ====================================================
def stabilize_predictions(current_forecasts, prev_forecasts=None):
    """
    Stabilizes predictions using temporal smoothing and clamping.
    current_forecasts: [24h, 48h, 72h] raw output
    prev_forecasts: [24h, 48h, 72h] from previous hour/day (if available)
    """
    # 1. Clip to physical limits
    stabilized = np.clip(current_forecasts, MIN_PM25, MAX_PM25)
    
    # 2. Temporal Smoothing (if history exists)
    if prev_forecasts is not None:
        # Limit the jump
        diff = stabilized - prev_forecasts
        
        # If jump > MAX_JUMP, clamp it
        # But allow if physics strongly supports it? (Simplified: Hard clamp safe for now)
        clipped_diff = np.clip(diff, -MAX_JUMP, MAX_JUMP)
        stabilized = prev_forecasts + clipped_diff
        
        # Exponential Smoothing (Alpha)
        alpha = 0.7 # Trust new forecast 70%, old 30%?
        # Actually user suggested alpha ~ 0.6-0.8
        stabilized = alpha * stabilized + (1 - alpha) * prev_forecasts
        
    return stabilized

# ====================================================
# 4. MAIN INFERENCE CLASS
# ====================================================
class DeepCaster:
    def __init__(self):
        print("Loading Model & Artifacts...")
        # Load with compile=False to avoid custom objects/loss issues for inference
        self.model = keras.models.load_model(MODEL_PATH, compile=False)
        
        self.scalers = joblib.load(SCALER_FILE)
        self.meta = joblib.load(META_FILE)
        self.feature_names = self.scalers['features']
        self.station_map = self.scalers['station_map']
        
    def predict_station(self, station_id, recent_history_df, prev_forecast=None):
        """
        station_id: Name of station (e.g. 'Anand_Vihar')
        recent_history_df: DataFrame with last SEQ_LEN hours
        prev_forecast: Optional
        """
        # 1. Clean
        clean_df = validate_and_clean_realtime(recent_history_df)
        
        # 2. Features
        feat_df = compute_features(clean_df)
        
        # 3. Normalize
        norm_df = feat_df.copy()
        for col in self.feature_names:
            if col in norm_df.columns:
                mean = self.scalers['means'][col]
                std = self.scalers['stds'][col]
                norm_df[col] = (norm_df[col] - mean) / std
            else:
                # Handle missing column?
                norm_df[col] = 0.0 
        
        # 4. Prepare Input Tensor
        # Shape (1, SEQ_LEN, F)
        # Assuming Dataframe is exactly SEQ_LEN rows
        seq_len = 48 # Hardcoded or check model
        
        vals = norm_df[self.feature_names].values[-seq_len:]
        if len(vals) < seq_len:
             # Pad?
             print("⚠️ Not enough history. Padding.")
             pad = np.zeros((seq_len - len(vals), len(self.feature_names)))
             vals = np.vstack([pad, vals])
             
        X_cont = np.expand_dims(vals, axis=0) # (1, 48, F)
        
        # Station ID
        sid = self.station_map.get(station_id, 0) # Default to 0 if unknown
        X_stat = np.array([sid]) # (1,)
        # Model expects (Batch, SEQ) for station? No, let's check build_model.
        # Input 'station_in' shape=(seq_len,). 
        # So we need (1, 48) of station IDs.
        X_stat = np.full((1, seq_len), sid)
        
        # 5. Predict
        preds = self.model.predict({"cont_in": X_cont, "station_in": X_stat}, verbose=0)
        
        # 🔻 INVERSE TRANSFORM (Sigmoid -> [0, 1] -> [0, 1000])
        preds = preds[0] * 1000.0  # TARGET_SCALE
        
        # 6. Stabilize
        final_preds = stabilize_predictions(preds, prev_forecast)
        
        return final_preds

    def run_all_stations(self, history_data_file=r"d:/forecast/clean_aqi_fixed_post_verification.csv"):
        """
        Runs inference for ALL stations using the latest available data.
        """
        print(f"Loading history from {history_data_file}...")
        full_df = pd.read_csv(history_data_file)
        full_df['From Date'] = pd.to_datetime(full_df['From Date'])
        
        results = []
        
        # Get list of stations from scaler metadata or the file
        stations = list(self.station_map.keys())
        print(f"Generating forecasts for {len(stations)} stations...")
        
        for station in stations:
            # Get last 48h for this station
            st_df = full_df[full_df['Station_ID'] == station].sort_values('From Date')
            
            if st_df.empty:
                print(f"⚠️ No data for {station}")
                continue
                
            last_48 = st_df.tail(48)
            
            if len(last_48) < 48:
                print(f"⚠️ Insufficient history for {station} (got {len(last_48)}). Padding handled in predict.")
                
            try:
                preds = self.predict_station(station, last_48)
                
                # Append result
                results.append({
                    "station_id": station,
                    "forecast_24h": round(float(preds[0]), 1),
                    "forecast_48h": round(float(preds[1]), 1),
                    "forecast_72h": round(float(preds[2]), 1)
                })
            except Exception as e:
                print(f"❌ Error predicting for {station}: {e}")
                
        # Save JSON
        out_file = r"d:/forecast/forecast_output_latest.json"
        with open(out_file, 'w') as f:
            json.dump(results, f, indent=2)
            
        print(f"✅ Forecasts saved to {out_file}")

if __name__ == "__main__":
    if os.path.exists(MODEL_PATH):
        caster = DeepCaster()
        caster.run_all_stations()
    else:
        print("⚠️ Model not found yet. Run training first.")
