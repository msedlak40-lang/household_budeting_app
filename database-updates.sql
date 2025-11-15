-- =====================================================
-- DATABASE UPDATES FOR NEW FEATURES
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Make category_id optional in rules (if not already done)
ALTER TABLE rules
  ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE rules
  DROP CONSTRAINT IF EXISTS rules_category_id_fkey,
  ADD CONSTRAINT rules_category_id_fkey
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE SET NULL;

-- 2. Add vendor field to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS vendor TEXT;

-- 3. Add transaction_hash for duplicate prevention
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transaction_hash TEXT;

-- Create index for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_transactions_hash
  ON transactions(transaction_hash);

-- 4. Add parent_category_id for subcategories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for subcategory queries
CREATE INDEX IF NOT EXISTS idx_categories_parent
  ON categories(parent_category_id);

-- 5. Add unique constraint for transaction hash to prevent duplicates
-- Note: This will only prevent exact duplicates within the same account
ALTER TABLE transactions
  ADD CONSTRAINT unique_transaction_hash
    UNIQUE (account_id, transaction_hash);

-- =====================================================
-- COMPLETED!
-- =====================================================
-- Your database is now ready for the new features
