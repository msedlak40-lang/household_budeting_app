/**
 * Intelligent Vendor Extraction
 *
 * Extracts clean vendor names from transaction descriptions
 * by removing store IDs, card numbers, locations, and other noise.
 */

export function extractVendor(description: string): string {
  if (!description) return ''

  let vendor = description.trim()

  // Remove common prefixes
  vendor = vendor.replace(/^(TST\*|SQ\*|SQUARE\*|POS\*|DEBIT\*|CREDIT\*)\s*/i, '')

  // Remove dates (MM/DD, DD/MM, etc.)
  vendor = vendor.replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*/g, ' ')

  // Remove transaction IDs and reference numbers
  vendor = vendor.replace(/\s+#\d+/g, '')
  vendor = vendor.replace(/\s+\*\d{6,}/g, '') // e.g., *123456789
  vendor = vendor.replace(/\s+REF\s*#?\d+/gi, '')
  vendor = vendor.replace(/\s+TRAN\s*#?\d+/gi, '')

  // Remove store numbers at the end (e.g., " STORE 1234", " #1234")
  vendor = vendor.replace(/\s+(STORE|LOC|LOCATION)\s*#?\d+$/i, '')

  // Remove "CARD ENDING" or "CARD" followed by numbers
  vendor = vendor.replace(/\s+CARD\s+(ENDING\s+)?\d+/gi, '')

  // Remove state abbreviations at the end (e.g., " CA", " NY")
  vendor = vendor.replace(/\s+[A-Z]{2}$/,  '')

  // Remove common location indicators
  vendor = vendor.replace(/\s+(SAN FRANCISCO|LOS ANGELES|NEW YORK|CHICAGO|HOUSTON|PHOENIX|PHILADELPHIA|SAN ANTONIO|SAN DIEGO|DALLAS|AUSTIN|SEATTLE|DENVER|BOSTON|PORTLAND|MIAMI|ATLANTA)\s+[A-Z]{2}$/i, '')

  // Remove ZIP codes
  vendor = vendor.replace(/\s+\d{5}(-\d{4})?$/, '')

  // Remove time stamps (HH:MM:SS or HH:MM)
  vendor = vendor.replace(/\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '')

  // Remove terminal IDs
  vendor = vendor.replace(/\s+T\d{3,}/gi, '')
  vendor = vendor.replace(/\s+TERM\s*\d+/gi, '')

  // Remove "PURCHASE" or "PAYMENT" suffixes
  vendor = vendor.replace(/\s+(PURCHASE|PAYMENT|PYMNT|PMT|DEBIT|WITHDRAWAL)$/i, '')

  // Clean up multiple spaces
  vendor = vendor.replace(/\s+/g, ' ').trim()

  // Capitalize properly for display
  // Keep all caps if it's an acronym or brand (e.g., "AT&T", "CVS")
  // Otherwise, title case
  if (vendor.length > 0 && !hasSpecialChars(vendor)) {
    vendor = toTitleCase(vendor)
  }

  return vendor
}

function hasSpecialChars(str: string): boolean {
  return /[&\/\-\.]/.test(str)
}

function toTitleCase(str: string): string {
  // Don't title case if it's likely an acronym (all uppercase, short)
  if (str === str.toUpperCase() && str.length <= 10) {
    return str
  }

  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Keep some words lowercase (articles, prepositions)
      if (['the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for'].includes(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
    // Always capitalize first word
    .replace(/^./, match => match.toUpperCase())
}

/**
 * Creates a hash for duplicate detection
 * Uses date, description, amount, and account
 * Note: Amount is placed early in the string to ensure different amounts produce different hashes
 */
export function createTransactionHash(
  date: string,
  description: string,
  amount: number,
  accountId?: string
): string {
  // Put amount first to ensure it affects the hash even when truncated
  // Also include it at the end for extra differentiation
  const normalized = `${amount.toFixed(2)}|${date}|${description.trim().toLowerCase()}|${accountId || ''}|${amount.toFixed(2)}`
  return btoa(normalized).substring(0, 40)
}
