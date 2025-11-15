import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'

const ACCOUNT_TYPES = ['Checking', 'Savings', 'Credit Card', 'Investment', 'Other']

export default function Accounts() {
  const { accounts, loading, error, addAccount, updateAccount, deleteAccount } = useAccounts()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', accountType: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name.trim()) {
      setFormError('Account name is required')
      return
    }

    setSubmitting(true)

    const accountTypeValue = formData.accountType || null

    if (editingId) {
      const { error } = await updateAccount(editingId, formData.name, accountTypeValue)
      if (error) {
        setFormError(error)
      } else {
        setEditingId(null)
        setFormData({ name: '', accountType: '' })
        setIsAdding(false)
      }
    } else {
      const { error } = await addAccount(formData.name, accountTypeValue)
      if (error) {
        setFormError(error)
      } else {
        setFormData({ name: '', accountType: '' })
        setIsAdding(false)
      }
    }

    setSubmitting(false)
  }

  const handleEdit = (account: typeof accounts[0]) => {
    setEditingId(account.id)
    setFormData({ name: account.name, accountType: account.account_type || '' })
    setIsAdding(true)
    setFormError('')
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: '', accountType: '' })
    setFormError('')
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? This will also delete all associated transactions.`)) {
      const { error } = await deleteAccount(id)
      if (error) {
        alert(`Error: ${error}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading accounts...</div>
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Accounts</h1>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Account
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Account' : 'Add New Account'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Chase Checking, Citi Credit Card"
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
                Account Type (Optional)
              </label>
              <select
                id="accountType"
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">Select type...</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No accounts added yet</p>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Your First Account
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.account_type ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {account.account_type}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleEdit(account)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(account.id, account.name)}
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
      )}
    </div>
  )
}
