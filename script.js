<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlanSee Interiors - Client Portal</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .progress-ring__circle {
            transition: stroke-dashoffset 0.5s ease-in-out;
            transform: rotate(-90deg);
            transform-origin: 50% 50%;
        }
        .gantt-bar {
            transition: all 0.3s ease;
        }
        .hover-lift:hover {
            transform: translateY(-2px);
            transition: transform 0.2s ease;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="text-gray-700">Loading...</span>
        </div>
    </div>

    <!-- Login Screen -->
    <div id="loginScreen" class="min-h-screen flex items-center justify-center px-4">
        <div class="max-w-md w-full space-y-8">
            <div class="text-center">
                <h2 class="text-3xl font-bold text-gray-900">PlanSee Interiors</h2>
                <p class="mt-2 text-gray-600">Client & Manager Portal</p>
            </div>
            <form id="loginForm" class="mt-8 space-y-6 bg-white p-8 rounded-2xl shadow-lg">
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                    <input id="username" name="username" type="text" required 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                    <input id="password" name="password" type="password" required 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div class="flex items-center">
                    <input id="rememberMe" name="rememberMe" type="checkbox" 
                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <label for="rememberMe" class="ml-2 block text-sm text-gray-900">Remember me</label>
                </div>
                <button type="submit" 
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Sign in
                </button>
            </form>
        </div>
    </div>

    <!-- Client Dashboard -->
    <div id="clientDashboard" class="hidden">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-xl font-semibold text-gray-900">PlanSee Interiors</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span id="welcomeUser" class="text-sm text-gray-700"></span>
                        <button onclick="logout()" 
                                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Unit Tabs -->
        <div id="unitTabs" class="bg-white border-b hidden">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div id="unitTabsContainer" class="flex space-x-1 overflow-x-auto py-2">
                    <!-- Unit tabs will be dynamically generated here -->
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <!-- Progress & Timeline Section -->
            <section class="mb-8">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Progress Overview -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-2xl shadow-lg p-6 hover-lift">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Project Progress</h3>
                            <div class="flex flex-col items-center justify-center">
                                <div class="relative w-48 h-48 mb-4">
                                    <svg class="w-full h-full" viewBox="0 0 160 160">
                                        <circle cx="80" cy="80" r="70" stroke="#e5e7eb" stroke-width="12" fill="none"/>
                                        <circle id="progressCircle" cx="80" cy="80" r="70" stroke="#3b82f6" 
                                                stroke-width="12" fill="none" stroke-dasharray="439.8" 
                                                stroke-dashoffset="439.8" class="progress-ring__circle"/>
                                        <text id="progressPercentage" x="80" y="85" text-anchor="middle" 
                                              font-size="24" font-weight="bold" fill="#1f2937">0%</text>
                                    </svg>
                                </div>
                                <div id="projectStatusChip" 
                                     class="px-6 py-3 rounded-2xl text-sm font-semibold inline-block bg-blue-500/10 text-blue-700 mb-3">
                                    IN PROGRESS
                                </div>
                                <p id="overallProgressText" class="text-center text-gray-600">
                                    Project is currently in progress
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Timeline & Gantt Chart -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-2xl shadow-lg p-6 hover-lift">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Project Timeline</h3>
                            <div class="space-y-6">
                                <!-- Timeline Summary -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-blue-50 p-4 rounded-lg">
                                        <h4 class="text-sm font-medium text-blue-800 mb-2">Planned Timeline</h4>
                                        <div class="space-y-1 text-sm">
                                            <div class="flex justify-between">
                                                <span>Start:</span>
                                                <span id="plannedStartDate" class="font-semibold">--</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>End:</span>
                                                <span id="plannedEndDate" class="font-semibold">--</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Duration:</span>
                                                <span id="plannedDuration" class="font-semibold">--</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="bg-green-50 p-4 rounded-lg">
                                        <h4 class="text-sm font-medium text-green-800 mb-2">Actual Timeline</h4>
                                        <div class="space-y-1 text-sm">
                                            <div class="flex justify-between">
                                                <span>Start:</span>
                                                <span id="actualStartDate" class="font-semibold">--</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>End:</span>
                                                <span id="actualEndDate" class="font-semibold">--</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Gantt Chart -->
                                <div>
                                    <h4 class="text-sm font-medium text-gray-700 mb-3">Progress Visualization</h4>
                                    <div id="ganttContainer" class="bg-gray-50 rounded-lg p-4">
                                        <!-- Gantt chart will be rendered here -->
                                        <div class="text-center text-gray-500 py-8">Loading timeline data...</div>
                                    </div>
                                    <div id="ganttTimeline" class="flex justify-between text-xs text-gray-500 mt-2 relative">
                                        <!-- Timeline markers will be rendered here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Project Information Section -->
            <section id="unitContent" class="fade-in">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Left Column: Basic Information & Design Details -->
                    <div class="lg:col-span-1 space-y-6">
                        <!-- Basic Information -->
                        <div class="bg-white rounded-2xl shadow-lg p-6 hover-lift">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Client Name</span>
                                    <span id="clientNameValue" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Compound</span>
                                    <span id="compoundValue" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Unit Type</span>
                                    <span id="unitTypeValue" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Unit Number</span>
                                    <span id="unitNumberValue" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Floors</span>
                                    <span id="floorsValue" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Indoor Area</span>
                                    <span id="indoorAreaValue" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2">
                                    <span class="text-gray-600">Outdoor Area</span>
                                    <span id="outdoorAreaValue" class="font-semibold">--</span>
                                </div>
                            </div>
                        </div>

                        <!-- Design Details -->
                        <div class="bg-white rounded-2xl shadow-lg p-6 hover-lift">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Design Details</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Design Type</span>
                                    <span id="designTypeVal" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span class="text-gray-600">Design Status</span>
                                    <span id="designStatusVal" class="font-semibold">--</span>
                                </div>
                                <div class="flex justify-between items-center py-2">
                                    <span class="text-gray-600">Project Status</span>
                                    <span id="projectStatusVal" class="font-semibold">--</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Middle Column: Work Progress -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-2xl shadow-lg p-6 hover-lift h-full">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-900">Work Progress</h3>
                                <span id="workPhaseLabel" class="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                    Phase 1
                                </span>
                            </div>
                            <div id="workGrid" class="grid gap-4">
                                <!-- Work progress items will be dynamically generated here -->
                                <div class="text-center text-gray-500 py-8">Loading work progress...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Team Information & 3D View -->
                    <div class="lg:col-span-1 space-y-6">
                        <!-- Team Information -->
                        <div class="bg-white rounded-2xl shadow-lg p-6 hover-lift">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Project Team</h3>
                            <div class="space-y-4">
                                <div class="contact-card bg-gray-50 p-4 rounded-lg">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-semibold">TL</span>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-600">Team Leader</p>
                                            <p id="teamLeaderNameTeam" class="font-semibold">--</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="contact-card bg-gray-50 p-4 rounded-lg">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-semibold">AM</span>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-600">Account Manager</p>
                                            <p id="accountManagerNameTeam" class="font-semibold">--</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="contact-card bg-gray-50 p-4 rounded-lg">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-semibold">SM</span>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-600">Site Manager</p>
                                            <p id="siteManagerName" class="font-semibold">--</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 3D View -->
                        <div id="threeDCard" class="bg-white rounded-2xl shadow-lg p-6 hover-lift hidden">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">3D Project View</h3>
                            <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                <iframe id="threeDIframe" class="w-full h-full hidden" 
                                        frameborder="0" allowfullscreen></iframe>
                                <div id="threeDPlaceholder" class="w-full h-full flex items-center justify-center text-gray-500">
                                    3D view not available
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Last Update -->
            <div class="mt-8 text-center">
                <p id="lastUpdate" class="text-sm text-gray-500">Last updated: --</p>
            </div>
        </main>
    </div>

    <!-- Manager Dashboard (Hidden by default) -->
    <div id="managerDashboard" class="hidden">
        <!-- Manager dashboard content would go here -->
    </div>

<script>
/******************************************************
 * ENHANCED PROJECT PORTAL - PROFESSIONAL FRONTEND
 * PlanSee Interiors - Optimized for Performance & UX
 ******************************************************/

// ============= CONFIGURATION =============
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxIDpnmt7fSyLBujis7V0g0cVE0bqLVaY33u9-kKABOXvI7kTu8d8T64ZcJbL0lOvv5/exec",
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
    this._activeRequests = new Map();
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
  set managerData(data) { this._managerData = data && typeof data === 'object' ? data : null; }
  
  get currentAuth() { return this._currentAuth; }
  set currentAuth(auth) { this._currentAuth = auth && auth.ok ? auth : null; }
  
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
    this._activeRequests.set(id, { controller, timestamp: Date.now() });
    this.cleanupOldRequests();
  }
  
  cancelRequest(id) {
    const request = this._activeRequests.get(id);
    if (request) {
      request.controller.abort();
      this._activeRequests.delete(id);
    }
  }
  
  cleanupOldRequests() {
    const now = Date.now();
    for (const [id, request] of this._activeRequests) {
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
    this._activeRequests.forEach((request, id) => {
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
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
      overlay.innerHTML = `
        <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="text-gray-700">Loading...</span>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
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

// ============= UI UTILITIES =============
class UIHelper {
  static setText(id, text) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text ?? '--';
    }
  }
  
  static showElement(id) {
    const element = document.getElementById(id);
    if (element) element.classList.remove('hidden');
  }
  
  static hideElement(id) {
    const element = document.getElementById(id);
    if (element) element.classList.add('hidden');
  }
  
  static showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
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
  
  static getLastSunday() {
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
}

// ============= APPLICATION CONTROLLER =============
class AppController {
  static async initialize() {
    this.setupEventListeners();
    SessionManager.autoLogin();
    this.setupErrorHandling();
  }
  
  static setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="logout"]')) {
        this.handleLogout();
      }
    });
  }
  
  static async handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const remember = document.getElementById('rememberMe')?.checked;
    
    if (!username || !password) {
      UIHelper.showNotification('Please enter both username and password', 'warning');
      return;
    }
    
    try {
      UIHelper.showNotification('Signing in...', 'info');
      
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
      UIHelper.showNotification(error.message || 'Login failed', 'error');
    }
  }
  
  static async handleAuthSuccess(authResult, remember, credentials) {
    const appState = AppState.getInstance();
    appState.currentAuth = authResult;
    
    SessionManager.saveSession(authResult, credentials, remember);
    
    this.loadContactData();
    
    if (authResult.role === 'manager') {
      await this.loadManagerDashboard();
    } else {
      await this.loadClientDashboard(authResult);
    }
    
    UIHelper.showNotification(`Welcome, ${authResult.name}!`, 'success');
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
  
  static async loadManagerDashboard() {
    try {
      const appState = AppState.getInstance();
      const data = await AuthService.getManagerDashboard();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to load dashboard data');
      }
      
      appState.managerData = data;
      this.renderManagerDashboard(data);
      UIHelper.hideElement('loginScreen');
      UIHelper.showElement('managerDashboard');
      this.updateLastUpdate();
      
    } catch (error) {
      UIHelper.showNotification('Failed to load manager dashboard', 'error');
    }
  }
  
  static async loadClientDashboard(authData) {
    const appState = AppState.getInstance();
    appState.currentAuth = authData;
    
    UIHelper.setText('welcomeUser', `Welcome, ${authData.name}`);
    UIHelper.hideElement('loginScreen');
    UIHelper.showElement('clientDashboard');
    
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
      UIHelper.showElement('unitTabs');
      container.innerHTML = units.map((unit, index) => `
        <button class="unit-tab ${index === 0 ? 'active' : ''}" 
                onclick="AppController.switchUnit('${unit.sd06Code}')"
                data-unit="${unit.sd06Code}">
          <div class="text-sm font-semibold">${unit.compound || unit.unitName || unit.sd06Code}</div>
          ${unit.unitName && unit.compound ? `<div class="text-xs text-gray-600">${unit.unitName}</div>` : ''}
        </button>
      `).join('');
    } else {
      UIHelper.hideElement('unitTabs');
    }
  }
  
  static async switchUnit(sd06Code) {
    document.querySelectorAll('.unit-tab').forEach(tab => 
      tab.classList.remove('active')
    );
    document.querySelector(`[data-unit="${sd06Code}"]`)?.classList.add('active');
    
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
      
      this.renderClientData(report);
      
      if (contentElement) {
        setTimeout(() => contentElement.classList.add('fade-in'), 50);
      }
    } catch (error) {
      console.error('Unit data loading failed:', error);
      UIHelper.showNotification(`Failed to load unit data: ${error.message}`, 'error');
    }
  }
  
  static renderClientData(report) {
    const { unit, design, execution, executionTimeline, view3D, currentPhase } = report;
    
    // Basic Information
    UIHelper.setText('clientNameValue', unit.clientName);
    UIHelper.setText('compoundValue', unit.compound);
    UIHelper.setText('unitTypeValue', unit.unitType);
    UIHelper.setText('unitNumberValue', unit.unitNumber);
    UIHelper.setText('floorsValue', unit.floors);
    UIHelper.setText('indoorAreaValue', unit.areaIndoor);
    UIHelper.setText('outdoorAreaValue', unit.areaOutdoor);
    
    // Design Details
    UIHelper.setText('designTypeVal', design.designType);
    UIHelper.setText('designStatusVal', design.designStatus);
    UIHelper.setText('projectStatusVal', design.projectStatus);
    
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
    UIHelper.setText('currentPhaseLabel', currentPhase);
    UIHelper.setText('workPhaseLabel', currentPhase);
  }
  
  static renderProgressSection(execution) {
    const completion = UIHelper.clampPercentage(execution?.completion);
    this.animateProgressCircle(completion);
    
    if (execution && Object.keys(execution).length > 0) {
      this.setStatusChip(execution.status);
      const cleanProgressText = (execution.overallProgress || '').replace(/^Progress:\s*/i, '');
      UIHelper.setText('overallProgressText', cleanProgressText);
    } else {
      const chip = document.getElementById('projectStatusChip');
      if (chip) {
        chip.className = 'px-6 py-3 rounded-2xl text-sm font-semibold inline-block bg-blue-500/10 text-blue-700 mb-3';
        chip.textContent = 'IN PROGRESS';
      }
      UIHelper.setText('overallProgressText', 'Project is currently in progress');
    }
  }
  
  static renderTimelineSection(timeline) {
    const planned = timeline.planned || {};
    const actual = timeline.actual || {};
    
    UIHelper.setText('plannedStartDate', UIHelper.formatDate(planned.start));
    UIHelper.setText('plannedEndDate', UIHelper.formatDate(planned.end));
    UIHelper.setText('plannedDuration', this.calculateDuration(planned.start, planned.end));
    
    UIHelper.setText('actualStartDate', UIHelper.formatDate(actual.start));
    UIHelper.setText('actualEndDate', UIHelper.formatDate(actual.end));
    
    this.renderGanttChart(planned, actual);
  }
  
  static renderWorkProgress(work, phase) {
    const grid = document.getElementById('workGrid');
    if (!grid) return;
    
    const workItems = this.getWorkItemsForPhase(work, phase);
    grid.innerHTML = workItems.map(([name, value, bgClass, textClass]) => {
      const percentage = UIHelper.clampPercentage(value);
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
    
    UIHelper.setText('teamLeaderName', engineeringTeamLeader);
    UIHelper.setText('teamLeaderNameTeam', teamLeaderFromSD06);
    UIHelper.setText('accountManagerNameTeam', accountManager);
    UIHelper.setText('siteManagerName', siteManager);
    
    this.setupContactButtons(teamLeaderFromSD06, accountManager);
  }
  
  static setupContactButtons(teamLeader, accountManager) {
    const appState = AppState.getInstance();
    
    if (teamLeader && teamLeader !== '--') {
      const teamLeaderCard = document.querySelector('#teamLeaderNameTeam')?.closest('.contact-card');
      if (teamLeaderCard) {
        teamLeaderCard.style.cursor = 'pointer';
        teamLeaderCard.onclick = () => this.showContactInfo(teamLeader, 'Team Leader');
        teamLeaderCard.title = `Click to contact ${teamLeader}`;
      }
    }
    
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
      UIHelper.showNotification(`No ${role} assigned`, 'info');
      return;
    }
    
    let phoneNumber = appState.contactData[name];
    
    if (!phoneNumber) {
      const nameParts = name.split(' ').filter(part => part.length > 2);
      for (const part of nameParts) {
        phoneNumber = appState.contactData[part];
        if (phoneNumber) break;
      }
    }
    
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
      UIHelper.showNotification(`${role} phone number not found for ${name}`, 'warning');
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
      UIHelper.showElement('threeDCard');
      iframe.src = cleanUrl;
      UIHelper.showElement('threeDIframe');
      UIHelper.hideElement('threeDPlaceholder');
    } else {
      UIHelper.hideElement('threeDCard');
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
            <div class="absolute -top-12 left-0 text-xs text-blue-500">${UIHelper.formatDate(planned.start)}</div>
            <div class="absolute -top-12 right-0 text-xs text-blue-500">${UIHelper.formatDate(planned.end)}</div>
          </div>
          
          ${actualStart ? `
          <div class="absolute top-3/4 h-4 bg-green-500 rounded-full transform -translate-y-1/2" 
               style="left: ${calculatePosition(actualStart)}%; width: ${calculatePosition(actualEnd || new Date()) - calculatePosition(actualStart)}%">
            <div class="absolute -bottom-6 left-0 right-0 text-center text-xs text-green-600 font-medium">Actual</div>
            <div class="absolute -bottom-12 left-0 text-xs text-green-500">${UIHelper.formatDate(actual.start)}</div>
            ${actualEnd ? `
            <div class="absolute -bottom-12 right-0 text-xs text-green-500">${UIHelper.formatDate(actual.end)}</div>
            ` : `
            <div class="absolute -bottom-12 right-0 text-xs text-green-500">In Progress</div>
            `}
          </div>
          ` : ''}
          
          <div class="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
            <span>${UIHelper.formatDate(minDate)}</span>
            <span>${UIHelper.formatDate(maxDate)}</span>
          </div>
        </div>
      `;
      
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
  
  static renderManagerDashboard(data) {
    // Manager dashboard rendering logic would go here
  }
  
  static showNoUnitsMessage() {
    UIHelper.setText('dashboardTitle', 'No Units Available');
    UIHelper.setText('dashboardSubtitle', 'Please contact administrator');
    UIHelper.hideElement('unitContent');
  }
  
  static updateLastUpdate() {
    const lastUpdate = UIHelper.getLastSunday();
    UIHelper.setText('lastUpdate', `Last updated: ${lastUpdate}`);
    UIHelper.setText('managerLastUpdate', `Last updated: ${lastUpdate}`);
  }
  
  static handleLogout() {
    const appState = AppState.getInstance();
    appState.clear();
    SessionManager.clearSession();
    
    UIHelper.hideElement('clientDashboard');
    UIHelper.hideElement('managerDashboard');
    UIHelper.showElement('loginScreen');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    
    UIHelper.showNotification('Logged out successfully', 'info');
  }
  
  static setupErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }
}

// ============= APPLICATION STARTUP =============
document.addEventListener('DOMContentLoaded', () => {
  console.log('PlanSee Portal Initializing...');
  AppController.initialize();
});

// ============= GLOBAL EXPORTS FOR HTML EVENT HANDLERS =============
window.AppController = AppController;

function logout() {
  AppController.handleLogout();
}

function switchUnit(sd06Code) {
  AppController.switchUnit(sd06Code);
}

// Legacy function compatibility
function onAuth(res, remember, creds) {
  AppController.handleAuthSuccess(res, remember, creds);
}

console.log('PlanSee Portal - Professional Version Loaded');
</script>
</body>
</html>
