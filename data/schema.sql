-- ============================================================
-- GasFlow LPG Refilling Station — PostgreSQL Schema
-- Database: gasflow_db (or postgres default)
-- ============================================================

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'Owner / Admin', 'Manager', 'Cashier (Morning Shift)', 'Cashier (Evening Shift)'
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STATION METRICS & TANK
CREATE TABLE IF NOT EXISTS station_config (
    id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(150) NOT NULL,
    price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 1250.00,
    tank_capacity_kg NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
    current_stock_kg NUMERIC(10, 2) NOT NULL DEFAULT 4000.00,
    low_stock_threshold_kg NUMERIC(10, 2) NOT NULL DEFAULT 800.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS / SALES
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    token_code VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) DEFAULT 'Walk-in Household',
    cylinder_type VARCHAR(50) NOT NULL,
    kg_requested NUMERIC(10, 2) NOT NULL,
    rate_per_kg NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- 'POS_CARD', 'CASH', 'BANK_TRANSFER'
    payment_ref VARCHAR(50),
    cashier_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PAID',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BULK GAS PURCHASES (DEPOT DELIVERIES)
CREATE TABLE IF NOT EXISTS tank_deliveries (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMPTZ DEFAULT NOW(),
    supplier VARCHAR(100) NOT NULL,
    truck_number VARCHAR(50),
    waybill_number VARCHAR(50),
    metric_tons NUMERIC(10, 2),
    kg_received NUMERIC(10, 2) NOT NULL,
    cost_per_kg NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(14, 2) NOT NULL,
    offloaded_by VARCHAR(100),
    notes TEXT
);

-- 5. IMMUTABLE ACTIVITY AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT NOT NULL
);

-- ============================================================
-- SEED INITIAL CLEAN TESTING ACCOUNTS (Owner, Manager, Cashier)
-- ============================================================
INSERT INTO users (id, name, username, password, role, phone)
VALUES 
    ('usr-owner', 'Alhaji Sanusi', 'owner', '123', 'Owner / Admin', '08031234567'),
    ('usr-admin', 'Alhaji Sanusi', 'admin', '123', 'Owner / Admin', '08031234567'),
    ('usr-manager', 'Ahmed Yahaya', 'manager', '123', 'Manager', '08039876543'),
    ('usr-fatima', 'Fatima Adamu', 'fatima', '123', 'Cashier (Morning Shift)', '08023456789')
ON CONFLICT (username) DO NOTHING;

INSERT INTO station_config (id, station_name, price_per_kg, tank_capacity_kg, current_stock_kg, low_stock_threshold_kg)
VALUES ('STATION-01', 'Al-Barakah Modern LPG Gas Station', 1250.00, 5000.00, 4000.00, 800.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, timestamp, user_name, role, action, details)
VALUES ('LOG-INIT', NOW(), 'System', 'Admin', 'SYSTEM_START', 'Clean database schema initialized with 3 test accounts.')
ON CONFLICT (id) DO NOTHING;
