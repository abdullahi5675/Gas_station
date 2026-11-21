import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb, saveDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Helper Functions ---
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

// 1. System Overview & Dashboard Stats
app.get('/api/overview', (req, res) => {
  const db = getDb();
  
  // Calculate today's metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = db.orders.filter(o => o.createdAt.startsWith(todayStr) && o.status !== 'CANCELLED');
  
  const todayKg = todayOrders.reduce((sum, o) => sum + (Number(o.kgRequested) || 0), 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  
  const cashSales = todayOrders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.totalAmount, 0);
  const posSales = todayOrders.filter(o => o.paymentMethod === 'POS_CARD').reduce((sum, o) => sum + o.totalAmount, 0);
  const transferSales = todayOrders.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((sum, o) => sum + o.totalAmount, 0);

  const tankPercentage = ((db.tank.currentStockKg / db.tank.capacityKg) * 100).toFixed(1);
  const isLowStock = db.tank.currentStockKg <= db.tank.lowStockThresholdKg;

  res.json({
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
});

// 2. Orders Endpoints
app.get('/api/orders', (req, res) => {
  const db = getDb();
  const { date, status, limit } = req.query;
  let list = [...db.orders].reverse();

  if (date) {
    list = list.filter(o => o.createdAt.startsWith(date));
  }
  if (status) {
    list = list.filter(o => o.status === status);
  }
  if (limit) {
    list = list.slice(0, Number(limit));
  }

  res.json(list);
});

// Create new Refill Order (Cashier POS)
app.post('/api/orders', (req, res) => {
  const db = getDb();
  const {
    customerName,
    customerPhone,
    cylinderType,
    kgRequested,
    paymentMethod,
    paymentRef,
    cashierName,
    attendantName,
    pump
  } = req.body;

  const kg = Number(kgRequested);
  if (!kg || kg <= 0) {
    return res.status(400).json({ error: "Invalid KG amount requested" });
  }

  // Check if tank has enough stock
  if (db.tank.currentStockKg < kg) {
    return res.status(400).json({ 
      error: `Insufficient tank stock! Available: ${db.tank.currentStockKg.toFixed(1)}kg, requested: ${kg}kg` 
    });
  }

  const rate = db.settings.pricePerKg;
  const totalAmount = Math.round(kg * rate);

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
    paymentRef: paymentRef || (paymentMethod === "CASH" ? "CASH-COUNTER" : "VERIFIED"),
    cashierName: cashierName || db.activeShift?.cashierName || "Cashier On Duty",
    attendantName: attendantName || "Island Attendant",
    pump: pump || db.settings.pumps[0] || "Pump 1",
    status: "PAID", // Order is paid at desk, ready for attendant to dispense
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  // Deduct from tank inventory
  db.tank.currentStockKg = Math.max(0, Number((db.tank.currentStockKg - kg).toFixed(2)));

  db.orders.push(newOrder);
  saveDb(db);

  res.status(201).json({
    success: true,
    order: newOrder,
    remainingStockKg: db.tank.currentStockKg
  });
});

// Update order status (e.g. Attendant marks DISPENSING or COMPLETED)
app.patch('/api/orders/:id/status', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status, attendantName, pump } = req.body;

  const orderIndex = db.orders.findIndex(o => o.id === id || o.orderNumber === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = db.orders[orderIndex];
  order.status = status;
  if (attendantName) order.attendantName = attendantName;
  if (pump) order.pump = pump;
  if (status === 'COMPLETED') {
    order.completedAt = new Date().toISOString();
  }

  saveDb(db);
  res.json({ success: true, order });
});

// 3. Tank Inventory & Delivery
app.get('/api/tank', (req, res) => {
  const db = getDb();
  const percentage = ((db.tank.currentStockKg / db.tank.capacityKg) * 100).toFixed(1);
  res.json({
    tank: {
      ...db.tank,
      percentage: Number(percentage)
    },
    deliveries: db.tankDeliveries || [],
    dips: db.tankDips || []
  });
});

// Offload bulk tanker gas delivery
app.post('/api/tank/delivery', (req, res) => {
  const db = getDb();
  const { supplier, truckNumber, waybillNumber, metricTons, kgReceived, costPerKg, notes, offloadedBy } = req.body;

  const kg = Number(kgReceived) || (Number(metricTons) * 1000);
  if (!kg || kg <= 0) {
    return res.status(400).json({ error: "Invalid delivery quantity" });
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

  db.tank.currentStockKg = Math.min(db.tank.capacityKg, Number((db.tank.currentStockKg + kg).toFixed(2)));
  db.tank.lastDeliveryDate = newDelivery.date;
  db.tankDeliveries.unshift(newDelivery);

  saveDb(db);

  res.status(201).json({
    success: true,
    delivery: newDelivery,
    newStockKg: db.tank.currentStockKg
  });
});

// Record manual dip/gauge check
app.post('/api/tank/dip', (req, res) => {
  const db = getDb();
  const { gaugePercent, recordedBy, notes } = req.body;

  const percent = Number(gaugePercent);
  if (isNaN(percent) || percent < 0 || percent > 100) {
    return res.status(400).json({ error: "Invalid gauge percentage (0 - 100)" });
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
    recordedBy: recordedBy || "Plant Supervisor",
    notes: notes || "Routine tank gauge audit."
  };

  db.tankDips = db.tankDips || [];
  db.tankDips.unshift(newDip);

  saveDb(db);

  res.status(201).json({
    success: true,
    dip: newDip
  });
});

// 4. Settings Update (e.g. Change Rate per KG)
app.patch('/api/settings', (req, res) => {
  const db = getDb();
  const { pricePerKg, stationName, address, phone, pumps } = req.body;

  if (pricePerKg && Number(pricePerKg) > 0) {
    db.settings.pricePerKg = Number(pricePerKg);
  }
  if (stationName) db.station.name = stationName;
  if (address) db.station.address = address;
  if (phone) db.station.phone = phone;
  if (pumps && Array.isArray(pumps)) db.settings.pumps = pumps;

  saveDb(db);
  res.json({ success: true, settings: db.settings, station: db.station });
});

// 5. Shift Management & End of Day Reconciliation
app.post('/api/shift/close', (req, res) => {
  const db = getDb();
  const { actualCashCounted, nextCashierName, notes } = req.body;

  const todayStr = new Date().toISOString().slice(0, 10);
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
  const counted = Number(actualCashCounted) || 0;
  const cashDiscrepancy = counted - expectedCashInDrawer; // negative means shortage, positive means excess

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
    notes: notes || "Normal shift handover"
  };

  db.shiftHistory = db.shiftHistory || [];
  db.shiftHistory.unshift(closedShiftRecord);

  // Start new shift
  db.activeShift = {
    id: `SHIFT-${Date.now()}`,
    cashierId: `csh-${Date.now()}`,
    cashierName: nextCashierName || "Next Cashier On Duty",
    startTime: new Date().toISOString(),
    openingCash: counted, // Carry forward counted cash or standard float
    status: "OPEN"
  };

  saveDb(db);

  res.json({
    success: true,
    closedShift: closedShiftRecord,
    newActiveShift: db.activeShift
  });
});

// Serve static production build if available
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`GasFlow LPG Station Server running on http://localhost:${PORT}`);
});
