/******************************************************
 * Enhanced Project Portal - Frontend JS
 * Connected to Google Apps Script API
 * Author: PlanSee Interiors
 ******************************************************/

// ============= CONFIG ===================
const API_URL = "https://script.google.com/macros/s/AKfycbwne7D4VnmdkIJ2Q7qGSB6PYmKhUA2sQpci3s7bswRLM2GfkCv0s3Q9BbfeoI-vb1-B/exec";

// ============= STATE ====================
let _managerData = null;
let _currentAuth = null;
let _charts = {};
let currentUnits = [];
let contactData = {}; // لتخزين بيانات الاتصال

// ============= UTILITY FUNCTIONS ====================
const clampPct = v => { 
    const n = Number(String(v ?? 0).replace('%','')); 
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, Math.round(n))); 
};

const statusKey = s => { 
    const x = String(s || '').toLowerCase(); 
    if (x.includes('done')||x.includes('complete')) return 'completed'; 
    if (x.includes('critical')||x.includes('hold')) return 'critical'; 
    if (x.includes('delay')||x.includes('not')) return 'delayed'; 
    return 'on-time'; 
};

const formatCurrency = amount => {
    const n = Number(amount);
    if (!isFinite(n)) return '--';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(n);
};

const setTxt = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = (v ?? '--');
};

// Function to get last Sunday
function getLastSunday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek;
    const lastSunday = new Date(today.setDate(diff));
    return lastSunday.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// ============= API FUNCTIONS ====================
