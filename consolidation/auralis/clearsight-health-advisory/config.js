// Configuration file for API keys and settings
const CONFIG = {
    // Gemini AI API Configuration
    GEMINI_API_KEY: 'AIzaSyAXsWb5tOxtC1FKMIUT0lftcEKvfRz_mPU', // REPLACE WITH YOUR VALID API KEY
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

    // OpenAQ API Configuration
    OPENAQ_API_URL: 'https://api.openaq.org/v2',

    // CPCB RSS Feed Configuration (Government of India)
    CPCB_RSS_URL: 'https://airquality.cpcb.gov.in/caaqms/rss_feed',

    // Firebase Configuration (real credentials)
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyBG1ucrmcOYkWMk_GrGNMqKymQ7ZJGDZBU",
        authDomain: "clear-sight0.firebaseapp.com",
        projectId: "clear-sight0",
        storageBucket: "clear-sight0.firebasestorage.app",
        messagingSenderId: "481401166230",
        appId: "1:481401166230:web:949f5005522cd49b1d25b7",
        measurementId: "G-NK5YKTFSW1"
    },

    // Delhi-NCR Bounding Box
    DELHI_NCR_BOUNDS: {
        north: 29.0,
        south: 28.4,
        east: 77.5,
        west: 76.8
    },

    // AQI Thresholds (India standards)
    AQI_THRESHOLDS: {
        GOOD: 50,
        SATISFACTORY: 100,
        MODERATE: 200,
        POOR: 300,
        VERY_POOR: 400,
        SEVERE: 500
    },

    // Pollutant Limits (µg/m³)
    POLLUTANT_LIMITS: {
        PM25: {
            GOOD: 30,
            SATISFACTORY: 60,
            MODERATE: 90,
            POOR: 120,
            VERY_POOR: 250,
            SEVERE: 380
        },
        PM10: {
            GOOD: 50,
            SATISFACTORY: 100,
            MODERATE: 250,
            POOR: 350,
            VERY_POOR: 430,
            SEVERE: 550
        },
        NO2: {
            GOOD: 40,
            SATISFACTORY: 80,
            MODERATE: 180,
            POOR: 280,
            VERY_POOR: 400,
            SEVERE: 520
        },
        SO2: {
            GOOD: 40,
            SATISFACTORY: 80,
            MODERATE: 380,
            POOR: 800,
            VERY_POOR: 1600,
            SEVERE: 2100
        },
        CO: {
            GOOD: 1.0,
            SATISFACTORY: 2.0,
            MODERATE: 10,
            POOR: 17,
            VERY_POOR: 34,
            SEVERE: 46
        },
        O3: {
            GOOD: 50,
            SATISFACTORY: 100,
            MODERATE: 168,
            POOR: 208,
            VERY_POOR: 748,
            SEVERE: 1000
        }
    },

    // Cache duration in milliseconds
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutes

    // App Settings
    APP_NAME: 'Delhi-NCR Health Advisory',
    APP_VERSION: '1.0.0'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
