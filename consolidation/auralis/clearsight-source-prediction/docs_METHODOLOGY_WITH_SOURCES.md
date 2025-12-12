# Delhi Air Pollution Source Attribution: Methodology with Sources

## Honesty Statement

This document distinguishes between:
1. **Cited claims** - backed by peer-reviewed literature or official standards
2. **Basic physics/math** - standard formulas that don't need citations
3. **Assumptions** - parameters we chose that need justification or validation

---

# Step 1: Calculate Distance and Direction to Sources

## 1.1 Haversine Formula (Basic Math - No Citation Needed)

To calculate the great-circle distance between two points on Earth:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c
```

Where:
- R = 6,371 km (Earth's radius)
- lat1, lon1 = station coordinates
- lat2, lon2 = source coordinates (fire or industry)
- Δlat = lat2 - lat1 (in radians)
- Δlon = lon2 - lon1 (in radians)

**Source**: This is standard spherical geometry, used universally in GIS. No citation needed.

## 1.2 Bearing Calculation (Basic Math - No Citation Needed)

To calculate the initial bearing from station to source:

```
θ = atan2(sin(Δlon) × cos(lat2), cos(lat1) × sin(lat2) - sin(lat1) × cos(lat2) × cos(Δlon))
bearing = (θ × 180/π + 360) mod 360
```

**Note**: Bearing is measured clockwise from North (0° = North, 90° = East, 180° = South, 270° = West)

---

# Step 2: Wind Direction and Upwind Check

## 2.1 Meteorological Wind Convention (Standard - No Citation Needed)

**Wind direction = direction wind is coming FROM**

- Wind direction 270° means wind blowing FROM west TO east
- Wind direction 0° means wind blowing FROM north TO south

This is the universal meteorological convention used by all weather services.

## 2.2 Upwind Check (Basic Physics)

A source is "upwind" of a station if:
- The bearing from station to source ≈ wind direction (within tolerance)

```
angle_difference = |bearing_to_source - wind_direction|
if angle_difference > 180:
    angle_difference = 360 - angle_difference

is_upwind = (angle_difference <= tolerance)
```

**Tolerance**: We use 45-60°. This is an **assumption** that accounts for:
- Wind direction variability
- Plume spread during transport
- Measurement uncertainty

---

# Step 3: Stubble Burning Score

## 3.1 Physical Basis

Crop residue fires emit smoke containing PM2.5, black carbon, and organic compounds. Under favorable wind conditions, this smoke can be transported hundreds of kilometers.

## 3.2 Algorithm

```
stubble_score = 0

IF month NOT IN [October, November, December, January]:
    RETURN stubble_score = 5  # Baseline

IF wind_direction NOT IN [250°, 340°]:  # Not from NW
    RETURN stubble_score = 10

FOR each fire in VIIRS data:
    distance = haversine(station, fire)
    IF distance > 400 km: CONTINUE
    
    bearing = bearing_to_fire
    IF NOT is_upwind(bearing, wind_direction, tolerance=60°): CONTINUE
    
    # Contribution factors
    alignment = 1 - (angle_difference / 60)
    distance_decay = 1 / (1 + distance / 100)
    blh_factor = max(0, 1 - BLH / 1000)
    frp_factor = min(FRP / 50, 1.0)
    
    contribution = alignment × distance_decay × blh_factor × frp_factor × 100
    stubble_score += contribution

stubble_score = min(85, 15 + stubble_score / 3)
```

## 3.3 Parameter Justifications

| Parameter | Value | Status | Justification |
|-----------|-------|--------|---------------|
| Months Oct-Jan | Seasonal | **CITED** | VIIRS fire data shows 80%+ of Punjab/Haryana fires occur Oct-Nov. See NASA FIRMS data. |
| Wind direction 250-340° | NW sector | **BASIC GEOGRAPHY** | Punjab/Haryana are northwest of Delhi. Can be verified on any map. |
| Distance 400 km | Cutoff | **ASSUMPTION** | Smoke transport studies show PM can travel 300-500 km. Need specific citation. |
| Distance decay 100 km | Half-life | **ASSUMPTION** | Needs validation from transport modeling. |
| BLH 1000 m | Reference | **NEEDS CITATION** | Above 1000m, vertical mixing is generally good. Need boundary layer study. |
| FRP 50 MW | Normalization | **ASSUMPTION** | Based on VIIRS FRP distribution. Median FRP for agricultural fires is ~20-50 MW. |

---

# Step 4: Traffic Score

## 4.1 Physical Basis - CITED

**NO2 as traffic tracer**:

> "In urban areas, NO2 is predominantly produced by vehicle emissions, and thus, its concentration at any given location depends on the local traffic density."
> 
> — WHO REVIHAAP Project, NCBI Bookshelf NBK361807

> "Traffic emissions are the principal source of intra-urban variation in the concentrations of air pollutants in many cities"
> 
> — WHO REVIHAAP Project

**Why NO2 works**: Vehicles emit NOx (NO + NO2) directly from combustion. NO oxidizes to NO2 rapidly. In urban areas without significant industrial NOx sources, NO2 is a reliable traffic indicator.

## 4.2 Algorithm

```
# Time factor
IF hour IN [7, 8, 9, 10]:  # Morning rush
    time_factor = 1.0
