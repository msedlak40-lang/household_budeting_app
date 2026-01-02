# Pain Points & Technical Debt

## Overview

This document identifies technical debt, code quality issues, performance concerns, and areas needing improvement in the household budgeting application.

---

## Critical Issues

### 1. TypeScript Types Out of Sync with Database

**Severity:** High
**Files:** `src/lib/database.types.ts`

**Problem:**
The TypeScript types don't match the actual database schema after migrations.

**Missing fields:**
```typescript
// transactions table - missing:
vendor: string | null
transaction_hash: string | null

// categories table - missing:
parent_category_id: string | null

// rules table - incorrect:
category_id: string  // Should be string | null (nullable per database-updates.sql)
```

**Impact:**
- No type safety on Supabase queries
- IDE autocomplete incomplete
- Runtime errors possible

**Fix:**
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

Then use typed client:
```typescript
import { Database } from '@/lib/database.types'
export const supabase = createClient<Database>(url, key)
```

---

### 2. No Data Pagination

**Severity:** High
**Files:** All hooks (`useTransactions.ts`, etc.)

**Problem:**
All data is fetched at once with no pagination or virtualization.

**Current code:**
```typescript
// useTransactions.ts:39
const { data, error } = await query  // Fetches ALL transactions
```

**Impact:**
- Performance degrades with large datasets
- Memory issues on mobile devices
- Slow initial page loads

**Recommendation:**
- Implement cursor-based pagination
- Add virtual scrolling for lists (react-virtual)
- Lazy-load on scroll

---

### 3. No Error Boundaries

**Severity:** High
**Files:** None exist

**Problem:**
No React error boundaries to catch component crashes.

**Impact:**
- Unhandled errors crash entire app
- Users lose work with no recovery option
- No error logging/reporting

**Fix:**
Add error boundary components:
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) { ... }
  componentDidCatch(error, info) { ... }
}
```

---

## Performance Issues

### 4. Navigation Fetches All Transactions

**Severity:** Medium
**File:** `src/components/layout/Navigation.tsx:21`

**Problem:**
```typescript
const { transactions } = useTransactions()
const uncategorizedCount = transactions.filter(t => !t.category_id).length
```

Navigation component fetches ALL transactions just for badge count.

**Impact:**
- Every page load fetches full transaction list
- Unnecessary Supabase calls
- Badge causes full re-render on any transaction change

**Fix:**
Create dedicated hook or server-side count:
```typescript
// Option 1: Dedicated hook
const { uncategorizedCount } = useUncategorizedCount()

// Option 2: Supabase RPC
const { count } = await supabase.rpc('get_uncategorized_count')
```

---

### 5. Duplicate Data Fetching

**Severity:** Medium
**Files:** Multiple pages

**Problem:**
Multiple hooks call Supabase independently:
- `useHousehold` → fetches household
- `useAccounts` → fetches accounts
- `useCategories` → fetches categories
- `useMembers` → fetches members

Each page using multiple hooks makes 4+ separate API calls.

**Impact:**
- Slow page loads
- Wasted bandwidth
- Rate limiting risk

**Fix Options:**
1. Use TanStack Query (already installed) with caching
2. Create composite loader for common data
3. Implement React context for shared data

---

### 6. No Request Caching

**Severity:** Medium
**Files:** All hooks

**Problem:**
TanStack Query is installed but not used. All hooks use plain `useState`/`useEffect`.

**Current pattern:**
```typescript
useEffect(() => {
  const fetch = async () => { ... }
  fetch()
}, [dependency])
```

**Impact:**
- Same data re-fetched on every navigation
- No stale-while-revalidate
- No background refresh

---

### 7. Heavy Dashboard Component

**Severity:** Medium
**File:** `src/pages/Dashboard.tsx` (784 lines)

**Problem:**
Dashboard is a monolithic component with:
- 6 `useMemo` calculations
- Multiple chart implementations inline
- Drill-down modal inline
- All rendering logic in one file

**Impact:**
- Hard to maintain
- Slow initial render
- Full re-render on any state change

**Recommendation:**
Extract into components:
- `<SummaryStats />`
- `<GroupedBarChart />`
- `<GroupedPieChart />`
- `<MonthlyTrends />`
- `<SpendingByDay />`
- `<TransactionInsights />`
- `<DrillDownModal />`

---

## Code Quality Issues

### 8. Inconsistent Error Handling

**Severity:** Medium
**Files:** All hooks

**Problem:**
Error handling varies across hooks:

```typescript
// Some hooks return error:
return { error: err.message }

// Some hooks throw:
if (error) throw error

// Some use console.error:
console.error('[useRules] Error:', error)

// Some use alert():
alert(`Error: ${error}`)
```

**Recommendation:**
Standardize error handling:
1. All mutations return `{ error: string | null }`
2. Use toast notifications instead of alerts
3. Create centralized error handler

---

### 9. Console Logs in Production Code

**Severity:** Low
**Files:** Multiple hooks and components

**Example locations:**
```typescript
// useHousehold.ts:22
console.log('[useHousehold] No user found')

// useTransactions.ts:151
console.log('[useTransactions] Inserting transactions...')

