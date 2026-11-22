// GasFlow LPG Refilling Station — Management, POS & Admin Dashboard
// White + Burgundy + Army Green Theme | Strict Role Separation | Audit Download

let state = {
  currentUser: null,
  overview: null,
  orders: [],
  purchases: [],
  logs: [],
  currentTab: 'pos',
  posMode: 'preset',
  selectedPresetKg: 12.5,
  presetQuantity: 1,
  paymentMethod: 'POS_CARD',
  pricePerKg: 1250,
  pendingOrder: null
};

// ============================================================
// PASSWORD EYE TOGGLE
// ============================================================
function toggleEye(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input) return;

  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';

  if (icon) {
    icon.innerHTML = isHidden
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
  }
}

// ============================================================
// FORGOT PASSWORD
// ============================================================
function showForgotPassword() {
  const box = document.getElementById('forgot-box');
  if (box) box.classList.toggle('hidden');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadOverview();
  loadOrders();
  loadPurchases();
  loadLogs();

  setInterval(() => {
    loadOverview();
    if (state.currentTab === 'sales')      { loadOrders(); }
    if (state.currentTab === 'management') { loadPurchases(); }
    if (state.currentTab === 'admin')      { loadOrders(); loadPurchases(); loadLogs(); }
  }, 7000);
});

// ============================================================
// LANDING PAGE CALCULATOR & PRESENTATION
// ============================================================
let landingCalcKg = 12.5;

function setLandingCalcKg(kg) {
  landingCalcKg = Number(kg);
  const input = document.getElementById('landing-custom-kg');
  if (input) input.value = '';

  // Update UI buttons
  document.querySelectorAll('.landing-calc-btn').forEach(btn => {
    const bkg = Number(btn.getAttribute('data-kg'));
    if (bkg === landingCalcKg) {
      btn.className = 'landing-calc-btn relative p-3.5 rounded-2xl border-2 border-burgundy bg-burgundy-subtle text-left transition ring-2 ring-burgundy/20';
    } else {
      btn.className = 'landing-calc-btn p-3.5 rounded-2xl border border-gray-200 bg-gray-50 hover:border-burgundy hover:bg-burgundy-subtle text-left transition';
    }
  });

  recalculateLandingTotal();
}

function onLandingCustomKgInput() {
  const input = document.getElementById('landing-custom-kg');
  const val = Number(input?.value);
  if (val && val > 0) {
    landingCalcKg = val;
    // Unselect presets
    document.querySelectorAll('.landing-calc-btn').forEach(btn => {
      btn.className = 'landing-calc-btn p-3.5 rounded-2xl border border-gray-200 bg-gray-50 hover:border-burgundy hover:bg-burgundy-subtle text-left transition';
    });
    recalculateLandingTotal();
  }
}

function recalculateLandingTotal() {
  const rate = state.pricePerKg || 1250;
  const total = Math.round(landingCalcKg * rate);
  safeSet('landing-calc-total', '₦' + total.toLocaleString());
  safeSet('landing-calc-kg-summary', landingCalcKg.toString());
}

function updateLandingUI(overview) {
  if (!overview) return;
  const stationName = overview.station?.name || "Al-Barakah Modern LPG Gas Station";
  const rate = overview.settings?.pricePerKg || state.pricePerKg || 1250;
  const stock = overview.tank?.currentStockKg || 4000;
  const address = overview.station?.address || "Plot 14, Commercial Avenue, Bypass Road";
  const phone = overview.station?.phone || "+234 803 123 4567";
  const rc = overview.station?.rcNumber || "RC: 1849204";

  safeSet('landing-station-name', stationName);
  safeSet('landing-price-display', '₦' + rate.toLocaleString());
  safeSet('landing-tank-display', stock.toLocaleString());
  safeSet('calc-rate-badge', '₦' + rate.toLocaleString() + ' / KG');
  safeSet('landing-address', address + (overview.station?.city ? ', ' + overview.station.city : ''));
  safeSet('landing-phone', phone);
  safeSet('landing-rc', rc + ' • Licensed LPG Dispensing Plant');

  // Update preset prices on landing page
  document.querySelectorAll('[data-calc-price]').forEach(el => {
    const kg = Number(el.getAttribute('data-calc-price'));
    if (kg) {
      el.textContent = '₦' + (Math.round(kg * rate)).toLocaleString();
    }
  });

  recalculateLandingTotal();
}

// ============================================================
// AUTH & SHIFTS
// ============================================================
function checkAuth() {
  const saved = localStorage.getItem('gasflow_user');
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved);
      updateUserHeader();
      hideAuthOverlay();
      buildNav();
      goHome();
      return;
    } catch (e) {}
  }
  // When visitor lands on the site, show the landing page
  state.currentUser = null;
  updateUserHeader();
  hideAuthOverlay();
  buildNav();
  switchTab('landing');
}

