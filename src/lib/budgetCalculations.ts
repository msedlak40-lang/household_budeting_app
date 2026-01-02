import { startOfMonth, endOfMonth, subMonths, format, parseISO, isWithinInterval } from 'date-fns'
import type { TransactionWithDetails } from '@/hooks/useTransactions'
import type { BudgetTemplateWithItems, BudgetItem } from '@/hooks/useBudgets'
import type { Category } from '@/hooks/useCategories'
import { isExpense } from './transactionUtils'

export interface CategoryAverage {
  categoryId: string
  categoryName: string
  parentCategoryId: string | null
  parentCategoryName: string | null
  averageAmount: number
  monthlyTotals: Array<{ month: string; amount: number }>
  transactionCount: number
}

export interface BudgetProgress {
  categoryId: string
  categoryName: string
  parentCategoryId: string | null
  parentCategoryName: string | null
  budgetedAmount: number
  actualAmount: number
  remainingAmount: number
  percentUsed: number
  isOverBudget: boolean
}

export interface BudgetSummary {
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
  percentUsed: number
  itemProgress: BudgetProgress[]
  overBudgetCategories: BudgetProgress[]
  underBudgetCategories: BudgetProgress[]
}

export interface BudgetVsActual {
  month: string
  monthYear: string
  budgetedTotal: number
  actualTotal: number
  variance: number
  variancePercent: number
  categoryBreakdown: Array<{
    categoryId: string
    categoryName: string
    budgeted: number
    actual: number
    variance: number
  }>
}

/**
 * Calculate average spending per category over a lookback period
 */
export function calculateCategoryAverages(
  transactions: TransactionWithDetails[],
  categories: Category[],
  lookbackMonths: number,
  referenceDate: Date = new Date()
): CategoryAverage[] {
  const categoryMap = new Map<string, Category>()
  categories.forEach(cat => categoryMap.set(cat.id, cat))

  // Get the date range for the lookback period
  const endDate = endOfMonth(subMonths(referenceDate, 1)) // End of last month
  const startDate = startOfMonth(subMonths(endDate, lookbackMonths - 1))

  // Filter transactions to only expenses within the lookback period
  const relevantTransactions = transactions.filter(t => {
    const transactionDate = parseISO(t.date)
    return (
      isExpense(t) &&
      t.category_id &&
      isWithinInterval(transactionDate, { start: startDate, end: endDate })
    )
  })

  // Group transactions by category and month
  const categoryMonthlyTotals = new Map<string, Map<string, number>>()
  const categoryTransactionCounts = new Map<string, number>()

  relevantTransactions.forEach(t => {
    const categoryId = t.category_id!
    const monthKey = format(parseISO(t.date), 'yyyy-MM')
    const amount = Math.abs(t.amount) // Convert to positive for expenses

    if (!categoryMonthlyTotals.has(categoryId)) {
      categoryMonthlyTotals.set(categoryId, new Map())
      categoryTransactionCounts.set(categoryId, 0)
    }

    const monthMap = categoryMonthlyTotals.get(categoryId)!
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount)
    categoryTransactionCounts.set(categoryId, (categoryTransactionCounts.get(categoryId) || 0) + 1)
  })

  // Calculate averages for each category
  const averages: CategoryAverage[] = []

  categoryMonthlyTotals.forEach((monthMap, categoryId) => {
    const category = categoryMap.get(categoryId)
    if (!category) return

    const parentCategory = category.parent_category_id
      ? categoryMap.get(category.parent_category_id)
      : null

    const monthlyTotals: Array<{ month: string; amount: number }> = []
    let totalAmount = 0

    monthMap.forEach((amount, month) => {
      monthlyTotals.push({ month, amount })
      totalAmount += amount
    })

    // Sort by month
    monthlyTotals.sort((a, b) => a.month.localeCompare(b.month))

    averages.push({
      categoryId,
      categoryName: category.name,
      parentCategoryId: category.parent_category_id,
      parentCategoryName: parentCategory?.name || null,
      averageAmount: totalAmount / lookbackMonths,
      monthlyTotals,
      transactionCount: categoryTransactionCounts.get(categoryId) || 0,
    })
  })

  // Sort by average amount descending
  averages.sort((a, b) => b.averageAmount - a.averageAmount)

  return averages
}

/**
 * Get total spending for a specific month by category
 */
export function getCurrentMonthSpending(
  transactions: TransactionWithDetails[],
  categories: Category[],
  month: number,
  year: number
): Map<string, number> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = endOfMonth(startDate)

  const categorySpending = new Map<string, number>()

  transactions.forEach(t => {
    if (!t.category_id || !isExpense(t)) return

    const transactionDate = parseISO(t.date)
    if (!isWithinInterval(transactionDate, { start: startDate, end: endDate })) return

    const currentAmount = categorySpending.get(t.category_id) || 0
    categorySpending.set(t.category_id, currentAmount + Math.abs(t.amount))
  })

  return categorySpending
}

/**
 * Calculate budget progress for a specific budget template
 */
