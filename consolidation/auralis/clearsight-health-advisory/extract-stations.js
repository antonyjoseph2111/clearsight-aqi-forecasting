const fs = require('fs');
const { DOMParser } = require('xmldom');

// The specific list provided by the user + mapped to official IDs in previous steps
// I will use substrings to match reliably against the XML 'id' or 'location' attributes.
const TARGET_STATIONS = [
    // Delhi
    "Alipur", "IGI Airport", "IHBAS", "IIT Delhi", "ITO", "Lodhi Road",
    "Major Dhyan Chand", "Mandir Marg", "Nehru Nagar", "Narela", "North Campus",
    "Okhla Phase-2", "Patparganj", "Punjabi Bagh", "Pusa", "R K Puram", "Rohini",
    "Sonia Vihar", "Sri Aurobindo Marg", "Vivek Vihar", "Wazirpur", "Aya Nagar",
    "Bawana", "Burari Crossing", "Mathura Road",
    // Faridabad
    "New Industrial Town", "Sector 11", "Sector 30",
    // Gurgaon
    "Dharuhera", "Charkhi Dadri", // These were in the user's list under Gurgaon/Region
    // Ghaziabad
    "Indirapuram", "Loni", "Sanjay Nagar",
    // Noida
    "Sector - 125", "Sector - 62",
    // Greater Noida
    "Knowledge Park - III", "Knowledge Park - V",
    // Bulandshahr
    "Yamunapuram",
    // Meerut
    "Ganga Nagar", "Jai Bhim Nagar", "Pallavpuram",
    // Hapur
    "Anand Vihar",
    // Muzaffarnagar
    "New Mandi"
];

// Helper to check if station matches target list
function isTargetStation(id) {
    if (!id) return false;
    return TARGET_STATIONS.some(target => id.toLowerCase().includes(target.toLowerCase()));
}

try {
    console.log("Reading rss_feed.xml...");
    const xml = fs.readFileSync('rss_feed.xml', 'utf8');

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const stationNodes = doc.getElementsByTagName("Station");

    console.log(`Found ${stationNodes.length} total stations in XML.`);

    const extractedStations = [];

    for (let i = 0; i < stationNodes.length; i++) {
        const node = stationNodes[i];
        const id = node.getAttribute("id");

        if (isTargetStation(id)) {
            const lat = parseFloat(node.getAttribute("latitude"));
            const lon = parseFloat(node.getAttribute("longitude"));
            const city = node.getAttribute("city");
            const state = node.getAttribute("state");
            const lastUpdate = node.getAttribute("lastupdate");

            // Parse AQI
            let aqiValue = null;
            let predParam = null;
            const aqiNode = node.getElementsByTagName("Air_Quality_Index")[0];
            if (aqiNode) {
                aqiValue = aqiNode.getAttribute("Value");
                predParam = aqiNode.getAttribute("Predominant_Parameter");
            }

            // Parse Pollutants
            const pollutants = {};
            const pollIndices = node.getElementsByTagName("Pollutant_Index");
            for (let j = 0; j < pollIndices.length; j++) {
                const pol = pollIndices[j];
                const pid = pol.getAttribute("id");
                const val = pol.getAttribute("Value");
                pollutants[pid] = val; // Keep as string or number? Let's keep raw first
            }

            extractedStations.push({
                station_id: id,
                station_name: id.split(',')[0].trim(), // Simple name
                city: city,
                state: state,
                latitude: lat,
                longitude: lon,
                last_update: lastUpdate,
                aqi: aqiValue,
                predominant_parameter: predParam,
                pollutants: pollutants
            });
        }
    }

    console.log(`Extracted ${extractedStations.length} matching stations.`);

    fs.writeFileSync('selected_stations.json', JSON.stringify(extractedStations, null, 2));
    console.log("Saved to selected_stations.json");

} catch (e) {
    console.error("Error:", e);
}
