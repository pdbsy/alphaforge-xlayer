ALTER TABLE chain_checkpoints ADD COLUMN projected_block_number INTEGER CHECK (projected_block_number >= 0);
ALTER TABLE chain_checkpoints ADD COLUMN projected_block_hash TEXT;
ALTER TABLE chain_checkpoints ADD COLUMN sync_healthy INTEGER NOT NULL DEFAULT 1 CHECK (sync_healthy IN (0, 1));
ALTER TABLE chain_checkpoints ADD COLUMN sync_error TEXT;

PRAGMA user_version = 2;
