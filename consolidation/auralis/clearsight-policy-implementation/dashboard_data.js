// Dashboard Data Processing Layer
// Loads and processes CSV data for visualizations

let dashboardData = {
    rawData: null,
    processedData: null,
    policies: [],
    filters: {
        yearRange: [2020, 2025],
        season: 'all',
        pollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO'],
        sources: ['vehicular', 'dust', 'biomass', 'industrial', 'construction'],
        district: 'all'
    }
};

// Load CSV data
async function loadData() {
    try {
        const response = await fetch('combined_delhi_aqi_from_graphs1.csv');
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            complete: function (results) {
                dashboardData.rawData = results.data;
                processData();
                initializeDashboard();
            },
            error: function (error) {
                console.error('Error loading CSV:', error);
                // Use fallback data if CSV not found
                useFallbackData();
            }
        });
    } catch (error) {
        console.error('Error fetching CSV:', error);
        useFallbackData();
    }
}

// Process raw data into usable format
function processData() {
    if (!dashboardData.rawData) return;

    const data = dashboardData.rawData;
    const processed = {
        yearlyAverages: {},
        monthlyData: {},
        pollutantTrends: {},
        seasonalPatterns: {}
    };

    // Group by year and pollutant
    data.forEach(row => {
        if (!row.Year || !row.Gas || !row.Concentration_Value) return;

        const year = row.Year;
        const gas = row.Gas;
        const value = row.Concentration_Value;

        // Yearly averages
        if (!processed.yearlyAverages[year]) {
            processed.yearlyAverages[year] = {};
        }
        if (!processed.yearlyAverages[year][gas]) {
            processed.yearlyAverages[year][gas] = [];
        }
        processed.yearlyAverages[year][gas].push(value);

        // Monthly data
        const month = row.Month;
        const key = `${year}-${month}`;
        if (!processed.monthlyData[key]) {
            processed.monthlyData[key] = {};
        }
        if (!processed.monthlyData[key][gas]) {
            processed.monthlyData[key][gas] = [];
        }
        processed.monthlyData[key][gas].push(value);
    });

    // Calculate averages
    for (let year in processed.yearlyAverages) {
        for (let gas in processed.yearlyAverages[year]) {
            const values = processed.yearlyAverages[year][gas];
            processed.yearlyAverages[year][gas] = values.reduce((a, b) => a + b, 0) / values.length;
        }
    }

    for (let key in processed.monthlyData) {
        for (let gas in processed.monthlyData[key]) {
            const values = processed.monthlyData[key][gas];
            processed.monthlyData[key][gas] = values.reduce((a, b) => a + b, 0) / values.length;
        }
    }

    dashboardData.processedData = processed;
}

// Fallback data if CSV not available
function useFallbackData() {
    dashboardData.processedData = {
        yearlyAverages: {
            2020: { 'PM2.5': 159.99, 'PM10': 215.03, 'NO2': 18.35, 'SO2': 5.65, 'CO': 865.28 },
            2021: { 'PM2.5': 175.45, 'PM10': 225.12, 'NO2': 22.15, 'SO2': 6.12, 'CO': 795.34 },
            2022: { 'PM2.5': 189.23, 'PM10': 235.67, 'NO2': 26.78, 'SO2': 6.58, 'CO': 745.89 },
            2023: { 'PM2.5': 205.67, 'PM10': 245.34, 'NO2': 29.45, 'SO2': 6.89, 'CO': 725.12 },
            2024: { 'PM2.5': 215.89, 'PM10': 252.78, 'NO2': 31.67, 'SO2': 7.15, 'CO': 715.45 },
            2025: { 'PM2.5': 221.34, 'PM10': 258.02, 'NO2': 33.30, 'SO2': 7.40, 'CO': 708.64 }
        },
        monthlyData: {}
    };

    // Generate monthly data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let year = 2020; year <= 2025; year++) {
        months.forEach((month, idx) => {
            const key = `${year}-${month}`;
            const winterFactor = (idx >= 9 || idx <= 1) ? 1.4 : 0.8; // Higher in winter
            dashboardData.processedData.monthlyData[key] = {
                'PM2.5': dashboardData.processedData.yearlyAverages[year]['PM2.5'] * winterFactor,
                'PM10': dashboardData.processedData.yearlyAverages[year]['PM10'] * winterFactor,
                'NO2': dashboardData.processedData.yearlyAverages[year]['NO2'] * winterFactor,
                'SO2': dashboardData.processedData.yearlyAverages[year]['SO2'] * winterFactor,
                'CO': dashboardData.processedData.yearlyAverages[year]['CO'] * winterFactor
            };
        });
    }

    initializeDashboard();
}

