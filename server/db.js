import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'gas_station_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = {
  station: {
    name: "Al-Barakah Modern LPG Gas Station",
    tagline: "Safe, Fast & Accurate Digital Cooking Gas Refilling",
    address: "Plot 14, Commercial Avenue, Bypass Road",
    city: "Kano / Abuja",
    country: "Nigeria",
    phone: "+234 803 123 4567",
    email: "contact@albarakah-lpg.ng",
    rcNumber: "RC: 1849204",
    vatRate: 0, // 0% for cooking gas
  },
  settings: {
    pricePerKg: 1250, // ₦1,250 per KG (standard current Nigerian market average)
    minRefillKg: 0.5,
    minRefillAmount: 500,
    currency: "₦",
    currencyCode: "NGN",
    receiptCopies: 2, // 1 for Customer, 1 for Attendant
    requireCustomerPhone: false,
    pumps: ["Pump 1 (North Island)", "Pump 2 (South Island)"]
  },
  tank: {
    tankId: "TANK-01",
    name: "Bulk LPG Skid Tank 1",
    capacityKg: 5000, // 5 Metric Tons
    currentStockKg: 3850.5,
    lowStockThresholdKg: 800,
    maxSafeFillPercent: 85, // LPG Safety margin 85%
    lastDeliveryDate: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  attendants: [
    { id: "att-1", name: "Ibrahim Musa", code: "IM-01", pump: "Pump 1 (North Island)", active: true, phone: "08011223344" },
    { id: "att-2", name: "Usman Danladi", code: "UD-02", pump: "Pump 2 (South Island)", active: true, phone: "08055667788" },
    { id: "att-3", name: "Sani Bello", code: "SB-03", pump: "Standby / Relief", active: true, phone: "08099887766" }
  ],
  cashiers: [
    { id: "csh-1", name: "Fatima Adamu", code: "FA-01", role: "Cashier", active: true },
    { id: "csh-2", name: "Ahmed Yahaya", code: "AY-02", role: "Manager / Admin", active: true }
  ],
  activeShift: {
    id: "SHIFT-20261121-01",
    cashierId: "csh-1",
    cashierName: "Fatima Adamu",
    startTime: new Date(Date.now() - 4 * 3600000).toISOString(),
    openingCash: 25000,
    status: "OPEN"
  },
  shiftHistory: [],
  orders: [
    {
      id: "ORD-1001",
      orderNumber: "GF-20261121-0001",
      tokenCode: "TKN-314",
      customerName: "Alhaji Garba",
      customerPhone: "08034567890",
      cylinderType: "12.5kg",
      kgRequested: 12.5,
      ratePerKg: 1250,
      totalAmount: 15625,
      paymentMethod: "CASH",
      paymentRef: "CASH-COUNTER",
      cashierName: "Fatima Adamu",
      attendantName: "Ibrahim Musa",
      pump: "Pump 1 (North Island)",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 2.9 * 3600000).toISOString()
    },
    {
      id: "ORD-1002",
      orderNumber: "GF-20261121-0002",
      tokenCode: "TKN-315",
      customerName: "Madam Ngozi",
      customerPhone: "08023456789",
      cylinderType: "6kg",
      kgRequested: 6,
      ratePerKg: 1250,
      totalAmount: 7500,
      paymentMethod: "POS_CARD",
      paymentRef: "POS-MONIEPOINT-881",
      cashierName: "Fatima Adamu",
      attendantName: "Usman Danladi",
      pump: "Pump 2 (South Island)",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 2.5 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 2.4 * 3600000).toISOString()
    },
    {
      id: "ORD-1003",
      orderNumber: "GF-20261121-0003",
      tokenCode: "TKN-316",
      customerName: "Mallam Kabir",
      customerPhone: "08109876543",
      cylinderType: "Custom (₦5,000)",
      kgRequested: 4.0,
      ratePerKg: 1250,
      totalAmount: 5000,
      paymentMethod: "BANK_TRANSFER",
      paymentRef: "OPAY-TRF-9921",
      cashierName: "Fatima Adamu",
      attendantName: "Ibrahim Musa",
      pump: "Pump 1 (North Island)",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 1.2 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 1.1 * 3600000).toISOString()
    },
    {
      id: "ORD-1004",
      orderNumber: "GF-20261121-0004",
      tokenCode: "TKN-317",
      customerName: "Mrs. Kemi Johnson",
      customerPhone: "08077889900",
      cylinderType: "25kg",
      kgRequested: 25.0,
      ratePerKg: 1250,
      totalAmount: 31250,
      paymentMethod: "POS_CARD",
      paymentRef: "POS-STANBIC-441",
      cashierName: "Fatima Adamu",
      attendantName: "Usman Danladi",
      pump: "Pump 2 (South Island)",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 0.4 * 3600000).toISOString()
    }
  ],
  tankDeliveries: [
    {
      id: "DEL-001",
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      supplier: "NNPC / Matrix Energy Ltd",
      truckNumber: "KMC-492-XA",
      waybillNumber: "WB-994821",
      metricTons: 3.5,
      kgReceived: 3500,
      costPerKg: 1020,
      totalCost: 3570000,
      offloadedBy: "Usman Danladi",
      notes: "Bridger tanker offloaded safely. Initial tank gauge 8%, final 78%."
    }
  ],
  tankDips: [
    {
      id: "DIP-001",
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      gaugePercent: 77.5,
      calculatedStockKg: 3875,
      systemStockKg: 3898,
      varianceKg: -23, // minor evaporation / calibration difference
      recordedBy: "Ahmed Yahaya",
      notes: "Morning opening calibration check."
    }
  ]
};

// Initialize DB file if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
}

export function getDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.users) {
      data.users = [
        { id: "usr-1", name: "Ahmed Yahaya", username: "admin", password: "123", role: "Manager / Owner", phone: "08031234567", createdAt: new Date().toISOString() },
        { id: "usr-2", name: "Fatima Adamu", username: "fatima", password: "123", role: "Cashier (Morning Shift)", phone: "08023456789", createdAt: new Date().toISOString() },
        { id: "usr-3", name: "Musa Ibrahim", username: "musa", password: "123", role: "Cashier (Evening Shift)", phone: "08099887766", createdAt: new Date().toISOString() }
      ];
    }
    if (!data.auditLogs) {
      data.auditLogs = [
        {
          id: "LOG-INIT-1",
          timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
          userName: "Fatima Adamu",
          role: "Cashier (Morning Shift)",
          action: "USER_LOGIN",
          details: "Fatima Adamu logged in to start morning cashier shift."
        },
        {
          id: "LOG-INIT-2",
          timestamp: new Date(Date.now() - 3.5 * 3600000).toISOString(),
          userName: "Ahmed Yahaya",
          role: "Manager / Owner",
          action: "PRICE_CHANGED",
          details: "Ahmed Yahaya verified and set gas rate at ₦1,250/kg."
        }
      ];
    }
    return data;
  } catch (err) {
    console.error("Error reading DB file, using default data:", err);
    return defaultData;
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
