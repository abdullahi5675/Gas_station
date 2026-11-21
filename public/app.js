// Gas Station POS & Inventory - With Worker Shifts & Audit Trail

let state = {
  currentUser: null, // { name, role, username }
  overview: null,
  orders: [],
  purchases: [],
  logs: [],
  currentTab: 'pos', // 'pos', 'records', 'logs'
  posMode: 'preset',
  selectedPresetKg: 12.5,
  presetQuantity: 1,
  paymentMethod: 'POS_CARD',
  pricePerKg: 1250,
  currentOrderForReceipt: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadOverview();
  loadOrders();
  loadPurchases();
  loadLogs();

  // Poll overview & logs every 6 seconds
  setInterval(() => {
    loadOverview();
    if (state.currentTab === 'records') {
      loadOrders();
      loadPurchases();
    }
    if (state.currentTab === 'logs') {
      loadLogs();
    }
  }, 6000);
});

// --- AUTHENTICATION & SHIFTS ---
function checkAuth() {
  const saved = localStorage.getItem('gasflow_user');
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved);
      updateUserHeader();
      hideAuthOverlay();
      return;
    } catch (e) {}
  }
  showAuthOverlay();
}

function showAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('hidden');
}

function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.add('hidden');
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);

  document.getElementById('btn-tab-login').className = isLogin ? "py-2 rounded-lg bg-orange-500 text-white shadow" : "py-2 rounded-lg text-slate-400 hover:text-white";
  document.getElementById('btn-tab-register').className = !isLogin ? "py-2 rounded-lg bg-orange-500 text-white shadow" : "py-2 rounded-lg text-slate-400 hover:text-white";

  document.getElementById('auth-title').textContent = isLogin ? "Staff / Worker Login" : "Register New Worker";
  document.getElementById('auth-subtitle').textContent = isLogin ? "Sign in to start your shift at the cashier station" : "Create an account for a new cashier or manager";
}

function quickFillLogin(u, p) {
  document.getElementById('login-username').value = u;
  document.getElementById('login-password').value = p;
  document.getElementById('form-login').dispatchEvent(new Event('submit'));
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    state.currentUser = data.user;
    localStorage.setItem('gasflow_user', JSON.stringify(data.user));
    updateUserHeader();
    hideAuthOverlay();
    loadLogs();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const username = document.getElementById('reg-username').value;
  const role = document.getElementById('reg-role').value;
  const password = document.getElementById('reg-password').value;
  const phone = document.getElementById('reg-phone').value;
  const errorEl = document.getElementById('reg-error');
  errorEl.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password, role, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");

    state.currentUser = data.user;
    localStorage.setItem('gasflow_user', JSON.stringify(data.user));
    updateUserHeader();
    hideAuthOverlay();
    loadLogs();
    alert(`Account created successfully for ${data.user.name}! You are now on duty.`);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

async function handleLogout() {
  if (confirm(`End shift for ${state.currentUser?.name || 'Worker'} and hand over the computer?`)) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: state.currentUser?.name, role: state.currentUser?.role })
      });
    } catch (e) {}

    localStorage.removeItem('gasflow_user');
    state.currentUser = null;
    showAuthOverlay();
    loadLogs();
  }
}

function updateUserHeader() {
  if (state.currentUser) {
    document.getElementById('nav-current-user-name').textContent = state.currentUser.name;
    document.getElementById('nav-current-user-role').textContent = state.currentUser.role;
  }
}

// --- API FETCHING ---
async function loadOverview() {
  try {
    const res = await fetch('/api/overview');
    if (!res.ok) return;
    const data = await res.json();
    state.overview = data;
    state.pricePerKg = data.settings?.pricePerKg || 1250;

    document.getElementById('nav-station-name').textContent = data.station?.name || "Cooking Gas Refilling Station";
    document.getElementById('nav-price-per-kg').textContent = `₦${state.pricePerKg.toLocaleString()}`;
    document.getElementById('pos-rate-indicator').textContent = `₦${state.pricePerKg.toLocaleString()}`;
    
    const stockKg = Math.round(data.tank?.currentStockKg || 0);
    document.getElementById('nav-tank-stock').textContent = `${stockKg.toLocaleString()} KG`;
    document.getElementById('stat-tank-stock').textContent = `${stockKg.toLocaleString()} KG`;

    document.querySelectorAll('.preset-price').forEach(el => {
      const kg = parseFloat(el.getAttribute('data-kg')) || 0;
      el.textContent = `₦${(kg * state.pricePerKg).toLocaleString()}`;
    });

    recalculate();
  } catch (err) {
    console.error("Overview error:", err);
  }
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders?limit=100');
    if (!res.ok) return;
    state.orders = await res.json();
    renderSalesRecords();
  } catch (err) {
    console.error("Orders error:", err);
  }
}