function showAuthOverlay() { 
  const el = document.getElementById('auth-overlay');
  if (el) el.classList.remove('hidden'); 
}

function hideAuthOverlay() { 
  const el = document.getElementById('auth-overlay');
  if (el) el.classList.add('hidden'); 
}

function quickFillLogin(u, p) {
  document.getElementById('login-username').value = u;
  document.getElementById('login-password').value = p;
  document.getElementById('form-login').dispatchEvent(new Event('submit'));
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorEl  = document.getElementById('login-error');
  if (errorEl) errorEl.classList.add('hidden');

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    state.currentUser = data.user;
    localStorage.setItem('gasflow_user', JSON.stringify(data.user));
    updateUserHeader();
    hideAuthOverlay();
    buildNav();
    goHome();
    loadLogs();
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  }
}

async function handleLogout() {
  if (!confirm(`Are you sure you want to log out, ${state.currentUser?.name || 'Staff'}?`)) return;

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: state.currentUser?.name, role: state.currentUser?.role })
    });
  } catch (e) {}

  localStorage.removeItem('gasflow_user');
  state.currentUser = null;
  state.pendingOrder = null;
  updateUserHeader();
  buildNav();
  switchTab('landing');
  loadLogs();
}

function updateUserHeader() {
  const userBadge = document.getElementById('nav-user-badge');
  const logoutBtn = document.getElementById('nav-btn-logout');
  const signinBtn = document.getElementById('nav-btn-signin');

  if (state.currentUser) {
    if (userBadge) {
      userBadge.classList.remove('hidden');
      userBadge.classList.add('flex');
    }
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (signinBtn) signinBtn.classList.add('hidden');
    safeSet('nav-current-user-name', state.currentUser.name);
    safeSet('nav-current-user-role', state.currentUser.role);
  } else {
    if (userBadge) {
      userBadge.classList.add('hidden');
      userBadge.classList.remove('flex');
    }
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (signinBtn) signinBtn.classList.remove('hidden');
    safeSet('nav-current-user-name', 'Guest Visitor');
    safeSet('nav-current-user-role', 'Public');
  }
}

// ============================================================
// ROLE HELPERS
// ============================================================
function isOwner() {
  const role = (state.currentUser?.role || '').toLowerCase();
  return role.includes('owner') || role.includes('admin');
}

function isManager() {
  const role = (state.currentUser?.role || '').toLowerCase();
  return role.includes('manager') && !role.includes('owner') && !role.includes('admin');
}

function isCashier() {
  const role = (state.currentUser?.role || '').toLowerCase();
  return role.includes('cashier');
}

// ============================================================
// DYNAMIC NAVIGATION
// ============================================================
function buildNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  nav.innerHTML = '';

  if (!state.currentUser) {
    // Visitor navigation
    nav.appendChild(makeNavBtn('landing', '🏠 Station Overview & Price Calculator'));
    return;
  }

  // Logged-in Navigation
  nav.appendChild(makeNavBtn('landing', '🏠 Public Overview'));

  if (isOwner()) {
    // Owner only sees Admin Dashboard
    nav.appendChild(makeNavBtn('admin', '📊 Admin Dashboard'));
  } else if (isManager()) {
    // Manager sees Cashier, Sales Records, Management, Workers
    nav.appendChild(makeNavBtn('pos',        '🏧 Cashier'));
    nav.appendChild(makeNavBtn('sales',      '📋 Sales Records'));
    nav.appendChild(makeNavBtn('management', '📦 Management'));
    nav.appendChild(makeNavBtn('workers',    '👥 Workers'));
  } else {
    // Cashier sees only Cashier
    nav.appendChild(makeNavBtn('pos', '🏧 Cashier'));
  }
}

function makeNavBtn(tab, label) {
  const btn = document.createElement('button');
  btn.id        = `tab-btn-${tab}`;
  btn.textContent = label;
  btn.onclick   = () => switchTab(tab);
  btn.className = 'px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition border border-gray-200 text-gray-500 hover:bg-gray-50';
  return btn;
}

function goHome() {
  if (!state.currentUser) {
    switchTab('landing');
  } else if (isOwner()) {
    switchTab('admin');
  } else {
    switchTab('pos');
  }
}