async function apiCall(action, params = {}) {
    try {
        const urlParams = new URLSearchParams({
            action: action,
            ...params
        });
        
        const response = await fetch(`${API_URL}?${urlParams}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        return { ok: false, error: 'Network error' };
    }
}

// ============= AUTHENTICATION ====================
async function authenticate(username, password) {
    const data = await apiCall('authenticate', { username, password });
    return data;
}

async function getClientReport(sd06Code) {
    const data = await apiCall('getClientReport', { sd06Code });
    return data;
}

async function getManagerDashboard() {
    const data = await apiCall('getManagerDashboard');
    return data;
}

async function exportProjectsToExcel() {
    const data = await apiCall('exportProjectsToExcel');
    return data;
}

async function getContactData() {
    const data = await apiCall('getContactData');
    return data;
}

// ============= LOGIN & AUTH ====================
(function() {
    try {
        const saved = JSON.parse(localStorage.getItem('enhancedPortalRememberV7') || 'null');
        if (saved && saved.u && saved.p) {
            const u = atob(saved.u), p = atob(saved.p);
            authenticate(u, p).then(res => onAuth(res, true, saved));
        }
    } catch (e) {}
})();

document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    const remember = document.getElementById('rememberMe').checked;
    
    const res = await authenticate(u, p);
    onAuth(res, remember, { u: btoa(u), p: btoa(p) });
});

async function onAuth(res, remember, creds) {
    if (!res || !res.ok) { 
        alert(res?.error || 'Login failed'); 
        return; 
    }
    
    // جلب بيانات الاتصال أولاً
    const contactRes = await getContactData();
    if (contactRes.ok) {
        contactData = contactRes.contacts || {};
    }
    
    document.getElementById('loginScreen').classList.add('hidden');
    if (remember && creds) { 
        localStorage.setItem('enhancedPortalRememberV7', JSON.stringify({ 
            u: creds.u, 
            p: creds.p, 
            role: res.role 
        })); 
    }
    
    _currentAuth = res;
    
    // Set last update date
    const lastUpdate = getLastSunday();
    setTxt('lastUpdate', `Last updated: ${lastUpdate}`);
    setTxt('managerLastUpdate', `Last updated: ${lastUpdate}`);
    
    if (res.role === 'manager') {
        document.getElementById('managerDashboard').classList.remove('hidden');
        loadManagerData();
    } else {
        document.getElementById('clientDashboard').classList.remove('hidden');
        loadClient(res);
    }
}

function logout() {
    localStorage.removeItem('enhancedPortalRememberV7');
    document.getElementById('clientDashboard').classList.add('hidden');
    document.getElementById('managerDashboard').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    _managerData = null;
    _currentAuth = null;
    currentUnits = [];
    contactData = {};
    
    // Destroy charts
    Object.values(_charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    _charts = {};
}

// ============= CLIENT DASHBOARD FUNCTIONS ====================
function loadClient(auth) {
    setTxt('welcomeUser', `Welcome, ${auth.name}`);
    
    // Clear any existing unit tabs
    document.getElementById('unitTabsContainer').innerHTML = '';
    
    if (auth.units && auth.units.length > 1) {
        setTxt('dashboardTitle', `${auth.name}'s Portfolio`);
        setTxt('dashboardSubtitle', `${auth.units.length} Units Overview`);
        setTxt('unitCount', `Units: ${auth.units.length}`);
        setupUnitTabs(auth.units);
        switchUnit(auth.units[0].sd06Code);
    } else if (auth.units && auth.units.length === 1) {
        const unit = auth.units[0];
        setTxt('dashboardTitle', `${unit.unitName || 'Unit'} Details`);
        setTxt('dashboardSubtitle', unit.compound ? `at ${unit.compound}` : 'Project Details');
        setTxt('unitCount', '');
        document.getElementById('unitTabs').classList.add('hidden');
        safeLoadUnit(unit.sd06Code);
    } else if (auth.sd06Code) {
        setTxt('dashboardTitle', 'Unit Details');
        setTxt('dashboardSubtitle', 'Project Overview');
        setTxt('unitCount', '');
        document.getElementById('unitTabs').classList.add('hidden');
        safeLoadUnit(auth.sd06Code);
    } else {
        alert('No unit information available for this user');
    }
}

function setupUnitTabs(units) {
    const tabsSection = document.getElementById('unitTabs');
    const container = document.getElementById('unitTabsContainer');
    tabsSection.classList.remove('hidden');
    container.innerHTML = units.map((unit, index) => {
        const isActive = index === 0 ? 'active' : '';
        const title = unit.compound || unit.unitName || unit.sd06Code;
        const sub = unit.unitName && unit.compound ? unit.unitName : '';
        return `<button class="unit-tab ${isActive}" onclick="switchUnit('${unit.sd06Code}')" data-unit="${unit.sd06Code}">
            <div class="text-sm font-semibold">${title}</div>
            ${sub ? `<div class="text-xs text-gray-600">${sub}</div>` : ''}
        </button>`;
    }).join('');
}

function switchUnit(sd06Code) {
    document.querySelectorAll('.unit-tab').forEach(tab => tab.classList.remove('active'));
    const selected = document.querySelector(`[data-unit="${sd06Code}"]`);
    if (selected) selected.classList.add('active');
    
    document.getElementById('unitContent').classList.remove('fade-in');
    setTimeout(() => {
        safeLoadUnit(sd06Code);
    }, 50);
}

async function safeLoadUnit(sd06Code) {
    try {
        const data = await getClientReport(sd06Code);
        if (!data.ok) {
            alert('Error loading unit data: ' + (data?.error || 'Unknown error'));
            return;
        }
        renderClient(data);
        document.getElementById('unitContent').classList.add('fade-in');
    } catch (error) {
        alert('Error loading unit data: ' + error.message);
        document.getElementById('unitContent').classList.add('fade-in');
    }
}

function renderClient(d) {
    if (!d || !d.ok) { 
        alert('Client data not found'); 
        return; 
    }
    
    const u = d.unit || {};
    const design = d.design || {};
    const ex = d.execution || {};
    const timeline = d.executionTimeline || {};
    const currentPhase = d.currentPhase || 'Phase 1';

    // Update phase labels
    setTxt('currentPhaseLabel', currentPhase);
    setTxt('workPhaseLabel', currentPhase);

    // Unit Information
    setTxt('clientNameValue', u.clientName);
    setTxt('compoundValue', u.compound);
    setTxt('unitTypeValue', u.unitType);
    setTxt('unitNumberValue', u.unitNumber);
    setTxt('floorsValue', u.floors);
    setTxt('indoorAreaValue', u.areaIndoor);
    setTxt('outdoorAreaValue', u.areaOutdoor);

    // Project Details
    setTxt('designTypeVal', design.designType || '--');
    setTxt('designStatusVal', design.designStatus || '--');
    setTxt('projectStatusVal', design.projectStatus || '--');

    // Progress Section
    const completion = clampPct(ex?.completion);
    animateCircle('progressCircle', 'progressPercentage', completion);
    
    // Set status chip and progress text based on execution data
    const hasExecutionData = ex && Object.keys(ex).length > 0;
    if (hasExecutionData) {
        setStatusChip(ex?.status);
        setTxt('overallProgressText', ex?.overallProgress || '');
    } else {
        document.getElementById('projectStatusChip').className = 'px-6 py-3 rounded-2xl text-sm font-semibold inline-block bg-blue-500/10 text-blue-700 mb-3';
        document.getElementById('projectStatusChip').textContent = 'IN PROGRESS';
        setTxt('overallProgressText', 'Project is currently in progress');
    }

    // Timeline
    const planned = timeline.planned || {};
    const actual = timeline.actual || {};
    
    setTxt('plannedStartDate', planned.start ? new Date(planned.start).toLocaleDateString() : '--');
    setTxt('plannedEndDate', planned.end ? new Date(planned.end).toLocaleDateString() : '--');
    setTxt('plannedDuration', calculateDuration(planned.start, planned.end));
    
    setTxt('actualStartDate', actual.start ? new Date(actual.start).toLocaleDateString() : '--');
    setTxt('actualEndDate', actual.end ? new Date(actual.end).toLocaleDateString() : 'In Progress');
    
    const timelineProgress = hasExecutionData ? calculateTimelineProgress(actual.start, actual.end) : 0;
    setTxt('timelineProgress', `${timelineProgress}%`);

    // Render Gantt Chart
    renderEnhancedGanttChart(planned, actual);

    // Work Progress Breakdown
    renderWorkProgress(ex.work || {}, currentPhase);

    // Team Information - التعديل الجديد لفصل Engineering Team Leader عن Team Leader
    const team = ex.team || {};
    
    // Engineering Team Leader (من Execution)
    const engineeringTeamLeader = team.teamLeader || '--';
    setTxt('teamLeaderName', engineeringTeamLeader);
    
    // Team Leader (من SD06)
    const teamLeaderFromSD06 = u.teamLeader || '--';
    setTxt('teamLeaderNameTeam', teamLeaderFromSD06);
    
    // Account Manager
    const accountManager = u.accountManager || '--';
    setTxt('accountManagerNameTeam', accountManager);
    
    setTxt('siteManagerName', team.siteManager || '--');

    // إضافة أرقام الهواتف
    setupContactButtons(teamLeaderFromSD06, accountManager);

    // 3D View
    setup3D(d.view3D);
}

// ============= ENHANCED GANTT CHART ====================
function renderEnhancedGanttChart(planned, actual) {
    const container = document.getElementById('ganttContainer');
    const timeline = document.getElementById('ganttTimeline');
    
    if (!planned.start || !planned.end) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8">No timeline data available</div>';
        timeline.innerHTML = '';
        return;
    }
    
    const plannedStart = new Date(planned.start);
    const plannedEnd = new Date(planned.end);
    const actualStart = actual.start ? new Date(actual.start) : null;
    const actualEnd = actual.end ? new Date(actual.end) : null;
    
    // إيجاد أقدم وأحدث تاريخ
    const allDates = [plannedStart, plannedEnd];
    if (actualStart) allDates.push(actualStart);
    if (actualEnd) allDates.push(actualEnd);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const totalDuration = maxDate - minDate;
    
    // حساب النسب المئوية للمواقع
    const calculatePosition = (date) => {
        return ((date - minDate) / totalDuration) * 100;
    };
    
    // إنشاء الجدول الزمني المحسن
    container.innerHTML = `
        <div class="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
            <!-- الخط الزمني الأساسي -->
            <div class="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2"></div>
            
            <!-- Planned Timeline -->
            <div class="absolute top-1/4 h-4 bg-blue-500 rounded-full transform -translate-y-1/2" 
                 style="left: ${calculatePosition(plannedStart)}%; width: ${calculatePosition(plannedEnd) - calculatePosition(plannedStart)}%">
                <div class="absolute -top-6 left-0 right-0 text-center text-xs text-blue-600 font-medium">
                    Planned
                </div>
                <div class="absolute -top-12 left-0 text-xs text-blue-500">
                    ${plannedStart.toLocaleDateString()}
                </div>
                <div class="absolute -top-12 right-0 text-xs text-blue-500">
                    ${plannedEnd.toLocaleDateString()}
                </div>
            </div>
            
            <!-- Actual Timeline -->
            ${actualStart ? `
            <div class="absolute top-3/4 h-4 bg-green-500 rounded-full transform -translate-y-1/2" 
                 style="left: ${calculatePosition(actualStart)}%; width: ${calculatePosition(actualEnd || new Date()) - calculatePosition(actualStart)}%">
                <div class="absolute -bottom-6 left-0 right-0 text-center text-xs text-green-600 font-medium">
                    Actual
                </div>
                <div class="absolute -bottom-12 left-0 text-xs text-green-500">
                    ${actualStart.toLocaleDateString()}
                </div>
                ${actualEnd ? `
                <div class="absolute -bottom-12 right-0 text-xs text-green-500">
                    ${actualEnd.toLocaleDateString()}
                </div>
                ` : `
                <div class="absolute -bottom-12 right-0 text-xs text-green-500">
                    In Progress
                </div>
                `}
            </div>
            ` : ''}
            
            <!-- العلامات الزمنية -->
            <div class="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                <span>${minDate.toLocaleDateString()}</span>
                <span>${maxDate.toLocaleDateString()}</span>
            </div>
        </div>
    `;
    
    // إنشاء المخطط الزمني التفصيلي
    const months = [];
    let currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
        months.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    timeline.innerHTML = months.map(date => `
        <div class="gantt-timeline-item" style="left: ${calculatePosition(date)}%;">
            ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </div>
    `).join('');
}

