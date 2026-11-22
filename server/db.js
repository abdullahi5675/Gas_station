import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {
    // ignore
  }
}

const IS_VERCEL = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'gas_station_db.json');
const SEED_FILE = path.join(__dirname, '..', 'data', 'gas_station_db.json');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_7fwA2OWxlmaF@ep-summer-bonus-bdldtem9-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Extract host from DATABASE_URL for Neon HTTP endpoint
function getNeonHttpUrl(connStr) {
  try {
    const match = connStr.match(/@([^/]+)\//);
    if (!match) return null;
    let host = match[1];
    // Remove -pooler from host if present for HTTP endpoint
    host = host.replace('-pooler', '');
    return `https://${host}/sql`;
  } catch (e) {
    return null;
  }
}

const NEON_HTTP_URL = DATABASE_URL ? getNeonHttpUrl(DATABASE_URL) : null;

// Neon HTTP query runner (built-in fetch, 0 external dependencies)
export async function neonQuery(sql, params = []) {
  if (!NEON_HTTP_URL || !DATABASE_URL) return null;
  try {
    const res = await fetch(NEON_HTTP_URL, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': DATABASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql, params })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Neon HTTP] Query error response:', errText);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[Neon HTTP] Network fetch error:', err.message);
    return null;
  }
}

let cachedDb = null;

const defaultCleanData = {
  station: {
    name: "Al-Barakah Modern LPG Gas Station",
    tagline: "Safe, Fast & Accurate Digital Cooking Gas Refilling",
    address: "Plot 14, Commercial Avenue, Bypass Road",
    city: "Kano / Abuja",
    country: "Nigeria",
    phone: "+234 803 123 4567",
    email: "contact@albarakah-lpg.ng",
    rcNumber: "RC: 1849204",
    vatRate: 0
  },
  settings: {
    pricePerKg: 1250,
    minRefillKg: 0.5,
    minRefillAmount: 500,
    currency: "₦",
    currencyCode: "NGN",
    receiptCopies: 2,
    requireCustomerPhone: false,
    pumps: ["Pump 1 (North Island)", "Pump 2 (South Island)"]
  },
  tank: {
    tankId: "TANK-01",
    name: "Bulk LPG Skid Tank 1",
    capacityKg: 5000,
    currentStockKg: 4000,
    lowStockThresholdKg: 800,
    maxSafeFillPercent: 85,
    lastDeliveryDate: null
  },
  attendants: [
    { id: "att-1", name: "Ibrahim Musa", code: "IM-01", pump: "Pump 1 (North Island)", active: true, phone: "08011223344" },
    { id: "att-2", name: "Usman Danladi", code: "UD-02", pump: "Pump 2 (South Island)", active: true, phone: "08055667788" }
  ],
  cashiers: [
    { id: "csh-1", name: "Fatima Adamu", code: "FA-01", role: "Cashier", active: true }
  ],
  activeShift: {
    id: "SHIFT-001",
    cashierId: "csh-1",
    cashierName: "Fatima Adamu",
    startTime: new Date().toISOString(),
    openingCash: 0,
    status: "OPEN"
  },
  shiftHistory: [],
  orders: [],
  tankDeliveries: [],
  tankDips: [],
  users: [
    {
      id: "usr-owner",
      name: "Alhaji Sanusi",
      username: "owner",
      password: "123",
      role: "Owner / Admin",
      phone: "08031234567",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-admin",
      name: "Alhaji Sanusi",
      username: "admin",
      password: "123",
      role: "Owner / Admin",
      phone: "08031234567",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-manager",
      name: "Ahmed Yahaya",
      username: "manager",
      password: "123",
      role: "Manager",
      phone: "08039876543",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-fatima",
      name: "Fatima Adamu",
      username: "fatima",
      password: "123",
      role: "Cashier (Morning Shift)",
      phone: "08023456789",
      createdAt: new Date().toISOString()
    }
  ],
  auditLogs: [
    {
      id: "LOG-INIT",
      timestamp: new Date().toISOString(),
      userName: "System",
      role: "Admin",
      action: "SYSTEM_START",
      details: "GasFlow station management system initialized clean and ready for operations."
    }
  ]
};

// Initial local file sync/check
try {
  if (IS_VERCEL && !fs.existsSync(DB_FILE)) {
    if (fs.existsSync(SEED_FILE)) {
      fs.writeFileSync(DB_FILE, fs.readFileSync(SEED_FILE, 'utf-8'), 'utf-8');
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultCleanData, null, 2), 'utf-8');
    }
  } else if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultCleanData, null, 2), 'utf-8');
  }
} catch (e) {
  console.warn("Storage warning:", e);
}

