export interface RecurringPattern {
  vendor: string
  description: string
  categoryId: string | null
  averageAmount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'unknown'
  transactions: Array<{
    id: string
    date: string
    amount: number
  }>
  lastDate: string
  nextExpectedDate: string | null
  confidence: number // 0-100
}

const AMOUNT_VARIANCE_THRESHOLD = 0.15 // 15% variance allowed
const MIN_OCCURRENCES = 3 // Minimum transactions to be considered recurring

export function detectRecurringTransactions(
  transactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    vendor?: string | null
    category_id: string | null
  }>
): RecurringPattern[] {
  // Group by vendor (or description if no vendor)
  const groups = new Map<string, typeof transactions>()

  transactions.forEach(t => {
    const key = (t.vendor || t.description).toLowerCase().trim()
    const existing = groups.get(key) || []
    groups.set(key, [...existing, t])
  })

  const patterns: RecurringPattern[] = []

  // Analyze each group
  groups.forEach((groupTransactions, key) => {
    if (groupTransactions.length < MIN_OCCURRENCES) return

    // Sort by date
    const sorted = [...groupTransactions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Check if amounts are similar
    const amounts = sorted.map(t => Math.abs(t.amount))
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
    const maxVariance = avgAmount * AMOUNT_VARIANCE_THRESHOLD

    const similarAmounts = amounts.every(amt =>
      Math.abs(amt - avgAmount) <= maxVariance
    )

    if (!similarAmounts) return

    // Calculate intervals between transactions (in days)
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const daysDiff = Math.round(
        (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
        (1000 * 60 * 60 * 24)
      )
      intervals.push(daysDiff)
    }

    // Determine frequency based on average interval
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length
    const intervalVariance = Math.max(...intervals.map(int => Math.abs(int - avgInterval)))

    let frequency: RecurringPattern['frequency'] = 'unknown'
    let confidence = 0

    // Weekly: ~7 days
    if (avgInterval >= 5 && avgInterval <= 9 && intervalVariance <= 3) {
      frequency = 'weekly'
      confidence = 85
    }
    // Biweekly: ~14 days
    else if (avgInterval >= 12 && avgInterval <= 16 && intervalVariance <= 4) {
      frequency = 'biweekly'
      confidence = 80
    }
    // Monthly: ~30 days
    else if (avgInterval >= 25 && avgInterval <= 35 && intervalVariance <= 5) {
      frequency = 'monthly'
      confidence = 90
    }
    // Quarterly: ~90 days
    else if (avgInterval >= 85 && avgInterval <= 95 && intervalVariance <= 7) {
      frequency = 'quarterly'
      confidence = 85
    }
    // Yearly: ~365 days
    else if (avgInterval >= 350 && avgInterval <= 380 && intervalVariance <= 15) {
      frequency = 'yearly'
      confidence = 80
    }

    // Adjust confidence based on number of occurrences
    confidence = Math.min(100, confidence + (sorted.length - MIN_OCCURRENCES) * 2)

    if (frequency !== 'unknown') {
      const lastDate = sorted[sorted.length - 1].date
      const nextExpectedDate = calculateNextDate(lastDate, frequency)

      patterns.push({
        vendor: sorted[0].vendor || sorted[0].description,
        description: sorted[0].description,
        categoryId: sorted[0].category_id,
        averageAmount: avgAmount,
        frequency,
        transactions: sorted.map(t => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
        })),
        lastDate,
        nextExpectedDate,
        confidence,
      })
    }
  })

  // Sort by confidence (highest first)
  return patterns.sort((a, b) => b.confidence - a.confidence)
}

function calculateNextDate(lastDate: string, frequency: RecurringPattern['frequency']): string {
  const date = new Date(lastDate)

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      return lastDate
  }

  return date.toISOString().split('T')[0]
}

export function isOverdue(nextExpectedDate: string): boolean {
  const expected = new Date(nextExpectedDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  expected.setHours(0, 0, 0, 0)

  return expected < now
}

export function getDaysUntil(nextExpectedDate: string): number {
  const expected = new Date(nextExpectedDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  expected.setHours(0, 0, 0, 0)

  return Math.round((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
