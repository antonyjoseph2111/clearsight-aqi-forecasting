// AQI Service for fetching and processing air quality data

class AQIService {
    constructor() {
        this.baseUrl = CONFIG.OPENAQ_API_URL;
        // Use the static JSON file created by the user
        this.staticStationsUrl = 'selected_stations.json';
    }

    /**
     * Get AQI data for specific coordinates
     */
    async getAQIData(lat, lon) {
        try {
            // Check cache first
            const cacheKey = `aqi_${lat.toFixed(4)}_${lon.toFixed(4)}`;
            const cachedData = Storage.get(cacheKey);

            if (cachedData && isCacheValid(cachedData.timestamp)) {
                console.log('Using cached AQI data');
                return cachedData.data;
            }

            console.log(`Fetching AQI data for ${lat}, ${lon}...`);

            let aqiData = null;

            // 1. Try Curated Static JSON (Primary Source now)
            try {
                console.log('Attempting to fetch from Curated Stations JSON...');
                const stations = await this._fetchStaticStations();
                if (stations && stations.length > 0) {
                    aqiData = this._findNearestValidStation(stations, lat, lon);
                    if (aqiData) console.log('Found station in curated list!');
                }
            } catch (staticError) {
                console.warn('Static JSON fetch failed:', staticError);
            }

            // 2. Fallback to CPCB Live XML (if static failed or no coverage)
            if (!aqiData && lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
                try {
                    console.log('Fallback: Attempting to fetch CPCB Live XML...');
                    aqiData = await this.getCPCBData(lat, lon);
                } catch (cpcbError) {
                    console.warn('CPCB Live Fetch failed:', cpcbError);
                }
            }

            // 3. Fallback to OpenAQ
            if (!aqiData) {
                // ... OpenAQ logic ...
            }

            if (!aqiData) {
                // Return empty/null or handle graceful failure
                throw new Error('No valid air quality data found.');
            }

            // Cache the result
            Storage.set(cacheKey, {
                timestamp: Date.now(),
                data: aqiData
            });

            return aqiData;

        } catch (error) {
            logError(error, 'AQIService.getAQIData');
            throw error;
        }
    }

    /**
     * Get ALL nearby CPCB stations for mapping
     */
    async getNearbyCPCBStations(lat, lon, limit = 50) {
        try {
            // Priority: Static JSON
            let stations = [];
            try {
                stations = await this._fetchStaticStations();
            } catch (e) {
                console.warn("Static fetch failed, trying live XML...");
                const xmlText = await this._fetchCPCBXml();
                stations = this._parseAllStations(xmlText);
            }

            // Calculate distance for all
            const nearby = stations.map(s => {
                const dist = calculateDistance(lat, lon, s.lat, s.lon);
                // Use explicit AQI if avail, else calc
                const aqi = s.aqi || Math.max(s.pm25 || 0, s.pm10 || 0);
                return { ...s, dist, aqi };
            }).filter(s => s.dist < 200); // Expanded range for curated list

            // Sort by distance
            nearby.sort((a, b) => a.dist - b.dist);

            return nearby.slice(0, limit);
        } catch (error) {
            console.warn("Could not fetch nearby stations list:", error);
            return [];
        }
    }

    /**
     * Fetch Static JSON
     */
    async _fetchStaticStations() {
        const response = await fetch(this.staticStationsUrl);
        if (!response.ok) throw new Error("Failed to load selected_stations.json");
        const data = await response.json();

        // Map JSON format to internal format
        return data.map(s => ({
            id: s.station_id,
            lat: parseFloat(s.latitude),
            lon: parseFloat(s.longitude),
            pm25: parseFloat(s.pollutants["PM2.5"] || 0),
            pm10: parseFloat(s.pollutants["PM10"] || 0),
            pollutants: s.pollutants, // Keep raw map
            lastUpdate: s.last_update,
            // CRITICAL: Use the pre-calculated authoritative AQI from the source
            aqi: parseInt(s.aqi, 10) || 0
        }));
    }

    async getCPCBData(lat, lon) {
        const xmlText = await this._fetchCPCBXml();
        const stations = this._parseAllStations(xmlText);
        return this._findNearestValidStation(stations, lat, lon);
    }

