// ===================================
// DELHI MONSOON DASHBOARD - JavaScript
// Real-time Data Simulation & Interactivity
// ===================================

// === GLOBAL STATE ===
let currentFilters = {
    ward: 'all',
    risk: 'all',
    incident: 'all',
    time: 'live'
};

let activeLayers = {
    rainfall: true,
    drainage: true,
    incidents: true,
    traffic: false
};

// === SUPABASE CONFIGURATION ===
// ⚠️ REPLACE THESE WITH YOUR OWN KEYS FROM SUPABASE DASHBOARD ⚠️
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// === API CONFIGURATION ===
// We now use Supabase directly, but keep this for reference
const API_BASE_URL = 'http://localhost:3000/api';
const API_ENDPOINTS = {
    incidents: `${API_BASE_URL}/incidents`,
    stats: `${API_BASE_URL}/incidents/stats/summary`,
    training: `${API_BASE_URL}/incidents/training/export`
};

// === MOCK DATA GENERATION ===
const wardNames = [
    'Central Delhi - 1', 'Central Delhi - 2', 'Central Delhi - 3',
    'North Delhi - 1', 'North Delhi - 2', 'North Delhi - 3', 'North Delhi - 4',
    'South Delhi - 1', 'South Delhi - 2', 'South Delhi - 3', 'South Delhi - 4',
    'East Delhi - 1', 'East Delhi - 2', 'East Delhi - 3', 'East Delhi - 4',
    'West Delhi - 1', 'West Delhi - 2', 'West Delhi - 3', 'West Delhi - 4',
    'New Delhi', 'Shahdara', 'Rohini', 'Dwarka', 'Najafgarh', 'Narela'
];

function generateWardData() {
    return wardNames.map((name, index) => {
        const mpiScore = Math.floor(Math.random() * 100);
        const currentRainfall = Math.floor(Math.random() * 80);
        const forecastRainfall = Math.floor(Math.random() * 120);
        const threshold = 50 + Math.floor(Math.random() * 50);

        let status = 'ready';
        if (mpiScore < 40) status = 'critical';
        else if (mpiScore < 70) status = 'risk';

        let riskLevel = 'safe';
        const riskPercentage = (forecastRainfall / threshold) * 100;
        if (riskPercentage > 70) riskLevel = 'critical';
        else if (riskPercentage > 30) riskLevel = 'alert';

        return {
            id: index + 1,
            name: name,
            zone: name.split(' - ')[0],
            mpiScore: mpiScore,
            status: status,
            currentRainfall: currentRainfall,
            forecastRainfall: forecastRainfall,
            threshold: threshold,
            riskLevel: riskLevel,
            drainageStress: Math.floor(Math.random() * 100),
            potholeDensity: Math.floor(Math.random() * 100),
            incidents: Math.floor(Math.random() * 15)
        };
    });
}

let wardsData = generateWardData();

function generateIncidents(count = 12) {
    const types = ['waterlogging', 'pothole', 'drainage'];
    const statuses = ['verified', 'pending', 'verified', 'verified'];
    const incidents = [];

    for (let i = 0; i < count; i++) {
        const ward = wardsData[Math.floor(Math.random() * wardsData.length)];
        const hoursAgo = Math.floor(Math.random() * 3);
        const minutesAgo = Math.floor(Math.random() * 60);

        incidents.push({
            id: i + 1,
            type: types[Math.floor(Math.random() * types.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            ward: ward.name,
            time: hoursAgo === 0 ? `${minutesAgo} min ago` : `${hoursAgo}h ${minutesAgo}m ago`,
            severity: Math.floor(Math.random() * 3) + 1,
            description: 'Field-reported incident'
        });
    }

    return incidents;
}

let incidentsData = generateIncidents();

// === INITIALIZE DASHBOARD ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌧️ Delhi Monsoon Dashboard Initializing...');

    initializeClock();
    initializeFilters();
    initializeLayerToggles();
    initializeTabs();
    initializeMap();
    renderMPIDashboard();
    renderAlerts();
    renderIncidents();
    renderActionCenter();
    renderInfrastructure();
    updateAlertSummary();
    initializeExport();

    // Simulate real-time updates every 30 seconds
    setInterval(() => {
        updateRealTimeData();
    }, 30000);

    console.log('✅ Dashboard Ready!');
});

// === CLOCK ===
function initializeClock() {
    function updateClock() {
        const now = new Date();
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        document.getElementById('currentTime').textContent = now.toLocaleString('en-IN', options);
    }

    updateClock();
    setInterval(updateClock, 1000);
}

// === FILTERS ===
function initializeFilters() {
    const filterIds = ['wardFilter', 'riskFilter', 'incidentFilter', 'timeFilter'];

    filterIds.forEach(id => {
        const filter = document.getElementById(id);
        if (filter) {
            filter.addEventListener('change', (e) => {
                const filterType = id.replace('Filter', '');
                currentFilters[filterType] = e.target.value;
                applyFilters();
            });
        }
    });
}

function applyFilters() {
    console.log('Applying filters:', currentFilters);

    // Filter wards data
    let filteredWards = wardsData;

    if (currentFilters.ward !== 'all') {
        filteredWards = filteredWards.filter(w => w.zone.toLowerCase().includes(currentFilters.ward));
    }

    if (currentFilters.risk !== 'all') {
        filteredWards = filteredWards.filter(w => w.riskLevel === currentFilters.risk);
    }

    // Re-render with filtered data
    renderMPIDashboard(filteredWards);
    updateAlertSummary();
}

// === LAYER TOGGLES ===
function initializeLayerToggles() {
    const layers = ['rainfall', 'drainage', 'incidents', 'traffic'];

    layers.forEach(layer => {
        const toggle = document.getElementById(`${layer}Layer`);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                activeLayers[layer] = e.target.checked;
                updateMapLayers();
            });
        }
    });
}

function updateMapLayers() {
    console.log('Active layers:', activeLayers);
    // In a real app, this would show/hide map layers
    // For now, just log the state
}

// === TABS ===
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const panelName = btn.getAttribute('data-panel');
            switchPanel(panelName);
        });
    });
}

