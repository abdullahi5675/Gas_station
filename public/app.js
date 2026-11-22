// GasFlow LPG Refilling Station — POS, Management & Admin Dashboard
// White + Burgundy + Army Green Theme | Role-based views | Two-step cashier flow

// ============================================================
// PASSWORD EYE TOGGLE
// ============================================================
function toggleEye(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input) return;

  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';

  // Swap icon between "eye" (visible) and "eye-off" (hidden)
  if (icon) {
    icon.innerHTML = isHidden
      // eye-off — password now visible, click to hide
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>`
      // eye — password now hidden, click to show
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
  }
}

// ============================================================
// FORGOT PASSWORD INFO BOX
// ============================================================
function showForgotPassword() {
  const box = document.getElementById('forgot-box');
  if (box) box.classList.toggle('hidden');
}

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
  // Two-step flow
  pendingOrder: null,     // set after PAID, cleared after PRINT or Next Customer
};

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
    if (state.currentTab === 'manager') { loadOrders(); loadPurchases(); }
    if (state.currentTab === 'admin')   { loadOrders(); loadPurchases(); loadLogs(); }
  }, 8000);
});

// ============================================================
// AUTH
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
  showAuthOverlay();
}

function showAuthOverlay() { document.getElementById('auth-overlay').classList.remove('hidden'); }
function hideAuthOverlay() { document.getElementById('auth-overlay').classList.add('hidden'); }

// No longer used for switching tabs on the public login page (login-only now)
// Kept for any internal references
function setAuthMode(mode) {}

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
  errorEl.classList.add('hidden');

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
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

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
    if (errorEl) { errorEl.textContent = 'Please fill in Full Name, Username and Password.'; errorEl.classList.remove('hidden'); }
    return;
  }

  try {
    const res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password, role, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    // ✅ Stay on Manager page — do NOT switch user session
    if (successEl) {
      successEl.textContent = `✅ Worker "${data.user.name}" registered successfully as ${data.user.role}.`;
      successEl.classList.remove('hidden');
    }
    resetRegisterForm();
    loadLogs();
  } catch (err) {
    if (errorEl) { errorEl.textContent = err.message; errorEl.classList.remove('hidden'); }
  }
}

function resetRegisterForm() {
  ['reg-name', 'reg-username', 'reg-password', 'reg-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const roleEl = document.getElementById('reg-role');
  if (roleEl) roleEl.value = 'Cashier (Morning)';
  // Reset eye toggle back to hidden
  const passEl = document.getElementById('reg-password');
  if (passEl) passEl.type = 'password';
  const eye = document.getElementById('eye-reg');
  if (eye) eye.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
}

async function handleLogout() {
  if (!confirm(`End shift for ${state.currentUser?.name || 'Worker'} and hand over?`)) return;

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
  document.getElementById('main-nav').innerHTML = '';
  showAuthOverlay();
  setAuthMode('login');
  loadLogs();
}

function updateUserHeader() {
  if (!state.currentUser) return;
  document.getElementById('nav-current-user-name').textContent = state.currentUser.name;
  document.getElementById('nav-current-user-role').textContent  = state.currentUser.role;
}

// ============================================================
// ROLE HELPERS
// ============================================================
function isManagerOrOwner() {
  const role = (state.currentUser?.role || '').toLowerCase();
  return role.includes('manager') || role.includes('owner');
}

function isCashier() {
  const role = (state.currentUser?.role || '').toLowerCase();
  return role.includes('cashier');
}

// ============================================================
// NAVIGATION — build tabs dynamically by role
// ============================================================
function buildNav() {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = '';

  // Always: POS tab
  nav.appendChild(makeNavBtn('pos', '🏧 Cashier POS'));

  // Manager / Owner: Management tab + Admin Dashboard
  if (isManagerOrOwner()) {
    nav.appendChild(makeNavBtn('manager', '📦 Management'));
    nav.appendChild(makeNavBtn('admin',   '📊 Admin Dashboard'));
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
  // Cashiers go to POS, managers/owners go to POS too (but have more tabs)
  switchTab('pos');
}

function switchTab(tab) {
  state.currentTab = tab;

  // Hide all views
  ['view-pos', 'view-manager', 'view-admin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('block'); }
  });

  // Show selected
  const target = document.getElementById(`view-${tab}`);
  if (target) { target.classList.remove('hidden'); target.classList.add('block'); }

  // Update nav active state
  const activeClass   = 'px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition bg-burgundy text-white shadow-md';
  const inactiveClass = 'px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition border border-gray-200 text-gray-500 hover:bg-gray-50';

  ['pos', 'manager', 'admin'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) btn.className = t === tab ? activeClass : inactiveClass;
  });

  // Admin tab only for managers
  if (tab === 'admin' && !isManagerOrOwner()) {
    switchTab('pos');
    return;
  }

  if (tab === 'manager') { loadOrders(); loadPurchases(); populateManagerView(); }
  if (tab === 'admin')   { loadOrders(); loadPurchases(); loadLogs(); }
}

// ============================================================
// API FETCHING
// ============================================================
async function loadOverview() {
  try {
    const res  = await fetch('/api/overview');
    if (!res.ok) return;
    const data = await res.json();
    state.overview  = data;
    state.pricePerKg = data.settings?.pricePerKg || 1250;

    document.getElementById('nav-station-name').textContent   = data.station?.name || 'Cooking Gas Refilling Station';
    document.getElementById('nav-price-per-kg').textContent   = `₦${state.pricePerKg.toLocaleString()}`;
    document.getElementById('pos-rate-indicator').textContent = `₦${state.pricePerKg.toLocaleString()}`;

    const stockKg = Math.round(data.tank?.currentStockKg || 0);
    document.getElementById('nav-tank-stock').textContent = `${stockKg.toLocaleString()} KG`;

    document.querySelectorAll('.preset-price').forEach(el => {
      const kg = parseFloat(el.getAttribute('data-kg')) || 0;
      el.textContent = `₦${(kg * state.pricePerKg).toLocaleString()}`;
    });

    // Populate admin/manager stats if on those views
    populateAdminStats(data);
    populateManagerStats(data);
    recalculate();
  } catch (err) {
    console.error('Overview error:', err);
  }
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders?limit=200');
    if (!res.ok) return;
    state.orders = await res.json();
    renderManagerSales();
    renderAdminSales();
  } catch (err) {
    console.error('Orders error:', err);
  }
}

async function loadPurchases() {
  try {
    const res  = await fetch('/api/tank');
    if (!res.ok) return;
    const data = await res.json();
    state.purchases = data.deliveries || [];
    renderManagerPurchases();
    renderAdminPurchases();
  } catch (err) {
    console.error('Purchases error:', err);
  }
}

async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    if (!res.ok) return;
    state.logs = await res.json();
    renderAdminLogs();
  } catch (err) {
    console.error('Logs error:', err);
  }
}

// ============================================================
// STAT POPULATION
// ============================================================
function populateAdminStats(data) {
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayOrds = state.orders.filter(o => o.createdAt?.startsWith(todayStr) && o.status !== 'CANCELLED');
  const todayRev  = todayOrds.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayKg   = todayOrds.reduce((s, o) => s + (o.kgRequested || 0), 0);
  const posRev    = todayOrds.filter(o => o.paymentMethod === 'POS_CARD').reduce((s, o) => s + o.totalAmount, 0);
  const cashRev   = todayOrds.filter(o => o.paymentMethod === 'CASH').reduce((s, o) => s + o.totalAmount, 0);
  const tfrRev    = todayOrds.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((s, o) => s + o.totalAmount, 0);

  const allRev    = state.orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const stockKg   = data?.tank?.currentStockKg || 0;
  const pct       = data?.tank?.percentage ?? ((stockKg / (data?.tank?.capacityKg || 10000)) * 100).toFixed(1);

  // Profit estimate: today revenue minus estimated purchase cost (pricePerKg − last costPerKg)
  const lastCostPerKg = state.purchases.length > 0 ? (state.purchases[0].costPerKg || 0) : 0;
  const profitEstimate = todayKg * (state.pricePerKg - lastCostPerKg);

  safeSet('adm-stat-tank',          `${Math.round(stockKg).toLocaleString()} KG`);
  safeSet('adm-stat-tank-pct',      `${pct}% capacity`);
  safeSet('adm-stat-revenue-today', `₦${todayRev.toLocaleString()}`);
  safeSet('adm-stat-kg-today',      `${todayKg.toFixed(1)} KG sold today`);
  safeSet('adm-stat-revenue-all',   `₦${allRev.toLocaleString()}`);
  safeSet('adm-stat-profit',        `₦${Math.max(0, Math.round(profitEstimate)).toLocaleString()}`);
  safeSet('adm-pos-sales',          `₦${posRev.toLocaleString()}`);
  safeSet('adm-cash-sales',         `₦${cashRev.toLocaleString()}`);
  safeSet('adm-transfer-sales',     `₦${tfrRev.toLocaleString()}`);
}

function populateManagerStats(data) {
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayOrds = state.orders.filter(o => o.createdAt?.startsWith(todayStr) && o.status !== 'CANCELLED');
  const todayRev  = todayOrds.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayKg   = todayOrds.reduce((s, o) => s + (o.kgRequested || 0), 0);
  const stockKg   = data?.tank?.currentStockKg || 0;

  safeSet('mgr-stat-tank',    `${Math.round(stockKg).toLocaleString()} KG`);
  safeSet('mgr-stat-revenue', `₦${todayRev.toLocaleString()}`);
  safeSet('mgr-stat-kg',      `${todayKg.toFixed(1)} KG`);
  safeSet('mgr-stat-rate',    `₦${state.pricePerKg.toLocaleString()}`);
}

function populateManagerView() {
  if (state.overview) {
    populateManagerStats(state.overview);
    populateAdminStats(state.overview);
  }
  renderManagerPurchases();
  renderManagerSales();
}

function safeSet(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ============================================================
// POS CALCULATOR
// ============================================================
function setPosMode(mode) {
  state.posMode = mode;

  const activeClass   = 'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold bg-burgundy text-white shadow';
  const inactiveClass = 'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold text-gray-500 hover:text-gray-900';

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

  const inactiveClass = 'pay-method-btn p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 border-gray-200 bg-gray-50 text-gray-500 hover:border-army hover:text-army hover:bg-army-subtle';
  document.querySelectorAll('.pay-method-btn').forEach(b => { b.className = inactiveClass; });

  const activeBase = 'pay-method-btn p-3 rounded-xl border-2 flex flex-col items-center justify-center space-y-1';
  if (method === 'POS_CARD')       document.getElementById('pay-btn-pos').className      = `${activeBase} border-burgundy bg-burgundy-subtle text-burgundy ring-2 ring-burgundy/20`;
  else if (method === 'CASH')       document.getElementById('pay-btn-cash').className     = `${activeBase} border-army bg-army-subtle text-army ring-2 ring-army/20`;
  else if (method === 'BANK_TRANSFER') document.getElementById('pay-btn-transfer').className = `${activeBase} border-army bg-army-subtle text-army ring-2 ring-army/20`;
}

// ============================================================
// TWO-STEP CASHIER FLOW
// ============================================================

// STEP 1 — Mark as Paid (records sale in backend)
async function handleMarkPaid() {
  const { totalKg, totalNaira, specText } = recalculate();

  if (totalKg <= 0 || totalNaira <= 0) {
    alert('Please select a cylinder size or enter an amount first.');
    return;
  }

  const btn = document.getElementById('btn-mark-paid');
  btn.disabled = true;
  btn.textContent = 'Processing…';

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
      btn.textContent = 'MARK AS PAID';
      return;
    }

    state.pendingOrder = data.order;
    loadOverview();
    showStep2(data.order);

  } catch (err) {
    alert('Connection error: ' + err.message);
    btn.disabled  = false;
    btn.textContent = 'MARK AS PAID';
  }
}

function showStep2(order) {
  // Show "Payment Recorded" banner + Print button
  document.getElementById('step-paid-section').classList.add('hidden');
  document.getElementById('step-print-section').classList.remove('hidden');
  safeSet('paid-receipt-ref', `${order.orderNumber}  •  Token: ${order.tokenCode}`);
}

function doPrintReceipts() {
  if (!state.pendingOrder) return;
  showReceiptModal(state.pendingOrder);
}

function resetPosForNextCustomer() {
  state.pendingOrder   = null;
  state.presetQuantity = 1;
  document.getElementById('pos-qty-display').textContent = '1';
  const kgEl    = document.getElementById('input-custom-kg');
  const nairaEl = document.getElementById('input-custom-naira');
  if (kgEl)    kgEl.value    = '';
  if (nairaEl) nairaEl.value = '';

  document.getElementById('step-paid-section').classList.remove('hidden');
  document.getElementById('step-print-section').classList.add('hidden');

  const btn = document.getElementById('btn-mark-paid');
  btn.disabled    = false;
  btn.innerHTML   = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg><span>MARK AS PAID</span>`;

  // Reset to default preset
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
  // After closing, reset for next customer
  if (state.pendingOrder) resetPosForNextCustomer();
}

