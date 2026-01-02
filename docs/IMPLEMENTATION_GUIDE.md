# Implementation Guide - Priority Fixes

## Overview

This guide provides step-by-step instructions for implementing 3 critical fixes:
1. ✅ Fix TypeScript types sync with database
2. ✅ Fix Inbox categorization save behavior  
3. ✅ Implement vendor normalization system

**Estimated time:** 3-4 hours total

---

## TASK 1: Fix TypeScript Types Sync

**Priority:** CRITICAL  
**Time:** 15 minutes  
**Impact:** Prevents type safety issues across entire app

### Problem
`src/lib/database.types.ts` is missing fields that exist in the database:
- `transactions.vendor`
- `transactions.transaction_hash`  
- `categories.parent_category_id`

### Solution

#### Step 1: Regenerate Types from Supabase

```bash
# Get your Supabase project ID from .env
# VITE_SUPABASE_URL format: https://[PROJECT_ID].supabase.co

npx supabase gen types typescript --project-id [YOUR_PROJECT_ID] > src/lib/database.types.ts
```

**Alternative if you don't have project ID handy:**
Visit your Supabase project dashboard → Settings → API → Project URL

#### Step 2: Update Supabase Client to Use Types

**File:** `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'  // ADD THIS

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(  // ADD <Database>
  supabaseUrl,
  supabaseAnonKey
)
```

#### Step 3: Verify Types Work

Check that IDE autocomplete now shows:
- `transactions` has `vendor` and `transaction_hash`
- `categories` has `parent_category_id`

**Testing:**
```typescript
// This should have full autocomplete
const { data } = await supabase
  .from('transactions')
  .select('id, vendor, transaction_hash')  // Should autocomplete
```

---

## TASK 2: Fix Inbox Categorization Save Behavior

**Priority:** HIGH  
**Time:** 30 minutes  
**Impact:** Improves daily UX - eliminates double-saves

### Problem
Current flow:
1. User selects parent category → **SAVES**
2. User selects subcategory → **SAVES AGAIN**
3. User selects member → **SAVES AGAIN**

This creates 3 database writes and intermediate states.

### Solution

**File:** `src/pages/Inbox.tsx`

#### Step 1: Add Local State for Form

```typescript
// Find the categorizeTransaction function (around line 100)

// ADD NEW STATE at top of component
const [categoryForm, setCategoryForm] = useState({
  parentCategoryId: '',
  subcategoryId: '',
  memberId: '',
  createRule: false
})

// REPLACE the existing categorizeTransaction function with:
const categorizeTransaction = async () => {
  if (!currentTransaction) return
  
  // Validation: require at least parent category
  if (!categoryForm.parentCategoryId) {
    alert('Please select a category')
    return
  }
  
  // Determine final category (subcategory if selected, else parent)
  const finalCategoryId = categoryForm.subcategoryId || categoryForm.parentCategoryId
  
  // Single save with all data
  const { error: updateError } = await updateTransaction(
    currentTransaction.id,
    {
      category_id: finalCategoryId,
      member_id: categoryForm.memberId || null
    }
  )
  
  if (updateError) {
    alert(`Error: ${updateError}`)
    return
  }
  
  // Create rule if requested
  if (categoryForm.createRule) {
    const pattern = currentTransaction.vendor || currentTransaction.description
    const { error: ruleError } = await addRule({
      pattern,
      category_id: finalCategoryId,
      member_id: categoryForm.memberId || null
    })
    
    if (ruleError) {
      console.error('Failed to create rule:', ruleError)
    } else {
      // Apply rule to existing uncategorized transactions
      await applyRuleToExisting(
        pattern,
        finalCategoryId,
        categoryForm.memberId || null
      )
    }
  }
  
  // Reset form and move to next
  setCategoryForm({
    parentCategoryId: '',
    subcategoryId: '',
    memberId: '',
    createRule: false
  })
  
  nextTransaction()
}
```

#### Step 2: Update Form Inputs to Use Local State

Find the category selection dropdowns and update them:

```typescript
// PARENT CATEGORY DROPDOWN
<select
  value={categoryForm.parentCategoryId}  // CHANGE from currentTransaction.category_id
  onChange={(e) => setCategoryForm(prev => ({
    ...prev,
    parentCategoryId: e.target.value,
    subcategoryId: '' // Reset subcategory when parent changes
  }))}
  className="..."
>
  <option value="">Select category...</option>
  {parentCategories.map(cat => (
    <option key={cat.id} value={cat.id}>{cat.name}</option>
  ))}
</select>

// SUBCATEGORY DROPDOWN (if parent selected)
{categoryForm.parentCategoryId && (
  <select
    value={categoryForm.subcategoryId}
    onChange={(e) => setCategoryForm(prev => ({
      ...prev,
      subcategoryId: e.target.value
    }))}
    className="..."
  >
    <option value="">No subcategory</option>
    {subcategories.map(cat => (
      <option key={cat.id} value={cat.id}>{cat.name}</option>
    ))}
  </select>
)}

// MEMBER DROPDOWN
<select
  value={categoryForm.memberId}
  onChange={(e) => setCategoryForm(prev => ({
    ...prev,
    memberId: e.target.value
  }))}
  className="..."
>
  <option value="">No member</option>
  {members.map(member => (
    <option key={member.id} value={member.id}>{member.name}</option>
  ))}
</select>

// CREATE RULE CHECKBOX
<input
  type="checkbox"
  checked={categoryForm.createRule}
  onChange={(e) => setCategoryForm(prev => ({
    ...prev,
    createRule: e.target.checked
  }))}
/>
```

#### Step 3: Update Skip Button

```typescript
const skipTransaction = () => {
  // Reset form
  setCategoryForm({
    parentCategoryId: '',
    subcategoryId: '',
    memberId: '',
    createRule: false
  })
  
  nextTransaction()
}
```

#### Step 4: Reset Form When Transaction Changes

Add useEffect to reset form when moving to new transaction:

```typescript
// ADD THIS EFFECT
useEffect(() => {
  if (currentTransaction) {
    // Reset form for new transaction
    setCategoryForm({
      parentCategoryId: '',
      subcategoryId: '',
      memberId: '',
      createRule: false
    })
  }
}, [currentTransaction?.id])  // Re-run when transaction changes
```

### Testing Task 2

1. Go to /inbox
2. Select parent category → **Should NOT save yet**
3. Select subcategory → **Should NOT save yet**
4. Select member → **Should NOT save yet**
5. Click "Categorize & Continue" → **Should save once**
6. Verify transaction was saved with correct category and member

---

## TASK 3: Implement Vendor Normalization

**Priority:** HIGH  
**Time:** 2-3 hours  
**Impact:** Transforms analytics accuracy and recurring detection

### Phase 3A: Database Schema Changes

#### Step 1: Create Migration File

**File:** `database-vendor-normalization.sql`

```sql
-- Migration: Add vendor normalization support
-- Date: 2026-01-02
-- Description: Adds normalized_vendor and vendor_override columns for cleaner analytics

BEGIN;

-- Add normalized vendor column (auto-generated)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS normalized_vendor TEXT;

-- Add vendor override column (user-defined)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS vendor_override TEXT;

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_transactions_normalized_vendor 
ON transactions(normalized_vendor);

CREATE INDEX IF NOT EXISTS idx_transactions_vendor_override 
ON transactions(vendor_override);

-- Add missing performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_member_id 
ON transactions(member_id);

CREATE INDEX IF NOT EXISTS idx_transactions_vendor 
ON transactions(vendor);

-- Add column comments
COMMENT ON COLUMN transactions.normalized_vendor IS 
'Auto-generated normalized vendor name using pattern rules (e.g., AMAZON MKTPL*CODE → Amazon)';

COMMENT ON COLUMN transactions.vendor_override IS 
'User-defined override for vendor display name (takes precedence over normalized_vendor)';

COMMIT;

-- Rollback SQL (for reference only, do not execute):
-- DROP INDEX IF EXISTS idx_transactions_normalized_vendor;
-- DROP INDEX IF EXISTS idx_transactions_vendor_override;
-- DROP INDEX IF EXISTS idx_transactions_member_id;
-- DROP INDEX IF EXISTS idx_transactions_vendor;
-- ALTER TABLE transactions DROP COLUMN IF EXISTS normalized_vendor;
-- ALTER TABLE transactions DROP COLUMN IF EXISTS vendor_override;
```