function switchPanel(panelName) {
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(panel => panel.classList.remove('active'));

    // Add active class to selected tab and panel
    document.querySelector(`[data-panel="${panelName}"]`).classList.add('active');
    document.getElementById(`panel-${panelName}`).classList.add('active');
}

// === MAP ===
function initializeMap() {
    const mapElement = document.getElementById('riskMap');

    // Create SVG map with ward regions
    setTimeout(() => {
        mapElement.innerHTML = createInteractiveMap();

        // Add click handlers to ward regions
        document.querySelectorAll('.ward-region').forEach(region => {
            region.addEventListener('click', (e) => {
                const wardId = parseInt(e.currentTarget.getAttribute('data-ward-id'));
                showWardDetails(wardId);
            });

            region.addEventListener('mouseenter', (e) => {
                const wardId = parseInt(e.currentTarget.getAttribute('data-ward-id'));
                showWardTooltip(wardId, e);
            });

            region.addEventListener('mouseleave', hideWardTooltip);
        });

        // Map controls
        document.getElementById('zoomIn')?.addEventListener('click', () => console.log('Zoom in'));
        document.getElementById('zoomOut')?.addEventListener('click', () => console.log('Zoom out'));
        document.getElementById('resetView')?.addEventListener('click', () => console.log('Reset view'));
    }, 500);
}

function createInteractiveMap() {
    // Create a simplified SVG map with ward regions
    let svg = `
        <svg viewBox="0 0 800 600" style="width: 100%; height: 100%;">
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
    `;

    // Create a grid of ward regions (5 rows x 5 cols)
    const rows = 5;
    const cols = 5;
    const regionWidth = 800 / cols;
    const regionHeight = 600 / rows;
    let wardIndex = 0;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (wardIndex >= wardsData.length) break;

            const ward = wardsData[wardIndex];
            const x = col * regionWidth;
            const y = row * regionHeight;

            let fillColor = '#00C896'; // Safe
            if (ward.riskLevel === 'alert') fillColor = '#FFB800';
            if (ward.riskLevel === 'critical') fillColor = '#FF4757';

            svg += `
                <g class="ward-region" data-ward-id="${ward.id}" style="cursor: pointer;">
                    <rect 
                        x="${x + 2}" 
                        y="${y + 2}" 
                        width="${regionWidth - 4}" 
                        height="${regionHeight - 4}" 
                        fill="${fillColor}" 
                        fill-opacity="0.6"
                        stroke="#ffffff"
                        stroke-width="2"
                        rx="8"
                        class="ward-shape"
                        style="transition: all 0.3s ease;"
                    />
                    <text 
                        x="${x + regionWidth / 2}" 
                        y="${y + regionHeight / 2}" 
                        text-anchor="middle" 
                        fill="#0A2647" 
                        font-size="12" 
                        font-weight="700"
                        pointer-events="none"
                    >
                        ${ward.name.split(' - ')[0].substring(0, 8)}
                    </text>
                    <text 
                        x="${x + regionWidth / 2}" 
                        y="${y + regionHeight / 2 + 15}" 
                        text-anchor="middle" 
                        fill="#0A2647" 
                        font-size="10" 
                        font-weight="600"
                        pointer-events="none"
                    >
                        MPI: ${ward.mpiScore}
                    </text>
                </g>
            `;

            wardIndex++;
        }
    }

    svg += `</svg>`;
    return svg;
}

function showWardTooltip(wardId, event) {
    // Create or update tooltip (simplified for now)
    console.log(`Showing tooltip for ward ${wardId}`);
}

function hideWardTooltip() {
    // Hide tooltip
}

function showWardDetails(wardId) {
    const ward = wardsData.find(w => w.id === wardId);
    if (!ward) return;

    const modal = document.getElementById('wardModal');
    const modalWardName = document.getElementById('modalWardName');
    const modalBody = document.getElementById('modalBody');

    modalWardName.textContent = ward.name;

    modalBody.innerHTML = `
        <div style="display: grid; gap: 16px;">
            <div>
                <h4 style="color: #144272; margin-bottom: 8px;">Monsoon Preparedness Index</h4>
                <div style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg, #0A2647 0%, #2C74B3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    ${ward.mpiScore}/100
                </div>
                <div style="height: 8px; background: #E8ECEF; border-radius: 4px; overflow: hidden; margin-top: 8px;">
                    <div style="height: 100%; width: ${ward.mpiScore}%; background: linear-gradient(135deg, #2C74B3 0%, #00D9FF 100%);"></div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; background: #F8FAFB; border-radius: 12px;">
                <div>
                    <div style="font-size: 0.85rem; color: #546E7A; margin-bottom: 4px;">Current Rainfall</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #2C74B3;">${ward.currentRainfall}mm</div>
                </div>
                <div>
                    <div style="font-size: 0.85rem; color: #546E7A; margin-bottom: 4px;">Forecast (3h)</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #144272;">${ward.forecastRainfall}mm</div>
                </div>
            </div>
            
            <div>
                <h4 style="color: #144272; margin-bottom: 8px;">Failure Threshold</h4>
                <div style="font-size: 1.75rem; font-weight: 700; color: #FF4757;">${ward.threshold}mm</div>
                <div style="font-size: 0.9rem; color: #546E7A; margin-top: 4px;">
                    Currently at ${Math.round((ward.forecastRainfall / ward.threshold) * 100)}% of threshold
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="padding: 12px; background: #F8FAFB; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #546E7A; margin-bottom: 4px;">Drainage Stress</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #0A2647;">${ward.drainageStress}%</div>
                </div>
                <div style="padding: 12px; background: #F8FAFB; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #546E7A; margin-bottom: 4px;">Pothole Density</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #0A2647;">${ward.potholeDensity}%</div>
                </div>
            </div>
            
            <div style="padding: 12px; background: rgba(44, 116, 179, 0.05); border-radius: 8px; border-left: 3px solid #2C74B3;">
                <strong style="color: #144272;">Risk Level:</strong> 
                <span style="text-transform: uppercase; font-weight: 700; color: ${ward.riskLevel === 'critical' ? '#FF4757' : ward.riskLevel === 'alert' ? '#FFB800' : '#00C896'};">
                    ${ward.riskLevel}
                </span>
            </div>
        </div>
    `;

    modal.classList.add('show');
}

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('wardModal').classList.remove('show');
});

