
import numpy as np
import pandas as pd
import json
import os
import datetime
from datetime import timedelta
import joblib

# Import the existing DeepCaster for the raw ML predictions
try:
    from src_deep_model.inference_03 import DeepCaster 
except ImportError:
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'src_deep_model'))
    try:
        from inference_03 import DeepCaster
    except ImportError:
        import importlib.util
        spec = importlib.util.spec_from_file_location("DeepCaster", "src_deep_model/03_inference.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        DeepCaster = mod.DeepCaster

# ====================================================
# CONFIGURATION
# ====================================================
# Dynamic Base Directory (Parent of src_deep_model)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Input/Output Paths
LOCAL_DATA_FILE = os.path.join(BASE_DIR, "merged_aqi_dataset.csv")
OUTPUT_JSON = os.path.join(BASE_DIR, "forecast_safety_hybrid.json")
CPCB_SAFETY_FILE = os.path.join(BASE_DIR, "cpcb_safety_layer.json")

# Ensure imports work regardless of CWD
sys.path.append(os.path.join(BASE_DIR, 'src_deep_model'))


# Blending Parameters
# Confidence relies on CPCB data being "Truth"
# If CPCB data differs from Model, we trust CPCB for T+0 (Now) and blend towards Model?
# OR: We trust CPCB as the anchor.
WEIGHT_HIGH = 0.8       # 80% Model, 20% Baseline (if close)
WEIGHT_LOW = 0.2        # 20% Model, 80% Baseline (if divergent)
TRUST_SIGMA = 50.0      # Difference in raw AQI/PM2.5 to trigger distrust

# ====================================================
# UTILS
# ====================================================
def load_cpcb_safety_data():
    """
    Loads the CPCB safety layer JSON into a dictionary keyed by Station_ID.
    """
    print(f"Loading CPCB Safety Data from {CPCB_SAFETY_FILE}...")
    if not os.path.exists(CPCB_SAFETY_FILE):
        print("❌ CPCB Safety File not found!")
        return {}
        
    try:
        with open(CPCB_SAFETY_FILE, 'r') as f:
            data = json.load(f)
            
        cpcb_map = {}
        for item in data:
            cpcb_map[item['Station_ID']] = item
            
        print(f"✅ Loaded safety data for {len(cpcb_map)} stations.")
        return cpcb_map
    except Exception as e:
        print(f"❌ Error loading CPCB file: {e}")
        return {}

def blend_with_cpcb(model_preds, cpcb_val, horizon_hours=[24, 48, 72]):
    """
    Blends ML predictions with CPCB Real-time value using Adaptive Weighting & Sequential Baselines.
    
    Logic:
    1. Day 1 Baseline = current CPCB Value.
    2. Day 2 Baseline = Day 1 Final Forecast.
    3. Day 3 Baseline = Day 2 Final Forecast.
    
    Adaptive Trust:
    - If Model is close to Baseline -> High Trust (0.9)
    - If Model is far from Baseline -> Low Trust (Drops to ~0.2)
    - Trust decary is linear based on difference.
    """
    if cpcb_val is None:
        # Trust model 100% if no safety data (fallback)
        return model_preds, [0,0,0], [1.0, 1.0, 1.0]

    final_preds = []
    baselines_used = []
    trust_scores = []
    
    # Initialize Baseline for T+24h as Current Reality (T+0)
    current_baseline = cpcb_val
    
    for i, pred in enumerate(model_preds):
        # 1. Store the baseline used for this horizon
        baselines_used.append(current_baseline)
        
        # 2. Calculate Adaptive Trust Weight
        diff = abs(pred - current_baseline)
        
        # Thresholds for PM2.5 (ug/m3)
        # 0 diff -> 0.90 Trust
        # 50 diff -> 0.65 Trust
        # 100 diff -> 0.40 Trust
        # 150+ diff -> 0.15 Trust (Floor)
        
        decay_factor = diff / 150.0 # Normalized deviation
        raw_weight = 0.9 - (0.75 * min(1.0, decay_factor))
        w_model = round(max(0.15, raw_weight), 2)
        
        # 3. Blend
        # Forecast = w * Model + (1-w) * Baseline
        val_blended = w_model * pred + (1 - w_model) * current_baseline
        
        # 4. Update state
        final_preds.append(val_blended)
        trust_scores.append(w_model)
        
        # 5. Determine Baseline for NEXT horizon
        # User requested: "use predictions in day one as baseline of day 2"
        current_baseline = val_blended
        
    return np.array(final_preds), baselines_used, trust_scores

# ====================================================
# MAIN EXECUTION
# ====================================================
def run_hybrid_cpcb_system():
    # 1. Load Model
    caster = DeepCaster()
    
    # 2. Load Local History (for ML input)
    print("Loading Local History...")
    full_df = pd.read_csv(LOCAL_DATA_FILE)
    full_df['From Date'] = pd.to_datetime(full_df['From Date'])
    
    # 3. Load CPCB Safety Layer
    cpcb_map = load_cpcb_safety_data()
    
    # 4. Prepare Output
    final_results = {
        "generated_at": datetime.datetime.now().isoformat(),
        "source": "CPCB_RSS_HYBRID",
        "forecasts": []
    }
    
    # Get Unique Stations from CPCB Map OR Local File?
    # Better to use Intersection to ensure we have history for them.
    local_stations = full_df['Station_ID'].unique()
    
    # Loop
    print(f"Generating forecasts for {len(local_stations)} stations...")
    
    for s_id in local_stations:
        # A. Get CPCB Data for this station
        cpcb_info = cpcb_map.get(s_id, {})
        
        # Extract PM2.5 Current
        pm25_current = None
        prom_poll = "PM2.5" # Default
        aqi_val = None
        last_update = None
        
        if cpcb_info:
            last_update = cpcb_info.get('Last_Update')
            aqi_val = cpcb_info.get('AQI_Value')
            prom_poll = cpcb_info.get('Prominent_Pollutant') or "PM2.5"
            
            # PM2.5 might be inside Pollutants -> PM2.5 -> Avg or pollutants directly?
            # Check structure in fetch_cpcb_safety.py:
            # Pollutants: { 'PM2.5': {'Avg': 123, ...} }
            pols = cpcb_info.get('Pollutants', {})
            pm25_obj = pols.get('PM2.5')
            if isinstance(pm25_obj, dict):
                pm25_current = pm25_obj.get('Avg')
            elif isinstance(pm25_obj, (float, int)):
                 pm25_current = pm25_obj
        
        # B. Run ML Model
        st_df = full_df[full_df['Station_ID'] == s_id].sort_values('From Date')
        if st_df.empty: continue
        
        # Extract Lat/Lon
        # Priority 1: CPCB RSS Feed (Highest Reliability)
        # Priority 2: Local History (Fallback)
        lat = 0.0
        lon = 0.0
        
        if cpcb_info and cpcb_info.get('Latitude') and cpcb_info.get('Longitude'):
            try:
                lat = float(cpcb_info.get('Latitude'))
                lon = float(cpcb_info.get('Longitude'))
            except:
                pass
                
        if lat == 0.0 and lon == 0.0:
            if 'Latitude' in st_df.columns:
                val = st_df['Latitude'].iloc[-1]
                if not pd.isna(val): lat = float(val)
            if 'Longitude' in st_df.columns:
                val = st_df['Longitude'].iloc[-1]
                if not pd.isna(val): lon = float(val)
        
        ml_history = st_df.tail(48)
        
        try:
            # Predict raw
            ml_preds_raw = caster.predict_station(s_id, ml_history)
        except Exception as e:
            print(f"⚠️ ML Prediction failed for {s_id}: {e}")
            ml_preds_raw = [0,0,0] # Fail safe?
            # Or continue?
            # continue
        
        # C. Blend with CPCB
        final_vals, baselines, weights = blend_with_cpcb(ml_preds_raw, pm25_current)
        
        # D. Package
        station_obj = {
            "station_id": s_id,
            "lat": lat,
            "lon": lon,
            "forecasts": [],
            "current_safety_data": {
                "aqi": aqi_val,
                "prominent_pollutant": prom_poll,
                "current_pm25": pm25_current,
                "last_update": last_update,
                "source": "CPCB_RSS"
            }
        }
        
        horizons = [24, 48, 72]
        for i, h in enumerate(horizons):
            val = max(0, final_vals[i]) # Clip negative
            
            cat = "Severe"
            if val <= 30: cat = "Good"
            elif val <= 60: cat = "Satisfactory"
            elif val <= 90: cat = "Moderate"
            elif val <= 120: cat = "Poor"
            elif val <= 250: cat = "Very Poor"
            
            f_obj = {
                "horizon_hours": h,
                "pm25_model_raw": round(float(ml_preds_raw[i]), 1),
                "pm25_baseline_cpcb": round(float(baselines[i] if baselines[i] else 0), 1),
                "trust_model": round(float(weights[i]), 2),
                "pm25_final": round(float(val), 1),
                "category": cat,
                "primary_pollutant": prom_poll
            }
            station_obj['forecasts'].append(f_obj)
            
        final_results['forecasts'].append(station_obj)
        
    # Save
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(final_results, f, indent=2)
    print(f"\n✅ Hybrid CPCB Forecast saved to {OUTPUT_JSON}")

if __name__ == "__main__":
    run_hybrid_cpcb_system()
