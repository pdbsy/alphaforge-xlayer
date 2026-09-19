CREATE TABLE chain_blocks (
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  block_hash TEXT NOT NULL,
  parent_hash TEXT NOT NULL,
  block_timestamp TEXT NOT NULL,
  log_count INTEGER NOT NULL CHECK (log_count >= 0),
  canonical INTEGER NOT NULL CHECK (canonical IN (0, 1)),
  PRIMARY KEY (chain_id, contract_address, block_number, block_hash)
);
CREATE UNIQUE INDEX one_canonical_block_per_height
  ON chain_blocks (chain_id, contract_address, block_number)
  WHERE canonical = 1;

CREATE TABLE chain_checkpoints (
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  block_hash TEXT NOT NULL,
  PRIMARY KEY (chain_id, contract_address)
);

CREATE TABLE chain_transactions (
  operation_id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  tx_hash TEXT,
  owner_address TEXT NOT NULL,
  target_address TEXT NOT NULL,
  state TEXT NOT NULL,
  submitted_at TEXT,
  block_number INTEGER,
  block_hash TEXT,
  receipt_status TEXT,
  confirmations INTEGER NOT NULL CHECK (confirmations >= 0),
  replacement_tx_hash TEXT,
  canonical INTEGER NOT NULL CHECK (canonical IN (0, 1)),
  reconciled INTEGER NOT NULL CHECK (reconciled IN (0, 1)),
  confirmed_at TEXT,
  error_code TEXT
);
CREATE UNIQUE INDEX one_operation_per_chain_transaction
  ON chain_transactions (chain_id, tx_hash)
  WHERE tx_hash IS NOT NULL;

CREATE TABLE chain_events (
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL CHECK (log_index >= 0),
  transaction_index INTEGER NOT NULL CHECK (transaction_index >= 0),
  contract_address TEXT NOT NULL,
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  block_hash TEXT NOT NULL,
  data TEXT NOT NULL,
  topics_json TEXT NOT NULL,
  event_signature TEXT NOT NULL,
  event_name TEXT NOT NULL,
  normalized_json TEXT NOT NULL,
  canonical INTEGER NOT NULL CHECK (canonical IN (0, 1)),
  PRIMARY KEY (chain_id, tx_hash, log_index)
);
CREATE INDEX canonical_chain_event_order
  ON chain_events (chain_id, contract_address, canonical, block_number, transaction_index, log_index);

CREATE TABLE product_projections (
  chain_id INTEGER NOT NULL,
  owner_address TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  projection_key TEXT NOT NULL,
  block_number INTEGER NOT NULL CHECK (block_number >= 0),
  block_hash TEXT NOT NULL,
  state_json TEXT NOT NULL,
  PRIMARY KEY (chain_id, owner_address, contract_address, projection_key)
);

PRAGMA user_version = 1;