// CSVImport.tsx:199
console.log('[CSVImport] Importing transactions...')
```

**Impact:**
- Leaks internal details to users
- Performance overhead
- Cluttered browser console

**Fix:**
Remove or use conditional logging:
```typescript
const isDev = import.meta.env.DEV
if (isDev) console.log(...)
```

---

### 10. Code Duplication in Hooks

**Severity:** Low
**Files:** All entity hooks

**Problem:**
Each hook has identical patterns:

```typescript
// Repeated in every hook:
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  if (!household) { setLoading(false); return }
  // fetch...
}, [household])
```

**Fix:**
Create generic hook factory or use TanStack Query:
```typescript
function useEntityQuery<T>(table: string, filter: object) {
  return useQuery({
    queryKey: [table, filter],
    queryFn: () => supabase.from(table).select('*').match(filter)
  })
}
```

---

### 11. Inconsistent Import Paths

**Severity:** Low
**Files:** Various

**Problem:**
Mixed usage of alias and relative imports:

```typescript
// useRules.ts uses relative:
import { supabase } from '../lib/supabase'

// Most others use alias:
import { supabase } from '@/lib/supabase'
```

**Fix:**
Standardize to `@/` alias everywhere.

---

## Unused Dependencies

### 12. TanStack Query Not Used

**Package:** `@tanstack/react-query`

**Status:** Installed in `package.json`, never imported.

**Recommendation:** Either:
- Remove from dependencies
- Migrate data fetching to use it

---

### 13. Recharts Underutilized

**Package:** `recharts`

**Status:** Installed but Dashboard uses custom CSS charts.

**Recommendation:** Either:
- Use Recharts for proper charts (tooltips, legends, responsive)
- Remove if custom implementation preferred

---

### 14. date-fns Minimal Use

**Package:** `date-fns`

**Status:** Installed, imported nowhere. Native `Date` methods used.

**Recommendation:** Either:
- Adopt for date formatting/manipulation
- Remove from dependencies

---

## Missing Features (Technical Debt)

### 15. No Mobile Navigation

**File:** `src/components/layout/Navigation.tsx`

**Problem:**
```tsx
<div className="hidden sm:ml-6 sm:flex sm:space-x-4">
  {/* Nav items hidden on mobile */}
</div>
```

Mobile users cannot navigate the app.

**Fix:**
Add hamburger menu with slide-out drawer.

---

### 16. No Loading States for Mutations

**Severity:** Low
**Files:** Various pages

**Problem:**
Most CRUD operations don't show loading state:
```typescript
const handleDelete = async (id) => {
  // No loading indicator while deleting
  const { error } = await deleteCategory(id)
}
```

**Impact:**
- Users may double-click
- No feedback during slow operations

---

### 17. No Optimistic Updates

**Severity:** Low
**Files:** All hooks

**Problem:**
UI waits for server response before updating:
```typescript
const { error } = await supabase.from('categories').delete()
if (!error) {
  setCategories(categories.filter(c => c.id !== id))
}
```

**Impact:**
- Perceived slowness
- UI feels unresponsive

---

### 18. No Form Validation Library

**Severity:** Low
**Files:** All pages with forms

**Problem:**
Validation is manual and inconsistent:
```typescript
if (!formData.name.trim()) {
  setFormError('Name is required')
  return
}
```

**Recommendation:**
Use react-hook-form + zod for consistent validation.

---

## Security Considerations

### 19. No Rate Limiting Awareness

**Problem:**
No client-side throttling or debouncing on rapid actions.

**Risk:**
- Users could spam API
- Supabase rate limits hit

---

### 20. Alert for Sensitive Operations

**Problem:**
```typescript
// Uses browser alert for confirmations
if (confirm('Delete this item?')) { ... }
```

**Issues:**
- Can be bypassed programmatically
- Poor UX
- Not accessible

**Fix:**
Use custom modal component with proper confirmation flow.

---

## Testing Gaps

### 21. No Tests

**Severity:** High

**Problem:**
No test files exist:
- No unit tests
- No integration tests
- No E2E tests

**Directories missing:**
- `src/__tests__/`
- `cypress/` or `playwright/`

**Impact:**
- Regressions undetected
- Refactoring risky
- No CI/CD quality gates

---

## Documentation Gaps

### 22. No Inline Documentation

**Problem:**
Only `categorySuggestions.ts` has JSDoc comments. Most functions undocumented.

**Example of missing docs:**
```typescript
// transactionUtils.ts - no docs
export function isExpense(transaction: TransactionWithDetails): boolean {
  // Complex logic without explanation
}
```

---

## Recommended Priority Order

### Immediate (Before New Features)
1. Fix TypeScript types sync with database
2. Add error boundaries
3. Remove console.logs or add dev-only guard

### Short-term
4. Add mobile navigation
5. Implement pagination for transactions
6. Standardize error handling

### Medium-term
7. Migrate to TanStack Query for caching
8. Break up Dashboard into components
9. Add loading states to mutations

### Long-term
10. Add test coverage
11. Implement form validation library
12. Add optimistic updates