function switchTab(tab) {
  // Permission checks
  if (!state.currentUser && tab !== 'landing') {
    showAuthOverlay();
    return;
  }
  if (tab === 'admin' && !isOwner()) {
    tab = isManager() || isCashier() ? 'pos' : 'landing';
  }
  if ((tab === 'sales' || tab === 'management' || tab === 'workers') && !isManager() && !isOwner()) {
    tab = isCashier() ? 'pos' : 'landing';
  }

  state.currentTab = tab;

  // Toggle views
  const allViews = ['view-landing', 'view-pos', 'view-sales', 'view-management', 'view-workers', 'view-admin'];
  allViews.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('block');
    }
  });

  const activeView = document.getElementById(`view-${tab}`);
  if (activeView) {
    activeView.classList.remove('hidden');
    activeView.classList.add('block');
  }

  // Update nav buttons
  const activeClass   = 'px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition bg-burgundy text-white shadow-md';
  const inactiveClass = 'px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition border border-gray-200 text-gray-500 hover:bg-gray-50';

  ['landing', 'pos', 'sales', 'management', 'workers', 'admin'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) btn.className = t === tab ? activeClass : inactiveClass;
  });

  // Load view data
  if (tab === 'landing') {
    if (state.overview) updateLandingUI(state.overview);
  } else if (tab === 'pos') {
    loadOverview();
  } else if (tab === 'sales') {
    loadOverview();
    loadOrders();
    renderSalesTab();
  } else if (tab === 'management') {
    loadOverview();
    loadPurchases();
    renderManagementTab();
  } else if (tab === 'workers') {
    resetRegisterForm();
  } else if (tab === 'admin') {
    loadOverview();
    loadOrders();
    loadPurchases();
    loadLogs();
  }
}

// ============================================================
// API LOADERS
// ============================================================
async function loadOverview() {
  try {
    const res = await fetch('/api/overview');
    if (!res.ok) return;
    const data = await res.json();
    state.overview  = data;
    state.pricePerKg = data.settings?.pricePerKg || 1250;

    safeSet('nav-station-name',   data.station?.name || 'Cooking Gas Refilling Station');
    safeSet('nav-price-per-kg',   `₦${state.pricePerKg.toLocaleString()}`);
    safeSet('pos-rate-indicator', `₦${state.pricePerKg.toLocaleString()}`);

    const stockKg = Math.round(data.tank?.currentStockKg || 0);
    safeSet('nav-tank-stock', `${stockKg.toLocaleString()} KG`);

    document.querySelectorAll('.preset-price').forEach(el => {
      const kg = parseFloat(el.getAttribute('data-kg')) || 0;
      el.textContent = `₦${(kg * state.pricePerKg).toLocaleString()}`;
    });

    if (state.currentTab === 'sales')      renderSalesTab();
    if (state.currentTab === 'management') renderManagementTab();
    if (state.currentTab === 'admin')      renderAdminDashboard();

    updateLandingUI(data);
    recalculate();
  } catch (err) {
    console.error('Overview error:', err);
  }
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders?limit=250');
    if (!res.ok) return;
    state.orders = await res.json();
    if (state.currentTab === 'sales') renderSalesTab();
    if (state.currentTab === 'admin') renderAdminDashboard();
  } catch (err) {
    console.error('Orders error:', err);
  }
}

async function loadPurchases() {
  try {
    const res = await fetch('/api/tank');
    if (!res.ok) return;
    const data = await res.json();
    state.purchases = data.deliveries || [];
    if (state.currentTab === 'management') renderManagementTab();
    if (state.currentTab === 'admin')      renderAdminDashboard();
  } catch (err) {
    console.error('Purchases error:', err);
  }
}

async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    if (!res.ok) return;
    state.logs = await res.json();
    if (state.currentTab === 'admin') renderAdminLogs();
  } catch (err) {
    console.error('Logs error:', err);
  }
}