// === MPI DASHBOARD ===
function renderMPIDashboard(wards = wardsData) {
    const mpiGrid = document.getElementById('mpiGrid');
    if (!mpiGrid) return;

    mpiGrid.innerHTML = wards.slice(0, 12).map(ward => {
        const statusClass = ward.status;
        const statusLabel = ward.status === 'ready' ? 'Ready' : ward.status === 'risk' ? 'At Risk' : 'Critical';

        return `
            <div class="mpi-card status-${statusClass}" onclick="showWardDetails(${ward.id})">
                <div class="mpi-card-header">
                    <div class="ward-name">${ward.name}</div>
                    <div class="mpi-badge ${statusClass}">${statusLabel}</div>
                </div>
                
                <div class="mpi-score-container">
                    <div class="mpi-score">${ward.mpiScore}</div>
                    <div class="mpi-label">Preparedness Index</div>
                </div>
                
                <div class="mpi-progress-bar">
                    <div class="mpi-progress-fill ${statusClass}" style="width: ${ward.mpiScore}%;"></div>
                </div>
                
                <div class="mpi-details">
                    <div class="mpi-detail-item">
                        <span><i class="fas fa-tint"></i> Rainfall</span>
                        <strong>${ward.currentRainfall}mm</strong>
                    </div>
                    <div class="mpi-detail-item">
                        <span><i class="fas fa-chart-line"></i> Forecast</span>
                        <strong>${ward.forecastRainfall}mm</strong>
                    </div>
                    <div class="mpi-detail-item">
                        <span><i class="fas fa-exclamation-triangle"></i> Threshold</span>
                        <strong>${ward.threshold}mm</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// === RAINFALL ALERTS ===
function renderAlerts() {
    const alertTimeline = document.getElementById('alertTimeline');
    if (!alertTimeline) return;

    const alertWards = wardsData.filter(w => w.forecastRainfall > w.threshold * 0.5).slice(0, 8);

    alertTimeline.innerHTML = alertWards.map(ward => {
        const thresholdPercent = Math.round((ward.forecastRainfall / ward.threshold) * 100);
        let severity = 'low';
        if (thresholdPercent > 90) severity = 'high';
        else if (thresholdPercent > 60) severity = 'medium';

        const timeWindow = `${Math.floor(Math.random() * 3) + 1}h ${Math.floor(Math.random() * 60)}m`;

        return `
            <div class="alert-card severity-${severity}">
                <div class="alert-card-header">
                    <div class="alert-ward">${ward.name}</div>
                    <div class="alert-time">
                        <i class="fas fa-clock"></i>
                        ${timeWindow}
                    </div>
                </div>
                
                <div class="alert-comparison">
                    <div class="comparison-item">
                        <div class="comparison-label">Forecast Rainfall</div>
                        <div class="comparison-value forecast">${ward.forecastRainfall}mm</div>
                    </div>
                    <div class="comparison-item">
                        <div class="comparison-label">Failure Threshold</div>
                        <div class="comparison-value threshold">${ward.threshold}mm</div>
                    </div>
                </div>
                
                <div class="alert-message">
                    <strong>${thresholdPercent}% of threshold</strong> - 
                    ${severity === 'high' ? '⚠️ Immediate action required' : severity === 'medium' ? '⚡ Monitor closely' : '✓ Under watch'}
                </div>
            </div>
        `;
    }).join('');
}

// === INCIDENTS ===
function renderIncidents() {
    const incidentFeed = document.getElementById('incidentFeed');
    if (!incidentFeed) return;

    incidentFeed.innerHTML = incidentsData.slice(0, 9).map(incident => {
        const iconMap = {
            'waterlogging': 'fa-water',
            'pothole': 'fa-exclamation-circle',
            'drainage': 'fa-tint-slash'
        };

        return `
            <div class="incident-card">
                <div class="incident-image">
                    <i class="fas ${iconMap[incident.type]}"></i>
                </div>
                <div class="incident-content">
                    <div class="incident-header">
                        <div class="incident-type ${incident.type}">${incident.type}</div>
                        <div class="incident-status ${incident.status}">${incident.status}</div>
                    </div>
                    
                    <div class="incident-info">
                        <div>
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${incident.ward}</span>
                        </div>
                        <div>
                            <i class="fas fa-clock"></i>
                            <span>${incident.time}</span>
                        </div>
                        <div>
                            <i class="fas fa-signal"></i>
                            <span>Severity: ${incident.severity}/3</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// === ACTION CENTER ===
function renderActionCenter() {
    // Drain Clearing Priority
    const drainPriority = document.getElementById('drainPriority');
    if (drainPriority) {
        const highStressWards = wardsData
            .filter(w => w.drainageStress > 60)
            .sort((a, b) => b.drainageStress - a.drainageStress)
            .slice(0, 5);

        drainPriority.innerHTML = highStressWards.map(ward => {
            const priority = ward.drainageStress > 80 ? 'urgent' : ward.drainageStress > 70 ? 'high' : 'medium';
            return `
                <div class="priority-item ${priority}">
                    <div class="item-header">
                        <div class="item-title">${ward.name}</div>
                        <div class="priority-badge ${priority}">${priority}</div>
                    </div>
                    <div class="item-description">
                        Drainage stress: ${ward.drainageStress}% - Deploy cleaning crew immediately
                    </div>
                </div>
            `;
        }).join('');
    }

    // Rapid Response Deployment
    const deploymentList = document.getElementById('deploymentList');
    if (deploymentList) {
        const criticalWards = wardsData.filter(w => w.riskLevel === 'critical').slice(0, 5);

        deploymentList.innerHTML = criticalWards.map(ward => {
            const units = Math.floor(Math.random() * 3) + 2;
            return `
                <div class="deployment-item">
                    <div class="item-header">
                        <div class="item-title">${ward.name}</div>
                        <div class="priority-badge urgent">${units} Units</div>
                    </div>
                    <div class="item-description">
                        🚒 Pumping units: ${units} | 👷 Repair crews: ${Math.floor(units / 2)}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Traffic Diversion
    const trafficList = document.getElementById('trafficList');
    if (trafficList) {
        const riskWards = wardsData.filter(w => w.riskLevel !== 'safe').slice(0, 4);

        trafficList.innerHTML = riskWards.map(ward => {
            return `
                <div class="traffic-item">
                    <div class="item-header">
                        <div class="item-title">${ward.name}</div>
                        <div class="priority-badge high">High Risk</div>
                    </div>
                    <div class="item-description">
                        🚗 Divert traffic via alternate route - Expected delay: ${Math.floor(Math.random() * 20) + 10} min
                    </div>
                </div>
            `;
        }).join('');
    }
}

// === INFRASTRUCTURE ===
function renderInfrastructure() {
    // Drainage Stress
    const drainageStress = document.getElementById('drainageStress');
    if (drainageStress) {
        const topStress = wardsData
            .sort((a, b) => b.drainageStress - a.drainageStress)
            .slice(0, 6);

        drainageStress.innerHTML = topStress.map(ward => {
            const level = ward.drainageStress > 70 ? 'high' : ward.drainageStress > 40 ? 'medium' : 'low';
            return `
                <div class="stress-item">
                    <div class="stress-header">
                        <div class="stress-ward">${ward.name}</div>
                        <div class="stress-level">${ward.drainageStress}%</div>
                    </div>
                    <div class="stress-bar">
                        <div class="stress-fill ${level}" style="width: ${ward.drainageStress}%;"></div>
                    </div>
                    <div class="item-description">
                        ${level === 'high' ? '🔴 Critical - Immediate maintenance' : level === 'medium' ? '🟡 Monitor closely' : '🟢 Operating normally'}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Pothole Density
    const potholeDensity = document.getElementById('potholeDensity');
    if (potholeDensity) {
        const topDensity = wardsData
            .sort((a, b) => b.potholeDensity - a.potholeDensity)
            .slice(0, 6);

        potholeDensity.innerHTML = topDensity.map(ward => {
            const level = ward.potholeDensity > 70 ? 'high' : ward.potholeDensity > 40 ? 'medium' : 'low';
            return `
                <div class="density-item">
                    <div class="density-header">
                        <div class="density-ward">${ward.name}</div>
                        <div class="density-level">${ward.potholeDensity}%</div>
                    </div>
                    <div class="density-bar">
                        <div class="density-fill ${level}" style="width: ${ward.potholeDensity}%;"></div>
                    </div>
                    <div class="item-description">
                        ${level === 'high' ? '🔴 High density - Schedule repairs' : level === 'medium' ? '🟡 Moderate - Plan maintenance' : '🟢 Low density'}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// === ALERT SUMMARY ===
function updateAlertSummary() {
    const criticalCount = wardsData.filter(w => w.riskLevel === 'critical').length;
    const warningCount = wardsData.filter(w => w.riskLevel === 'alert').length;
    const safeCount = wardsData.filter(w => w.riskLevel === 'safe').length;

    document.getElementById('criticalCount').textContent = criticalCount;
    document.getElementById('warningCount').textContent = warningCount;
    document.getElementById('safeCount').textContent = safeCount;
}

// === REAL-TIME UPDATES ===
function updateRealTimeData() {
    console.log('📊 Updating real-time data...');

    // Simulate data changes
    wardsData = wardsData.map(ward => ({
        ...ward,
        currentRainfall: Math.max(0, ward.currentRainfall + Math.floor(Math.random() * 10) - 5),
        forecastRainfall: Math.max(0, ward.forecastRainfall + Math.floor(Math.random() * 10) - 5),
        mpiScore: Math.max(0, Math.min(100, ward.mpiScore + Math.floor(Math.random() * 6) - 3))
    }));

    // Re-classify risk levels
    wardsData = wardsData.map(ward => {
        const riskPercentage = (ward.forecastRainfall / ward.threshold) * 100;
        let riskLevel = 'safe';
        if (riskPercentage > 70) riskLevel = 'critical';
        else if (riskPercentage > 30) riskLevel = 'alert';

        let status = 'ready';
        if (ward.mpiScore < 40) status = 'critical';
        else if (ward.mpiScore < 70) status = 'risk';

        return { ...ward, riskLevel, status };
    });

    // Add new incidents occasionally
    if (Math.random() > 0.7) {
        incidentsData.unshift(generateIncidents(1)[0]);
        if (incidentsData.length > 20) incidentsData.pop();
    }

    // Re-render
    renderMPIDashboard();
    renderAlerts();
    renderIncidents();
    renderActionCenter();
    renderInfrastructure();
    updateAlertSummary();

    // Update map
    const mapElement = document.getElementById('riskMap');
    if (mapElement) {
        mapElement.innerHTML = createInteractiveMap();

        // Re-attach event listeners
        document.querySelectorAll('.ward-region').forEach(region => {
            region.addEventListener('click', (e) => {
                const wardId = parseInt(e.currentTarget.getAttribute('data-ward-id'));
                showWardDetails(wardId);
            });
        });
    }

    console.log('✅ Data updated!');
}

// === EXPORT FUNCTIONALITY ===
function initializeExport() {
    const exportBtn = document.getElementById('exportReport');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            console.log('📄 Exporting report...');

            // Generate report data
            const reportData = {
                timestamp: new Date().toISOString(),
                summary: {
                    totalWards: wardsData.length,
                    criticalWards: wardsData.filter(w => w.riskLevel === 'critical').length,
                    alertWards: wardsData.filter(w => w.riskLevel === 'alert').length,
                    safeWards: wardsData.filter(w => w.riskLevel === 'safe').length
                },
                wards: wardsData,
                incidents: incidentsData
            };

            // Convert to JSON and download
            const dataStr = JSON.stringify(reportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `monsoon-report-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            alert('✅ Report exported successfully!');
        });
    }
}

// === UTILITY FUNCTIONS ===
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// ===================================
// INCIDENT UPLOAD FUNCTIONALITY
// ===================================

let uploadedImage = null;
let currentGPS = null;
let cameraStream = null;
let watchPositionId = null;
let validationResults = {
    timestamp: null,
    aiGenerated: null,
    location: null,
    quality: null
};

// Initialize upload modal
function initializeUploadModal() {
    const reportBtn = document.getElementById('reportIncidentBtn');
    const modal = document.getElementById('uploadModal');
    const closeBtn = document.getElementById('closeUploadModal');
    const cancelBtn = document.getElementById('cancelUpload');
    const openCameraBtn = document.getElementById('openCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const cancelCameraBtn = document.getElementById('cancelCameraBtn');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const captureGPSBtn = document.getElementById('captureGPS');
    const form = document.getElementById('incidentUploadForm');
    const videoStream = document.getElementById('videoStream');
    const canvas = document.getElementById('capturedCanvas');

    // Open modal
    reportBtn?.addEventListener('click', () => {
        modal.classList.add('show');
        resetUploadForm();
    });

    // Close modal
    const closeModal = () => {
        stopCamera();
        stopLocationWatch();
        modal.classList.remove('show');
        resetUploadForm();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Open camera
    openCameraBtn?.addEventListener('click', () => {
        openCamera();
    });

    // Capture photo from camera
    captureBtn?.addEventListener('click', () => {
        capturePhoto(videoStream, canvas);
    });

    // Cancel camera
    cancelCameraBtn?.addEventListener('click', () => {
        stopCamera();
        showCameraPlaceholder();
    });

    // Remove/Retake image
    removeImageBtn?.addEventListener('click', () => {
        uploadedImage = null;
        document.getElementById('imagePreview').style.display = 'none';
        showCameraPlaceholder();
        document.getElementById('validationPanel').style.display = 'none';
        document.getElementById('submitIncident').disabled = true;
        validateForm();
    });

    // GPS Capture
    captureGPSBtn?.addEventListener('click', captureLocation);

    // Form submission with validation
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateForm()) {
            submitIncidentReport();
        }
    });

    // Real-time form validation
    document.getElementById('incidentWard')?.addEventListener('change', () => {
        validateField('ward');
        if (uploadedImage) updateValidationScore();
    });

    document.getElementById('incidentType')?.addEventListener('change', () => {
        validateField('type');
        if (uploadedImage) updateValidationScore();
    });

    document.getElementById('incidentDescription')?.addEventListener('input', () => {
        const desc = document.getElementById('incidentDescription');
        const maxLength = 1000;
        if (desc.value.length > maxLength) {
            desc.value = desc.value.substring(0, maxLength);
        }
    });
}

// Open camera using getUserMedia
async function openCamera() {
    try {
        const videoStream = document.getElementById('videoStream');
        const placeholder = document.getElementById('cameraPlaceholder');
        const streamDiv = document.getElementById('cameraStream');
        const imageError = document.getElementById('imageError');

        // Request camera access
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        // Show video stream
        videoStream.srcObject = cameraStream;
        placeholder.style.display = 'none';
        streamDiv.style.display = 'block';
        imageError.style.display = 'none';

        // Play video
        await videoStream.play();

    } catch (error) {
        console.error('Camera error:', error);
        const imageError = document.getElementById('imageError');
        imageError.textContent = 'Failed to access camera. Please allow camera permissions and try again.';
        imageError.style.display = 'block';

        if (error.name === 'NotAllowedError') {
            alert('Camera access denied. Please allow camera permissions in your browser settings.');
        } else if (error.name === 'NotFoundError') {
            alert('No camera found. Please connect a camera and try again.');
        } else {
            alert('Failed to access camera: ' + error.message);
        }
    }
}

// Stop camera stream
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    const videoStream = document.getElementById('videoStream');
    if (videoStream) {
        videoStream.srcObject = null;
    }
}

// Show camera placeholder
function showCameraPlaceholder() {
    document.getElementById('cameraPlaceholder').style.display = 'block';
    document.getElementById('cameraStream').style.display = 'none';
}

// Capture photo from video stream
function capturePhoto(video, canvas) {
    try {
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (!blob) {
                alert('Failed to capture photo. Please try again.');
                return;
            }

            // Create file from blob
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });

            // Read as data URL for preview
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImage = {
                    file: file,
                    dataURL: e.target.result,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadTime: new Date()
                };

                // Show preview
                document.getElementById('previewImage').src = e.target.result;
                document.getElementById('imagePreview').style.display = 'block';
                document.getElementById('cameraStream').style.display = 'none';
                document.getElementById('cameraPlaceholder').style.display = 'none';

                // Stop camera
                stopCamera();

                // Run validation
                validateImage();

                // Validate form
                validateForm();
            };
            reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.9);
    } catch (error) {
        console.error('Capture error:', error);
        alert('Failed to capture photo. Please try again.');
    }
}

