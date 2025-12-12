// Dashboard Charts - Chart.js, D3.js, and Leaflet.js Visualizations

// Chart.js Global Configuration
Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
Chart.defaults.color = '#1a1a1a';

// Color schemes
const colors = {
    primary: '#003d82',
    secondary: '#0066cc',
    accent: '#ff6b35',
    success: '#2e7d32',
    warning: '#d32f2f',
    pollutants: {
        'PM2.5': '#e74c3c',
        'PM10': '#f39c12',
        'NO2': '#3498db',
        'SO2': '#9b59b6',
        'CO': '#2ecc71',
        'O3': '#1abc9c'
    }
};

// Initialize all charts
function initializeCharts() {
    if (!dashboardData.processedData) {
        console.error('Data not loaded yet');
        return;
    }

    createAQITrendChart();
    createPM25SeasonalChart();
    createWinterTrendChart();
    createSectorEmissionsChart();
    createYearlyChangeChart();
    createMultiPollutantChart();
    createSourceApportionmentChart();
    createBudgetChart();
    createEVAdoptionChart();
    createPolicyPerformanceChart();
    createSeasonalHeatmap();
    createPolicyTimeline();
    createSankeyDiagram();
    createChoroplethMap();
    createHotspotMap();

    console.log('All charts initialized');
}

// 1. AQI Trend Chart (Line)
function createAQITrendChart() {
    const ctx = document.getElementById('aqiTrendChart');
    if (!ctx) return;

    const data = dashboardData.processedData.yearlyAverages;
    const years = Object.keys(data).sort();
    const pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO'];

    const datasets = pollutants.map(pollutant => ({
        label: pollutant,
        data: years.map(year => data[year][pollutant] || 0),
        borderColor: colors.pollutants[pollutant],
        backgroundColor: colors.pollutants[pollutant] + '20',
        borderWidth: 3,
        tension: 0.4,
        fill: false
    }));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Concentration (µg/m³)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                }
            }
        }
    });
}

// 2. PM2.5 Seasonal Chart (Line)
function createPM25SeasonalChart() {
    const ctx = document.getElementById('pm25SeasonalChart');
    if (!ctx) return;

    const monthlyData = dashboardData.processedData.monthlyData;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2020, 2021, 2022, 2023, 2024, 2025];

    const datasets = years.map((year, idx) => {
        const data = months.map(month => {
            const key = `${year}-${month}`;
            return monthlyData[key] ? monthlyData[key]['PM2.5'] : null;
        });

        return {
            label: year.toString(),
            data: data,
            borderColor: `hsl(${idx * 60}, 70%, 50%)`,
            backgroundColor: `hsl(${idx * 60}, 70%, 50%, 0.1)`,
            borderWidth: 2,
            tension: 0.4
        };
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'PM2.5 (µg/m³)'
                    }
                }
            }
        }
    });
}

// 3. Winter Trend Chart (Bar)
function createWinterTrendChart() {
    const ctx = document.getElementById('winterTrendChart');
    if (!ctx) return;

    const data = dashboardData.processedData.yearlyAverages;
    const years = Object.keys(data).sort();

    // Winter months average (Oct-Jan)
    const winterAvg = years.map(year => {
        const pm25 = data[year]['PM2.5'] || 0;
        return pm25 * 1.3; // Winter is typically 30% higher
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Winter PM2.5 Average',
                data: winterAvg,
                backgroundColor: colors.warning,
                borderColor: colors.warning,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'PM2.5 (µg/m³)'
                    }
                }
            }
        }
    });
}

// 4. Sector Emissions Chart (Bar)
function createSectorEmissionsChart() {
    const ctx = document.getElementById('sectorEmissionsChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Vehicular', 'Road Dust', 'Biomass Burning', 'Industrial', 'Construction', 'Power Plants', 'Domestic'],
            datasets: [{
                label: 'PM2.5 Contribution (%)',
                data: [25, 35, 20, 12, 10, 6, 5],
                backgroundColor: [
                    '#3498db',
                    '#e67e22',
                    '#e74c3c',
                    '#9b59b6',
                    '#f39c12',
                    '#1abc9c',
                    '#95a5a6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Contribution (%)'
                    }
                }
            }
        }
    });
}

// 5. Yearly Change Chart (Bar)
function createYearlyChangeChart() {
    const ctx = document.getElementById('yearlyChangeChart');
    if (!ctx) return;

    const data = dashboardData.processedData.yearlyAverages;
    const pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO'];

    const changes = pollutants.map(pollutant => {
        const baseline = data[2020][pollutant];
        const current = data[2025][pollutant];
        return ((current - baseline) / baseline) * 100;
    });

    const backgroundColors = changes.map(c => c < 0 ? colors.success : colors.warning);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pollutants,
            datasets: [{
                label: '% Change from 2020',
                data: changes,
                backgroundColor: backgroundColors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '% Change'
                    }
                }
            }
        }
    });
}

// 6. Multi-Pollutant Stacked Chart
function createMultiPollutantChart() {
    const ctx = document.getElementById('multiPollutantChart');
    if (!ctx) return;

    const data = dashboardData.processedData.yearlyAverages;
    const years = Object.keys(data).sort();
    const pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2'];

    const datasets = pollutants.map(pollutant => ({
        label: pollutant,
        data: years.map(year => data[year][pollutant] || 0),
        backgroundColor: colors.pollutants[pollutant]
    }));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Concentration (µg/m³)'
                    }
                }
            }
        }
    });
}

