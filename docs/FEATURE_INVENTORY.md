# Feature Inventory

## Overview

This document catalogs all implemented features, partially implemented features, and user workflows in the household budgeting application.

---

## Fully Implemented Features

### 1. Authentication
**Files:** `src/pages/Login.tsx`, `src/contexts/AuthContext.tsx`

| Capability | Status | Notes |
|------------|--------|-------|
| Email/password sign up | Complete | Uses Supabase Auth |
| Email/password sign in | Complete | Uses Supabase Auth |
| Sign out | Complete | Clears session |
| Session persistence | Complete | Via Supabase |
| Auth state subscription | Complete | Listens to auth changes |
| Protected routes | Complete | Redirects to /login |

**Workflow:**
1. User enters email/password
2. Chooses "Sign Up" or "Sign In"
3. On success, redirected to Dashboard
4. Household auto-created on first login

---

### 2. Household Management
**Files:** `src/hooks/useHousehold.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Auto-create on first login | Complete | Named "{email}'s Household" |
| Default categories on creation | Complete | 10 starter categories |
| Fetch user's household | Complete | Uses oldest if multiple exist |

**Default Categories Created:**
Auto, Home, Sports, Clothing, Food, Subscriptions, Kids, Entertainment, Healthcare, Misc

---

### 3. Account Management
**Files:** `src/pages/Accounts.tsx`, `src/hooks/useAccounts.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Create account | Complete | Name + type (Checking, Savings, Credit Card, etc.) |
| Edit account | Complete | Inline editing |
| Delete account | Complete | With confirmation |
| List accounts | Complete | Shows all household accounts |

**Account Types Supported:**
- Checking
- Savings
- Credit Card
- Investment
- Other

---

### 4. Member Management
**Files:** `src/pages/Members.tsx`, `src/hooks/useMembers.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Add member | Complete | Name + role (adult/child) |
| Edit member | Complete | Inline editing |
| Delete member | Complete | With confirmation |
| List members | Complete | Shows role badges |

---

### 5. Category Management
**Files:** `src/pages/Categories.tsx`, `src/hooks/useCategories.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Create parent category | Complete | |
| Create subcategory | Complete | With parent selection |
| Edit category name | Complete | Inline editing |
| Change parent | Complete | Can move subcategory |
| Delete category | Complete | Warns if has subcategories |
| Smart suggestions | Complete | Keyword-based parent recommendations |
| Duplicate prevention | Complete | Unique per household |

**Hierarchy Display:**
- Parent categories shown with "Parent Category" badge
- Subcategories indented under parents
- Edit form allows changing parent

---

### 6. Transaction Import (CSV)
**Files:** `src/components/transactions/CSVImport.tsx`, `src/hooks/useTransactions.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Upload CSV file | Complete | Via file input |
| Auto-detect columns | Complete | Date, description, amount, card# |
| Manual column mapping | Complete | Dropdown selection |
| Preview before import | Complete | Shows first 5 rows |
| Vendor extraction | Complete | Cleans bank descriptions |
| Duplicate detection | Complete | Hash-based, skips duplicates |
| Auto-categorization | Complete | Applies existing rules |
| Card number rule matching | Complete | Optional column for member assignment |
| Import progress | Complete | Shows count + duplicates skipped |

**CSV Workflow:**
1. Select target account
2. Upload CSV file
3. Map columns (auto-detected)
4. Preview data
5. Import with duplicate handling

---

### 7. Transaction Management
**Files:** `src/pages/Transactions.tsx`, `src/hooks/useTransactions.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| List transactions | Complete | Tabular view |
| Filter by account | Complete | Dropdown filter |
| Filter by category | Complete | Dropdown filter |
| Filter by member | Complete | Dropdown filter |
| Filter by date range | Complete | From/to inputs |
| Filter by amount range | Complete | Min/max inputs |
| Search by description/vendor | Complete | Text search |
| Tab: Unmapped | Complete | Shows uncategorized |
| Tab: Mapped | Complete | Shows categorized |
| Assign category (parent) | Complete | Dropdown |
| Assign subcategory | Complete | Conditional dropdown |
| Assign member | Complete | Dropdown |
| Create rule from transaction | Complete | Auto-applies to matches |
| Delete transaction | Complete | With confirmation |
| Summary totals | Complete | Expenses, credits, net |
| Sticky header | Complete | On scroll |
| Inline "Add New" category | Complete | Modal with suggestions |

---

### 8. Inbox (One-at-a-Time Categorization)
**Files:** `src/pages/Inbox.tsx`

| Capability | Status | Notes |
|------------|--------|-------|
| Progress bar | Complete | Shows position/total |
| Current transaction display | Complete | Date, description, amount |
| Category selection | Complete | Parent + subcategory |
| Member selection | Complete | Optional |
| Create rule checkbox | Complete | Auto-applies to matches |
| Skip button | Complete | Move to next |
| Quick navigation grid | Complete | First 12 transactions |
| Empty state | Complete | "All caught up!" message |

**Workflow:**
1. See current uncategorized transaction
2. Select category (required) and member (optional)
3. Optionally check "Create rule"
4. Click "Categorize & Continue"
5. Rule applied to existing matches
6. Auto-advance to next transaction

---