// ============================================================
// SALES TAB (Manager)
// ============================================================
function renderSalesTab() {
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayOrds = state.orders.filter(o => o.createdAt?.startsWith(todayStr) && o.status !== 'CANCELLED');
  const todayRev  = todayOrds.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayKg   = todayOrds.reduce((s, o) => s + (o.kgRequested || 0), 0);
  const posRev    = todayOrds.filter(o => o.paymentMethod === 'POS_CARD').reduce((s, o) => s + o.totalAmount, 0);
  const cashRev   = todayOrds.filter(o => o.paymentMethod === 'CASH').reduce((s, o) => s + o.totalAmount, 0);
  const tfrRev    = todayOrds.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((s, o) => s + o.totalAmount, 0);

  safeSet('sales-stat-revenue',  `₦${todayRev.toLocaleString()}`);
  safeSet('sales-stat-kg',       `${todayKg.toFixed(1)} KG sold today`);
  safeSet('sales-stat-pos',      `₦${posRev.toLocaleString()}`);
  safeSet('sales-stat-cash',     `₦${cashRev.toLocaleString()}`);
  safeSet('sales-stat-transfer', `₦${tfrRev.toLocaleString()}`);

  const tbody = document.getElementById('sales-table-body');
  if (!tbody) return;

  if (state.orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-gray-400">No sales recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = state.orders.map(o => `
    <tr class="hover:bg-gray-50 transition">
      <td class="py-2.5 px-3">
        <div class="font-bold text-burgundy font-mono text-xs">${o.tokenCode}</div>
        <div class="text-[9px] text-gray-400">${o.orderNumber}</div>
      </td>
      <td class="py-2.5 px-3 font-mono text-gray-500">
        <div>${new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="text-[9px] text-gray-400">${new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
      </td>
      <td class="py-2.5 px-3 text-gray-700 font-medium">${o.cashierName || 'Cashier'}</td>
      <td class="py-2.5 px-3 text-gray-700">${o.cylinderType}</td>
      <td class="py-2.5 px-3 font-bold text-gray-900 font-mono">${o.kgRequested} KG</td>
      <td class="py-2.5 px-3 font-black text-army font-mono">₦${o.totalAmount.toLocaleString()}</td>
      <td class="py-2.5 px-3">${payBadge(o.paymentMethod)}</td>
      <td class="py-2.5 px-3 text-center">
        <button onclick='showReceiptModal(${JSON.stringify(o).replace(/'/g, "&#39;")})' class="p-1 text-gray-400 hover:text-burgundy transition" title="Reprint Receipt">🖨️</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// MANAGEMENT TAB (Manager)
// ============================================================
function renderManagementTab() {
  safeSet('mgr-current-rate', `₦${(state.pricePerKg || 1250).toLocaleString()}`);
  safeSet('mgr-purchase-count', `${state.purchases.length} purchases`);

  const tbody = document.getElementById('mgr-purchases-tbody');
  if (!tbody) return;

  if (state.purchases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">No depot purchases logged yet.</td></tr>';
    return;
  }

  tbody.innerHTML = state.purchases.map(p => `
    <tr class="hover:bg-gray-50 transition">
      <td class="py-2.5 px-3 font-mono text-gray-500">${new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td class="py-2.5 px-3 font-bold text-gray-900">${p.supplier}</td>
      <td class="py-2.5 px-3 text-gray-500">${p.truckNumber || 'N/A'}</td>
      <td class="py-2.5 px-3 text-gray-400">${p.waybillNumber || 'N/A'}</td>
      <td class="py-2.5 px-3 font-black text-army font-mono">+${(p.kgReceived || 0).toLocaleString()} KG</td>
      <td class="py-2.5 px-3 text-gray-500">₦${(p.costPerKg || 0).toLocaleString()}</td>
      <td class="py-2.5 px-3 font-extrabold text-gray-900">₦${(p.totalCost || 0).toLocaleString()}</td>
    </tr>
  `).join('');
}

// ============================================================
// ADMIN DASHBOARD TAB (Owner only)
// ============================================================
function renderAdminDashboard() {
  const data      = state.overview;
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayOrds = state.orders.filter(o => o.createdAt?.startsWith(todayStr) && o.status !== 'CANCELLED');
  const todayRev  = todayOrds.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayKg   = todayOrds.reduce((s, o) => s + (o.kgRequested || 0), 0);
  const posRev    = todayOrds.filter(o => o.paymentMethod === 'POS_CARD').reduce((s, o) => s + o.totalAmount, 0);
  const cashRev   = todayOrds.filter(o => o.paymentMethod === 'CASH').reduce((s, o) => s + o.totalAmount, 0);
  const tfrRev    = todayOrds.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((s, o) => s + o.totalAmount, 0);
  const allRev    = state.orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const stockKg   = data?.tank?.currentStockKg || 0;
  const pct       = data?.tank?.percentage ?? ((stockKg / (data?.tank?.capacityKg || 5000)) * 100).toFixed(1);

  const lastCostPerKg  = state.purchases.length > 0 ? (state.purchases[0].costPerKg || 0) : 0;
  const profitEstimate = todayKg * (state.pricePerKg - lastCostPerKg);

  safeSet('adm-stat-tank',          `${Math.round(stockKg).toLocaleString()} KG`);
  safeSet('adm-stat-tank-pct',      `${pct}% capacity`);
  safeSet('adm-stat-revenue-today', `₦${todayRev.toLocaleString()}`);
  safeSet('adm-stat-kg-today',      `${todayKg.toFixed(1)} KG sold`);
  safeSet('adm-stat-revenue-all',   `₦${allRev.toLocaleString()}`);
  safeSet('adm-stat-profit',        `₦${Math.max(0, Math.round(profitEstimate)).toLocaleString()}`);
  safeSet('adm-pos-sales',          `₦${posRev.toLocaleString()}`);
  safeSet('adm-cash-sales',         `₦${cashRev.toLocaleString()}`);
  safeSet('adm-transfer-sales',     `₦${tfrRev.toLocaleString()}`);

  safeSet('adm-purchase-count', `${state.purchases.length} deliveries`);
  const ptbody = document.getElementById('adm-purchases-tbody');
  if (ptbody) {
    if (state.purchases.length === 0) {
      ptbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">No purchases logged.</td></tr>';
    } else {
      ptbody.innerHTML = state.purchases.map(p => `
        <tr class="hover:bg-gray-50 transition">
          <td class="py-2.5 px-3 font-mono text-gray-500">${new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td class="py-2.5 px-3 font-bold text-gray-900">${p.supplier}</td>
          <td class="py-2.5 px-3 font-black text-army font-mono">+${(p.kgReceived || 0).toLocaleString()} KG</td>
          <td class="py-2.5 px-3 text-gray-500">₦${(p.costPerKg || 0).toLocaleString()}</td>
          <td class="py-2.5 px-3 font-extrabold text-gray-900">₦${(p.totalCost || 0).toLocaleString()}</td>
        </tr>
      `).join('');
    }
  }

  renderAdminLogs();
}

function renderAdminLogs() {
  const tbody = document.getElementById('adm-logs-tbody');
  if (!tbody) return;

  const search = (document.getElementById('adm-log-search')?.value || '').toLowerCase();
  const filter = (document.getElementById('adm-log-filter')?.value || 'ALL');

  const filtered = state.logs.filter(l => {
    const matchAction = filter === 'ALL' || l.action === filter;
    const matchSearch = !search ||
      (l.userName || '').toLowerCase().includes(search) ||
      (l.details  || '').toLowerCase().includes(search) ||
      (l.action   || '').toLowerCase().includes(search);
    return matchAction && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No logs found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const d       = new Date(l.timestamp);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let badge = 'bg-gray-100 text-gray-600';
    if (l.action === 'USER_LOGIN')     badge = 'bg-blue-50 text-blue-700 border border-blue-200';
    if (l.action === 'USER_LOGOUT')    badge = 'bg-gray-100 text-gray-500 border border-gray-200';
    if (l.action === 'SALE_COMPLETED') badge = 'bg-army-subtle text-army border border-army-muted';
    if (l.action === 'GAS_PURCHASED')  badge = 'bg-amber-50 text-amber-700 border border-amber-200';
    if (l.action === 'PRICE_CHANGED')  badge = 'bg-burgundy-subtle text-burgundy border border-burgundy-muted';
    if (l.action === 'USER_REGISTER')  badge = 'bg-purple-50 text-purple-700 border border-purple-200';
    if (l.action === 'USER_UPDATED')   badge = 'bg-indigo-50 text-indigo-700 border border-indigo-200';

    return `
      <tr class="hover:bg-gray-50 transition">
        <td class="py-2.5 px-4 text-gray-500">
          <div>${timeStr}</div><div class="text-[9px] text-gray-400">${dateStr}</div>
        </td>
        <td class="py-2.5 px-4 font-bold text-gray-900">${l.userName}</td>
        <td class="py-2.5 px-4 text-gray-500 text-[10px]">${l.role}</td>
        <td class="py-2.5 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge}">${l.action.replace(/_/g, ' ')}</span>
        </td>
        <td class="py-2.5 px-4 text-gray-700 text-xs font-sans">${l.details}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// CASHIER POS CALCULATOR & SALE FLOW
// ============================================================
function setPosMode(mode) {
  state.posMode = mode;

  const activeClass   = 'py-2 px-2 rounded-lg text-xs font-bold bg-burgundy text-white shadow';
  const inactiveClass = 'py-2 px-2 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900';

  document.getElementById('btn-mode-preset').className = mode === 'preset'      ? activeClass : inactiveClass;
  document.getElementById('btn-mode-kg').className     = mode === 'customKg'    ? activeClass : inactiveClass;
  document.getElementById('btn-mode-naira').className  = mode === 'customNaira' ? activeClass : inactiveClass;

  document.getElementById('pos-container-preset').classList.toggle('hidden', mode !== 'preset');
  document.getElementById('pos-container-kg').classList.toggle('hidden',     mode !== 'customKg');
  document.getElementById('pos-container-naira').classList.toggle('hidden',  mode !== 'customNaira');

  recalculate();
}

function selectPreset(kg) {
  state.selectedPresetKg = kg;

  document.querySelectorAll('.preset-btn').forEach(b => {
    b.className = 'preset-btn relative p-3.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-burgundy hover:bg-burgundy-subtle text-left transition';
  });

  const activeBtn = document.querySelector(`.preset-btn[data-kg="${kg}"]`);
  if (activeBtn) {
    activeBtn.className = 'preset-btn relative p-3.5 rounded-xl border-2 border-burgundy bg-burgundy-subtle text-left transition ring-2 ring-burgundy/20';
  }

  recalculate();
}

function changeQty(delta) {
  state.presetQuantity = Math.max(1, state.presetQuantity + delta);
  document.getElementById('pos-qty-display').textContent = state.presetQuantity;
  recalculate();
}

function recalculate() {
  const rate = state.pricePerKg || 1250;
  let totalKg = 0, totalNaira = 0, specText = '';

  if (state.posMode === 'preset') {
    totalKg    = state.selectedPresetKg * state.presetQuantity;
    totalNaira = Math.round(totalKg * rate);
    specText   = state.presetQuantity > 1
      ? `${state.presetQuantity}x ${state.selectedPresetKg}kg Cylinders`
      : `${state.selectedPresetKg}kg Cylinder`;
  } else if (state.posMode === 'customKg') {
    const val  = parseFloat(document.getElementById('input-custom-kg')?.value) || 0;
    totalKg    = Number(val.toFixed(2));
    totalNaira = Math.round(totalKg * rate);
    specText   = `${totalKg} KG Custom Refill`;
  } else if (state.posMode === 'customNaira') {
    const val  = parseFloat(document.getElementById('input-custom-naira')?.value) || 0;
    totalNaira = val;
    totalKg    = rate > 0 ? Number((totalNaira / rate).toFixed(2)) : 0;
    specText   = `₦${totalNaira.toLocaleString()} Gas Refill`;
  }

  safeSet('pos-bill-spec',  specText);
  safeSet('pos-bill-kg',    totalKg);
  safeSet('pos-bill-naira', `₦${totalNaira.toLocaleString()}`);

  return { totalKg, totalNaira, specText };
}

function setPaymentMethod(method) {
  state.paymentMethod = method;

  const inactiveClass = 'pay-method-btn p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 flex flex-col items-center space-y-1 hover:border-army hover:text-army hover:bg-army-subtle';
  document.querySelectorAll('.pay-method-btn').forEach(b => { b.className = inactiveClass; });

  const activeBase = 'pay-method-btn p-3 rounded-xl border-2 flex flex-col items-center space-y-1';
  if (method === 'POS_CARD') {
    document.getElementById('pay-btn-pos').className = `${activeBase} border-burgundy bg-burgundy-subtle text-burgundy ring-2 ring-burgundy/20`;
  } else if (method === 'CASH') {
    document.getElementById('pay-btn-cash').className = `${activeBase} border-army bg-army-subtle text-army ring-2 ring-army/20`;
  } else if (method === 'BANK_TRANSFER') {
    document.getElementById('pay-btn-transfer').className = `${activeBase} border-army bg-army-subtle text-army ring-2 ring-army/20`;
  }
}

// STEP 1: Mark as Paid
async function handleMarkPaid() {
  const { totalKg, totalNaira, specText } = recalculate();

  if (totalKg <= 0 || totalNaira <= 0) {
    alert('Please select a cylinder size or enter an amount first.');
    return;
  }

  const btn = document.getElementById('btn-mark-paid');
  btn.disabled = true;
  btn.textContent = 'Processing Sale…';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cylinderType:  specText,
        kgRequested:   totalKg,
        paymentMethod: state.paymentMethod,
        paymentRef:    state.paymentMethod === 'POS_CARD' ? 'POS-APPROVED'
                     : state.paymentMethod === 'CASH'      ? 'CASH-PAID'
                     : 'TRANSFER-CONFIRMED',
        customerName:  'Walk-in Household',
        workerName:    state.currentUser?.name || 'Cashier',
        workerRole:    state.currentUser?.role || 'Cashier'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to record sale');
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg><span>MARK AS PAID</span>`;
      return;
    }

    state.pendingOrder = data.order;
    loadOverview();
    showStep2(data.order);
  } catch (err) {
    alert('Connection error: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg><span>MARK AS PAID</span>`;
  }
}

function showStep2(order) {
  document.getElementById('step-paid-section').classList.add('hidden');
  document.getElementById('step-print-section').classList.remove('hidden');
  safeSet('paid-receipt-ref', `${order.orderNumber} • Token: ${order.tokenCode}`);
}

function doPrintReceipts() {
  if (!state.pendingOrder) return;
  showReceiptModal(state.pendingOrder);
}

function resetPosForNextCustomer() {
  state.pendingOrder   = null;
  state.presetQuantity = 1;
  safeSet('pos-qty-display', '1');

  const kgEl    = document.getElementById('input-custom-kg');
  const nairaEl = document.getElementById('input-custom-naira');
  if (kgEl)    kgEl.value    = '';
  if (nairaEl) nairaEl.value = '';

  document.getElementById('step-paid-section').classList.remove('hidden');
  document.getElementById('step-print-section').classList.add('hidden');

  const btn = document.getElementById('btn-mark-paid');
  btn.disabled  = false;
  btn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg><span>MARK AS PAID</span>`;

  selectPreset(12.5);
  recalculate();
}

// ============================================================
// RECEIPT MODAL
// ============================================================
function showReceiptModal(order) {
  const station = state.overview?.station || {};

  safeSet('receipt-modal-token',     `TOKEN: ${order.tokenCode}`);
  safeSet('receipt-station-name',    station.name || 'LPG COOKING GAS STATION');
  safeSet('receipt-station-address', station.address || 'Refilling Station');
  safeSet('receipt-order-no',        order.orderNumber);
  safeSet('receipt-cashier-name',    order.cashierName || state.currentUser?.name || 'Cashier');
  safeSet('receipt-payment',         order.paymentMethod.replace(/_/g, ' '));

  const d = new Date(order.createdAt);
  safeSet('receipt-datetime',
    `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  );

  safeSet('receipt-spec',       order.cylinderType);
  safeSet('receipt-total',      `₦${order.totalAmount.toLocaleString()}`);
  safeSet('receipt-rate-calc',  `Weight: ${order.kgRequested} KG @ ₦${order.ratePerKg.toLocaleString()}/kg`);
  safeSet('receipt-slip-token', order.tokenCode);
  safeSet('receipt-slip-kg',    `${order.kgRequested} KG`);
  safeSet('receipt-slip-ref',   order.orderNumber);

  document.getElementById('modal-receipt').classList.remove('hidden');
}

function closeReceiptModal() {
  document.getElementById('modal-receipt').classList.add('hidden');
  if (state.pendingOrder) resetPosForNextCustomer();
}

function printReceipt() {
  window.print();
}

// ============================================================
// WORKER REGISTRATION (Manager Panel)
// ============================================================
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const role     = document.getElementById('reg-role').value;
  const password = document.getElementById('reg-password').value.trim();
  const phone    = document.getElementById('reg-phone').value.trim();
  const errorEl  = document.getElementById('reg-error');
  const successEl = document.getElementById('reg-success');

  if (errorEl)   errorEl.classList.add('hidden');
  if (successEl) successEl.classList.add('hidden');

  if (!name || !username || !password) {
    if (errorEl) {
      errorEl.textContent = 'Please fill in Full Name, Username, and Password.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password, role, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    if (successEl) {
      successEl.textContent = data.updated
        ? `✅ Worker "${data.user.name}" (@${data.user.username}) password/details updated successfully!`
        : `✅ New Cashier "${data.user.name}" (@${data.user.username}) registered successfully!`;
      successEl.classList.remove('hidden');
    }
    resetRegisterForm();
    loadLogs();
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  }
}