ELIF hour IN [17, 18, 19, 20, 21]:  # Evening rush
    time_factor = 1.0
ELIF hour IN [0, 1, 2, 3, 4, 5]:  # Night
    time_factor = 0.2
ELSE:  # Midday
    time_factor = 0.5

# Day factor
IF weekday (Mon-Fri):
    day_factor = 1.0
ELSE:  # Weekend
    day_factor = 0.6

# NO2 factor - CITED THRESHOLD
IF NO2 > 80 µg/m³:
    no2_factor = 1.0
ELIF NO2 > 50:
    no2_factor = 0.7
ELIF NO2 > 30:
    no2_factor = 0.4
ELSE:
    no2_factor = 0.2

traffic_score = time_factor × day_factor × no2_factor × 100
```

## 4.3 Parameter Justifications

| Parameter | Value | Status | Justification |
|-----------|-------|--------|---------------|
| NO2 threshold 80 µg/m³ | High | **CITED** | CPCB 24-hour standard for NO2 is 80 µg/m³. Source: CPCB National Ambient Air Quality Standards, 2009. |
| Rush hours 7-10, 5-9 | Peak times | **COMMON KNOWLEDGE** | Standard urban traffic patterns. Could cite Delhi traffic studies for specificity. |
| Weekend factor 0.6 | 40% reduction | **ASSUMPTION** | Typical weekend traffic reduction. Need Delhi-specific data. |
| Night factor 0.2 | Low traffic | **REASONABLE** | Minimal traffic 12 AM - 5 AM is physically obvious. |

---

# Step 5: Industry Score

## 5.1 Physical Basis - CITED

**SO2 as industrial tracer**:

> "Nearly all electricity-related SO2 emissions are associated with coal-fired generation"
> 
> — U.S. Energy Information Administration

> "Coal-fired electric power plants make up the largest source of national sulfur dioxide (SO2) emissions"
> 
> — U.S. EIA

**Why vehicles don't emit SO2**:

> "SO2 emissions from on-road vehicles are very small compared with other sources such as coal-fired power plants... These limits [fuel sulfur standards] are in place to prevent degradation of post-combustion catalytic and filter-based emission control devices"
> 
> — PMC9620485, Characterizing Determinants of Near-Road Ambient Air Quality

Modern vehicle fuels have <15 ppm sulfur (US EPA Tier 3 standards). Coal contains 0.5-4% sulfur by weight.

## 5.2 Algorithm

```
# PRIMARY: SO2 reading (70% weight)
IF SO2 > 40 µg/m³:
    so2_score = 80
ELIF SO2 > 25:
    so2_score = 50
ELIF SO2 > 15:
    so2_score = 25
ELSE:
    so2_score = 10

# SECONDARY: Proximity to major emitters (30% weight)
proximity_score = 0
FOR each major_emitter (power plants, WTE, large industry):
    IF distance > 30 km: CONTINUE
    IF NOT upwind: CONTINUE
    
    contribution = emission_weight / (1 + distance/10)
    proximity_score += contribution

proximity_score = min(50, proximity_score)

