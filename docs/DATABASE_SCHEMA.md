# Database Schema Documentation

## Overview

This application uses **Supabase** (PostgreSQL) as the backend database. The schema supports a multi-tenant household budgeting application with Row Level Security (RLS) enabled on all tables.

## Database Enums

```sql
CREATE TYPE member_role AS ENUM ('adult', 'child');
CREATE TYPE recurring_frequency AS ENUM ('monthly');
```

**Note:** `recurring_frequency` only supports 'monthly' - this is a limitation if weekly/yearly recurring items are needed.

---

## Tables

### 1. `households`

The root entity - users create households to contain all their budgeting data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `name` | TEXT | NOT NULL | Household name (e.g., "John's Household") |
| `created_by` | UUID | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE | Owner user |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:** None beyond PK
**RLS:** Users can only see/modify their own households (via `created_by = auth.uid()`)

---

### 2. `household_members`

Members of a household (not to be confused with Supabase auth users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `household_id` | UUID | NOT NULL, FK -> households(id) ON DELETE CASCADE | Parent household |
| `name` | TEXT | NOT NULL | Member name (e.g., "Dad", "Mom", "Kid 1") |
| `role` | member_role | NOT NULL, DEFAULT 'adult' | 'adult' or 'child' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:** `idx_household_members_household_id` on `household_id`
**RLS:** Users can only access members in their own households

---

### 3. `accounts`

Financial accounts (checking, credit cards, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `household_id` | UUID | NOT NULL, FK -> households(id) ON DELETE CASCADE | Parent household |
| `name` | TEXT | NOT NULL | Account name (e.g., "Chase Checking") |
| `account_type` | TEXT | NULL | Type: "Checking", "Savings", "Credit Card", etc. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:** `idx_accounts_household_id` on `household_id`
**RLS:** Users can only access accounts in their own households

---

### 4. `categories`

Transaction categories with optional parent/child hierarchy.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `household_id` | UUID | NOT NULL, FK -> households(id) ON DELETE CASCADE | Parent household |
| `name` | TEXT | NOT NULL | Category name (e.g., "Food", "Gas") |
| `parent_category_id` | UUID | NULL, FK -> categories(id) ON DELETE SET NULL | Parent category for subcategories |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_categories_household_id` on `household_id`
- `idx_categories_parent` on `parent_category_id`

**Constraints:** `UNIQUE(household_id, name)` - prevents duplicate category names within a household

**RLS:** Users can only access categories in their own households

---

### 5. `transactions`

The core financial transactions table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `account_id` | UUID | NOT NULL, FK -> accounts(id) ON DELETE CASCADE | Parent account |
| `date` | DATE | NOT NULL | Transaction date |
| `description` | TEXT | NOT NULL | Original description from bank |
| `amount` | DECIMAL(12,2) | NOT NULL | Amount (positive or negative based on account type) |
| `vendor` | TEXT | NULL | Extracted/cleaned vendor name |
| `transaction_hash` | TEXT | NULL | Hash for duplicate detection |
| `category_id` | UUID | NULL, FK -> categories(id) ON DELETE SET NULL | Assigned category |
| `member_id` | UUID | NULL, FK -> household_members(id) ON DELETE SET NULL | Assigned member |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_transactions_account_id` on `account_id`
- `idx_transactions_date` on `date`
- `idx_transactions_category_id` on `category_id`
- `idx_transactions_hash` on `transaction_hash`

**Constraints:** `UNIQUE(account_id, transaction_hash)` - prevents duplicate imports

**RLS:** Users can only access transactions in accounts they own (checked via nested subquery)

---

### 6. `rules`

Auto-categorization rules based on transaction patterns.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `household_id` | UUID | NOT NULL, FK -> households(id) ON DELETE CASCADE | Parent household |
| `pattern` | TEXT | NOT NULL | Pattern to match (substring match against description) |
| `category_id` | UUID | NULL, FK -> categories(id) ON DELETE SET NULL | Category to assign |
| `member_id` | UUID | NULL, FK -> household_members(id) ON DELETE SET NULL | Member to assign |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:** `idx_rules_household_id` on `household_id`
**RLS:** Users can only access rules in their own households

---

### 7. `recurring_items`

Manually defined recurring expenses/subscriptions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Primary key |
| `household_id` | UUID | NOT NULL, FK -> households(id) ON DELETE CASCADE | Parent household |
| `name` | TEXT | NOT NULL | Subscription name (e.g., "Netflix") |
| `amount` | DECIMAL(12,2) | NOT NULL | Expected amount |
| `frequency` | recurring_frequency | NOT NULL, DEFAULT 'monthly' | Currently only 'monthly' |
| `category_id` | UUID | NOT NULL, FK -> categories(id) ON DELETE CASCADE | Assigned category |
| `member_id` | UUID | NULL, FK -> household_members(id) ON DELETE SET NULL | Assigned member |
| `account_id` | UUID | NULL, FK -> accounts(id) ON DELETE SET NULL | Associated account |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:** `idx_recurring_items_household_id` on `household_id`
**RLS:** Users can only access recurring items in their own households

**Note:** This table appears unused in the current application - the app detects recurring transactions algorithmically instead.

---

## Triggers

All tables have auto-update triggers for the `updated_at` column:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Applied to: `households`, `household_members`, `accounts`, `categories`, `transactions`, `rules`, `recurring_items`

---

## Row Level Security (RLS)

All tables have RLS enabled with the following pattern:

- **households:** Direct ownership check (`created_by = auth.uid()`)
- **All other tables:** Nested subquery checking if the record belongs to a household owned by the current user

Example for transactions (nested two levels):
```sql
CREATE POLICY "Users can view transactions in their household"
  ON transactions FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE household_id IN (
        SELECT id FROM households WHERE created_by = auth.uid()
      )
    )
  );
```

---

## Entity Relationship Diagram

```
┌──────────────────┐
│   auth.users     │  (Supabase managed)
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐
│   households     │
└────────┬─────────┘
         │ 1:N (household_id FK)
         ├─────────────────────────────────────────────┐
         ▼                                             ▼
┌──────────────────┐     ┌──────────────────┐   ┌──────────────────┐
│ household_members│     │     accounts     │   │    categories    │◄───┐
└────────┬─────────┘     └────────┬─────────┘   └────────┬─────────┘    │
         │                        │                      │              │
         │                        │ 1:N                  │ Self-ref     │
         │                        ▼                      │ (parent)     │
         │               ┌──────────────────┐            │              │
         └──────────────►│   transactions   │◄───────────┘              │
                         └──────────────────┘                           │
                                                                        │
┌──────────────────┐     ┌──────────────────┐                          │
│      rules       │────►│    (applies to   │                          │
└──────────────────┘     │   categories)    │──────────────────────────┘
                         └──────────────────┘

┌──────────────────┐
│  recurring_items │  (Currently unused - detection is algorithmic)
└──────────────────┘
```

---

## Schema Concerns & Recommendations

### Missing Indexes
1. **`transactions.member_id`** - No index, but frequently filtered/grouped by member
2. **`transactions.vendor`** - No index, but used for recurring detection grouping

### TypeScript Type Drift
The `database.types.ts` file is missing:
- `vendor` field on transactions
- `transaction_hash` field on transactions
- `parent_category_id` field on categories
- `category_id` being nullable in rules

**Recommendation:** Regenerate types using Supabase CLI: `npx supabase gen types typescript`

### Unused Table
- `recurring_items` table is defined but not used - the app uses algorithmic detection instead

### Limited Enum
- `recurring_frequency` only has 'monthly' - may need expansion for weekly/yearly items

### RLS Performance
- Nested subqueries in RLS policies could be slow with large datasets
- Consider materialized views or denormalization for frequently accessed data
