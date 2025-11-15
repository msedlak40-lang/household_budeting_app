// Category suggestion engine
// Maps common household activities to parent categories

interface CategoryMapping {
  category: string
  keywords: string[]
}

const categoryMappings: CategoryMapping[] = [
  {
    category: 'Shopping',
    keywords: [
      'haircut', 'salon', 'barber', 'hair', 'hairstyle',
      'clothing', 'clothes', 'apparel', 'outfit', 'dress', 'shirt', 'pants',
      'shoes', 'sneakers', 'boots', 'sandals',
      'electronics', 'phone', 'laptop', 'tablet', 'computer', 'tv',
      'home goods', 'furniture', 'decor', 'bedding', 'towels',
      'books', 'magazines', 'reading',
      'personal care', 'toiletries', 'hygiene', 'shampoo', 'soap', 'deodorant',
      'beauty', 'cosmetics', 'makeup', 'skincare', 'lotion',
      'gifts', 'presents', 'gift card',
      'amazon', 'target', 'walmart', 'costco', 'shopping'
    ]
  },
  {
    category: 'Food & Dining',
    keywords: [
      'groceries', 'supermarket', 'grocery store', 'whole foods', 'trader joes',
      'restaurant', 'dining', 'dinner', 'lunch', 'breakfast', 'brunch',
      'fast food', 'burger', 'pizza', 'sandwich', 'taco', 'mcdonalds', 'wendys',
      'coffee', 'cafe', 'starbucks', 'dunkin',
      'bar', 'drinks', 'alcohol', 'beer', 'wine', 'liquor',
      'delivery', 'doordash', 'ubereats', 'grubhub', 'food delivery'
    ]
  },
  {
    category: 'Transportation',
    keywords: [
      'gas', 'fuel', 'gasoline', 'shell', 'chevron', 'exxon',
      'car payment', 'auto loan', 'vehicle payment',
      'car insurance', 'auto insurance', 'geico', 'progressive',
      'maintenance', 'oil change', 'repair', 'mechanic', 'service',
      'car wash', 'detailing',
      'parking', 'garage', 'meter',
      'tolls', 'ezpass', 'toll road',
      'bus', 'train', 'subway', 'metro', 'transit',
      'uber', 'lyft', 'taxi', 'rideshare', 'cab'
    ]
  },
  {
    category: 'Housing',
    keywords: [
      'rent', 'mortgage', 'housing payment', 'lease',
      'property tax', 'taxes',
      'hoa', 'homeowners association', 'condo fee',
      'home insurance', 'homeowners insurance',
      'electric', 'electricity', 'power', 'utility',
      'gas', 'heating', 'natural gas',
      'water', 'sewer', 'utilities',
      'internet', 'wifi', 'broadband', 'comcast', 'verizon', 'att',
      'maintenance', 'repair', 'handyman', 'plumber', 'electrician',
      'improvement', 'renovation', 'remodel', 'home depot', 'lowes'
    ]
  },
  {
    category: 'Entertainment',
    keywords: [
      'movie', 'cinema', 'theater', 'amc', 'regal',
      'netflix', 'hulu', 'disney+', 'streaming', 'prime video',
      'gaming', 'video games', 'xbox', 'playstation', 'nintendo', 'steam',
      'music', 'spotify', 'apple music', 'concert',
      'show', 'event', 'festival', 'fair',
      'sports', 'game', 'tickets', 'arena', 'stadium',
      'hobby', 'craft', 'recreation'
    ]
  },
  {
    category: 'Healthcare',
    keywords: [
      'doctor', 'physician', 'medical', 'clinic', 'hospital',
      'dentist', 'dental', 'teeth', 'orthodontist',
      'pharmacy', 'prescription', 'medication', 'medicine', 'cvs', 'walgreens',
      'eye', 'vision', 'glasses', 'contacts', 'optometrist',
      'health insurance', 'medical insurance', 'premium',
      'medical supplies', 'first aid',
      'therapy', 'therapist', 'counseling', 'mental health'
    ]
  },
  {
    category: 'Fitness & Wellness',
    keywords: [
      'gym', 'fitness center', 'workout', 'planet fitness', 'la fitness',
      'yoga', 'pilates', 'class', 'exercise', 'trainer',
      'sports equipment', 'weights', 'treadmill', 'bike',
      'spa', 'massage', 'wellness', 'sauna'
    ]
  },
  {
    category: 'Pets',
    keywords: [
      'pet food', 'dog food', 'cat food', 'pet treats',
      'vet', 'veterinarian', 'animal hospital', 'animal clinic',
      'pet supplies', 'toys', 'leash', 'collar', 'petsmart', 'petco',
      'pet insurance',
      'grooming', 'pet grooming', 'dog grooming'
    ]
  },
  {
    category: 'Kids & Family',
    keywords: [
      'childcare', 'daycare', 'babysitter', 'nanny', 'babysitting',
      'school tuition', 'private school', 'preschool',
      'school supplies', 'backpack', 'crayons', 'notebooks',
      'kids activities', 'lessons', 'camp', 'sports', 'dance',
      'kids clothing', "children's clothes", 'baby clothes',
      'toys', 'games', 'playtime', 'toy store',
      'allowance', 'kids', 'children', 'baby', 'infant'
    ]
  },
  {
    category: 'Travel & Vacation',
    keywords: [
      'hotel', 'motel', 'lodging', 'accommodation', 'airbnb', 'marriott', 'hilton',
      'flight', 'airline', 'airfare', 'united', 'delta', 'american airlines',
      'vacation', 'trip', 'tour', 'cruise',
      'rental car', 'car rental', 'hertz', 'enterprise',
      'travel insurance'
    ]
  },
  {
    category: 'Bills & Subscriptions',
    keywords: [
      'phone bill', 'cell phone', 'mobile', 'tmobile', 'verizon wireless',
      'streaming', 'subscription', 'membership',
      'music subscription',
      'cloud storage', 'icloud', 'google drive', 'dropbox',
      'software', 'app subscription', 'adobe', 'microsoft',
      'magazine subscription',
      'club', 'membership fee'
    ]
  },
  {
    category: 'Financial',
    keywords: [
      'bank fee', 'atm fee', 'overdraft',
      'credit card fee', 'annual fee', 'late fee',
      'investment fee', 'trading fee', 'brokerage',
      'tax preparation', 'accountant', 'cpa', 'h&r block', 'turbotax',
      'legal', 'lawyer', 'attorney', 'legal fees'
    ]
  },
  {
    category: 'Education',
    keywords: [
      'tuition', 'college', 'university', 'school',
      'books', 'textbooks', 'educational supplies',
      'online course', 'udemy', 'coursera', 'skillshare',
      'professional development', 'training', 'certification', 'seminar'
    ]
  },
  {
    category: 'Charity & Gifts',
    keywords: [
      'donation', 'charity', 'nonprofit', 'charitable',
      'church', 'religious offering', 'tithe', 'temple', 'synagogue',
      'political contribution', 'campaign', 'fundraiser'
    ]
  },
  {
    category: 'Income',
    keywords: [
      'salary', 'paycheck', 'wages', 'income', 'pay',
      'bonus', 'commission',
      'tax refund', 'irs refund', 'return',
      'reimbursement', 'expense reimbursement',
      'cash back', 'rewards', 'rebate',
      'interest', 'dividends',
      'investment returns', 'capital gains'
    ]
  }
]