    async _fetchCPCBXml() {
        // Proxy logic (kept as fallback)
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(CONFIG.CPCB_RSS_URL)}`,
            `https://corsproxy.io/?${encodeURIComponent(CONFIG.CPCB_RSS_URL)}`
        ];
        for (const proxyUrl of proxies) {
            try {
                const response = await fetch(`${proxyUrl}&t=${Date.now()}`);
                if (response.ok) return await response.text();
            } catch (e) { }
        }
        throw new Error("Unable to fetch CPCB data.");
    }

    _parseAllStations(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const stationNodes = xmlDoc.getElementsByTagName("Station");
        const stations = [];

        for (let i = 0; i < stationNodes.length; i++) {
            const node = stationNodes[i];
            const lat = parseFloat(node.getAttribute("latitude"));
            const lon = parseFloat(node.getAttribute("longitude"));
            const id = node.getAttribute("id");

            if (isNaN(lat) || isNaN(lon)) continue;

            const pollutants = {};
            const pollIndices = node.getElementsByTagName("Pollutant_Index");
            let pm25Val = null;
            let pm10Val = null;

            for (let j = 0; j < pollIndices.length; j++) {
                const pol = pollIndices[j];
                const pid = pol.getAttribute("id");
                const val = parseFloat(pol.getAttribute("Avg")); // XML uses Avg, JSON uses Value (handled in fetchStatic)
                if (!isNaN(val)) {
                    pollutants[pid] = val;
                    if (pid === "PM2.5") pm25Val = val;
                    if (pid === "PM10") pm10Val = val;
                }
            }

            stations.push({
                id, lat, lon, pm25: pm25Val, pm10: pm10Val, pollutants
            });
        }
        return stations;
    }

    _findNearestValidStation(stations, lat, lon) {
        // Robust 10/25/50km Logic
        const allCandidates = stations.map(s => ({
            ...s,
            dist: calculateDistance(lat, lon, s.lat, s.lon),
            // Use existing AQI (from JSON) if available, otherwise calc from poll
            aqi: s.aqi || Math.max(s.pm25 || 0, s.pm10 || 0)
        }));

        const activeStations = allCandidates.filter(s => s.aqi > 0);
        const radii = [10, 25, 50, 100]; // Added 100km fallback for sparse curated list

        for (const radius of radii) {
            const inRange = activeStations.filter(s => s.dist <= radius);
            if (inRange.length > 0) {
                inRange.sort((a, b) => a.dist - b.dist);
                const winner = inRange[0];
                return this._formatStationData(winner);
            }
        }
        return null;
    }

    _formatStationData(station) {
        return {
            source: 'CPCB (Govt. of India)',
            station: { name: station.id, lastUpdated: station.lastUpdate || new Date().toISOString() }, // Normalized structure
            distance: station.dist,
            aqi: {
                value: station.aqi,
                category: getAQICategory(station.aqi),
                colorClass: getAQIColorClass(station.aqi)
            },
            dominantPollutant: (station.pm25 >= station.pm10) ? "PM2.5" : "PM10",
            pollutants: {
                pm25: station.pm25 || 0,
                pm10: station.pm10 || 0,
                no2: station.pollutants["NO2"] || 0,
                so2: station.pollutants["SO2"] || 0,
                co: station.pollutants["CO"] || 0,
                o3: station.pollutants["O3"] || 0
            }
        };
    }

    // ... _processStationData (OpenAQ) ...
    _processStationData(stationData) {
        const measurements = stationData.measurements.reduce((acc, m) => {
            const key = m.parameter.toLowerCase();
            if (['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].includes(key)) {
                acc[key] = Math.round(m.value);
            }
            return acc;
        }, {});
        const overallAQI = calculateOverallAQI(measurements);
        return {
            station: {
                name: stationData.location,
                city: stationData.city,
                distance: stationData.distance || 0,
                lastUpdated: stationData.measurements[0]?.lastUpdated || new Date().toISOString()
            },
            pollutants: measurements,
            aqi: {
                value: overallAQI,
                category: getAQICategory(overallAQI),
                colorClass: getAQIColorClass(overallAQI)
            },
            source: 'OpenAQ'
        };
    }
}

const aqiService = new AQIService();
