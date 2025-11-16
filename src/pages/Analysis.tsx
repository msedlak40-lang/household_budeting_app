import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useMembers } from '@/hooks/useMembers'
import { useAccounts } from '@/hooks/useAccounts'
import { isExpense, isIncome } from '@/lib/transactionUtils'

type GroupBy = 'parent_category' | 'subcategory' | 'member' | 'vendor' | 'account'
type ChartType = 'line' | 'bar' | 'pie'

export default function Analysis() {
  const { transactions, loading } = useTransactions()
  const { categories, getCategoryById, getParentCategories } = useCategories()
  const { members } = useMembers()
  const { accounts } = useAccounts()

  // Chart Builder State
  const [groupBy, setGroupBy] = useState<GroupBy>('parent_category')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end
    })
  }, [transactions, startDate, endDate])

  // Group transactions by selected dimension
  const groupedData = useMemo(() => {
    const groups = new Map<string, { name: string; amount: number; count: number }>()

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
          groupKey = t.vendor || t.description
          groupName = t.vendor || t.description
          break

        case 'account':
          const account = accounts.find(a => a.id === t.account_id)
          if (!account) return
          groupKey = t.account_id
          groupName = account.name
          break
      }

      const existing = groups.get(groupKey) || { name: groupName, amount: 0, count: 0 }
      groups.set(groupKey, {
        name: groupName,
        amount: existing.amount + Math.abs(t.amount),
        count: existing.count + 1,
      })
    })

    return Array.from(groups.values()).sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions, groupBy, getCategoryById, members, accounts])

  // Calculate summary stats
  const stats = useMemo(() => {
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

  // Calculate monthly trends
  const monthlyTrends = useMemo(() => {
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

  const maxGroupAmount = Math.max(...groupedData.map(g => g.amount), 1)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading analysis...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Spending Analysis</h1>
        <p className="text-gray-600 mt-1">Deep dive into your spending patterns with flexible analysis tools</p>
      </div>

      {/* Flexible Chart Builder */}
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
            <div className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(stats.expenses)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 uppercase font-medium">Total Income</div>
            <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(stats.income)}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 uppercase font-medium">Net Cash Flow</div>
            <div className={`text-2xl font-bold mt-1 ${stats.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(stats.net)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 uppercase font-medium">Transactions</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.transactions}</div>
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
              const percentage = (group.amount / stats.expenses) * 100
              const barWidth = (group.amount / maxGroupAmount) * 100

              return (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
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
                    {group.count} transaction{group.count !== 1 ? 's' : ''}
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
                    const startPercentage = groupedData.slice(0, i).reduce((sum, g) => sum + (g.amount / stats.expenses) * 100, 0)
                    const endPercentage = startPercentage + (group.amount / stats.expenses) * 100
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
                  const percentage = (group.amount / stats.expenses) * 100

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

        {monthlyTrends.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No data available for monthly trends
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-4">
              {monthlyTrends.map((trend, index) => {
                const maxAmount = Math.max(...monthlyTrends.map(t => Math.max(t.expenses, t.income)), 1)
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
    </div>
  )
}