// ============= CONTACT BUTTONS SETUP ====================
function setupContactButtons(teamLeader, accountManager) {
    // Team Leader Contact Button
    const teamLeaderCard = document.querySelector('[onclick*="teamLeaderContact"]');
    if (teamLeaderCard) {
        teamLeaderCard.removeAttribute('onclick');
        teamLeaderCard.style.cursor = 'pointer';
        teamLeaderCard.onclick = () => showContactInfo(teamLeader, 'Team Leader');
    }
    
    // Account Manager Contact Button
    const accountManagerCard = document.querySelector('[onclick*="accountManagerContact"]');
    if (accountManagerCard) {
        accountManagerCard.removeAttribute('onclick');
        accountManagerCard.style.cursor = 'pointer';
        accountManagerCard.onclick = () => showContactInfo(accountManager, 'Account Manager');
    }
}

function showContactInfo(name, role) {
    if (!name || name === '--') {
        alert(`No ${role} assigned`);
        return;
    }
    
    const phoneNumber = contactData[name];
    if (phoneNumber) {
        const message = `${role}: ${name}\nPhone: ${phoneNumber}\n\nDo you want to call or message?`;
        if (confirm(message)) {
            // فتح تطبيق الهاتف
            window.open(`tel:${phoneNumber}`, '_blank');
        }
    } else {
        alert(`${role}: ${name}\nPhone number not available in contacts`);
    }
}

