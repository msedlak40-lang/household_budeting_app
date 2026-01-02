/**
 * Vendor Normalization System
 *
 * Normalizes vendor names from transaction descriptions to consolidate
 * variations like "AMAZON MKTPL*G16XD0X63" -> "Amazon"
 *
 * Three-tier display priority:
 * 1. vendor_override (user manual override)
 * 2. normalized_vendor (auto-normalized)
 * 3. vendor (original extracted vendor)
 */

import { extractVendor } from './vendorExtraction'

export interface NormalizedVendor {
  original: string
  vendor: string
  normalized: string
}

/**
 * Pattern rules for high-confidence vendor normalization
 * Order matters - first match wins
 */
const PATTERN_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Amazon marketplace variations
  { pattern: /^AMAZON\s*MKTPL?\*[A-Z0-9]+$/i, replacement: 'Amazon' },
  { pattern: /^AMAZON\s*MKTPLACE\s*PMTS?$/i, replacement: 'Amazon' },
  { pattern: /^AMZN\s*MKTP/i, replacement: 'Amazon' },
  { pattern: /^AMAZON\.COM/i, replacement: 'Amazon' },
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

  // Norton Antivirus (many variations with codes)
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
 * Maps partial matches (case-insensitive) to normalized names
 */
const MERCHANT_RULES: Record<string, string> = {
  // Retail
  'WAL-MART': 'Walmart',
  'WM SUPERCENTER': 'Walmart',
  'WALMART': 'Walmart',
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
  /^SQ\s*\*\s*/i,      // Square
  /^TST\*\s*/i,        // Toast
  /^SP\s+/i,           // Shopify
  /^FSP\*\s*/i,        // FreshBooks
  /^PAR\*\s*/i,        // PAR Technology
  /^PP\*\s*/i,         // PayPal
  /^PAYPAL\s*\*?\s*/i, // PayPal
  /^ZELLE\s*\*?\s*/i,  // Zelle
  /^VENMO\s*\*?\s*/i,  // Venmo
  /^CASH\s*APP\s*\*?\s*/i, // Cash App
]

/**
 * Suffixes to remove (store numbers, locations, etc.)
 */
const SUFFIX_PATTERNS = [
  /\s+#?\d{4,10}$/,                    // Store/reference numbers at end
  /\s+\d{5}(-\d{4})?$/,                // ZIP codes
  /\s+[A-Z]{2}\s*$/,                   // State abbreviations
  /\s+(OVERLAND PARK|LEAWOOD|PRAIRIE VILLAGE|OLATHE|SHAWNEE).*$/i, // KC area locations
  /\s+(POS|OUTSIDE|INSIDE|DRIVE THRU)$/i, // Transaction types
  /\s+F\d{4,6}$/,                      // Franchise codes (like MCDONALD'S F12345)
]

/**
 * Get the display vendor name for a transaction
 * Priority: vendor_override > normalized_vendor > vendor
 */
export function getDisplayVendor(transaction: {
  vendor?: string | null
  normalized_vendor?: string | null
  vendor_override?: string | null
  description: string
}): string {
  return (
    transaction.vendor_override ||
    transaction.normalized_vendor ||
    transaction.vendor ||
    extractVendor(transaction.description)
  )
}

/**
 * Apply pattern rules to normalize a vendor name
 */
function applyPatternRules(vendor: string): string | null {
  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(vendor)) {
      return rule.replacement
    }
  }
  return null
}

/**
 * Apply merchant-specific rules
 */
function applyMerchantRules(vendor: string): string | null {
  const upperVendor = vendor.toUpperCase()

  for (const [pattern, replacement] of Object.entries(MERCHANT_RULES)) {
    if (upperVendor.includes(pattern.toUpperCase())) {
      return replacement
    }
  }
  return null
}

/**
 * Remove payment processor prefixes
 */
function removeProcessorPrefixes(vendor: string): string {
  let result = vendor
  for (const pattern of PROCESSOR_PREFIXES) {
    result = result.replace(pattern, '')
  }
  return result.trim()
}

/**
 * Remove common suffixes (store numbers, locations, etc.)
 */
function removeSuffixes(vendor: string): string {
  let result = vendor
  for (const pattern of SUFFIX_PATTERNS) {
    result = result.replace(pattern, '')
  }
  return result.trim()
}

/**
 * Format vendor name for display (title case with special handling)
 */
function formatVendorName(vendor: string): string {
  if (!vendor) return ''

  // If already looks properly cased (has mixed case), leave it
  if (vendor !== vendor.toUpperCase() && vendor !== vendor.toLowerCase()) {
    return vendor
  }

  // Title case
  return vendor
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Keep some words lowercase (unless first word)
      const lowercaseWords = ['the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for']
      if (index > 0 && lowercaseWords.includes(word)) {
        return word
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Main normalization function
 * Takes a raw transaction description and returns normalized vendor info
 */
export function normalizeVendor(rawDescription: string): NormalizedVendor {
  // Step 1: Extract base vendor name
  const vendor = extractVendor(rawDescription)

  // Step 2: Try pattern rules first (highest confidence)
  const patternResult = applyPatternRules(vendor)
  if (patternResult) {
    return {
      original: rawDescription,
      vendor,
      normalized: patternResult,
    }
  }

  // Step 3: Remove processor prefixes
  let cleaned = removeProcessorPrefixes(vendor)

  // Step 4: Try merchant rules
  const merchantResult = applyMerchantRules(cleaned)
  if (merchantResult) {
    return {
      original: rawDescription,
      vendor,
      normalized: merchantResult,
    }
  }

  // Step 5: Remove suffixes
  cleaned = removeSuffixes(cleaned)

  // Step 6: Try merchant rules again after cleaning
  const merchantResult2 = applyMerchantRules(cleaned)
  if (merchantResult2) {
    return {
      original: rawDescription,
      vendor,
      normalized: merchantResult2,
    }
  }

  // Step 7: Format the cleaned name
  const formatted = formatVendorName(cleaned)

  return {
    original: rawDescription,
    vendor,
    normalized: formatted || vendor,
  }
}

/**
 * Batch normalize vendors for a list of transactions
 */
export function normalizeVendors(
  transactions: Array<{ description: string; vendor?: string | null }>
): Map<string, string> {
  const normalizations = new Map<string, string>()

  for (const tx of transactions) {
    const key = tx.vendor || tx.description
    if (!normalizations.has(key)) {
      const result = normalizeVendor(tx.description)
      normalizations.set(key, result.normalized)
    }
  }

  return normalizations
}
