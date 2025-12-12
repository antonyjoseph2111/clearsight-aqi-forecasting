const https = require('https');
const fs = require('fs');

const url = 'https://airquality.cpcb.gov.in/caaqms/rss_feed';
console.log(`Downloading XML from ${url}...`);

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed: Status Code ${res.statusCode}`);
        return;
    }

    const file = fs.createWriteStream('rss_feed.xml');
    res.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('Download complete: rss_feed.xml');
    });
}).on('error', (err) => {
    console.error('Error downloading:', err.message);
});
