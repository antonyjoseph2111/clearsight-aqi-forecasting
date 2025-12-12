"""
Fetch Historical Wind Data from OpenMeteo Archive API
======================================================
Fetches wind data for all CPCB stations for the date range matching
existing wind data (Feb 18 - Dec 02, 2025).
"""

import pandas as pd
import requests
import time
from datetime import datetime
import os

# OpenMeteo Historical Archive API
ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive"

# Variables to fetch (matching existing wind data structure)
HOURLY_VARS = [
    "temperature_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_speed_80m",
    "wind_direction_80m",
    "boundary_layer_height"
]

# Date range (matching existing data)
START_DATE = "2025-02-18"
END_DATE = "2025-12-02"

def fetch_station_wind(station_id, name, lat, lon):
    """Fetch historical wind data for a single station."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": ",".join(HOURLY_VARS),
        "timezone": "Asia/Kolkata"
    }
    
    try:
        response = requests.get(ARCHIVE_API, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        if "hourly" not in data:
            print(f"  ⚠️ No hourly data for {name}")
            return None
        
        # Create DataFrame
        hourly = data["hourly"]
        df = pd.DataFrame({
            "timestamp": pd.to_datetime(hourly["time"]),
            "station_id": station_id,
            "station_name": name,
            "lat": lat,
            "lon": lon,
            "wind_temp": hourly.get("temperature_2m"),
            "wind_speed_10m": hourly.get("wind_speed_10m"),
            "wind_dir_10m": hourly.get("wind_direction_10m"),
            "wind_speed_80m": hourly.get("wind_speed_80m"),
            "wind_dir_80m": hourly.get("wind_direction_80m"),
            "blh": hourly.get("boundary_layer_height")
        })
        
        return df
        
    except requests.RequestException as e:
        print(f"  ❌ Error fetching {name}: {e}")
        return None


def main():
    # Load stations
    script_dir = os.path.dirname(os.path.abspath(__file__))
    stations_path = os.path.join(script_dir, "data", "cleaned", "stations_metadata.csv")
    stations = pd.read_csv(stations_path)
    
    print(f"📡 Fetching wind data for {len(stations)} stations")
    print(f"📅 Date range: {START_DATE} to {END_DATE}")
    print("=" * 50)
    
    all_data = []
    
    for i, row in stations.iterrows():
        station_id = row["station_id"]
        name = row["station_name"]
        lat = row["lat"]
        lon = row["lon"]
        
        print(f"[{i+1}/{len(stations)}] Fetching {name}...", end=" ", flush=True)
        
        df = fetch_station_wind(station_id, name, lat, lon)
        
        if df is not None:
            all_data.append(df)
            print(f"✅ {len(df)} hours")
        else:
            print("⏭️ skipped")
        
        # Rate limiting - be nice to free API
        time.sleep(0.5)
    
    if all_data:
        # Combine all station data
        combined = pd.concat(all_data, ignore_index=True)
        
        # Save to CSV
        output_path = os.path.join(script_dir, "data", "cleaned", "wind_stations.csv")
        combined.to_csv(output_path, index=False)
        
        print("=" * 50)
        print(f"✅ Saved {len(combined)} records to wind_stations.csv")
        print(f"   Stations: {combined['station_id'].nunique()}")
        print(f"   Date range: {combined['timestamp'].min()} to {combined['timestamp'].max()}")
    else:
        print("❌ No data fetched")


if __name__ == "__main__":
    main()
