const https = require('https');
const { DOMParser } = require('xmldom');

const CPCB_RSS_URL = 'https://airquality.cpcb.gov.in/caaqms/rss_feed';

const userList = [
    "Alipur", "IGI Airport", "IHBAS", "IIT Delhi", "ITO", "Lodhi Road",
    "Major Dhyan Chand", "Mandir Marg", "Nehru Nagar", "Narela", "North Campus",
    "Okhla Phase-2", "Patparganj", "Punjabi Bagh", "Pusa", "R K Puram", "Rohini",
    "Sonia Vihar", "Sri Aurobindo Marg", "Vivek Vihar", "Wazirpur", "Aya Nagar",
    "Bawana", "Burari Crossing", "Mathura Road", "New Industrial Town", "Sector 11",
    "Sector 30", "Dharuhera", "Charkhi Dadri", "Indirapuram", "Loni", "Sanjay Nagar",
    "Sector - 125", "Sector - 62", "Knowledge Park - III", "Knowledge Park - V",
    "Yamunapuram", "Ganga Nagar", "Jai Bhim Nagar", "Pallavpuram", "Anand Vihar", "New Mandi"
];

function fetchXML(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log("Fetching XML...");
        // Note: Direct fetch might fail locally due to CORS in browser, but node https is fine? 
        // Actually the server might block non-browser UAs, let's try.
        // If this fails, I'll rely on the structure I know.
        const xml = await fetchXML(CPCB_RSS_URL);

        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "text/xml");
        const stations = doc.getElementsByTagName("Station");

        console.log(`Found ${stations.length} total stations.`);

        const matches = [];

        for (let i = 0; i < stations.length; i++) {
            const s = stations[i];
            const id = s.getAttribute("id");
            const lat = s.getAttribute("latitude");
            const lon = s.getAttribute("longitude");

            // Simple string partial match
            const matchedName = userList.find(u => id.toLowerCase().includes(u.toLowerCase()));

            if (matchedName) {
                matches.push({
                    userQuery: matchedName,
                    officialId: id,
                    lat, lon
                });
            }
        }

        console.log(JSON.stringify(matches, null, 2));

    } catch (e) {
        console.error(e);
    }
}

run();
