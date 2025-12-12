import requests
import xml.etree.ElementTree as ET
import pandas as pd
import json
import datetime
import os

# Internal Station IDs (Target List)
TARGET_STATIONS = {
    'Alipur_Delhi', 'Anand_Vihar_Delhi', 'Ashok_Vihar_Delhi', 'Bawana_Delhi',
    'CRRI_Mathura_Road_Delhi', 'Chandni_Chowk_Delhi', 'DTU_Delhi',
    'Dr._Karni_Singh_Shooting_Range_Delhi', 'Dwarka-Sector_8_Delhi',
    'IGI_Airport_Delhi', 'IHBAS_Dilshad_Garden_Delhi', 'Jahangirpuri_Delhi',
    'Jawaharlal_Nehru_Stadium_Delhi', 'Lodhi_Road_Delhi_IITM',
    'Major_Dhyan_Chand_National_Stadium_Delhi', 'Mandir_Marg_Delhi',
    'Mundka_Delhi', 'NSIT_Dwarka_Delhi', 'Najafgarh_Delhi', 'Narela_Delhi',
    'Nehru_Nagar_Delhi', 'Okhla_Phase-2_Delhi', 'Patparganj_Delhi',
    'Punjabi_Bagh_Delhi', 'Pusa_Delhi_DPCC', 'R_K_Puram_Delhi', 'Rohini_Delhi',
    'Shadipur_Delhi', 'Sirifort_Delhi', 'Sonia_Vihar_Delhi',
    'Sri_Aurobindo_Marg_Delhi', 'Vivek_Vihar_Delhi', 'Wazirpur_Delhi'
}

def get_station_mapping(rss_name):
    # Base name extraction: "Name, Delhi - Agency" -> "Name"
    if ", Delhi" in rss_name:
        base_name = rss_name.split(", Delhi")[0].strip()
    else:
        base_name = rss_name

    # Special Cases
    if "Lodhi Road" in base_name:
        return 'Lodhi_Road_Delhi_IITM'
    if "Pusa" in base_name:
        return 'Pusa_Delhi_DPCC'
    if "IGI Airport" in base_name:
        return 'IGI_Airport_Delhi'
    if "Dr. Karni Singh" in base_name:
        return 'Dr._Karni_Singh_Shooting_Range_Delhi'
    if "Dwarka-Sector 8" in base_name:
        return 'Dwarka-Sector_8_Delhi'
    if "Major Dhyan Chand" in base_name:
        return 'Major_Dhyan_Chand_National_Stadium_Delhi'
    if "Sri Aurobindo Marg" in base_name:
        return 'Sri_Aurobindo_Marg_Delhi'
    if "Okhla Phase-2" in base_name:
        return 'Okhla_Phase-2_Delhi'

    # Generic Rule: Replace space with underscore + _Delhi
    generic_id = base_name.replace(' ', '_') + '_Delhi'
    
    if generic_id in TARGET_STATIONS:
        return generic_id
        
    return None

def fetch_safety_layer():
    url = "https://airquality.cpcb.gov.in/caaqms/rss_feed"
    print(f"Fetching RSS feed from {url}...")
    try:
        response = requests.get(url, verify=False, timeout=30)
        root = ET.fromstring(response.content)
    except Exception as e:
        print(f"Error fetching/parsing RSS: {e}")
        return

    data = []
    
    # Iterate through XML
    for state in root.findall(".//State"):
        if "Delhi" in state.get('id', ''):
            for city in state.findall(".//City"):
                for station in city.findall(".//Station"):
                    rss_id = station.get('id')
                    lat = station.get('latitude')
                    lon = station.get('longitude')
                    last_update = station.get('lastupdate')
                    
                    internal_id = get_station_mapping(rss_id)
                    
                    if internal_id:
                        station_data = {
                            'Station_ID': internal_id,
                            'RSS_Station_Name': rss_id,
                            'Latitude': lat,
                            'Longitude': lon,
                            'Last_Update': last_update,
                            'Pollutants': {}
                        }
                        
                        # Extract pollutants
                        for pol in station.findall("Pollutant_Index"):
                            p_id = pol.get('id')
                            avg_val = pol.get('Avg')
                            sub_idx = pol.get('Hourly_sub_index') # Get Sub-Index
                            
                            # Clean bad values
                            vals = {'Avg': None, 'SubIndex': None}
                            
                            for k, v in [('Avg', avg_val), ('SubIndex', sub_idx)]:
                                if v == "NA" or v is None:
                                    vals[k] = None
                                else:
                                    try:
                                        vals[k] = float(v)
                                    except:
                                        vals[k] = None
                                    
                            station_data['Pollutants'][p_id] = vals
                            
                        # Extract Station Aggregate AQI if available
                        station_aqi = station.find("Air_Quality_Index")
                        if station_aqi is not None:
                            station_data['AQI_Value'] = station_aqi.get('Value')
                            station_data['Prominent_Pollutant'] = station_aqi.get('Predominant_Parameter')
                        else:
                            station_data['AQI_Value'] = None
                            station_data['Prominent_Pollutant'] = None
                        
                        data.append(station_data)
                    else:
                        # Log unmatched for debug (optional)
                        pass
                        
    # Convert to DataFrame or Dictionary
    if not data:
        print("No matching stations found.")
        return

    # Save as JSON
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(BASE_DIR, 'cpcb_safety_layer.json')
    print(f"Saving {len(data)} stations to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=4)
        
    print("Success.")

if __name__ == "__main__":
    fetch_safety_layer()
