import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useMembers } from '@/hooks/useMembers'
import { useAccounts } from '@/hooks/useAccounts'
import { useMemo, useState } from 'react'
import { isExpense, isIncome } from '@/lib/transactionUtils'

type TabType = 'overview' | 'analysis'
type GroupBy = 'parent_category' | 'subcategory' | 'member' | 'vendor' | 'account'
type ChartType = 'line' | 'bar' | 'pie'

export default function Dashboard() {
  const { transactions, loading } = useTransactions()
  const { categories, getCategoryDisplayName, getCategoryById, getSubcategories, getParentCategories } = useCategories()
  const { members } = useMembers()
  const { accounts } = useAccounts()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // State for selected month/year (Overview tab)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  // Analysis tab state
  const [groupBy, setGroupBy] = useState<GroupBy>('parent_category')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // State for category drill-down modal (Overview tab)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)

  // State for Analysis tab drill-down modal
  const [analysisDrillDown, setAnalysisDrillDown] = useState<{
    level1?: { type: string; id: string; name: string }
    level2?: { type: string; id: string; name: string }
    level3?: { type: string; id: string; name: string }
  } | null>(null)

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

  // Analysis tab: Filter transactions by date range
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
        if (type === 'vendor') return (t.vendor || t.description) === id
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
        if (type === 'vendor') return (t.vendor || t.description) === id
        return false
      })
    }

    if (analysisDrillDown.level3) {
      const { type, id } = analysisDrillDown.level3
      relevantTransactions = relevantTransactions.filter(t => {
        if (type === 'subcategory') return t.category_id === id
        if (type === 'vendor') return (t.vendor || t.description) === id
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
        groupKey = t.vendor || t.description
        groupName = t.vendor || t.description
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
  const maxGroupAmount = Math.max(...groupedData.map(g => g.amount), 1)

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
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Financial overview and deep analysis</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analysis
          </button>
        </nav>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <>
          <div className="flex justify-between items-center">
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
                <div className="flex-1">
                  {selectedSubcategoryId && selectedSubcategory ? (
                    <>
                      <button
                        onClick={() => setSelectedSubcategoryId(null)}
                        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium mb-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back to {selectedParentCategory.name} subcategories</span>
                      </button>
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
        </>
      )}

      {/* Analysis Tab Content */}
      {activeTab === 'analysis' && (
        <>
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
                          level1: { type: groupBy, id: group.name, name: group.name }
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
        </>
      )}
    </div>
  )
}