// ============= HELPER FUNCTIONS ====================
function renderWorkProgress(work, phase) {
    const grid = document.getElementById('workGrid');
    let workItems = [];

    if (phase === 'Phase 1') {
        workItems = [
            ['🏗️ New Construction', work.newConstruction, 'bg-gradient-to-br from-amber-50 to-yellow-50', 'text-amber-800'],
            ['🚿 Plumbing', work.plumbing, 'bg-gradient-to-br from-blue-50 to-indigo-50', 'text-blue-800'],
            ['⚡ Electrical', work.electrical, 'bg-gradient-to-br from-yellow-50 to-amber-50', 'text-yellow-800'],
            ['❄️ AC Installation', work.acInstallation, 'bg-gradient-to-br from-cyan-50 to-blue-50', 'text-cyan-800'],
            ['🧱 Plastering', work.plastering, 'bg-gradient-to-br from-gray-50 to-slate-50', 'text-gray-800'],
            ['🏗️ Gypsum Board', work.gypsumBoard, 'bg-gradient-to-br from-slate-50 to-gray-50', 'text-slate-800'],
            ['🏺 Ceramic', work.ceramic, 'bg-gradient-to-br from-red-50 to-rose-50', 'text-red-800'],
            ['💎 Marble', work.marble, 'bg-gradient-to-br from-purple-50 to-violet-50', 'text-purple-800'],
            ['🎨 Painting Prep', work.paintingPrep, 'bg-gradient-to-br from-green-50 to-emerald-50', 'text-green-800']
        ];
    } else if (phase === 'Phase 2') {
        workItems = [
            ['🪵 Wooden', work.wooden, 'bg-gradient-to-br from-amber-50 to-orange-50', 'text-amber-800'],
            ['🏠 LC/Smart', work.lcSmart, 'bg-gradient-to-br from-indigo-50 to-purple-50', 'text-indigo-800'],
            ['⚡ Elec 2', work.elec2, 'bg-gradient-to-br from-yellow-50 to-amber-50', 'text-yellow-800'],
            ['🚿 Plumbing 2', work.plumbing2, 'bg-gradient-to-br from-blue-50 to-indigo-50', 'text-blue-800'],
            ['🔌 Futec', work.futec, 'bg-gradient-to-br from-purple-50 to-violet-50', 'text-purple-800'],
            ['🏗️ Gypsum Cladding', work.gypsumCladding, 'bg-gradient-to-br from-gray-50 to-slate-50', 'text-gray-800'],
            ['🔒 Security', work.security, 'bg-gradient-to-br from-red-50 to-rose-50', 'text-red-800'],
            ['💎 Marble 2', work.marble2, 'bg-gradient-to-br from-purple-50 to-violet-50', 'text-purple-800'],
            ['🏡 Exterior', work.exterior, 'bg-gradient-to-br from-green-50 to-emerald-50', 'text-green-800'],
            ['❄️ HVAC 2', work.hvac2, 'bg-gradient-to-br from-cyan-50 to-blue-50', 'text-cyan-800'],
            ['🍳 Kitchen', work.kitchen, 'bg-gradient-to-br from-orange-50 to-amber-50', 'text-orange-800'],
            ['🪨 Granite', work.granite, 'bg-gradient-to-br from-stone-50 to-gray-50', 'text-stone-800'],
            ['🎨 Painting 2', work.painting2, 'bg-gradient-to-br from-green-50 to-emerald-50', 'text-green-800']
        ];
    }

    grid.innerHTML = workItems.map(([name, val, bgClass, textClass]) => {
        const v = clampPct(val);
        return `<div class="space-y-4 p-4 ${bgClass} rounded-2xl border shadow-lg">
            <div class="flex justify-between items-center">
                <span class="text-sm font-semibold ${textClass}">${name}</span>
                <span class="text-lg font-bold ${textClass}">${v}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4">
                <div class="h-4 rounded-full transition-all duration-500 ${textClass.replace('text-', 'bg-').replace('-800', '-500')}" style="width:${v}%"></div>
            </div>
        </div>`;
    }).join('');
}

