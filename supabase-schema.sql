-- =====================================================
-- HOUSEHOLD BUDGETING APP - DATABASE SCHEMA
-- =====================================================
-- This schema creates all tables, RLS policies, and triggers
-- Run this in your Supabase SQL Editor after creating your project
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE member_role AS ENUM ('adult', 'child');
CREATE TYPE recurring_frequency AS ENUM ('monthly');

-- =====================================================
-- TABLES
-- =====================================================

-- Households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Household members table
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role member_role NOT NULL DEFAULT 'adult',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rules table (for auto-categorization)
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recurring items table (subscriptions and recurring expenses)
CREATE TABLE recurring_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly',
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES (for performance)
-- =====================================================

CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_accounts_household_id ON accounts(household_id);
CREATE INDEX idx_categories_household_id ON categories(household_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_rules_household_id ON rules(household_id);
CREATE INDEX idx_recurring_items_household_id ON recurring_items(household_id);

-- =====================================================
-- TRIGGERS (auto-update updated_at timestamp)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_members_updated_at BEFORE UPDATE ON household_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_items_updated_at BEFORE UPDATE ON recurring_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HOUSEHOLDS POLICIES
-- =====================================================

-- Users can see households they created
CREATE POLICY "Users can view their own households"
  ON households FOR SELECT
  USING (auth.uid() = created_by);

-- Users can insert their own households
CREATE POLICY "Users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own households
CREATE POLICY "Users can update their own households"
  ON households FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own households
CREATE POLICY "Users can delete their own households"
  ON households FOR DELETE
  USING (auth.uid() = created_by);

-- =====================================================
-- HOUSEHOLD MEMBERS POLICIES
-- =====================================================

CREATE POLICY "Users can view members of their household"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create members in their household"
  ON household_members FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update members in their household"
  ON household_members FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete members in their household"
  ON household_members FOR DELETE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

-- =====================================================
-- ACCOUNTS POLICIES
-- =====================================================

CREATE POLICY "Users can view accounts in their household"
  ON accounts FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create accounts in their household"
  ON accounts FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update accounts in their household"
  ON accounts FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete accounts in their household"
  ON accounts FOR DELETE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

-- =====================================================
-- CATEGORIES POLICIES
-- =====================================================

CREATE POLICY "Users can view categories in their household"
  ON categories FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create categories in their household"
  ON categories FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update categories in their household"
  ON categories FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories in their household"
  ON categories FOR DELETE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view transactions in their household"
  ON transactions FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE household_id IN (
        SELECT id FROM households WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create transactions in their household"
  ON transactions FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM accounts WHERE household_id IN (
        SELECT id FROM households WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update transactions in their household"
  ON transactions FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE household_id IN (
        SELECT id FROM households WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete transactions in their household"
  ON transactions FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE household_id IN (
        SELECT id FROM households WHERE created_by = auth.uid()
      )
    )
  );

-- =====================================================
-- RULES POLICIES
-- =====================================================

CREATE POLICY "Users can view rules in their household"
  ON rules FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create rules in their household"
  ON rules FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update rules in their household"
  ON rules FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete rules in their household"
  ON rules FOR DELETE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

-- =====================================================
-- RECURRING ITEMS POLICIES
-- =====================================================

CREATE POLICY "Users can view recurring items in their household"
  ON recurring_items FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring items in their household"
  ON recurring_items FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update recurring items in their household"
  ON recurring_items FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete recurring items in their household"
  ON recurring_items FOR DELETE
  USING (
    household_id IN (
      SELECT id FROM households WHERE created_by = auth.uid()
    )
  );

-- =====================================================
-- DEFAULT DATA
-- =====================================================
-- You can optionally add default categories here
-- These would be created per household when a household is created
-- For now, we'll handle this in the application code

-- =====================================================
-- COMPLETED!
-- =====================================================
-- Your database schema is ready!
-- Next steps:
-- 1. Copy your Supabase URL and Anon Key
-- 2. Add them to your .env.local file
-- 3. Test the connection
