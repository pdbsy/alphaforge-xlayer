CREATE TABLE chain_sync_leases (
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  owner_token TEXT NOT NULL,
  target_block_number INTEGER NOT NULL CHECK (target_block_number >= 0),
  PRIMARY KEY (chain_id, contract_address)
);

PRAGMA user_version = 4;
