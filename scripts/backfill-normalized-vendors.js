/**
 * Vendor Normalization Backfill Script
 *
 * This script updates the normalized_vendor column for all existing transactions
 * by applying the vendor normalization logic.
 *
 * Usage:
 *   1. Add the SERVICE ROLE KEY to .env.local (required to bypass RLS):
 *      VITE_SUPABASE_URL=your_supabase_url
 *      VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
 *      SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *
 *      (Find the service role key in Supabase Dashboard > Settings > API > service_role)
 *
 *   2. Run: node scripts/backfill-normalized-vendors.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
// Prefer service role key (bypasses RLS), fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.error('   Please ensure .env.local has:')
  console.error('   - VITE_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (required for backfill - find in Supabase Dashboard > Settings > API)')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  WARNING: No SUPABASE_SERVICE_ROLE_KEY found in .env.local')
  console.warn('   Using anon key which is subject to Row Level Security (RLS).')
  console.warn('   The script may not be able to read or update all transactions.')
  console.warn('')
  console.warn('   To fix this, add your service role key to .env.local:')
  console.warn('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  console.warn('')
  console.warn('   Find it in Supabase Dashboard > Settings > API > service_role (secret)')
  console.warn('')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Check for --force flag to re-normalize all transactions
const forceUpdate = process.argv.includes('--force')

// ============================================
// Vendor Normalization Logic (copied from src/lib)
// ============================================

/**
 * Pattern rules for high-confidence vendor normalization
 */
const PATTERN_RULES = [
  // Amazon marketplace variations
  { pattern: /^AMAZON\s*MKTPL?\*[A-Z0-9]+$/i, replacement: 'Amazon' },
  { pattern: /^AMAZON\s*MKTPLACE\s*PMTS?$/i, replacement: 'Amazon' },
  { pattern: /^AMAZON\s*RETA?\*?\s*[A-Z0-9]+$/i, replacement: 'Amazon' }, // Amazon Retail
  { pattern: /^AMZN\s*MKTP/i, replacement: 'Amazon' },
  { pattern: /^AMZN\s*RETA?/i, replacement: 'Amazon' }, // AMZN Retail
  { pattern: /^AMAZON\.COM/i, replacement: 'Amazon' },
  { pattern: /^AMAZON\s+/i, replacement: 'Amazon' }, // Catch-all for "AMAZON " prefix
  { pattern: /^AMAZON\s*PRIME/i, replacement: 'Amazon Prime' },
  { pattern: /^PRIME\s*VIDEO/i, replacement: 'Amazon Prime Video' },

  // Netflix
  { pattern: /^NETFLIX\.?COM?/i, replacement: 'Netflix' },
  { pattern: /^NETFLIX/i, replacement: 'Netflix' },

  // Apple
  { pattern: /^APPLE\.COM\/BILL/i, replacement: 'Apple' },
  { pattern: /^APPLE\.COM/i, replacement: 'Apple' },
  { pattern: /^APPLE\s*STORE/i, replacement: 'Apple Store' },

  // Google
  { pattern: /^GOOGLE\s*\*[A-Z]/i, replacement: 'Google' },
  { pattern: /^GOOGLE\s*PLAY/i, replacement: 'Google Play' },

  // OpenAI/ChatGPT
  { pattern: /^OPENAI\s*\*?CHATGPT/i, replacement: 'OpenAI ChatGPT' },
  { pattern: /^OPENAI/i, replacement: 'OpenAI' },

  // Norton Antivirus
  { pattern: /^NORTON\s*\*?AP\d+/i, replacement: 'Norton Antivirus' },
  { pattern: /^NORTON/i, replacement: 'Norton Antivirus' },

  // Spotify
  { pattern: /^SPOTIFY/i, replacement: 'Spotify' },

  // Disney+
  { pattern: /^DISNEY\s*PLUS/i, replacement: 'Disney+' },
  { pattern: /^DISNEYPLUS/i, replacement: 'Disney+' },

  // Hulu
  { pattern: /^HULU/i, replacement: 'Hulu' },
]

/**
 * Merchant-specific normalizations
 */
