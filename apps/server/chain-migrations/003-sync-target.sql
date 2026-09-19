ALTER TABLE chain_checkpoints ADD COLUMN sync_target_block_number INTEGER CHECK (sync_target_block_number >= 0);

PRAGMA user_version = 3;
