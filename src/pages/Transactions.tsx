import { useState, useEffect } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useMembers } from '@/hooks/useMembers'
import { useRules } from '@/hooks/useRules'
import { suggestCategories } from '@/lib/categorySuggestions'
import CSVImport from '@/components/transactions/CSVImport'

export default function Transactions() {
  const { accounts } = useAccounts()
  const { transactions, loading, error, updateTransaction, deleteTransaction } = useTransactions()
  const { categories, addCategory, refetch: refetchCategories, getCategoryDisplayName, getParentCategories, getSubcategories, getCategoryById } = useCategories()
  const { members } = useMembers()
  const { addRule } = useRules()
  const [showImport, setShowImport] = useState(false)
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterMember, setFilterMember] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [savingRuleFor, setSavingRuleFor] = useState<string | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParentId, setNewCategoryParentId] = useState('')
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null)
  const [saveNotification, setSaveNotification] = useState<string | null>(null)
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([])

  // Update category suggestions when name changes
  useEffect(() => {
    if (newCategoryName.trim().length > 2) {
      const suggested = suggestCategories(newCategoryName, 3)
      setCategorySuggestions(suggested)
    } else {
      setCategorySuggestions([])
    }
  }, [newCategoryName])

  const handleCategorySuggestionClick = (suggestedCategory: string) => {
    const parentCategory = getParentCategories().find(c => c.name === suggestedCategory)
    if (parentCategory) {
      setNewCategoryParentId(parentCategory.id)
      setCategorySuggestions([])
    }
  }

  // Helper to show save notifications
  const showSaveNotification = (message: string) => {
    setSaveNotification(message)
    setTimeout(() => setSaveNotification(null), 2000)
  }

  const handleDelete = async (id: string, description: string) => {
    if (confirm(`Are you sure you want to delete "${description}"?`)) {
      const { error } = await deleteTransaction(id)
      if (error) {
        alert(`Error: ${error}`)
      }
    }
  }

  const handleParentCategoryChange = async (transactionId: string, parentCategoryId: string) => {
    // Check if user wants to add a new category
    if (parentCategoryId === '__ADD_NEW__') {
      setPendingTransactionId(transactionId)
      setShowAddCategory(true)
      return
    }

    // When parent changes, set it as the category (no subcategory selected)
    const { error } = await updateTransaction(transactionId, {
      category_id: parentCategoryId || null,
    })
    if (error) {
      alert(`Error: ${error}`)
    } else {
      showSaveNotification('Category saved!')
    }
  }

  const handleSubcategoryChange = async (transactionId: string, subcategoryId: string) => {
    // Get current transaction to find its current parent category
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    // If subcategory is selected, use it; otherwise keep parent category
    const categoryIdToSet = subcategoryId || transaction.category_id

    const { error } = await updateTransaction(transactionId, {
      category_id: categoryIdToSet,
    })
    if (error) {
      alert(`Error: ${error}`)
    } else {
      showSaveNotification('Subcategory saved!')
    }
  }

  // Helper to get parent and subcategory for a transaction
  const getCategorySelection = (transaction: typeof transactions[0]) => {
    if (!transaction.category_id) {
      return { parentId: '', subcategoryId: '' }
    }

    const category = getCategoryById(transaction.category_id)
    if (!category) {
      return { parentId: '', subcategoryId: '' }
    }

    // If this is a subcategory, return its parent and itself
    if (category.parent_category_id) {
      return { parentId: category.parent_category_id, subcategoryId: category.id }
    }

    // If this is a parent category, return it as parent with no subcategory
    return { parentId: category.id, subcategoryId: '' }
  }

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    const result = await addCategory(newCategoryName.trim(), newCategoryParentId || null)
    if (result.error) {
      alert(`Error creating category: ${result.error}`)
      return
    }

    // Refresh categories
    await refetchCategories()

    // If there's a pending transaction, assign the new category
    if (pendingTransactionId && result.data) {
      await updateTransaction(pendingTransactionId, {
        category_id: result.data.id,
      })
    }

    // Reset
    setShowAddCategory(false)
    setNewCategoryName('')
    setNewCategoryParentId('')
    setPendingTransactionId(null)
    setCategorySuggestions([])
  }

  const handleMemberChange = async (transactionId: string, memberId: string) => {
    const { error } = await updateTransaction(transactionId, {
      member_id: memberId || null,
    })
    if (error) {
      alert(`Error: ${error}`)
    } else {
      showSaveNotification('Member saved!')
    }
  }

  const handleCreateRule = async (transaction: typeof transactions[0]) => {
    if (!transaction.category_id && !transaction.member_id) {
      alert('Please assign a category or member first before creating a rule')
      return
    }

    setSavingRuleFor(transaction.id)

    try {
      await addRule(
        transaction.description,
        transaction.category_id || null,
        transaction.member_id
      )
      const ruleType = transaction.category_id && transaction.member_id
        ? 'category and member'
        : transaction.category_id
        ? 'category'
        : 'member'
      alert(`Rule created! Future transactions with "${transaction.description}" will be auto-assigned to ${ruleType}.`)
    } catch (error) {
      alert(`Error creating rule: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSavingRuleFor(null)
    }
  }

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2)
    return amount < 0 ? `-$${formatted}` : `$${formatted}`
  }

  const filteredTransactions = transactions.filter(t => {
    // Account filter
    if (filterAccount && t.account_id !== filterAccount) return false

    // Category filter
    if (filterCategory && t.category_id !== filterCategory) return false

    // Member filter
    if (filterMember && t.member_id !== filterMember) return false

    // Search text (description or vendor)
    if (searchText) {
      const search = searchText.toLowerCase()
      const description = t.description?.toLowerCase() || ''
      const vendor = t.vendor?.toLowerCase() || ''
      if (!description.includes(search) && !vendor.includes(search)) return false
    }

    // Date range
    if (dateFrom && t.date < dateFrom) return false
    if (dateTo && t.date > dateTo) return false

    // Amount range
    const absAmount = Math.abs(t.amount)
    if (amountMin && absAmount < parseFloat(amountMin)) return false
    if (amountMax && absAmount > parseFloat(amountMax)) return false

    // Uncategorized only
    if (showUncategorizedOnly && t.category_id) return false

    return true
  })

  const hasActiveFilters = filterAccount || filterCategory || filterMember || searchText ||
    dateFrom || dateTo || amountMin || amountMax || showUncategorizedOnly

  const clearAllFilters = () => {
    setFilterAccount('')
    setFilterCategory('')
    setFilterMember('')
    setSearchText('')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    setShowUncategorizedOnly(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading transactions...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <button
          onClick={() => setShowImport(!showImport)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showImport ? 'Hide Import' : 'Import CSV'}
        </button>
      </div>

      {showImport && <CSVImport />}

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow mb-6">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by description or vendor..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-md font-medium ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              {hasActiveFilters && !showFilters && (
                <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {[filterAccount, filterCategory, filterMember, searchText, dateFrom, dateTo, amountMin, amountMax, showUncategorizedOnly].filter(Boolean).length}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Account Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {getCategoryDisplayName(category)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
                <select
                  value={filterMember}
                  onChange={(e) => setFilterMember(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Members</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount Min */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Min</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount Max */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Max</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Uncategorized Only */}
              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUncategorizedOnly}
                    onChange={(e) => setShowUncategorizedOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Show uncategorized only</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredTransactions.length}</span> of{' '}
            <span className="font-semibold">{transactions.length}</span> transaction
            {transactions.length !== 1 ? 's' : ''}
            {hasActiveFilters && ' (filtered)'}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No transactions found</p>
          <p className="text-gray-400 text-sm mb-4">
            {accounts.length === 0
              ? 'Create an account first, then import your transactions'
              : 'Import your first CSV file to get started'}
          </p>
          {accounts.length > 0 && (
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Import Transactions
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] relative">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Subcategory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Member
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.account?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={getCategorySelection(transaction).parentId}
                        onChange={(e) => handleParentCategoryChange(transaction.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {getParentCategories().map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                        <option value="__ADD_NEW__" className="font-semibold text-blue-600">
                          + Add New
                        </option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const { parentId } = getCategorySelection(transaction)
                        const subcategories = parentId ? getSubcategories(parentId) : []

                        if (subcategories.length === 0) {
                          return <span className="text-xs text-gray-400">—</span>
                        }

                        return (
                          <select
                            value={getCategorySelection(transaction).subcategoryId}
                            onChange={(e) => handleSubcategoryChange(transaction.id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">None</option>
                            {subcategories.map((subcategory) => (
                              <option key={subcategory.id} value={subcategory.id}>
                                {subcategory.name}
                              </option>
                            ))}
                          </select>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={transaction.member_id || ''}
                        onChange={(e) => handleMemberChange(transaction.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {transaction.amount > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                            CREDIT
                          </span>
                        )}
                        <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleCreateRule(transaction)}
                        disabled={(!transaction.category_id && !transaction.member_id) || savingRuleFor === transaction.id}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={(transaction.category_id || transaction.member_id) ? 'Create rule from this transaction' : 'Assign a category or member first'}
                      >
                        {savingRuleFor === transaction.id ? 'Saving...' : 'Create Rule'}
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id, transaction.description)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-500 uppercase">Total Expenses</div>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Total Credits</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Net Total</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 border-t border-gray-200 pt-2">
              {filteredTransactions.filter(t => !t.category_id).length} uncategorized transactions
            </div>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-900">
            <strong>Next step:</strong> Go to the Inbox page to categorize your transactions and create rules for automatic categorization.
            Once categorized, view your spending analysis on the Dashboard!
          </p>
        </div>
      )}

      {/* Save Notification Toast */}
      {saveNotification && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{saveNotification}</span>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Add New Category</h2>
            <form onSubmit={handleAddCategorySubmit}>
              <div className="mb-4">
                <label htmlFor="newCategoryName" className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  id="newCategoryName"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Groceries, Gas, Entertainment"
                  autoFocus
                />
                {categorySuggestions.length > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      💡 Suggested parent categories for "{newCategoryName}":
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categorySuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleCategorySuggestionClick(suggestion)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Use "{suggestion}"
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      Click to set as parent category, preventing duplicates.
                    </p>
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label htmlFor="newCategoryParent" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  id="newCategoryParent"
                  value={newCategoryParentId}
                  onChange={(e) => setNewCategoryParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None (Create as parent category)</option>
                  {getParentCategories().map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a parent to create a subcategory
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(false)
                    setNewCategoryName('')
                    setNewCategoryParentId('')
                    setPendingTransactionId(null)
                    setCategorySuggestions([])
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