#### Step 2: Run Migration

Execute this SQL in Supabase:
1. Go to Supabase Dashboard → SQL Editor
2. Paste the migration SQL
3. Run it
4. Verify: Go to Database → Tables → transactions → verify new columns exist

#### Step 3: Regenerate Types

```bash
npx supabase gen types typescript --project-id [YOUR_PROJECT_ID] > src/lib/database.types.ts
```

### Phase 3B: Create Normalization Library

#### Step 1: Create Normalization Rules File

**File:** `src/lib/vendorNormalization.ts`

```typescript
/**
 * Vendor Normalization Library
 * 
 * Normalizes vendor names by removing store numbers, location codes,
 * and payment processor prefixes to enable better analytics and grouping.
 */

export interface NormalizedVendor {
  original: string       // Original description
  vendor: string        // Extracted vendor (existing logic)
  normalized: string    // Normalized vendor name
}

// Pattern-based normalization rules
const PATTERN_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Amazon marketplace codes
  { pattern: /AMAZON\s+MKTPL?\*[A-Z0-9]+/gi, replacement: 'Amazon' },
  { pattern: /AMAZON\s+MKTPLACE\s+PMTS/gi, replacement: 'Amazon' },
  
  // Payment processor prefixes
  { pattern: /^SQ\s*\*/i, replacement: '' },
  { pattern: /^TST\*/i, replacement: '' },
  { pattern: /^SP\s+/i, replacement: '' },
  { pattern: /^FSP\*/i, replacement: '' },
  { pattern: /^PAR\*/i, replacement: '' },
  { pattern: /^PY\s*\*/i, replacement: '' },
  { pattern: /^JFI\*/i, replacement: '' },
  { pattern: /^SPI\*/i, replacement: '' },
  { pattern: /^BRZ\*/i, replacement: '' },
  { pattern: /^SC\*/i, replacement: '' },
  { pattern: /^WWP\*/i, replacement: '' },
  
  // Store numbers and codes (trailing)
  { pattern: /\s+#?\d{4,8}$/g, replacement: '' },
  { pattern: /\s+[FT]\d{4,6}$/g, replacement: '' },  // McDonald's F13642, Taco Bell T034391
  
  // Location qualifiers
  { pattern: /\s+(OVERLAND\s+PARK|LEAWOOD|PRAIRIE\s+FIRE).*$/gi, replacement: '' },
  { pattern: /\s+(OUTSIDE|POS)$/gi, replacement: '' },
  { pattern: /\s+-\s+(WYANDOTTE|ROYAL).*$/gi, replacement: '' },
  
  // Business type suffixes
  { pattern: /,?\s+(LLC|INC|CORP|CO\.?)$/gi, replacement: '' },
]

// Merchant-specific rules (exact matches after pattern normalization)
const MERCHANT_RULES: Record<string, string> = {
  // Walmart variations
  'WAL-MART': 'Walmart',
  'WM SUPERCENTER': 'Walmart',
  'WALMART': 'Walmart',
  
  // Sam's Club
  'SAMS CLUB': "Sam's Club",
  'SAMSCLUB': "Sam's Club",
  
  // Fast food chains
  "CHICK-FIL-A": "Chick-fil-A",
  "CHICKFILA": "Chick-fil-A",
  "MCDONALDS": "McDonald's",
  "MCDONALD'S": "McDonald's",
  
  // Gas stations
  'QT': 'QuikTrip',
  'QUIKTRIP': 'QuikTrip',
  'PHILLIPS 66': 'Phillips 66',
  
  // Grocery
  'HY-VEE': 'Hy-Vee',
  'HYVEE': 'Hy-Vee',
  'PRICE CHOPPER': 'Price Chopper',
  
  // Retail
  'TARGET': 'Target',
  'TARGET.COM': 'Target',
  'HOBBY-LOBBY': 'Hobby Lobby',
  'THE HOME DEPOT': 'Home Depot',
  'LOWES': "Lowe's",
  "LOWE'S": "Lowe's",
  
  // Tech/Services
  'APPLE.COM/BILL': 'Apple',
  'NETFLIX.COM': 'Netflix',
  'OPENAI': 'OpenAI',
  'ANTHROPIC': 'Anthropic',
  'CLAUDE.AI SUBSCRIPTION': 'Claude AI',
  
  // Subscription services
  'NORTON': 'Norton Antivirus',
  'SIMPLISAFE': 'SimpliSafe',
  'DIRECTV SERVICE': 'DIRECTV',
  
  // Finance
  'APEX TRADER FUNDING': 'Apex Trader Funding',
  'APEXTRADERFUNDING': 'Apex Trader Funding',
  'TRADOVATE': 'Tradovate',
  'DTN KINETICK': 'DTN Kinetick',
}

/**
 * Apply pattern-based normalization rules
 */
function applyPatternRules(vendor: string): string {
  let result = vendor
  
  for (const rule of PATTERN_RULES) {
    result = result.replace(rule.pattern, rule.replacement)
  }
  
  return result.trim()
}

/**
 * Apply merchant-specific rules
 */
function applyMerchantRules(vendor: string): string {
  const upper = vendor.toUpperCase()
  
  for (const [pattern, normalized] of Object.entries(MERCHANT_RULES)) {
    if (upper === pattern || upper.startsWith(pattern + ' ')) {
      return normalized
    }
  }
  
  return vendor
}

/**
 * Format vendor name with proper title casing
 */
function formatVendorName(vendor: string): string {
  // Don't modify if already has proper casing
  if (vendor !== vendor.toUpperCase() && vendor !== vendor.toLowerCase()) {
    return vendor
  }
  
  // Title case for all-caps vendors
  return vendor
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Preserve acronyms (2-3 letters, all caps)
      if (word.length <= 3 && word.toUpperCase() === vendor.split(' ').find(w => w.toUpperCase() === word.toUpperCase())) {
        return word.toUpperCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Main normalization function
 */
export function normalizeVendor(vendor: string): string {
  if (!vendor) return vendor
  
  let result = vendor
  
  // Step 1: Apply pattern rules
  result = applyPatternRules(result)
  
  // Step 2: Apply merchant-specific rules
  result = applyMerchantRules(result)
  
  // Step 3: Format with proper casing
  result = formatVendorName(result)
  
  return result
}

/**
 * Get display vendor name (respects user overrides)
 */
export function getDisplayVendor(transaction: {
  vendor?: string | null
  normalized_vendor?: string | null
  vendor_override?: string | null
}): string {
  return transaction.vendor_override || 
         transaction.normalized_vendor || 
         transaction.vendor || 
         'Unknown'
}
```

