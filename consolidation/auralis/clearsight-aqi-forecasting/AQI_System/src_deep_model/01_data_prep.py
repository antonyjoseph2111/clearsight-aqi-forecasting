
import pandas as pd
import numpy as np
import os
import joblib

# ====================================================
# CONFIGURATION
# ====================================================
# Dynamic Base Directory (Parent of src_deep_model)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_FILE = os.path.join(BASE_DIR, "merged_aqi_dataset.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "deep_model_data")

# Ensure Output Dir exists
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

OUTPUT_DATA_FILE = os.path.join(OUTPUT_DIR, "dl_ready.npz")
SCALER_FILE = os.path.join(OUTPUT_DIR, "scalers.pkl")
META_FILE = os.path.join(OUTPUT_DIR, "meta_data.pkl")

SEQ_LEN = 48  # 48 hours past context
HORIZONS = [24, 48, 72]

# Split Dates
VAL_START_DATE = "2025-01-01"
TEST_START_DATE = "2025-07-01"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_data_prep():
    print("====================================================")
    print("1️⃣ LOADING & SANITY CHECK")
    print("====================================================")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Input file not found: {INPUT_FILE}")
        return

    df = pd.read_csv(INPUT_FILE)
    df['From Date'] = pd.to_datetime(df['From Date'])
    df = df.sort_values(['Station_ID', 'From Date']).reset_index(drop=True)
    
    print(f"Shape: {df.shape}")
    print(f"Time Range: {df['From Date'].min()} to {df['From Date'].max()}")
    print(f"Stations: {df['Station_ID'].nunique()}")
    
    # --- IMPUTATION FOR HISTORICAL MISSING WEATHER ---
    # Historical data lacks Temp, RH, WS. We fill with climatology (Month-Hour Avg)
    # derived from the recent data (which has these values).
    
    # Ensure date parts exist
    df['Month'] = df['From Date'].dt.month
    df['Hour'] = df['From Date'].dt.hour
    
    weather_cols = ['Temp', 'RH', 'WS', 'WD', 'BP', 'SR', 'TOT-RF (mm)']
    # Only impute columns that exist in DataFrame but have NaNs
    cols_to_fix = [c for c in weather_cols if c in df.columns and df[c].isnull().sum() > 0]
    
    if cols_to_fix:
        print(f"⚠️ Imputing missing weather columns: {cols_to_fix} using Climatology (Month-Hour Mean)...")
        for col in cols_to_fix:
            # Calculate means from non-null data
            means = df.groupby(['Month', 'Hour'])[col].transform('mean')
            # Fill NaNs
            df[col] = df[col].fillna(means)
            # If any remain (e.g. no data for that Month-Hour at all), fill with global mean
            df[col] = df[col].fillna(df[col].mean())
            
    # Clean up temp cols if needed? No, 'Month'/'Hour' are used later anyway.
    
    # Sanity Check for Missing
    req_cols = ['PM2.5', 'Temp', 'RH', 'WS']
    # Check if they exist first
    req_cols = [c for c in req_cols if c in df.columns]
    
    missing = df[req_cols].isnull().sum()
    if missing.sum() > 0:
        print("❌ CRITICAL: Found missing values in core columns!")
        print(missing[missing > 0])
        return 
    else:
        print("✅ Core columns have 0 missing values.")

    print("\n====================================================")
    print("2️⃣ PHYSICS & CHEMISTRY FEATURE ENGINEERING")
    print("====================================================")
    
    # 1. Physical Clipping (Safety)
    if 'RH' in df.columns: df['RH'] = df['RH'].clip(0, 100)
    if 'Temp' in df.columns: df['Temp'] = df['Temp'].clip(-5, 55)
    if 'WS' in df.columns: df['WS'] = df['WS'].clip(0, 20)

    # 2. Ventilation Proxy (WS * Abs Temp)
    # T in Kelvin approx -> T + 273.15
    df['Ventilation'] = df['WS'] * (df['Temp'] + 273.15)
    
    # 3. Stagnation Flag
    # (WS < 0.5 and RH > 70 and Temp < 20)
    df['Stagnation'] = ((df['WS'] < 0.5) & (df['RH'] > 70) & (df['Temp'] < 20)).astype(int)

    # 4. Seasonal Flags
    df['Month'] = df['From Date'].dt.month
    df['is_winter'] = df['Month'].isin([12, 1, 2]).astype(int)
    df['is_premonsoon'] = df['Month'].isin([3, 4, 5]).astype(int)
    df['is_monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
    df['is_postmonsoon'] = df['Month'].isin([10, 11]).astype(int)

    # 5. Time of Day
    df['Hour'] = df['From Date'].dt.hour
    df['is_night'] = df['Hour'].isin([0, 1, 2, 3, 4, 5, 22, 23]).astype(int)
    df['is_peak_traffic'] = df['Hour'].isin([7, 8, 9, 10, 18, 19, 20, 21]).astype(int)
    
    # 6. Chemistry Proxies (Requested by User)
    # Ensure non-zero divisors
    eps = 1e-6
    
    # NOx consistency (if missing, create; else trust or simple sum?)
    # Dataset has NOx usually. Let's create a computed one for safety or features?
    # User said: "NOx = NO + NO2 (if not already consistent)"
    # We'll create 'NOx_calc'? Or just use existing. 
    # Let's add specific interaction terms.
    
    if 'NO2' in df.columns and 'NO' in df.columns:
         df['NOx_calc'] = df['NO'] + df['NO2']
    else:
         df['NOx_calc'] = 0.0
         
    # Ratio NO2/NOx
    # Use max of NOx_calc or existing NOx? Let's use computed to avoid denom issues if NOx is 0.
    # Clip denom to avoids div by zero
    df['Ratio_NO2_NOx'] = df['NO2'] / (df['NOx_calc'].replace(0, eps))
    
    # Ratio PM2.5/PM10
    if 'PM10' in df.columns:
        df['Ratio_PM25_PM10'] = df['PM2.5'] / (df['PM10'].replace(0, eps))
        df['Ratio_PM25_PM10'] = df['Ratio_PM25_PM10'].clip(0, 1) # Ratio shouldn't be > 1 logically
    else:
        df['Ratio_PM25_PM10'] = 0.5 # fallback?
        
    # Interaction: NO2 * O3
    if 'NO2' in df.columns and 'O3_final' in df.columns:
        df['Interaction_NO2_O3'] = df['NO2'] * df['O3_final']
    else:
        df['Interaction_NO2_O3'] = 0.0

    # Core Features List
    # Selecting available columns from the potential list
    potential_pollutants = ['PM2.5', 'PM10', 'NO2', 'NO', 'NOx', 'SO2', 'CO', 'O3_final', 'NH3', 'Benzene', 'Toluene']
    potential_met = ['Temp', 'RH', 'WS', 'WD', 'BP', 'SR', 'TOT-RF (mm)']
    
    # Filter only what exists
    feat_chem = [c for c in potential_pollutants if c in df.columns]
    feat_met = [c for c in potential_met if c in df.columns]
    feat_time = ['Hour', 'Month', 'is_winter', 'is_premonsoon', 'is_monsoon', 'is_postmonsoon', 'is_night', 'is_peak_traffic']
    feat_phys = ['Ventilation', 'Stagnation']
    feat_derived = ['Ratio_NO2_NOx', 'Ratio_PM25_PM10', 'Interaction_NO2_O3']
    feat_space = ['Latitude', 'Longitude'] 
    
    feature_cols = feat_chem + feat_met + feat_time + feat_phys + feat_derived + feat_space
    # Remove duplicates if any
    feature_cols = sorted(list(set(feature_cols)))
    
    print(f"Selected {len(feature_cols)} Input Features:")
    print(feature_cols)

    print("\n====================================================")
    print("3️⃣ MULTI-HORIZON TARGETS")
    print("====================================================")
    
    # We need to shift targets per station
    # Targets: PM2.5 at t+24, t+48, t+72
    
    for h in HORIZONS:
        col_name = f'Target_PM25_{h}h'
        df[col_name] = df.groupby('Station_ID')['PM2.5'].shift(-h)
    
    # Drop NaNs created by shifting (last 72 hours of each station)
    target_cols = [f'Target_PM25_{h}h' for h in HORIZONS]
    valid_rows_idx = df.dropna(subset=target_cols).index
    df = df.loc[valid_rows_idx].copy()
    
    print(f"Rows after creating targets & dropna: {df.shape[0]}")
    print(df[['From Date', 'Station_ID', 'PM2.5'] + target_cols].head().to_string())

    print("\n====================================================")
    print("4️⃣ NORMALIZATION & STATION ENCODING")
    print("====================================================")
    
    # Station Encoding
    unique_stations = df['Station_ID'].unique()
    station_to_idx = {name: i for i, name in enumerate(unique_stations)}
    df['Station_Idx'] = df['Station_ID'].map(station_to_idx)
    
    print(f"Encoded {len(unique_stations)} stations.")
    
    # Normalization
    train_slice = df[df['From Date'] < VAL_START_DATE]
    if train_slice.empty:
        print("⚠️ Warning: Train slice empty? Using full DF for scaler.")
        train_slice = df
        
    feat_means = train_slice[feature_cols].mean()
    feat_stds = train_slice[feature_cols].std()
    feat_stds = feat_stds.replace(0, 1.0)
    
    # Apply to whole DF
    df_norm = df.copy()
    for col in feature_cols:
        df_norm[col] = (df[col] - feat_means[col]) / feat_stds[col]
        
    print("Features normalized (fit on Train set).")
    
    # Save Scalers
    scaler_data = {
        'means': feat_means.to_dict(),
        'stds': feat_stds.to_dict(),
        'features': feature_cols,
        'station_map': station_to_idx,
        'horizons': HORIZONS
    }
    joblib.dump(scaler_data, SCALER_FILE)
    print(f"Saved scalers to {SCALER_FILE}")

    print("\n====================================================")
    print("5️⃣ SEQUENCE GENERATION")
    print("====================================================")
    
    X_cont_list = []
    X_stat_list = []
    y_list = []
    time_end_list = []
    
    print("Generating sequences... (this may take a moment)")
    
    from numpy.lib.stride_tricks import sliding_window_view
    
    for sid, group in df_norm.groupby('Station_Idx'):
        group = group.sort_values('From Date')
        
        data_vals = group[feature_cols].values.astype(np.float32) # USE FLOAT32
        target_vals = group[target_cols].values.astype(np.float32)
        times = group['From Date'].values
        
        if len(group) <= SEQ_LEN:
            continue
            
        # Sliding Window
        # Shape: (Num_Windows, F, SEQ_LEN) because axis=0 was windowed
        feat_windows = sliding_window_view(data_vals, window_shape=SEQ_LEN, axis=0)
        
        # Transpose to (Num_Windows, SEQ_LEN, F)
        feat_windows = feat_windows.transpose(0, 2, 1)
        
        t_targets = target_vals[SEQ_LEN-1:]
        t_times = times[SEQ_LEN-1:]
        
        t_stats = np.full(len(t_targets), sid, dtype=np.int32)
        
        X_cont_list.append(feat_windows)
        X_stat_list.append(t_stats)
        y_list.append(t_targets)
        time_end_list.append(t_times)
        
    if not X_cont_list:
        print("❌ No sequences generated!")
        return

    X_cont = np.concatenate(X_cont_list, axis=0) # (Total, SEQ, F)
    X_stat = np.concatenate(X_stat_list, axis=0)
    y = np.concatenate(y_list, axis=0)
    time_ends = np.concatenate(time_end_list, axis=0)
    
    print(f"Total Sequences: {X_cont.shape[0]}")
    print(f"X_cont shape: {X_cont.shape}")
    print(f"y shape: {y.shape}")

    print("\n====================================================")
    print("6️⃣ TIME-BASED SPLITTING & SAVING")
    print("====================================================")
    
    time_ends_pd = pd.to_datetime(time_ends)
    
    train_mask = (time_ends_pd < VAL_START_DATE)
    val_mask = (time_ends_pd >= VAL_START_DATE) & (time_ends_pd < TEST_START_DATE)
    test_mask = (time_ends_pd >= TEST_START_DATE)
    
    # Save separately to avoid memory error
    print("Saving Trace files...")
    
    # TRAIN
    train_file = os.path.join(OUTPUT_DIR, "train_data.npz")
    np.savez(train_file, 
             X_cont=X_cont[train_mask], 
             X_stat=X_stat[train_mask], 
             y=y[train_mask])
    print(f"Saved Train: {train_file}")
    
    # VAL
    val_file = os.path.join(OUTPUT_DIR, "val_data.npz")
    np.savez(val_file, 
             X_cont=X_cont[val_mask], 
             X_stat=X_stat[val_mask], 
             y=y[val_mask])
    print(f"Saved Val: {val_file}")
    
    # TEST
    test_file = os.path.join(OUTPUT_DIR, "test_data.npz")
    np.savez(test_file, 
             X_cont=X_cont[test_mask], 
             X_stat=X_stat[test_mask], 
             y=y[test_mask])
    print(f"Saved Test: {test_file}")
    
    # Metadata
    meta_file = os.path.join(OUTPUT_DIR, "meta_data.pkl")
    joblib.dump({
        'feature_names': feature_cols,
        'unique_stations': unique_stations
    }, meta_file)
             
    print(f"✅ Data Prep Complete!")

if __name__ == "__main__":
    run_data_prep()
