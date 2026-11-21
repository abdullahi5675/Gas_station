# GasFlow POS - Modern LPG Cooking Gas Station & Refilling Plant Management System

A high-speed, zero-dependency, offline-ready Point of Sale (POS) and inventory management system designed specifically for modern **Liquefied Petroleum Gas (LPG) Skid Plants and Cooking Gas Refilling Stations in Nigeria**.

---

## 🌟 The Business Problem Solved
Traditional Nigerian cooking gas shops use manual hanging scales, manually decanting 50kg cylinders into household cylinders — a process that is slow, error-prone, and hazardous. 

Modern Nigerian plants utilize a **central bulk LPG storage tank (e.g., 2.5T, 5T, 10T)** with **digital dispenser pumps/nozzles** (similar to petroleum stations). Customers pay at a centralized cashier desk and receive **two receipts**:
1. **Customer Receipt**: Official proof of payment with total amount in Naira (₦), rate per KG, and date/time.
2. **Dispenser Refill Slip / Token**: Taken to the pump island so the attendant can key the exact KG or budget into the dispenser without double-refilling or unauthorized dispensing.

GasFlow POS automates this entire chain from customer payment to tank inventory depletion, dispenser validation, cashier reconciliation, and owner oversight.

---

## 🚀 Key Features

### 1. ⚡ Fast Cashier POS Desk
- **Nigerian Standard Cylinder Presets**: One-click selection for **3kg, 5kg, 6kg, 10kg, 12.5kg, 25kg, and 50kg** cylinders.
- **Quantity Multiplier**: Quick `+` and `-` buttons for customers bringing multiple cylinders.
- **Exact Weight Mode (KG)**: Enter fractional weights (e.g., `4.2 kg` or `7.5 kg`).
- **Budget / Amount Mode (₦)**: For customers requesting a specific amount (e.g., *"Fill ₦2,000 worth"* -> automatically calculates exact `1.60 kg`).
- **Multiple Payment Methods**:
  - 💵 **Cash** (Drawer cash tracking)
  - 💳 **POS Terminal** (STAN / Approval code logging for Moniepoint, Opay, etc.)
  - 📱 **Bank Transfer** (Sender name / transaction reference)
- **Dispenser & Attendant Assignment**: Automatically routes orders to specific pump islands (e.g. Pump 1 North Island, Pump 2 South Island).

### 2. 🧾 Dual Receipt & Token Printing (80mm / 58mm Thermal)
- Formatted specifically for standard receipt printers (`window.print()` with clean `@media print` layout):
  - **PART 1: CUSTOMER RECEIPT**: Station brand, address, RC number, receipt #, date/time, cylinder spec, weight, rate, total ₦ paid, payment method, safety reminder.
  - **✂ TEAR HERE SEPARATOR**: Perforated division line.
  - **PART 2: DISPENSER REFILL SLIP**: Giant Refill Token Code (e.g., `TKN-314`), Target Refill in KG, Assigned Pump, Attendant name, signature/stamp area.

### 3. 🛡️ Dispenser Queue (Attendant Island View)
- Real-time attendant screen showing cylinders waiting to be refilled.
- Status progression: `Waiting to Refill` ➔ `Dispensing Now` ➔ `Completed & Released`.
- Prevents cylinder refill theft, double-refilling, or nozzle meter discrepancy.

### 4. 🛢️ Bulk Storage Tank & Bridger Delivery Tracking
- **Live Stock Gauge**: Visual capacity bar showing current KG, percentage, and Metric Tons in stock.
- **Low Stock Warnings**: Alerts management before reserve threshold is breached.
- **Offload Bridger Tanker Deliveries**: Record delivery details (Supplier, Truck plate, Waybill #, Metric Tons, Cost per KG) — immediately increments bulk tank stock.
- **Tank Gauge / Dip Audits**: Record physical rotary float dial percentages against system-calculated stock to measure evaporation and pump calibration variances.

### 5. 💰 Cashier Shift Reconciliation & Audits
- Start shifts with opening cash floats.
- Track cash sales vs. digital POS/transfers in real time.
- End-of-shift cash drawer count: automatically detects and flags exact balance, cash shortage, or cash overage.

### 6. 📊 Sales Ledger & Export
- Comprehensive transaction history with search by Order #, Token, Customer, or Attendant.
- Filter by payment method and date.
- One-click **Export to CSV / Excel** for owner accounting.
- Instant reprint of receipts for any previous transaction.

---

## 💻 How to Start the System

### Option A: One-Click Startup (Windows)
Double-click:
```
start-station.bat
```

### Option B: Command Line (Node.js)
Open PowerShell or Command Prompt in this folder:
```bash
node server/server.js
```

Then open your browser at:
```
http://localhost:5000
```

### Accessing over Local Wi-Fi (Phones & Tablets)
Any device connected to the station's local router or hotspot can open:
```
http://<STATION-PC-IP>:5000
```
*(e.g., `http://192.168.1.100:5000`)*

---

## 🔒 Zero External Dependencies & 100% Offline
- Built with Node.js built-in standard libraries (`node:http`, `fs`, `path`).
- Stores data locally in `data/gas_station_db.json`.
- Requires **no cloud connection** or expensive monthly SaaS subscription.
- Starts in less than 200 milliseconds.