function printReceipt() { window.print(); }

// ============================================================
// MANAGER VIEW: PURCHASES TABLE
// ============================================================
function renderManagerPurchases() {
  const tbody = document.getElementById('mgr-purchases-tbody');
  if (!tbody) return;
  safeSet('mgr-purchase-count', `${state.purchases.length} purchase${state.purchases.length !== 1 ? 's' : ''}`);

  if (state.purchases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">No gas purchases recorded yet.</td></tr>';
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

function renderManagerSales() {
  const tbody = document.getElementById('mgr-sales-tbody');
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
      <td class="py-2.5 px-3 text-gray-700">${o.cashierName || 'Cashier'}</td>
      <td class="py-2.5 px-3 text-gray-700">${o.cylinderType}</td>
      <td class="py-2.5 px-3 font-bold text-gray-900 font-mono">${o.kgRequested} KG</td>
      <td class="py-2.5 px-3 font-black text-army font-mono">₦${o.totalAmount.toLocaleString()}</td>
      <td class="py-2.5 px-3">${payBadge(o.paymentMethod)}</td>
      <td class="py-2.5 px-3 text-center">
        <button onclick='showReceiptModal(${JSON.stringify(o).replace(/'/g, "&#39;")})' class="p-1 text-gray-400 hover:text-burgundy" title="Reprint">🖨️</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// ADMIN VIEW: PURCHASES, SALES, LOGS