### 9. Rules Management
**Files:** `src/pages/Rules.tsx`, `src/hooks/useRules.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Create rule | Complete | Pattern + category + member |
| Edit rule | Complete | All fields editable |
| Delete rule | Complete | With confirmation |
| List rules | Complete | Shows pattern, category, member |
| Category/member display | Complete | Shows names, not IDs |

**Rule Matching:**
- Case-insensitive substring match
- Matches against description or card number
- Applied during CSV import

---

### 10. Recurring Transaction Detection
**Files:** `src/pages/Recurring.tsx`, `src/lib/recurringDetection.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| Auto-detect patterns | Complete | Algorithm-based |
| Frequency detection | Complete | Weekly, biweekly, monthly, quarterly, yearly |
| Confidence scoring | Complete | 60%+ threshold |
| Next expected date | Complete | Calculated |
| Overdue indication | Complete | Red highlight |
| Expandable history | Complete | Shows matched transactions |
| Summary stats | Complete | Count, monthly estimate |

**Detection Algorithm:**
- Groups by vendor/description
- Requires 3+ occurrences
- Checks amount variance (15% tolerance)
- Analyzes interval patterns

---

### 11. Dashboard & Analytics
**Files:** `src/pages/Dashboard.tsx`

| Capability | Status | Notes |
|------------|--------|-------|
| Date range filter | Complete | Start/end date |
| Group by selector | Complete | Parent category, subcategory, member, vendor, account |
| Chart type selector | Complete | Bar, pie |
| Summary stats | Complete | Expenses, income, net, count |
| Bar chart | Complete | Custom implementation |
| Pie chart | Complete | CSS conic-gradient |
| Monthly trends | Complete | Bar chart by month |
| Spending by day of week | Complete | Bar chart |
| Transaction insights | Complete | Avg, median, largest, smallest |
| Drill-down modal | Complete | Multi-level exploration |

**Drill-Down Levels:**
1. Start with grouping (e.g., parent category)
2. Drill into subcategories
3. Drill into vendors
4. Shows transaction counts and amounts

---

## Partially Implemented / Incomplete Features

### 1. Analysis Page
**File:** `src/pages/Analysis.tsx`

| Issue | Details |
|-------|---------|
| Status | Exists but empty/minimal - functionality moved to Dashboard |
| Route exists | `/analysis` accessible but shows basic content |

**Recommendation:** Remove route or add unique functionality.

---

### 2. Typed Supabase Client
**Files:** `src/lib/supabase.ts`, `src/lib/database.types.ts`

| Issue | Details |
|-------|---------|
| Types exist | `database.types.ts` defines types |
| Not connected | Client uses untyped `createClient()` |
| Types outdated | Missing vendor, transaction_hash, parent_category_id |

---

### 3. TanStack Query Integration
**Package:** `@tanstack/react-query`

| Issue | Details |
|-------|---------|
| Installed | In package.json |
| Not used | All hooks use useState/useEffect instead |
| No QueryClientProvider | Not in main.tsx |

---

### 4. Recharts Library
**Package:** `recharts`

| Issue | Details |
|-------|---------|
| Installed | In package.json |
| Partially used | Dashboard uses custom CSS charts instead |

---

### 5. recurring_items Table
**Schema:** Defined in database

| Issue | Details |
|-------|---------|
| Table exists | With CRUD columns |
| Never used | Detection is algorithmic, not database-driven |
| No hook | No `useRecurringItems` hook |
| No UI | No manual management interface |

---

### 6. Mobile Navigation
**File:** `src/components/layout/Navigation.tsx`

| Issue | Details |
|-------|---------|
| Desktop only | Uses `hidden sm:` classes |
| No hamburger menu | Mobile users can't navigate |

---

## User Workflows

### Onboarding (New User)
```
1. Open app → redirected to /login
2. Enter email/password → Sign Up
3. Auto-redirected to Dashboard
4. Household auto-created with default categories
5. User should:
   a. Add accounts (/accounts)
   b. Add household members (/members)
   c. Import first CSV (/transactions)
```

### Regular Usage (Returning User)
```
1. Open app → auto-authenticated
2. Check Dashboard for overview
3. If inbox badge shows count:
   a. Go to /inbox
   b. Categorize transactions one by one
   c. Create rules for recurring patterns
4. Import new CSV when bank statement available
```

### Category Organization
```
1. Go to /categories
2. Review existing categories
3. Add parent categories for major spending areas
4. Add subcategories for detailed tracking
5. Use suggestions to avoid duplicates
```

### Finding Subscriptions
```
1. Go to /recurring
2. Review auto-detected patterns
3. Expand to see transaction history
4. Note overdue items (may indicate cancelled subscription)
```

### Spending Analysis
```
1. Go to Dashboard
2. Set date range for analysis period
3. Choose grouping dimension (category, member, etc.)
4. View bar/pie chart
5. Click item to drill down
6. Explore sub-levels
```

---

## Third-Party Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Supabase Auth** | User authentication | Active |
| **Supabase Database** | Data storage | Active |
| **PapaParse** | CSV parsing | Active |
| **Lucide React** | Icons | Minimal use |
| **date-fns** | Date formatting | Minimal use |
| **Recharts** | Charts | Installed, minimal use |

---

## Configuration / Settings

### Environment Variables
```
VITE_SUPABASE_URL      # Supabase project URL
VITE_SUPABASE_ANON_KEY # Supabase anon key
```

### User Settings
- None implemented
- No dark mode toggle
- No currency selection
- No date format preference
- No export functionality

---

## Missing Standard Features

Based on typical budgeting apps, these features are not implemented:

| Feature | Status |
|---------|--------|
| Data export (CSV/PDF) | Not implemented |
| Budget targets/limits | Not implemented |
| Spending alerts | Not implemented |
| Multi-currency support | Not implemented |
| Bank connection (Plaid, etc.) | Not implemented |
| Receipt attachments | Not implemented |
| Notes on transactions | Not implemented |
| Bulk categorization | Not implemented |
| Category merge/rename with history | Not implemented |
| Undo/redo | Not implemented |
| Keyboard shortcuts | Not implemented |