#### Step 2: Update vendorExtraction.ts

**File:** `src/lib/vendorExtraction.ts`

Add this at the end:

```typescript
import { normalizeVendor } from './vendorNormalization'

/**
 * Extract and normalize vendor from description
 */
export function extractAndNormalizeVendor(description: string): {
  vendor: string
  normalized: string
} {
  const vendor = extractVendor(description)
  const normalized = normalizeVendor(vendor)
  
  return { vendor, normalized }
}
```

### Phase 3C: Update Transaction Import Flow

**File:** `src/hooks/useTransactions.ts`

Find the `importTransactions` function and update it:

```typescript
import { extractAndNormalizeVendor } from '@/lib/vendorExtraction'  // ADD IMPORT

// In importTransactions function, update the transaction creation:
const transactionsToInsert = validTransactions.map((tx) => {
  const { vendor, normalized } = extractAndNormalizeVendor(tx.description)  // CHANGE THIS LINE
  
  return {
    account_id: accountId,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    vendor: vendor,
    normalized_vendor: normalized,  // ADD THIS
    transaction_hash: tx.hash,
    category_id: tx.category_id || null,
    member_id: tx.member_id || null,
  }
})
```

### Phase 3D: Update Dashboard to Use Normalized Vendors

**File:** `src/pages/Dashboard.tsx`

Find the grouping logic and update vendor grouping:

```typescript
import { getDisplayVendor } from '@/lib/vendorNormalization'  // ADD IMPORT

// Find the useMemo for groupedData (around line 150)
// Update the 'vendor' case:

case 'vendor': {
  return filteredTransactions.reduce((acc, transaction) => {
    const displayVendor = getDisplayVendor(transaction)  // CHANGE THIS
    
    if (!acc[displayVendor]) {
      acc[displayVendor] = { total: 0, count: 0, items: [] }
    }
    
    const amount = Math.abs(transaction.amount)
    acc[displayVendor].total += amount
    acc[displayVendor].count += 1
    acc[displayVendor].items.push(transaction)
    
    return acc
  }, {} as Record<string, { total: number; count: number; items: typeof transactions }>)
}
```

