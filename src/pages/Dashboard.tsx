import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useMemo, useState } from 'react'
import { isExpense, isIncome } from '@/lib/transactionUtils'

export default function Dashboard() {
  const { transactions, loading } = useTransactions()
  const { categories, getCategoryDisplayName, getCategoryById, getSubcategories } = useCategories()

  // State for selected month/year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  // State for category drill-down modal
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)

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
      .filter(t => isExpense(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const income = currentMonthTransactions
      .filter(t => isIncome(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const uncategorized = transactions.filter(t => !t.category_id).length

    return {
      expenses,
      income,
      net: income - expenses,
      uncategorized,
    }
  }, [currentMonthTransactions, transactions])

  // Group by PARENT category only for current month
  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, { id: string; name: string; amount: number; count: number }>()

    const categorizedExpenses = currentMonthTransactions.filter(t => isExpense(t) && t.category_id)
    console.log('[Dashboard] Current month categorized expenses:', categorizedExpenses.length)
    console.log('[Dashboard] Sample categorized expense:', categorizedExpenses[0])

    categorizedExpenses.forEach(t => {
        const category = getCategoryById(t.category_id)
        if (!category) {
          console.log('[Dashboard] Category not found for transaction:', t.category_id)
          return
        }

        // Get the parent category (or the category itself if it has no parent)
        const parentCategoryId = category.parent_category_id || category.id
        const parentCategory = getCategoryById(parentCategoryId)
        if (!parentCategory) return

        const existing = breakdown.get(parentCategoryId) || {
          id: parentCategoryId,
          name: parentCategory.name,
          amount: 0,
          count: 0
        }
        breakdown.set(parentCategoryId, {
          id: parentCategoryId,
          name: parentCategory.name,
          amount: existing.amount + Math.abs(t.amount),
          count: existing.count + 1,
        })
      })

    const result = Array.from(breakdown.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10) // Top 10 parent categories

    console.log('[Dashboard] Category breakdown:', result)
    return result
  }, [currentMonthTransactions, categories, getCategoryById])

  // Get subcategory breakdown for selected parent category
  const subcategoryBreakdown = useMemo(() => {
    if (!selectedCategoryId || selectedSubcategoryId) return []

    const breakdown = new Map<string, { id: string; name: string; amount: number; count: number }>()
    const subcategories = getSubcategories(selectedCategoryId)

    // Get all transactions for this parent category
    currentMonthTransactions.forEach(t => {
      if (!isExpense(t) || !t.category_id) return

      const category = getCategoryById(t.category_id)
      if (!category) return

      // Check if this transaction belongs to the selected parent category
      const parentCategoryId = category.parent_category_id || category.id
      if (parentCategoryId !== selectedCategoryId) return

      // If it's a subcategory, group by subcategory
      // If it's directly assigned to parent, use parent
      const groupId = category.parent_category_id ? category.id : selectedCategoryId
      const groupCategory = getCategoryById(groupId)
      if (!groupCategory) return

      const existing = breakdown.get(groupId) || {
        id: groupId,
        name: groupCategory.name,
        amount: 0,
        count: 0
      }
      breakdown.set(groupId, {
        id: groupId,
        name: groupCategory.name,
        amount: existing.amount + Math.abs(t.amount),
        count: existing.count + 1,
      })
    })

    return Array.from(breakdown.values())
      .sort((a, b) => b.amount - a.amount)
  }, [selectedCategoryId, selectedSubcategoryId, currentMonthTransactions, getSubcategories, getCategoryById])

  // Get vendor breakdown for selected subcategory
  const vendorBreakdown = useMemo(() => {
    if (!selectedSubcategoryId) return []

    const vendorMap = new Map<string, { vendor: string; amount: number; count: number }>()

    // Get all transactions for this subcategory in the current month
    const categoryTransactions = currentMonthTransactions.filter(
      t => t.category_id === selectedSubcategoryId && isExpense(t)
    )

    categoryTransactions.forEach(t => {
      const vendor = t.vendor || t.description || 'Unknown'
      const existing = vendorMap.get(vendor) || { vendor, amount: 0, count: 0 }
      vendorMap.set(vendor, {
        vendor,
        amount: existing.amount + Math.abs(t.amount),
        count: existing.count + 1,
      })
    })

    return Array.from(vendorMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20) // Top 20 vendors
  }, [selectedSubcategoryId, currentMonthTransactions])

  const selectedParentCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return categoryBreakdown.find(c => c.id === selectedCategoryId)
  }, [selectedCategoryId, categoryBreakdown])

  const selectedSubcategory = useMemo(() => {
    if (!selectedSubcategoryId) return null
    return subcategoryBreakdown.find(c => c.id === selectedSubcategoryId)
  }, [selectedSubcategoryId, subcategoryBreakdown])

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
        .filter(t => isExpense(t))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const income = monthTransactions
        .filter(t => isIncome(t))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

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
                const subcategories = getSubcategories(category.id)
                const hasSubcategories = subcategories.length > 0

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedCategoryId(category.id)
                      setSelectedSubcategoryId(null)
                    }}
                    className="cursor-pointer hover:bg-gray-50 p-3 rounded-md transition-colors -mx-3"
                  >
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
                    <div className="text-xs text-gray-500 mt-0.5">
                      {category.count} transaction{category.count !== 1 ? 's' : ''} • Click to see {hasSubcategories ? 'subcategories' : 'details'}
                    </div>
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
                {currentMonthTransactions.filter(t => isExpense(t)).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Income Transactions:</span>
              <span className="font-semibold text-green-600">
                {currentMonthTransactions.filter(t => isIncome(t)).length}
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

      {/* Category Drill-Down Modal (3 levels: Parent → Subcategories → Vendors) */}
      {selectedCategoryId && selectedParentCategory && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedCategoryId(null)
            setSelectedSubcategoryId(null)
          }}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  {selectedSubcategoryId && selectedSubcategory ? (
                    <>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                        <button
                          onClick={() => setSelectedSubcategoryId(null)}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {selectedParentCategory.name}
                        </button>
                        <span>→</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedSubcategory.name}</h2>
                      <p className="text-sm text-gray-600 mt-1">Top vendors for {currentMonthName}</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedParentCategory.name}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {subcategoryBreakdown.length > 0 ? `Subcategories for ${currentMonthName}` : `Top vendors for ${currentMonthName}`}
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCategoryId(null)
                    setSelectedSubcategoryId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Summary */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase font-medium">Total Spent</div>
                  <div className="text-xl font-bold text-red-600 mt-1">
                    {formatCurrency(selectedSubcategory ? selectedSubcategory.amount : selectedParentCategory.amount)}
                  </div>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase font-medium">Transactions</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">
                    {selectedSubcategory ? selectedSubcategory.count : selectedParentCategory.count}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body - Show subcategories OR vendors */}
            <div className="overflow-y-auto max-h-96 p-6">
              {selectedSubcategoryId ? (
                // Show vendors for selected subcategory
                vendorBreakdown.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No vendor data available</p>
                ) : (
                  <div className="space-y-3">
                    {vendorBreakdown.map((vendor, index) => {
                      const percentage = selectedSubcategory ? (vendor.amount / selectedSubcategory.amount) * 100 : 0
                      const maxAmount = Math.max(...vendorBreakdown.map(v => v.amount), 1)
                      const barWidth = (vendor.amount / maxAmount) * 100

                      return (
                        <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-sm font-medium text-gray-900">{vendor.vendor}</span>
                            <span className="text-sm text-gray-600">
                              {formatCurrency(vendor.amount)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {vendor.count} transaction{vendor.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : subcategoryBreakdown.length > 0 ? (
                // Show subcategories for parent category
                <div className="space-y-3">
                  {subcategoryBreakdown.map((subcat, index) => {
                    const percentage = (subcat.amount / selectedParentCategory.amount) * 100
                    const maxAmount = Math.max(...subcategoryBreakdown.map(s => s.amount), 1)
                    const barWidth = (subcat.amount / maxAmount) * 100

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedSubcategoryId(subcat.id)}
                        className="border-b border-gray-100 pb-3 last:border-0 cursor-pointer hover:bg-gray-50 p-3 rounded-md transition-colors -mx-3"
                      >
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-sm font-medium text-gray-900">{subcat.name}</span>
                          <span className="text-sm text-gray-600">
                            {formatCurrency(subcat.amount)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {subcat.count} transaction{subcat.count !== 1 ? 's' : ''} • Click to see vendors
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Parent has no subcategories - this shouldn't normally happen with the current logic
                <p className="text-gray-500 text-center py-8">No data available</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {selectedSubcategoryId ? (
                    <>Showing top {vendorBreakdown.length} vendor{vendorBreakdown.length !== 1 ? 's' : ''}</>
                  ) : subcategoryBreakdown.length > 0 ? (
                    <>Showing {subcategoryBreakdown.length} subcategor{subcategoryBreakdown.length !== 1 ? 'ies' : 'y'}</>
                  ) : (
                    <>No data</>
                  )}
                </p>
                <button
                  onClick={() => {
                    setSelectedCategoryId(null)
                    setSelectedSubcategoryId(null)
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