const MERCHANT_RULES = {
  // Retail
  'WAL-MART': 'Walmart',
  'WM SUPERCENTER': 'Walmart',
  'WALMART': 'Walmart',
  'TARGET.COM': 'Target',
  'TARGET': 'Target',
  'COSTCO': 'Costco',
  'SAMS CLUB': "Sam's Club",
  'SAMSCLUB': "Sam's Club",
  "SAM'S CLUB": "Sam's Club",
  'THE HOME DEPOT': 'Home Depot',
  'HOME DEPOT': 'Home Depot',
  'LOWES': "Lowe's",
  "LOWE'S": "Lowe's",
  'HOBBY LOBBY': 'Hobby Lobby',
  'HOBBY-LOBBY': 'Hobby Lobby',
  'MICHAELS': 'Michaels',
  'JOANN': 'JOANN Fabrics',
  'BED BATH': 'Bed Bath & Beyond',
  'IKEA': 'IKEA',
  'KOHLS': "Kohl's",
  "KOHL'S": "Kohl's",
  'NORDSTROM': 'Nordstrom',
  'MACYS': "Macy's",
  "MACY'S": "Macy's",
  'JC PENNEY': 'JCPenney',
  'JCPENNEY': 'JCPenney',
  'ROSS STORES': 'Ross',
  'TJ MAXX': 'TJ Maxx',
  'TJMAXX': 'TJ Maxx',
  'MARSHALLS': 'Marshalls',
  'OLD NAVY': 'Old Navy',
  'GAP': 'Gap',
  'BANANA REPUBLIC': 'Banana Republic',

  // Grocery
  'HY-VEE': 'Hy-Vee',
  'HYVEE': 'Hy-Vee',
  'WHOLE FOODS': 'Whole Foods',
  'TRADER JOE': "Trader Joe's",
  'ALDI': 'ALDI',
  'KROGER': 'Kroger',
  'SAFEWAY': 'Safeway',
  'PUBLIX': 'Publix',
  'WEGMANS': 'Wegmans',
  'SPROUTS': 'Sprouts',

  // Fast Food
  'MCDONALDS': "McDonald's",
  "MCDONALD'S": "McDonald's",
  'TACO BELL': 'Taco Bell',
  'CHICK-FIL-A': 'Chick-fil-A',
  'CHICKFILA': 'Chick-fil-A',
  'CHIPOTLE': 'Chipotle',
  'WENDYS': "Wendy's",
  "WENDY'S": "Wendy's",
  'BURGER KING': 'Burger King',
  'SONIC DRIVE': 'Sonic',
  'FIVE GUYS': 'Five Guys',
  'IN-N-OUT': 'In-N-Out',
  'WHATABURGER': 'Whataburger',
  "ARBY'S": "Arby's",
  'ARBYS': "Arby's",
  'POPEYES': 'Popeyes',
  'KFC': 'KFC',
  'PIZZA HUT': 'Pizza Hut',
  'DOMINOS': "Domino's",
  "DOMINO'S": "Domino's",
  'PAPA JOHNS': "Papa John's",
  "PAPA JOHN'S": "Papa John's",
  'LITTLE CAESARS': 'Little Caesars',
  'SUBWAY': 'Subway',
  'JIMMY JOHNS': "Jimmy John's",
  "JIMMY JOHN'S": "Jimmy John's",
  'JERSEY MIKES': "Jersey Mike's",
  "JERSEY MIKE'S": "Jersey Mike's",
  'PANERA': 'Panera Bread',
  'STARBUCKS': 'Starbucks',
  'DUNKIN': "Dunkin'",
  "DUNKIN'": "Dunkin'",
  'SMOOTHIE KING': 'Smoothie King',
  'JAMBA': 'Jamba',
  'TROPICAL SMOOTHIE': 'Tropical Smoothie',

  // Gas Stations
  'QT ': 'QuikTrip',
  'QUIKTRIP': 'QuikTrip',
  'SHELL': 'Shell',
  'CHEVRON': 'Chevron',
  'EXXON': 'Exxon',
  'MOBIL': 'Mobil',
  'BP ': 'BP',
  'PHILLIPS 66': 'Phillips 66',
  'CONOCO': 'Conoco',
  'CASEY': "Casey's",
  "CASEY'S": "Casey's",
  'KWICK': 'Kum & Go',
  'KUM & GO': 'Kum & Go',
  'RACETRAC': 'RaceTrac',
  'WAWA': 'Wawa',
  'SHEETZ': 'Sheetz',
  'BUCEES': "Buc-ee's",
  "BUC-EE'S": "Buc-ee's",

  // Pharmacies
  'CVS': 'CVS',
  'WALGREENS': 'Walgreens',
  'RITE AID': 'Rite Aid',

  // Entertainment
  'AMC THEATRE': 'AMC Theatres',
  'REGAL CINEMA': 'Regal Cinemas',
  'CINEMARK': 'Cinemark',

  // Airlines
  'AMERICAN AI': 'American Airlines',
  'SOUTHWEST AIR': 'Southwest Airlines',
  'DELTA AIR': 'Delta Airlines',
  'UNITED AIR': 'United Airlines',
  'JETBLUE': 'JetBlue',
  'FRONTIER AIR': 'Frontier Airlines',
  'SPIRIT AIR': 'Spirit Airlines',

  // Hotels
  'MARRIOTT': 'Marriott',
  'HILTON': 'Hilton',
  'HYATT': 'Hyatt',
  'IHG': 'IHG Hotels',
  'HOLIDAY INN': 'Holiday Inn',
  'HAMPTON INN': 'Hampton Inn',
  'BEST WESTERN': 'Best Western',

  // Ride Share
  'UBER': 'Uber',
  'LYFT': 'Lyft',

  // Food Delivery
  'DOORDASH': 'DoorDash',
  'GRUBHUB': 'Grubhub',
  'UBER EATS': 'Uber Eats',
  'UBEREATS': 'Uber Eats',
  'POSTMATES': 'Postmates',
  'INSTACART': 'Instacart',
}

