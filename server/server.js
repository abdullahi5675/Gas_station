import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, saveDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const PORT = process.env.PORT || 5000;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function generateOrderNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `GF-${today}-${randomSuffix}`;
}

function generateTokenCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const char = letters.charAt(Math.floor(Math.random() * letters.length));
  const num = Math.floor(100 + Math.random() * 900);
  return `TKN-${char}${num}`;
}

function addAuditLog(db, userName, role, action, details) {
  db.auditLogs = db.auditLogs || [];
  const logEntry = {
    id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    userName: userName || "Staff",
    role: role || "Cashier",
    action: action, // e.g. "USER_LOGIN", "SALE_COMPLETED", "GAS_PURCHASED", "PRICE_CHANGED", "USER_LOGOUT", "USER_REGISTER"
    details: details
  };
  db.auditLogs.unshift(logEntry);
  if (db.auditLogs.length > 500) db.auditLogs = db.auditLogs.slice(0, 500);
  return logEntry;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // API: Authentication - Login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const db = getDb();
      const body = await parseBody(req);
      const username = (body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      if (!username || !password) {
        return sendJson(res, 400, { error: "Please enter your username and password/PIN." });
      }

      const user = (db.users || []).find(u => u.username.toLowerCase() === username && u.password === password);
      if (!user) {
        return sendJson(res, 401, { error: "Invalid username or password/PIN." });
      }

      addAuditLog(db, user.name, user.role, "USER_LOGIN", `${user.name} (${user.role}) logged in for duty/shift.`);
      saveDb(db);

      const safeUser = { id: user.id, name: user.name, username: user.username, role: user.role, phone: user.phone };
      return sendJson(res, 200, { success: true, user: safeUser });
    }

    // API: Authentication - Register New Staff
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const db = getDb();
      const body = await parseBody(req);
      const name = (body.name || '').trim();
      const username = (body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();
      const role = (body.role || 'Cashier').trim();
      const phone = (body.phone || '').trim();

      if (!name || !username || !password) {
        return sendJson(res, 400, { error: "Please enter Full Name, Username, and Password/PIN." });
      }

      db.users = db.users || [];
      const exists = db.users.find(u => u.username.toLowerCase() === username);
      if (exists) {
        return sendJson(res, 400, { error: "Username already taken. Please choose another username." });
      }

      const newUser = {
        id: `usr-${Date.now()}`,
        name,
        username,
        password,
        role,
        phone,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      addAuditLog(db, name, role, "USER_REGISTER", `New worker registered: ${name} (${role}).`);
      saveDb(db);

      const safeUser = { id: newUser.id, name: newUser.name, username: newUser.username, role: newUser.role, phone: newUser.phone };
      return sendJson(res, 201, { success: true, user: safeUser });
    }

    // API: Authentication - Logout
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const db = getDb();
      const body = await parseBody(req);
      const userName = body.userName || "Worker";
      const role = body.role || "Cashier";

      addAuditLog(db, userName, role, "USER_LOGOUT", `${userName} (${role}) signed out / handed over shift.`);
      saveDb(db);
      return sendJson(res, 200, { success: true });
    }

    // API: Activity Audit Logs
    if (pathname === '/api/logs' && req.method === 'GET') {
      const db = getDb();
      return sendJson(res, 200, db.auditLogs || []);
    }

    // API: Overview & Metrics
    if (pathname === '/api/overview' && req.method === 'GET') {
      const db = getDb();
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayOrders = db.orders.filter(o => o.createdAt.startsWith(todayStr) && o.status !== 'CANCELLED');
      
      const todayKg = todayOrders.reduce((sum, o) => sum + (Number(o.kgRequested) || 0), 0);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      
      const cashSales = todayOrders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.totalAmount, 0);
      const posSales = todayOrders.filter(o => o.paymentMethod === 'POS_CARD').reduce((sum, o) => sum + o.totalAmount, 0);
      const transferSales = todayOrders.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((sum, o) => sum + o.totalAmount, 0);

      const tankPercentage = ((db.tank.currentStockKg / db.tank.capacityKg) * 100).toFixed(1);
      const isLowStock = db.tank.currentStockKg <= db.tank.lowStockThresholdKg;

      return sendJson(res, 200, {
        station: db.station,
        settings: db.settings,
        tank: {
          ...db.tank,
          percentage: Number(tankPercentage),
          isLowStock
        },
        activeShift: db.activeShift,
        attendants: db.attendants,
        metrics: {
          todayRevenue,
          todayKg: Number(todayKg.toFixed(2)),
          todayOrdersCount: todayOrders.length,
          cashSales,
          posSales,
          transferSales
        }
      });
    }

    // API: Orders List
    if (pathname === '/api/orders' && req.method === 'GET') {
      const db = getDb();
      const date = url.searchParams.get('date');
      const status = url.searchParams.get('status');
      const limit = url.searchParams.get('limit');

      let list = [...db.orders].reverse();
      if (date) list = list.filter(o => o.createdAt.startsWith(date));
      if (status) list = list.filter(o => o.status === status);
      if (limit) list = list.slice(0, Number(limit));

      return sendJson(res, 200, list);
    }

    // API: Create Order (POS Cashier)
    if (pathname === '/api/orders' && req.method === 'POST') {
      const db = getDb();
      const body = await parseBody(req);
      const { customerName, customerPhone, cylinderType, kgRequested, paymentMethod, paymentRef, attendantName, pump } = body;

      const kg = Number(kgRequested);
      if (!kg || kg <= 0) {
        return sendJson(res, 400, { error: "Invalid KG amount requested" });
      }

      if (db.tank.currentStockKg < kg) {
        return sendJson(res, 400, {
          error: `Insufficient tank stock! Available: ${db.tank.currentStockKg.toFixed(1)}kg, requested: ${kg}kg`
        });
      }

      const rate = db.settings.pricePerKg;
      const totalAmount = Math.round(kg * rate);

      const worker = body.workerName || "Cashier";
      const workerRole = body.workerRole || "Cashier";

      const newOrder = {
        id: `ORD-${Date.now()}`,
        orderNumber: generateOrderNumber(),
        tokenCode: generateTokenCode(),
        customerName: customerName?.trim() || "Walk-in Customer",
        customerPhone: customerPhone?.trim() || "N/A",
        cylinderType: cylinderType || `${kg}kg Cylinder`,
        kgRequested: kg,
        ratePerKg: rate,
        totalAmount,
        paymentMethod: paymentMethod || "CASH",
        paymentRef: paymentRef || (paymentMethod === "CASH" ? "CASH-PAID" : "CONFIRMED"),
        cashierName: worker,
        attendantName: attendantName || "Island Attendant",
        pump: pump || db.settings.pumps[0] || "Pump 1",
        status: "PAID",
        createdAt: new Date().toISOString(),
        completedAt: null
      };

      db.tank.currentStockKg = Math.max(0, Number((db.tank.currentStockKg - kg).toFixed(2)));
      db.orders.push(newOrder);
      addAuditLog(db, worker, workerRole, "SALE_COMPLETED", `${worker} completed ${kg} KG refill sale for ₦${totalAmount.toLocaleString()} via ${paymentMethod || 'POS'}. (Token: ${newOrder.tokenCode})`);
      saveDb(db);

      return sendJson(res, 201, {
        success: true,
        order: newOrder,
        remainingStockKg: db.tank.currentStockKg
      });
    }

    // API: Update Order Status (Dispenser Queue)
    if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && req.method === 'PATCH') {
      const parts = pathname.split('/');
      const orderId = parts[3];
      const db = getDb();
      const body = await parseBody(req);

      const orderIndex = db.orders.findIndex(o => o.id === orderId || o.orderNumber === orderId);
      if (orderIndex === -1) {
        return sendJson(res, 404, { error: "Order not found" });
      }

      const order = db.orders[orderIndex];
      order.status = body.status;
      if (body.attendantName) order.attendantName = body.attendantName;
      if (body.pump) order.pump = body.pump;
      if (body.status === 'COMPLETED') {
        order.completedAt = new Date().toISOString();
      }

      saveDb(db);
      return sendJson(res, 200, { success: true, order });
    }

    // API: Tank Status & History
    if (pathname === '/api/tank' && req.method === 'GET') {
      const db = getDb();
      const percentage = ((db.tank.currentStockKg / db.tank.capacityKg) * 100).toFixed(1);
      return sendJson(res, 200, {
        tank: {
          ...db.tank,
          percentage: Number(percentage)
        },
        deliveries: db.tankDeliveries || [],
        dips: db.tankDips || []
      });
    }

    // API: Tanker Delivery Offload
    if (pathname === '/api/tank/delivery' && req.method === 'POST') {
      const db = getDb();
      const body = await parseBody(req);
      const { supplier, truckNumber, waybillNumber, metricTons, kgReceived, costPerKg, notes, offloadedBy } = body;

      const kg = Number(kgReceived) || (Number(metricTons) * 1000);
      if (!kg || kg <= 0) {
        return sendJson(res, 400, { error: "Invalid delivery quantity" });
      }

      const cost = Number(costPerKg) || 0;
      const totalCost = cost * kg;

      const newDelivery = {
        id: `DEL-${Date.now()}`,
        date: new Date().toISOString(),
        supplier: supplier || "NNPC / Depot",
        truckNumber: truckNumber || "N/A",
        waybillNumber: waybillNumber || "N/A",
        metricTons: Number((kg / 1000).toFixed(2)),
        kgReceived: kg,
        costPerKg: cost,
        totalCost,
        offloadedBy: offloadedBy || "Chief Operator",
        notes: notes || "Bulk LPG offloaded into station storage tank."
      };

      db.tank.currentStockKg = Number((db.tank.currentStockKg + kg).toFixed(2));
      if (db.tank.currentStockKg > db.tank.capacityKg) {
        db.tank.capacityKg = db.tank.currentStockKg;
      }
      db.tank.lastDeliveryDate = newDelivery.date;
      db.tankDeliveries = db.tankDeliveries || [];
      db.tankDeliveries.unshift(newDelivery);
      const worker = body.workerName || offloadedBy || "Manager";
      addAuditLog(db, worker, "Manager", "GAS_PURCHASED", `${worker} recorded bulk gas purchase: +${kg.toLocaleString()} KG from ${supplier || 'Depot'} (₦${totalCost.toLocaleString()}). Tank stock now: ${db.tank.currentStockKg.toLocaleString()} KG.`);
      saveDb(db);

      return sendJson(res, 201, {
        success: true,
        delivery: newDelivery,
        newStockKg: db.tank.currentStockKg
      });
    }

    // API: Tank Dip Gauge Record
    if (pathname === '/api/tank/dip' && req.method === 'POST') {
      const db = getDb();
      const body = await parseBody(req);
      const percent = Number(body.gaugePercent);

      if (isNaN(percent) || percent < 0 || percent > 100) {
        return sendJson(res, 400, { error: "Invalid gauge percentage (0 - 100)" });
      }

      const calculatedStockKg = Math.round((percent / 100) * db.tank.capacityKg);
      const varianceKg = Number((calculatedStockKg - db.tank.currentStockKg).toFixed(1));

      const newDip = {
        id: `DIP-${Date.now()}`,
        timestamp: new Date().toISOString(),
        gaugePercent: percent,
        calculatedStockKg,
        systemStockKg: db.tank.currentStockKg,
        varianceKg,
        recordedBy: body.recordedBy || "Plant Supervisor",
        notes: body.notes || "Routine tank gauge audit."
      };

      db.tankDips = db.tankDips || [];
      db.tankDips.unshift(newDip);
      saveDb(db);

      return sendJson(res, 201, { success: true, dip: newDip });
    }

    // API: Settings Update
    if (pathname === '/api/settings' && req.method === 'PATCH') {
      const db = getDb();
      const body = await parseBody(req);

      const worker = body.workerName || "Manager";
      if (body.pricePerKg && Number(body.pricePerKg) > 0) {
        db.settings.pricePerKg = Number(body.pricePerKg);
        addAuditLog(db, worker, "Manager", "PRICE_CHANGED", `${worker} updated cooking gas rate to ₦${Number(body.pricePerKg).toLocaleString()}/kg.`);
      }
      if (body.stationName) db.station.name = body.stationName;
      if (body.address) db.station.address = body.address;
      if (body.phone) db.station.phone = body.phone;
      if (body.pumps && Array.isArray(body.pumps)) db.settings.pumps = body.pumps;

      saveDb(db);
      return sendJson(res, 200, { success: true, settings: db.settings, station: db.station });
    }

    // API: Shift Close & Handover
    if (pathname === '/api/shift/close' && req.method === 'POST') {
      const db = getDb();
      const body = await parseBody(req);

      const shiftOrders = db.orders.filter(o => 
        o.status !== 'CANCELLED' && 
        new Date(o.createdAt) >= new Date(db.activeShift.startTime)
      );

      const totalKgSold = shiftOrders.reduce((sum, o) => sum + o.kgRequested, 0);
      const totalCashSales = shiftOrders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.totalAmount, 0);
      const totalPosSales = shiftOrders.filter(o => o.paymentMethod === 'POS_CARD').reduce((sum, o) => sum + o.totalAmount, 0);
      const totalTransferSales = shiftOrders.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((sum, o) => sum + o.totalAmount, 0);
      const grandTotal = totalCashSales + totalPosSales + totalTransferSales;

      const expectedCashInDrawer = db.activeShift.openingCash + totalCashSales;
      const counted = Number(body.actualCashCounted) || 0;
      const cashDiscrepancy = counted - expectedCashInDrawer;

      const closedShiftRecord = {
        ...db.activeShift,
        endTime: new Date().toISOString(),
        totalKgSold: Number(totalKgSold.toFixed(2)),
        totalCashSales,
        totalPosSales,
        totalTransferSales,
        grandTotal,
        expectedCashInDrawer,
        actualCashCounted: counted,
        cashDiscrepancy,
        notes: body.notes || "Normal shift handover"
      };

      db.shiftHistory = db.shiftHistory || [];
      db.shiftHistory.unshift(closedShiftRecord);

      db.activeShift = {
        id: `SHIFT-${Date.now()}`,
        cashierId: `csh-${Date.now()}`,
        cashierName: body.nextCashierName || "Next Cashier On Duty",
        startTime: new Date().toISOString(),
        openingCash: counted,
        status: "OPEN"
      };

      saveDb(db);

      return sendJson(res, 200, {
        success: true,
        closedShift: closedShiftRecord,
        newActiveShift: db.activeShift
      });
    }

    // Static Files Handler (Public folder)
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Check if file exists, else fallback to index.html for SPA
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      return res.end(content);
    }

    sendJson(res, 404, { error: "Not Found" });

  } catch (err) {
    console.error("Server error:", err);
    sendJson(res, 500, { error: err.message || "Internal Server Error" });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================================`);
  console.log(` GASFLOW LPG REFILLING PLANT POS SYSTEM ONLINE`);
  console.log(` Station Dashboard: http://localhost:${PORT}`);
  console.log(` Network Access:    http://0.0.0.0:${PORT}`);
  console.log(` Storage:           data/gas_station_db.json`);
  console.log(` Zero dependencies! Completely offline capable.`);
  console.log(`========================================================`);
});
