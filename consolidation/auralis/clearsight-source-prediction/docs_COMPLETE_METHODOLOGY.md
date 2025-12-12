# Delhi Air Pollution Source Attribution
## Complete Step-by-Step Methodology

---

# OVERVIEW: What We're Doing

**Input**: For each station at each hour, we have:
- Station location (lat, lon)
- Pollutant readings (PM2.5, PM10, NO2, SO2, CO)
- Meteorology (wind direction, wind speed, boundary layer height)
- VIIRS fire detections (lat, lon, FRP)
- Industry locations (lat, lon, type, stack height)

**Output**: For each station at each hour:
- Percentage contribution from each source (stubble, traffic, industry, dust, trapping)
- Probable source locations
- Explanation text

**Process**:
```
Raw Data → Feature Calculation → Source Scores → Normalization → Output
```

---

# STEP 0: Data Preparation

## 0.1 Load and Clean CPCB Data

```python
import pandas as pd
import numpy as np

def clean_cpcb_data(df):
    """
    Clean CPCB station readings.
    """
    pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3']
    
    for col in pollutants:
        if col in df.columns:
            # Replace error codes with NaN
            df.loc[df[col] < 0, col] = np.nan      # Negative = error
            df.loc[df[col] > 2000, col] = np.nan   # Unrealistic high
    
    # Ensure timestamp is datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Extract time features
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek  # 0=Monday
    df['month'] = df['timestamp'].dt.month
    
    return df
```

## 0.2 Station Coordinates

You need lat/lon for each station. Example:

```python
STATION_COORDS = {
    'Anand Vihar': (28.6469, 77.3164),
    'ITO': (28.6289, 77.2414),
    'RK Puram': (28.5651, 77.1752),
    'Lodhi Road': (28.5918, 77.2273),
    'Punjabi Bagh': (28.6683, 77.1167),
    'Dwarka Sector 8': (28.5708, 77.0713),
    'Okhla': (28.5308, 77.2713),
    'Narela': (28.8526, 77.0929),
    # ... add all 62 stations
}
```

---

# STEP 1: Geographic Calculations

## 1.1 Haversine Distance

Calculate great-circle distance between two points on Earth.

**Formula**:

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

$$d = R \cdot c$$