async function loadPurchases() {
  try {
    const res = await fetch('/api/tank');
    if (!res.ok) return;
    const data = await res.json();
    state.purchases = data.deliveries || [];
    renderPurchasesTable();
  } catch (err) {
    console.error("Purchases error:", err);
  }
}

async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    if (!res.ok) return;
    state.logs = await res.json();
    document.getElementById('badge-logs-count').textContent = state.logs.length;
    renderAuditLogs();
  } catch (err) {
    console.error("Logs error:", err);
  }
}

// --- TAB SWITCHING (3 TABS) ---
function switchTab(tab) {
  state.currentTab = tab;

  document.getElementById('view-pos').classList.toggle('hidden', tab !== 'pos');
  document.getElementById('view-pos').classList.toggle('block', tab === 'pos');
  
  document.getElementById('view-records').classList.toggle('hidden', tab !== 'records');
  document.getElementById('view-records').classList.toggle('block', tab === 'records');

  document.getElementById('view-logs').classList.toggle('hidden', tab !== 'logs');
  document.getElementById('view-logs').classList.toggle('block', tab === 'logs');

  const btnPos = document.getElementById('tab-btn-pos');
  const btnRecords = document.getElementById('tab-btn-records');
  const btnLogs = document.getElementById('tab-btn-logs');

  const activeClass = "flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition bg-orange-500 text-white shadow-lg shadow-orange-500/30";
  const inactiveClass = "flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition text-slate-300 hover:bg-slate-800 border border-slate-800";

  btnPos.className = tab === 'pos' ? activeClass : inactiveClass;
  btnRecords.className = tab === 'records' ? activeClass : inactiveClass;
  btnLogs.className = tab === 'logs' ? activeClass : inactiveClass;

  if (tab === 'records') {
    loadOrders();
    loadPurchases();
  }
  if (tab === 'logs') {
    loadLogs();
  }
}

// --- POS CALCULATOR & WORKFLOW ---
function setPosMode(mode) {
  state.posMode = mode;

  document.getElementById('btn-mode-preset').className = mode === 'preset' ? "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold bg-orange-500 text-white shadow" : "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold text-slate-400 hover:text-white";
  document.getElementById('btn-mode-kg').className = mode === 'customKg' ? "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold bg-orange-500 text-white shadow" : "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold text-slate-400 hover:text-white";
  document.getElementById('btn-mode-naira').className = mode === 'customNaira' ? "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold bg-orange-500 text-white shadow" : "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold text-slate-400 hover:text-white";

  document.getElementById('pos-container-preset').classList.toggle('hidden', mode !== 'preset');
  document.getElementById('pos-container-kg').classList.toggle('hidden', mode !== 'customKg');
  document.getElementById('pos-container-naira').classList.toggle('hidden', mode !== 'customNaira');

  recalculate();
}

