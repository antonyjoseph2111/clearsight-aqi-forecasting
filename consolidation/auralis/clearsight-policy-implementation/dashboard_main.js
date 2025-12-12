// Dashboard Main JavaScript - Interactive Features

// Global state
let currentFilters = {
    year: 'all',
    pollutant: 'all',
    source: 'all',
    district: 'all'
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function () {
    loadPolicyRegistry();
    loadPolicyImpactAnalysis();
    initializeNavigation();
    updateAQIWidget();
    loadAdditionalSections();
});

// Navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                // Add active class to clicked link
                this.classList.add('active');

                // Smooth scroll to section
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Update active link on scroll
    window.addEventListener('scroll', function () {
        let current = '';
        const sections = document.querySelectorAll('.dashboard-section');

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.pageYOffset >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

// Load Policy Registry
function loadPolicyRegistry() {
    const container = document.getElementById('policyRegistry');
    if (!container) return;

    let html = '';

    for (const [year, policies] of Object.entries(policyData)) {
        html += `
            <div class="policy-year-group" data-year="${year}">
                <h3 class="year-header">${year} Policies</h3>
                <div class="policy-cards-grid">
        `;

        policies.forEach(policy => {
            html += createPolicyCard(policy);
        });

        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Create Policy Card
function createPolicyCard(policy) {
    const typeClass = policy.type === 'central' ? 'policy-central' :
        policy.type === 'regional' ? 'policy-regional' : 'policy-state';

    return `
        <div class="policy-card ${typeClass}" data-policy-id="${policy.id}" data-year="${policy.date}" 
             data-pollutants="${policy.pollutants.join(',')}" data-source="${policy.targetSource}">
            <div class="policy-card-header">
                <h4>${policy.name}</h4>
                <div class="policy-badges">
                    <span class="badge badge-${policy.type}">${policy.ministry}</span>
                    <span class="badge badge-date">${policy.date}</span>
                </div>
            </div>
            <div class="policy-card-body">
                <div class="policy-detail">
                    <strong>Objective:</strong> ${policy.objective}
                </div>
                <div class="policy-detail">
                    <strong>Target Source:</strong> ${policy.targetSource}
                </div>
                <div class="policy-detail">
                    <strong>Pollutants:</strong> ${policy.pollutants.join(', ')}
                </div>
                <button class="btn-expand" onclick="expandPolicy('${policy.id}')">View Full Analysis →</button>
            </div>
        </div>
    `;
}

// Expand Policy Details
function expandPolicy(policyId) {
    // Find policy in data
    let policy = null;
    for (const policies of Object.values(policyData)) {
        policy = policies.find(p => p.id === policyId);
        if (policy) break;
    }

    if (!policy) return;

    // Create modal or expand in place
    const modal = document.createElement('div');
    modal.className = 'policy-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${policy.name}</h2>
                <button class="modal-close" onclick="this.closest('.policy-modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="policy-analysis-section">
                    <h3>1. Policy Objective</h3>
                    <p>${policy.objective}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>2. Pollution Source Targeted</h3>
                    <p>${policy.targetSource}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>3. Pollutant Types Affected</h3>
                    <p>${policy.pollutants.join(', ')}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>4. Mechanism of Action</h3>
                    <p>${policy.mechanism}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>5. Expected Impact</h3>
                    <p>${policy.expectedImpact}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>6. Observed Outcome</h3>
                    <p>${policy.observedOutcome}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>7. Seasonality Effect</h3>
                    <p>${policy.seasonality}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>8. Inter-State Influence</h3>
                    <p>${policy.interstate}</p>
                </div>
                <div class="policy-analysis-section">
                    <h3>9. Compliance & Enforcement</h3>
                    <p><strong>Compliance:</strong> ${policy.compliance}</p>
                    <p><strong>Challenges:</strong> ${policy.challenges}</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Load Policy Impact Analysis
function loadPolicyImpactAnalysis() {
    const container = document.getElementById('policyImpactContainer');
    if (!container) return;

    let html = '<div class="impact-cards-grid">';

    // Sample impact cards for key policies
    const keyPolicies = ['bs6-2020', 'grap-2021', 'png-conversion-2022', 'stubble-mgmt-2023', 'clean-mobility-2024'];

    for (const policyId of keyPolicies) {
        let policy = null;
        for (const policies of Object.values(policyData)) {
            policy = policies.find(p => p.id === policyId);
            if (policy) break;
        }

        if (policy) {
            html += `
                <div class="impact-card">
                    <h4>${policy.name}</h4>
                    <div class="impact-metrics">
                        <div class="metric">
                            <span class="metric-label">Expected Impact</span>
                            <span class="metric-value">${policy.expectedImpact}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Observed Outcome</span>
                            <span class="metric-value">${policy.observedOutcome}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    html += '</div>';
    container.innerHTML = html;
}

// Filter Functions
function applyFilters() {
    currentFilters.year = document.getElementById('yearFilter').value;
    currentFilters.pollutant = document.getElementById('pollutantFilter').value;
    currentFilters.source = document.getElementById('sourceFilter').value;
    currentFilters.district = document.getElementById('districtFilter').value;

    filterPolicies();
}

function filterPolicies() {
    const policyCards = document.querySelectorAll('.policy-card');

    policyCards.forEach(card => {
        let show = true;

        // Year filter
        if (currentFilters.year !== 'all') {
            const cardYear = card.dataset.year;
            if (!cardYear || !cardYear.includes(currentFilters.year)) {
                show = false;
            }
        }

        // Pollutant filter
        if (currentFilters.pollutant !== 'all') {
            const cardPollutants = card.dataset.pollutants || '';
            if (!cardPollutants.includes(currentFilters.pollutant)) {
                show = false;
            }
        }

        // Source filter
        if (currentFilters.source !== 'all') {
            const cardSource = card.dataset.source || '';
            if (!cardSource.toLowerCase().includes(currentFilters.source.toLowerCase())) {
                show = false;
            }
        }

        card.style.display = show ? 'block' : 'none';
    });
}

function resetFilters() {
    document.getElementById('yearFilter').value = 'all';
    document.getElementById('pollutantFilter').value = 'all';
    document.getElementById('sourceFilter').value = 'all';
    document.getElementById('districtFilter').value = 'all';

    currentFilters = {
        year: 'all',
        pollutant: 'all',
        source: 'all',
        district: 'all'
    };

    filterPolicies();
}

// Search Policies
function searchPolicies() {
    const searchTerm = document.getElementById('policySearch').value.toLowerCase();
    const policyCards = document.querySelectorAll('.policy-card');

    policyCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Toggle Control Panel
function togglePanel() {
    const panel = document.querySelector('.panel-content');
    const toggleBtn = document.querySelector('.panel-toggle');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        toggleBtn.textContent = '−';
    } else {
        panel.style.display = 'none';
        toggleBtn.textContent = '+';
    }
}

// Export Report
function exportReport() {
    // Create a comprehensive report
    const reportContent = generateReportContent();

    // Create a blob and download
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delhi-NCR-AQ-Policy-Report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateReportContent() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Delhi-NCR Air Quality Policy Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #003d82; }
                h2 { color: #0066cc; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #003d82; color: white; }
            </style>
        </head>
        <body>
            <h1>Delhi-NCR Air Quality Policy Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Filters Applied:</strong> Year: ${currentFilters.year}, Pollutant: ${currentFilters.pollutant}, Source: ${currentFilters.source}</p>
            
            <h2>Policy Summary</h2>
            <p>Total policies documented: ${Object.values(policyData).flat().length}</p>
            
            <h2>Pollutant Trends</h2>
            <table>
                <tr>
                    <th>Pollutant</th>
                    <th>2020</th>
                    <th>2025</th>
                    <th>Change</th>
                </tr>
                <tr>
                    <td>PM2.5</td>
                    <td>160 µg/m³</td>
                    <td>221 µg/m³</td>
                    <td>+38%</td>
                </tr>
                <tr>
                    <td>PM10</td>
                    <td>215 µg/m³</td>
                    <td>258 µg/m³</td>
                    <td>+20%</td>
                </tr>
                <tr>
                    <td>CO</td>
                    <td>865 µg/m³</td>
                    <td>709 µg/m³</td>
                    <td>-18%</td>
                </tr>
            </table>
            
            <p><em>This is an automated export from the Delhi-NCR Air Quality Policy Dashboard.</em></p>
        </body>
        </html>
    `;
}

// Update AQI Widget
function updateAQIWidget() {
    // Simulate real-time AQI (in production, this would fetch from API)
    const aqiValue = 245;
    const aqiCategory = getAQICategory(aqiValue);

    document.getElementById('currentAQI').textContent = aqiValue;
    const categoryElement = document.querySelector('.aqi-category');
    categoryElement.textContent = aqiCategory.name;
    categoryElement.className = `aqi-category ${aqiCategory.class}`;
}

function getAQICategory(aqi) {
    if (aqi <= 50) return { name: 'Good', class: 'good' };
    if (aqi <= 100) return { name: 'Satisfactory', class: 'satisfactory' };
    if (aqi <= 200) return { name: 'Moderate', class: 'moderate' };
    if (aqi <= 300) return { name: 'Poor', class: 'poor' };
    if (aqi <= 400) return { name: 'Very Poor', class: 'very-poor' };
    return { name: 'Severe', class: 'severe' };
}

// Load Additional Sections
function loadAdditionalSections() {
    const container = document.getElementById('additionalSections');
    if (!container) return;

    container.innerHTML = `
        <!-- SECTION 7: COMPLIANCE & ENFORCEMENT -->
        <section id="section-compliance" class="dashboard-section">
            <div class="section-header">
                <h2>7. Compliance, Violations & Enforcement</h2>
                <p class="section-subtitle">Monitoring and enforcement mechanisms</p>
            </div>
            
            <div class="compliance-content">
                <div class="compliance-card">
                    <h3>Penalty Systems</h3>
                    <ul>
                        <li><strong>Construction Violations:</strong> ₹50,000 - ₹5 lakh per site</li>
                        <li><strong>Industrial Non-Compliance:</strong> Closure orders + ₹1-10 lakh penalties</li>
                        <li><strong>Vehicle Violations:</strong> ₹20,000 for old vehicle operation in NCR</li>
                        <li><strong>Waste Burning:</strong> ₹5,000 - ₹50,000 per incident</li>
                        <li><strong>Stubble Burning:</strong> ₹2,500 - ₹15,000 per acre</li>
                    </ul>
                </div>
                
                <div class="compliance-card">
                    <h3>Surveillance Mechanisms</h3>
                    <ul>
                        <li><strong>Satellite Detection:</strong> NASA FIRMS for fire detection, Sentinel-5P for emissions</li>
                        <li><strong>Drone Surveillance:</strong> Construction site monitoring, waste burning detection</li>
                        <li><strong>CCTV Networks:</strong> Traffic monitoring, waste burning alerts</li>
                        <li><strong>GPS Tracking:</strong> Commercial vehicle movement monitoring</li>
                        <li><strong>Automated Systems:</strong> PUC testing, number plate recognition</li>
                    </ul>
                </div>
                
                <div class="compliance-card full-width">
                    <h3>Enforcement Statistics (2020-2025)</h3>
                    <table class="impact-table">
                        <thead>
                            <tr>
                                <th>Violation Type</th>
                                <th>Cases Detected</th>
                                <th>Penalties Imposed</th>
                                <th>Compliance Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Construction Dust Violations</td>
                                <td>12,500</td>
                                <td>₹185 crore</td>
                                <td>60% improvement</td>
                            </tr>
                            <tr>
                                <td>Old Vehicle Operations</td>
                                <td>45,000</td>
                                <td>₹90 crore</td>
                                <td>800,000 vehicles removed</td>
                            </tr>
                            <tr>
                                <td>Industrial Non-Compliance</td>
                                <td>850</td>
                                <td>₹125 crore + closures</td>
                                <td>2,000+ units converted</td>
                            </tr>
                            <tr>
                                <td>Stubble Burning</td>
                                <td>150,000 (2020) → 45,000 (2025)</td>
                                <td>₹45 crore</td>
                                <td>70% reduction</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- SECTION 8: CROSS-STATE POLLUTION -->
        <section id="section-crossstate" class="dashboard-section">
            <div class="section-header">
                <h2>8. Cross-State Pollution Transfer Analysis</h2>
                <p class="section-subtitle">Regional pollution dynamics and transboundary impacts</p>
            </div>
            
            <div class="crossstate-content">
                <div class="transfer-card">
                    <h3>Punjab → Delhi: Stubble Burning Transport</h3>
                    <p><strong>Mechanism:</strong> Northwest winds during Oct-Nov transport PM2.5 from rice stubble burning</p>
                    <p><strong>Contribution:</strong> 25-40% of Delhi's PM2.5 during peak season</p>
                    <p><strong>Transport Time:</strong> 12-24 hours</p>
                    <p><strong>Policy Response:</strong> CAQM-coordinated stubble management, satellite monitoring, mechanization subsidies</p>
                    <p><strong>Outcome:</strong> 70% reduction in fire incidents (150,000 in 2020 → 45,000 in 2025)</p>
                </div>
                
                <div class="transfer-card">
                    <h3>Haryana Industrial Plumes</h3>
                    <p><strong>Sources:</strong> Industrial clusters in Faridabad, Gurugram, Sonipat, Panipat</p>
                    <p><strong>Pollutants:</strong> SO₂, NOx, PM10 from industries, brick kilns, power plants</p>
                    <p><strong>Contribution:</strong> 15-20% of regional pollution load</p>
                    <p><strong>Policy Response:</strong> PNG conversion mandate, brick kiln modernization, emission norms</p>
                    <p><strong>Outcome:</strong> 2,000+ industrial units converted, SO₂ contribution reduced from 35% to 21%</p>
                </div>
                
                <div class="transfer-card">
                    <h3>UP Freight & Kiln Pollution</h3>
                    <p><strong>Sources:</strong> Heavy freight traffic on NH-24, NH-9; brick kilns in Ghaziabad, Gautam Buddha Nagar</p>
                    <p><strong>Pollutants:</strong> NOx, PM from diesel trucks; PM, SO₂ from kilns</p>
                    <p><strong>Contribution:</strong> 10-15% of NCR pollution</p>
                    <p><strong>Policy Response:</strong> Truck routing restrictions, BS-VI compliance, kiln technology upgrades</p>
                    <p><strong>Outcome:</strong> Reduced truck entry during GRAP, cleaner kiln technologies adopted</p>
                </div>
                
                <div class="transfer-card full-width">
                    <h3>Wind Corridor Effects & NCR Airshed Behavior</h3>
                    <p>Delhi-NCR lies in a complex airshed influenced by multiple wind patterns:</p>
                    <ul>
                        <li><strong>Northwest Corridor (Oct-Nov):</strong> Brings stubble burning emissions from Punjab/Haryana. Low wind speeds during winter trap pollutants.</li>
                        <li><strong>West-Northwest (Dec-Jan):</strong> Industrial emissions from Rajasthan's brick kilns and power plants. Temperature inversions prevent vertical dispersion.</li>
                        <li><strong>Southwest (Apr-Jun):</strong> Dust storms from Thar Desert contribute to PM10 spikes. Natural source with limited policy control.</li>
                        <li><strong>Local Recirculation:</strong> During calm conditions, locally emitted pollutants (vehicles, dust, waste burning) accumulate without dispersion.</li>
                    </ul>
                    <p><strong>Airshed Modeling Insights:</strong> 30-40% of Delhi's pollution originates from outside NCR, validating need for regional coordination through CAQM.</p>
                </div>
            </div>
        </section>

        <!-- SECTION 9: CONCLUSION & ROADMAP -->
        <section id="section-conclusion" class="dashboard-section">
            <div class="section-header">
                <h2>9. Conclusion & Policy Roadmap (2026-2030)</h2>
                <p class="section-subtitle">Assessment of 2020-2025 interventions and future directions</p>
            </div>
            
            <div class="conclusion-content">
                <div class="conclusion-card success">
                    <h3>✓ What Worked</h3>
                    <ul>
                        <li><strong>BS-VI Implementation:</strong> 100% compliance for new vehicles, CO emissions reduced 18%</li>
                        <li><strong>Stubble Burning Control:</strong> 70% reduction in fire incidents through mechanization and enforcement</li>
                        <li><strong>Industrial Fuel Conversion:</strong> 2,000+ units shifted to PNG, industrial SO₂ contribution reduced 40%</li>
                        <li><strong>Institutional Framework:</strong> CAQM provided statutory authority for regional coordination</li>
                        <li><strong>Monitoring Expansion:</strong> Network doubled from 38 to 85+ stations, improved data coverage</li>
                        <li><strong>EV Adoption:</strong> 150,000+ EVs registered, Delhi became largest EV market</li>
                        <li><strong>Emergency Response:</strong> GRAP prevented catastrophic pollution episodes 15+ times</li>
                    </ul>
                </div>
                
                <div class="conclusion-card failure">
                    <h3>✗ What Failed / Fell Short</h3>
                    <ul>
                        <li><strong>PM Levels:</strong> PM2.5 increased 38%, PM10 increased 20% despite policies</li>
                        <li><strong>NO₂ Surge:</strong> 81% increase due to vehicular activity rebound overwhelming per-vehicle reductions</li>
                        <li><strong>NCAP Targets:</strong> 20-30% PM reduction target not met; actual increases observed</li>
                        <li><strong>Dust Control:</strong> Remains largest contributor (35%) despite mechanized sweeping</li>
                        <li><strong>Enforcement Gaps:</strong> Construction dust and waste burning controls inconsistent</li>
                        <li><strong>Baseline Pollution:</strong> GRAP addresses episodes but not year-round baseline levels</li>
                        <li><strong>Fleet Growth:</strong> New vehicle additions offset emission standard benefits</li>
                    </ul>
                </div>
                
                <div class="conclusion-card reform">
                    <h3>🔧 What Needs Reform</h3>
                    <ul>
                        <li><strong>Dust Management:</strong> Mandatory real-time monitoring at all sites >1000 sqm, automated enforcement</li>
                        <li><strong>Vehicle Population Control:</strong> Congestion pricing, parking restrictions, accelerated scrappage</li>
                        <li><strong>Regional Coordination:</strong> Harmonized emission standards, joint enforcement, shared monitoring</li>
                        <li><strong>Waste Management:</strong> 100% door-to-door collection, waste-to-energy plants, landfill remediation</li>
                        <li><strong>Enforcement Technology:</strong> AI-based surveillance, automated penalty systems, real-time compliance tracking</li>
                        <li><strong>Economic Instruments:</strong> Pollution tax, emissions trading, green bonds for AQ projects</li>
                    </ul>
                </div>
                
                <div class="conclusion-card roadmap full-width">
                    <h3>🚀 Future Policy & AI Integration Roadmap (2026-2030)</h3>
                    
                    <h4>2026-2027: Enhanced Enforcement & Technology</h4>
                    <ul>
                        <li>Deploy AI-based construction site monitoring with automated violation detection</li>
                        <li>Implement hyperlocal air quality monitoring (1 km resolution) across NCR</li>
                        <li>Launch emissions trading system for industries</li>
                        <li>Mandate 50% EV share for all commercial fleets</li>
                        <li>Establish NCR-wide real-time source apportionment network</li>
                    </ul>
                    
                    <h4>2028-2029: Structural Transformation</h4>
                    <ul>
                        <li>Achieve 30% EV share in new vehicle registrations</li>
                        <li>Complete metro network expansion to reduce private vehicle dependency</li>
                        <li>Implement congestion pricing in central Delhi</li>
                        <li>Phase out all coal-based industries within 50 km of Delhi</li>
                        <li>Deploy AI-powered 10-day AQI forecasting with 90% accuracy</li>
                        <li>Establish regional air quality fund (₹5,000 crore) for mitigation projects</li>
                    </ul>
                    
                    <h4>2030: Sustainable Air Quality Management</h4>
                    <ul>
                        <li>Target: Annual average PM2.5 < 40 µg/m³ (WHO Interim Target-3)</li>
                        <li>50% EV share in total vehicle fleet</li>
                        <li>100% renewable energy for public transport</li>
                        <li>Zero waste-to-landfill through circular economy</li>
                        <li>AI-integrated dynamic policy response system</li>
                        <li>Health surveillance integration for pollution-health impact tracking</li>
                    </ul>
                    
                    <h4>AI Integration Priorities</h4>
                    <ul>
                        <li><strong>Predictive Modeling:</strong> Machine learning for 10-day AQI forecasts with scenario analysis</li>
                        <li><strong>Source Attribution:</strong> Real-time AI-based source apportionment for dynamic policy targeting</li>
                        <li><strong>Enforcement Automation:</strong> Computer vision for construction dust, waste burning, vehicle violations</li>
                        <li><strong>Traffic Optimization:</strong> AI-powered signal management to reduce congestion and emissions</li>
                        <li><strong>Policy Simulation:</strong> Agent-based models to test policy scenarios before implementation</li>
                        <li><strong>Public Engagement:</strong> AI chatbots for citizen reporting and real-time advisories</li>
                    </ul>
                </div>
                
                <div class="final-assessment">
                    <h3>Final Assessment</h3>
                    <p>The 2020-2025 period established a comprehensive policy framework for air quality management in Delhi-NCR. While ambient pollution levels have not declined as desired, the policies have prevented further deterioration despite rapid urbanization and economic growth post-COVID.</p>
                    <p><strong>Key Achievement:</strong> Institutional mechanisms (CAQM), emission standards (BS-VI), and emergency protocols (GRAP) provide a strong foundation for future improvements.</p>
                    <p><strong>Critical Gap:</strong> Policies successfully addressed specific sources (CO from vehicles, stubble burning) but were overwhelmed by overall activity growth, enforcement challenges, and meteorological constraints.</p>
                    <p><strong>Path Forward:</strong> Success requires sustained implementation, enhanced enforcement through technology, economic instruments to internalize pollution costs, and continued multi-agency coordination. The 2026-2030 roadmap focuses on structural transformation rather than incremental improvements.</p>
                    <p class="final-note"><strong>Recommendation:</strong> Shift from reactive (GRAP) to preventive strategies. Invest in baseline reduction through fleet electrification, dust control automation, and regional industrial transformation. Integrate AI for real-time policy optimization.</p>
                </div>
            </div>
        </section>
    `;
}

// Add CSS for additional elements
const additionalStyles = `
    <style>
        .policy-year-group {
            margin-bottom: 40px;
        }
        
        .year-header {
            background: linear-gradient(135deg, #003d82, #0066cc);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .policy-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 20px;
        }
        
        .policy-card {
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s;
        }
        
        .policy-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }
        
        .policy-central { border-left: 4px solid #1976d2; }
        .policy-regional { border-left: 4px solid #388e3c; }
        .policy-state { border-left: 4px solid #f57c00; }
        
        .policy-card-header h4 {
            color: #003d82;
            margin-bottom: 12px;
            font-size: 1.1rem;
        }
        
        .policy-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }
        
        .badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .badge-central { background: #1976d2; color: white; }
        .badge-regional { background: #388e3c; color: white; }
        .badge-state { background: #f57c00; color: white; }
        .badge-date { background: #ff6b35; color: white; }
        
        .policy-detail {
            margin-bottom: 10px;
            font-size: 0.9rem;
            line-height: 1.6;
        }
        
        .btn-expand {
            background: #003d82;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 10px;
            transition: background 0.3s;
        }
        
        .btn-expand:hover {
            background: #0066cc;
        }
        
        .policy-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .modal-header {
            background: linear-gradient(135deg, #003d82, #0066cc);
            color: white;
            padding: 25px;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 2rem;
            cursor: pointer;
            width: 40px;
            height: 40px;
        }
        
        .modal-body {
            padding: 30px;
        }
        
        .policy-analysis-section {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .policy-analysis-section h3 {
            color: #003d82;
            margin-bottom: 12px;
        }
        
        .impact-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
        }
        
        .impact-card {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #ff6b35;
        }
        
        .impact-metrics {
            margin-top: 15px;
        }
        
        .metric {
            display: flex;
            flex-direction: column;
            margin-bottom: 15px;
        }
        
        .metric-label {
            font-weight: 600;
            color: #003d82;
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 0.95rem;
            line-height: 1.6;
        }
        
        .compliance-content, .crossstate-content, .conclusion-content {
            display: flex;
            flex-direction: column;
            gap: 25px;
        }
        
        .compliance-card, .transfer-card, .conclusion-card {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #003d82;
        }
        
        .compliance-card.full-width, .transfer-card.full-width, .conclusion-card.full-width {
            width: 100%;
        }
        
        .conclusion-card.success { border-left-color: #2e7d32; }
        .conclusion-card.failure { border-left-color: #d32f2f; }
        .conclusion-card.reform { border-left-color: #ff9800; }
        .conclusion-card.roadmap { border-left-color: #1976d2; }
        
        .final-assessment {
            background: linear-gradient(135deg, rgba(0,61,130,0.1), rgba(0,102,204,0.05));
            padding: 30px;
            border-radius: 8px;
            border: 2px solid #003d82;
        }
        
        .final-note {
            background: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ff9800;
            border-radius: 4px;
            margin-top: 20px;
            font-weight: 600;
        }
    </style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);