function setup3D(url) {
    const card = document.getElementById('threeDCard');
    const iframe = document.getElementById('threeDIframe');
    const placeholder = document.getElementById('threeDPlaceholder');
    const clean = (url || '').trim();
    const ok = /^https?:\/\//i.test(clean);
    
    if (ok) {
        card.classList.remove('hidden');
        iframe.src = clean;
        iframe.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        card.classList.add('hidden');
        iframe.src = '';
    }
}

function calculateTimelineProgress(startStr, endStr) {
    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;
    const now = new Date();
    
    if (!start || !end || isNaN(start) || isNaN(end) || end <= start) return 0;
    
    const totalDuration = end - start;
    const elapsed = now - start;
    
    return Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 0), 100);
}

function formatDateRange(start, end) {
    if (!start && !end) return '--';
    const f = ds => {
        if (!ds) return '--';
        try {
            return new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return ds;
        }
    };
    return `${f(start)} - ${f(end)}`;
}

function calculateDuration(startStr, endStr) {
    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;
    if (!start || !end || isNaN(start) || isNaN(end)) return '--';
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
}

function setStatusChip(status) {
    const chip = document.getElementById('projectStatusChip');
    if (!chip) return;
    const s = (status || '').toLowerCase();
    let cls = 'bg-emerald-500/10 text-emerald-700', text = 'On Time';
    if (s.includes('complete')) { cls = 'bg-blue-500/10 text-blue-700'; text = 'Completed'; }
    else if (s.includes('critical')) { cls = 'bg-rose-500/10 text-rose-700'; text = 'Critical'; }
    else if (s.includes('delay')) { cls = 'bg-amber-500/10 text-amber-700'; text = 'Delayed'; }
    chip.className = `px-6 py-3 rounded-2xl text-sm font-semibold inline-block ${cls}`;
    chip.textContent = text;
}