/**
 * Payment processor prefixes to strip
 */
const PROCESSOR_PREFIXES = [
  /^SQ\s*\*\s*/i,
  /^TST\*\s*/i,
  /^SP\s+/i,
  /^FSP\*\s*/i,
  /^PAR\*\s*/i,
  /^PP\*\s*/i,
  /^PAYPAL\s*\*?\s*/i,
  /^ZELLE\s*\*?\s*/i,
  /^VENMO\s*\*?\s*/i,
  /^CASH\s*APP\s*\*?\s*/i,
]

/**
 * Suffixes to remove
 */
const SUFFIX_PATTERNS = [
  /\s+#?\d{4,10}$/,
  /\s+\d{5}(-\d{4})?$/,
  /\s+[A-Z]{2}\s*$/,
  /\s+(OVERLAND PARK|LEAWOOD|PRAIRIE VILLAGE|OLATHE|SHAWNEE).*$/i,
  /\s+(POS|OUTSIDE|INSIDE|DRIVE THRU)$/i,
  /\s+F\d{4,6}$/,
]

function extractVendor(description) {
  if (!description) return ''

  let vendor = description.trim()

  // Remove common prefixes
  vendor = vendor.replace(/^(TST\*|SQ\*|SQUARE\*|POS\*|DEBIT\*|CREDIT\*)\s*/i, '')

  // Remove dates
  vendor = vendor.replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*/g, ' ')

  // Remove transaction IDs
  vendor = vendor.replace(/\s+#\d+/g, '')
  vendor = vendor.replace(/\s+\*\d{6,}/g, '')
  vendor = vendor.replace(/\s+REF\s*#?\d+/gi, '')
  vendor = vendor.replace(/\s+TRAN\s*#?\d+/gi, '')

  // Remove store numbers
  vendor = vendor.replace(/\s+(STORE|LOC|LOCATION)\s*#?\d+$/i, '')

  // Remove card info
  vendor = vendor.replace(/\s+CARD\s+(ENDING\s+)?\d+/gi, '')

  // Remove state abbreviations
  vendor = vendor.replace(/\s+[A-Z]{2}$/, '')

  // Remove common locations
  vendor = vendor.replace(/\s+(SAN FRANCISCO|LOS ANGELES|NEW YORK|CHICAGO|HOUSTON|PHOENIX|PHILADELPHIA|SAN ANTONIO|SAN DIEGO|DALLAS|AUSTIN|SEATTLE|DENVER|BOSTON|PORTLAND|MIAMI|ATLANTA)\s+[A-Z]{2}$/i, '')

  // Remove ZIP codes
  vendor = vendor.replace(/\s+\d{5}(-\d{4})?$/, '')

  // Remove timestamps
  vendor = vendor.replace(/\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '')

  // Remove terminal IDs
  vendor = vendor.replace(/\s+T\d{3,}/gi, '')
  vendor = vendor.replace(/\s+TERM\s*\d+/gi, '')

  // Remove transaction type suffixes
  vendor = vendor.replace(/\s+(PURCHASE|PAYMENT|PYMNT|PMT|DEBIT|WITHDRAWAL)$/i, '')

  // Clean up spaces
  vendor = vendor.replace(/\s+/g, ' ').trim()

  return vendor
}

function applyPatternRules(vendor) {
  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(vendor)) {
      return rule.replacement
    }
  }
  return null
}

function applyMerchantRules(vendor) {
  const upperVendor = vendor.toUpperCase()
  for (const [pattern, replacement] of Object.entries(MERCHANT_RULES)) {
    if (upperVendor.includes(pattern.toUpperCase())) {
      return replacement
    }
  }
  return null
}

function removeProcessorPrefixes(vendor) {
  let result = vendor
  for (const pattern of PROCESSOR_PREFIXES) {
    result = result.replace(pattern, '')
  }
  return result.trim()
}

function removeSuffixes(vendor) {
  let result = vendor
  for (const pattern of SUFFIX_PATTERNS) {
    result = result.replace(pattern, '')
  }
  return result.trim()
}

function formatVendorName(vendor) {
  if (!vendor) return ''

  // If already looks properly cased, leave it
  if (vendor !== vendor.toUpperCase() && vendor !== vendor.toLowerCase()) {
    return vendor
  }

  // Title case
  return vendor
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      const lowercaseWords = ['the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for']
      if (index > 0 && lowercaseWords.includes(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function normalizeVendor(rawDescription) {
  // Step 1: Extract base vendor name
  const vendor = extractVendor(rawDescription)

  // Step 2: Try pattern rules first
  const patternResult = applyPatternRules(vendor)
  if (patternResult) {
    return patternResult
  }

  // Step 3: Remove processor prefixes
  let cleaned = removeProcessorPrefixes(vendor)

  // Step 4: Try merchant rules
  const merchantResult = applyMerchantRules(cleaned)
  if (merchantResult) {
    return merchantResult
  }

  // Step 5: Remove suffixes
  cleaned = removeSuffixes(cleaned)

  // Step 6: Try merchant rules again
  const merchantResult2 = applyMerchantRules(cleaned)
  if (merchantResult2) {
    return merchantResult2
  }

  // Step 7: Format the cleaned name
  const formatted = formatVendorName(cleaned)

  return formatted || vendor
}

// ============================================
// Backfill Script
// ============================================

const BATCH_SIZE = 100

async function backfillNormalizedVendors() {
  console.log('🔧 Starting vendor normalization backfill...\n')
  if (forceUpdate) {
    console.log('⚡ Force mode enabled - will re-normalize ALL transactions\n')
  }

  try {
    // 1. Count total transactions
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError
    console.log(`📊 Found ${count} total transactions\n`)

    if (count === 0) {
      console.log('✅ No transactions to process')
      return
    }

    // 2. Process in batches
    let processed = 0
    let updated = 0
    let unchanged = 0
    let offset = 0

    while (offset < count) {
      // Fetch batch
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, description, vendor, normalized_vendor')
        .range(offset, offset + BATCH_SIZE - 1)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      if (!transactions || transactions.length === 0) {
        break
      }

      console.log(`📦 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1} (${transactions.length} transactions)...`)

      // Process each transaction
      for (const tx of transactions) {
        // Use description as the source for normalization
        const newNormalized = normalizeVendor(tx.description)

        // Update if force mode OR if the normalized value is different
        if (forceUpdate || newNormalized !== tx.normalized_vendor) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ normalized_vendor: newNormalized })
            .eq('id', tx.id)

          if (updateError) {
            console.error(`   ❌ Error updating transaction ${tx.id}:`, updateError.message)
          } else {
            updated++
            // Log interesting normalizations
            if (tx.normalized_vendor !== newNormalized) {
              console.log(`   ✏️  "${tx.description}" → "${newNormalized}" (was: "${tx.normalized_vendor || 'null'}")`)
            }
          }
        } else {
          unchanged++
        }

        processed++
      }

      console.log(`   ✅ Batch complete. Progress: ${processed}/${count} (${Math.round(processed / count * 100)}%)\n`)

      offset += BATCH_SIZE
    }

    console.log('\n🎉 Backfill complete!')
    console.log(`   📊 Summary:`)
    console.log(`      - ${processed} transactions processed`)
    console.log(`      - ${updated} transactions updated`)
    console.log(`      - ${unchanged} transactions unchanged`)

  } catch (error) {
    console.error('\n❌ Backfill failed:', error.message)
    process.exit(1)
  }
}

backfillNormalizedVendors()
