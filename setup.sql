-- Employee Tracking System Database Setup
-- This file contains the database schema for the tracking system

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tracking Sessions Table
CREATE TABLE IF NOT EXISTS tracking_sessions (
    id TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (admin_id) REFERENCES admins (id),
    FOREIGN KEY (employee_id) REFERENCES employees (id)
);

-- Location Data Table
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES tracking_sessions (id)
);

-- Consent Records Table
CREATE TABLE IF NOT EXISTS consent_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    employee_id INTEGER NOT NULL,
    consent_given BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES tracking_sessions (id),
    FOREIGN KEY (employee_id) REFERENCES employees (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_status ON tracking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_locations_session ON locations(session_id);
CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_consent_session ON consent_records(session_id);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO admins (username, password) VALUES 
('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdJrG6OdO.9p8rJ8O8n8O8n8O8n8O');

-- Sample employees (for testing)
INSERT OR IGNORE INTO employees (employee_id, name, email) VALUES 
('EMP001', 'John Doe', 'john.doe@company.com'),
('EMP002', 'Jane Smith', 'jane.smith@company.com'),
('EMP003', 'Mike Johnson', 'mike.johnson@company.com');