function animateCircle(circleId, labelId, p) {
    const c = document.getElementById(circleId), l = document.getElementById(labelId);
    const r = 70, C = 2 * Math.PI * r;
    const target = Math.max(0, Math.min(100, p || 0));
    const offset = C - (target / 100) * C;
    if (c) c.style.strokeDashoffset = offset;
    if (l) l.textContent = target + '%';
}

// ============= MANAGER DASHBOARD FUNCTIONS ====================
async function loadManagerData() {
    try {
        const data = await getManagerDashboard();
        if (!data || !data.ok) { 
            alert('Failed to load manager data'); 
            return; 
        }
        _managerData = data;
        renderManagerDashboard(data);
    } catch (error) {
        alert('Error loading manager data: ' + error.message);
    }
}

function renderManagerDashboard(data) {
    const projects = data.projects || [];
    const totals = data.totals || {};
    
    // Update quick stats
    setTxt('totalProjectsCount', projects.length);
    setTxt('avgProgressValue', (totals.avgProgress || 0) + '%');
    setTxt('totalValueAmount', formatCurrency(totals.totalValue || 0));
    
    // Calculate active teams
    const teams = new Set();
    projects.forEach(p => {
        if (p.teamLeader) teams.add(p.teamLeader);
    });
    setTxt('activeTeamsCount', teams.size);
    
    // Render charts
    renderProgressChart(projects);
    renderStatusChart(projects);
    renderTeamPerformance(projects);
    
    // Render projects grid
    renderProjectsGrid(projects);
    
    // Setup team filter
    setupTeamFilter(projects);
}

// ... باقي دوال ال manager dashboard تبقى كما هي بدون تغيير ...
// [يتبع نفس الكود السابق للـ Manager Dashboard]