function resetRegisterForm() {
  ['reg-name', 'reg-username', 'reg-password', 'reg-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const roleEl = document.getElementById('reg-role');
  if (roleEl) roleEl.value = 'Cashier (Morning)';

  const passEl = document.getElementById('reg-password');
  if (passEl) passEl.type = 'password';
  const eye = document.getElementById('eye-reg');
  if (eye) {
    eye.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
  }
}

// ============================================================
// SECRET EXECUTIVE SETUP (Owner / Manager Registration)
// ============================================================
function openSecretSetupModal() {
  ['secret-master-pass', 'secret-name', 'secret-username', 'secret-password', 'secret-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const errorEl   = document.getElementById('secret-error');
  const successEl = document.getElementById('secret-success');
  if (errorEl)   errorEl.classList.add('hidden');
  if (successEl) successEl.classList.add('hidden');

  document.getElementById('modal-secret-setup').classList.remove('hidden');
}

function closeSecretSetupModal() {
  document.getElementById('modal-secret-setup').classList.add('hidden');
}

async function handleSecretSetupSubmit(e) {
  e.preventDefault();
  const masterPasscode = document.getElementById('secret-master-pass').value.trim();
  const name           = document.getElementById('secret-name').value.trim();
  const username       = document.getElementById('secret-username').value.trim();
  const role           = document.getElementById('secret-role').value;
  const password       = document.getElementById('secret-password').value.trim();
  const phone          = document.getElementById('secret-phone').value.trim();

  const errorEl   = document.getElementById('secret-error');
  const successEl = document.getElementById('secret-success');
  if (errorEl)   errorEl.classList.add('hidden');
  if (successEl) successEl.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/register-executive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterPasscode, name, username, role, password, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Setup failed');

    if (successEl) {
      successEl.textContent = `✅ Success! Executive account created for ${data.user.name} as ${data.user.role}. You can now sign in.`;
      successEl.classList.remove('hidden');
    }

    setTimeout(() => {
      closeSecretSetupModal();
      document.getElementById('login-username').value = data.user.username;
      document.getElementById('login-password').value = password;
    }, 1800);
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  }
}

// ============================================================
// BULK GAS PURCHASE MODAL
// ============================================================
function openPurchaseModal() {
  ['purchase-kg', 'purchase-supplier', 'purchase-truck', 'purchase-waybill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('modal-purchase').classList.remove('hidden');
}

function closePurchaseModal() {
  document.getElementById('modal-purchase').classList.add('hidden');
}

async function handlePurchaseSubmit(e) {
  e.preventDefault();
  const kg       = parseFloat(document.getElementById('purchase-kg').value);
  const supplier = document.getElementById('purchase-supplier').value.trim();
  const truck    = document.getElementById('purchase-truck').value.trim();
  const waybill  = document.getElementById('purchase-waybill').value.trim();
  const cost     = parseFloat(document.getElementById('purchase-cost').value) || 0;

  try {
    const res = await fetch('/api/tank/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kgReceived:    kg,
        supplier,
        truckNumber:   truck,
        waybillNumber: waybill,
        costPerKg:     cost,
        workerName:    state.currentUser?.name || 'Manager',
        offloadedBy:   state.currentUser?.name || 'Manager'
      })
    });

    if (res.ok) {
      closePurchaseModal();
      loadOverview();
      loadPurchases();
      loadLogs();
      alert(`✅ Successfully added +${kg.toLocaleString()} KG of gas to station tank.`);
    } else {
      const data = await res.json();
      alert(data.error || 'Error recording purchase.');
    }
  } catch (err) {
    alert('Connection error: ' + err.message);
  }
}