/**
 * Suggests a parent category based on the input text
 * Uses keyword matching to find the best category fit
 *
 * @param input - The search term (e.g., "haircut", "grocery", "gym membership")
 * @returns The suggested parent category name or null if no match found
 */
export function suggestCategory(input: string): string | null {
  if (!input || input.trim().length === 0) return null

  const searchTerm = input.toLowerCase().trim()

  // Find the category with the most matching keywords
  let bestMatch: { category: string; score: number } | null = null

  for (const mapping of categoryMappings) {
    let score = 0

    for (const keyword of mapping.keywords) {
      // Exact match gets highest score
      if (searchTerm === keyword) {
        score += 10
      }
      // Contains keyword gets medium score
      else if (searchTerm.includes(keyword)) {
        score += 5
      }
      // Keyword contains search term gets lower score
      else if (keyword.includes(searchTerm)) {
        score += 3
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category: mapping.category, score }
    }
  }

  return bestMatch ? bestMatch.category : null
}

/**
 * Get all possible categories that match the input
 * Useful for showing multiple suggestions
 *
 * @param input - The search term
 * @param limit - Maximum number of suggestions to return (default: 3)
 * @returns Array of category names sorted by relevance
 */
export function suggestCategories(input: string, limit: number = 3): string[] {
  if (!input || input.trim().length === 0) return []

  const searchTerm = input.toLowerCase().trim()
  const matches: { category: string; score: number }[] = []

  for (const mapping of categoryMappings) {
    let score = 0

    for (const keyword of mapping.keywords) {
      if (searchTerm === keyword) {
        score += 10
      } else if (searchTerm.includes(keyword)) {
        score += 5
      } else if (keyword.includes(searchTerm)) {
        score += 3
      }
    }

    if (score > 0) {
      matches.push({ category: mapping.category, score })
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(m => m.category)
}

/**
 * Get example activities for a given category
 * Useful for showing users what belongs in each category
 *
 * @param categoryName - The category name
 * @returns Array of example keywords for that category
 */
export function getCategoryExamples(categoryName: string): string[] {
  const mapping = categoryMappings.find(m => m.category === categoryName)
  return mapping ? mapping.keywords.slice(0, 10) : []
}