// Sync live state from Neon into memory and cache
export async function syncFromNeon() {
  if (!NEON_HTTP_URL) return null;
  try {
    const usersRes = await neonQuery('SELECT * FROM users ORDER BY created_at ASC');
    const configRes = await neonQuery('SELECT * FROM station_config LIMIT 1');
    const ordersRes = await neonQuery('SELECT * FROM orders ORDER BY created_at DESC');
    const delivRes = await neonQuery('SELECT * FROM tank_deliveries ORDER BY date DESC');
    const logsRes = await neonQuery('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');

    const base = getDb();
    if (usersRes?.rows && usersRes.rows.length > 0) {
      base.users = usersRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        username: r.username,
        password: r.password,
        role: r.role,
        phone: r.phone,
        createdAt: r.created_at
      }));
    }

    if (configRes?.rows && configRes.rows.length > 0) {
      const c = configRes.rows[0];
      base.settings.pricePerKg = Number(c.price_per_kg) || base.settings.pricePerKg;
      base.tank.currentStockKg = Number(c.current_stock_kg) || base.tank.currentStockKg;
      base.tank.capacityKg = Number(c.tank_capacity_kg) || base.tank.capacityKg;
      base.tank.lowStockThresholdKg = Number(c.low_stock_threshold_kg) || base.tank.lowStockThresholdKg;
    }

    if (ordersRes?.rows) {
      base.orders = ordersRes.rows.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        tokenCode: o.token_code,
        customerName: o.customer_name,
        cylinderType: o.cylinder_type,
        kgRequested: Number(o.kg_requested),
        ratePerKg: Number(o.rate_per_kg),
        totalAmount: Number(o.total_amount),
        paymentMethod: o.payment_method,
        paymentRef: o.payment_ref,
        cashierName: o.cashier_name,
        status: o.status,
        createdAt: o.created_at
      }));
    }

    if (delivRes?.rows) {
      base.tankDeliveries = delivRes.rows.map(d => ({
        id: d.id,
        date: d.date,
        supplier: d.supplier,
        truckNumber: d.truck_number,
        waybillNumber: d.waybill_number,
        grossWeightKg: Number(d.gross_weight_kg),
        tareWeightKg: Number(d.tare_weight_kg),
        netLpgKg: Number(d.net_lpg_kg),
        purchaseCostNaira: Number(d.purchase_cost_naira),
        offloadedIntoTank: d.offloaded_into_tank,
        receivedByManager: d.received_by_manager,
        createdAt: d.created_at
      }));
    }

    if (logsRes?.rows) {
      base.auditLogs = logsRes.rows.map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        userName: l.user_name,
        role: l.role,
        action: l.action,
        details: l.details
      }));
    }

    cachedDb = base;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(base, null, 2), 'utf-8');
    } catch (err) {}
    console.log(`[Neon DB] Successfully synced ${base.users.length} users, ${base.orders.length} orders, ${base.auditLogs.length} logs.`);
    return base;
  } catch (err) {
    console.error('[Neon DB] Sync error:', err.message);
    return null;
  }
}