industry_score = 0.7 × so2_score + 0.3 × proximity_score
```

## 5.3 Parameter Justifications

| Parameter | Value | Status | Justification |
|-----------|-------|--------|---------------|
| SO2 weight 70% | Primary | **DESIGN CHOICE** | Actual measurement should dominate over proximity estimates |
| SO2 threshold 40 µg/m³ | High | **NEEDS VALIDATION** | 50% of CPCB 80 µg/m³ standard. Need Delhi station analysis to confirm industrial vs residential difference. |
| Distance 30 km | Cutoff | **REASONABLE** | Industrial plumes disperse within this range. Could cite plume modeling. |
| Only major emitters | Filter | **DESIGN CHOICE** | Prevents the IDW problem. Only facilities with significant emissions. |

---

# Step 6: Dust Score

## 6.1 Physical Basis - CITED

**PM2.5/PM10 ratio distinguishes dust from combustion**:

> "For fugitive dust generating sources, the PM2.5 fraction of PM10 is **21 percent**"
>
> "For combustion sources the PM2.5 fraction of PM10 is **99 percent**"
> 
> — South Coast Air Quality Management District, Final PM2.5 Calculation Methodology

This means:
- **Dust**: PM2.5/PM10 ≈ 0.21 (mostly coarse particles)
- **Combustion**: PM2.5/PM10 ≈ 0.99 (mostly fine particles)

## 6.2 Algorithm

```
IF PM2.5 is NULL OR PM10 is NULL OR PM10 = 0:
    RETURN dust_score = 15, confidence = "Low"

ratio = PM2.5 / PM10

IF ratio < 0.3:
    dust_score = 70  # Dust dominant
ELIF ratio < 0.4:
    dust_score = 50  # Significant dust
ELIF ratio < 0.5:
    dust_score = 30  # Some dust
ELSE:
    dust_score = 10  # Combustion dominant

# Wind speed amplification
IF wind_speed > 5 m/s:
    dust_score = dust_score × 1.3
```

## 6.3 Parameter Justifications

| Parameter | Value | Status | Justification |
|-----------|-------|--------|---------------|
| Ratio 0.21 for dust | From AQMD | **CITED** | South Coast AQMD methodology document |
| Ratio 0.99 for combustion | From AQMD | **CITED** | South Coast AQMD methodology document |
| Threshold 0.5 | Midpoint | **DERIVED** | Midpoint between dust (0.21) and combustion (0.99) |
| Wind speed 5 m/s | Resuspension | **NEEDS CITATION** | Dust resuspension increases with wind. Need wind tunnel study citation. |

---

# Step 7: Meteorological Trapping

## 7.1 Physical Basis - Basic Atmospheric Physics

The **Planetary Boundary Layer (PBL)** or **Mixing Layer Height** determines the volume into which surface emissions mix.

**Concentration ∝ Emissions / (Wind Speed × Mixing Height)**

This is the basic box model equation. Lower mixing height = higher ground-level concentrations.

## 7.2 Algorithm

```
IF BLH < 200 m:
    trapping_score = 90  # Severe
ELIF BLH < 400 m:
    trapping_score = 65  # High
ELIF BLH < 700 m:
    trapping_score = 40  # Medium
ELIF BLH < 1000 m:
    trapping_score = 20  # Low
ELSE:
    trapping_score = 10  # Good mixing
```

## 7.3 Parameter Justifications

| Parameter | Value | Status | Justification |
|-----------|-------|--------|---------------|
| BLH 200 m | Severe | **NEEDS DELHI DATA** | Winter morning inversions in Delhi can drop to 100-200m. Need local radiosonde/lidar study. |
| BLH 1000 m | Good | **GENERAL PRINCIPLE** | Above 1000m, vertical mixing is typically sufficient. Standard atmospheric science. |
| Intermediate thresholds | 400, 700 m | **INTERPOLATION** | Reasonable interpolation between severe and good. |

---

# Step 8: Normalization

## 8.1 Convert Scores to Percentages (Basic Math)

```
total = stubble_score + traffic_score + industry_score + dust_score + trapping_score

