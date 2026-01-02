import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import {
  getBudgetVsActual,
  calculateCategoryAverages,
  getMonthName,
  formatBudgetCurrency,
} from '@/lib/budgetCalculations'
import BudgetVsActualChart from '@/components/budgets/BudgetVsActualChart'

export default function BudgetAnalysis() {
  const { budgetTemplates, loading } = useBudgets()
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const [monthsToShow, setMonthsToShow] = useState(6)
  const [lookbackForAverages, setLookbackForAverages] = useState<number>(6)

  // Get budget vs actual data
  const budgetVsActual = useMemo(() => {
    return getBudgetVsActual(budgetTemplates, transactions, categories, monthsToShow)
  }, [budgetTemplates, transactions, categories, monthsToShow])

  // Calculate category averages for insights
  const categoryAverages = useMemo(() => {
    return calculateCategoryAverages(transactions, categories, lookbackForAverages)
  }, [transactions, categories, lookbackForAverages])

  // Summary stats
  const summaryStats = useMemo(() => {
    const monthsWithBudgets = budgetVsActual.filter(m => m.budgetedTotal > 0)

    if (monthsWithBudgets.length === 0) {
      return {
        avgBudgeted: 0,
        avgActual: 0,
        avgVariance: 0,
        totalOverBudget: 0,
        totalUnderBudget: 0,
        budgetAccuracy: 0,
      }
    }

    const totalBudgeted = monthsWithBudgets.reduce((sum, m) => sum + m.budgetedTotal, 0)
    const totalActual = monthsWithBudgets.reduce((sum, m) => sum + m.actualTotal, 0)

    const overBudgetMonths = monthsWithBudgets.filter(m => m.actualTotal > m.budgetedTotal)
    const underBudgetMonths = monthsWithBudgets.filter(m => m.actualTotal <= m.budgetedTotal)

    return {
      avgBudgeted: totalBudgeted / monthsWithBudgets.length,
      avgActual: totalActual / monthsWithBudgets.length,
      avgVariance: (totalBudgeted - totalActual) / monthsWithBudgets.length,
      totalOverBudget: overBudgetMonths.length,
      totalUnderBudget: underBudgetMonths.length,
      budgetAccuracy: (underBudgetMonths.length / monthsWithBudgets.length) * 100,
    }
  }, [budgetVsActual])

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading analysis...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/budgets"
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Budget Analysis</h1>
          <p className="text-gray-500">Compare budgets vs actual spending over time</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <select
              value={monthsToShow}
              onChange={(e) => setMonthsToShow(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Average Basis
            </label>
            <select
              value={lookbackForAverages}
              onChange={(e) => setLookbackForAverages(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Avg Monthly Budget</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatBudgetCurrency(summaryStats.avgBudgeted)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Avg Monthly Spending</div>
          <div className="text-2xl font-bold text-green-600">
            {formatBudgetCurrency(summaryStats.avgActual)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Avg Monthly Variance</div>
          <div className={`text-2xl font-bold ${summaryStats.avgVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summaryStats.avgVariance >= 0 ? '+' : ''}{formatBudgetCurrency(summaryStats.avgVariance)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Budget Success Rate</div>
          <div className="text-2xl font-bold">
            {Math.round(summaryStats.budgetAccuracy)}%
          </div>
          <div className="text-xs text-gray-500">
            {summaryStats.totalUnderBudget} of {summaryStats.totalUnderBudget + summaryStats.totalOverBudget} months
          </div>
        </div>
      </div>

      {/* Budget vs Actual Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Budget vs Actual Spending</h2>
        <BudgetVsActualChart data={budgetVsActual} />
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Monthly Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budgeted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budgetVsActual.map((month) => (
                <tr key={month.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      {month.monthYear}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {month.budgetedTotal > 0 ? formatBudgetCurrency(month.budgetedTotal) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {formatBudgetCurrency(month.actualTotal)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right ${
                    month.variance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {month.budgetedTotal > 0 ? (
                      <>
                        {month.variance >= 0 ? '+' : ''}{formatBudgetCurrency(month.variance)}
                        <span className="text-xs ml-1">({month.variancePercent.toFixed(1)}%)</span>
                      </>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {month.budgetedTotal > 0 ? (
                      month.variance >= 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Under
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Over
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        No Budget
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Spending Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Top Spending Categories</h2>
            <p className="text-sm text-gray-500">Based on {lookbackForAverages} month average</p>
          </div>
          <div className="p-6">
            {categoryAverages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No spending data available</p>
            ) : (
              <div className="space-y-4">
                {categoryAverages.slice(0, 5).map((cat, index) => {
                  const maxAmount = categoryAverages[0].averageAmount
                  const percentage = (cat.averageAmount / maxAmount) * 100

                  return (
                    <div key={cat.categoryId}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium">
                          {cat.parentCategoryName
                            ? `${cat.parentCategoryName} > ${cat.categoryName}`
                            : cat.categoryName}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatBudgetCurrency(cat.averageAmount)}/mo
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Insights</h2>
          </div>
          <div className="p-6 space-y-4">
            {summaryStats.avgVariance >= 0 ? (
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-md">
                <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-800">Staying Under Budget</div>
                  <div className="text-sm text-green-700">
                    You're saving an average of {formatBudgetCurrency(summaryStats.avgVariance)} per month.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-md">
                <TrendingUp className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-800">Over Budget Trend</div>
                  <div className="text-sm text-red-700">
                    You're overspending an average of {formatBudgetCurrency(Math.abs(summaryStats.avgVariance))} per month.
                  </div>
                </div>
              </div>
            )}

            {categoryAverages.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="font-medium text-blue-800">Highest Spending Category</div>
                <div className="text-sm text-blue-700">
                  {categoryAverages[0].categoryName} averages {formatBudgetCurrency(categoryAverages[0].averageAmount)}/month
                </div>
              </div>
            )}

            {summaryStats.budgetAccuracy < 50 && summaryStats.totalUnderBudget + summaryStats.totalOverBudget > 0 && (
              <div className="p-3 bg-yellow-50 rounded-md">
                <div className="font-medium text-yellow-800">Budget Adjustment Suggested</div>
                <div className="text-sm text-yellow-700">
                  Consider reviewing your budget amounts - you're staying under budget less than half the time.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
