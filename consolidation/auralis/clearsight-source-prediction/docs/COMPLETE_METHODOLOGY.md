# Delhi Air Pollution Source Attribution System
## Complete Step-by-Step Methodology

**Document Version:** 1.0  
**Date:** December 6, 2025  
**Project:** Delhi NCR Pollution Source Predictor (SIH 2025)

---

# Table of Contents

1. [System Overview](#1-system-overview)
2. [Step 1: Data Ingestion](#2-step-1-data-ingestion)
3. [Step 2: Distance & Direction Calculation](#3-step-2-distance--direction-calculation)
4. [Step 3: Wind Direction & Upwind Check](#4-step-3-wind-direction--upwind-check)
5. [Step 4: Stubble Burning Score](#5-step-4-stubble-burning-score)
6. [Step 5: Traffic Score](#6-step-5-traffic-score)
7. [Step 6: Industry Score](#7-step-6-industry-score)
8. [Step 7: Dust Score](#8-step-7-dust-score)
9. [Step 8: Local Combustion Score](#9-step-8-local-combustion-score)
10. [Step 9: Secondary Aerosol Score](#10-step-9-secondary-aerosol-score)
11. [Step 10: Normalization](#11-step-10-normalization)
12. [Step 11: Modulation Engine](#12-step-11-modulation-engine)
13. [Complete Data Flow](#13-complete-data-flow)
14. [References](#14-references)

---

# 1. System Overview

This system identifies **which pollution sources are contributing to air quality readings** at a given CPCB monitoring station at a specific time. It outputs **percentage contributions** from 6 sources:

| Source | Description |
|--------|-------------|
| **Stubble Burning** | Crop residue fires from Punjab/Haryana (transported) |
| **Traffic** | Vehicle emissions (local) |
| **Industry** | Power plants, factories (point sources) |
| **Dust** | Road dust, soil, construction |
| **Local Combustion** | Fireworks, waste burning, domestic heating |
| **Secondary Aerosols** | Formed in atmosphere from precursor gases |

---

# 2. Step 1: Data Ingestion

The system loads 4 core datasets from CSV files:

## 2.1 Stations Metadata (`stations_metadata.csv`)

Contains CPCB monitoring station information:

| Field | Description | Example |
|-------|-------------|---------|
| `station_id` | Unique identifier | 10484 |
| `station_name` | Station name | "Anand Vihar Delhi - DPCC" |
| `lat` | Latitude | 28.6469 |
| `lon` | Longitude | 77.3164 |
| `traffic_factor` | Traffic exposure (0.4-0.9) | 0.8 |

## 2.2 Fire Data (`fires_combined.csv`)

VIIRS satellite fire detection data:

| Field | Description | Example |
|-------|-------------|---------|
| `latitude` | Fire location latitude | 30.45 |
| `longitude` | Fire location longitude | 76.23 |
| `acq_date` | Acquisition date | 2024-11-05 |
| `frp` | Fire Radiative Power (MW) | 35.2 |
| `confidence` | Detection confidence | h/n/l |

## 2.3 Industries Data (`industries_cleaned.csv`)

Industrial facilities with emission estimates:

| Field | Description | Example |
|-------|-------------|---------|
| `latitude` | Facility latitude | 28.78 |
| `longitude` | Facility longitude | 77.14 |
| `facility_type` | Type of facility | "Power_Plant" |
| `emission_weight` | Relative emission strength (0-100) | 45 |

## 2.4 Wind Data (`wind_filtered.csv`)

Hourly meteorological data from ERA5:

| Field | Description | Example |
|-------|-------------|---------|
| `timestamp` | Date and time | 2025-02-18 10:00:00 |
| `wind_dir_10m` | Wind direction at 10m (degrees) | 290 |
| `wind_speed_10m` | Wind speed at 10m (m/s) | 3.2 |
| `blh` | Boundary Layer Height (meters) | 380 |

---

# 3. Step 2: Distance & Direction Calculation

For every potential source (fire or industry), we calculate distance and bearing from the station.

## 3.1 Haversine Distance Formula

The great-circle distance between two points on Earth:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c
```

Where:
- **R** = 6,371 km (Earth's radius)
- **lat1, lon1** = Station coordinates (radians)
- **lat2, lon2** = Source coordinates (radians)
- **Δlat** = lat2 - lat1
- **Δlon** = lon2 - lon1

**Example Calculation:**
- Station (Anand Vihar): 28.6469°N, 77.3164°E
- Fire (Punjab): 30.45°N, 76.23°E
- **Result: Distance = 215 km**

## 3.2 Bearing Calculation

The initial bearing (direction) from station to source:

```
θ = atan2(sin(Δlon) × cos(lat2), 
          cos(lat1) × sin(lat2) - sin(lat1) × cos(lat2) × cos(Δlon))
bearing = (θ × 180/π + 360) mod 360
```

- **0°** = North
- **90°** = East
- **180°** = South
- **270°** = West

**Example:**
- Station → Punjab Fire bearing = **315° (Northwest)**

---

# 4. Step 3: Wind Direction & Upwind Check

## 4.1 Meteorological Convention

**Wind direction = direction wind is coming FROM**

- Wind direction 270° means wind blowing FROM west TO east
- Wind direction 0° means wind blowing FROM north TO south

## 4.2 Upwind Check Algorithm

A source is "upwind" if the bearing from station to source approximately matches the wind direction:

```python
angle_difference = |bearing_to_source - wind_direction|
if angle_difference > 180:
    angle_difference = 360 - angle_difference

is_upwind = (angle_difference <= tolerance)  # tolerance = 60°
```

**Example:**
- Fire bearing = 315°
- Wind direction = 290°
- Angle difference = |315 - 290| = 25°
- 25° < 60° → **Fire IS UPWIND ✓**

---

# 5. Step 4: Stubble Burning Score

## 5.1 Physical Basis

Crop residue fires in Punjab/Haryana (Oct-Nov) emit smoke containing PM2.5, black carbon, and organic compounds. Under favorable wind conditions, this smoke is transported hundreds of kilometers to Delhi.

## 5.2 Algorithm

```python
stubble_score = 0

# GATE 1: Season check
IF month NOT IN [October, November, December, January]:
    RETURN stubble_score = 5  # Baseline (off-season)

# GATE 2: Wind direction check (must be from NW: 250-340°)
IF wind_direction NOT IN [250°, 340°]:
    RETURN stubble_score = 8

# GATE 3: Loop through VIIRS fires
FOR each fire in fire_data:
    distance = haversine(station, fire)
    IF distance > 400 km: CONTINUE  # Too far
    
    bearing = bearing_to_fire
    IF NOT is_upwind(bearing, wind_direction, tolerance=60°): CONTINUE
    
    # Calculate contribution factors
    alignment = 1 - (angle_difference / 60)      # 1.0 if perfect alignment
    distance_decay = 1 / (1 + distance / 100)    # Closer = higher
    blh_factor = max(0.2, 1 - BLH / 1000)        # Low BLH = more trapping
    frp_factor = min(FRP / 50, 1.0)              # Fire intensity
    
    contribution = alignment × distance_decay × blh_factor × frp_factor × 100
    stubble_score += contribution

# Cap and scale
stubble_score = min(80, 5 + stubble_score / 3)
```

## 5.3 Parameter Justifications

| Parameter | Value | Source |
|-----------|-------|--------|
| Season Oct-Jan | Stubble burning period | NASA FIRMS data shows 80%+ fires in Oct-Nov |
| Wind 250-340° | NW sector | Punjab/Haryana are NW of Delhi (geography) |
| Distance 400 km | Transport cutoff | Smoke transport studies |
| BLH 1000 m | Reference height | Low BLH = poor mixing (trapping) |
| FRP 50 MW | Normalization | Median agricultural fire FRP ~20-50 MW |

---

# 6. Step 5: Traffic Score

## 6.1 Physical Basis

**NO2 is the primary traffic tracer.**

> "In urban areas, NO2 is predominantly produced by vehicle emissions, and thus, its concentration at any given location depends on the local traffic density."
> — WHO REVIHAAP Project

## 6.2 Algorithm

```python
# TIME FACTOR (rush hour = higher traffic)
IF hour IN [7, 8, 9, 10]:        time_factor = 1.0   # Morning rush
ELIF hour IN [17, 18, 19, 20]:   time_factor = 1.0   # Evening rush
ELIF hour IN [0, 1, 2, 3, 4, 5]: time_factor = 0.15  # Night
ELSE:                             time_factor = 0.5   # Midday

# DAY FACTOR
day_factor = 1.0 IF weekday ELSE 0.6

# NO2 FACTOR (CPCB threshold: 80 µg/m³)
IF NO2 > 100:   no2_factor = 1.0   # Very high
ELIF NO2 > 70:  no2_factor = 0.8   # High
ELIF NO2 > 50:  no2_factor = 0.6   # Moderate
ELIF NO2 > 30:  no2_factor = 0.4   # Low-moderate
ELSE:           no2_factor = 0.2   # Low

# STATION TRAFFIC FACTOR (from metadata)
traffic_factor = station['traffic_factor']  # 0.4-0.9

# CALCULATE SCORE
traffic_score = time_factor × day_factor × no2_factor × traffic_factor × 100
traffic_score = max(5, min(80, traffic_score))
```

## 6.3 Parameter Sources

| Parameter | Value | Source |
|-----------|-------|--------|
| NO2 threshold 80 µg/m³ | CPCB standard | CPCB NAAQS 2009 |
| Rush hours 7-10, 17-20 | Peak traffic | Standard urban patterns |
| Weekend factor 0.6 | 40% reduction | Typical weekend traffic |

---

# 7. Step 6: Industry Score

## 7.1 Physical Basis

**SO2 is the primary industrial tracer.**

> "Coal-fired electric power plants make up the largest source of national sulfur dioxide (SO2) emissions."
> — U.S. EIA

Vehicles emit negligible SO2 because modern fuels have <15 ppm sulfur. Coal contains 0.5-4% sulfur by weight.

## 7.2 Algorithm

```python
# SO2 SIGNAL (70% weight)
IF SO2 > 50:    so2_score = 85, so2_weight = 0.85
ELIF SO2 > 35:  so2_score = 65, so2_weight = 0.75
ELIF SO2 > 20:  so2_score = 40, so2_weight = 0.65
ELIF SO2 > 10:  so2_score = 20, so2_weight = 0.55
ELSE:           so2_score = 8,  so2_weight = 0.50

# PROXIMITY SIGNAL (30% weight)
proximity_score = 0
FOR each major_emitter (emission_weight >= 20):
    IF distance > 30 km: CONTINUE
    IF NOT upwind: CONTINUE
    
    alignment = 1 - (angle_difference / 60)
    dist_decay = 1 / (1 + distance / 10)
    emission_factor = emission_weight / 100
    
    proximity_score += alignment × dist_decay × emission_factor × 100

proximity_score = min(40, proximity_score)

# COMBINE
industry_score = so2_weight × so2_score + (1 - so2_weight) × proximity_score
industry_score = max(5, min(80, industry_score))
```

---

# 8. Step 7: Dust Score

## 8.1 Physical Basis

**PM2.5/PM10 ratio distinguishes dust from combustion.**

> "For fugitive dust generating sources, the PM2.5 fraction of PM10 is **21 percent**"
> "For combustion sources the PM2.5 fraction of PM10 is **99 percent**"
> — South Coast Air Quality Management District

| Source Type | PM2.5/PM10 Ratio |
|-------------|------------------|
| **Dust (road/soil)** | ~0.21 (coarse particles) |
| **Combustion** | ~0.99 (fine particles) |

## 8.2 Algorithm

```python
IF PM2.5 is NULL OR PM10 is NULL OR PM10 <= 0:
    RETURN dust_score = 12, level = "Unknown"

ratio = PM2.5 / PM10

# SCORE BASED ON RATIO
IF ratio < 0.25:    score = 75   # Dust dominant
ELIF ratio < 0.35:  score = 55   # Significant dust
ELIF ratio < 0.45:  score = 35   # Some dust
ELIF ratio < 0.55:  score = 20   # Mixed
ELSE:               score = 10   # Combustion dominant

# SEASONAL ADJUSTMENT (pre-monsoon = more dust)
IF month IN [March, April, May, June]:
    score = score × 1.2

# WIND AMPLIFICATION (high wind = dust resuspension)
IF wind_speed > 5 m/s:
    score = score × 1.3

dust_score = min(80, score)
```

---

# 9. Step 8: Local Combustion Score

## 9.1 Physical Basis

Local combustion includes fireworks (Diwali, weddings), waste burning, and domestic heating. This is **different from stubble burning** because:
- It's **local** (no upwind requirement)
- **Different timing** (evening/night, Diwali, winter)
- **Different chemistry** (high CO/NOx ratio = incomplete combustion)

## 9.2 Algorithm

```python
score = 10  # Base

# DIWALI CHECK (major fireworks event)
IF is_diwali_peak_period:
    IF evening_night:
        score += 40 × 3.0 = 120  # Peak Diwali night
    ELSE:
        score += 15 × 3.0        # Diwali daytime

# WEDDING SEASON + EVENING (fireworks common)
ELIF month IN [Nov, Dec, Jan, Feb] AND hour >= 18:
    score += 15

# HIGH PM WITHOUT UPWIND FIRES = LOCAL SOURCE
IF PM2.5 > 150 AND upwind_fire_count < 10:
    score += (PM2.5 - 150) / 20

# CO/NOx RATIO (high ratio = biomass/waste burning)
co_nox_ratio = (CO × 1000) / NO2
IF co_nox_ratio > 50:
    score += 20  # Incomplete combustion
ELIF co_nox_ratio > 35:
    score += 10

# WINTER EVENING (heating/waste burning)
IF month IN [Nov, Dec, Jan, Feb] AND evening_night:
    score += 10

local_combustion_score = min(80, max(5, score))
```

---

# 10. Step 9: Secondary Aerosol Score

## 10.1 Physical Basis

Secondary aerosols form in the atmosphere from precursor gases:
- **SO2 → Sulfates (SO4²⁻)**
- **NOx + VOCs → Nitrates (NO3⁻)**

Source: ARAI/TERI 2018 study (Page 396) - secondary particulates = 26% ± 7%

## 10.2 Algorithm

```python
score = 15  # Base (always some secondary formation)

# SO2 → Sulfates
IF SO2 > 15:
    score += min(20, SO2 / 3)
    
    # High humidity accelerates sulfate formation
    IF humidity > 70%:
        score += 10

# NO2 → Nitrates (photochemical)
IF NO2 > 40:
    score += min(15, NO2 / 8)

# Warm temperature = more photochemistry
IF temperature > 25°C:
    score += 5

secondary_score = min(50, score)  # Capped per ARAI/TERI 2018
```

---

# 11. Step 10: Normalization

Convert raw scores to percentage contributions:

```python
total = stubble_score + traffic_score + industry_score + 
        dust_score + local_combustion_score + secondary_score

stubble_pct     = (stubble_score / total) × 100
traffic_pct     = (traffic_score / total) × 100
industry_pct    = (industry_score / total) × 100
dust_pct        = (dust_score / total) × 100
local_comb_pct  = (local_combustion_score / total) × 100
secondary_pct   = (secondary_score / total) × 100
```

**Example:**

| Source | Raw Score | Percentage |
|--------|-----------|------------|
| Stubble | 62 | 31.8% |
| Traffic | 48 | 24.6% |
| Industry | 30 | 15.4% |
| Secondary | 25 | 12.8% |
| Dust | 18 | 9.2% |
| Local Combustion | 12 | 6.2% |
| **Total** | **195** | **100%** |

---

# 12. Step 11: Modulation Engine

The modulation engine is an **alternative approach** that adjusts scientifically validated baseline values (priors) based on real-time anomalies.

## 12.1 Validated Priors (from ARAI/TERI 2018)

| Source | Prior % | Source |
|--------|---------|--------|
| Traffic | 22% | ARAI/TERI 2018, Page 396 |
| Stubble Burning | 22% | ARAI/TERI 2018, Page 396 |
| Secondary Aerosols | 26% | ARAI/TERI 2018, Page 396 |
| Dust | 15% | ARAI/TERI 2018, Page 396 |
| Industry | 12% | ARAI/TERI 2018, Page 396 |
| Local Combustion | 4% | ARAI/TERI 2018, Page 396 |

## 12.2 Baselines (from Data)

| Baseline | Value | Source |
|----------|-------|--------|
| BLH (winter) | 381 m | Computed from wind_filtered.csv |
| BLH (summer) | 1106 m | Computed from wind_filtered.csv |
| NO2 (rush hour) | 100 µg/m³ | IIT Kanpur 2016 |
| NO2 (overall) | 71 µg/m³ | IIT Kanpur 2016 |
| Fires (stubble season) | 193/day | Computed from fires_combined.csv |
| SO2 (average) | 15 µg/m³ | IIT Kanpur 2016 |
| PM2.5/PM10 ratio | 0.625 | IIT Kanpur 2016 |

## 12.3 Modulation Formula

For each source:

```
Modulation_Factor = Current_Value / Baseline_Value
Weighted_Prior = Base_Prior × Modulation_Factor
```

**Example (Traffic):**
- Current NO2 = 150 µg/m³
- Baseline NO2 (rush hour) = 100 µg/m³
- Modulation factor = 150 / 100 = **1.5**
- Weighted traffic = 0.22 × 1.5 = **0.33**

## 12.4 Final Normalization

```python
# Apply modulation to each prior
weighted = {}
for source, prior in PRIORS.items():
    weighted[source] = prior × modulations[source]

# Normalize to 100%
total = sum(weighted.values())
for source in weighted:
    final_percentage[source] = (weighted[source] / total) × 100
```

---

# 13. Complete Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        INPUT DATA (CSV FILES)                            │
├────────────────┬────────────────┬────────────────┬──────────────────────┤
│ stations.csv   │ fires.csv      │ industries.csv │ wind.csv             │
│ - lat, lon     │ - lat, lon     │ - lat, lon     │ - wind_dir           │
│ - traffic_fac  │ - FRP (power)  │ - emission_wt  │ - wind_speed         │
│                │ - date         │ - facility_type│ - BLH                │
└────────┬───────┴───────┬────────┴───────┬────────┴──────────┬───────────┘
         │               │                │                   │
         ▼               ▼                ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              STEP 2: GEOGRAPHIC CALCULATIONS                             │
│   For each source:                                                       │
│   • distance = haversine(station, source)                               │
│   • bearing = direction from station to source                          │
│   • is_upwind = angular_diff(bearing, wind) < 60°                       │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 STEP 4-9: SOURCE SCORE CALCULATIONS                      │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │  STUBBLE    │ │  TRAFFIC    │ │  INDUSTRY   │ │    DUST     │        │
│  │  (0-80)     │ │  (0-80)     │ │  (0-80)     │ │   (0-80)    │        │
│  │             │ │             │ │             │ │             │        │
│  │ Fire count  │ │ NO2 reading │ │ SO2 reading │ │ PM2.5/PM10  │        │
│  │ Wind align  │ │ Hour of day │ │ Upwind      │ │ Wind speed  │        │
│  │ Distance    │ │ Day of week │ │ power plants│ │ Month       │        │
│  │ BLH         │ │             │ │             │ │             │        │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘        │
│         │              │              │              │                   │
│  ┌─────────────┐ ┌─────────────┐                                        │
│  │   LOCAL     │ │  SECONDARY  │                                        │
│  │ COMBUSTION  │ │  AEROSOLS   │                                        │
│  │  (0-80)     │ │   (0-50)    │                                        │
│  │             │ │             │                                        │
│  │ Diwali?     │ │ SO2 + NO2   │                                        │
│  │ Wedding szn?│ │ Humidity    │                                        │
│  │ CO/NOx      │ │ Temperature │                                        │
│  └──────┬──────┘ └──────┬──────┘                                        │
└─────────┴───────────────┴────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      STEP 10: NORMALIZATION                              │
│                                                                          │
│   total = sum(all_scores)                                               │
│   percentage[source] = (score[source] / total) × 100                    │
│                                                                          │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         FINAL OUTPUT (JSON)                              │
│                                                                          │
│  {                                                                       │
│    "stubble_burning": {"percentage": 31.8, "level": "High"},            │
│    "traffic": {"percentage": 24.6, "level": "Medium"},                  │
│    "industry": {"percentage": 15.4, "level": "Medium"},                 │
│    "secondary_aerosols": {"percentage": 12.8, "level": "Medium"},       │
│    "dust": {"percentage": 9.2, "level": "Low"},                         │
│    "local_combustion": {"percentage": 6.2, "level": "Low"}              │
│  }                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

# 14. References

## Primary Sources (Source Apportionment)

1. **ARAI & TERI (2018)**. "Source Apportionment of PM2.5 & PM10 of Delhi NCR for Identification of Major Sources." Automotive Research Association of India and The Energy and Resources Institute. Chapter 4, Section 4.4.1, Page 396.

2. **IIT Kanpur (2016)**. "Comprehensive Study on Air Pollution and Green House Gases (GHGs) in Delhi." Indian Institute of Technology Kanpur for Department of Environment, Government of NCT of Delhi. January 2016, 334 pp.

## Supporting Literature

3. WHO (2013). Review of Evidence on Health Aspects of Air Pollution – REVIHAAP Project. NCBI Bookshelf NBK361807.

4. U.S. Energy Information Administration (2018). "Sulfur dioxide emissions from U.S. power plants have fallen faster than coal generation."

5. South Coast Air Quality Management District (2006). "Final Methodology to Calculate Particulate Matter (PM) 2.5 and PM2.5 Significance Thresholds."

6. Sharma, S.K. et al. (2016). "Source Apportionment of PM2.5 in Delhi, India Using PMF Model." Bull Environ Contam Toxicol. PMID: 27209541.

7. CPCB (2009). National Ambient Air Quality Standards. Central Pollution Control Board, Ministry of Environment & Forests.

## Data Sources

8. VIIRS Active Fire Data - NASA FIRMS
9. ERA5 Reanalysis (wind, BLH) - Copernicus Climate Data Store
10. CPCB Air Quality Monitoring Data

---

## Summary Table: What Determines Each Source

| Source | Primary Tracer | Supporting Inputs | Key Logic |
|--------|---------------|-------------------|-----------|
| **Stubble Burning** | Fire count (VIIRS) | Wind dir, BLH, FRP, distance | Upwind fires from NW in Oct-Jan |
| **Traffic** | NO2 (sensor) | Hour, day of week, CO/NOx ratio | High NO2 during rush hours |
| **Industry** | SO2 (sensor) | Upwind power plants, distance | SO2 is industrial-only signature |
| **Dust** | PM2.5/PM10 ratio | Wind speed, month | Low ratio = coarse dust particles |
| **Local Combustion** | Event calendar + CO | Is Diwali? Wedding season? | High PM without upwind fires |
| **Secondary** | SO2 + NO2 | Humidity, temperature | Precursor → aerosol formation |

---

**End of Document**
