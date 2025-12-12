// Main Application Logic

class App {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.currentLocation = null;
        this.currentAQI = null;
        this.map = null;
        this.mapMarker = null;
        this.stationsList = []; // Dynamic List from JSON

        // DOM Elements
        this.elements = {
            locationSection: document.getElementById('location-section'),
            healthProfileSection: document.getElementById('health-profile-section'),
            advisorySection: document.getElementById('advisory-section'),
            autoDetectBtn: document.getElementById('auto-detect-btn'),
            manualLocationBtn: document.getElementById('manual-location-btn'),
            latitudeInput: document.getElementById('latitude'),
            longitudeInput: document.getElementById('longitude'),
            locationStatus: document.getElementById('location-status'),
            pincodeInput: document.getElementById('pincode-input'),
            pincodeSearchBtn: document.getElementById('pincode-search-btn'),
            stationSearchInput: document.getElementById('station-search-input'),
            stationSearchBtn: document.getElementById('station-search-btn'),
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            healthProfileForm: document.getElementById('health-profile-form'),
            advisoryTimestamp: document.getElementById('advisory-timestamp'),
            loadingState: document.getElementById('loading-state'),
            aqiOverview: document.getElementById('aqi-overview'),
            aqiValue: document.getElementById('aqi-value'),
            aqiCategory: document.getElementById('aqi-category'),
            stationName: document.getElementById('station-name'),
            measurementTime: document.getElementById('measurement-time'),
            pollutantsGrid: document.getElementById('pollutants-grid'),
            riskAssessment: document.getElementById('risk-assessment'),
            riskBadge: document.getElementById('risk-level-badge'),
            riskSummary: document.getElementById('risk-summary'),
            healthImpacts: document.getElementById('health-impacts'),
            healthImpactsList: document.getElementById('health-impacts-list'),
            recommendations: document.getElementById('recommendations'),
            recommendationsList: document.getElementById('recommendations-list'),
            urgentWarnings: document.getElementById('urgent-warnings'),
            urgentWarningsList: document.getElementById('urgent-warnings-list'),
            activityPlanning: document.getElementById('activity-planning'),
            activityPlanContent: document.getElementById('activity-plan-content'),
            actionButtons: document.getElementById('action-buttons'),
            saveProfileBtn: document.getElementById('save-profile-btn'),
            refreshDataBtn: document.getElementById('refresh-data-btn'),
            newAssessmentBtn: document.getElementById('new-assessment-btn')
        };

