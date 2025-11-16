import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useMemo, useState } from 'react'

export default function Dashboard() {
  const { transactions, loading } = useTransactions()
  const { categories, getCategoryDisplayName } = useCategories()

  // State for selected month/year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  // Debug: Log transactions to see what we have
  console.log('[Dashboard] Total transactions:', transactions.length)
  console.log('[Dashboard] Categorized transactions:', transactions.filter(t => t.category_id).length)
  console.log('[Dashboard] Sample transaction:', transactions[0])
  console.log('[Dashboard] Selected period:', selectedYear, selectedMonth)

  // Get current month transactions (based on selected period)
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === selectedMonth && transactionDate.getFullYear() === selectedYear
    })
  }, [transactions, selectedMonth, selectedYear])

  // Calculate summary stats
  const stats = useMemo(() => {
    const expenses = currentMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const income = currentMonthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const uncategorized = transactions.filter(t => !t.category_id).length

    return {
      expenses,
      income,
      net: income - expenses,
      uncategorized,
    }
  }, [currentMonthTransactions, transactions])

  // Group by category for current month
  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, { name: string; amount: number; count: number }>()

    const categorizedExpenses = currentMonthTransactions.filter(t => t.amount < 0 && t.category_id)
    console.log('[Dashboard] Current month categorized expenses:', categorizedExpenses.length)
    console.log('[Dashboard] Sample categorized expense:', categorizedExpenses[0])

    categorizedExpenses.forEach(t => {
        const category = categories.find(c => c.id === t.category_id)
        if (!category) {
          console.log('[Dashboard] Category not found for transaction:', t.category_id)
          return
        }

        const categoryName = getCategoryDisplayName(category)
        const existing = breakdown.get(t.category_id) || { name: categoryName, amount: 0, count: 0 }
        breakdown.set(t.category_id, {
          name: categoryName,
          amount: existing.amount + Math.abs(t.amount),
          count: existing.count + 1,
        })
      })

    const result = Array.from(breakdown.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10) // Top 10 categories

    console.log('[Dashboard] Category breakdown:', result)
    return result
  }, [currentMonthTransactions, categories, getCategoryDisplayName])

  // Monthly trends (last 6 months)
  const monthlyTrends = useMemo(() => {
    const trends: Array<{ month: string; expenses: number; income: number }> = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = date.getMonth()
      const year = date.getFullYear()

      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate.getMonth() === month && transactionDate.getFullYear() === year
      })

      const expenses = monthTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const income = monthTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)

      trends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        expenses,
        income,
      })
    }

    return trends
  }, [transactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const maxCategoryAmount = Math.max(...categoryBreakdown.map(c => c.amount), 1)
  const maxMonthlyAmount = Math.max(...monthlyTrends.map(m => Math.max(m.expenses, m.income)), 1)

  const currentMonthName = new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Financial overview and analysis</p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>January</option>
            <option value={1}>February</option>
            <option value={2}>March</option>
            <option value={3}>April</option>
            <option value={4}>May</option>
            <option value={5}>June</option>
            <option value={6}>July</option>
            <option value={7}>August</option>
            <option value={8}>September</option>
            <option value={9}>October</option>
            <option value={10}>November</option>
            <option value={11}>December</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Period Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm font-medium text-blue-900">
          Viewing: <span className="font-bold">{currentMonthName}</span>
          {currentMonthTransactions.length === 0 && (
            <span className="ml-2 text-blue-700">(No transactions for this period)</span>
          )}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase font-medium">Expenses</div>
          <div className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(stats.expenses)}</div>
          <div className="text-xs text-gray-500 mt-1">Selected period</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase font-medium">Income</div>
          <div className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(stats.income)}</div>
          <div className="text-xs text-gray-500 mt-1">Selected period</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase font-medium">Net Cash Flow</div>
          <div className={`text-2xl font-bold mt-2 ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.net)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Selected period</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase font-medium">Uncategorized</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.uncategorized}</div>
          <div className="text-xs text-gray-500 mt-1">Transactions</div>
        </div>
      </div>

      {/* Spending by Category */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Spending by Category</h2>
          <p className="text-sm text-gray-500 mt-1">Top categories for {currentMonthName}</p>
        </div>
        <div className="p-6">
          {categoryBreakdown.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No categorized expenses for this period</p>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map((category, index) => {
                const percentage = (category.amount / stats.expenses) * 100
                const barWidth = (category.amount / maxCategoryAmount) * 100

                return (
                  <div key={index}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      <span className="text-sm text-gray-600">
                        {formatCurrency(category.amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{category.count} transaction{category.count !== 1 ? 's' : ''}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Transactions:</span>
              <span className="font-semibold">{currentMonthTransactions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expense Transactions:</span>
              <span className="font-semibold text-red-600">
                {currentMonthTransactions.filter(t => t.amount < 0).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Income Transactions:</span>
              <span className="font-semibold text-green-600">
                {currentMonthTransactions.filter(t => t.amount > 0).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Transaction:</span>
              <span className="font-semibold">
                {formatCurrency(
                  currentMonthTransactions.length > 0
                    ? currentMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / currentMonthTransactions.length
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">All Time Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Transactions:</span>
              <span className="font-semibold">{transactions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Categories Used:</span>
              <span className="font-semibold">{categories.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uncategorized:</span>
              <span className="font-semibold text-orange-600">{stats.uncategorized}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Categorization Rate:</span>
              <span className="font-semibold">
                {transactions.length > 0
                  ? ((transactions.filter(t => t.category_id).length / transactions.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">6-Month Trend</h2>
          <p className="text-sm text-gray-500 mt-1">Income vs. Expenses over time</p>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between space-x-2 h-64">
            {monthlyTrends.map((trend, index) => {
              const expenseHeight = (trend.expenses / maxMonthlyAmount) * 100
              const incomeHeight = (trend.income / maxMonthlyAmount) * 100

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex justify-center items-end space-x-1 flex-1 mb-2">
                    {/* Income Bar */}
                    <div className="w-1/2 flex flex-col justify-end items-center">
                      {trend.income > 0 && (
                        <div className="relative group">
                          <div
                            className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors min-w-[20px]"
                            style={{ height: `${Math.max(incomeHeight, 5)}%` }}
                          />
                          <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {formatCurrency(trend.income)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expense Bar */}
                    <div className="w-1/2 flex flex-col justify-end items-center">
                      {trend.expenses > 0 && (
                        <div className="relative group">
                          <div
                            className="w-full bg-red-500 rounded-t hover:bg-red-600 transition-colors min-w-[20px]"
                            style={{ height: `${Math.max(expenseHeight, 5)}%` }}
                          />
                          <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {formatCurrency(trend.expenses)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Month Label */}
                  <div className="text-xs text-gray-600 font-medium">{trend.month}</div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Income</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Expenses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
