/******************************************************
 * Enhanced Project Portal - Optimized Frontend
 * Fast, Cached, and Reliable
 ******************************************************/

// ============= CONFIGURATION ===================
const API_URL = "https://script.google.com/macros/s/AKfycbzE9qCaHYQLLFsnZUPeAvUV1HEq5i3oT5-ZMRC01yoh1CAb657_0yZzXpvX9-E5GJe5/exec";

// Cache duration - 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;

// ============= CACHE SYSTEM ====================
const frontendCache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(`portal_cache_${key}`);
      if (item) {
        const { data, expiry } = JSON.parse(item);
        if (Date.now() < expiry) {
          console.log('Cache hit:', key);
          return data;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return null;
  },
  
  set: (key, data, duration = CACHE_DURATION) => {
    try {
      const item = {
        data: data,
        expiry: Date.now() + duration
      };
      localStorage.setItem(`portal_cache_${key}`, JSON.stringify(item));
      console.log('Cache set:', key);
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  },
  
  clear: () => {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('portal_cache_'))
        .forEach(key => localStorage.removeItem(key));
      console.log('Frontend cache cleared');
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
  }
};

// ============= STATE MANAGEMENT ====================
let _managerData = null;
let _currentAuth = null;
let _charts = {};
let currentUnits = [];
let contactData = {};

// ============= UTILITY FUNCTIONS ====================
const clampPct = v => { 
    const n = Number(String(v ?? 0).replace('%','')); 
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, Math.round(n))); 
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

const setHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
};

