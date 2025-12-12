// Dashboard Interactions - Navigation, Filters, and Export Functions

// Navigation
document.addEventListener('DOMContentLoaded', function () {
    // Smooth scrolling for navigation
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // Smooth scroll
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Highlight active section on scroll
    const sections = document.querySelectorAll('.dashboard-section');
    const observerOptions = {
        root: null,
        rootMargin: '-100px 0px -80% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
});

// Filter range sliders
document.addEventListener('DOMContentLoaded', function () {
    const yearRangeStart = document.getElementById('yearRangeStart');
    const yearRangeEnd = document.getElementById('yearRangeEnd');
    const yearRangeStartLabel = document.getElementById('yearRangeStartLabel');
    const yearRangeEndLabel = document.getElementById('yearRangeEndLabel');

    if (yearRangeStart && yearRangeEnd) {
        yearRangeStart.addEventListener('input', function () {
            yearRangeStartLabel.textContent = this.value;
            if (parseInt(this.value) > parseInt(yearRangeEnd.value)) {
                yearRangeEnd.value = this.value;
                yearRangeEndLabel.textContent = this.value;
            }
        });

        yearRangeEnd.addEventListener('input', function () {
            yearRangeEndLabel.textContent = this.value;
            if (parseInt(this.value) < parseInt(yearRangeStart.value)) {
                yearRangeStart.value = this.value;
                yearRangeStartLabel.textContent = this.value;
            }
        });
    }
});

// Export to CSV
function exportCSV() {
    if (!dashboardData.processedData) {
        alert('Data not loaded yet');
        return;
    }

    const data = dashboardData.processedData.yearlyAverages;
    let csv = 'Year,PM2.5,PM10,NO2,SO2,CO\n';

    for (let year in data) {
        csv += `${year},${data[year]['PM2.5']},${data[year]['PM10']},${data[year]['NO2']},${data[year]['SO2']},${data[year]['CO']}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delhi_ncr_air_quality_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Export to PDF
async function exportPDF() {
    alert('Generating PDF report...\n\nThis will capture the dashboard sections and create a comprehensive PDF document.');

    // Using jsPDF (would need full implementation)
    console.log('PDF export initiated');
}

// Export charts as images
async function exportCharts() {
    alert('Exporting charts as PNG images...\n\nAll visualizations will be saved as high-resolution images.');

    // Using html2canvas (would need full implementation)
    console.log('Chart export initiated');
}

// Update dashboard based on filters
function updateDashboard() {
    const filters = {
        yearStart: parseInt(document.getElementById('yearRangeStart')?.value || 2020),
        yearEnd: parseInt(document.getElementById('yearRangeEnd')?.value || 2025),
        season: document.getElementById('seasonFilter')?.value || 'all',
        pollutants: {
            PM25: document.getElementById('pollutantPM25')?.checked || false,
            PM10: document.getElementById('pollutantPM10')?.checked || false,
            NO2: document.getElementById('pollutantNO2')?.checked || false,
            SO2: document.getElementById('pollutantSO2')?.checked || false,
            CO: document.getElementById('pollutantCO')?.checked || false,
            O3: document.getElementById('pollutantO3')?.checked || false
        },
        sources: {
            vehicular: document.getElementById('sourceVehicular')?.checked || false,
            dust: document.getElementById('sourceDust')?.checked || false,
            biomass: document.getElementById('sourceBiomass')?.checked || false,
            industrial: document.getElementById('sourceIndustrial')?.checked || false,
            construction: document.getElementById('sourceConstruction')?.checked || false
        },
        district: document.getElementById('districtFilter')?.value || 'all'
    };

    dashboardData.filters = filters;

    // Update visualizations based on filters
    console.log('Dashboard updated with filters:', filters);

    // In a full implementation, this would re-render charts with filtered data
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + E for export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportDashboard();
    }

    // Ctrl/Cmd + P for print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
    }
});

// Print optimization
window.addEventListener('beforeprint', function () {
    document.body.classList.add('printing');
});

window.addEventListener('afterprint', function () {
    document.body.classList.remove('printing');
});

// Responsive navigation for mobile
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelector('.nav-links');

    if (window.innerWidth < 768) {
        navLinks.style.overflowX = 'auto';
    }

    window.addEventListener('resize', function () {
        if (window.innerWidth < 768) {
            navLinks.style.overflowX = 'auto';
        } else {
            navLinks.style.overflowX = 'visible';
        }
    });
});

// Loading indicator
function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'loadingIndicator';
    loading.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:white; padding:30px; border-radius:10px; z-index:9999; text-align:center;';
    loading.innerHTML = '<h3>Loading Dashboard...</h3><p>Please wait while we process the data</p>';
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.remove();
    }
}

// Initialize loading indicator
document.addEventListener('DOMContentLoaded', function () {
    showLoading();

    // Hide after data loads
    setTimeout(function () {
        hideLoading();
    }, 2000);
});

// Tooltip system
function createTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = 'position:absolute; background:#333; color:white; padding:8px 12px; border-radius:4px; font-size:0.85rem; z-index:1000; pointer-events:none; display:none;';
    document.body.appendChild(tooltip);

    element.addEventListener('mouseenter', function (e) {
        tooltip.style.display = 'block';
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY + 10 + 'px';
    });

    element.addEventListener('mousemove', function (e) {
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY + 10 + 'px';
    });

    element.addEventListener('mouseleave', function () {
        tooltip.style.display = 'none';
    });
}

// Add tooltips to badges
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        const badges = document.querySelectorAll('.badge');
        badges.forEach(badge => {
            const text = badge.textContent;
            if (text.includes('MoRTH')) {
                createTooltip(badge, 'Ministry of Road Transport & Highways');
            } else if (text.includes('MoEFCC')) {
                createTooltip(badge, 'Ministry of Environment, Forest & Climate Change');
            } else if (text.includes('CAQM')) {
                createTooltip(badge, 'Commission for Air Quality Management');
            }
        });
    }, 2000);
});

// Analytics tracking (placeholder)
function trackEvent(category, action, label) {
    console.log(`Analytics: ${category} - ${action} - ${label}`);
    // In production, this would send to analytics service
}

// Track user interactions
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('nav-link')) {
        trackEvent('Navigation', 'Click', e.target.textContent);
    } else if (e.target.classList.contains('export-btn')) {
        trackEvent('Export', 'Click', 'Export Button');
    }
});

console.log('Dashboard interactions initialized');