// Form validation functions
function validateField(fieldName) {
    const field = document.getElementById(`incident${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
    const errorElement = document.getElementById(`${fieldName}Error`);

    if (!field || !errorElement) return true;

    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
        case 'ward':
            if (!field.value || field.value === '') {
                isValid = false;
                errorMessage = 'Please select a ward';
            }
            break;
        case 'type':
            if (!field.value || field.value === '') {
                isValid = false;
                errorMessage = 'Please select an incident type';
            }
            break;
        case 'gps':
            // GPS is optional - just show warning if not captured
            if (!currentGPS) {
                isValid = true; // Still valid, just show warning
                errorMessage = 'GPS location recommended but not required';
            }
            break;
    }

    if (isValid) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
        field.classList.remove('error');
    } else {
        errorElement.style.display = 'block';
        errorElement.textContent = errorMessage;
        field.classList.add('error');
    }

    return isValid;
}

function validateForm() {
    const imageValid = uploadedImage !== null;
    const wardValid = validateField('ward');
    const typeValid = validateField('type');
    // GPS is optional - don't block form submission if GPS not captured
    // validateField('gps') will just show a warning but not fail

    const imageError = document.getElementById('imageError');
    if (!imageValid) {
        imageError.textContent = 'Please capture a photo using the camera';
        imageError.style.display = 'block';
    } else {
        imageError.style.display = 'none';
    }

    const gpsError = document.getElementById('gpsError');
    if (gpsError && !currentGPS) {
        gpsError.textContent = '⚠️ GPS location is recommended for better accuracy but not required. You can submit with ward selection only.';
        gpsError.style.display = 'block';
    } else if (gpsError && currentGPS) {
        gpsError.style.display = 'none';
    }

    // Capture high-accuracy GPS location
    function captureLocation() {
        const gpsBtn = document.getElementById('captureGPS');
        const gpsDisplay = document.getElementById('gpsDisplay');
        const gpsError = document.getElementById('gpsError');

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        gpsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        gpsBtn.classList.add('capturing');
        gpsBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentGPS = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                gpsBtn.innerHTML = '<i class="fas fa-check"></i> Location Captured';
                gpsBtn.classList.remove('capturing');
                gpsBtn.disabled = false;

                gpsDisplay.classList.add('captured');
                const accuracyStatus = currentGPS.accuracy < 20 ? '✓ High' : currentGPS.accuracy < 50 ? '⚠️ Medium' : '⚠️ Low';

                gpsDisplay.innerHTML = `
                <small>
                    <strong>${accuracyStatus} Accuracy</strong><br>
                    📍 ${currentGPS.latitude.toFixed(6)}, ${currentGPS.longitude.toFixed(6)}<br>
                    Accuracy: ±${Math.round(currentGPS.accuracy)}m
                </small>
            `;

                // Clear error if exists
                if (gpsError) gpsError.style.display = 'none';

                // Validate
                validateField('gps');
            },
            (error) => {
                console.error('GPS Error:', error);
                gpsBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Retry Location';
                gpsBtn.classList.remove('capturing');
                gpsBtn.disabled = false;

                let msg = 'Failed to get location.';
                if (error.code === 1) msg = 'Location permission denied.';
                else if (error.code === 2) msg = 'Location unavailable.';
                else if (error.code === 3) msg = 'Location request timed out.';

                alert(msg + ' Please ensure GPS is enabled.');
            },
            {
                enableHighAccuracy: true, // Request high accuracy (GPS)
                timeout: 15000,           // Wait up to 15s
                maximumAge: 0             // No cached positions
            }
        );
    }

    // Form is valid if image, ward, and type are filled (GPS is optional)
    const allValid = imageValid && wardValid && typeValid;

    const submitBtn = document.getElementById('submitIncident');
    if (submitBtn) {
        submitBtn.disabled = !allValid;
    }

    return allValid;
}

function validateImage() {
    console.log('🔍 Validating image...');

    // Show validation panel
    document.getElementById('validationPanel').style.display = 'block';

    // Reset validation items
    const validationItems = ['validTimestamp', 'validAI', 'validLocation', 'validQuality'];
    validationItems.forEach(id => {
        const elem = document.getElementById(id);
        elem.className = 'validation-item checking';
        elem.querySelector('i').className = 'fas fa-circle-notch fa-spin';
    });

    // Simulate validation checks with delays
    setTimeout(() => validateTimestamp(), 500);
    setTimeout(() => validateAIGenerated(), 1200);
    setTimeout(() => validateLocation(), 1900);
    setTimeout(() => validateQuality(), 2600);
}

function validateTimestamp() {
    const elem = document.getElementById('validTimestamp');

    // Simulate timestamp check (in reality, extract EXIF data)
    const uploadTime = uploadedImage.uploadTime;
    const now = new Date();
    const timeDiff = (now - uploadTime) / 1000 / 60; // minutes

    // Check if photo is recent (within last 24 hours)
    const isRecent = timeDiff < 1440; // 24 hours

    validationResults.timestamp = isRecent;

    if (isRecent) {
        elem.className = 'validation-item pass';
        elem.querySelector('i').className = 'fas fa-check-circle';
        elem.querySelector('span').textContent = '✓ Timestamp verified - Recent photo';
    } else {
        elem.className = 'validation-item warning';
        elem.querySelector('i').className = 'fas fa-exclamation-triangle';
        elem.querySelector('span').textContent = '⚠️ Photo may be old - verify manually';
    }

    updateValidationScore();
}

function validateAIGenerated() {
    const elem = document.getElementById('validAI');

    // Simulate AI detection (in reality, use ML model or API)
    const randomCheck = Math.random();
    const isReal = randomCheck > 0.1; // 90% pass rate for simulation

    validationResults.aiGenerated = isReal;

    if (isReal) {
        elem.className = 'validation-item pass';
        elem.querySelector('i').className = 'fas fa-check-circle';
        elem.querySelector('span').textContent = '✓ Real photo detected';
    } else {
        elem.className = 'validation-item fail';
        elem.querySelector('i').className = 'fas fa-times-circle';
        elem.querySelector('span').textContent = '✗ Possible AI-generated image';
    }

    updateValidationScore();
}

function validateLocation() {
    const elem = document.getElementById('validLocation');

    // Check if GPS was captured or ward selected
    const hasGPS = currentGPS !== null;
    const hasWard = document.getElementById('incidentWard').value !== '';

    validationResults.location = hasGPS || hasWard;

    if (hasGPS) {
        elem.className = 'validation-item pass';
        elem.querySelector('i').className = 'fas fa-check-circle';
        elem.querySelector('span').textContent = '✓ GPS coordinates verified';
    } else if (hasWard) {
        elem.className = 'validation-item warning';
        elem.querySelector('i').className = 'fas fa-exclamation-triangle';
        elem.querySelector('span').textContent = '⚠️ Ward selected, GPS recommended';
    } else {
        elem.className = 'validation-item fail';
        elem.querySelector('i').className = 'fas fa-times-circle';
        elem.querySelector('span').textContent = '✗ Location data missing';
    }

    updateValidationScore();
}

function validateQuality() {
    const elem = document.getElementById('validQuality');

    // Simulate quality check (in reality, check resolution, blur, etc.)
    const fileSize = uploadedImage.size;
    const isGoodQuality = fileSize > 50000 && fileSize < 10000000; // 50KB - 10MB

    validationResults.quality = isGoodQuality;

    if (isGoodQuality) {
        elem.className = 'validation-item pass';
        elem.querySelector('i').className = 'fas fa-check-circle';
        elem.querySelector('span').textContent = '✓ Image quality acceptable';
    } else if (fileSize < 50000) {
        elem.className = 'validation-item warning';
        elem.querySelector('i').className = 'fas fa-exclamation-triangle';
        elem.querySelector('span').textContent = '⚠️ Low resolution image';
    } else {
        elem.className = 'validation-item warning';
        elem.querySelector('i').className = 'fas fa-exclamation-triangle';
        elem.querySelector('span').textContent = '⚠️ File size very large';
    }

    updateValidationScore();
}

function updateValidationScore() {
    // Calculate confidence score based on validation results
    let score = 0;
    let total = 0;

    Object.values(validationResults).forEach(result => {
        if (result !== null) {
            total++;
            if (result === true) score++;
        }
    });

    if (total === 0) return;

    const confidencePercent = Math.round((score / total) * 100);
    const scoreValue = document.getElementById('scoreValue');
    const scoreFill = document.getElementById('scoreFill');

    scoreValue.textContent = `${confidencePercent}%`;
    scoreFill.style.width = `${confidencePercent}%`;

    // Set color based on score
    if (confidencePercent >= 75) {
        scoreFill.className = 'score-fill high';
    } else if (confidencePercent >= 50) {
        scoreFill.className = 'score-fill medium';
    } else {
        scoreFill.className = 'score-fill low';
    }

    // Enable submit button if score is acceptable
    const submitBtn = document.getElementById('submitIncident');
    const hasRequiredFields = document.getElementById('incidentWard').value !== '' &&
        document.getElementById('incidentType').value !== '';

    submitBtn.disabled = !(confidencePercent >= 50 && hasRequiredFields);
}

// Stop location watching
function stopLocationWatch() {
    if (watchPositionId !== null) {
        navigator.geolocation.clearWatch(watchPositionId);
        watchPositionId = null;
    }
}

function captureLocation() {
    const gpsBtn = document.getElementById('captureGPS');
    const gpsDisplay = document.getElementById('gpsDisplay');

    // Stop any existing watch
    stopLocationWatch();

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        gpsBtn.classList.remove('capturing');
        gpsBtn.disabled = false;
        gpsBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Capture Location';
        gpsDisplay.innerHTML = '<small style="color: #FF4757;">⚠️ Geolocation is not supported by your browser</small>';
        alert('Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
    }

    // Note: Some browsers may restrict geolocation from file:// protocol
    // But we'll try anyway - the browser will handle permissions
    // If it fails, we'll show a helpful error message

    gpsBtn.classList.add('capturing');
    gpsBtn.disabled = true;
    gpsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Capturing Location...';
    gpsDisplay.innerHTML = '<small><i class="fas fa-spinner fa-spin"></i> Requesting location access...<br>Please allow location permissions if prompted.</small>';

    // Try with less strict options first - prioritize speed over accuracy
    // Start with cached position if available
    const quickOptions = {
        enableHighAccuracy: false,  // Don't require GPS initially
        timeout: 30000,  // 30 seconds - longer timeout
        maximumAge: 300000  // Accept cached position up to 5 minutes old
    };

    const accurateOptions = {
        enableHighAccuracy: true,  // Try GPS for better accuracy
        timeout: 60000,  // 60 seconds - much longer for GPS to get fix
        maximumAge: 60000  // Accept cached position up to 1 minute old
    };

    // First attempt: Quick position (cached or network-based)
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Success! Use this position
            console.log('Location captured successfully:', position.coords);
            gpsBtn.classList.remove('capturing');
            gpsBtn.disabled = false;
            finalizeLocationCapture(position, gpsBtn, gpsDisplay);
        },
        (error) => {
            console.warn('Quick location attempt failed, trying accurate GPS...', error);

            // Update display
            gpsDisplay.innerHTML = '<small><i class="fas fa-spinner fa-spin"></i> Getting precise GPS location...<br>This may take 30-45 seconds. Please wait.</small>';

            // Second attempt: High accuracy GPS
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Success with GPS!
                    console.log('Accurate GPS location captured:', position.coords);
                    gpsBtn.classList.remove('capturing');
                    gpsBtn.disabled = false;
                    finalizeLocationCapture(position, gpsBtn, gpsDisplay);
                },
                (error) => {
                    // All attempts failed
                    console.error('GPS Error:', error);
                    stopLocationWatch();

                    gpsBtn.classList.remove('capturing');
                    gpsBtn.disabled = false;
                    gpsBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Try Again';

                    let errorMessage = '';
                    let errorDetails = '';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = '⚠️ Location access denied';
                            // Check if running from file:// and provide specific help
                            const isFileProtocol = window.location.protocol === 'file:';
                            if (isFileProtocol) {
                                errorDetails = 'Location access is restricted for local files.\n\nTo enable GPS:\n1. Open terminal in this folder\n2. Run: python -m http.server 8000\n3. Open: http://localhost:8000/index.html\n\nOr use: npx serve .';
                            } else {
                                errorDetails = 'Please:\n1. Click the location icon (🔒) in your browser address bar\n2. Allow location access\n3. Reload the page and try again';
                            }
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = '⚠️ Location unavailable';
                            errorDetails = 'Please:\n1. Enable GPS on your device\n2. Ensure location services are enabled\n3. Move to an area with better signal (outdoors)\n4. Try again';
                            break;
                        case error.TIMEOUT:
                            errorMessage = '⚠️ Location request timed out';
                            errorDetails = 'GPS location timed out. This is OK - you can still submit the incident with ward selection only.\n\nIf you want to try again:\n1. Go outdoors for better GPS signal\n2. Enable location services\n3. Click "Try Again"';
                            break;
                        default:
                            errorMessage = '⚠️ Unable to get location';
                            const isFileProtocol2 = window.location.protocol === 'file:';
                            if (isFileProtocol2) {
                                errorDetails = 'Location may not work from local files.\n\nTo fix:\n1. Run: python -m http.server 8000\n2. Open: http://localhost:8000/index.html';
                            } else {
                                errorDetails = 'Unknown error. Please try:\n1. Refreshing the page\n2. Checking browser location permissions\n3. Ensuring GPS is enabled on your device';
                            }
                            break;
                    }

                    // For timeout, show orange warning (not red error) since GPS is optional
                    const isTimeout = error.code === error.TIMEOUT;
                    const colorStyle = isTimeout ? '#FFA500' : '#FF4757';
                    gpsDisplay.innerHTML = `<small style="color: ${colorStyle};"><strong>${errorMessage}</strong><br>${errorDetails}</small>`;

                    // Only show alert for permission denied (most critical)
                    // For timeout, don't show alert since GPS is optional
                    if (error.code === error.PERMISSION_DENIED) {
                        alert(errorMessage + '\n\n' + errorDetails);
                    }

                    // Re-validate form to ensure submit button is enabled
                    validateForm();
                },
                accurateOptions
            );
        },
        quickOptions
    );
}

function finalizeLocationCapture(position, gpsBtn, gpsDisplay) {
    currentGPS = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || null,
        heading: position.coords.heading || null,
        speed: position.coords.speed || null,
        timestamp: position.timestamp
    };

    gpsBtn.classList.remove('capturing');
    gpsBtn.disabled = false;
    gpsBtn.innerHTML = '<i class="fas fa-check"></i> Location Captured';

    gpsDisplay.classList.add('captured');

    const accuracyStatus = currentGPS.accuracy < 20 ? '✓ High' : currentGPS.accuracy < 50 ? '⚠️ Medium' : '⚠️ Low';
    gpsDisplay.innerHTML = `
        <small>
            <strong>${accuracyStatus} Accuracy</strong><br>
            📍 ${currentGPS.latitude.toFixed(6)}, ${currentGPS.longitude.toFixed(6)}<br>
            Accuracy: ±${Math.round(currentGPS.accuracy)}m
        </small>
    `;

    // Update validation
    validateField('gps');

    // Re-run location validation
    if (uploadedImage) {
        validateLocation();
        updateValidationScore();
    }

    // Re-validate form
    validateForm();
}

async function submitIncidentReport() {
    console.log('📤 Submitting incident report to Supabase...');

    // Show loading state
    const submitBtn = document.getElementById('submitIncident');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized. Please check your API keys.');
        }

        // 1. Upload Image to Supabase Storage
        const file = uploadedImage.file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('incident-images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('incident-images')
            .getPublicUrl(filePath);

        // 2. Insert Record into Supabase Database
        const { data: insertData, error: insertError } = await supabase
            .from('incidents')
            .insert([
                {
                    type: document.getElementById('incidentType').value,
                    ward: document.getElementById('incidentWard').selectedOptions[0].text,
                    description: document.getElementById('incidentDescription').value || '',
                    image_url: publicUrl,
                    image_filename: fileName,
                    gps_latitude: currentGPS ? currentGPS.latitude : null,
                    gps_longitude: currentGPS ? currentGPS.longitude : null,
                    gps_accuracy: currentGPS ? currentGPS.accuracy : null,
                    validation_overall_score: parseInt(document.getElementById('scoreValue').textContent) || 0,
                    status: 'pending'
                }
            ])
            .select();

        if (insertError) throw insertError;

        console.log('✅ Incident submitted successfully:', insertData);

        // Create incident object for frontend display
        const newIncident = {
            id: insertData[0].id,
            type: insertData[0].type,
            status: 'pending',
            ward: insertData[0].ward,
            time: 'Just now',
            severity: calculateSeverityFromScore(insertData[0].validation_overall_score),
            description: insertData[0].description,
            image: publicUrl,
            validationScore: insertData[0].validation_overall_score
        };

        // Add to incidents data
        incidentsData.unshift(newIncident);
        renderIncidents();

        // Close modal & Reset
        document.getElementById('uploadModal').classList.remove('show');
        resetUploadForm();

        // Success Message
        alert('✅ Incident reported successfully!\n\nSaved to Supabase Cloud Database.\nAuthorities will review your submission.');
        switchPanel('incidents');

    } catch (error) {
        console.error('❌ Error submitting incident:', error);
        alert(`❌ Failed to submit incident:\n${error.message}\n\nPlease check your Supabase API keys in app.js`);

        // Restore button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Helper function to calculate severity from validation score
function calculateSeverityFromScore(score) {
    if (score >= 80) return 1;
    if (score >= 60) return 2;
    return 3;
}

function resetUploadForm() {
    // Stop camera and location tracking
    stopCamera();
    stopLocationWatch();

    uploadedImage = null;
    currentGPS = null;
    validationResults = {
        timestamp: null,
        aiGenerated: null,
        location: null,
        quality: null
    };

    document.getElementById('incidentUploadForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('cameraPlaceholder').style.display = 'block';
    document.getElementById('cameraStream').style.display = 'none';
    document.getElementById('validationPanel').style.display = 'none';
    document.getElementById('submitIncident').disabled = true;

    // Clear error messages
    const errorElements = ['imageError', 'wardError', 'typeError', 'gpsError'];
    errorElements.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.style.display = 'none';
            elem.textContent = '';
        }
    });

    // Reset GPS display
    const gpsBtn = document.getElementById('captureGPS');
    const gpsDisplay = document.getElementById('gpsDisplay');
    if (gpsBtn) {
        gpsBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Capture Location';
        gpsBtn.classList.remove('capturing');
        gpsBtn.disabled = false;
    }
    if (gpsDisplay) {
        gpsDisplay.classList.remove('captured');
        gpsDisplay.innerHTML = '<small>Location not captured</small>';
    }
}

// Initialize upload modal on load
document.addEventListener('DOMContentLoaded', () => {
    initializeUploadModal();
});

console.log('🌧️ Delhi Monsoon Dashboard Script Loaded');
