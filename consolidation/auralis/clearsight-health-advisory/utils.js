// Utility functions for the Health Advisory System

/**
 * Format date and time
 */
function formatDateTime(date) {
    if (!date) return '--';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time only
 */
function formatTime(date) {
    if (!date) return '--';
    const d = new Date(date);
    return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Get AQI category from AQI value
 */
function getAQICategory(aqi) {
    if (aqi <= CONFIG.AQI_THRESHOLDS.GOOD) return 'Good';
    if (aqi <= CONFIG.AQI_THRESHOLDS.SATISFACTORY) return 'Satisfactory';
    if (aqi <= CONFIG.AQI_THRESHOLDS.MODERATE) return 'Moderate';
    if (aqi <= CONFIG.AQI_THRESHOLDS.POOR) return 'Poor';
    if (aqi <= CONFIG.AQI_THRESHOLDS.VERY_POOR) return 'Very Poor';
    return 'Severe';
}

/**
 * Get AQI color class from AQI value
 */
function getAQIColorClass(aqi) {
    if (aqi <= CONFIG.AQI_THRESHOLDS.GOOD) return 'aqi-good';
    if (aqi <= CONFIG.AQI_THRESHOLDS.SATISFACTORY) return 'aqi-satisfactory';
    if (aqi <= CONFIG.AQI_THRESHOLDS.MODERATE) return 'aqi-moderate';
    if (aqi <= CONFIG.AQI_THRESHOLDS.POOR) return 'aqi-poor';
    if (aqi <= CONFIG.AQI_THRESHOLDS.VERY_POOR) return 'aqi-very-poor';
    return 'aqi-severe';
}

/**
 * Get pollutant category from value
 */
function getPollutantCategory(pollutant, value) {
    const limits = CONFIG.POLLUTANT_LIMITS[pollutant];
    if (!limits) return 'Unknown';

    if (value <= limits.GOOD) return 'Good';
    if (value <= limits.SATISFACTORY) return 'Satisfactory';
    if (value <= limits.MODERATE) return 'Moderate';
    if (value <= limits.POOR) return 'Poor';
    if (value <= limits.VERY_POOR) return 'Very Poor';
    return 'Severe';
}

/**
 * Calculate AQI from pollutant concentration
 */
function calculateSubIndex(pollutant, concentration) {
    const limits = CONFIG.POLLUTANT_LIMITS[pollutant];
    if (!limits) return 0;

    const breakpoints = [
        { cLow: 0, cHigh: limits.GOOD, iLow: 0, iHigh: 50 },
        { cLow: limits.GOOD, cHigh: limits.SATISFACTORY, iLow: 51, iHigh: 100 },
        { cLow: limits.SATISFACTORY, cHigh: limits.MODERATE, iLow: 101, iHigh: 200 },
        { cLow: limits.MODERATE, cHigh: limits.POOR, iLow: 201, iHigh: 300 },
        { cLow: limits.POOR, cHigh: limits.VERY_POOR, iLow: 301, iHigh: 400 },
        { cLow: limits.VERY_POOR, cHigh: limits.SEVERE, iLow: 401, iHigh: 500 }
    ];

    for (const bp of breakpoints) {
        if (concentration >= bp.cLow && concentration <= bp.cHigh) {
            const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) *
                (concentration - bp.cLow) + bp.iLow;
            return Math.round(aqi);
        }
    }

    return 500; // Maximum AQI
}

/**
 * Calculate overall AQI from multiple pollutants
 */
function calculateOverallAQI(pollutants) {
    const subIndices = [];

    if (pollutants.pm25) subIndices.push(calculateSubIndex('PM25', pollutants.pm25));
    if (pollutants.pm10) subIndices.push(calculateSubIndex('PM10', pollutants.pm10));
    if (pollutants.no2) subIndices.push(calculateSubIndex('NO2', pollutants.no2));
    if (pollutants.so2) subIndices.push(calculateSubIndex('SO2', pollutants.so2));
    if (pollutants.co) subIndices.push(calculateSubIndex('CO', pollutants.co));
    if (pollutants.o3) subIndices.push(calculateSubIndex('O3', pollutants.o3));

    return subIndices.length > 0 ? Math.max(...subIndices) : 0;
}

/**
 * Local Storage Management
 */
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

/**
 * Validate coordinates
 */
function validateCoordinates(lat, lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
        return { valid: false, error: 'Invalid coordinates format' };
    }

    if (latitude < -90 || latitude > 90) {
        return { valid: false, error: 'Latitude must be between -90 and 90' };
    }

    if (longitude < -180 || longitude > 180) {
        return { valid: false, error: 'Longitude must be between -180 and 180' };
    }

    // Check if coordinates are within Delhi-NCR bounds
    const bounds = CONFIG.DELHI_NCR_BOUNDS;
    if (latitude < bounds.south || latitude > bounds.north ||
        longitude < bounds.west || longitude > bounds.east) {
        return {
            valid: true,
            warning: 'Coordinates are outside Delhi-NCR region. Results may be less accurate.'
        };
    }

    return { valid: true, latitude, longitude };
}

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show notification/toast message
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'error' ? 'rgba(213, 0, 0, 0.9)' :
            type === 'success' ? 'rgba(0, 230, 118, 0.9)' :
                'rgba(79, 172, 254, 0.9)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        font-family: var(--font-primary);
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Check if data is cached and still valid
 */
function isCacheValid(timestamp) {
    if (!timestamp) return false;
    const now = Date.now();
    return (now - timestamp) < CONFIG.CACHE_DURATION;
}

/**
 * Get time of day category
 */
function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Error logging
 */
function logError(error, context = '') {
    console.error(`[Health Advisory Error] ${context}:`, error);

    // Store error in localStorage for debugging
    const errors = Storage.get('error_log') || [];
    errors.push({
        timestamp: new Date().toISOString(),
        context,
        message: error.message || error,
        stack: error.stack
    });

    // Keep only last 50 errors
    if (errors.length > 50) {
        errors.shift();
    }

    Storage.set('error_log', errors);
}

/**
 * Check if user is in sensitive group
 */
function isSensitiveGroup(profile) {
    const age = parseInt(profile.age);
    return age < 15 || age > 65 || profile.pregnant;
}

/**
 * Export utilities
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDateTime,
        formatTime,
        calculateDistance,
        getAQICategory,
        getAQIColorClass,
        getPollutantCategory,
        calculateSubIndex,
        calculateOverallAQI,
        Storage,
        validateCoordinates,
        debounce,
        showNotification,
        formatNumber,
        sanitizeInput,
        isCacheValid,
        getTimeOfDay,
        generateId,
        logError,
        isSensitiveGroup
    };
}