function selectPreset(kg) {
  state.selectedPresetKg = kg;

  document.querySelectorAll('.preset-btn').forEach(b => {
    b.className = "preset-btn relative p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 text-left transition";
  });

  const activeBtn = document.querySelector(`.preset-btn[data-kg="${kg}"]`);
  if (activeBtn) {
    activeBtn.className = "preset-btn relative p-3.5 rounded-xl border border-orange-500 bg-orange-500/10 text-left transition ring-2 ring-orange-500/30";
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
  let totalKg = 0;
  let totalNaira = 0;
  let specText = "";

  if (state.posMode === 'preset') {
    totalKg = state.selectedPresetKg * state.presetQuantity;
    totalNaira = Math.round(totalKg * rate);
    specText = state.presetQuantity > 1 ? `${state.presetQuantity}x ${state.selectedPresetKg}kg Cylinders` : `${state.selectedPresetKg}kg Cylinder`;
  } else if (state.posMode === 'customKg') {
    const val = parseFloat(document.getElementById('input-custom-kg')?.value) || 0;
    totalKg = Number(val.toFixed(2));
    totalNaira = Math.round(totalKg * rate);
    specText = `${totalKg} KG Custom Refill`;
  } else if (state.posMode === 'customNaira') {
    const val = parseFloat(document.getElementById('input-custom-naira')?.value) || 0;
    totalNaira = val;
    totalKg = rate > 0 ? Number((totalNaira / rate).toFixed(2)) : 0;
    specText = `₦${totalNaira.toLocaleString()} Gas Refill`;
  }

  document.getElementById('pos-bill-spec').textContent = specText;
  document.getElementById('pos-bill-kg').textContent = totalKg;
  document.getElementById('pos-bill-naira').textContent = `₦${totalNaira.toLocaleString()}`;

  return { totalKg, totalNaira, specText };
}

function setPaymentMethod(method) {
  state.paymentMethod = method;

  document.querySelectorAll('.pay-method-btn').forEach(b => {
    b.className = "pay-method-btn p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200";
  });

  if (method === 'POS_CARD') {
    document.getElementById('pay-btn-pos').className = "pay-method-btn p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 bg-blue-500/10 border-blue-500 text-blue-300 ring-2 ring-blue-500/20";
  } else if (method === 'CASH') {
    document.getElementById('pay-btn-cash').className = "pay-method-btn p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20";
  } else if (method === 'BANK_TRANSFER') {
    document.getElementById('pay-btn-transfer').className = "pay-method-btn p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 bg-purple-500/10 border-purple-500 text-purple-300 ring-2 ring-purple-500/20";
  }
}

// --- FAST CHECKOUT: CLICK PAID & PRINT RECEIPTS ---
async function handleQuickSale() {
  const { totalKg, totalNaira, specText } = recalculate();

  if (totalKg <= 0 || totalNaira <= 0) {
    alert("Please select a cylinder size or enter an amount.");
    return;
  }

  const btn = document.getElementById('btn-quick-sale');
  btn.disabled = true;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cylinderType: specText,
        kgRequested: totalKg,
        paymentMethod: state.paymentMethod,
        paymentRef: state.paymentMethod === 'POS_CARD' ? 'POS-APPROVED' : state.paymentMethod === 'CASH' ? 'CASH-PAID' : 'TRANSFER-CONFIRMED',
        customerName: "Walk-in Household",
        workerName: state.currentUser?.name || "Cashier On Duty",
        workerRole: state.currentUser?.role || "Cashier"
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to record sale");
      return;
    }

    state.presetQuantity = 1;
    document.getElementById('pos-qty-display').textContent = '1';
    document.getElementById('input-custom-kg').value = '';
    document.getElementById('input-custom-naira').value = '';

    showReceiptModal(data.order);
    loadOverview();
    loadLogs();

  } catch (err) {
    alert("Connection error: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

// --- DUAL RECEIPT MODAL & DIRECT PRINT ---
function showReceiptModal(order) {
  state.currentOrderForReceipt = order;
  const station = state.overview?.station || {};

  document.getElementById('receipt-modal-token').textContent = `TOKEN: ${order.tokenCode}`;
  document.getElementById('receipt-station-name').textContent = station.name || "LPG COOKING GAS STATION";
  document.getElementById('receipt-station-address').textContent = station.address || "Refilling Station";

  document.getElementById('receipt-order-no').textContent = order.orderNumber;
  document.getElementById('receipt-cashier-name').textContent = order.cashierName || state.currentUser?.name || "Cashier";
  document.getElementById('receipt-payment').textContent = order.paymentMethod.replace('_', ' ');

  const d = new Date(order.createdAt);
  const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('receipt-datetime').textContent = `${formattedDate} ${formattedTime}`;

  document.getElementById('receipt-spec').textContent = order.cylinderType;
  document.getElementById('receipt-total').textContent = `₦${order.totalAmount.toLocaleString()}`;
  document.getElementById('receipt-rate-calc').textContent = `Weight: ${order.kgRequested} KG @ ₦${order.ratePerKg.toLocaleString()}/kg`;

  // Slip for Dispenser Worker
  document.getElementById('receipt-slip-token').textContent = order.tokenCode;
  document.getElementById('receipt-slip-kg').textContent = `${order.kgRequested} KG`;
  document.getElementById('receipt-slip-ref').textContent = order.orderNumber;

  document.getElementById('modal-receipt').classList.remove('hidden');
}

function closeReceiptModal() {
  document.getElementById('modal-receipt').classList.add('hidden');
  state.currentOrderForReceipt = null;
}

function printReceipt() {
  window.print();
}

// --- PAGE 2: SALES RECORDS & TANK PURCHASES ---
function renderSalesRecords() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = state.orders.filter(o => o.createdAt.startsWith(todayStr));

  const totalRev = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalKg = todayOrders.reduce((sum, o) => sum + (o.kgRequested || 0), 0);
  const posSales = todayOrders.filter(o => o.paymentMethod === 'POS_CARD').reduce((sum, o) => sum + o.totalAmount, 0);
  const cashSales = todayOrders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.totalAmount, 0);
  const trfSales = todayOrders.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((sum, o) => sum + o.totalAmount, 0);

  document.getElementById('stat-today-revenue').textContent = `₦${totalRev.toLocaleString()}`;
  document.getElementById('stat-today-kg-sold').textContent = `${totalKg.toFixed(1)} KG sold today (${todayOrders.length} refills)`;
  document.getElementById('stat-pos-sales').textContent = `₦${posSales.toLocaleString()}`;
  document.getElementById('stat-cash-transfer-sales').textContent = `₦${(cashSales + trfSales).toLocaleString()}`;
  document.getElementById('stat-cash-transfer-sub').textContent = `Cash: ₦${cashSales.toLocaleString()} | Trf: ₦${trfSales.toLocaleString()}`;

  const tbody = document.getElementById('sales-table-body');
  if (state.orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-slate-500">No sales recorded yet.</td></tr>';
  } else {
    tbody.innerHTML = state.orders.map(o => `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="py-2.5 px-3">
          <div class="font-bold text-amber-400 font-mono">${o.tokenCode}</div>
          <div class="text-[9px] text-slate-500">${o.orderNumber}</div>
        </td>
        <td class="py-2.5 px-3 font-mono text-slate-300">
          <div>${new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="text-[9px] text-slate-500">${new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
        </td>
        <td class="py-2.5 px-3 font-medium text-slate-300">${o.cashierName || "Cashier"}</td>
        <td class="py-2.5 px-3 font-medium text-slate-200">${o.cylinderType}</td>
        <td class="py-2.5 px-3 font-bold text-white font-mono">${o.kgRequested} KG</td>
        <td class="py-2.5 px-3 font-black text-emerald-400 font-mono-numbers">₦${o.totalAmount.toLocaleString()}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            o.paymentMethod === 'POS_CARD' ? 'bg-blue-500/10 text-blue-400' :
            o.paymentMethod === 'CASH' ? 'bg-emerald-500/10 text-emerald-400' :
            'bg-purple-500/10 text-purple-400'
          }">
            ${o.paymentMethod.replace('_', ' ')}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center">
          <button onclick='showReceiptModal(${JSON.stringify(o).replace(/'/g, "&#39;")})' class="p-1 text-slate-400 hover:text-white" title="Reprint">🖨️</button>
        </td>
      </tr>
    `).join('');
  }
}

