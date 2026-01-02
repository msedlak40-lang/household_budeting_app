# Vendor Normalization Strategy

## Executive Summary

**Problem:** 625 unique vendor descriptions → creates fragmented analytics, broken recurring detection, and poor dashboard insights

**Solution:** Normalize to ~200 distinct vendors using pattern-based rules

**Impact:** 
- 119 Amazon variations → 1 "Amazon"
- 8 Taco Bell variations → 1 "Taco Bell"  
- 6 Target variations → 1 "Target"
- Better dashboard grouping, recurring detection, and rule matching

---

## Key Findings from Real Data

### Top Normalization Opportunities

| Merchant | Current Variations | Transaction Count | Impact |
|----------|-------------------|-------------------|--------|
| Amazon | 119 variations | 119 transactions | **CRITICAL** |
| Target | 6 variations | 83 transactions | **HIGH** |
| Taco Bell | 8 variations | 38 transactions | HIGH |
| Norton Antivirus | 11 variations | 17 transactions | MEDIUM |
| McDonald's | 6 variations | ~18 transactions | MEDIUM |
| Walmart | 2 variations (WAL-MART + WM SUPERCENTER) | 38 combined | MEDIUM |

### Pattern Categories Identified

1. **Marketplace Codes** - Amazon MKTPL*XXXXXXX
2. **Store Numbers** - Target 00018408, Taco Bell #034391
3. **Location Suffixes** - Hy-Vee Overland Park 1509
4. **Payment Processor Prefixes** - SQ *, TST*, SP *, FSP*, PAR*
5. **Case Inconsistency** - Netflix.com vs NETFLIX.COM
6. **Business Variants** - Sams Club vs SAMSCLUB vs SAM'S CLUB

---

## Normalization Rules

### Tier 1: High-Impact Patterns (Automated)

```typescript
// 1. Amazon marketplace codes
"AMAZON MKTPL*[CODE]" → "Amazon"
"AMAZON MKTPLACE PMTS" → "Amazon"

// 2. Store numbers (trailing)
"TARGET 00018408" → "Target"
"TACO BELL #034391" → "Taco Bell"
"CHICK-FIL-A #01975" → "Chick-fil-A"
"MCDONALD'S F13642" → "McDonald's"

// 3. Payment processor prefixes
"SQ *REVOCUP SOUTH COFFEE" → "Revocup South Coffee"
"TST*PROTEINHOUSE- OVERLA" → "Proteinhouse"
"SP HAMMITT LOS ANGEL" → "Hammitt"
"FSP*LAND OF PAWS SOUTH" → "Land of Paws"
"PAR*SMOOTHIE KING SK0400" → "Smoothie King"

// 4. Location suffixes
"HY-VEE OVERLAND PARK 1509" → "Hy-Vee"
"PHILLIPS 66 - WYANDOTTE L" → "Phillips 66"
"QT 278 OUTSIDE" → "QuikTrip"

// 5. Case normalization
Title case for common words, preserve acronyms
"NETFLIX.COM" → "Netflix"
"OPENAI *CHATGPT SUBSCR" → "OpenAI ChatGPT"
```

### Tier 2: Merchant-Specific Rules

```typescript
// Walmart variants
"WAL-MART #XXXX" → "Walmart"
"WM SUPERCENTER #XXXX" → "Walmart"

// Sam's Club variants
"SAMS CLUB #XXXX" → "Sam's Club"
"SAMSCLUB #XXXX" → "Sam's Club"

// Norton antivirus
"NORTON *AP16XXXXXXXX" → "Norton Antivirus"
"NORTON *AP15XXXXXXXX" → "Norton Antivirus"

// Home Depot
"THE HOME DEPOT #XXXX" → "Home Depot"

// Apple
"APPLE.COM/BILL" → "Apple"
```

### Tier 3: User-Defined Overrides

Allow manual vendor mapping in UI:
- User sees "AMERICAN AI 0010273821008" 
- User sets: "American Airlines" (all similar codes auto-apply)

---

## Implementation Architecture

### 1. Database Schema Changes

**Add new columns to `transactions` table:**
```sql
ALTER TABLE transactions 
ADD COLUMN normalized_vendor TEXT,
ADD COLUMN vendor_override TEXT;
```

- `vendor` - Original cleaned name (existing)
- `normalized_vendor` - Auto-normalized (new)
- `vendor_override` - User manual override (new)

**Display priority:** `vendor_override ?? normalized_vendor ?? vendor`

### 2. Normalization Pipeline

```typescript
// lib/vendorNormalization.ts

function normalizeVendor(rawDescription: string): NormalizedVendor {
  // Step 1: Extract base vendor (existing extractVendor)
  const vendor = extractVendor(rawDescription)
  
  // Step 2: Apply normalization rules
  const normalized = applyNormalizationRules(vendor)
  
  return {
    original: rawDescription,
    vendor: vendor,
    normalized: normalized
  }
}

function applyNormalizationRules(vendor: string): string {
  let result = vendor
  
  // Apply tier 1 rules (high-confidence patterns)
  result = applyPatternRules(result)
  
  // Apply tier 2 rules (merchant-specific)
  result = applyMerchantRules(result)
  
  // Title case formatting
  result = formatVendorName(result)
  
  return result
}
```

### 3. User Override Interface

**In Transactions page:**
- Column showing `normalized_vendor` 
- Pencil icon to edit
- Modal: "Set display name for all transactions from [original]"
- Apply to all past + future transactions