// Push mutations directly to Neon
async function syncToNeon(data) {
  if (!NEON_HTTP_URL) return;
  try {
    // 1. Users
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        await neonQuery(`
          INSERT INTO users (id, name, username, password, role, phone, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO UPDATE 
          SET name = EXCLUDED.name, password = EXCLUDED.password, role = EXCLUDED.role, phone = EXCLUDED.phone;
        `, [u.id || `usr-${Date.now()}`, u.name, u.username, u.password, u.role, u.phone || '', u.createdAt || new Date().toISOString()]);
      }
    }

    // 2. Station & Tank Config
    if (data.tank && data.settings) {
      await neonQuery(`
        INSERT INTO station_config (id, station_name, price_per_kg, tank_capacity_kg, current_stock_kg, low_stock_threshold_kg, updated_at)
        VALUES ('STATION-01', $1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET price_per_kg = EXCLUDED.price_per_kg, current_stock_kg = EXCLUDED.current_stock_kg, updated_at = NOW();
      `, [
        data.station?.name || "Al-Barakah Modern LPG Gas Station",
        data.settings.pricePerKg || 1250,
        data.tank.capacityKg || 5000,
        data.tank.currentStockKg || 4000,
        data.tank.lowStockThresholdKg || 800
      ]);
    }

    // 3. Orders
    if (Array.isArray(data.orders)) {
      for (const o of data.orders.slice(0, 50)) {
        await neonQuery(`
          INSERT INTO orders (id, order_number, token_code, customer_name, cylinder_type, kg_requested, rate_per_kg, total_amount, payment_method, payment_ref, cashier_name, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (order_number) DO NOTHING;
        `, [
          o.id,
          o.orderNumber,
          o.tokenCode || 'TKN-001',
          o.customerName || 'Walk-in',
          o.cylinderType || '12.5kg Standard',
          o.kgRequested || 0,
          o.ratePerKg || 1250,
          o.totalAmount || 0,
          o.paymentMethod || 'CASH',
          o.paymentRef || '',
          o.cashierName || 'Cashier',
          o.status || 'PAID',
          o.createdAt || new Date().toISOString()
        ]);
      }
    }

    // 4. Tank Deliveries
    if (Array.isArray(data.tankDeliveries)) {
      for (const d of data.tankDeliveries.slice(0, 50)) {
        await neonQuery(`
          INSERT INTO tank_deliveries (id, date, supplier, truck_number, waybill_number, gross_weight_kg, tare_weight_kg, net_lpg_kg, purchase_cost_naira, offloaded_into_tank, received_by_manager, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING;
        `, [
          d.id,
          d.date || new Date().toISOString(),
          d.supplier || 'Depot',
          d.truckNumber || '',
          d.waybillNumber || '',
          d.grossWeightKg || 0,
          d.tareWeightKg || 0,
          d.netLpgKg || 0,
          d.purchaseCostNaira || 0,
          d.offloadedIntoTank || 'TANK-01',
          d.receivedByManager || 'Manager',
          d.createdAt || new Date().toISOString()
        ]);
      }
    }

    // 5. Audit Logs
    if (Array.isArray(data.auditLogs)) {
      for (const l of data.auditLogs.slice(0, 30)) {
        await neonQuery(`
          INSERT INTO audit_logs (id, timestamp, user_name, role, action, details)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `, [
          l.id || `LOG-${Date.now()}`,
          l.timestamp || new Date().toISOString(),
          l.userName || 'Staff',
          l.role || 'Cashier',
          l.action || 'INFO',
          l.details || ''
        ]);
      }
    }
  } catch (err) {
    console.error('[Neon DB] Write sync error:', err.message);
  }
}

export function getDb() {
  if (cachedDb) return cachedDb;
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cachedDb = JSON.parse(raw);
    return cachedDb;
  } catch (err) {
    console.error("Error reading DB file, using default clean data:", err);
    cachedDb = defaultCleanData;
    return cachedDb;
  }
}

export function saveDb(data) {
  cachedDb = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    syncToNeon(data).catch(() => {});
    return true;
  } catch (err) {
    console.error("Error saving DB file:", err);
    syncToNeon(data).catch(() => {});
    return false;
  }
}

// Initial sync from Neon on startup
if (NEON_HTTP_URL) {
  syncFromNeon().catch(err => {
    console.warn("Initial syncFromNeon failed:", err.message);
  });
}
