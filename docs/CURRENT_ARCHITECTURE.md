# Current Architecture Documentation

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend Framework** | React | 19.2 |
| **Language** | TypeScript | 5.9 |
| **Build Tool** | Vite | 7.2 |
| **Styling** | Tailwind CSS | 4.1 |
| **Routing** | React Router DOM | 7.9 |
| **State Management** | React useState/useEffect + TanStack Query (unused) |
| **Backend** | Supabase | 2.81 |
| **Charts** | Recharts | 3.4 (imported but not actively used) |
| **Icons** | Lucide React | 0.553 |
| **CSV Parsing** | PapaParse | 5.5 |
| **Date Handling** | date-fns | 4.1 (imported but minimally used) |
| **Utilities** | clsx, tailwind-merge, class-variance-authority |

---

## Project Structure

```
household_budeting_app/
├── public/                    # Static assets
├── src/
│   ├── assets/               # Images, SVGs
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx        # Main layout wrapper with <Outlet>
│   │   │   └── Navigation.tsx    # Top navigation bar
│   │   ├── transactions/
│   │   │   └── CSVImport.tsx     # Multi-step CSV import wizard
│   │   └── ProtectedRoute.tsx    # Auth guard component
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication state & methods
│   ├── hooks/
│   │   ├── useAccounts.ts        # Account CRUD operations
│   │   ├── useCategories.ts      # Category CRUD with hierarchy
│   │   ├── useHousehold.ts       # Household initialization
│   │   ├── useMembers.ts         # Member CRUD operations
│   │   ├── useRules.ts           # Rule CRUD operations
│   │   └── useTransactions.ts    # Transaction CRUD & import
│   ├── lib/
│   │   ├── categorySuggestions.ts  # Keyword-based category suggestions
│   │   ├── database.types.ts       # Supabase type definitions
│   │   ├── recurringDetection.ts   # Algorithmic recurring detection
│   │   ├── supabase.ts             # Supabase client initialization
│   │   ├── transactionUtils.ts     # Income/expense classification
│   │   ├── utils.ts                # General utilities (cn function)
│   │   └── vendorExtraction.ts     # Clean vendor name extraction
│   ├── pages/
│   │   ├── Accounts.tsx          # Account management
│   │   ├── Analysis.tsx          # Financial analysis (empty/minimal)
│   │   ├── Categories.tsx        # Category management
│   │   ├── Dashboard.tsx         # Main dashboard with charts
│   │   ├── Inbox.tsx             # One-at-a-time categorization
│   │   ├── Login.tsx             # Authentication page
│   │   ├── Members.tsx           # Household member management
│   │   ├── Recurring.tsx         # Auto-detected recurring transactions
│   │   ├── Rules.tsx             # Auto-categorization rules
│   │   └── Transactions.tsx      # Transaction list & management
│   ├── App.tsx                   # Route definitions
│   ├── App.css                   # Global styles
│   ├── index.css                 # Tailwind imports
│   └── main.tsx                  # Application entry point
├── scripts/
│   └── seed-categories.js        # Category seeding script
├── docs/                         # Documentation (this folder)
├── supabase-schema.sql           # Initial database schema
├── database-updates.sql          # Schema migrations
├── seed-categories.sql           # Category seed data
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind config (implicit in v4)
└── package.json                  # Dependencies
```

---

## Routing Structure

```tsx
// src/App.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route index element={<Dashboard />} />
    <Route path="members" element={<Members />} />
    <Route path="accounts" element={<Accounts />} />
    <Route path="categories" element={<Categories />} />
    <Route path="rules" element={<Rules />} />
    <Route path="transactions" element={<Transactions />} />
    <Route path="inbox" element={<Inbox />} />
    <Route path="recurring" element={<Recurring />} />
    <Route path="analysis" element={<Analysis />} />
  </Route>
</Routes>
```

**Protected Routes:** All routes except `/login` are wrapped in `ProtectedRoute`, which redirects unauthenticated users to login.

**Layout Pattern:** Uses React Router's nested routes with `<Outlet>` in `Layout.tsx` for consistent navigation.

---

## Component Hierarchy

```
main.tsx
└── StrictMode
    └── BrowserRouter
        └── AuthProvider (Context)
            └── App
                ├── Login (unprotected)
                └── ProtectedRoute
                    └── Layout
                        ├── Navigation
                        └── Outlet (page content)
                            ├── Dashboard
                            ├── Members
                            ├── Accounts
                            ├── Categories
                            ├── Rules
                            ├── Transactions
                            │   └── CSVImport
                            ├── Inbox
                            ├── Recurring
                            └── Analysis
```

---

## State Management Patterns

### 1. Authentication State (Context)
**File:** `src/contexts/AuthContext.tsx`

```tsx
const AuthContext = createContext<{
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email, password) => Promise<{ error }>
  signIn: (email, password) => Promise<{ error }>
  signOut: () => Promise<void>
}>()
```

- Wraps entire app in `AuthProvider`
- Listens to Supabase auth state changes
- Exposes `useAuth()` hook

