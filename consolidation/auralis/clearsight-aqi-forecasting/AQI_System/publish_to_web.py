import json
import os

# Paths (Relative to AQI_System folder where this script resides)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_JSON = os.path.join(BASE_DIR, "forecast_safety_hybrid.json")

# Target Output (Up one level, then into AQI_Map_Website)
WEB_DIR = os.path.join(os.path.dirname(BASE_DIR), "AQI_Map_Website")
OUTPUT_JS = os.path.join(WEB_DIR, "data.js")

def publish():
    print(f"Reading forecast from {INPUT_JSON}...")
    if not os.path.exists(INPUT_JSON):
        print("❌ Forecast file not found!")
        return

    with open(INPUT_JSON, 'r') as f:
        data = json.load(f)

    # Wrap in JS variable
    js_content = f"const aqiData = {json.dumps(data, indent=2)};"

    if not os.path.exists(WEB_DIR):
        os.makedirs(WEB_DIR)

    with open(OUTPUT_JS, 'w') as f:
        f.write(js_content)
        
    # ALSO Save JSON for direct API access
    json_out = os.path.join(WEB_DIR, "forecast.json")
    with open(json_out, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Published Web Data to {OUTPUT_JS}")
    print(f"✅ Published Raw JSON to {json_out}")

if __name__ == "__main__":
    publish()