stubble_pct = (stubble_score / total) × 100
traffic_pct = (traffic_score / total) × 100
industry_pct = (industry_score / total) × 100
dust_pct = (dust_score / total) × 100
trapping_pct = (trapping_score / total) × 100
```

This is standard normalization. No citation needed.

---

# Step 9: Validation Against Literature

## 9.1 Expected Ranges - CITED

**Primary Source: ARAI & TERI (2018)** - "Source Apportionment of PM2.5 & PM10 of Delhi NCR"
Chapter 4, Section 4.4.1, Page 396 - PM2.5 Winter Season (Delhi NCR average):

| Source | ARAI/TERI 2018 Value | Our Expected Range |
|--------|---------------------|-------------------|
| Vehicles (traffic) | 22% ± 4% | 15-30% |
| Biomass burning (stubble + local) | 22% ± 4% | 15-40% (seasonal) |
| Industry | 12% ± 7% | 5-20% |
| Dust and construction | 15% ± 7% | 10-25% |
| Secondary particulates | 26% ± 7% | 20-35% |
| Others (DG sets, cooking, etc.) | 4% ± 4% | 2-8% |

**Secondary Reference: IIT Kanpur (2016)** - "Comprehensive Study on Air Pollution and Green House Gases (GHGs) in Delhi"
Executive Summary and Chapter 2:
- Winter PM2.5 average: 375 µg/m³
- Summer PM2.5 average: 300 µg/m³
- PM2.5/PM10 ratio: 0.625 winter, 0.60 summer
- NO2: Winter 83 µg/m³, Summer 59 µg/m³
- K+ (potassium) as biomass marker: normal < 2 µg/m³, biomass burning 4-15 µg/m³

**Note**: Our "secondary_aerosols" factor incorporates both atmospheric formation AND meteorological trapping effects.

---

# Summary: What's Cited vs. What's Assumed

## Fully Cited (Can Defend in Viva)

1. **Source apportionment priors** - ARAI/TERI 2018, Page 396
2. **NO2 as traffic tracer** - WHO REVIHAAP, IIT Kanpur 2016 (Section 2.4.7.2)
3. **SO2 as industrial tracer** - US EIA, US EPA, coal power studies
4. **PM2.5/PM10 ratio interpretation** - South Coast AQMD methodology
5. **NO2 thresholds** - IIT Kanpur 2016 (winter 83, summer 59 µg/m³)
6. **SO2 thresholds** - CPCB NAAQS (24-hr: 80 µg/m³, annual: 50 µg/m³)
7. **BLH baselines** - Computed from project wind_filtered.csv data (winter 381m, summer 1106m, monsoon 669m)
8. **Fire baselines** - Computed from project fires_combined.csv data (daily avg 183, peak 529)
9. **K+ biomass threshold** - IIT Kanpur 2016 (normal < 2, biomass 4-15 µg/m³)

## Basic Physics/Math (No Citation Needed)

1. Haversine distance formula
2. Bearing calculation
3. Wind direction convention
4. Normalization to percentages
5. Box model (concentration ∝ 1/mixing height)

## Assumptions (Documented, Not Fully Verified)

1. Distance decay 100 km half-life
2. Alignment tolerance 60°
3. BLH thresholds (200, 400, 700, 1000 m) - based on seasonal averages
4. SO2 average baseline 15 µg/m³ (study says "low", no exact value)
5. Weekend traffic reduction factor
6. Wind speed threshold for dust

---

# References

## Primary Sources (Source Apportionment)

1. **ARAI & TERI (2018)**. "Source Apportionment of PM2.5 & PM10 of Delhi NCR for Identification of Major Sources." Automotive Research Association of India and The Energy and Resources Institute. Chapter 4, Section 4.4.1, Page 396.

2. **IIT Kanpur (2016)**. "Comprehensive Study on Air Pollution and Green House Gases (GHGs) in Delhi." Indian Institute of Technology Kanpur for Department of Environment, Government of NCT of Delhi. January 2016, 334 pp.

## Supporting Literature

3. WHO (2013). Review of Evidence on Health Aspects of Air Pollution – REVIHAAP Project. NCBI Bookshelf NBK361807.

4. U.S. Energy Information Administration (2018). "Sulfur dioxide emissions from U.S. power plants have fallen faster than coal generation."

5. South Coast Air Quality Management District (2006). "Final Methodology to Calculate Particulate Matter (PM) 2.5 and PM2.5 Significance Thresholds."

6. Sharma, S.K. et al. (2016). "Source Apportionment of PM2.5 in Delhi, India Using PMF Model." Bull Environ Contam Toxicol. PMID: 27209541.

7. CPCB (2009). National Ambient Air Quality Standards. Central Pollution Control Board, Ministry of Environment & Forests.

8. Frey, H.C. et al. (2020). "Characterizing Determinants of Near-Road Ambient Air Quality." PMC9620485.

9. Karplus, V.J. et al. (2018). "Quantifying coal power plant responses to tighter SO2 emissions standards in China." PNAS.

## Data Sources

10. VIIRS Active Fire Data - NASA FIRMS
11. ERA5 Reanalysis (wind, BLH) - Copernicus Climate Data Store
12. CPCB Air Quality Monitoring Data