// ============= OPTIMIZED API FUNCTIONS ====================
async function apiCall(action, params = {}, useCache = true) {
  const cacheKey = `${action}_${JSON.stringify(params)}`;
  
  // Check cache first
  if (useCache) {
    const cached = frontendCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  try {
    const urlParams = new URLSearchParams({
      action: action,
      timestamp: Date.now(), // Prevent caching
      ...params
    });
    
    console.log(`API Call: ${action}`, params);
    
    const startTime = Date.now();
    const response = await fetch(`${API_URL}?${urlParams}`);
    const data = await response.json();
    const endTime = Date.now();
    
    console.log(`API Response (${endTime - startTime}ms):`, data);
    
    // Cache successful responses
    if (data.ok && useCache) {
      frontendCache.set(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    return { 
      ok: false, 
      error: 'Network error - Please check your connection',
      details: error.message 
    };
  }
}

// Specific API functions
async function authenticate(username, password) {
  return apiCall('authenticate', { username, password }, false); // No cache for auth
}

async function getClientReport(sd06Code) {
  return apiCall('getClientReport', { sd06Code });
}

async function getManagerDashboard() {
  return apiCall('getManagerDashboard');
}

async function getContactData() {
  return apiCall('getContactData');
}

async function pingAPI() {
  return apiCall('ping', {}, false);
}

// ============= AUTHENTICATION & SESSION ====================
// Auto-login on page load
(function() {
  try {
    const saved = JSON.parse(localStorage.getItem('portal_auth_v3') || 'null');
    if (saved && saved.u && saved.p) {
      const u = atob(saved.u), p = atob(saved.p);
      console.log('Auto-login attempt for:', u);
      authenticate(u, p).then(res => onAuth(res, true, saved));
    }
  } catch (e) {
    console.warn('Auto-login error:', e);
  }
})();

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  const remember = document.getElementById('rememberMe').checked;
  
  if (!u || !p) {
    showError('Please enter both username and password');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.textContent = 'Signing in...';
  submitBtn.disabled = true;
  
  try {
    const res = await authenticate(u, p);
    onAuth(res, remember, { u: btoa(u), p: btoa(p) });
  } catch (error) {
    showError('Login failed: ' + error.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

async function onAuth(res, remember, creds) {
  if (!res || !res.ok) { 
    showError(res?.error || 'Login failed - Please check your credentials');
    return; 
  }
  
  console.log('Auth successful:', res);
  
  // Pre-load contact data
  const contactRes = await getContactData();
  if (contactRes.ok) {
    contactData = contactRes.contacts || {};
    console.log('Contact data loaded:', Object.keys(contactData).length, 'contacts');
  }
  
  // Hide login, show appropriate dashboard
  document.getElementById('loginScreen').classList.add('hidden');
  
  if (remember && creds) { 
    localStorage.setItem('portal_auth_v3', JSON.stringify({ 
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
  // Clear all storage
  localStorage.removeItem('portal_auth_v3');
  frontendCache.clear();
  
  // Reset state
  _managerData = null;
  _currentAuth = null;
  currentUnits = [];
  contactData = {};
  
  // Destroy charts
  Object.values(_charts).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  });
  _charts = {};
  
  // Show login screen
  document.getElementById('clientDashboard').classList.add('hidden');
  document.getElementById('managerDashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  
  // Reset form
  document.getElementById('loginForm').reset();
}

// ============= CLIENT DASHBOARD ====================
function loadClient(auth) {
  setTxt('welcomeUser', `Welcome, ${auth.name}`);
  
  // Clear previous tabs
  setHTML('unitTabsContainer', '');
  
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
    showError('No unit information available for this user');
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
    showLoading('unitContent');
    const data = await getClientReport(sd06Code);
    
    if (!data.ok) {
      throw new Error(data?.error || 'Failed to load unit data');
    }
    
    renderClient(data);
    document.getElementById('unitContent').classList.add('fade-in');
  } catch (error) {
    console.error('Unit load error:', error);
    setHTML('unitContent', `
      <div class="text-center py-12">
        <div class="text-red-500 text-lg mb-4">Error loading unit data</div>
        <div class="text-gray-600 mb-4">${error.message}</div>
        <button onclick="safeLoadUnit('${sd06Code}')" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          Try Again
        </button>
      </div>
    `);
  }
}

function showLoading(containerId) {
  setHTML(containerId, `
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
    </div>
  `);
}

function renderClient(d) {
  if (!d || !d.ok) { 
    showError('Client data not found');
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
  setTxt('clientNameValue', u.clientName || '--');
  setTxt('compoundValue', u.compound || '--');
  setTxt('unitTypeValue', u.unitType || '--');
  setTxt('unitNumberValue', u.unitNumber || '--');
  setTxt('floorsValue', u.floors || '--');
  setTxt('indoorAreaValue', u.areaIndoor || '--');
  setTxt('outdoorAreaValue', u.areaOutdoor || '--');

  // Project Details
  setTxt('designTypeVal', design.designType || '--');
  setTxt('designStatusVal', design.designStatus || '--');
  setTxt('projectStatusVal', design.projectStatus || '--');

  // Progress Section
  const completion = clampPct(ex?.completion);
  animateCircle('progressCircle', 'progressPercentage', completion);
  
  // Set status chip
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
  
  setTxt('plannedStartDate', planned.start ? formatDate(planned.start) : '--');
  setTxt('plannedEndDate', planned.end ? formatDate(planned.end) : '--');
  setTxt('plannedDuration', calculateDuration(planned.start, planned.end));
  
  setTxt('actualStartDate', actual.start ? formatDate(actual.start) : '--');
  setTxt('actualEndDate', actual.end ? formatDate(actual.end) : 'In Progress');
  
  const timelineProgress = hasExecutionData ? calculateTimelineProgress(actual.start, actual.end) : 0;
  setTxt('timelineProgress', `${timelineProgress}%`);

  // Render Gantt Chart
  renderEnhancedGanttChart(planned, actual);

  // Work Progress Breakdown
  renderWorkProgress(ex.work || {}, currentPhase);

  // Team Information
  const team = ex.team || {};
  const engineeringTeamLeader = team.teamLeader || '--';
  const teamLeaderFromSD06 = u.teamLeader || '--';
  const accountManager = u.accountManager || '--';
  
  setTxt('teamLeaderName', engineeringTeamLeader);
  setTxt('teamLeaderNameTeam', teamLeaderFromSD06);
  setTxt('accountManagerNameTeam', accountManager);
  setTxt('siteManagerName', team.siteManager || '--');

  // Setup contact buttons
  setupContactButtons(teamLeaderFromSD06, accountManager);

  // 3D View
  setup3D(d.view3D);
}

// ============= MANAGER DASHBOARD ====================
async function loadManagerData() {
  try {
    showLoading('managerContent');
    const data = await getManagerDashboard();
    
    if (!data || !data.ok) { 
      throw new Error(data?.error || 'Failed to load manager data'); 
    }
    
    _managerData = data;
    renderManagerDashboard(data);
  } catch (error) {
    console.error('Manager data load error:', error);
    setHTML('managerContent', `
      <div class="text-center py-12">
        <div class="text-red-500 text-lg mb-4">Error loading manager data</div>
        <div class="text-gray-600 mb-4">${error.message}</div>
        <button onclick="loadManagerData()" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          Try Again
        </button>
      </div>
    `);
  }
}

function renderManagerDashboard(data) {
  const projects = data.projects || [];
  const totals = data.totals || {};
  const summary = data.summary || {};
  
  console.log('Rendering manager dashboard:', { projects: projects.length, totals, summary });

  // Update quick stats
  setTxt('totalProjectsCount', projects.length);
  setTxt('avgProgressValue', (totals.avgProgress || 0) + '%');
  setTxt('totalValueAmount', formatCurrency(totals.totalValue || 0));
  
  // Calculate active teams
  const teams = new Set();
  projects.forEach(p => {
    if (p.teamLeader && p.teamLeader !== 'Unassigned') {
      teams.add(p.teamLeader);
    }
  });
  setTxt('activeTeamsCount', teams.size);
  
  // Render projects grid
  renderProjectsGrid(projects);
  
  // Render summary cards
  renderSummaryCards(summary, totals);
}

function renderSummaryCards(summary, totals) {
  const statsContainer = document.getElementById('managerStats');
  if (!statsContainer) return;
  
  statsContainer.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow">
        <div class="text-white/80 text-sm">Total Projects</div>
        <div class="text-3xl font-extrabold">${summary.totalProjects || 0}</div>
      </div>
      <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow">
        <div class="text-white/80 text-sm">On Time</div>
        <div class="text-3xl font-extrabold">${summary.onTime || 0}</div>
      </div>
      <div class="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow">
        <div class="text-white/80 text-sm">Delayed</div>
        <div class="text-3xl font-extrabold">${summary.delayed || 0}</div>
      </div>
      <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 text-white shadow">
        <div class="text-white/80 text-sm">Critical</div>
        <div class="text-3xl font-extrabold">${summary.critical || 0}</div>
      </div>
    </div>
  `;
}

function renderProjectsGrid(projects) {
  const grid = document.getElementById('m_projects');
  
  if (!projects || projects.length === 0) {
    grid.innerHTML = `
      <div class="col-span-3 text-center py-12">
        <div class="text-gray-500 text-lg mb-4">No projects found</div>
        <div class="text-sm text-gray-400">
          Check if the Google Sheets has data in the Execution sheet
        </div>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = projects.map(p => {
    const status = p.status || 'No Status';
    const progress = p.progress || 0;
    
    // Determine status color
    let statusClass = 'bg-blue-100 text-blue-800';
    if (status.toLowerCase().includes('complete')) statusClass = 'bg-green-100 text-green-800';
    else if (status.toLowerCase().includes('delay')) statusClass = 'bg-amber-100 text-amber-800';
    else if (status.toLowerCase().includes('critical')) statusClass = 'bg-red-100 text-red-800';
    
    // Determine progress color
    let progressClass = 'bg-red-500';
    if (progress >= 80) progressClass = 'bg-green-500';
    else if (progress >= 50) progressClass = 'bg-amber-500';
    
    return `
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <h4 class="font-bold text-gray-900 text-lg mb-1">${p.client}</h4>
            <p class="text-sm text-gray-600 mb-1">${p.compound}</p>
            <p class="text-xs text-gray-500">SD06: ${p.sd06Code}</p>
            ${p.phase ? `<p class="text-xs text-purple-600 font-medium mt-1">${p.phase}</p>` : ''}
          </div>
          <div class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
            ${status}
          </div>
        </div>
        
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-600">Progress</span>
            <span class="font-semibold ${progress >= 80 ? 'text-green-600' : progress >= 50 ? 'text-amber-600' : 'text-red-600'}">
              ${progress}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div class="h-3 rounded-full transition-all duration-500 ${progressClass}" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p class="text-gray-600 text-xs">Start</p>
            <p class="font-semibold text-xs">${p.startDate || '--'}</p>
          </div>
          <div>
            <p class="text-gray-600 text-xs">End</p>
            <p class="font-semibold text-xs">${p.endDate || '--'}</p>
          </div>
          <div>
            <p class="text-gray-600 text-xs">Value</p>
            <p class="font-semibold text-xs">${formatCurrency(p.value)}</p>
          </div>
          <div>
            <p class="text-gray-600 text-xs">Paid</p>
            <p class="font-semibold text-xs text-green-600">${formatCurrency(p.paid)}</p>
          </div>
        </div>
        
        <div class="flex justify-between items-center text-xs text-gray-500 mb-3">
          <span>Team: ${p.teamLeader || '--'}</span>
          <span>Site: ${p.siteManager || '--'}</span>
        </div>
        
        <button onclick="openProjectDetail('${p.sd06Code}')" 
                class="w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all">
          View Details
        </button>
      </div>
    `;
  }).join('');
}

// ============= HELPER FUNCTIONS ====================
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

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    return isNaN(date) ? dateStr : date.toLocaleDateString('en-GB');
  } catch {
    return dateStr;
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

// ============= WORK PROGRESS RENDERER ====================
function renderWorkProgress(work, phase) {
  const grid = document.getElementById('workGrid');
  let workItems = [];

  if (phase === 'Phase 1') {
    workItems = [
      ['🏗️ New Construction', work.newConstruction, 'from-amber-50 to-yellow-50', 'text-amber-800', 'bg-amber-500'],
      ['🚿 Plumbing', work.plumbing, 'from-blue-50 to-indigo-50', 'text-blue-800', 'bg-blue-500'],
      ['⚡ Electrical', work.electrical, 'from-yellow-50 to-amber-50', 'text-yellow-800', 'bg-yellow-500'],
      ['❄️ AC Installation', work.acInstallation, 'from-cyan-50 to-blue-50', 'text-cyan-800', 'bg-cyan-500'],
      ['🧱 Plastering', work.plastering, 'from-gray-50 to-slate-50', 'text-gray-800', 'bg-gray-500'],
      ['🏗️ Gypsum Board', work.gypsumBoard, 'from-slate-50 to-gray-50', 'text-slate-800', 'bg-slate-500'],
      ['🏺 Ceramic', work.ceramic, 'from-red-50 to-rose-50', 'text-red-800', 'bg-red-500'],
      ['💎 Marble', work.marble, 'from-purple-50 to-violet-50', 'text-purple-800', 'bg-purple-500'],
      ['🎨 Painting Prep', work.paintingPrep, 'from-green-50 to-emerald-50', 'text-green-800', 'bg-green-500']
    ];
  } else if (phase === 'Phase 2') {
    workItems = [
      ['🪵 Wooden', work.wooden, 'from-amber-50 to-orange-50', 'text-amber-800', 'bg-amber-500'],
      ['🏠 LC/Smart', work.lcSmart, 'from-indigo-50 to-purple-50', 'text-indigo-800', 'bg-indigo-500'],
      ['⚡ Elec 2', work.elec2, 'from-yellow-50 to-amber-50', 'text-yellow-800', 'bg-yellow-500'],
      ['🚿 Plumbing 2', work.plumbing2, 'from-blue-50 to-indigo-50', 'text-blue-800', 'bg-blue-500'],
      ['🔌 Futec', work.futec, 'from-purple-50 to-violet-50', 'text-purple-800', 'bg-purple-500'],
      ['🏗️ Gypsum Cladding', work.gypsumCladding, 'from-gray-50 to-slate-50', 'text-gray-800', 'bg-gray-500'],
      ['🔒 Security', work.security, 'from-red-50 to-rose-50', 'text-red-800', 'bg-red-500'],
      ['💎 Marble 2', work.marble2, 'from-purple-50 to-violet-50', 'text-purple-800', 'bg-purple-500'],
      ['🏡 Exterior', work.exterior, 'from-green-50 to-emerald-50', 'text-green-800', 'bg-green-500'],
      ['❄️ HVAC 2', work.hvac2, 'from-cyan-50 to-blue-50', 'text-cyan-800', 'bg-cyan-500'],
      ['🍳 Kitchen', work.kitchen, 'from-orange-50 to-amber-50', 'text-orange-800', 'bg-orange-500'],
      ['🪨 Granite', work.granite, 'from-stone-50 to-gray-50', 'text-stone-800', 'bg-stone-500'],
      ['🎨 Painting 2', work.painting2, 'from-green-50 to-emerald-50', 'text-green-800', 'bg-green-500']
    ];
  }

  grid.innerHTML = workItems.map(([name, val, bgClass, textClass, progressClass]) => {
    const v = clampPct(val);
    return `<div class="space-y-4 p-4 bg-gradient-to-br ${bgClass} rounded-2xl border shadow-lg">
      <div class="flex justify-between items-center">
        <span class="text-sm font-semibold ${textClass}">${name}</span>
        <span class="text-lg font-bold ${textClass}">${v}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-4">
        <div class="h-4 rounded-full transition-all duration-500 ${progressClass}" style="width:${v}%"></div>
      </div>
    </div>`;
  }).join('');
}

// ============= CONTACT SYSTEM ====================
function setupContactButtons(teamLeader, accountManager) {
  // Team Leader Contact
  if (teamLeader && teamLeader !== '--') {
    const teamLeaderCard = document.querySelector('#teamLeaderNameTeam')?.closest('.contact-card');
    if (teamLeaderCard) {
      teamLeaderCard.style.cursor = 'pointer';
      teamLeaderCard.onclick = () => showContactInfo(teamLeader, 'Team Leader');
      teamLeaderCard.title = `Click to contact ${teamLeader}`;
    }
  }
  
  // Account Manager Contact
  if (accountManager && accountManager !== '--') {
    const accountManagerCard = document.querySelector('#accountManagerNameTeam')?.closest('.contact-card');
    if (accountManagerCard) {
      accountManagerCard.style.cursor = 'pointer';
      accountManagerCard.onclick = () => showContactInfo(accountManager, 'Account Manager');
      accountManagerCard.title = `Click to contact ${accountManager}`;
    }
  }
}

function showContactInfo(name, role) {
  if (!name || name === '--') {
    alert(`No ${role} assigned`);
    return;
  }
  
  // البحث عن الرقم في بيانات الاتصال
  let phoneNumber = contactData[name];
  
  // إذا لم يتم العثور، جرب البحث بأجزاء من الاسم
  if (!phoneNumber) {
    const nameParts = name.split(' ');
    for (const part of nameParts) {
      if (part.length > 2) {
        phoneNumber = contactData[part];
        if (phoneNumber) break;
      }
    }
  }
  
  // إذا لم يتم العثور بعد، ابحث في كل المفاتيح
  if (!phoneNumber) {
    for (const [contactName, number] of Object.entries(contactData)) {
      if (name.toLowerCase().includes(contactName.toLowerCase()) || 
          contactName.toLowerCase().includes(name.toLowerCase())) {
        phoneNumber = number;
        break;
      }
    }
  }
  
  if (phoneNumber) {
    const message = `${role}: ${name}\nPhone: ${phoneNumber}\n\nDo you want to call or message?`;
    if (confirm(message)) {
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      window.open(`tel:${cleanPhone}`, '_blank');
    }
  } else {
    const availableContacts = Object.keys(contactData).length > 0 ? 
      `Available contacts: ${Object.keys(contactData).join(', ')}` : 
      'No contacts available in database';
    alert(`${role}: ${name}\nPhone number not found.\n\n${availableContacts}`);
  }
}

// ============= 3D VIEW ====================
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

// ============= GANTT CHART ====================
function renderEnhancedGanttChart(planned, actual) {
  const container = document.getElementById('ganttContainer');
  
  if (!planned.start || !planned.end) {
    container.innerHTML = '<div class="text-center text-gray-500 py-8">No timeline data available</div>';
    return;
  }
  
  // تبسيط الـ Gantt Chart للسرعة
  container.innerHTML = `
    <div class="bg-gray-100 rounded-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <span class="text-sm font-semibold text-blue-600">Planned</span>
        <span class="text-sm font-semibold text-green-600">Actual</span>
      </div>
      <div class="space-y-3">
        <div class="flex items-center">
          <div class="w-20 text-sm text-gray-600">Start:</div>
          <div class="flex-1">
            <div class="text-sm">${planned.start || '--'}</div>
            <div class="text-sm text-green-600">${actual.start || '--'}</div>
          </div>
        </div>
        <div class="flex items-center">
          <div class="w-20 text-sm text-gray-600">End:</div>
          <div class="flex-1">
            <div class="text-sm">${planned.end || '--'}</div>
            <div class="text-sm text-green-600">${actual.end || 'In Progress'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============= MODAL FUNCTIONS ====================
function openProjectDetail(sd06Code) {
  const project = _managerData?.projects.find(p => p.sd06Code === sd06Code);
  if (!project) {
    alert('Project details not available');
    return;
  }
  
  document.getElementById('projectDetailTitle').textContent = `Project Details - ${project.client}`;
  
  const content = document.getElementById('projectDetailContent');
  content.innerHTML = `
    <div class="space-y-6">
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
            <div class="flex justify-between"><span>Progress:</span><span class="font-semibold text-green-600">${project.progress}%</span></div>
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
        <button onclick="closeProjectDetailModal()" class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('projectDetailModal').classList.remove('hidden');
}

function closeProjectDetailModal() {
  document.getElementById('projectDetailModal').classList.add('hidden');
}

// ============= ACTION FUNCTIONS ====================
function refreshManagerData() {
  frontendCache.clear();
  loadManagerData();
}

function exportToExcel() {
  alert('Export feature would open the Google Sheets document');
  window.open(`https://docs.google.com/spreadsheets/d/${SHEET_ID}`, '_blank');
}

function criticalAlerts() {
  const criticalProjects = _managerData ? _managerData.projects.filter(p => 
    p.status.toLowerCase().includes('critical')
  ) : [];
  
  if (criticalProjects.length === 0) {
    alert('🎉 No critical projects found! All projects are running smoothly.');
  } else {
    const alertMessage = `🚨 CRITICAL ALERTS\n\n${criticalProjects.length} project(s) need immediate attention:\n\n` +
      criticalProjects.map(p => `• ${p.client} - ${p.compound} (${p.progress}%)`).join('\n');
    alert(alertMessage);
  }
}

// ============= INITIALIZATION ====================
console.log('Construction Portal Frontend Loaded');
