/******************************************************
 * ENHANCED PROJECT PORTAL - PROFESSIONAL FRONTEND
 * PlanSee Interiors - Optimized for Performance & UX
 ******************************************************/

// ============= CONFIGURATION & CONSTANTS =============
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwoVtdUl4nKCccGY2lRXZbEK5yJx_PP92I1DVtei9IXTEqO1pkJWb37nZx1-EUDasod/exec",
  REQUEST_TIMEOUT: 30000,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CONCURRENT_REQUESTS: 3
};

// ============= STATE MANAGEMENT =============
class AppState {
  static instance = null;
  
  constructor() {
    this._managerData = null;
    this._currentAuth = null;
    this._charts = new Map();
    this.currentUnits = [];
    this.contactData = {};
    this._requestQueue = new Map();
    this._cache = new Map();
  }
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new AppState();
    }
    return this.instance;
  }
  
  // Getters with validation
  get managerData() { return this._managerData; }
  set managerData(data) { this._managerData = this.validateData(data); }
  
  get currentAuth() { return this._currentAuth; }
  set currentAuth(auth) { this._currentAuth = this.validateAuth(auth); }
  
  validateData(data) {
    return data && typeof data === 'object' ? data : null;
  }
  
  validateAuth(auth) {
    return auth && auth.ok && auth.role ? auth : null;
  }
  
  // Cache management
  cacheSet(key, data, ttl = CONFIG.CACHE_TTL) {
    this._cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  cacheGet(key) {
    const cached = this._cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this._cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  // Request management
  registerRequest(id, controller) {
    this._requestQueue.set(id, { controller, timestamp: Date.now() });
    this.cleanupOldRequests();
  }
  
  cancelRequest(id) {
    const request = this._requestQueue.get(id);
    if (request) {
      request.controller.abort();
      this._requestQueue.delete(id);
    }
  }
  
  cleanupOldRequests() {
    const now = Date.now();
    for (const [id, request] of this._requestQueue) {
      if (now - request.timestamp > CONFIG.REQUEST_TIMEOUT) {
        this.cancelRequest(id);
      }
    }
  }
  
  clear() {
    this._managerData = null;
    this._currentAuth = null;
    this.currentUnits = [];
    this.contactData = {};
    this._cache.clear();
    
    // Destroy all charts
    this._charts.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this._charts.clear();
    
    // Cancel all pending requests
    this._requestQueue.forEach((request, id) => {
      this.cancelRequest(id);
    });
  }
}

// ============= API SERVICE =============
class ApiService {
  static async call(action, params = {}, options = {}) {
    const requestId = this.generateRequestId(action);
    const appState = AppState.getInstance();
    
    // Check cache first
    if (options.useCache !== false) {
      const cacheKey = this.getCacheKey(action, params);
      const cached = appState.cacheGet(cacheKey);
      if (cached) {
        console.log(`[API] Cache hit for ${action}`);
        return cached;
      }
    }
    
    // Show loading indicator
    this.showLoading();
    
    const controller = new AbortController();
    appState.registerRequest(requestId, controller);
    
    try {
      const urlParams = new URLSearchParams({
        action: action,
        _: Date.now(), // Cache buster
        ...params
      });
      
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, CONFIG.REQUEST_TIMEOUT);
      
      const response = await fetch(`${CONFIG.API_URL}?${urlParams}`, {
        signal: controller.signal,
        method: 'GET'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format');
      }
      
      // Cache successful responses
      if (data.ok && options.useCache !== false) {
        const cacheKey = this.getCacheKey(action, params);
        appState.cacheSet(cacheKey, data, options.cacheTTL);
      }
      
      return data;
      
    } catch (error) {
      console.error(`[API] ${action} failed:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      } else if (error.name === 'TypeError') {
        throw new Error('Network error - please check your connection');
      } else {
        throw error;
      }
    } finally {
      this.hideLoading();
      appState.cancelRequest(requestId);
    }
  }
  
  static generateRequestId(action) {
    return `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static getCacheKey(action, params) {
    return `${action}_${JSON.stringify(params)}`;
  }
  
  static showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
  }
  
  static hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

// ============= AUTHENTICATION SERVICE =============
class AuthService {
  static async authenticate(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    try {
      const result = await ApiService.call('authenticate', { 
        username: username.trim(), 
        password: password.trim() 
      }, { useCache: false });
      
      return result;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }
  
  static async getClientReport(sd06Code) {
    return await ApiService.call('getClientReport', { sd06Code });
  }
  
  static async getManagerDashboard() {
    return await ApiService.call('getManagerDashboard');
  }
  
  static async getContactData() {
    return await ApiService.call('getContactData', {}, { cacheTTL: 10 * 60 * 1000 }); // 10 minutes
  }
}

// ============= SESSION MANAGEMENT =============
class SessionManager {
  static STORAGE_KEY = 'plansee_portal_session_v2';
  
  static saveSession(authData, credentials, remember) {
    if (remember && credentials) {
      const sessionData = {
        auth: authData,
        credentials: {
          u: credentials.u,
          p: credentials.p,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
  }
  
  static loadSession() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;
      
      const sessionData = JSON.parse(saved);
      
      // Check if session is expired (7 days)
      if (Date.now() - sessionData.timestamp > 7 * 24 * 60 * 60 * 1000) {
        this.clearSession();
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clearSession();
      return null;
    }
  }
  
  static clearSession() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
  
  static autoLogin() {
    const session = this.loadSession();
    if (session && session.credentials) {
      try {
        const username = atob(session.credentials.u);
        const password = atob(session.credentials.p);
        
        // Pre-fill login form
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        const rememberField = document.getElementById('rememberMe');
        
        if (usernameField) usernameField.value = username;
        if (passwordField) passwordField.value = password;
        if (rememberField) rememberField.checked = true;
        
        console.log('Auto-login credentials loaded');
      } catch (error) {
        console.error('Auto-login failed:', error);
        this.clearSession();
      }
    }
  }
}

// ============= UI COMPONENTS =============
class UIComponents {
  static showElement(id) {
    const element = document.getElementById(id);
    if (element) element.classList.remove('hidden');
  }
  
  static hideElement(id) {
    const element = document.getElementById(id);
    if (element) element.classList.add('hidden');
  }
  
  static setText(id, text) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text ?? '--';
      element.title = text ?? '';
    }
  }
  
  static showNotification(message, type = 'info') {
    // Implementation for toast notifications
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Could be integrated with a proper notification system
  }
  
  static formatCurrency(amount) {
    const number = Number(amount);
    if (!isFinite(number)) return '--';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number);
  }
  
  static formatDate(dateStr) {
    if (!dateStr || dateStr === '--') return '--';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date)) return dateStr;
      
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch (error) {
      return dateStr;
    }
  }
  
  static clampPercentage(value) {
    const number = Number(String(value ?? 0).replace('%', ''));
    return isNaN(number) ? 0 : Math.max(0, Math.min(100, Math.round(number)));
  }
}

// ============= CLIENT DASHBOARD CONTROLLER =============
class ClientDashboard {
  static async initialize(authData) {
    const appState = AppState.getInstance();
    appState.currentAuth = authData;
    
    UIComponents.setText('welcomeUser', `Welcome, ${authData.name}`);
    UIComponents.hideElement('loginScreen');
    UIComponents.showElement('clientDashboard');
    
    // Load contact data in background
    this.loadContactData();
    
    // Initialize unit display
    if (authData.units && authData.units.length > 0) {
      this.setupUnitNavigation(authData.units);
      await this.loadUnitData(authData.units[0].sd06Code);
    } else {
      this.showNoUnitsMessage();
    }
    
    this.updateLastUpdate();
  }
  
  static setupUnitNavigation(units) {
    const container = document.getElementById('unitTabsContainer');
    if (!container) return;
    
    if (units.length > 1) {
      UIComponents.showElement('unitTabs');
      container.innerHTML = units.map((unit, index) => `
        <button class="unit-tab ${index === 0 ? 'active' : ''}" 
                onclick="ClientDashboard.switchUnit('${unit.sd06Code}')"
                data-unit="${unit.sd06Code}">
          <div class="text-sm font-semibold">${unit.compound || unit.unitName || unit.sd06Code}</div>
          ${unit.unitName && unit.compound ? `<div class="text-xs text-gray-600">${unit.unitName}</div>` : ''}
        </button>
      `).join('');
    } else {
      UIComponents.hideElement('unitTabs');
    }
  }
  
  static async switchUnit(sd06Code) {
    // Update active tab
    document.querySelectorAll('.unit-tab').forEach(tab => 
      tab.classList.remove('active')
    );
    document.querySelector(`[data-unit="${sd06Code}"]`)?.classList.add('active');
    
    // Load unit data
    await this.loadUnitData(sd06Code);
  }
  
  static async loadUnitData(sd06Code) {
    try {
      const contentElement = document.getElementById('unitContent');
      if (contentElement) {
        contentElement.classList.remove('fade-in');
      }
      
      const report = await AuthService.getClientReport(sd06Code);
      
      if (!report.ok) {
        throw new Error(report.error || 'Failed to load unit data');
      }
      
      this.renderUnitData(report);
      
      if (contentElement) {
        setTimeout(() => contentElement.classList.add('fade-in'), 50);
      }
    } catch (error) {
      console.error('Unit data loading failed:', error);
      UIComponents.showNotification(`Failed to load unit data: ${error.message}`, 'error');
    }
  }
  
  static renderUnitData(report) {
    const { unit, design, execution, executionTimeline, view3D, currentPhase } = report;
    
    // Basic Information
    UIComponents.setText('clientNameValue', unit.clientName);
    UIComponents.setText('compoundValue', unit.compound);
    UIComponents.setText('unitTypeValue', unit.unitType);
    UIComponents.setText('unitNumberValue', unit.unitNumber);
    UIComponents.setText('floorsValue', unit.floors);
    UIComponents.setText('indoorAreaValue', unit.areaIndoor);
    UIComponents.setText('outdoorAreaValue', unit.areaOutdoor);
    
    // Project Details
    UIComponents.setText('designTypeVal', design.designType);
    UIComponents.setText('designStatusVal', design.designStatus);
    UIComponents.setText('projectStatusVal', design.projectStatus);
    
    // Progress Information
    this.renderProgressSection(execution);
    
    // Timeline Information
    this.renderTimelineSection(executionTimeline);
    
    // Work Progress
    this.renderWorkProgress(execution.work, currentPhase);
    
    // Team Information
    this.renderTeamSection(execution.team, unit);
    
    // 3D View
    this.setup3DView(view3D);
    
    // Update phase labels
    UIComponents.setText('currentPhaseLabel', currentPhase);
    UIComponents.setText('workPhaseLabel', currentPhase);
  }
  
  static renderProgressSection(execution) {
    const completion = UIComponents.clampPercentage(execution?.completion);
    this.animateProgressCircle(completion);
    
    if (execution && Object.keys(execution).length > 0) {
      this.setStatusChip(execution.status);
      const cleanProgressText = (execution.overallProgress || '').replace(/^Progress:\s*/i, '');
      UIComponents.setText('overallProgressText', cleanProgressText);
    } else {
      document.getElementById('projectStatusChip').className = 
        'px-6 py-3 rounded-2xl text-sm font-semibold inline-block bg-blue-500/10 text-blue-700 mb-3';
      document.getElementById('projectStatusChip').textContent = 'IN PROGRESS';
      UIComponents.setText('overallProgressText', 'Project is currently in progress');
    }
  }
  
  static renderTimelineSection(timeline) {
    const planned = timeline.planned || {};
    const actual = timeline.actual || {};
    
    UIComponents.setText('plannedStartDate', UIComponents.formatDate(planned.start));
    UIComponents.setText('plannedEndDate', UIComponents.formatDate(planned.end));
    UIComponents.setText('plannedDuration', this.calculateDuration(planned.start, planned.end));
    
    UIComponents.setText('actualStartDate', UIComponents.formatDate(actual.start));
    UIComponents.setText('actualEndDate', UIComponents.formatDate(actual.end));
    
    this.renderGanttChart(planned, actual);
  }
  
  static renderWorkProgress(work, phase) {
    const grid = document.getElementById('workGrid');
    if (!grid) return;
    
    const workItems = this.getWorkItemsForPhase(work, phase);
    grid.innerHTML = workItems.map(([name, value, bgClass, textClass]) => {
      const percentage = UIComponents.clampPercentage(value);
      return `
        <div class="space-y-4 p-4 ${bgClass} rounded-2xl border shadow-lg">
          <div class="flex justify-between items-center">
            <span class="text-sm font-semibold ${textClass}">${name}</span>
            <span class="text-lg font-bold ${textClass}">${percentage}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div class="h-4 rounded-full transition-all duration-500 ${textClass.replace('text-', 'bg-').replace('-800', '-500')}" 
                 style="width:${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  static getWorkItemsForPhase(work, phase) {
    const phaseConfigs = {
      'Phase 1': [
        ['🏗️ New Construction', work.newConstruction, 'bg-gradient-to-br from-amber-50 to-yellow-50', 'text-amber-800'],
        ['🚿 Plumbing', work.plumbing, 'bg-gradient-to-br from-blue-50 to-indigo-50', 'text-blue-800'],
        ['⚡ Electrical', work.electrical, 'bg-gradient-to-br from-yellow-50 to-amber-50', 'text-yellow-800'],
        ['❄️ AC Installation', work.acInstallation, 'bg-gradient-to-br from-cyan-50 to-blue-50', 'text-cyan-800'],
        ['🧱 Plastering', work.plastering, 'bg-gradient-to-br from-gray-50 to-slate-50', 'text-gray-800'],
        ['🏗️ Gypsum Board', work.gypsumBoard, 'bg-gradient-to-br from-slate-50 to-gray-50', 'text-slate-800'],
        ['🏺 Ceramic', work.ceramic, 'bg-gradient-to-br from-red-50 to-rose-50', 'text-red-800'],
        ['💎 Marble', work.marble, 'bg-gradient-to-br from-purple-50 to-violet-50', 'text-purple-800'],
        ['🎨 Painting Prep', work.paintingPrep, 'bg-gradient-to-br from-green-50 to-emerald-50', 'text-green-800']
      ],
      'Phase 2': [
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
      ]
    };
    
    return phaseConfigs[phase] || phaseConfigs['Phase 1'];
  }
  
  static renderTeamSection(team, unit) {
    const engineeringTeamLeader = team?.teamLeader || '--';
    const teamLeaderFromSD06 = unit.teamLeader || '--';
    const accountManager = unit.accountManager || '--';
    const siteManager = team?.siteManager || '--';
    
    UIComponents.setText('teamLeaderName', engineeringTeamLeader);
    UIComponents.setText('teamLeaderNameTeam', teamLeaderFromSD06);
    UIComponents.setText('accountManagerNameTeam', accountManager);
    UIComponents.setText('siteManagerName', siteManager);
    
    this.setupContactButtons(teamLeaderFromSD06, accountManager);
  }
  
  static setupContactButtons(teamLeader, accountManager) {
    const appState = AppState.getInstance();
      // Setup team leader contact
if (teamLeader && teamLeader !== '--') {
  const teamLeaderCard = document.querySelector('#teamLeaderNameTeam')?.closest('.contact-card');
  if (teamLeaderCard) {
    teamLeaderCard.style.cursor = 'pointer';
    teamLeaderCard.onclick = () => this.showContactInfo(teamLeader, 'Team Leader');
    teamLeaderCard.title = `Click to contact ${teamLeader}`;
  }
}

// Setup account manager contact
if (accountManager && accountManager !== '--') {
  const accountManagerCard = document.querySelector('#accountManagerNameTeam')?.closest('.contact-card');
  if (accountManagerCard) {
    accountManagerCard.style.cursor = 'pointer';
    accountManagerCard.onclick = () => this.showContactInfo(accountManager, 'Account Manager');
    accountManagerCard.title = `Click to contact ${accountManager}`;
  }
}
}

static showContactInfo(name, role) {
const appState = AppState.getInstance();

if (!name || name === '--') {
UIComponents.showNotification(`No ${role} assigned`, 'info');
return;
}

let phoneNumber = appState.contactData[name];

// Search by name parts
if (!phoneNumber) {
const nameParts = name.split(' ').filter(part => part.length > 2);
for (const part of nameParts) {
  phoneNumber = appState.contactData[part];
  if (phoneNumber) break;
}
}

// Fuzzy search
if (!phoneNumber) {
for (const [contactName, number] of Object.entries(appState.contactData)) {
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
UIComponents.showNotification(`${role} phone number not found for ${name}`, 'warning');
}
}

static setup3DView(url) {
const card = document.getElementById('threeDCard');
const iframe = document.getElementById('threeDIframe');
const placeholder = document.getElementById('threeDPlaceholder');

if (!card || !iframe || !placeholder) return;

const cleanUrl = (url || '').trim();
const isValidUrl = /^https?:\/\//i.test(cleanUrl);

if (isValidUrl) {
UIComponents.showElement('threeDCard');
iframe.src = cleanUrl;
UIComponents.showElement('threeDIframe');
UIComponents.hideElement('threeDPlaceholder');
} else {
UIComponents.hideElement('threeDCard');
iframe.src = '';
}
}

static renderGanttChart(planned, actual) {
const container = document.getElementById('ganttContainer');
const timeline = document.getElementById('ganttTimeline');

if (!container || !timeline) return;

if (!planned.start || !planned.end) {
container.innerHTML = '<div class="text-center text-gray-500 py-8">No timeline data available</div>';
timeline.innerHTML = '';
return;
}

try {
const plannedStart = new Date(planned.start);
const plannedEnd = new Date(planned.end);
const actualStart = actual.start ? new Date(actual.start) : null;
const actualEnd = actual.end ? new Date(actual.end) : null;

const allDates = [plannedStart, plannedEnd];
if (actualStart) allDates.push(actualStart);
if (actualEnd) allDates.push(actualEnd);

const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
const totalDuration = maxDate - minDate;

const calculatePosition = (date) => ((date - minDate) / totalDuration) * 100;

container.innerHTML = `
  <div class="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
    <div class="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2"></div>
    
    <div class="absolute top-1/4 h-4 bg-blue-500 rounded-full transform -translate-y-1/2" 
         style="left: ${calculatePosition(plannedStart)}%; width: ${calculatePosition(plannedEnd) - calculatePosition(plannedStart)}%">
      <div class="absolute -top-6 left-0 right-0 text-center text-xs text-blue-600 font-medium">Planned</div>
      <div class="absolute -top-12 left-0 text-xs text-blue-500">${UIComponents.formatDate(planned.start)}</div>
      <div class="absolute -top-12 right-0 text-xs text-blue-500">${UIComponents.formatDate(planned.end)}</div>
    </div>
    
    ${actualStart ? `
    <div class="absolute top-3/4 h-4 bg-green-500 rounded-full transform -translate-y-1/2" 
         style="left: ${calculatePosition(actualStart)}%; width: ${calculatePosition(actualEnd || new Date()) - calculatePosition(actualStart)}%">
      <div class="absolute -bottom-6 left-0 right-0 text-center text-xs text-green-600 font-medium">Actual</div>
      <div class="absolute -bottom-12 left-0 text-xs text-green-500">${UIComponents.formatDate(actual.start)}</div>
      ${actualEnd ? `
      <div class="absolute -bottom-12 right-0 text-xs text-green-500">${UIComponents.formatDate(actual.end)}</div>
      ` : `
      <div class="absolute -bottom-12 right-0 text-xs text-green-500">In Progress</div>
      `}
    </div>
    ` : ''}
    
    <div class="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
      <span>${UIComponents.formatDate(minDate)}</span>
      <span>${UIComponents.formatDate(maxDate)}</span>
    </div>
  </div>
`;

// Timeline markers
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

} catch (error) {
console.error('Gantt chart rendering error:', error);
container.innerHTML = '<div class="text-center text-red-500 py-8">Error rendering timeline</div>';
}
}

static animateProgressCircle(percentage) {
const circle = document.getElementById('progressCircle');
const label = document.getElementById('progressPercentage');

if (!circle || !label) return;

const radius = 70;
const circumference = 2 * Math.PI * radius;
const offset = circumference - (percentage / 100) * circumference;

circle.style.strokeDashoffset = Math.max(0, Math.min(offset, circumference));
label.textContent = `${percentage}%`;
}

static setStatusChip(status) {
const chip = document.getElementById('projectStatusChip');
if (!chip) return;

const statusText = (status || '').toLowerCase();
let className = 'px-6 py-3 rounded-2xl text-sm font-semibold inline-block ';
let text = 'On Time';

if (statusText.includes('complete')) {
className += 'bg-blue-500/10 text-blue-700';
text = 'Completed';
} else if (statusText.includes('critical')) {
className += 'bg-rose-500/10 text-rose-700';
text = 'Critical';
} else if (statusText.includes('delay')) {
className += 'bg-amber-500/10 text-amber-700';
text = 'Delayed';
} else {
className += 'bg-emerald-500/10 text-emerald-700';
}

chip.className = className;
chip.textContent = text;
}

static calculateDuration(startStr, endStr) {
try {
const start = startStr ? new Date(startStr) : null;
const end = endStr ? new Date(endStr) : null;

if (!start || !end || isNaN(start) || isNaN(end)) return '--';

const diffTime = Math.abs(end - start);
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
return `${diffDays} days`;
} catch (error) {
return '--';
}
}

static showNoUnitsMessage() {
UIComponents.setText('dashboardTitle', 'No Units Available');
UIComponents.setText('dashboardSubtitle', 'Please contact administrator');
UIComponents.hideElement('unitContent');
}

static async loadContactData() {
try {
const appState = AppState.getInstance();
const contactResult = await AuthService.getContactData();

if (contactResult.ok) {
  appState.contactData = contactResult.contacts || {};
  console.log(`Loaded ${Object.keys(appState.contactData).length} contacts`);
}
} catch (error) {
console.error('Failed to load contact data:', error);
}
}

static updateLastUpdate() {
const today = new Date();
const dayOfWeek = today.getDay();
const diff = today.getDate() - dayOfWeek;
const lastSunday = new Date(today.setDate(diff));
const formattedDate = lastSunday.toLocaleDateString('en-US', {
weekday: 'long',
year: 'numeric',
month: 'long',
day: 'numeric'
});

UIComponents.setText('lastUpdate', `Last updated: ${formattedDate}`);
UIComponents.setText('managerLastUpdate', `Last updated: ${formattedDate}`);
}
}

// ============= MANAGER DASHBOARD CONTROLLER =============
class ManagerDashboard {
static async initialize() {
const appState = AppState.getInstance();

UIComponents.hideElement('loginScreen');
UIComponents.showElement('managerDashboard');

try {
await this.loadDashboardData();
this.updateLastUpdate();
} catch (error) {
console.error('Manager dashboard initialization failed:', error);
UIComponents.showNotification('Failed to load dashboard data', 'error');
}
}

static async loadDashboardData() {
try {
const data = await AuthService.getManagerDashboard();

if (!data.ok) {
  throw new Error(data.error || 'Failed to load dashboard data');
}

const appState = AppState.getInstance();
appState.managerData = data;

this.renderDashboard(data);
} catch (error) {
throw error;
}
}

static renderDashboard(data) {
const { projects, teamLeaders, totals } = data;

this.renderQuickStats(projects, totals);
this.renderProjectsGrid(projects);
this.renderTeamLeaders(teamLeaders);

// Render charts if needed
this.renderCharts(projects);
}

static renderQuickStats(projects, totals) {
UIComponents.setText('totalProjectsCount', projects.length);
UIComponents.setText('avgProgressValue', `${totals.avgProgress || 0}%`);
UIComponents.setText('totalValueAmount', UIComponents.formatCurrency(totals.totalValue));

const uniqueTeams = new Set(projects.map(p => p.teamLeader).filter(Boolean));
UIComponents.setText('activeTeamsCount', uniqueTeams.size);
}

static renderProjectsGrid(projects) {
const grid = document.getElementById('projectsGrid');
if (!grid) return;

grid.innerHTML = projects.map(project => `
  <div class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="font-bold text-lg text-gray-900">${project.client}</h3>
        <p class="text-sm text-gray-600">${project.compound}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-semibold ${
        project.progress >= 80 ? 'bg-green-100 text-green-800' :
        project.progress >= 50 ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }">
        ${project.progress}%
      </span>
    </div>
    
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600">Phase:</span>
        <span class="font-semibold">${project.phase}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Team Leader:</span>
        <span class="font-semibold">${project.teamLeader || '--'}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Value:</span>
        <span class="font-semibold">${UIComponents.formatCurrency(project.value)}</span>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="h-2 rounded-full transition-all duration-500 ${
          project.progress >= 80 ? 'bg-green-500' :
          project.progress >= 50 ? 'bg-yellow-500' :
          'bg-red-500'
        }" style="width: ${project.progress}%"></div>
      </div>
    </div>
    
    <div class="mt-4 flex space-x-2">
      <button onclick="ManagerDashboard.openProjectDetail('${project.sd06Code}')" 
              class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm">
        View Details
      </button>
    </div>
  </div>
`).join('');
}

static renderTeamLeaders(teamLeaders) {
const container = document.getElementById('teamLeadersGrid');
if (!container) return;

container.innerHTML = teamLeaders.map(leader => `
  <div class="bg-white rounded-xl border border-gray-200 p-6">
    <h4 class="font-bold text-lg mb-3">${leader.name}</h4>
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div class="text-center">
        <div class="text-2xl font-bold text-blue-600">${leader.projectCount}</div>
        <div class="text-gray-600">Projects</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-green-600">${leader.avgProgress}%</div>
        <div class="text-gray-600">Avg Progress</div>
      </div>
    </div>
    <button onclick="ManagerDashboard.viewTeamDetails('${leader.name}')" 
            class="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm">
      View Team
    </button>
  </div>
`).join('');
}

static renderCharts(projects) {
// Chart rendering implementation would go here
// This could use Chart.js or similar library
console.log('Rendering charts for', projects.length, 'projects');
}

static openProjectDetail(sd06Code) {
const appState = AppState.getInstance();
const project = appState.managerData?.projects?.find(p => p.sd06Code === sd06Code);

if (!project) {
UIComponents.showNotification('Project not found', 'error');
return;
}

const modal = document.getElementById('projectDetailModal');
const title = document.getElementById('projectDetailTitle');
const content = document.getElementById('projectDetailContent');

if (!modal || !title || !content) return;

title.textContent = `Project Details - ${project.client}`;

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
        <div class="flex justify-between"><span>Contract Value:</span><span class="font-semibold">${UIComponents.formatCurrency(project.value)}</span></div>
        <div class="flex justify-between"><span>Amount Paid:</span><span class="font-semibold text-green-600">${UIComponents.formatCurrency(project.paid)}</span></div>
        <div class="flex justify-between"><span>Pending:</span><span class="font-semibold text-amber-600">${UIComponents.formatCurrency(project.value - project.paid)}</span></div>
      </div>
    </div>
    
    <div class="space-y-4">
      <h4 class="font-bold text-gray-900 text-lg">Timeline</h4>
      <div class="bg-gray-50 p-4 rounded-lg space-y-2">
        <div class="flex justify-between"><span>Start Date:</span><span class="font-semibold">${UIComponents.formatDate(project.startDate)}</span></div>
        <div class="flex justify-between"><span>End Date:</span><span class="font-semibold">${UIComponents.formatDate(project.endDate)}</span></div>
      </div>
    </div>
  </div>
  
  <div class="flex gap-3 pt-4 border-t">
    <button onclick="ManagerDashboard.generateProjectReport('${project.sd06Code}')" 
            class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
      Generate Report
    </button>
    <button onclick="ManagerDashboard.closeProjectDetailModal()" 
            class="py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
      Close
    </button>
  </div>
`;

UIComponents.showElement('projectDetailModal');
}

static closeProjectDetailModal() {
UIComponents.hideElement('projectDetailModal');
}

static viewTeamDetails(teamLeader) {
const appState = AppState.getInstance();
const teamProjects = appState.managerData?.projects?.filter(p => p.teamLeader === teamLeader) || [];
const totalProjects = teamProjects.length;
const avgProgress = totalProjects ? Math.round(teamProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / totalProjects) : 0;
const totalValue = teamProjects.reduce((sum, p) => sum + (p.value || 0), 0);

const content = document.getElementById('teamAnalyticsContent');
if (!content) return;

content.innerHTML = `
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
      <div class="text-2xl font-bold text-blue-600">${UIComponents.formatCurrency(totalValue)}</div>
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
          <span class="text-sm ${
            p.progress >= 80 ? 'text-green-600' : 
            p.progress >= 50 ? 'text-amber-600' : 'text-red-600'
          }">${p.progress}%</span>
        </div>
        <div class="flex justify-between text-sm text-gray-600">
          <span>${p.compound}</span>
          <span>${p.phase}</span>
        </div>
      </div>
    `).join('')}
  </div>
`;

UIComponents.showElement('teamAnalyticsModal');
}

static closeTeamAnalyticsModal() {
UIComponents.hideElement('teamAnalyticsModal');
}

static generateProjectReport(sd06Code) {
UIComponents.showNotification(`Generating report for project ${sd06Code}`, 'info');
// Implementation for report generation
}

static updateLastUpdate() {
const today = new Date();
const dayOfWeek = today.getDay();
const diff = today.getDate() - dayOfWeek;
const lastSunday = new Date(today.setDate(diff));
const formattedDate = lastSunday.toLocaleDateString('en-US', {
weekday: 'long',
year: 'numeric',
month: 'long',
day: 'numeric'
});

UIComponents.setText('managerLastUpdate', `Last updated: ${formattedDate}`);
}

static async refreshData() {
try {
UIComponents.showNotification('Refreshing data...', 'info');
await this.loadDashboardData();
UIComponents.showNotification('Data refreshed successfully', 'success');
} catch (error) {
UIComponents.showNotification('Failed to refresh data', 'error');
}
}
}

// ============= APPLICATION INITIALIZATION =============
class AppInitializer {
static init() {
this.setupEventListeners();
this.autoLogin();
this.setupErrorHandling();
}

static setupEventListeners() {
// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
loginForm.addEventListener('submit', this.handleLogin.bind(this));
}

// Logout buttons
const logoutButtons = document.querySelectorAll('[data-action="logout"]');
logoutButtons.forEach(button => {
button.addEventListener('click', this.handleLogout.bind(this));
});

// Manager dashboard actions
const refreshButton = document.getElementById('refreshData');
if (refreshButton) {
refreshButton.addEventListener('click', () => ManagerDashboard.refreshData());
}

// Modal close handlers
this.setupModalHandlers();
}

static setupModalHandlers() {
// Project detail modal
const projectModal = document.getElementById('projectDetailModal');
if (projectModal) {
projectModal.addEventListener('click', (e) => {
  if (e.target === projectModal) {
    ManagerDashboard.closeProjectDetailModal();
  }
});
}

// Team analytics modal
const teamModal = document.getElementById('teamAnalyticsModal');
if (teamModal) {
teamModal.addEventListener('click', (e) => {
  if (e.target === teamModal) {
    ManagerDashboard.closeTeamAnalyticsModal();
  }
});
}
}

static async handleLogin(event) {
event.preventDefault();

const username = document.getElementById('username')?.value.trim();
const password = document.getElementById('password')?.value.trim();
const remember = document.getElementById('rememberMe')?.checked;

if (!username || !password) {
UIComponents.showNotification('Please enter both username and password', 'warning');
return;
}

try {
UIComponents.showNotification('Signing in...', 'info');

const authResult = await AuthService.authenticate(username, password);

if (!authResult.ok) {
  throw new Error(authResult.error || 'Authentication failed');
}

await this.handleAuthSuccess(authResult, remember, {
  u: btoa(username),
  p: btoa(password)
});

} catch (error) {
console.error('Login error:', error);
UIComponents.showNotification(error.message || 'Login failed', 'error');
}
}

static async handleAuthSuccess(authResult, remember, credentials) {
const appState = AppState.getInstance();

// Save session
SessionManager.saveSession(authResult, credentials, remember);

// Load contact data in background
AuthService.getContactData().then(contactResult => {
  if (contactResult.ok) {
    appState.contactData = contactResult.contacts || {};
  }
});

// Redirect based on role
if (authResult.role === 'manager') {
  await ManagerDashboard.initialize();
} else {
  await ClientDashboard.initialize(authResult);
}

UIComponents.showNotification(`Welcome, ${authResult.name}!`, 'success');
}

static handleLogout() {
const appState = AppState.getInstance();
appState.clear();
SessionManager.clearSession();

UIComponents.hideElement('clientDashboard');
UIComponents.hideElement('managerDashboard');
UIComponents.showElement('loginScreen');

// Clear form
const loginForm = document.getElementById('loginForm');
if (loginForm) loginForm.reset();

UIComponents.showNotification('Logged out successfully', 'info');
}

static autoLogin() {
SessionManager.autoLogin();
}

static setupErrorHandling() {
// Global error handler
window.addEventListener('error', (event) => {
console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
console.error('Unhandled promise rejection:', event.reason);
event.preventDefault();
});
}
}

// ============= APPLICATION STARTUP =============
document.addEventListener('DOMContentLoaded', () => {
console.log('PlanSee Portal Initializing...');
AppInitializer.init();
});

// ============= GLOBAL EXPORTS FOR HTML EVENT HANDLERS =============
window.ClientDashboard = ClientDashboard;
window.ManagerDashboard = ManagerDashboard;
window.AppInitializer = AppInitializer;

// Global utility functions for backward compatibility
function logout() {
AppInitializer.handleLogout();
}

function switchUnit(sd06Code) {
ClientDashboard.switchUnit(sd06Code);
}

console.log('PlanSee Portal - Enhanced Professional Version Loaded');
    
    [
