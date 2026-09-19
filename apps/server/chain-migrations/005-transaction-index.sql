ALTER TABLE chain_transactions
  ADD COLUMN transaction_index INTEGER CHECK (transaction_index >= 0);

PRAGMA user_version = 5;
