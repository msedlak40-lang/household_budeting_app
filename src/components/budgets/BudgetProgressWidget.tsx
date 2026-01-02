import { Link } from 'react-router-dom'
import { TrendingUp, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'
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

export default function BudgetProgressWidget() {
  const { budgetTemplates, loading } = useBudgets()
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const now = new Date()
  const currentMonthBudget = budgetTemplates.find(
    b => b.month === now.getMonth() + 1 && b.year === now.getFullYear() && b.is_active
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!currentMonthBudget) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Budget Status</h2>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-center py-4">
          <p className="text-gray-500 mb-3">No budget set for {getMonthName(now.getMonth() + 1)}</p>
          <Link
            to="/budgets"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Create Budget
          </Link>
        </div>
      </div>
    )
  }

  const progress = getBudgetProgress(currentMonthBudget, transactions, categories)
  const progressColor = getBudgetProgressColor(progress.percentUsed)
  const daysRemaining = getDaysRemainingInMonth(currentMonthBudget.month, currentMonthBudget.year)
  const dailyBudget = getDailyBudgetRemaining(progress.totalRemaining, daysRemaining)

  const colorClasses = {
    green: { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50' },
    red: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' },
  }

  const colors = colorClasses[progressColor]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {getMonthName(currentMonthBudget.month)} Budget
        </h2>
        <Link
          to={`/budgets/${currentMonthBudget.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          View Details
        </Link>
      </div>

      {/* Main progress */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-2xl font-bold">
            {formatBudgetCurrency(progress.totalSpent)}
          </span>
          <span className="text-gray-500">
            of {formatBudgetCurrency(progress.totalBudgeted)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full ${colors.bg}`}
            style={{ width: `${Math.min(100, progress.percentUsed)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className={colors.text}>
            {Math.round(progress.percentUsed)}% used
          </span>
          <span className={progress.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}>
            {progress.totalRemaining >= 0 ? '+' : ''}{formatBudgetCurrency(progress.totalRemaining)} remaining
          </span>
        </div>
      </div>

      {/* Daily budget */}
      {daysRemaining > 0 && progress.totalRemaining > 0 && (
        <div className={`${colors.light} rounded-md p-3 mb-4`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Daily Budget</span>
            <span className={`font-semibold ${colors.text}`}>
              {formatBudgetCurrency(dailyBudget)}/day
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {daysRemaining} days remaining this month
          </div>
        </div>
      )}

      {/* Status indicators */}
      {progress.overBudgetCategories.length > 0 ? (
        <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-md border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-800">
              {progress.overBudgetCategories.length} categories over budget
            </div>
            <div className="text-xs text-red-600 mt-1">
              {progress.overBudgetCategories.slice(0, 2).map(c => c.categoryName).join(', ')}
              {progress.overBudgetCategories.length > 2 && ` +${progress.overBudgetCategories.length - 2} more`}
            </div>
          </div>
        </div>
      ) : progress.percentUsed < 80 ? (
        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-md border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="text-sm text-green-800">
            On track! All categories within budget
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-md border border-yellow-200">
          <TrendingUp className="w-5 h-5 text-yellow-600" />
          <div className="text-sm text-yellow-800">
            Approaching budget limit - watch your spending
          </div>
        </div>
      )}

      {/* Top spending categories */}
      {progress.itemProgress.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Top Categories</div>
          <div className="space-y-2">
            {progress.itemProgress.slice(0, 3).map((item) => (
              <div key={item.categoryId} className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <div className="text-sm text-gray-800 truncate">{item.categoryName}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.isOverBudget ? 'bg-red-500' :
                        item.percentUsed >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${item.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                    {Math.round(item.percentUsed)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