### Phase 3E: Backfill Existing Transactions

**File:** `scripts/backfill-normalized-vendors.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { normalizeVendor } from '../src/lib/vendorNormalization'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function backfillNormalizedVendors() {
  console.log('Starting backfill of normalized vendors...')
  
  // Fetch all transactions without normalized vendor
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, vendor')
    .is('normalized_vendor', null)
  
  if (error) {
    console.error('Error fetching transactions:', error)
    return
  }
  
  console.log(`Found ${transactions.length} transactions to normalize`)
  
  // Process in batches of 100
  const batchSize = 100
  let processed = 0
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)
    
    const updates = batch.map(tx => ({
      id: tx.id,
      normalized_vendor: normalizeVendor(tx.vendor || '')
    }))
    
    const { error: updateError } = await supabase
      .from('transactions')
      .upsert(updates)
    
    if (updateError) {
      console.error('Error updating batch:', updateError)
      continue
    }
    
    processed += batch.length
    console.log(`Processed ${processed}/${transactions.length} transactions`)
  }
  
  console.log('Backfill complete!')
}

backfillNormalizedVendors()
```

#### Run Backfill

```bash
# Make sure .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npx tsx scripts/backfill-normalized-vendors.ts
```

### Phase 3F: Add Vendor Override UI (Optional - Can Do Later)

**File:** `src/pages/Transactions.tsx`

Add a column for normalized vendor with edit icon:

```typescript
// In the table, add a new column:
<td className="px-4 py-2">
  <div className="flex items-center gap-2">
    <span>{getDisplayVendor(transaction)}</span>
    <button
      onClick={() => handleEditVendor(transaction)}
      className="text-blue-600 hover:text-blue-800"
      title="Set display name"
    >
      <Edit2 className="h-4 w-4" />
    </button>
  </div>
</td>
```

---

## Testing All Changes

### Test 1: TypeScript Types
```typescript
// In any file, verify autocomplete works:
const { data } = await supabase
  .from('transactions')
  .select('vendor, normalized_vendor, vendor_override')
// All three should autocomplete
```

### Test 2: Inbox Save Behavior
1. Go to /inbox
2. Select category, subcategory, member
3. Should NOT see any saves until you click "Categorize & Continue"
4. Click button → should see single save
5. Transaction should have correct category and member

### Test 3: Vendor Normalization
1. Import a CSV with transactions
2. Check database - `normalized_vendor` should be populated
3. Go to Dashboard → Group by Vendor
4. Should see "Amazon" (not 119 variations)
5. Should see "Target" (not 6 variations)
6. Should see "Taco Bell" (not 8 variations)

---

## Commit Strategy

```bash
# Commit 1: Fix types
git add src/lib/database.types.ts src/lib/supabase.ts
git commit -m "fix: sync TypeScript types with database schema"

# Commit 2: Fix Inbox save behavior
git add src/pages/Inbox.tsx
git commit -m "fix: inbox now saves once after full categorization"

# Commit 3: Add vendor normalization (database)
git add database-vendor-normalization.sql
git commit -m "feat: add vendor normalization columns and indexes"

# Commit 4: Add vendor normalization (code)
git add src/lib/vendorNormalization.ts src/lib/vendorExtraction.ts src/hooks/useTransactions.ts
git commit -m "feat: implement vendor normalization system"

# Commit 5: Update dashboard
git add src/pages/Dashboard.tsx
git commit -m "feat: dashboard uses normalized vendor names"

# Commit 6: Backfill script
git add scripts/backfill-normalized-vendors.ts
git commit -m "feat: add backfill script for normalized vendors"
```

---

## Success Criteria

✅ Task 1: No TypeScript errors, autocomplete works  
✅ Task 2: Inbox saves once per transaction  
✅ Task 3: Dashboard groups vendors correctly (Amazon, Target, etc. consolidated)

**Estimated time to complete all tasks:** 3-4 hours
