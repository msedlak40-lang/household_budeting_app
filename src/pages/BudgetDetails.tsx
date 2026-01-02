import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Copy, Trash2, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import {
  getBudgetProgress,
  getMonthName,
  formatBudgetCurrency,
  getBudgetProgressColor,
  getDaysRemainingInMonth,
  getDailyBudgetRemaining,
} from '@/lib/budgetCalculations'
import BudgetEditModal from '@/components/budgets/BudgetEditModal'

export default function BudgetDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { budgetTemplates, loading, error, deleteBudget, copyBudgetToMonth, refetch } = useBudgets()
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyMonth, setCopyMonth] = useState(new Date().getMonth() + 1)
  const [copyYear, setCopyYear] = useState(new Date().getFullYear())

  const budget = budgetTemplates.find(b => b.id === id)

  const progress = useMemo(() => {
    if (!budget) return null
    return getBudgetProgress(budget, transactions, categories)
  }, [budget, transactions, categories])

  const handleDelete = async () => {
    if (!budget) return
    if (!confirm(`Are you sure you want to delete "${budget.name}"? This cannot be undone.`)) {
      return
    }
    const result = await deleteBudget(budget.id)
    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      navigate('/budgets')
    }
  }

  const handleCopy = async () => {
    if (!budget) return
    const result = await copyBudgetToMonth(budget.id, copyMonth, copyYear)
    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      setShowCopyModal(false)
      navigate(`/budgets/${result.data?.id}`)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading budget...</div>
      </div>
    )
  }

  if (error || !budget || !progress) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          {error || 'Budget not found'}
        </div>
        <Link to="/budgets" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Budgets
        </Link>
      </div>
    )
  }

  const progressColor = getBudgetProgressColor(progress.percentUsed)
  const now = new Date()
  const isCurrentMonth = budget.month === now.getMonth() + 1 && budget.year === now.getFullYear()
  const daysRemaining = getDaysRemainingInMonth(budget.month, budget.year)
  const dailyBudget = getDailyBudgetRemaining(progress.totalRemaining, daysRemaining)

  const colorClasses = {
    green: { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50' },
    red: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' },
  }

  const colors = colorClasses[progressColor]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/budgets"
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{budget.name}</h1>
            <div className="flex items-center space-x-2 text-gray-500">
              <span>{getMonthName(budget.month)} {budget.year}</span>
              {isCurrentMonth && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  Current
                </span>
              )}
              {!budget.is_active && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 hover:bg-gray-100 rounded-md"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCopyModal(true)}
            className="p-2 hover:bg-gray-100 rounded-md"
            title="Copy to new month"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-100 text-red-600 rounded-md"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Budgeted</div>
          <div className="text-2xl font-bold">{formatBudgetCurrency(progress.totalBudgeted)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Spent</div>
          <div className="text-2xl font-bold">{formatBudgetCurrency(progress.totalSpent)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Remaining</div>
          <div className={`text-2xl font-bold ${progress.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatBudgetCurrency(progress.totalRemaining)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Progress</div>
          <div className={`text-2xl font-bold ${colors.text}`}>
            {Math.round(progress.percentUsed)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Overall Progress</span>
          <span className="text-sm text-gray-500">{budget.lookback_months} month average basis</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div
            className={`h-4 rounded-full ${colors.bg}`}
            style={{ width: `${Math.min(100, progress.percentUsed)}%` }}
          />
        </div>

        {/* Status and Daily Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          {progress.overBudgetCategories.length > 0 ? (
            <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-md border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">
                  {progress.overBudgetCategories.length} categories over budget
                </div>
              </div>
            </div>
          ) : progress.percentUsed < 80 ? (
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-md border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="text-green-800">All categories within budget</div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
              <div className="text-yellow-800">Approaching budget limit</div>
            </div>
          )}

          {/* Daily Budget */}
          {isCurrentMonth && daysRemaining > 0 && progress.totalRemaining > 0 && (
            <div className={`p-3 rounded-md border ${colors.light}`}>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Daily Budget</span>
                <span className={`font-bold ${colors.text}`}>
                  {formatBudgetCurrency(dailyBudget)}/day
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {daysRemaining} days remaining
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Category Breakdown</h2>
        </div>

        {progress.itemProgress.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No categories in this budget
          </div>
        ) : (
          <div className="divide-y">
            {progress.itemProgress.map((item) => {
              const itemColor = item.isOverBudget ? 'red' :
                item.percentUsed >= 80 ? 'yellow' :
                item.percentUsed >= 50 ? 'blue' : 'green'

              const itemColorClasses = colorClasses[itemColor]

              return (
                <div key={item.categoryId} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">
                        {item.parentCategoryName
                          ? `${item.parentCategoryName} > ${item.categoryName}`
                          : item.categoryName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatBudgetCurrency(item.actualAmount)} of {formatBudgetCurrency(item.budgetedAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${itemColorClasses.text}`}>
                        {Math.round(item.percentUsed)}%
                      </div>
                      <div className={`text-sm ${item.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.remainingAmount >= 0 ? '+' : ''}{formatBudgetCurrency(item.remainingAmount)}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${itemColorClasses.bg}`}
                      style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                    />
                  </div>
                  {item.isOverBudget && (
                    <div className="mt-2 text-xs text-red-600 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Over budget by {formatBudgetCurrency(Math.abs(item.remainingAmount))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <BudgetEditModal
          budget={budget}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={refetch}
        />
      )}

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Copy Budget to New Month</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={copyMonth}
                  onChange={(e) => setCopyMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  value={copyYear}
                  onChange={(e) => setCopyYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Copy Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
