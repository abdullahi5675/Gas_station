import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel, root filesystem is read-only, only /tmp is writable
const IS_VERCEL = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'gas_station_db.json');
const SEED_FILE = path.join(__dirname, '..', 'data', 'gas_station_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

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

// Seed /tmp on Vercel from local seed file or default data
if (IS_VERCEL && !fs.existsSync(DB_FILE)) {
  try {
    if (fs.existsSync(SEED_FILE)) {
      const seedContent = fs.readFileSync(SEED_FILE, 'utf-8');
      fs.writeFileSync(DB_FILE, seedContent, 'utf-8');
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultCleanData, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error("Vercel /tmp initialization warning:", e);
  }
} else if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultCleanData, null, 2), 'utf-8');
}

export function getDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading DB file, using default clean data:", err);
    return defaultCleanData;
  }
}

export function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Error saving DB file:", err);
    return false;
  }
}