// ============= MODAL FUNCTIONS ====================
function openProjectDetail(sd06Code) {
    const project = _managerData.projects.find(p => p.sd06Code === sd06Code);
    if (!project) return;
    
    document.getElementById('projectDetailTitle').textContent = `Project Details - ${project.client}`;
    
    const content = document.getElementById('projectDetailContent');
    content.innerHTML = `
        <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-4">
                <h4 class="font-bold text-gray-900 text-lg">Basic Information</h4>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div class="flex justify-between"><span>Client:</span><span class="font-semibold">${project.client}</span></div>
                    <div class="flex justify-between"><span>Compound:</span><span class="font-semibold">${project.compound}</span></div>
                    <div class="flex justify-between"><span>SD06 Code:</span><span class="font-semibold">${project.sd06Code}</span></div>
                    <div class="flex justify-between"><span>Phase:</span><span class="font-semibold">${project.phase}</span></div>
                </div>
            </div>
            
            <div class="space-y-4">
                <h4 class="font-bold text-gray-900 text-lg">Progress & Status</h4>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div class="flex justify-between"><span>Execution Progress:</span><span class="font-semibold text-green-600">${project.progress}%</span></div>
                    <div class="flex justify-between"><span>Status:</span><span class="font-semibold">${project.status}</span></div>
                    <div class="flex justify-between"><span>Team Leader:</span><span class="font-semibold">${project.teamLeader || '--'}</span></div>
                    <div class="flex justify-between"><span>Site Manager:</span><span class="font-semibold">${project.siteManager || '--'}</span></div>
                </div>
            </div>
        </div>
        
        <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-4">
                <h4 class="font-bold text-gray-900 text-lg">Financial Information</h4>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div class="flex justify-between"><span>Contract Value:</span><span class="font-semibold">${formatCurrency(project.value)}</span></div>
                    <div class="flex justify-between"><span>Amount Paid:</span><span class="font-semibold text-green-600">${formatCurrency(project.paid)}</span></div>
                    <div class="flex justify-between"><span>Pending:</span><span class="font-semibold text-amber-600">${formatCurrency(project.value - project.paid)}</span></div>
                </div>
            </div>
            
            <div class="space-y-4">
                <h4 class="font-bold text-gray-900 text-lg">Timeline</h4>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div class="flex justify-between"><span>Start Date:</span><span class="font-semibold">${project.startDate}</span></div>
                    <div class="flex justify-between"><span>End Date:</span><span class="font-semibold">${project.endDate}</span></div>
                </div>
            </div>
        </div>
        
        <div class="flex gap-3 pt-4 border-t">
            <button onclick="generateProjectReport('${sd06Code}')" class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Generate Report
            </button>
            <button onclick="closeProjectDetailModal()" class="py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('projectDetailModal').classList.remove('hidden');
    document.getElementById('projectDetailModal').classList.add('flex');
}

function closeProjectDetailModal() {
    document.getElementById('projectDetailModal').classList.add('hidden');
    document.getElementById('projectDetailModal').classList.remove('flex');
}

function viewTeamDetails(teamLeader) {
    const teamProjects = _managerData.projects.filter(p => p.teamLeader === teamLeader);
    const totalProjects = teamProjects.length;
    const avgProgress = totalProjects ? Math.round(teamProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / totalProjects) : 0;
    const totalValue = teamProjects.reduce((sum, p) => sum + (p.value || 0), 0);
    
    document.getElementById('teamAnalyticsContent').innerHTML = `
        <div class="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl p-6 mb-6">
            <h4 class="text-2xl font-bold mb-2">${teamLeader}</h4>
            <p class="opacity-90">Team Performance Analytics</p>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-4 rounded-lg border text-center">
                <div class="text-2xl font-bold text-purple-600">${totalProjects}</div>
                <div class="text-sm text-gray-600">Total Projects</div>
            </div>
            <div class="bg-white p-4 rounded-lg border text-center">
                <div class="text-2xl font-bold text-green-600">${avgProgress}%</div>
                <div class="text-sm text-gray-600">Avg Progress</div>
            </div>
            <div class="bg-white p-4 rounded-lg border text-center">
                <div class="text-2xl font-bold text-blue-600">${formatCurrency(totalValue)}</div>
                <div class="text-sm text-gray-600">Total Value</div>
            </div>
            <div class="bg-white p-4 rounded-lg border text-center">
                <div class="text-2xl font-bold text-amber-600">${Math.round(totalValue / totalProjects) || 0}</div>
                <div class="text-sm text-gray-600">Avg Value/Project</div>
            </div>
        </div>
        
        <h5 class="font-bold text-gray-900 mb-4">Team Projects</h5>
        <div class="space-y-3 max-h-96 overflow-y-auto">
            ${teamProjects.map(p => `
                <div class="bg-gray-50 p-4 rounded-lg border">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold">${p.client}</span>
                        <span class="text-sm ${p.progress >= 80 ? 'text-green-600' : p.progress >= 50 ? 'text-amber-600' : 'text-red-600'}">${p.progress}%</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>${p.compound}</span>
                        <span>${p.phase}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('teamAnalyticsModal').classList.remove('hidden');
    document.getElementById('teamAnalyticsModal').classList.add('flex');
}

function closeTeamAnalyticsModal() {
    document.getElementById('teamAnalyticsModal').classList.add('hidden');
    document.getElementById('teamAnalyticsModal').classList.remove('flex');
}

// ============= ACTION FUNCTIONS ====================
function refreshManagerData() {
    loadManagerData();
}

async function exportToExcel() {
    try {
        const result = await exportProjectsToExcel();
        if (result && result.ok) {
            alert('Export successful!');
            window.open(result.url, '_blank');
        } else {
            alert('Export failed: ' + (result?.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Export error: ' + error.message);
    }
}

function generatePerformanceReport() {
    alert('Performance report generation started...');
}

function viewTeamAnalytics() {
    alert('Opening team analytics dashboard...');
}

function financialOverview() {
    alert('Displaying financial overview...');
}

function criticalAlerts() {
    const criticalProjects = _managerData ? _managerData.projects.filter(p => statusKey(p.status) === 'critical') : [];
    if (criticalProjects.length === 0) {
        alert('🎉 No critical projects found! All projects are running smoothly.');
    } else {
        const alertMessage = `🚨 CRITICAL ALERTS\n\n${criticalProjects.length} project(s) need immediate attention:\n\n` +
            criticalProjects.map(p => `• ${p.client} - ${p.compound} (${p.progress}%)`).join('\n');
        alert(alertMessage);
    }
}

function quickActions(sd06Code) {
    alert(`Quick actions for project ${sd06Code}`);
}

function generateProjectReport(sd06Code) {
    alert(`Generating report for project ${sd06Code}`);
}
