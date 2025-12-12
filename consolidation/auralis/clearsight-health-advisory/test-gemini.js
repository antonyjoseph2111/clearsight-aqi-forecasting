const https = require('https');

const API_KEY = 'AIzaSyAXsWb5tOxtC1FKMIUT0lftcEKvfRz_mPU';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const data = JSON.stringify({
    contents: [{
        parts: [{
            text: "Hello, say this is a test."
        }]
    }]
});

const url = `${API_URL}?key=${API_KEY}`;

console.log(`Testing URL: ${API_URL}`);

const req = https.request(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';

    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Body:', body);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