function renderPurchasesTable() {
  const tbody = document.getElementById('purchases-table-body');
  document.getElementById('purchase-count-badge').textContent = `${state.purchases.length} purchases logged`;

  if (state.purchases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-500">No bulk gas purchases logged yet.</td></tr>';
  } else {
    tbody.innerHTML = state.purchases.map(p => `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="py-2.5 px-3 font-mono text-slate-300">${new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td class="py-2.5 px-3 font-bold text-white">${p.supplier}</td>
        <td class="py-2.5 px-3 text-slate-300">${p.truckNumber || "N/A"}</td>
        <td class="py-2.5 px-3 text-slate-400">${p.waybillNumber || "N/A"}</td>
        <td class="py-2.5 px-3 font-black text-emerald-400 font-mono">+${p.kgReceived?.toLocaleString()} KG</td>
        <td class="py-2.5 px-3 text-slate-400">₦${p.costPerKg?.toLocaleString()}</td>
        <td class="py-2.5 px-3 font-extrabold text-white">₦${p.totalCost?.toLocaleString()}</td>
      </tr>
    `).join('');
  }
}

// --- PAGE 3: TRANSPARENCY AUDIT LOGS ---
function renderAuditLogs() {
  const search = (document.getElementById('log-search')?.value || '').toLowerCase();
  const filterAction = document.getElementById('log-filter-action')?.value || 'ALL';

  const filtered = state.logs.filter(l => {
    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
    const matchesSearch = !search ||
      l.userName.toLowerCase().includes(search) ||
      l.details.toLowerCase().includes(search) ||
      l.action.toLowerCase().includes(search);
    return matchesAction && matchesSearch;
  });

  const tbody = document.getElementById('logs-table-body');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-500">No action logs found.</td></tr>';
  } else {
    tbody.innerHTML = filtered.map(l => {
      const d = new Date(l.timestamp);
      const timeStr = `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      const dateStr = `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

      let badgeColor = "bg-slate-800 text-slate-300";
      if (l.action === 'USER_LOGIN') badgeColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      if (l.action === 'USER_LOGOUT') badgeColor = "bg-slate-700/50 text-slate-400 border border-slate-600/30";
      if (l.action === 'SALE_COMPLETED') badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      if (l.action === 'GAS_PURCHASED') badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      if (l.action === 'PRICE_CHANGED') badgeColor = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      if (l.action === 'USER_REGISTER') badgeColor = "bg-purple-500/10 text-purple-400 border border-purple-500/20";

      return `
        <tr class="hover:bg-slate-800/40 transition">
          <td class="py-2.5 px-4 text-slate-400">
            <div>${timeStr}</div>
            <div class="text-[9px] text-slate-500">${dateStr}</div>
          </td>
          <td class="py-2.5 px-4 font-bold text-white">${l.userName}</td>
          <td class="py-2.5 px-4 text-slate-300 text-[10px]">${l.role}</td>
          <td class="py-2.5 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}">
              ${l.action.replace('_', ' ')}
            </span>
          </td>
          <td class="py-2.5 px-4 text-slate-200 text-xs font-sans">${l.details}</td>
        </tr>
      `;
    }).join('');
  }
}