### 2. Data Fetching (Custom Hooks)
**Pattern:** Each entity has a custom hook following this structure:

```tsx
function useEntity() {
  const { household } = useHousehold()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch data from Supabase
    // Filter by household_id
  }, [household])

  const add = async (...) => { /* insert + update state */ }
  const update = async (...) => { /* update + update state */ }
  const delete = async (...) => { /* delete + update state */ }
  const refetch = async () => { /* re-query */ }

  return { data, loading, error, add, update, delete, refetch }
}
```

**Available Hooks:**
| Hook | Entity | Notes |
|------|--------|-------|
| `useHousehold` | households | Auto-creates household on first login |
| `useAccounts` | accounts | CRUD operations |
| `useCategories` | categories | Includes hierarchy helpers |
| `useMembers` | household_members | CRUD operations |
| `useRules` | rules | CRUD operations |
| `useTransactions` | transactions | Includes CSV import logic |

### 3. Local Component State
Most page components use `useState` for:
- Form data
- UI state (modals, tabs, filters)
- Derived/computed values via `useMemo`

### 4. TanStack Query (Installed but Unused)
`@tanstack/react-query` is installed but not utilized. All data fetching uses custom hooks with `useState`/`useEffect`.

---

## Data Flow

### User Authentication
```
User → Login.tsx → supabase.auth.signInWithPassword()
                 → AuthContext updates user/session
                 → ProtectedRoute allows access
                 → useHousehold creates/fetches household
```

### Transaction Import
```
CSV File → CSVImport.tsx → PapaParse
                        → Column mapping UI
                        → vendorExtraction.extractVendor()
                        → vendorExtraction.createTransactionHash()
                        → Rule matching for auto-categorization
                        → useTransactions.importTransactions()
                        → Supabase insert
```

### Transaction Categorization
```
User → Transactions.tsx or Inbox.tsx
     → Select category/member
     → useTransactions.updateTransaction()
     → Optionally create rule via useRules.addRule()
     → Apply rule to existing uncategorized matches
```

---

## API Integration Patterns

### Supabase Client Setup
**File:** `src/lib/supabase.ts`
```tsx
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**Note:** Client is untyped - `database.types.ts` exists but isn't used with the client.

### Query Patterns

**Simple fetch:**
```tsx
const { data, error } = await supabase
  .from('accounts')
  .select('*')
  .eq('household_id', household.id)
  .order('created_at', { ascending: true })
```

**Join fetch:**
```tsx
const { data, error } = await supabase
  .from('transactions')
  .select(`
    *,
    account:accounts(id, name, account_type),
    category:categories(id, name),
    member:household_members(id, name)
  `)
```

**Self-join (categories with parent):**
```tsx
const { data, error } = await supabase
  .from('categories')
  .select(`
    *,
    parent:categories!parent_category_id(id, name)
  `)
```

---

## Build Configuration

### Vite Config (`vite.config.ts`)
```tsx
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- Uses `@/` alias for clean imports
- React plugin for JSX transformation

### TypeScript Config
- Strict mode enabled
- ES2020+ target
- DOM lib included
- Path aliases configured

### NPM Scripts
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "seed:categories": "node scripts/seed-categories.js"
}
```

---

## Key Utility Functions

### `src/lib/transactionUtils.ts`
```tsx
isExpense(transaction)  // Determines if tx is expense based on account type
isIncome(transaction)   // Determines if tx is income
```
- Credit cards: positive = expense, negative = refund
- Bank accounts: negative = expense, positive = income

### `src/lib/vendorExtraction.ts`
```tsx
extractVendor(description)        // Clean up bank descriptions
createTransactionHash(date, desc, amount, accountId)  // Duplicate detection
```

### `src/lib/categorySuggestions.ts`
```tsx
suggestCategory(input)    // Single best match
suggestCategories(input, limit)  // Multiple suggestions
getCategoryExamples(categoryName)  // Keywords for a category
```

### `src/lib/recurringDetection.ts`
```tsx
detectRecurringTransactions(transactions)  // Find patterns
isOverdue(nextExpectedDate)
getDaysUntil(nextExpectedDate)
```

---

## Styling Architecture

### Tailwind CSS v4
- Uses `@tailwindcss/postcss` plugin
- Utility-first CSS with inline classes
- No separate component CSS files (except `App.css`)

### Class Utilities
**File:** `src/lib/utils.ts`
```tsx
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
Used for conditional class merging (though rarely used in current code).

### Common Patterns
```tsx
// Card/container
<div className="bg-white rounded-lg shadow p-6">

// Form input
<input className="w-full px-3 py-2 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500" />

// Primary button
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">

// Status badges
<span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
```

---

## Performance Considerations

### Current Optimizations
1. **`useMemo`** used for computed/filtered data in Dashboard, Transactions
2. **Sticky headers** on transaction tables
3. **Conditional rendering** for modals/filters

### Potential Issues
1. No data pagination - all transactions fetched at once
2. Multiple Supabase queries per page load (no query batching)
3. `useTransactions` fetched in Navigation for badge count (every page)
4. No request caching (TanStack Query available but unused)