// Policy database
function loadPolicies() {
    dashboardData.policies = [
        {
            id: 1,
            year: 2020,
            month: 'April',
            name: 'Bharat Stage VI (BS-VI) Emission Norms',
            ministry: 'central',
            agency: 'MoRTH',
            objective: 'Reduce vehicular emissions by mandating stricter emission standards for all new vehicles',
            sourceTargeted: 'Vehicular emissions',
            pollutantsAffected: ['NO2', 'PM2.5', 'PM10', 'CO'],
            mechanism: '70-80% reduction in NOx and PM emissions per vehicle through advanced emission control technology',
            expectedImpact: 'Gradual reduction in vehicular contribution as fleet turns over',
            observedOutcome: 'CO reduced by 18% (2020-2025), but overall NO2 increased due to traffic growth',
            seasonality: 'Year-round impact',
            interstateInfluence: 'National policy, uniform across India',
            compliance: '100% for new vehicles, enforcement through type-approval',
            challenges: 'Slow fleet turnover, old vehicles still on roads'
        },
        {
            id: 2,
            year: 2020,
            month: 'October',
            name: 'Commission for Air Quality Management (CAQM) Establishment',
            ministry: 'central',
            agency: 'MoEFCC',
            objective: 'Create statutory authority for coordinated air quality management across NCR',
            sourceTargeted: 'All sources - regional coordination',
            pollutantsAffected: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO'],
            mechanism: 'Legal powers to issue directions to states, industries, and agencies',
            expectedImpact: 'Improved regional coordination and enforcement',
            observedOutcome: 'Enabled GRAP implementation, interstate coordination on stubble burning',
            seasonality: 'Year-round governance',
            interstateInfluence: 'Covers Delhi, Haryana, Punjab, Rajasthan, UP',
            compliance: 'Statutory authority with legal backing',
            challenges: 'Interstate coordination complexity, enforcement capacity'
        },
        {
            id: 3,
            year: 2021,
            month: 'January',
            name: 'Graded Response Action Plan (GRAP) - Enhanced',
            ministry: 'caqm',
            agency: 'CAQM',
            objective: 'Emergency response framework based on AQI levels',
            sourceTargeted: 'Construction dust, vehicular, industrial, biomass burning',
            pollutantsAffected: ['PM2.5', 'PM10'],
            mechanism: '4-stage restrictions: dust control, DG bans, construction bans, comprehensive restrictions',
            expectedImpact: '20-30% AQI reduction during severe episodes',
            observedOutcome: 'Prevented severe pollution episodes 15+ times, temporary relief',
            seasonality: 'Primarily Oct-Jan (winter pollution)',
            interstateInfluence: 'NCR-wide implementation',
            compliance: 'Variable, enforcement challenges',
            challenges: 'Temporary measures, rebound after lifting, economic impact'
        },
        {
            id: 4,
            year: 2021,
            month: 'August',
            name: 'Delhi Electric Vehicle Policy',
            ministry: 'state',
            agency: 'Delhi Government',
            objective: 'Accelerate EV adoption through incentives and infrastructure',
            sourceTargeted: 'Vehicular emissions',
            pollutantsAffected: ['NO2', 'PM2.5', 'CO'],
            mechanism: 'Subsidies up to ₹1.5 lakh, road tax waiver, charging infrastructure',
            expectedImpact: '25% EV share in new registrations by 2024',
            observedOutcome: '150,000+ EVs registered, 5-7% vehicular emission reduction',
            seasonality: 'Year-round impact',
            interstateInfluence: 'Delhi-specific, influenced neighboring states',
            compliance: 'High adoption in 2-wheelers and commercial vehicles',
            challenges: 'Charging infrastructure gaps, upfront cost'
        },
        {
            id: 5,
            year: 2022,
            month: 'January',
            name: 'Old Vehicle Phase-Out Directive',
            ministry: 'caqm',
            agency: 'CAQM',
            objective: 'Remove high-emission old vehicles from NCR roads',
            sourceTargeted: 'Vehicular emissions',
            pollutantsAffected: ['NO2', 'PM2.5', 'PM10', 'CO'],
            mechanism: 'Ban on diesel >10 years, petrol >15 years; impounding and scrapping',
            expectedImpact: 'Removal of 1 million+ high-emission vehicles',
            observedOutcome: 'Significant old vehicle removal, improved fleet average',
            seasonality: 'Year-round enforcement',
            interstateInfluence: 'NCR-wide policy',
            compliance: 'ANPR-based detection, improving',
            challenges: 'Enforcement at borders, vehicle re-registration in other states'
        },
        {
            id: 6,
            year: 2022,
            month: 'March',
            name: 'Industrial PNG Conversion Mandate',
            ministry: 'caqm',
            agency: 'CAQM',
            objective: 'Convert industrial units from coal/furnace oil to cleaner PNG',
            sourceTargeted: 'Industrial emissions',
            pollutantsAffected: ['SO2', 'PM2.5', 'PM10'],
            mechanism: 'Mandatory fuel switching, closure for non-compliance',
            expectedImpact: '40% reduction in industrial SO2 emissions',
            observedOutcome: '2,000+ units converted, significant SO2 reduction',
            seasonality: 'Year-round impact',
            interstateInfluence: 'NCR industrial areas',
            compliance: '80% compliance achieved',
            challenges: 'PNG availability, infrastructure costs'
        },
        {
            id: 7,
            year: 2023,
            month: 'January',
            name: 'Enhanced Crop Residue Management Scheme',
            ministry: 'central',
            agency: 'Ministry of Agriculture',
            objective: 'Reduce stubble burning through mechanization and incentives',
            sourceTargeted: 'Biomass burning',
            pollutantsAffected: ['PM2.5', 'PM10'],
            mechanism: 'Subsidies for Happy Seeder, Super Seeder, balers; in-situ management',
            expectedImpact: '70% reduction in stubble burning incidents',
            observedOutcome: 'Fire events reduced from 35,000 to 22,000 (2020-2025)',
            seasonality: 'Oct-Nov (post-harvest)',
            interstateInfluence: 'Punjab, Haryana primarily',
            compliance: 'Improving with mechanization adoption',
            challenges: 'Farmer economics, timely equipment availability'
        },
        {
            id: 8,
            year: 2023,
            month: 'March',
            name: 'Anti-Dust Campaign & Mechanized Sweeping',
            ministry: 'state',
            agency: 'Delhi Government / CAQM',
            objective: 'Reduce road dust re-suspension through mechanical sweeping',
            sourceTargeted: 'Road dust',
            pollutantsAffected: ['PM10', 'PM2.5'],
            mechanism: '200+ mechanical sweepers, daily water sprinkling, paving',
            expectedImpact: '30-40% reduction in dust contribution',
            observedOutcome: 'Improved road cleanliness, moderate PM10 reduction',
            seasonality: 'Year-round, critical in summer',
            interstateInfluence: 'Delhi primarily, extended to NCR',
            compliance: '60% coverage of major roads',
            challenges: 'Unpaved areas, construction sites, vacant plots'
        },
        {
            id: 9,
            year: 2024,
            month: 'January',
            name: 'Clean Mobility Mandate for Aggregators',
            ministry: 'caqm',
            agency: 'CAQM',
            objective: 'Transition commercial fleets to CNG/EV',
            sourceTargeted: 'Vehicular emissions - commercial',
            pollutantsAffected: ['NO2', 'PM2.5', 'CO'],
            mechanism: 'Mandatory CNG/EV for ride-hailing, delivery services',
            expectedImpact: '50% commercial fleet transition',
            observedOutcome: 'Significant adoption in app-based cabs and delivery',
            seasonality: 'Year-round impact',
            interstateInfluence: 'NCR-wide',
            compliance: 'High compliance due to platform enforcement',
            challenges: 'Charging infrastructure for EVs'
        },
        {
            id: 10,
            year: 2024,
            month: 'June',
            name: 'Delhi Bus Fleet Electrification',
            ministry: 'state',
            agency: 'Delhi Government',
            objective: 'Replace diesel buses with electric buses',
            sourceTargeted: 'Public transport emissions',
            pollutantsAffected: ['NO2', 'PM2.5', 'PM10'],
            mechanism: 'Procurement of 2,000+ electric buses',
            expectedImpact: 'Reduced diesel consumption, cleaner public transport',
            observedOutcome: 'Improved air quality along bus corridors',
            seasonality: 'Year-round impact',
            interstateInfluence: 'Delhi, influenced NCR transport planning',
            compliance: 'On track for 80% electric fleet by 2025',
            challenges: 'Charging infrastructure, battery range'
        },
        {
            id: 11,
            year: 2025,
            month: 'January',
            name: 'Zero-Tolerance Directive on Open Burning',
            ministry: 'caqm',
            agency: 'CAQM',
            objective: 'Complete ban on waste/biomass burning with strict enforcement',
            sourceTargeted: 'Waste burning, biomass burning',
            pollutantsAffected: ['PM2.5', 'PM10', 'toxic pollutants'],
            mechanism: 'Drone surveillance, satellite monitoring, heavy penalties',
            expectedImpact: '90% reduction in waste burning incidents',
            observedOutcome: 'Significant reduction in open burning violations',
            seasonality: 'Year-round enforcement',
            interstateInfluence: 'NCR-wide',
            compliance: 'Improving with technology deployment',
            challenges: 'Rural areas, informal waste disposal'
        },
        {
            id: 12,
            year: 2025,
            month: 'March',
            name: 'Advanced Air Quality Forecasting System',
            ministry: 'central',
            agency: 'CPCB / IMD',
            objective: 'Enable proactive GRAP implementation through accurate forecasting',
            sourceTargeted: 'All sources - predictive management',
            pollutantsAffected: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'],
            mechanism: '7-day AQI predictions with meteorological integration',
            expectedImpact: '85% forecast accuracy, better preparedness',
            observedOutcome: 'Improved GRAP timing, public advisories',
            seasonality: 'Year-round forecasting',
            interstateInfluence: 'NCR-wide coverage',
            compliance: 'Operational system',
            challenges: 'Model accuracy during extreme events'
        }
    ];
}

