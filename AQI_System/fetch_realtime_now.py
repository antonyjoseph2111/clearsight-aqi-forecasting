import pandas as pd
import json
import os
import datetime

# ================= Configuration =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CPCB_SAFETY_FILE = os.path.join(BASE_DIR, "cpcb_safety_layer.json")
SNAPSHOT_FILE = os.path.join(BASE_DIR, "realtime_snapshot.csv")

def main():
    print("=======================================================")
    print("   📢 LIVE REAL-TIME PM2.5 DATA DASHBOARD")
    print("   (Source: CPCB RSS FEED EXCLUSIVELY)")
    print("=======================================================")
    
    if not os.path.exists(CPCB_SAFETY_FILE):
        print(f"❌ Error: Safety file not found at {CPCB_SAFETY_FILE}")
        return

    try:
        with open(CPCB_SAFETY_FILE, 'r') as f:
            cpcb_data = json.load(f)
    except Exception as e:
        print(f"❌ Error loading CPCB data: {e}")
        return
        
    print(f"✅ Loaded CPCB Data for {len(cpcb_data)} stations.")
    
    report = []
    
    for station in cpcb_data:
        sid = station.get('Station_ID', 'Unknown')
        name = station.get('RSS_Station_Name', 'Unknown')
        
        # Extract PM2.5
        pm25 = 0.0
        pollutants = station.get('Pollutants', {})
        if 'PM2.5' in pollutants:
            pm25 = pollutants['PM2.5'].get('Avg', 0.0)
            
        last_update = station.get('Last_Update', '-')
        
        # Calculate Time Ago
        time_ago = "-"
        try:
            # Format: 09-12-2025 06:00:00
            dt = datetime.datetime.strptime(last_update, "%d-%m-%Y %H:%M:%S")
            now = datetime.datetime.now()
            diff = now - dt
            hours = diff.total_seconds() / 3600
            time_ago = f"{hours:.1f}h ago"
        except:
            pass
            
        report.append({
            "Station": sid,
            "Source": "CPCB_RSS",
            "PM2.5 Real-Time": pm25,
            "Time Agg": time_ago,
            "Original_Name": name
        })
        
    # Convert to DataFrame
    df = pd.DataFrame(report)
    
    # Sort by Station
    df = df.sort_values('Station')
    
    print("\n✅ FINAL REPORT:")
    print(df.to_string(index=False))
    
    # Save snapshot
    df.to_csv(SNAPSHOT_FILE, index=False)
    print(f"\nSaved snapshot to {SNAPSHOT_FILE}")

if __name__ == "__main__":
    main()
