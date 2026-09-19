ALTER TABLE chain_transactions
  ADD COLUMN calldata TEXT;

PRAGMA user_version = 6;
