/******************************************************
 * PlanSee Client Portal - Frontend JS
 * Connected to Secure API (2025 Edition)
 * Author: PlanSee Interiors
 ******************************************************/

// ============= CONFIG ===================
const API_URL = "https://script.google.com/macros/s/AKfycbwSrnuueNUU4ZguMkxlXgWkKh9iS8_EUBUAZooLSJUV2iLUO4oYgc4DyM2fwZbwNQX3/exec";
const API_KEY = "PLANSEE_MASTER_2025";

// ============= STATE ====================
let currentUser = null;
let currentUnits = [];
let currentRole = null;

// ============= LOGIN ====================
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Please enter both username and password");
    return;
  }

  try {
    const url = `${API_URL}?action=authenticate&key=${API_KEY}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      alert("Invalid credentials. Please try again.");
      return;
    }

    currentUser = data.name;
    currentRole = data.role;
    currentUnits = data.units || [];

    if (currentRole === "manager") {
      showManagerDashboard();
    } else {
      showClientUnits(currentUnits);
    }

  } catch (err) {
    console.error(err);
    alert("Connection error. Please try again later.");
  }
}

// ============= CLIENT VIEW ==============
function showClientUnits(units) {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("client-section").style.display = "block";
  const list = document.getElementById("client-units");
  list.innerHTML = "";

  if (!units || units.length === 0) {
    list.innerHTML = `<p>No units found for this account.</p>`;
    return;
  }

  units.forEach(u => {
    const btn = document.createElement("button");
    btn.textContent = `${u.unitName} – ${u.compound}`;
    btn.className = "unit-button";
    btn.onclick = () => loadClientReport(u.sd06Code);
    list.appendChild(btn);
  });
}

async function loadClientReport(code) {
  try {
    const url = `${API_URL}?action=getClient&id=${encodeURIComponent(code)}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      alert("Unable to load project data.");
      return;
    }

    showClientReport(data);
  } catch (err) {
    console.error(err);
    alert("Error fetching report.");
  }
}

function showClientReport(report) {
  const { unit, design, execution, view3D, currentPhase, lastUpdate } = report;

  document.getElementById("client-report").style.display = "block";
  document.getElementById("unitName").textContent = unit.unitType || "—";
  document.getElementById("compound").textContent = unit.compound || "—";
  document.getElementById("phase").textContent = design.phase || currentPhase;
  document.getElementById("progress").textContent = `${execution.completion || 0}%`;
  document.getElementById("status").textContent = execution.status || "--";
  document.getElementById("lastUpdate").textContent = lastUpdate || "--";

  if (view3D) {
    const link = document.getElementById("view3D");
    link.href = view3D;
    link.style.display = "inline-block";
  }
}

// ============= MANAGER VIEW ==============
async function showManagerDashboard() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("manager-section").style.display = "block";

  try {
    const url = `${API_URL}?action=getExecution&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      alert("Unable to load dashboard.");
      return;
    }

    renderManagerDashboard(data);
  } catch (err) {
    console.error(err);
    alert("Dashboard error.");
  }
}

function renderManagerDashboard(data) {
  const container = document.getElementById("manager-dashboard");
  container.innerHTML = "";

  if (!data.data || data.data.length === 0) {
    container.innerHTML = "<p>No projects found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  const headers = Object.keys(data.data[0]);
  const headerRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  data.data.forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      td.textContent = row[h];
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
}

// ============= EXPORTS ==============
async function exportProjects() {
  try {
    const url = `${API_URL}?action=exportProjects&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok && data.url) {
      window.open(data.url, "_blank");
    } else {
      alert("Export failed.");
    }
  } catch (err) {
    console.error(err);
    alert("Error exporting data.");
  }
}

// ============= LOGOUT ==============
function logout() {
  currentUser = null;
  currentRole = null;
  currentUnits = [];
  document.getElementById("login-section").style.display = "block";
  document.getElementById("client-section").style.display = "none";
  document.getElementById("manager-section").style.display = "none";
  document.getElementById("client-report").style.display = "none";
}
