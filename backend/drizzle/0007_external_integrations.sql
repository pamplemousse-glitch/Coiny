-- Coinbase connections (one per user, stores OAuth tokens or dev-key marker)
CREATE TABLE coinbase_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  mode TEXT NOT NULL DEFAULT 'dev_key',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zerion wallets (many per user — one per wallet address)
CREATE TABLE zerion_wallets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, address)
);

-- Spinwheel connections (one per user)
CREATE TABLE spinwheel_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spinwheel_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