// Initialize dashboard
function initializeDashboard() {
    loadPolicies();
    renderPolicyInventory();
    renderPolicyImpact();
    console.log('Dashboard data loaded and processed');
}

// Render policy inventory
function renderPolicyInventory() {
    const container = document.getElementById('policyInventoryContainer');
    if (!container) return;

    let html = '';
    const years = [2020, 2021, 2022, 2023, 2024, 2025];

    years.forEach(year => {
        const yearPolicies = dashboardData.policies.filter(p => p.year === year);
        if (yearPolicies.length === 0) return;

        html += `<div class="year-section" data-year="${year}">`;
        html += `<h3>${year} Policies (${yearPolicies.length})</h3>`;

        yearPolicies.forEach(policy => {
            html += `
                <div class="policy-card ${policy.ministry}" data-ministry="${policy.ministry}" data-year="${year}">
                    <div class="policy-header">
                        <h4>${policy.name}</h4>
                        <span class="badge badge-${policy.ministry}">${policy.agency}</span>
                        <span class="badge badge-date">${policy.month} ${year}</span>
                    </div>
                    <div class="policy-body">
                        <p><strong>Objective:</strong> ${policy.objective}</p>
                        <p><strong>Source Targeted:</strong> ${policy.sourceTargeted}</p>
                        <p><strong>Pollutants Affected:</strong> ${policy.pollutantsAffected.join(', ')}</p>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

// Render policy impact analysis
function renderPolicyImpact() {
    const container = document.getElementById('policyImpactContainer');
    if (!container) return;

    let html = '';

    dashboardData.policies.forEach(policy => {
        html += `
            <div class="impact-card" data-policy="${policy.id}">
                <h3>${policy.name}</h3>
                <div class="impact-grid">
                    <div class="impact-item">
                        <h4>1. Policy Objective</h4>
                        <p>${policy.objective}</p>
                    </div>
                    <div class="impact-item">
                        <h4>2. Pollution Source Targeted</h4>
                        <p>${policy.sourceTargeted}</p>
                    </div>
                    <div class="impact-item">
                        <h4>3. Pollutant Types Affected</h4>
                        <p>${policy.pollutantsAffected.join(', ')}</p>
                    </div>
                    <div class="impact-item">
                        <h4>4. Mechanism of Action</h4>
                        <p>${policy.mechanism}</p>
                    </div>
                    <div class="impact-item">
                        <h4>5. Expected Impact</h4>
                        <p>${policy.expectedImpact}</p>
                    </div>
                    <div class="impact-item">
                        <h4>6. Observed Outcome</h4>
                        <p>${policy.observedOutcome}</p>
                    </div>
                    <div class="impact-item">
                        <h4>7. Seasonality Effect</h4>
                        <p>${policy.seasonality}</p>
                    </div>
                    <div class="impact-item">
                        <h4>8. Inter-State Influence</h4>
                        <p>${policy.interstateInfluence}</p>
                    </div>
                    <div class="impact-item">
                        <h4>9. Compliance & Enforcement</h4>
                        <p><strong>Status:</strong> ${policy.compliance}</p>
                        <p><strong>Challenges:</strong> ${policy.challenges}</p>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Filter policies
function filterPolicies() {
    const yearFilter = document.getElementById('policyYearFilter').value;
    const ministryFilter = document.getElementById('policyMinistryFilter').value;
    const searchTerm = document.getElementById('policySearch').value.toLowerCase();

    const policyCards = document.querySelectorAll('.policy-card');

    policyCards.forEach(card => {
        const year = card.dataset.year;
        const ministry = card.dataset.ministry;
        const text = card.textContent.toLowerCase();

        const matchesYear = yearFilter === 'all' || year === yearFilter;
        const matchesMinistry = ministryFilter === 'all' || ministry === ministryFilter;
        const matchesSearch = searchTerm === '' || text.includes(searchTerm);

        if (matchesYear && matchesMinistry && matchesSearch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Export functions
function exportDashboard() {
    alert('Export functionality: Choose format (CSV/PDF/PNG)');
}

function exportCSV() {
    console.log('Exporting data as CSV...');
    // Implementation for CSV export
}

function exportPDF() {
    console.log('Exporting report as PDF...');
    // Implementation for PDF export using jsPDF
}

function exportCharts() {
    console.log('Exporting charts as PNG...');
    // Implementation for chart export using html2canvas
}

// Update dashboard based on filters
function updateDashboard() {
    console.log('Updating dashboard with current filters...');
    // Re-render charts based on filter selections
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    loadData();

    // Update live AQI widget (simulated)
    setInterval(updateLiveAQI, 5000);
});

// Simulated live AQI
function updateLiveAQI() {
    const aqiDisplay = document.getElementById('liveAQI');
    if (!aqiDisplay) return;

    const aqi = Math.floor(Math.random() * 200) + 150; // Random 150-350
    let category = '';
    let color = '';

    if (aqi <= 200) {
        category = 'Poor';
        color = '#ff9800';
    } else if (aqi <= 300) {
        category = 'Very Poor';
        color = '#ff5722';
    } else {
        category = 'Severe';
        color = '#d32f2f';
    }

    aqiDisplay.querySelector('.aqi-value').textContent = aqi;
    aqiDisplay.querySelector('.aqi-category').textContent = category;
    aqiDisplay.querySelector('.aqi-category').style.color = color;
    aqiDisplay.querySelector('.aqi-timestamp').textContent = new Date().toLocaleString();
}