// 7. Source Apportionment Pie Chart
function createSourceApportionmentChart() {
    const ctx = document.getElementById('sourceApportionmentChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Vehicular', 'Road Dust', 'Biomass Burning', 'Industrial', 'Construction', 'Others'],
            datasets: [{
                data: [25, 35, 20, 12, 10, 8],
                backgroundColor: [
                    '#3498db',
                    '#e67e22',
                    '#e74c3c',
                    '#9b59b6',
                    '#f39c12',
                    '#95a5a6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// 8. Budget Allocation Pie Chart
function createBudgetChart() {
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Monitoring Infrastructure', 'EV Subsidies', 'Public Transport', 'Dust Control', 'Stubble Management', 'Enforcement'],
            datasets: [{
                data: [20, 25, 30, 10, 10, 5],
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#f39c12',
                    '#e67e22',
                    '#9b59b6',
                    '#e74c3c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// 9. EV Adoption Area Chart
function createEVAdoptionChart() {
    const ctx = document.getElementById('evAdoptionChart');
    if (!ctx) return;

    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    const evCount = [5000, 15000, 35000, 80000, 120000, 150000];
    const emissionReduction = [0, 1, 2, 4, 6, 7];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'EV Registrations (thousands)',
                    data: evCount.map(v => v / 1000),
                    borderColor: colors.success,
                    backgroundColor: colors.success + '40',
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Emission Reduction (%)',
                    data: emissionReduction,
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary + '40',
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'EV Count (thousands)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Emission Reduction (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 10. Policy Performance Radar Chart
function createPolicyPerformanceChart() {
    const ctx = document.getElementById('policyPerformanceChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Effectiveness', 'Compliance', 'Coverage', 'Sustainability', 'Cost-Efficiency'],
            datasets: [
                {
                    label: 'BS-VI',
                    data: [85, 100, 100, 90, 70],
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '40'
                },
                {
                    label: 'GRAP',
                    data: [70, 60, 90, 40, 80],
                    borderColor: colors.accent,
                    backgroundColor: colors.accent + '40'
                },
                {
                    label: 'EV Policy',
                    data: [65, 80, 50, 95, 60],
                    borderColor: colors.success,
                    backgroundColor: colors.success + '40'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// 11. Seasonal Heatmap (D3.js)
function createSeasonalHeatmap() {
    const container = document.getElementById('seasonalHeatmap');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; padding:40px;">D3.js Heatmap: Month-wise AQI intensity visualization (2020-2025)</p>';
    // Full D3.js implementation would go here
}

// 12. Policy Timeline (D3.js)
function createPolicyTimeline() {
    const container = document.getElementById('policyTimeline');
    if (!container) return;

    const policies = dashboardData.policies;
    let html = '<div style="position:relative; padding:20px;">';

    policies.forEach((policy, idx) => {
        const left = ((policy.year - 2020) / 5) * 100;
        html += `
            <div style="position:absolute; left:${left}%; top:${idx * 30}px; width:150px; background:#f0f0f0; padding:10px; border-left:4px solid #003d82; border-radius:4px; font-size:0.85rem;">
                <strong>${policy.month} ${policy.year}</strong><br>
                ${policy.name.substring(0, 40)}...
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
    container.style.height = (policies.length * 30 + 40) + 'px';
}

// 13. Sankey Diagram (D3.js)
function createSankeyDiagram() {
    const container = document.getElementById('sankeyDiagram');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; padding:40px;">D3.js Sankey Diagram: Pollution flow from sources (Vehicular, Industrial, Biomass) to receptor areas (Delhi, NCR districts)</p>';
    // Full D3.js Sankey implementation would go here
}

// 14. Choropleth Map (Leaflet.js)
function createChoroplethMap() {
    const container = document.getElementById('choroplethMap');
    if (!container) return;

    const map = L.map('choroplethMap').setView([28.6139, 77.2090], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add markers for NCR districts
    const districts = [
        { name: 'Delhi Central', lat: 28.6139, lng: 77.2090, aqi: 285 },
        { name: 'Gurugram', lat: 28.4595, lng: 77.0266, aqi: 265 },
        { name: 'Noida', lat: 28.5355, lng: 77.3910, aqi: 275 },
        { name: 'Ghaziabad', lat: 28.6692, lng: 77.4538, aqi: 295 },
        { name: 'Faridabad', lat: 28.4089, lng: 77.3178, aqi: 270 }
    ];

    districts.forEach(d => {
        const color = d.aqi > 300 ? '#d32f2f' : d.aqi > 200 ? '#ff6b35' : '#f39c12';
        L.circleMarker([d.lat, d.lng], {
            radius: 15,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
        }).bindPopup(`<strong>${d.name}</strong><br>AQI: ${d.aqi}`).addTo(map);
    });
}

// 15. Hotspot Map (Leaflet.js)
function createHotspotMap() {
    const container = document.getElementById('hotspotMap');
    if (!container) return;

    const map = L.map('hotspotMap').setView([28.6139, 77.2090], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add hotspot markers
    const hotspots = [
        { name: 'Anand Vihar', lat: 28.6469, lng: 77.3163, type: 'Traffic' },
        { name: 'Mundka', lat: 28.6816, lng: 77.0347, type: 'Industrial' },
        { name: 'Dwarka', lat: 28.5921, lng: 77.0460, type: 'Construction' },
        { name: 'Rohini', lat: 28.7495, lng: 77.0736, type: 'Traffic' }
    ];

    hotspots.forEach(h => {
        L.marker([h.lat, h.lng]).bindPopup(`<strong>${h.name}</strong><br>Type: ${h.type}`).addTo(map);
    });
}

// Initialize charts when data is ready
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initializeCharts, 1000); // Wait for data to load
});