### 4. Migration Strategy

**Phase 1: Add columns**
```sql
ALTER TABLE transactions ADD COLUMN normalized_vendor TEXT;
ALTER TABLE transactions ADD COLUMN vendor_override TEXT;
```

**Phase 2: Backfill existing data**
```typescript
// One-time migration script
async function backfillNormalizedVendors() {
  const transactions = await getAllTransactions()
  
  for (const tx of transactions) {
    const normalized = normalizeVendor(tx.description)
    await updateTransaction(tx.id, { 
      normalized_vendor: normalized.normalized 
    })
  }
}
```

**Phase 3: Update import flow**
```typescript
// CSV import applies normalization
const transaction = {
  description: row.description,
  vendor: extractVendor(row.description),
  normalized_vendor: normalizeVendor(row.description).normalized,
  // ... other fields
}
```

---

## Normalization Rules Reference

### Pattern Rules (Regex-based)

```typescript
const PATTERN_RULES = [
  // Amazon marketplace
  {
    pattern: /AMAZON MKTPL?\*[A-Z0-9]+/i,
    replacement: 'Amazon'
  },
  
  // Store numbers (trailing)
  {
    pattern: /^(.+?)\s+#?\d{4,8}$/,
    replacement: '$1'
  },
  
  // Payment processors
  {
    pattern: /^SQ \*/i,
    replacement: ''
  },
  {
    pattern: /^TST\*/i,
    replacement: ''
  },
  {
    pattern: /^SP /i,
    replacement: ''
  },
  {
    pattern: /^FSP\*/i,
    replacement: ''
  },
  {
    pattern: /^PAR\*/i,
    replacement: ''
  },
  
  // Location suffixes
  {
    pattern: /\s+(OVERLAND PARK|LEAWOOD|PRAIRIE FIRE).*$/i,
    replacement: ''
  },
  
  // Trailing qualifiers
  {
    pattern: /\s+(POS|OUTSIDE)$/i,
    replacement: ''
  }
]
```

### Merchant-Specific Rules

```typescript
const MERCHANT_RULES = {
  // Walmart variations
  'WAL-MART': 'Walmart',
  'WM SUPERCENTER': 'Walmart',
  
  // Sam's Club
  'SAMS CLUB': "Sam's Club",
  'SAMSCLUB': "Sam's Club",
  
  // Case corrections
  'APPLE.COM/BILL': 'Apple',
  'NETFLIX.COM': 'Netflix',
  'OPENAI': 'OpenAI',
  
  // Norton
  'NORTON': 'Norton Antivirus',
  
  // Home Depot
  'THE HOME DEPOT': 'Home Depot',
  
  // Fast food chains
  'CHICK-FIL-A': 'Chick-fil-A',
  'MCDONALDS': "McDonald's",
  
  // Gas stations
  'QT': 'QuikTrip',
  
  // Common misspellings
  'HY-VEE': 'Hy-Vee',
  'HOBBY-LOBBY': 'Hobby Lobby'
}
```

---

## Testing Strategy

### Test Cases

```typescript
describe('Vendor Normalization', () => {
  test('Amazon marketplace codes', () => {
    expect(normalizeVendor('AMAZON MKTPL*G16XD0X63').normalized)
      .toBe('Amazon')
  })
  
  test('Store numbers', () => {
    expect(normalizeVendor('TARGET 00018408').normalized)
      .toBe('Target')
    expect(normalizeVendor('TACO BELL #034391').normalized)
      .toBe('Taco Bell')
  })
  
  test('Payment processors', () => {
    expect(normalizeVendor('SQ *REVOCUP SOUTH COFFEE').normalized)
      .toBe('Revocup South Coffee')
  })
  
  test('User overrides', () => {
    const result = normalizeVendor('AMERICAN AI 0010273821008')
    // User sets override to "American Airlines"
    expect(result.normalized).toBe('American Airlines')
  })
})
```

---

## Dashboard Impact

### Before Normalization
```
Top Vendors:
- AMAZON MKTPL*G16XD0X63: $45.23 (1 transaction)
- AMAZON MKTPL*L914A7113: $139.11 (1 transaction)
- TARGET 00018408: $71.66 (3 transactions)
- TARGET 00017574: $234.12 (8 transactions)
```

### After Normalization
```
Top Vendors:
- Amazon: $8,453.67 (119 transactions)
- Target: $5,234.89 (83 transactions)
- Walmart: $2,456.78 (38 transactions)
- Taco Bell: $487.32 (38 transactions)
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
✅ Fix TypeScript types
✅ Fix Inbox save behavior
✅ Add database columns
✅ Create normalization library

### Phase 2: Core Normalization (Week 1-2)
✅ Implement pattern rules
✅ Implement merchant rules
✅ Create migration script
✅ Backfill existing data

### Phase 3: User Features (Week 2)
✅ Add override UI in Transactions page
✅ Show normalized names in Dashboard
✅ Update recurring detection to use normalized names

### Phase 4: Polish (Week 3)
✅ Add normalization settings page
✅ Export/import custom rules
✅ Analytics on normalization effectiveness

---

## Success Metrics

- **Vendor consolidation:** 625 → ~200 unique vendors
- **Dashboard accuracy:** Top 10 vendors represent 60%+ of spending
- **Recurring detection:** 30%+ increase in detected patterns
- **Rule matching:** 50%+ fewer manual categorizations needed
