const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db;

/**
 * Initializes the SQLite database with full Health, Isolation, and Sync support.
 */
function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'poultry_data.db');

  console.log(`Initializing database at: ${dbPath}`);

  db = new Database(dbPath, { verbose: console.log });
  db.pragma('journal_mode = WAL');

  createSchema();

  return db;
}

function createSchema() {
  const schema = `
    -- Core Batches Table
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'active',
      arrivalDate TEXT NOT NULL,
      breedType TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      currentCount INTEGER NOT NULL,
      houseId TEXT NOT NULL,
      initialCount INTEGER NOT NULL,
      updatedAt TEXT,
      userId TEXT NOT NULL,
      farmId TEXT NOT NULL,
      batchName TEXT DEFAULT 'New Batch',
      type TEXT DEFAULT 'POULTRY_BROILER',
      isolationCount INTEGER DEFAULT 0
    );

    -- Modernized Isolation Rooms Table
    CREATE TABLE IF NOT EXISTS isolation_rooms (
      id TEXT PRIMARY KEY,
      farmId TEXT NOT NULL,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      userId TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Unified Health & Mortality Table (Aligned with Prisma @@map("mortality"))
    CREATE TABLE IF NOT EXISTS mortality (
      id TEXT PRIMARY KEY,
      batchId TEXT NOT NULL,
      count INTEGER NOT NULL,
      reason TEXT,
      logDate TIMESTAMP NOT NULL,
      userId TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      category TEXT,
      subCategory TEXT,
      farmId TEXT NOT NULL,
      isolationRoomId TEXT,
      type TEXT DEFAULT 'DEAD', -- 'SICK' or 'DEAD'
      FOREIGN KEY (batchId) REFERENCES batches (id),
      FOREIGN KEY (isolationRoomId) REFERENCES isolation_rooms (id)
    );

    -- Standardized Sales Table
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      customerName TEXT,
      totalAmount REAL NOT NULL,
      saleDate TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed',
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT,
      farmId TEXT NOT NULL
    );

    -- Worker Stamp/Audit Logs
    CREATE TABLE IF NOT EXISTS insert_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      target_table TEXT NOT NULL,
      record_id TEXT NOT NULL,
      inserted_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Offline-First Sync Outbox
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Global Settings Table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `;

  db.exec(schema);
  console.log('Advanced SQLite Schema for Health & Isolation initialized successfully.');
}

function query(sql, params = []) {
  if (!db) initDatabase();
  return db.prepare(sql).all(params);
}

function execute(sql, params = []) {
  if (!db) initDatabase();
  return db.prepare(sql).run(params);
}

module.exports = {
  initDatabase,
  query,
  execute,
  getDb: () => db
};
