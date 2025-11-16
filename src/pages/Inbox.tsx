import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useMembers } from '@/hooks/useMembers'
import { useRules } from '@/hooks/useRules'
import { isExpense } from '@/lib/transactionUtils'

export default function Inbox() {
  const { transactions, loading, updateTransaction, refetch: refetchTransactions } = useTransactions()
  const { categories, getParentCategories, getSubcategories, getCategoryDisplayName } = useCategories()
  const { members } = useMembers()
  const { addRule } = useRules()

  const [selectedParentCategory, setSelectedParentCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [createRule, setCreateRule] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)

  // Get uncategorized transactions
  const uncategorizedTransactions = useMemo(() => {
    return transactions
      .filter(t => !t.category_id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions])

  const currentTransaction = uncategorizedTransactions[currentIndex]
  const progress = uncategorizedTransactions.length > 0
    ? ((currentIndex / uncategorizedTransactions.length) * 100)
    : 100

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2)
    return amount < 0 ? `-$${formatted}` : `$${formatted}`
  }

  const handleCategorize = async () => {
    if (!currentTransaction) return

    // Determine which category to use (subcategory if selected, otherwise parent)
    const categoryId = selectedSubcategory || selectedParentCategory || null

    if (!categoryId && !selectedMember) {
      alert('Please select at least a category or member')
      return
    }

    setProcessing(true)

    try {
      // Update the current transaction
      const { error } = await updateTransaction(currentTransaction.id, {
        category_id: categoryId,
        member_id: selectedMember || null,
      })

      if (error) {
        alert(`Error: ${error}`)
        setProcessing(false)
        return
      }

      // Create rule and apply to existing transactions if requested
      if (createRule && categoryId) {
        // Create the rule
        await addRule(
          currentTransaction.description,
          categoryId,
          selectedMember || null
        )

        // Find all other uncategorized transactions that match this description
        const matchingTransactions = transactions.filter(t =>
          !t.category_id &&
          t.id !== currentTransaction.id && // Exclude current transaction (already updated)
          t.description.toLowerCase().includes(currentTransaction.description.toLowerCase())
        )

        // Apply the categorization to all matching uncategorized transactions
        let updatedCount = 0
        for (const matchingTx of matchingTransactions) {
          const { error } = await updateTransaction(matchingTx.id, {
            category_id: categoryId,
            member_id: selectedMember || null,
          })
          if (!error) {
            updatedCount++
          }
        }

        if (updatedCount > 0) {
          alert(`Rule created and applied to ${updatedCount} other matching transaction${updatedCount !== 1 ? 's' : ''}!`)
        }

        // Refresh all transactions to ensure Dashboard and other pages see the updates
        await refetchTransactions()
      }

      // Reset form and move to next
      setSelectedParentCategory('')
      setSelectedSubcategory('')
      setSelectedMember('')
      setCreateRule(false)

      // Don't increment index - the array will be shorter now
      // If we were at the end, stay there
      if (currentIndex >= uncategorizedTransactions.length - 1) {
        setCurrentIndex(Math.max(0, uncategorizedTransactions.length - 2))
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    setProcessing(false)
  }

  const handleSkip = () => {
    setSelectedParentCategory('')
    setSelectedSubcategory('')
    setSelectedMember('')
    setCreateRule(false)

    if (currentIndex < uncategorizedTransactions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setCurrentIndex(0) // Loop back to start
    }
  }

  const handleGoToIndex = (index: number) => {
    setSelectedParentCategory('')
    setSelectedSubcategory('')
    setSelectedMember('')
    setCreateRule(false)
    setCurrentIndex(index)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading inbox...</div>
      </div>
    )
  }

  if (uncategorizedTransactions.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Categorization Inbox</h1>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
          <p className="text-gray-600">
            You have no uncategorized transactions. Great job keeping your finances organized!
          </p>
        </div>
      </div>
    )
  }

  const subcategories = selectedParentCategory ? getSubcategories(selectedParentCategory) : []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categorization Inbox</h1>
        <p className="text-gray-600 mt-1">
          Your primary tool for categorizing transactions - focused, one-at-a-time workflow
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">
            {currentIndex + 1} of {uncategorizedTransactions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {uncategorizedTransactions.length} transaction{uncategorizedTransactions.length !== 1 ? 's' : ''} remaining
        </div>
      </div>

      {/* Current Transaction */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Current Transaction</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Date</div>
              <div className="text-sm font-semibold">
                {new Date(currentTransaction.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Description</div>
              <div className="text-sm font-semibold">{currentTransaction.description}</div>
              {currentTransaction.vendor && currentTransaction.vendor !== currentTransaction.description && (
                <div className="text-xs text-gray-500 mt-1">Vendor: {currentTransaction.vendor}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Amount</div>
              <div className={`text-sm font-bold ${isExpense(currentTransaction) ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(currentTransaction.amount)}
              </div>
            </div>
          </div>

          {/* Categorization Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedParentCategory}
                  onChange={(e) => {
                    setSelectedParentCategory(e.target.value)
                    setSelectedSubcategory('') // Reset subcategory when parent changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={processing}
                >
                  <option value="">Select category...</option>
                  {getParentCategories().map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory {subcategories.length > 0 && '(optional)'}
                </label>
                {subcategories.length > 0 ? (
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={processing}
                  >
                    <option value="">None (use parent category)</option>
                    {subcategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 text-sm">
                    {selectedParentCategory ? 'No subcategories available' : 'Select a category first'}
                  </div>
                )}
              </div>

              {/* Member */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member (optional)
                </label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={processing}
                >
                  <option value="">None</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create Rule Checkbox */}
              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createRule}
                    onChange={(e) => setCreateRule(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={processing}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Create auto-categorization rule
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCategorize}
              disabled={processing || (!selectedParentCategory && !selectedMember)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {processing ? 'Categorizing...' : 'Categorize & Continue'}
            </button>
            <button
              onClick={handleSkip}
              disabled={processing}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              Skip
            </button>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-xs text-gray-500 text-center pt-2">
            <span className="font-medium">Tip:</span> Select category and member, then click "Categorize & Continue" to move to the next transaction
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      {uncategorizedTransactions.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {uncategorizedTransactions.slice(0, 12).map((transaction, index) => (
              <button
                key={transaction.id}
                onClick={() => handleGoToIndex(index)}
                className={`p-3 rounded-md text-left text-sm border transition-colors ${
                  index === currentIndex
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium truncate">{transaction.vendor || transaction.description}</div>
                <div className={`text-xs ${isExpense(transaction) ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(transaction.amount)}
                </div>
              </button>
            ))}
            {uncategorizedTransactions.length > 12 && (
              <div className="p-3 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
                +{uncategorizedTransactions.length - 12} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
