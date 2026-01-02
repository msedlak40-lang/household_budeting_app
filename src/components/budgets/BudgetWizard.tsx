import { useState, useMemo } from 'react'
import { X, ChevronRight, ChevronLeft, Check, TrendingUp } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import {
  calculateCategoryAverages,
  suggestBudgetAmounts,
  getMonthName,
  formatBudgetCurrency,
} from '@/lib/budgetCalculations'

interface BudgetWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BudgetItemInput {
  categoryId: string
  categoryName: string
  parentCategoryName: string | null
  suggestedAmount: number
  budgetedAmount: number
  averageAmount: number
  isIncluded: boolean
}

const LOOKBACK_OPTIONS = [
  { value: 3, label: '3 months', description: 'Recent spending patterns' },
  { value: 6, label: '6 months', description: 'Half-year average' },
  { value: 12, label: '12 months', description: 'Full year average' },
] as const

export default function BudgetWizard({ isOpen, onClose, onSuccess }: BudgetWizardProps) {
  const { categories, getParentCategories, getCategoryDisplayName } = useCategories()
  const { transactions } = useTransactions()
  const { createBudget } = useBudgets()

  // Wizard state
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Basic info
  const now = new Date()
  const [budgetName, setBudgetName] = useState(`${getMonthName(now.getMonth() + 1)} ${now.getFullYear()} Budget`)
  const [budgetMonth, setBudgetMonth] = useState(now.getMonth() + 1)
  const [budgetYear, setBudgetYear] = useState(now.getFullYear())
  const [lookbackMonths, setLookbackMonths] = useState<number>(3)

  // Step 2: Category selection and amounts
  const [budgetItems, setBudgetItems] = useState<BudgetItemInput[]>([])
  const [adjustmentPercent, setAdjustmentPercent] = useState(0)

  // Calculate averages when we move to step 2
  const categoryAverages = useMemo(() => {
    if (step < 2) return []
    return calculateCategoryAverages(transactions, categories, lookbackMonths)
  }, [transactions, categories, lookbackMonths, step])

  // Initialize budget items when moving to step 2
  const initializeBudgetItems = () => {
    const suggestions = suggestBudgetAmounts(categoryAverages, adjustmentPercent)

    const items: BudgetItemInput[] = categoryAverages.map(avg => ({
      categoryId: avg.categoryId,
      categoryName: avg.categoryName,
      parentCategoryName: avg.parentCategoryName,
      suggestedAmount: suggestions.get(avg.categoryId) || 0,
      budgetedAmount: suggestions.get(avg.categoryId) || 0,
      averageAmount: avg.averageAmount,
      isIncluded: true,
    }))

    // Add categories with no spending history
    const categoriesWithSpending = new Set(categoryAverages.map(a => a.categoryId))
    categories.forEach(cat => {
      if (!categoriesWithSpending.has(cat.id)) {
        items.push({
          categoryId: cat.id,
          categoryName: cat.name,
          parentCategoryName: cat.parent?.name || null,
          suggestedAmount: 0,
          budgetedAmount: 0,
          averageAmount: 0,
          isIncluded: false,
        })
      }
    })

    setBudgetItems(items)
  }

  const handleNext = () => {
    if (step === 1) {
      initializeBudgetItems()
    }
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleItemToggle = (categoryId: string) => {
    setBudgetItems(items =>
      items.map(item =>
        item.categoryId === categoryId
          ? { ...item, isIncluded: !item.isIncluded }
          : item
      )
    )
  }

  const handleAmountChange = (categoryId: string, amount: number) => {
    setBudgetItems(items =>
      items.map(item =>
        item.categoryId === categoryId
          ? { ...item, budgetedAmount: amount }
          : item
      )
    )
  }

  const handleApplyAdjustment = () => {
    const suggestions = suggestBudgetAmounts(categoryAverages, adjustmentPercent)
    setBudgetItems(items =>
      items.map(item => ({
        ...item,
        suggestedAmount: suggestions.get(item.categoryId) || item.suggestedAmount,
        budgetedAmount: item.isIncluded
          ? suggestions.get(item.categoryId) || item.budgetedAmount
          : item.budgetedAmount,
      }))
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const includedItems = budgetItems
      .filter(item => item.isIncluded && item.budgetedAmount > 0)
      .map(item => ({
        category_id: item.categoryId,
        budgeted_amount: item.budgetedAmount,
      }))

    if (includedItems.length === 0) {
      setError('Please include at least one category with a budget amount')
      setSubmitting(false)
      return
    }

    const result = await createBudget(
      budgetName,
      budgetMonth,
      budgetYear,
      lookbackMonths,
      includedItems
    )

    if (result.error) {
      setError(result.error)
    } else {
      onSuccess()
      onClose()
      // Reset wizard state
      setStep(1)
      setBudgetItems([])
    }

    setSubmitting(false)
  }

  const totalBudgeted = budgetItems
    .filter(item => item.isIncluded)
    .reduce((sum, item) => sum + item.budgetedAmount, 0)

  const includedCount = budgetItems.filter(item => item.isIncluded).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Create Budget</h2>
            <p className="text-sm text-gray-500">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2 bg-gray-50">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1">
                <div
                  className={`h-2 rounded-full ${
                    s <= step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Basic Info</span>
            <span>Categories</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Name
                </label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., January 2026 Budget"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    value={budgetYear}
                    onChange={(e) => setBudgetYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Historical Average Period
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Choose how many months of spending history to use for budget suggestions.
                </p>
                <div className="space-y-2">
                  {LOOKBACK_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 border rounded-md cursor-pointer ${
                        lookbackMonths === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="lookback"
                        value={option.value}
                        checked={lookbackMonths === option.value}
                        onChange={() => setLookbackMonths(option.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                      {lookbackMonths === option.value && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Category Budgets</h3>
                  <p className="text-sm text-gray-500">
                    Based on your last {lookbackMonths} months of spending
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Adjust by:</label>
                  <select
                    value={adjustmentPercent}
                    onChange={(e) => setAdjustmentPercent(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={-20}>-20%</option>
                    <option value={-10}>-10%</option>
                    <option value={0}>0%</option>
                    <option value={10}>+10%</option>
                    <option value={20}>+20%</option>
                  </select>
                  <button
                    onClick={handleApplyAdjustment}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
                {budgetItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No categories found. Please create categories first.
                  </div>
                ) : (
                  budgetItems.map((item) => (
                    <div
                      key={item.categoryId}
                      className={`p-3 ${item.isIncluded ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={item.isIncluded}
                            onChange={() => handleItemToggle(item.categoryId)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-medium text-sm">
                              {item.parentCategoryName
                                ? `${item.parentCategoryName} > ${item.categoryName}`
                                : item.categoryName}
                            </div>
                            {item.averageAmount > 0 && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Avg: {formatBudgetCurrency(item.averageAmount)}/mo
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">$</span>
                          <input
                            type="number"
                            value={item.budgetedAmount}
                            onChange={(e) =>
                              handleAmountChange(item.categoryId, Number(e.target.value))
                            }
                            disabled={!item.isIncluded}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right disabled:bg-gray-100 disabled:text-gray-400"
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Budget</span>
                  <span className="text-lg font-bold text-blue-700">
                    {formatBudgetCurrency(totalBudgeted)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {includedCount} categories included
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-3">Budget Summary</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Name</dt>
                    <dd className="font-medium">{budgetName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Period</dt>
                    <dd className="font-medium">
                      {getMonthName(budgetMonth)} {budgetYear}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Historical Basis</dt>
                    <dd className="font-medium">{lookbackMonths} months</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Total Budget</dt>
                    <dd className="font-medium text-blue-700">
                      {formatBudgetCurrency(totalBudgeted)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-medium mb-3">Category Breakdown</h3>
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {budgetItems
                    .filter(item => item.isIncluded && item.budgetedAmount > 0)
                    .sort((a, b) => b.budgetedAmount - a.budgetedAmount)
                    .map((item) => (
                      <div
                        key={item.categoryId}
                        className="p-3 flex justify-between items-center"
                      >
                        <span className="text-sm">
                          {item.parentCategoryName
                            ? `${item.parentCategoryName} > ${item.categoryName}`
                            : item.categoryName}
                        </span>
                        <span className="font-medium">
                          {formatBudgetCurrency(item.budgetedAmount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={submitting}
          >
            {step === 1 ? 'Cancel' : (
              <span className="flex items-center">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </span>
            )}
          </button>
          <button
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={submitting || (step === 1 && !budgetName.trim())}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {submitting ? (
              'Creating...'
            ) : step === 3 ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Create Budget
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