export function getBudgetProgress(
  budget: BudgetTemplateWithItems,
  transactions: TransactionWithDetails[],
  categories: Category[]
): BudgetSummary {
  const categoryMap = new Map<string, Category>()
  categories.forEach(cat => categoryMap.set(cat.id, cat))

  const spending = getCurrentMonthSpending(transactions, categories, budget.month, budget.year)

  const itemProgress: BudgetProgress[] = budget.budget_items.map(item => {
    const category = categoryMap.get(item.category_id)
    const parentCategory = category?.parent_category_id
      ? categoryMap.get(category.parent_category_id)
      : null

    const actualAmount = spending.get(item.category_id) || 0
    const remainingAmount = item.budgeted_amount - actualAmount
    const percentUsed = item.budgeted_amount > 0
      ? (actualAmount / item.budgeted_amount) * 100
      : actualAmount > 0 ? 100 : 0

    return {
      categoryId: item.category_id,
      categoryName: category?.name || 'Unknown',
      parentCategoryId: category?.parent_category_id || null,
      parentCategoryName: parentCategory?.name || null,
      budgetedAmount: item.budgeted_amount,
      actualAmount,
      remainingAmount,
      percentUsed,
      isOverBudget: actualAmount > item.budgeted_amount,
    }
  })

  // Sort by percent used descending
  itemProgress.sort((a, b) => b.percentUsed - a.percentUsed)

  const totalBudgeted = itemProgress.reduce((sum, item) => sum + item.budgetedAmount, 0)
  const totalSpent = itemProgress.reduce((sum, item) => sum + item.actualAmount, 0)
  const totalRemaining = totalBudgeted - totalSpent
  const percentUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  return {
    totalBudgeted,
    totalSpent,
    totalRemaining,
    percentUsed,
    itemProgress,
    overBudgetCategories: itemProgress.filter(i => i.isOverBudget),
    underBudgetCategories: itemProgress.filter(i => !i.isOverBudget && i.percentUsed < 100),
  }
}

/**
 * Get budget vs actual comparison for multiple months
 */
export function getBudgetVsActual(
  budgetTemplates: BudgetTemplateWithItems[],
  transactions: TransactionWithDetails[],
  categories: Category[],
  numberOfMonths: number = 6
): BudgetVsActual[] {
  const categoryMap = new Map<string, Category>()
  categories.forEach(cat => categoryMap.set(cat.id, cat))

  const results: BudgetVsActual[] = []
  const now = new Date()

  for (let i = numberOfMonths - 1; i >= 0; i--) {
    const targetDate = subMonths(now, i)
    const month = targetDate.getMonth() + 1
    const year = targetDate.getFullYear()
    const monthKey = format(targetDate, 'yyyy-MM')
    const monthYear = format(targetDate, 'MMM yyyy')

    // Find budget for this month
    const budget = budgetTemplates.find(b => b.month === month && b.year === year && b.is_active)

    // Get actual spending for this month
    const spending = getCurrentMonthSpending(transactions, categories, month, year)

    let budgetedTotal = 0
    let actualTotal = 0
    const categoryBreakdown: BudgetVsActual['categoryBreakdown'] = []

    if (budget) {
      budget.budget_items.forEach(item => {
        const category = categoryMap.get(item.category_id)
        const actual = spending.get(item.category_id) || 0

        budgetedTotal += item.budgeted_amount
        actualTotal += actual

        categoryBreakdown.push({
          categoryId: item.category_id,
          categoryName: category?.name || 'Unknown',
          budgeted: item.budgeted_amount,
          actual,
          variance: item.budgeted_amount - actual,
        })
      })
    } else {
      // No budget for this month, just show actual spending
      spending.forEach((amount, categoryId) => {
        const category = categoryMap.get(categoryId)
        actualTotal += amount

        categoryBreakdown.push({
          categoryId,
          categoryName: category?.name || 'Unknown',
          budgeted: 0,
          actual: amount,
          variance: -amount,
        })
      })
    }

    const variance = budgetedTotal - actualTotal
    const variancePercent = budgetedTotal > 0
      ? ((budgetedTotal - actualTotal) / budgetedTotal) * 100
      : 0

    results.push({
      month: monthKey,
      monthYear,
      budgetedTotal,
      actualTotal,
      variance,
      variancePercent,
      categoryBreakdown,
    })
  }

  return results
}

/**
 * Suggest budget amounts based on historical spending
 */
export function suggestBudgetAmounts(
  averages: CategoryAverage[],
  adjustmentPercent: number = 0
): Map<string, number> {
  const suggestions = new Map<string, number>()

  averages.forEach(avg => {
    // Round to nearest dollar and apply adjustment
    const baseAmount = Math.round(avg.averageAmount)
    const adjustedAmount = Math.round(baseAmount * (1 + adjustmentPercent / 100))
    suggestions.set(avg.categoryId, Math.max(0, adjustedAmount))
  })

  return suggestions
}

/**
 * Get month name from number (1-12)
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1] || ''
}

/**
 * Format currency for display
 */
export function formatBudgetCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get color based on budget progress percentage
 */
export function getBudgetProgressColor(percentUsed: number): string {
  if (percentUsed >= 100) return 'red'
  if (percentUsed >= 80) return 'yellow'
  if (percentUsed >= 50) return 'blue'
  return 'green'
}

/**
 * Calculate days remaining in month
 */
export function getDaysRemainingInMonth(month: number, year: number): number {
  const now = new Date()
  const endOfMonthDate = endOfMonth(new Date(year, month - 1, 1))

  // If we're past this month, return 0
  if (now > endOfMonthDate) return 0

  // If we're before this month, return total days
  const startOfMonthDate = new Date(year, month - 1, 1)
  if (now < startOfMonthDate) {
    return Math.ceil((endOfMonthDate.getTime() - startOfMonthDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  // We're in this month, calculate remaining days
  return Math.ceil((endOfMonthDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Calculate daily budget remaining
 */
export function getDailyBudgetRemaining(
  remainingBudget: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) return 0
  return remainingBudget / daysRemaining
}