// ============================================================
function renderAdminPurchases() {
  const tbody = document.getElementById('adm-purchases-tbody');
  if (!tbody) return;
  safeSet('adm-purchase-count', `${state.purchases.length} deliveries`);

  if (state.purchases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">No purchases logged.</td></tr>';
    return;
  }
  tbody.innerHTML = state.purchases.map(p => `
    <tr class="hover:bg-gray-50 transition">
      <td class="py-2.5 px-3 font-mono text-gray-500">${new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td class="py-2.5 px-3 font-bold text-gray-900">${p.supplier}</td>
      <td class="py-2.5 px-3 font-black text-army font-mono">+${(p.kgReceived || 0).toLocaleString()} KG</td>
      <td class="py-2.5 px-3 text-gray-500">₦${(p.costPerKg || 0).toLocaleString()}</td>
      <td class="py-2.5 px-3 font-extrabold text-gray-900">₦${(p.totalCost || 0).toLocaleString()}</td>
    </tr>
  `).join('');
}

function renderAdminSales() {
  // Admin dashboard doesn't have a full sales table, stats only — handled by populateAdminStats
  if (state.overview) populateAdminStats(state.overview);
}

function renderAdminLogs() {
  const tbody = document.getElementById('adm-logs-tbody');
  if (!tbody) return;

  const search  = (document.getElementById('adm-log-search')?.value  || '').toLowerCase();
  const filter  = (document.getElementById('adm-log-filter')?.value  || 'ALL');

  const filtered = state.logs.filter(l => {
    const matchAction  = filter === 'ALL' || l.action === filter;
    const matchSearch  = !search ||
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
    if (l.action === 'USER_LOGIN')      badge = 'bg-blue-50 text-blue-700 border border-blue-200';
    if (l.action === 'USER_LOGOUT')     badge = 'bg-gray-100 text-gray-500 border border-gray-200';
    if (l.action === 'SALE_COMPLETED')  badge = 'bg-army-subtle text-army border border-army-muted';
    if (l.action === 'GAS_PURCHASED')   badge = 'bg-amber-50 text-amber-700 border border-amber-200';
    if (l.action === 'PRICE_CHANGED')   badge = 'bg-burgundy-subtle text-burgundy border border-burgundy-muted';
    if (l.action === 'USER_REGISTER')   badge = 'bg-purple-50 text-purple-700 border border-purple-200';

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
// PURCHASE MODAL (Manager only)
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
  const supplier = document.getElementById('purchase-supplier').value;
  const truck    = document.getElementById('purchase-truck').value;
  const waybill  = document.getElementById('purchase-waybill').value;
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
      alert(`✅ Successfully added +${kg.toLocaleString()} KG to tank.`);
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
  if (!isManagerOrOwner()) {
    alert('Only the Manager / Owner can change the gas rate.');
    return;
  }
  document.getElementById('input-new-rate').value = state.pricePerKg;
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
// EXPORT CSV
// ============================================================
function exportCSV() {
  if (state.orders.length === 0) return;
  const headers = ['Token', 'Receipt #', 'Date', 'Cashier', 'Cylinder', 'KG', 'Rate (NGN)', 'Total (NGN)', 'Payment'];
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
  const csv  = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', `GasFlow_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================
// HELPERS
// ============================================================
function payBadge(method) {
  const map = {
    POS_CARD:      'bg-burgundy-subtle text-burgundy border border-burgundy-muted',
    CASH:          'bg-army-subtle text-army border border-army-muted',
    BANK_TRANSFER: 'bg-blue-50 text-blue-700 border border-blue-200'
  };
  const cls  = map[method] || 'bg-gray-100 text-gray-500';
  const label = method.replace(/_/g, ' ');
  return `<span class="px-2 py-0.5 rounded text-[10px] font-bold ${cls}">${label}</span>`;
}