Where:
- $\phi_1, \phi_2$ = latitudes in radians
- $\lambda_1, \lambda_2$ = longitudes in radians
- $\Delta\phi = \phi_2 - \phi_1$
- $\Delta\lambda = \lambda_2 - \lambda_1$
- $R = 6371$ km (Earth's radius)
- $d$ = distance in km

**Code**:

```python
import math

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate great-circle distance between two points.
    
    Parameters:
        lat1, lon1: First point (degrees)
        lat2, lon2: Second point (degrees)
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in km
    
    # Convert to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(delta_phi / 2) ** 2 + 
         math.cos(phi1) * math.cos(phi2) * 
         math.sin(delta_lambda / 2) ** 2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    
    return distance
```

**Example**:
```python
# Distance from Anand Vihar to a fire in Sangrur, Punjab
dist = haversine(28.6469, 77.3164, 30.2331, 75.8406)
# Result: ~245 km
```

## 1.2 Bearing Calculation

Calculate the direction from station to source (fire or industry).

**Formula**:

$$\theta = \text{atan2}\left(\sin(\Delta\lambda) \cdot \cos(\phi_2), \cos(\phi_1) \cdot \sin(\phi_2) - \sin(\phi_1) \cdot \cos(\phi_2) \cdot \cos(\Delta\lambda)\right)$$

$$\text{bearing} = (\theta \cdot \frac{180}{\pi} + 360) \mod 360$$

Where:
- Result is in degrees, clockwise from North
- 0° = North, 90° = East, 180° = South, 270° = West

**Code**:

```python
def calculate_bearing(lat1, lon1, lat2, lon2):
    """
    Calculate initial bearing from point 1 to point 2.
    
    Parameters:
        lat1, lon1: Station location (degrees)
        lat2, lon2: Source location (degrees)
    
    Returns:
        Bearing in degrees (0-360, clockwise from North)
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)
    
    x = math.sin(delta_lambda) * math.cos(phi2)
    y = (math.cos(phi1) * math.sin(phi2) - 
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
    
    theta = math.atan2(x, y)
    
    bearing = (math.degrees(theta) + 360) % 360
    
    return bearing
```

**Example**:
```python
# Bearing from Anand Vihar to Sangrur
bearing = calculate_bearing(28.6469, 77.3164, 30.2331, 75.8406)
# Result: ~315° (Northwest)
```

## 1.3 Angular Difference

Calculate the smallest angle between two directions.

**Formula**:

$$\Delta\theta = \min(|\theta_1 - \theta_2|, 360 - |\theta_1 - \theta_2|)$$

**Code**:

```python
def angular_difference(angle1, angle2):
    """
    Calculate smallest angle between two bearings.
    
    Parameters:
        angle1, angle2: Bearings in degrees (0-360)
    
    Returns:
        Difference in degrees (0-180)
    """
    diff = abs(angle1 - angle2)
    if diff > 180:
        diff = 360 - diff
    return diff
```

**Example**:
```python
angular_difference(350, 10)   # Result: 20°
angular_difference(90, 270)   # Result: 180°
```

## 1.4 Upwind Check

Determine if a source is upwind of the station.

**Logic**:
- Wind direction = where wind comes FROM
- If wind_dir = 290°, air is coming from 290° (NW)
- A fire at bearing 290° from the station is directly upwind
- We allow tolerance (typically 45-60°) for plume spread

**Code**:

```python
def is_upwind(source_bearing, wind_direction, tolerance=45):
    """
    Check if a source is upwind of the station.
    
    Parameters:
        source_bearing: Bearing from station to source (degrees)
        wind_direction: Direction wind is coming FROM (degrees)
        tolerance: Allowed deviation in degrees
    
    Returns:
        Boolean: True if source is upwind
    """
    diff = angular_difference(source_bearing, wind_direction)
    return diff <= tolerance
```

**Example**:
```python
# Wind from NW (290°), fire at bearing 315° from station
is_upwind(315, 290, tolerance=45)  # True (diff = 25° < 45°)

# Wind from NW (290°), fire at bearing 90° (East) from station
is_upwind(90, 290, tolerance=45)   # False (diff = 160° > 45°)
```

---

# STEP 2: Stubble Burning Score

## 2.1 Overview

We calculate how much stubble burning smoke is likely reaching the station based on:
1. Season (fires only Oct-Jan)
2. Wind direction (must be from NW)
3. Number and intensity of upwind fires
4. Atmospheric trapping (BLH)

## 2.2 Full Algorithm

```python
def calculate_stubble_score(station_lat, station_lon, timestamp, 
                            wind_dir, blh, fires_df):
    """
    Calculate stubble burning contribution score.
    
    Parameters:
        station_lat, station_lon: Station location
        timestamp: datetime object
        wind_dir: Wind direction in degrees (where wind comes FROM)
        blh: Boundary layer height in meters
        fires_df: DataFrame with columns [latitude, longitude, frp]
    
    Returns:
        dict with score, level, contributing fires, explanation
    """
    month = timestamp.month
    
    # STEP 2.2.1: Seasonal check
    if month not in [10, 11, 12, 1]:  # Oct, Nov, Dec, Jan
        return {
            'score': 5,
            'level': 'None',
            'fire_count': 0,
            'explanation': 'Not stubble burning season'
        }
    
    # STEP 2.2.2: Wind direction check
    # Punjab/Haryana are NW of Delhi (roughly 250° to 340°)
    if not (250 <= wind_dir <= 340):
        return {
            'score': 10,
            'level': 'Low',
            'fire_count': 0,
            'explanation': f'Wind from {wind_dir}°, not from agricultural belt (NW)'
        }
    
    # STEP 2.2.3: Calculate fire contributions
    total_contribution = 0
    contributing_fires = []
    
    for idx, fire in fires_df.iterrows():
        fire_lat = fire['latitude']
        fire_lon = fire['longitude']
        frp = fire.get('frp', 10)  # Fire Radiative Power, default 10 MW
        
        # Distance to fire
        distance = haversine(station_lat, station_lon, fire_lat, fire_lon)
        
        # Skip fires too far away
        if distance > 400:  # km
            continue
        
        # Bearing to fire
        bearing = calculate_bearing(station_lat, station_lon, fire_lat, fire_lon)
        
        # Check if upwind
        angle_diff = angular_difference(bearing, wind_dir)
        if angle_diff > 60:  # Not upwind enough
            continue
        
        # STEP 2.2.4: Calculate contribution factors
        
        # Alignment factor: 1.0 if perfectly aligned, 0 if 60° off
        alignment_factor = 1 - (angle_diff / 60)
        
        # Distance decay: fires closer contribute more
        # Formula: 1 / (1 + d/100)
        # At d=0: factor=1, at d=100km: factor=0.5, at d=200km: factor=0.33
        distance_factor = 1 / (1 + distance / 100)
        
        # BLH factor: low BLH = more trapping = higher contribution
        # Formula: max(0, 1 - BLH/1000)
        # At BLH=0: factor=1, at BLH=500: factor=0.5, at BLH=1000+: factor=0
        blh_factor = max(0, 1 - blh / 1000)
        
        # FRP factor: more intense fires contribute more
        # Normalize by typical high FRP (~50 MW)
        frp_factor = min(frp / 50, 1.0)
        
        # Total contribution from this fire
        contribution = alignment_factor * distance_factor * blh_factor * frp_factor * 100
        
        if contribution > 2:  # Minimum threshold
            total_contribution += contribution
            contributing_fires.append({
                'lat': fire_lat,
                'lon': fire_lon,
                'distance_km': round(distance, 1),
                'bearing': round(bearing, 1),
                'frp': frp,
                'contribution': round(contribution, 2)
            })
    
    # STEP 2.2.5: Convert to final score (0-100 scale)
    # Cap at 85 to leave room for other sources
    fire_count = len(contributing_fires)
    
    if total_contribution < 50:
        level = 'Low'
    elif total_contribution < 150:
        level = 'Medium'
    else:
        level = 'High'
    
    final_score = min(85, 15 + total_contribution / 3)
    
    # Sort fires by contribution
    contributing_fires.sort(key=lambda x: x['contribution'], reverse=True)
    
    return {
        'score': round(final_score, 1),
        'level': level,
        'fire_count': fire_count,
        'top_fires': contributing_fires[:5],  # Top 5 contributors
        'explanation': f'Wind from {wind_dir}° (NW), {fire_count} fires upwind, BLH={blh}m'
    }
```

## 2.3 Mathematical Summary

$$\text{StubbleScore} = \min\left(85, 15 + \frac{\sum_{i} C_i}{3}\right)$$

Where for each fire $i$:

$$C_i = A_i \times D_i \times B_i \times F_i \times 100$$

And:
- $A_i = 1 - \frac{|\theta_{\text{bearing}} - \theta_{\text{wind}}|}{60}$ (alignment)
- $D_i = \frac{1}{1 + d_i/100}$ (distance decay)
- $B_i = \max(0, 1 - \text{BLH}/1000)$ (trapping)
- $F_i = \min(\text{FRP}_i/50, 1)$ (fire intensity)

---

# STEP 3: Traffic Score

## 3.1 Overview

Traffic contribution is estimated from:
1. Time of day (rush hours vs night)
2. Day of week (weekday vs weekend)
3. NO2 concentration (traffic tracer)
4. Station's traffic exposure profile

## 3.2 Full Algorithm

```python
# Pre-defined station traffic exposure
STATION_TRAFFIC_EXPOSURE = {
    'Anand Vihar': 'very_high',    # Major bus terminal, NH24
    'ITO': 'very_high',            # Central Delhi intersection
    'RK Puram': 'high',
    'Punjabi Bagh': 'high',
    'Dwarka Sector 8': 'medium',
    'Lodhi Road': 'low',           # Residential, near parks
    'Pusa': 'low',                 # Agricultural institute
    'Nehru Nagar': 'medium',
    # ... add all stations
}

EXPOSURE_FACTORS = {
    'very_high': 1.2,
    'high': 1.0,
    'medium': 0.7,
    'low': 0.4
}

def calculate_traffic_score(timestamp, no2, station_name):
    """
    Calculate traffic contribution score.
    
    Parameters:
        timestamp: datetime object
        no2: NO2 concentration in µg/m³ (can be None)
        station_name: Name of the monitoring station
    
    Returns:
        dict with score, level, explanation
    """
    hour = timestamp.hour
    day_of_week = timestamp.weekday()  # 0=Monday, 6=Sunday
    
    # STEP 3.2.1: Time factor
    if hour in [7, 8, 9, 10]:  # Morning rush
        time_factor = 1.0
        time_desc = 'morning rush hour'
    elif hour in [17, 18, 19, 20, 21]:  # Evening rush
        time_factor = 1.0
        time_desc = 'evening rush hour'
    elif hour in [0, 1, 2, 3, 4, 5]:  # Night
        time_factor = 0.2
        time_desc = 'night (minimal traffic)'
    elif hour in [11, 12, 13, 14, 15, 16]:  # Midday
        time_factor = 0.5
        time_desc = 'midday'
    else:  # Transition hours (6, 22, 23)
        time_factor = 0.4
        time_desc = 'off-peak'
    
    # STEP 3.2.2: Day factor
    if day_of_week < 5:  # Monday-Friday
        day_factor = 1.0
        day_desc = 'weekday'
    else:  # Saturday-Sunday
        day_factor = 0.6
        day_desc = 'weekend'
    
    # STEP 3.2.3: NO2 factor (primary traffic marker)
    # Thresholds based on CPCB standard (80 µg/m³ = 24-hour limit)
    if no2 is None or np.isnan(no2):
        no2_factor = 0.5  # Unknown, assume moderate
        no2_desc = 'NO2 data unavailable'
    elif no2 > 80:
        no2_factor = 1.0
        no2_desc = f'NO2={no2:.0f} µg/m³ (high)'
    elif no2 > 50:
        no2_factor = 0.7
        no2_desc = f'NO2={no2:.0f} µg/m³ (moderate)'
    elif no2 > 30:
        no2_factor = 0.4
        no2_desc = f'NO2={no2:.0f} µg/m³ (low-moderate)'
    else:
        no2_factor = 0.2
        no2_desc = f'NO2={no2:.0f} µg/m³ (low)'
    
    # STEP 3.2.4: Station exposure factor
    exposure = STATION_TRAFFIC_EXPOSURE.get(station_name, 'medium')
    station_factor = EXPOSURE_FACTORS.get(exposure, 0.7)
    
    # STEP 3.2.5: Calculate final score
    raw_score = time_factor * day_factor * no2_factor * station_factor * 100
    final_score = max(5, min(90, raw_score))  # Clamp to 5-90
    
    # Determine level
    if final_score > 60:
        level = 'High'
    elif final_score > 35:
        level = 'Medium'
    else:
        level = 'Low'
    
    return {
        'score': round(final_score, 1),
        'level': level,
        'no2': no2,
        'explanation': f'{time_desc}, {day_desc}, {no2_desc}'
    }
```

## 3.3 Mathematical Summary

$$\text{TrafficScore} = T \times D \times N \times S \times 100$$

Where:
- $T$ = Time factor (0.2 to 1.0)
- $D$ = Day factor (0.6 weekend, 1.0 weekday)
- $N$ = NO2 factor (0.2 to 1.0 based on concentration)
- $S$ = Station exposure factor (0.4 to 1.2)

---

# STEP 4: Industry Score

## 4.1 Overview

Industry contribution is estimated from:
1. **PRIMARY (70%)**: SO2 concentration (industrial tracer)
2. **SECONDARY (30%)**: Proximity to major emitters that are upwind

## 4.2 Load Industry Data

```python
# Load cleaned industry data
industry_df = pd.read_csv('industry_cleaned.csv')

# Filter to major emitters only (emission_weight >= 20)
# This includes: power plants (100), WTE plants (30), large industry (20)
major_emitters = industry_df[industry_df['emission_weight'] >= 20].copy()

print(f"Total industries: {len(industry_df)}")
print(f"Major emitters: {len(major_emitters)}")
# Should be ~100-200 facilities, not 4700
```

## 4.3 Full Algorithm

```python
def calculate_industry_score(station_lat, station_lon, wind_dir, so2, 
                             major_emitters_df):
    """
    Calculate industry contribution score.
    
    Parameters:
        station_lat, station_lon: Station location
        wind_dir: Wind direction in degrees
        so2: SO2 concentration in µg/m³ (can be None)
        major_emitters_df: DataFrame of major industrial facilities
    
    Returns:
        dict with score, level, facilities, explanation
    """
    
    # STEP 4.3.1: SO2 signal (PRIMARY - 70% weight)
    # SO2 is direct measurement of industrial influence
    # Vehicles emit negligible SO2 due to fuel desulfurization
    
    if so2 is None or np.isnan(so2):
        so2_score = 20  # Unknown, assume low-moderate
        so2_desc = 'SO2 data unavailable'
    elif so2 > 40:
        so2_score = 80
        so2_desc = f'SO2={so2:.0f} µg/m³ (high industrial)'
    elif so2 > 25:
        so2_score = 50
        so2_desc = f'SO2={so2:.0f} µg/m³ (moderate industrial)'
    elif so2 > 15:
        so2_score = 25
        so2_desc = f'SO2={so2:.0f} µg/m³ (low industrial)'
    else:
        so2_score = 10
        so2_desc = f'SO2={so2:.0f} µg/m³ (minimal industrial)'
    
    # STEP 4.3.2: Proximity signal (SECONDARY - 30% weight)
    proximity_score = 0
    contributing_facilities = []
    
    for idx, facility in major_emitters_df.iterrows():
        fac_lat = facility['latitude']
        fac_lon = facility['longitude']
        emission_weight = facility['emission_weight']
        fac_name = facility.get('name', f"Facility_{idx}")
        
        # Distance to facility
        distance = haversine(station_lat, station_lon, fac_lat, fac_lon)
        
        # Skip facilities too far
        if distance > 30:  # km
            continue
        
        # Bearing to facility
        bearing = calculate_bearing(station_lat, station_lon, fac_lat, fac_lon)
        
        # Check if upwind
        if not is_upwind(bearing, wind_dir, tolerance=60):
            continue
        
        # Calculate contribution
        # Higher emission weight = more contribution
        # Closer = more contribution
        alignment = 1 - angular_difference(bearing, wind_dir) / 60
        distance_decay = 1 / (1 + distance / 10)
        emission_factor = emission_weight / 100
        
        contribution = alignment * distance_decay * emission_factor * 100
        
        if contribution > 1:
            proximity_score += contribution
            contributing_facilities.append({
                'name': fac_name,
                'type': facility.get('type', 'industry'),
                'distance_km': round(distance, 1),
                'direction': round(bearing, 0),
                'contribution': round(contribution, 2)
            })
    
    # Cap proximity score
    proximity_score = min(50, proximity_score)
    
    # STEP 4.3.3: Combine scores
    # 70% SO2 signal + 30% proximity
    final_score = 0.7 * so2_score + 0.3 * proximity_score
    final_score = max(5, min(90, final_score))
    
    # Determine level (based primarily on SO2)
    if so2 is not None and so2 > 40:
        level = 'High'
    elif so2 is not None and so2 > 25:
        level = 'Medium'
    else:
        level = 'Low'
    
    # Sort facilities by contribution
    contributing_facilities.sort(key=lambda x: x['contribution'], reverse=True)
    
    return {
        'score': round(final_score, 1),
        'level': level,
        'so2': so2,
        'facilities': contributing_facilities[:5],
        'explanation': so2_desc
    }
```

## 4.4 Mathematical Summary

$$\text{IndustryScore} = 0.7 \times S_{\text{SO2}} + 0.3 \times \min(50, P)$$

Where:
- $S_{\text{SO2}}$ = SO2-based score (10 to 80)
- $P = \sum_{j} A_j \times D_j \times E_j \times 100$ (proximity score)

For each upwind facility $j$:
- $A_j$ = alignment factor
- $D_j = \frac{1}{1 + d_j/10}$ (distance decay, 10 km scale)
- $E_j = \frac{\text{emission\_weight}_j}{100}$

---

# STEP 5: Dust Score

## 5.1 Overview

Dust contribution is estimated from the PM2.5/PM10 ratio:
- **Dust** produces mostly coarse particles (PM10 >> PM2.5)
- **Combustion** produces mostly fine particles (PM2.5 ≈ PM10)

## 5.2 Full Algorithm

```python
def calculate_dust_score(pm25, pm10, wind_speed):
    """
    Calculate dust contribution score.
    
    Parameters:
        pm25: PM2.5 concentration in µg/m³
        pm10: PM10 concentration in µg/m³
        wind_speed: Wind speed in m/s
    
    Returns:
        dict with score, level, ratio, explanation
    """
    
    # STEP 5.2.1: Check data availability
    if pm25 is None or pm10 is None or np.isnan(pm25) or np.isnan(pm10):
        return {
            'score': 15,
            'level': 'Unknown',
            'ratio': None,
            'explanation': 'PM data unavailable'
        }
    
    if pm10 <= 0:
        return {
            'score': 15,
            'level': 'Unknown',
            'ratio': None,
            'explanation': 'Invalid PM10 reading'
        }
    
    # STEP 5.2.2: Calculate ratio
    ratio = pm25 / pm10
    
    # Handle impossible ratios (PM2.5 > PM10)
    if ratio > 1:
        return {
            'score': 15,
            'level': 'Unknown',
            'ratio': ratio,
            'explanation': f'Ratio={ratio:.2f} > 1 (sensor error)'
        }
    
    # STEP 5.2.3: Interpret ratio
    # Based on AQMD: dust ≈ 0.21, combustion ≈ 0.99
    
    if ratio < 0.3:
        base_score = 70
        level = 'High'
        desc = 'very low ratio indicates dust dominance'
    elif ratio < 0.4:
        base_score = 50
        level = 'Medium'
        desc = 'low ratio suggests significant dust'
    elif ratio < 0.5:
        base_score = 30
        level = 'Low-Medium'
        desc = 'moderate ratio, some dust contribution'
    elif ratio < 0.6:
        base_score = 20
        level = 'Low'
        desc = 'ratio suggests mixed sources'
    else:
        base_score = 10
        level = 'Low'
        desc = 'high ratio indicates combustion, not dust'
    
    # STEP 5.2.4: Wind speed modifier
    # High wind increases dust resuspension
    if wind_speed is not None and wind_speed > 5:
        wind_multiplier = 1.3
        desc += f'. High wind ({wind_speed:.1f} m/s) amplifying dust.'
    else:
        wind_multiplier = 1.0
    
    final_score = min(90, base_score * wind_multiplier)
    
    return {
        'score': round(final_score, 1),
        'level': level,
        'ratio': round(ratio, 3),
        'explanation': f'PM2.5/PM10={ratio:.2f}, {desc}'
    }
```

## 5.3 Mathematical Summary

$$\text{Ratio} = \frac{\text{PM2.5}}{\text{PM10}}$$

$$\text{DustScore} = \begin{cases}
70 & \text{if ratio} < 0.3 \\
50 & \text{if } 0.3 \leq \text{ratio} < 0.4 \\
30 & \text{if } 0.4 \leq \text{ratio} < 0.5 \\
20 & \text{if } 0.5 \leq \text{ratio} < 0.6 \\
10 & \text{if ratio} \geq 0.6
\end{cases}$$

If wind speed > 5 m/s:
$$\text{DustScore} = \text{DustScore} \times 1.3$$

---

# STEP 6: Meteorological Trapping Score

## 6.1 Overview

Low boundary layer height (BLH) traps pollutants near the surface, amplifying concentrations from ALL sources.

**This is NOT a source** - it's an amplification factor.

## 6.2 Full Algorithm

```python
def calculate_trapping_score(blh):
    """
    Calculate meteorological trapping score.
    
    Parameters:
        blh: Boundary layer height in meters
    
    Returns:
        dict with score, level, blh, explanation
    """
    
    if blh is None or np.isnan(blh):
        return {
            'score': 30,
            'level': 'Unknown',
            'blh': None,
            'explanation': 'BLH data unavailable'
        }
    
    # Cap minimum BLH at 50m to avoid extreme values
    blh = max(50, blh)
    
    if blh < 200:
        score = 90
        level = 'Severe'
        desc = 'Very low mixing height - severe trapping'
    elif blh < 400:
        score = 65
        level = 'High'
        desc = 'Low mixing height - significant trapping'
    elif blh < 700:
        score = 40
        level = 'Medium'
        desc = 'Moderate mixing height - some trapping'
    elif blh < 1000:
        score = 20
        level = 'Low'
        desc = 'Good mixing height - limited trapping'
    else:
        score = 10
        level = 'None'
        desc = 'High mixing height - good dispersion'
    
    return {
        'score': score,
        'level': level,
        'blh': blh,
        'explanation': f'BLH={blh:.0f}m, {desc}'
    }
```

## 6.3 Physical Basis

The basic box model for pollutant concentration:

$$C = \frac{Q}{u \times H \times W}$$

Where:
- $C$ = concentration (µg/m³)
- $Q$ = emission rate (µg/s)
- $u$ = wind speed (m/s)
- $H$ = mixing height (m) = BLH
- $W$ = width of the area (m)

**Key insight**: If BLH drops by half, concentration doubles (for same emissions).

---

# STEP 7: Normalize to Percentages

## 7.1 Algorithm

```python
def normalize_scores(stubble, traffic, industry, dust, trapping):
    """
    Convert raw scores to percentages that sum to 100%.
    
    Parameters:
        stubble, traffic, industry, dust, trapping: Raw scores (0-100 each)
    
    Returns:
        dict with percentages
    """
    total = stubble + traffic + industry + dust + trapping
    
    if total == 0:
        # Edge case: all scores are 0
        return {
            'stubble': 20,
            'traffic': 20,
            'industry': 20,
            'dust': 20,
            'trapping': 20
        }
    
    return {
        'stubble': round(stubble / total * 100, 1),
        'traffic': round(traffic / total * 100, 1),
        'industry': round(industry / total * 100, 1),
        'dust': round(dust / total * 100, 1),
        'trapping': round(trapping / total * 100, 1)
    }
```

## 7.2 Mathematical Formula

$$\text{Percentage}_i = \frac{\text{Score}_i}{\sum_{j} \text{Score}_j} \times 100$$

---

# STEP 8: Complete Attribution Function

## 8.1 Putting It All Together

```python
def calculate_source_attribution(station_name, timestamp, readings, 
                                 meteorology, fires_df, industries_df):
    """
    Calculate complete source attribution for a station at a given time.
    
    Parameters:
        station_name: Name of the CPCB station
        timestamp: datetime object
        readings: dict with PM2.5, PM10, NO2, SO2, CO
        meteorology: dict with wind_dir, wind_speed, blh
        fires_df: VIIRS fire data
        industries_df: Major industrial emitters
    
    Returns:
        Complete attribution result
    """
    
    # Get station coordinates
    station_lat, station_lon = STATION_COORDS[station_name]
    
    # Extract meteorology
    wind_dir = meteorology.get('wind_dir')
    wind_speed = meteorology.get('wind_speed')
    blh = meteorology.get('blh')
    
    # Extract readings
    pm25 = readings.get('PM2.5')
    pm10 = readings.get('PM10')
    no2 = readings.get('NO2')
    so2 = readings.get('SO2')
    
    # STEP 8.1.1: Calculate individual scores
    stubble_result = calculate_stubble_score(
        station_lat, station_lon, timestamp, wind_dir, blh, fires_df
    )
    
    traffic_result = calculate_traffic_score(
        timestamp, no2, station_name
    )
    
    industry_result = calculate_industry_score(
        station_lat, station_lon, wind_dir, so2, industries_df
    )
    
    dust_result = calculate_dust_score(
        pm25, pm10, wind_speed
    )
    
    trapping_result = calculate_trapping_score(blh)
    
    # STEP 8.1.2: Normalize to percentages
    percentages = normalize_scores(
        stubble_result['score'],
        traffic_result['score'],
        industry_result['score'],
        dust_result['score'],
        trapping_result['score']
    )
    
    # STEP 8.1.3: Compile output
    output = {
        'station': station_name,
        'timestamp': timestamp.isoformat(),
        'coordinates': {'lat': station_lat, 'lon': station_lon},
        
        'readings': {
            'pm25': pm25,
            'pm10': pm10,
            'no2': no2,
            'so2': so2
        },
        
        'meteorology': {
            'wind_dir': wind_dir,
            'wind_speed': wind_speed,
            'blh': blh
        },
        
        'contributions': {
            'stubble_burning': {
                'percentage': percentages['stubble'],
                'level': stubble_result['level'],
                'explanation': stubble_result['explanation'],
                'fire_count': stubble_result.get('fire_count', 0),
                'top_fires': stubble_result.get('top_fires', [])
            },
            'traffic': {
                'percentage': percentages['traffic'],
                'level': traffic_result['level'],
                'explanation': traffic_result['explanation']
            },
            'industry': {
                'percentage': percentages['industry'],
                'level': industry_result['level'],
                'explanation': industry_result['explanation'],
                'facilities': industry_result.get('facilities', [])
            },
            'dust': {
                'percentage': percentages['dust'],
                'level': dust_result['level'],
                'explanation': dust_result['explanation'],
                'pm_ratio': dust_result.get('ratio')
            },
            'trapping': {
                'percentage': percentages['trapping'],
                'level': trapping_result['level'],
                'explanation': trapping_result['explanation']
            }
        },
        
        'summary': generate_summary(percentages, stubble_result, 
                                    traffic_result, industry_result,
                                    dust_result, trapping_result)
    }
    
    return output


def generate_summary(pct, stubble, traffic, industry, dust, trapping):
    """Generate human-readable summary."""
    
    # Find dominant source
    sources = [
        ('stubble burning', pct['stubble']),
        ('traffic', pct['traffic']),
        ('industry', pct['industry']),
        ('dust', pct['dust']),
        ('meteorological trapping', pct['trapping'])
    ]
    sources.sort(key=lambda x: x[1], reverse=True)
    dominant = sources[0]
    
    lines = [f"Dominant factor: {dominant[0]} ({dominant[1]:.0f}%)"]
    
    # Add key observations
    if pct['stubble'] > 25:
        lines.append(f"• {stubble['fire_count']} fires detected upwind")
    
    if pct['traffic'] > 25:
        lines.append(f"• {traffic['explanation']}")
    
    if pct['trapping'] > 30:
        lines.append(f"• Low BLH ({trapping.get('blh', 'N/A')}m) trapping pollutants")
    
    if dust.get('ratio') and dust['ratio'] < 0.4:
        lines.append(f"• PM ratio {dust['ratio']:.2f} indicates dust")
    
    return '\n'.join(lines)
```

---

# STEP 9: Example Calculation

## 9.1 Test Case: Nov 12, 2025, 2:00 AM

**Input**:
```python
station_name = 'Anand Vihar'
timestamp = datetime(2025, 11, 12, 2, 0)

readings = {
    'PM2.5': 1000,
    'PM10': 1200,
    'NO2': 45,
    'SO2': 18
}

meteorology = {
    'wind_dir': 285,  # NW
    'wind_speed': 1.2,
    'blh': 198  # Very low
}

# Assume 45 fires detected in Punjab/Haryana
fires_df = pd.DataFrame([...])  # 45 fires
```

## 9.2 Step-by-Step Calculation

**Stubble Score**:
- Month = 11 (November) ✓
- Wind = 285° (NW) ✓
- 45 fires upwind, various distances
- BLH = 198m → blh_factor = 1 - 198/1000 = 0.802
- Let's say total contribution ≈ 120
- stubble_score = min(85, 15 + 120/3) = 55

**Traffic Score**:
- Hour = 2 AM → time_factor = 0.2 (night)
- Day = weekday → day_factor = 1.0
- NO2 = 45 → no2_factor = 0.4 (low-moderate)
- Station = Anand Vihar → station_factor = 1.2
- traffic_score = 0.2 × 1.0 × 0.4 × 1.2 × 100 = 9.6

**Industry Score**:
- SO2 = 18 → so2_score = 25 (low)
- Few upwind emitters → proximity_score ≈ 15
- industry_score = 0.7 × 25 + 0.3 × 15 = 22

**Dust Score**:
- PM ratio = 1000/1200 = 0.83 (high, combustion)
- dust_score = 10

**Trapping Score**:
- BLH = 198m < 200m → trapping_score = 90 (severe)

## 9.3 Normalization

```
Total = 55 + 9.6 + 22 + 10 + 90 = 186.6

stubble_pct = 55 / 186.6 × 100 = 29.5%
traffic_pct = 9.6 / 186.6 × 100 = 5.1%
industry_pct = 22 / 186.6 × 100 = 11.8%
dust_pct = 10 / 186.6 × 100 = 5.4%
trapping_pct = 90 / 186.6 × 100 = 48.2%
```

## 9.4 Final Output

```json
{
  "station": "Anand Vihar",
  "timestamp": "2025-11-12T02:00:00",
  "contributions": {
    "stubble_burning": {"percentage": 29.5, "level": "Medium"},
    "traffic": {"percentage": 5.1, "level": "Low"},
    "industry": {"percentage": 11.8, "level": "Low"},
    "dust": {"percentage": 5.4, "level": "Low"},
    "trapping": {"percentage": 48.2, "level": "Severe"}
  },
  "summary": "Dominant factor: meteorological trapping (48%)\n• Low BLH (198m) trapping pollutants\n• 45 fires detected upwind"
}
```

**Interpretation**: At 2 AM with PM2.5=1000 µg/m³, the severe pollution is primarily due to:
1. **Severe trapping** (BLH=198m) keeping pollutants near surface
2. **Stubble smoke** transported from Punjab/Haryana
3. Industry and traffic are NOT dominant (night time, normal SO2)

This is physically correct, unlike the previous model showing 99.9% industry.

---

# COMPLETE PARAMETER REFERENCE

| Parameter | Value | Justification |
|-----------|-------|---------------|
| **GEOGRAPHY** | | |
| NW wind range | 250-340° | Bearing from Delhi to Punjab/Haryana |
| Fire distance max | 400 km | Max transport with significant impact |
| Fire distance decay | 100 km | Half-impact distance |
| Industry distance max | 30 km | Plume dispersion limit |
| Industry distance decay | 10 km | Higher decay for local sources |
| Alignment tolerance | 60° | Accounts for wind variability |
| **THRESHOLDS** | | |
| NO2 high | 80 µg/m³ | CPCB 24-hour standard |
| SO2 high | 40 µg/m³ | ~50% of CPCB standard |
| PM ratio dust | < 0.3 | AQMD: dust = 21% PM2.5 |
| PM ratio combustion | > 0.6 | AQMD: combustion = 99% PM2.5 |
| BLH severe | < 200 m | Delhi winter morning inversions |
| BLH good | > 1000 m | Well-mixed atmosphere |
| Wind speed dust | > 5 m/s | Resuspension threshold |
| **WEIGHTS** | | |
| SO2 in industry | 70% | Measurement over estimate |
| Proximity in industry | 30% | Secondary confirmation |
| Time in traffic | 0.2-1.0 | Night vs rush hour |
| Weekend factor | 0.6 | 40% traffic reduction |

---

*End of Methodology Document*
