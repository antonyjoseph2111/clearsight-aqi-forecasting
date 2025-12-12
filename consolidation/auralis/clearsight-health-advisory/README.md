# Delhi-NCR Health Advisory System

An AI-powered health advisory system enabling users to get personalized health recommendations based on real-time air quality data in Delhi-NCR.

## Features

- **Real-time AQI Data**: Fetches pollution data (PM2.5, PM10, NO2, etc.) from OpenAQ.
- **Personalized Health Logic**: Assessment engine checks user conditions (Asthma, COPD, etc.) against specific pollutants.
- **Gemini AI Integration**: Uses Google's Gemini Pro model to generate nuanced, medically-aware insights.
- **Interactive Dashboard**: Modern, responsive UI with glassmorphism design.
- **Offline Capable**: Caches data and user profile locally.

## Setup & Running

1. **Prerequisites**:
   - A modern web browser (Chrome, Edge, Firefox).
   - Internet connection.

2. **Installation**:
   - No installation required. This is a client-side application.
   - Simply open `index.html` in your web browser.

3. **Usage**:
   - **Step 1**: Allow location access or enter coordinates manually.
   - **Step 2**: Fill out the health profile form.
   - **Step 3**: View your personalized dashboard with risk levels and recommendations.

## Configuration

- **API Keys**: preset in `config.js`
- **Storage**: Uses Browser LocalStorage for offline capability.

## Troubleshooting

### 1. Gemini API Error 404
If AI insights fail:
1. Ensure your API Key in `config.js` is valid and has access to `gemini-1.5-flash`.
2. Get a key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 2. Data Not Loading (CORS)
If AI insights fail:
1. Ensure your API Key in `config.js` is valid and has access to `gemini-1.5-flash`.
2. Get a key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 3. Data Not Loading (CORS)
OpenAQ API may be blocked by browser CORS policies on deployed sites. The app automatically falls back to **Mock Data** so you can still experience the UI. For real data, a backend proxy is required.

## Technologies

- HTML5 / CSS3 (Grid, Flexbox, Variables)
- Vanilla JavaScript (ES6+)
- OpenAQ API
- Google Gemini API

## Disclaimer

This system provides general informational advice only. It is not a medical device. Always consult a doctor for serious health concerns.
