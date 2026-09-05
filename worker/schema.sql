CREATE TABLE IF NOT EXISTS orders (
  transaction_id TEXT PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  email TEXT,
  status TEXT NOT NULL,
  license_hash TEXT NOT NULL,
  claimed_at TEXT,
  activation_id TEXT,
  device_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_license_hash ON orders(license_hash);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