        this.init();
    }

    async init() {
        console.log("Initializing App...");
        this.attachEventListeners();
        this.setupTabs();

        // 1. Load Stations for Search & Map
        try {
            // Using a central point (Delhi) to fetch "nearby" (which will be ALL in JSON due to logic update)
            this.stationsList = await aqiService.getNearbyCPCBStations(28.61, 77.23, 100);
            console.log(`Loaded ${this.stationsList.length} stations for search.`);
        } catch (e) {
            console.warn("Failed to preload stations:", e);
        }

        // TEST MODE
        const urlParams = new URLSearchParams(window.location.search);
        const latParam = urlParams.get('lat');
        const lonParam = urlParams.get('lon');

        if (latParam && lonParam) {
            console.log("TEST MODE: Auto-running with URL Coordinates", latParam, lonParam);
            this.currentLocation = {
                latitude: parseFloat(latParam),
                longitude: parseFloat(lonParam)
            };
            this.currentProfile = {
                age: 30, gender: 'Male', outdoorHours: 2, activityLevel: 'Moderate', healthConditions: []
            };
            this.elements.locationStatus.textContent = "Location set via URL (Test Mode)";
            this.elements.locationSection.style.display = 'none';
            this.elements.healthProfileSection.style.display = 'none';
            this.elements.advisorySection.style.display = 'block';
            this.elements.advisorySection.classList.remove('hidden');

            try {
                this.showNotification("Running Test Mode Analysis...", "info");
                await this.runAnalysis();
            } catch (testError) {
                console.error("Test Mode Failed:", testError);
                this.showNotification(`Test Mode Error: ${testError.message}`, "error");
            }
            return;
        }

        try {
            this.currentUser = await firebaseService.loginAnonymous();
            // Check for saved profile
            const savedProfile = await firebaseService.getUserProfile(this.currentUser.uid);
            if (savedProfile) {
                this.prefillForm(savedProfile);
                this.currentProfile = savedProfile;
            }
        } catch (error) {
            logError(error, 'App.init');
        }
    }

    attachEventListeners() {
        this.elements.autoDetectBtn.addEventListener('click', () => this.handleAutoLocation());
        this.elements.manualLocationBtn.addEventListener('click', () => this.handleManualLocation());
        if (this.elements.pincodeSearchBtn) {
            this.elements.pincodeSearchBtn.addEventListener('click', () => this.handlePincodeSubmit());
        }
        if (this.elements.stationSearchBtn) {
            this.elements.stationSearchBtn.addEventListener('click', () => this.handleStationSearch());
            this.elements.stationSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleStationSearch();
            });
        }
        this.elements.healthProfileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        this.elements.refreshDataBtn.addEventListener('click', () => this.refreshAnalysis());
        this.elements.newAssessmentBtn.addEventListener('click', () => this.resetApp());
        this.elements.saveProfileBtn.addEventListener('click', () => this.saveProfile());
    }

    setupTabs() {
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.tabBtns.forEach(b => b.classList.remove('active'));
                this.elements.tabContents.forEach(c => c.classList.add('hidden'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                document.getElementById(`tab-${tabId}`).classList.remove('hidden');
                if (tabId === 'map') {
                    setTimeout(() => this.initMap(), 100);
                }
            });
        });
    }

    async initMap() {
        if (this.map) {
            this.map.invalidateSize();
            return;
        }
        const defaultLat = 28.627;
        const defaultLon = 77.215;
        this.map = L.map('leaflet-map').setView([defaultLat, defaultLon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Fetch stations if not loaded
        if (this.stationsList.length === 0) {
            this.stationsList = await aqiService.getNearbyCPCBStations(defaultLat, defaultLon, 100);
        }
        this.plotStations(this.stationsList);

        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            if (this.mapMarker) this.map.removeLayer(this.mapMarker);
            this.mapMarker = L.marker([lat, lng]).addTo(this.map);
            this.showNotification(`Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
            this.updateLocation(lat, lng, 'Map Selection');
        });
    }

    plotStations(stations) {
        stations.forEach(station => {
            const aqi = station.aqi || 0;
            const color = this.getAQIColor(aqi);
            const circle = L.circleMarker([station.lat, station.lon], {
                radius: 8,
                fillColor: color,
                color: "#333",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            const popupContent = `
                <div style="text-align:center;">
                    <b>${station.id.split(',')[0]}</b><br>
                    <span style="font-size:1.2em; font-weight:bold; color:${color};">AQI: ${aqi}</span><br>
                    <small>PM2.5: ${station.pm25 || '-'} | PM10: ${station.pm10 || '-'}</small><br>
                    <button onclick="window.app.updateLocation(${station.lat}, ${station.lon}, 'Station: ${station.id}')" 
                            style="margin-top:5px; padding:4px 8px; cursor:pointer;">
                        Select
                    </button>
                </div>
            `;
            circle.bindPopup(popupContent);
        });
    }

    getAQIColor(aqi) {
        if (aqi <= 50) return "#00b050";
        if (aqi <= 100) return "#92d050";
        if (aqi <= 200) return "#ffc000";
        if (aqi <= 300) return "#e46c0a";
        if (aqi <= 400) return "#ff0000";
        return "#c00000";
    }

    handleStationSearch() {
        const query = this.elements.stationSearchInput.value.toLowerCase().trim();
        if (!query) return;

        // Search in loaded stationsList
        const match = this.stationsList.find(s =>
            (s.id && s.id.toLowerCase().includes(query)) ||
            (s.city && s.city.toLowerCase().includes(query))
        );

        if (match) {
            this.showNotification(`Found: ${match.id.split(',')[0]}`, 'success');
            if (this.map) {
                this.map.setView([match.lat, match.lon], 13);
                if (this.mapMarker) this.map.removeLayer(this.mapMarker);
                this.mapMarker = L.marker([match.lat, match.lon]).addTo(this.map);
            }
            this.updateLocation(match.lat, match.lon, `Station: ${match.id.split(',')[0]}`);

        } else {
            this.showLocationError("Station not found in loaded list.");
        }
    }

    handleAutoLocation() {
        this.elements.locationStatus.textContent = "Detecting location...";
        this.elements.locationStatus.className = "status-message info";
        if (!navigator.geolocation) {
            this.showLocationError("Geolocation is not supported by your browser");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.updateLocation(latitude, longitude, 'Auto-Detection');
            },
            (error) => {
                this.showLocationError(`Error detecting location: ${error.message}. Please try Map or Manual.`);
            }
        );
    }

    async handlePincodeSubmit() {
        const pincode = this.elements.pincodeInput.value.trim();
        if (!pincode || pincode.length !== 6) {
            this.showLocationError("Please enter a valid 6-digit Indian Pincode");
            return;
        }
        this.elements.locationStatus.textContent = "Searching Pincode...";
        this.elements.locationStatus.className = "status-message info";
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=IN&format=json`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                this.updateLocation(lat, lon, `Pincode: ${pincode}`);
            } else {
                this.showLocationError("Pincode not found. Try Map or Manual.");
            }
        } catch (e) {
            console.error(e);
            this.showLocationError("Error fetching pincode. Please check internet.");
        }
    }

    handleManualLocation() {
        const lat = parseFloat(this.elements.latitudeInput.value);
        const lon = parseFloat(this.elements.longitudeInput.value);
        this.updateLocation(lat, lon, 'Manual Input');
    }

    updateLocation(lat, lon, source) {
        const validation = validateCoordinates(lat, lon); // Global util
        if (!validation.valid) {
            this.showLocationError(validation.error);
            return;
        }
        if (validation.warning) {
            showNotification(validation.warning, 'warning');
        }
        this.currentLocation = { latitude: lat, longitude: lon };
        this.showLocationSuccess(`Location set via ${source}! Please fill out your health profile.`);
    }

    showLocationSuccess(msg) {
        this.elements.locationStatus.textContent = msg;
        this.elements.locationStatus.className = "status-message success";
        setTimeout(() => {
            this.elements.healthProfileSection.classList.add('active');
            this.elements.healthProfileSection.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }

    showLocationError(msg) {
        this.elements.locationStatus.textContent = msg;
        this.elements.locationStatus.className = "status-message error";
    }

    async handleProfileSubmit(e) {
        e.preventDefault();
        if (!this.currentLocation) {
            showNotification("Please set your location first", 'error');
            this.elements.locationSection.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        const formData = new FormData(this.elements.healthProfileForm);
        const profile = {
            age: formData.get('age'),
            gender: formData.get('gender'),
            respiratory: this.getCheckedValues('respiratory'),
            cardiovascular: this.getCheckedValues('cardiovascular'),
            other: this.getCheckedValues('other'),
            symptoms: this.getCheckedValues('symptoms'),
            outdoorHours: parseFloat(document.getElementById('outdoor-hours').value),
            activityLevel: document.getElementById('activity-level').value
        };
        this.currentProfile = profile;
        this.elements.advisorySection.classList.add('active');
        this.elements.advisorySection.scrollIntoView({ behavior: 'smooth' });
        await this.runAnalysis();
    }

    getCheckedValues(name) {
        const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.id);
    }

    prefillForm(profile) {
        if (!profile) return;
        document.getElementById('age').value = profile.age;
        document.getElementById('gender').value = profile.gender;
        document.getElementById('outdoor-hours').value = profile.outdoorHours;
        document.getElementById('activity-level').value = profile.activityLevel;
        const checkIds = [...(profile.respiratory || []), ...(profile.cardiovascular || []), ...(profile.other || []), ...(profile.symptoms || [])];
        checkIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = true;
        });
    }

    async saveProfile() {
        if (!this.currentUser || !this.currentProfile) return;
        try {
            await firebaseService.saveUserProfile(this.currentUser.uid, this.currentProfile);
            showNotification("Profile saved successfully!", "success");
        } catch (error) {
            showNotification("Failed to save profile", "error");
        }
    }

    async runAnalysis() {
        this.setLoading(true);
        this.hideResults();
        try {
            const aqiData = await aqiService.getAQIData(
                this.currentLocation.latitude,
                this.currentLocation.longitude
            );
            this.currentAQI = aqiData;
            const advisory = advisoryEngine.generateAdvisory(this.currentProfile, aqiData);
            this.renderDashboard(aqiData, advisory);
            const aiInsight = await advisoryEngine.generateGeminiInsight(
                this.currentProfile,
                aqiData,
                { level: advisory.riskLevel }
            );
            this.renderAIInsight(aiInsight);
        } catch (error) {
            console.error("Analysis Failed:", error);
            showNotification(`Analysis Failed: ${error.message}`, 'error');
            this.elements.loadingState.innerHTML = `<p class="error-text">Failed to load data. Please try again.</p>`;
        } finally {
            this.setLoading(false);
        }
    }

    renderAIInsight(insight) {
        const container = document.getElementById('ai-insight-container');
        if (container) container.remove();
        const newContainer = document.createElement('div');
        newContainer.id = 'ai-insight-container';
        newContainer.className = 'card';
        newContainer.innerHTML = `
            <div class="card-header">
                <h3>🤖 Gemini AI Insight</h3>
            </div>
            <div class="card-body">
                <div id="ai-insight-text" style="white-space: pre-wrap; line-height: 1.6;">${insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
            </div>
        `;
        newContainer.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)';
        newContainer.style.borderColor = 'rgba(118, 75, 162, 0.3)';
        this.elements.riskAssessment.after(newContainer);
        showNotification("AI Insight Generated!", "success");
    }

    async refreshAnalysis() {
        await this.runAnalysis();
    }

    resetApp() {
        this.elements.advisorySection.classList.remove('active');
        this.elements.locationSection.scrollIntoView({ behavior: 'smooth' });
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.elements.loadingState.classList.remove('hidden');
        } else {
            this.elements.loadingState.classList.add('hidden');
        }
    }

    hideResults() {
        this.elements.aqiOverview.classList.add('hidden');
        this.elements.riskAssessment.classList.add('hidden');
        this.elements.healthImpacts.classList.add('hidden');
        this.elements.recommendations.classList.add('hidden');
        this.elements.urgentWarnings.classList.add('hidden');
        this.elements.activityPlanning.classList.add('hidden');
        this.elements.actionButtons.classList.add('hidden');
        const aiContainer = document.getElementById('ai-insight-container');
        if (aiContainer) aiContainer.style.display = 'none';
    }

    renderDashboard(aqiData, advisory) {
        this.renderAQIOverview(aqiData);
        this.renderRiskAssessment(advisory);
        this.renderHealthImpacts(advisory.healthImpacts);
        this.renderRecommendations(advisory.recommendations);
        this.renderWarnings(advisory.warnings);
        this.renderActivityPlan(advisory.activityPlan);
        this.elements.actionButtons.classList.remove('hidden');
        this.elements.advisoryTimestamp.textContent = `Generated at ${formatTime(new Date())}`;
    }

    renderAQIOverview(data) {
        this.elements.aqiOverview.classList.remove('hidden');
        this.elements.aqiValue.textContent = data.aqi.value;
        this.elements.aqiCategory.textContent = data.aqi.category;
        this.elements.aqiCategory.className = `aqi-category ${data.aqi.colorClass}`;
        this.elements.stationName.textContent = data.station.name;
        const sourceText = data.source ? ` • Source: ${data.source}` : '';
        this.elements.measurementTime.textContent = `${formatDateTime(data.station.lastUpdated)}${sourceText}`;
        this.elements.pollutantsGrid.innerHTML = '';
        Object.entries(data.pollutants).forEach(([key, value]) => {
            const card = document.createElement('div');
            const category = getPollutantCategory(key.toUpperCase(), value);
            card.className = "pollutant-card";
            card.innerHTML = `
                <div class="pollutant-name">${key.toUpperCase()}</div>
                <div class="pollutant-value">${value}</div>
                <div class="pollutant-unit">µg/m³</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${category}</div>
            `;
            this.elements.pollutantsGrid.appendChild(card);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => { notification.classList.add('show'); }, 10);
        setTimeout(() => { notification.classList.remove('show'); setTimeout(() => { notification.remove(); }, 3000); }, 3000);
    }

    renderRiskAssessment(advisory) {
        this.elements.riskAssessment.classList.remove('hidden');
        const badge = this.elements.riskBadge;
        badge.textContent = advisory.riskLevel;
        badge.className = 'risk-badge';
        if (advisory.riskLevel === 'Low') badge.classList.add('bg-aqi-good', 'aqi-good');
        else if (advisory.riskLevel === 'Moderate') badge.classList.add('bg-aqi-moderate', 'aqi-moderate');
        else if (advisory.riskLevel === 'High') badge.classList.add('bg-aqi-poor', 'aqi-poor');
        else if (advisory.riskLevel === 'Very High') badge.classList.add('bg-aqi-very-poor', 'aqi-very-poor');
        else badge.classList.add('bg-aqi-severe', 'aqi-severe');
        this.elements.riskSummary.textContent = advisory.riskSummary;
    }

    renderHealthImpacts(impacts) {
        if (!impacts || impacts.length === 0) return;
        this.elements.healthImpacts.classList.remove('hidden');
        this.elements.healthImpactsList.innerHTML = impacts.map(i => `<li>${i}</li>`).join('');
    }

    renderRecommendations(recs) {
        if (!recs || recs.length === 0) return;
        this.elements.recommendations.classList.remove('hidden');
        this.elements.recommendationsList.innerHTML = recs.map(rec => `
            <div class="recommendation-card">
                <div class="recommendation-icon">${rec.icon}</div>
                <div class="recommendation-title">${rec.title}</div>
                <div class="recommendation-text">${rec.text}</div>
            </div>
        `).join('');
    }

    renderWarnings(warnings) {
        if (!warnings || warnings.length === 0) return;
        this.elements.urgentWarnings.classList.remove('hidden');
        this.elements.urgentWarningsList.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
    }

    renderActivityPlan(plan) {
        if (!plan) return;
        this.elements.activityPlanning.classList.remove('hidden');
        this.elements.activityPlanContent.innerHTML = `<p>${plan}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