// ============================================================
// RATE MODAL
// ============================================================
function openRateModal() {
  if (isCashier()) {
    alert('Only the Station Manager or Owner can change the gas rate.');
    return;
  }
  document.getElementById('input-new-rate').value = state.pricePerKg || 1250;
  document.getElementById('modal-rate').classList.remove('hidden');
}

function closeRateModal() {
  document.getElementById('modal-rate').classList.add('hidden');
}

async function handleRateSubmit(e) {
  e.preventDefault();
  const newRate = parseFloat(document.getElementById('input-new-rate').value);
  if (!newRate || newRate <= 0) return;

  try {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pricePerKg: newRate,
        workerName: state.currentUser?.name || 'Manager'
      })
    });

    if (res.ok) {
      closeRateModal();
      loadOverview();
      loadLogs();
    }
  } catch (err) {
    alert('Error updating rate: ' + err.message);
  }
}

// ============================================================
// CSV EXPORTS (Sales & Audit Log)
// ============================================================

// 1. Download Sales Records CSV
function exportCSV() {
  if (state.orders.length === 0) {
    alert('No sales records to download.');
    return;
  }
  const headers = ['Token', 'Receipt #', 'Date & Time', 'Cashier', 'Cylinder Spec', 'KG', 'Rate (NGN)', 'Total Amount (NGN)', 'Payment Method'];
  const rows = state.orders.map(o => [
    o.tokenCode,
    o.orderNumber,
    new Date(o.createdAt).toLocaleString(),
    `"${o.cashierName || 'Cashier'}"`,
    `"${o.cylinderType}"`,
    o.kgRequested,
    o.ratePerKg,
    o.totalAmount,
    o.paymentMethod
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `GasFlow_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Download Full Activity Audit Log CSV (Owner Feature)
function downloadAuditLog() {
  if (state.logs.length === 0) {
    alert('No audit logs to download.');
    return;
  }

  const search = (document.getElementById('adm-log-search')?.value || '').toLowerCase();
  const filter = (document.getElementById('adm-log-filter')?.value || 'ALL');

  const filtered = state.logs.filter(l => {
    const matchAction = filter === 'ALL' || l.action === filter;
    const matchSearch = !search ||
      (l.userName || '').toLowerCase().includes(search) ||
      (l.details  || '').toLowerCase().includes(search) ||
      (l.action   || '').toLowerCase().includes(search);
    return matchAction && matchSearch;
  });

  const headers = ['Log ID', 'Timestamp', 'Date', 'Time', 'Staff Member', 'Role / Shift', 'Action Type', 'Details Description'];
  const rows = filtered.map(l => {
    const d       = new Date(l.timestamp);
    const dateStr = d.toLocaleDateString('en-GB');
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const cleanDetails = (l.details || '').replace(/"/g, '""');
    return [
      l.id,
      l.timestamp,
      dateStr,
      timeStr,
      `"${l.userName || 'Staff'}"`,
      `"${l.role || 'Cashier'}"`,
      l.action,
      `"${cleanDetails}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `GasFlow_Station_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================
// HELPERS
// ============================================================
function safeSet(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function payBadge(method) {
  const map = {
    POS_CARD:      'bg-burgundy-subtle text-burgundy border border-burgundy-muted',
    CASH:          'bg-army-subtle text-army border border-army-muted',
    BANK_TRANSFER: 'bg-blue-50 text-blue-700 border border-blue-200'
  };
  const cls   = map[method] || 'bg-gray-100 text-gray-500';
  const label = method.replace(/_/g, ' ');
  return `<span class="px-2 py-0.5 rounded text-[10px] font-bold ${cls}">${label}</span>`;
}