// --- RECORD NEW BULK GAS PURCHASE ---
function openPurchaseModal() {
  document.getElementById('purchase-kg').value = '';
  document.getElementById('purchase-supplier').value = '';
  document.getElementById('purchase-truck').value = '';
  document.getElementById('purchase-waybill').value = '';
  document.getElementById('modal-purchase').classList.remove('hidden');
}

function closePurchaseModal() {
  document.getElementById('modal-purchase').classList.add('hidden');
}

async function handlePurchaseSubmit(e) {
  e.preventDefault();
  const kg = parseFloat(document.getElementById('purchase-kg').value);
  const supplier = document.getElementById('purchase-supplier').value;
  const truck = document.getElementById('purchase-truck').value;
  const waybill = document.getElementById('purchase-waybill').value;
  const cost = parseFloat(document.getElementById('purchase-cost').value);

  try {
    const res = await fetch('/api/tank/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kgReceived: kg,
        supplier,
        truckNumber: truck,
        waybillNumber: waybill,
        costPerKg: cost,
        workerName: state.currentUser?.name || "Manager",
        offloadedBy: state.currentUser?.name || "Manager"
      })
    });

    if (res.ok) {
      closePurchaseModal();
      loadOverview();
      loadPurchases();
      loadLogs();
      alert(`Success! +${kg.toLocaleString()} KG of gas added to station tank.`);
    }
  } catch (err) {
    alert("Error recording purchase: " + err.message);
  }
}

// --- UPDATE GAS RATE (PRICE PER KG) ---
function openRateModal() {
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
        workerName: state.currentUser?.name || "Manager"
      })
    });

    if (res.ok) {
      closeRateModal();
      loadOverview();
      loadLogs();
    }
  } catch (err) {
    alert("Error updating rate: " + err.message);
  }
}

// --- EXPORT SALES CSV ---
function exportCSV() {
  if (state.orders.length === 0) return;
  const headers = ["Token", "Receipt #", "Date", "Cashier", "Cylinder", "KG", "Rate (NGN)", "Total (NGN)", "Payment Method"];
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
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Gas_Station_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
