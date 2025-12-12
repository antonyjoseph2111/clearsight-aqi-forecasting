
const { DOMParser } = require('xmldom');
const https = require('https');

// Delhi Coordinates (Mandir Marg - Known Active Station)
const LAT = 28.6366;
const LON = 77.1990;

console.log(`Testing logic for location: ${LAT}, ${LON}`);

const RSS_URL = 'https://airquality.cpcb.gov.in/caaqms/rss_feed';

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

https.get(RSS_URL, (res) => {
    let xmlText = '';
    res.on('data', chunk => xmlText += chunk);
    res.on('end', () => {
        console.log(`Fetched ${xmlText.length} bytes.`);

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const stations = xmlDoc.getElementsByTagName("Station");

        console.log(`Found ${stations.length} stations in feed.`);

        // --- ROBUST LOGIC START ---
        // Match the deployed logic: Sort by distance, then find first Valid
        let candidates = [];

        for (let i = 0; i < stations.length; i++) {
            const station = stations[i];
            const sLat = parseFloat(station.getAttribute("latitude"));
            const sLon = parseFloat(station.getAttribute("longitude"));
            const id = station.getAttribute("id");

            if (isNaN(sLat) || isNaN(sLon)) continue;

            const dist = calculateDistance(LAT, LON, sLat, sLon);

            if (dist < 50) { // Check within 50km
                candidates.push({ station, dist, id });
            }
        }

        candidates.sort((a, b) => a.dist - b.dist);
        console.log(`Found ${candidates.length} candidates within 50km.`);

        let foundStation = null;

        for (const cand of candidates) {
            const station = cand.station;
            const pollIndices = station.getElementsByTagName("Pollutant_Index");

            let pm25Val = null;
            let pm10Val = null;

            for (let i = 0; i < pollIndices.length; i++) {
                const pol = pollIndices[i];
                const id = pol.getAttribute("id");
                const val = parseFloat(pol.getAttribute("Avg"));

                if (!isNaN(val)) {
                    if (id === "PM2.5") pm25Val = val;
                    if (id === "PM10") pm10Val = val;
                }
            }

            // Check validity
            if (pm25Val !== null || pm10Val !== null) {
                console.log(`\n✅ SELECTED VALID STATION:`);
                console.log(`ID: ${cand.id}`);
                console.log(`Distance: ${cand.dist.toFixed(2)} km`);
                console.log(`PM2.5: ${pm25Val}, PM10: ${pm10Val}`);
                foundStation = cand;
                break; // Stop at first valid
            } else {
                console.log(`❌ Skipping ${cand.id} (${cand.dist.toFixed(2)} km) - Data NA`);
            }
        }

        if (!foundStation) {
            console.log("\n⚠️ NO VALID STATION FOUND.");
        }
        // --- ROBUST LOGIC END ---
    });
});
