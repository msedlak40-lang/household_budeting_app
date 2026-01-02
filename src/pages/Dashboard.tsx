import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useMembers } from '@/hooks/useMembers'
import { useAccounts } from '@/hooks/useAccounts'
import { useMemo, useState } from 'react'
import { isExpense, isIncome } from '@/lib/transactionUtils'
import { getDisplayVendor } from '@/lib/vendorNormalization'

type GroupBy = 'parent_category' | 'subcategory' | 'member' | 'vendor' | 'account'
type ChartType = 'line' | 'bar' | 'pie'

export default function Dashboard() {
  const { transactions, loading } = useTransactions()
  const { categories, getCategoryById } = useCategories()
  const { members } = useMembers()
  const { accounts } = useAccounts()

  const [groupBy, setGroupBy] = useState<GroupBy>('parent_category')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const [analysisDrillDown, setAnalysisDrillDown] = useState<{
    level1?: { type: string; id: string; name: string }
    level2?: { type: string; id: string; name: string }
    level3?: { type: string; id: string; name: string }
  } | null>(null)

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end
    })
  }, [transactions, startDate, endDate])

  // Analysis tab: Group transactions by selected dimension
  const groupedData = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; amount: number; count: number }>()

    filteredTransactions.forEach(t => {
      if (!isExpense(t)) return

      let groupKey = ''
      let groupName = ''

      switch (groupBy) {
        case 'parent_category':
          if (!t.category_id) return
          const category = getCategoryById(t.category_id)
          if (!category) return
          const parentId = category.parent_category_id || category.id
          const parent = getCategoryById(parentId)
          if (!parent) return
          groupKey = parentId
          groupName = parent.name
          break

        case 'subcategory':
          if (!t.category_id) return
          const cat = getCategoryById(t.category_id)
          if (!cat) return
          groupKey = t.category_id
          groupName = cat.parent_category_id ? cat.name : `${cat.name} (parent)`
          break

        case 'member':
          if (!t.member_id) return
          const member = members.find(m => m.id === t.member_id)
          if (!member) return
          groupKey = t.member_id
          groupName = member.name
          break

        case 'vendor':
          const displayVendor = getDisplayVendor(t)
          groupKey = displayVendor
          groupName = displayVendor
          break

        case 'account':
          const account = accounts.find(a => a.id === t.account_id)
          if (!account) return
          groupKey = t.account_id
          groupName = account.name
          break
      }

      const existing = groups.get(groupKey) || { id: groupKey, name: groupName, amount: 0, count: 0 }
      groups.set(groupKey, {
        id: groupKey,
        name: groupName,
        amount: existing.amount + Math.abs(t.amount),
        count: existing.count + 1,
      })
    })

    return Array.from(groups.values()).sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions, groupBy, getCategoryById, members, accounts])

  // Analysis tab: Calculate summary stats for filtered data
  const analysisStats = useMemo(() => {
    const expenses = filteredTransactions
      .filter(t => isExpense(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const income = filteredTransactions
      .filter(t => isIncome(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return {
      expenses,
      income,
      net: income - expenses,
      transactions: filteredTransactions.length,
    }
  }, [filteredTransactions])

  // Analysis tab: Calculate monthly trends
  const analysisMonthlyTrends = useMemo(() => {
    const monthMap = new Map<string, { expenses: number; income: number; net: number }>()

    filteredTransactions.forEach(t => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const existing = monthMap.get(monthKey) || { expenses: 0, income: 0, net: 0 }

      if (isExpense(t)) {
        existing.expenses += Math.abs(t.amount)
      } else if (isIncome(t)) {
        existing.income += Math.abs(t.amount)
      }

      existing.net = existing.income - existing.expenses
      monthMap.set(monthKey, existing)
    })

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ...data,
      }))
  }, [filteredTransactions])

  // Analysis tab: Drill-down data computation
  const analysisDrillDownData = useMemo(() => {
    if (!analysisDrillDown) return []

    const groups = new Map<string, { id: string; name: string; amount: number; count: number; type: string }>()

    // Filter transactions based on current drill-down level
    let relevantTransactions = filteredTransactions.filter(t => isExpense(t))

    // Apply filters based on drill-down levels
    if (analysisDrillDown.level1) {
      const { type, id } = analysisDrillDown.level1
      relevantTransactions = relevantTransactions.filter(t => {
        if (type === 'member') return t.member_id === id
        if (type === 'account') return t.account_id === id
        if (type === 'parent_category') {
          if (!t.category_id) return false
          const cat = getCategoryById(t.category_id)
          if (!cat) return false
          const parentId = cat.parent_category_id || cat.id
          return parentId === id
        }
        if (type === 'vendor') return getDisplayVendor(t) === id
        return false
      })
    }

    if (analysisDrillDown.level2) {
      const { type, id } = analysisDrillDown.level2
      relevantTransactions = relevantTransactions.filter(t => {
        if (type === 'parent_category') {
          if (!t.category_id) return false
          const cat = getCategoryById(t.category_id)
          if (!cat) return false
          const parentId = cat.parent_category_id || cat.id
          return parentId === id
        }
        if (type === 'subcategory') return t.category_id === id
        if (type === 'vendor') return getDisplayVendor(t) === id
        return false
      })
    }

    if (analysisDrillDown.level3) {
      const { type, id } = analysisDrillDown.level3
      relevantTransactions = relevantTransactions.filter(t => {
        if (type === 'subcategory') return t.category_id === id
        if (type === 'vendor') return getDisplayVendor(t) === id
        return false
      })
    }

    // Determine what to group by next
    let nextGroupType = ''
    if (!analysisDrillDown.level1) return []

    if (analysisDrillDown.level3) {
      // Level 3 exists, show vendors
      nextGroupType = 'vendor'
    } else if (analysisDrillDown.level2) {
      // Level 2 exists
      if (analysisDrillDown.level2.type === 'subcategory') {
        nextGroupType = 'vendor'
      } else if (analysisDrillDown.level2.type === 'parent_category') {
        nextGroupType = 'subcategory'
      }
    } else {
      // Only level 1 exists
      if (analysisDrillDown.level1.type === 'member' || analysisDrillDown.level1.type === 'account') {
        nextGroupType = 'parent_category'
      } else if (analysisDrillDown.level1.type === 'parent_category') {
        nextGroupType = 'subcategory'
      } else if (analysisDrillDown.level1.type === 'vendor') {
        nextGroupType = 'parent_category'
      }
    }

    // Group transactions by the next level
    relevantTransactions.forEach(t => {
      let groupKey = ''
      let groupName = ''
      let groupType = nextGroupType

      if (nextGroupType === 'parent_category') {
        if (!t.category_id) return
        const category = getCategoryById(t.category_id)
        if (!category) return
        const parentId = category.parent_category_id || category.id
        const parent = getCategoryById(parentId)
        if (!parent) return
        groupKey = parentId
        groupName = parent.name
      } else if (nextGroupType === 'subcategory') {
        if (!t.category_id) return
        const cat = getCategoryById(t.category_id)
        if (!cat) return
        // Only show actual subcategories, not parent categories
        if (!cat.parent_category_id) return
        groupKey = t.category_id
        groupName = cat.name
      } else if (nextGroupType === 'vendor') {
        const displayVendor = getDisplayVendor(t)
        groupKey = displayVendor
        groupName = displayVendor
      }

      if (!groupKey) return

      const existing = groups.get(groupKey) || { id: groupKey, name: groupName, amount: 0, count: 0, type: groupType }
      groups.set(groupKey, {
        id: groupKey,
        name: groupName,
        amount: existing.amount + Math.abs(t.amount),
        count: existing.count + 1,
        type: groupType
      })
    })

    return Array.from(groups.values()).sort((a, b) => b.amount - a.amount).slice(0, 20)
  }, [analysisDrillDown, filteredTransactions, getCategoryById])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const maxGroupAmount = Math.max(...groupedData.map(g => g.amount), 1)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Financial analysis and insights</p>
      </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Custom Analysis</h2>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="parent_category">Parent Category</option>
                  <option value="subcategory">Subcategory</option>
                  <option value="member">Member</option>
                  <option value="vendor">Vendor</option>
                  <option value="account">Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-sm text-red-600 uppercase font-medium">Total Expenses</div>
                <div className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(analysisStats.expenses)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-600 uppercase font-medium">Total Income</div>
                <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(analysisStats.income)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm text-blue-600 uppercase font-medium">Net Cash Flow</div>
                <div className={`text-2xl font-bold mt-1 ${analysisStats.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(analysisStats.net)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 uppercase font-medium">Transactions</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{analysisStats.transactions}</div>
              </div>
            </div>

            {/* Chart Display */}
            {groupedData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No expense data for this period. Try adjusting the date range or ensure transactions are categorized.
              </div>
            ) : chartType === 'bar' ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  Expenses by {groupBy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h3>
                {groupedData.slice(0, 15).map((group, index) => {
                  const percentage = (group.amount / analysisStats.expenses) * 100
                  const barWidth = (group.amount / maxGroupAmount) * 100

                  return (
                    <div
                      key={index}
                      className="border-b border-gray-100 pb-3 last:border-0 cursor-pointer hover:bg-gray-50 p-3 rounded-md transition-colors -mx-3"
                      onClick={() => {
                        // Start drill-down
                        setAnalysisDrillDown({
                          level1: { type: groupBy, id: group.id, name: group.name }
                        })
                      }}
                    >
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{group.name}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {formatCurrency(group.amount)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {group.count} transaction{group.count !== 1 ? 's' : ''} • Click to drill down
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart Visualization */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Distribution by {groupBy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <div className="relative" style={{ height: '300px' }}>
                    {/* Simple pie chart using conic-gradient */}
                    <div className="w-64 h-64 rounded-full mx-auto" style={{
                      background: `conic-gradient(${groupedData.slice(0, 8).map((group, i) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
                        const startPercentage = groupedData.slice(0, i).reduce((sum, g) => sum + (g.amount / analysisStats.expenses) * 100, 0)
                        const endPercentage = startPercentage + (group.amount / analysisStats.expenses) * 100
                        return `${colors[i]} ${startPercentage}% ${endPercentage}%`
                      }).join(', ')})`
                    }} />
                  </div>
                </div>

                {/* Legend */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Legend</h3>
                  <div className="space-y-2">
                    {groupedData.slice(0, 8).map((group, i) => {
                      const colors = ['bg-blue-600', 'bg-green-600', 'bg-amber-600', 'bg-red-600', 'bg-purple-600', 'bg-pink-600', 'bg-teal-600', 'bg-orange-600']
                      const percentage = (group.amount / analysisStats.expenses) * 100

                      return (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded ${colors[i]}`} />
                            <span className="text-sm text-gray-900">{group.name}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {formatCurrency(group.amount)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monthly Trends</h2>

            {analysisMonthlyTrends.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No data available for monthly trends
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex space-x-4 min-w-max pb-4">
                  {analysisMonthlyTrends.map((trend, index) => {
                    const maxAmount = Math.max(...analysisMonthlyTrends.map(t => Math.max(t.expenses, t.income)), 1)
                    const expenseHeight = (trend.expenses / maxAmount) * 200
                    const incomeHeight = (trend.income / maxAmount) * 200

                    return (
                      <div key={index} className="flex flex-col items-center space-y-2" style={{ width: '80px' }}>
                        {/* Chart */}
                        <div className="relative h-52 flex items-end justify-center space-x-1">
                          {/* Income bar */}
                          <div
                            className="w-6 bg-green-500 rounded-t relative group"
                            style={{ height: `${incomeHeight}px` }}
                          >
                            <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {formatCurrency(trend.income)}
                            </div>
                          </div>
                          {/* Expense bar */}
                          <div
                            className="w-6 bg-red-500 rounded-t relative group"
                            style={{ height: `${expenseHeight}px` }}
                          >
                            <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {formatCurrency(trend.expenses)}
                            </div>
                          </div>
                        </div>

                        {/* Month label */}
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
            )}
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Spending Days */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Spending by Day of Week</h2>
              {(() => {
                const dayMap = new Map<number, { day: string; amount: number; count: number }>()
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

                filteredTransactions.filter(t => isExpense(t)).forEach(t => {
                  const day = new Date(t.date).getDay()
                  const existing = dayMap.get(day) || { day: dayNames[day], amount: 0, count: 0 }
                  dayMap.set(day, {
                    day: dayNames[day],
                    amount: existing.amount + Math.abs(t.amount),
                    count: existing.count + 1,
                  })
                })

                const dayData = Array.from(dayMap.values()).sort((a, b) => b.amount - a.amount)
                const maxDayAmount = Math.max(...dayData.map(d => d.amount), 1)

                return dayData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No expense data</div>
                ) : (
                  <div className="space-y-3">
                    {dayData.map((day, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-medium text-gray-900">{day.day}</span>
                          <span className="text-sm text-gray-600">
                            {formatCurrency(day.amount)} ({day.count} tx)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full"
                            style={{ width: `${(day.amount / maxDayAmount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Average Transaction Size */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Transaction Insights</h2>
              {(() => {
                const expenses = filteredTransactions.filter(t => isExpense(t))
                const avgExpense = expenses.length > 0
                  ? expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0) / expenses.length
                  : 0

                const largestExpense = expenses.length > 0
                  ? expenses.reduce((max, t) => Math.abs(t.amount) > max ? Math.abs(t.amount) : max, 0)
                  : 0

                const smallestExpense = expenses.length > 0
                  ? expenses.reduce((min, t) => Math.abs(t.amount) < min ? Math.abs(t.amount) : min, Infinity)
                  : 0

                const medianExpense = expenses.length > 0
                  ? (() => {
                      const sorted = expenses.map(t => Math.abs(t.amount)).sort((a, b) => a - b)
                      const mid = Math.floor(sorted.length / 2)
                      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
                    })()
                  : 0

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Expense</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(avgExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Median Expense</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(medianExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Largest Expense</span>
                      <span className="text-lg font-bold text-red-600">{formatCurrency(largestExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Smallest Expense</span>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(smallestExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Total Expense Transactions</span>
                      <span className="text-lg font-bold text-gray-900">{expenses.length}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Analysis Drill-Down Modal */}
          {analysisDrillDown && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setAnalysisDrillDown(null)}
            >
              <div
                className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Breadcrumb and Back Button */}
                      {(analysisDrillDown.level2 || analysisDrillDown.level3) && (
                        <button
                          onClick={() => {
                            if (analysisDrillDown.level3) {
                              setAnalysisDrillDown({
                                level1: analysisDrillDown.level1,
                                level2: analysisDrillDown.level2
                              })
                            } else if (analysisDrillDown.level2) {
                              setAnalysisDrillDown({
                                level1: analysisDrillDown.level1
                              })
                            }
                          }}
                          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium mb-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span>Back</span>
                        </button>
                      )}

                      {/* Title showing current drill-down path */}
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">
                          {analysisDrillDown.level1.name}
                          {analysisDrillDown.level2 && ` → ${analysisDrillDown.level2.name}`}
                          {analysisDrillDown.level3 && ` → ${analysisDrillDown.level3.name}`}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {analysisDrillDown.level3?.name || analysisDrillDown.level2?.name || analysisDrillDown.level1.name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {analysisDrillDownData.length > 0
                            ? `Breakdown for selected period`
                            : 'No further breakdown available'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAnalysisDrillDown(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
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
                        {formatCurrency(analysisDrillDownData.reduce((sum, item) => sum + item.amount, 0))}
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 uppercase font-medium">Transactions</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">
                        {analysisDrillDownData.reduce((sum, item) => sum + item.count, 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto max-h-96 p-6">
                  {analysisDrillDownData.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No data available for further breakdown</p>
                  ) : (
                    <div className="space-y-3">
                      {analysisDrillDownData.map((item, index) => {
                        const totalAmount = analysisDrillDownData.reduce((sum, i) => sum + i.amount, 0)
                        const percentage = (item.amount / totalAmount) * 100
                        const maxAmount = Math.max(...analysisDrillDownData.map(i => i.amount), 1)
                        const barWidth = (item.amount / maxAmount) * 100

                        // Determine if this item can be drilled down further
                        const canDrillDown = item.type !== 'vendor'

                        return (
                          <div
                            key={index}
                            className={`border-b border-gray-100 pb-3 last:border-0 ${
                              canDrillDown ? 'cursor-pointer hover:bg-gray-50 p-3 rounded-md transition-colors -mx-3' : 'p-3'
                            }`}
                            onClick={() => {
                              if (!canDrillDown) return

                              // Add to drill-down path
                              if (!analysisDrillDown.level2) {
                                setAnalysisDrillDown({
                                  ...analysisDrillDown,
                                  level2: { type: item.type, id: item.id, name: item.name }
                                })
                              } else if (!analysisDrillDown.level3) {
                                setAnalysisDrillDown({
                                  ...analysisDrillDown,
                                  level3: { type: item.type, id: item.id, name: item.name }
                                })
                              }
                            }}
                          >
                            <div className="flex justify-between items-baseline mb-2">
                              <span className="text-sm font-medium text-gray-900">{item.name}</span>
                              <span className="text-sm text-gray-600">
                                {formatCurrency(item.amount)} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.count} transaction{item.count !== 1 ? 's' : ''}
                              {canDrillDown && ' • Click to drill down'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Showing {analysisDrillDownData.length} item{analysisDrillDownData.length !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => setAnalysisDrillDown(null)}
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
