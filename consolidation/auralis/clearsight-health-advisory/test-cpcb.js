
const https = require('https');

const URL = 'https://airquality.cpcb.gov.in/caaqms/rss_feed';

console.log(`Fetching RSS Feed: ${URL}`);

const options = {
    headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

const req = https.get(URL, options, (res) => {
    let body = '';

    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        // Print first 500 characters to verify format
        console.log('Body (truncated):', body.substring(0, 500));
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});
