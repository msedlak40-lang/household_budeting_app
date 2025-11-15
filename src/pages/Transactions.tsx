import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useMembers } from '@/hooks/useMembers'
import { useRules } from '@/hooks/useRules'
import CSVImport from '@/components/transactions/CSVImport'

export default function Transactions() {
  const { accounts } = useAccounts()
  const { transactions, loading, error, updateTransaction, deleteTransaction } = useTransactions()
  const { categories } = useCategories()
  const { members } = useMembers()
  const { addRule } = useRules()
  const [showImport, setShowImport] = useState(false)
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [savingRuleFor, setSavingRuleFor] = useState<string | null>(null)

  const handleDelete = async (id: string, description: string) => {
    if (confirm(`Are you sure you want to delete "${description}"?`)) {
      const { error } = await deleteTransaction(id)
      if (error) {
        alert(`Error: ${error}`)
      }
    }
  }

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    const { error } = await updateTransaction(transactionId, {
      category_id: categoryId || null,
    })
    if (error) {
      alert(`Error: ${error}`)
    }
  }

  const handleMemberChange = async (transactionId: string, memberId: string) => {
    const { error } = await updateTransaction(transactionId, {
      member_id: memberId || null,
    })
    if (error) {
      alert(`Error: ${error}`)
    }
  }

  const handleCreateRule = async (transaction: typeof transactions[0]) => {
    if (!transaction.category_id) {
      alert('Please assign a category first before creating a rule')
      return
    }

    setSavingRuleFor(transaction.id)

    try {
      await addRule(
        transaction.description,
        transaction.category_id,
        transaction.member_id
      )
      alert(`Rule created! Future transactions with "${transaction.description}" will be auto-categorized.`)
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

  const filteredTransactions = filterAccount
    ? transactions.filter(t => t.account_id === filterAccount)
    : transactions

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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Account:</label>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        value={transaction.category_id || ''}
                        onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
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
                      <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleCreateRule(transaction)}
                        disabled={!transaction.category_id || savingRuleFor === transaction.id}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={transaction.category_id ? 'Create rule from this transaction' : 'Assign a category first'}
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
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Total:</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {filteredTransactions.filter(t => !t.category_id).length} uncategorized transactions
            </div>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-900">
            <strong>Next step:</strong> Go to the Inbox page to categorize your transactions and create rules for automatic categorization.
          </p>
        </div>
      )}
    </div>
  )
}
