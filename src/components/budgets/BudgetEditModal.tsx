import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import type { BudgetTemplateWithItems } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { formatBudgetCurrency, getMonthName } from '@/lib/budgetCalculations'

interface BudgetEditModalProps {
  budget: BudgetTemplateWithItems
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function BudgetEditModal({
  budget,
  isOpen,
  onClose,
  onSuccess,
}: BudgetEditModalProps) {
  const { updateBudget, updateBudgetItem, addBudgetItem, removeBudgetItem } = useBudgets()
  const { categories, getParentCategories, getSubcategories } = useCategories()

  const [name, setName] = useState(budget.name)
  const [lookbackMonths, setLookbackMonths] = useState(budget.lookback_months)
  const [isActive, setIsActive] = useState(budget.is_active)
  const [editingItems, setEditingItems] = useState<Map<string, number>>(new Map())
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newAmount, setNewAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get categories not already in the budget
  const availableCategories = categories.filter(
    cat => !budget.budget_items.some(item => item.category_id === cat.id)
  )

  const handleItemChange = (itemId: string, amount: number) => {
    setEditingItems(prev => new Map(prev).set(itemId, amount))
  }

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)

    try {
      // Update budget template
      const updateResult = await updateBudget(budget.id, {
        name,
        lookback_months: lookbackMonths,
        is_active: isActive,
      })

      if (updateResult.error) {
        throw new Error(updateResult.error)
      }

      // Update individual items that were changed
      for (const [itemId, amount] of editingItems) {
        const result = await updateBudgetItem(itemId, amount)
        if (result.error) {
          throw new Error(result.error)
        }
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddItem = async () => {
    if (!newCategoryId || newAmount <= 0) {
      setError('Please select a category and enter an amount')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await addBudgetItem(budget.id, newCategoryId, newAmount)

    if (result.error) {
      setError(result.error)
    } else {
      setNewCategoryId('')
      setNewAmount(0)
      onSuccess()
    }

    setSubmitting(false)
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Remove this category from the budget?')) return

    setSubmitting(true)
    const result = await removeBudgetItem(itemId)

    if (result.error) {
      setError(result.error)
    } else {
      onSuccess()
    }

    setSubmitting(false)
  }

  if (!isOpen) return null

  const totalBudgeted = budget.budget_items.reduce((sum, item) => {
    const editedAmount = editingItems.get(item.id)
    return sum + (editedAmount !== undefined ? editedAmount : item.budgeted_amount)
  }, 0) + (newAmount > 0 ? newAmount : 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Edit Budget</h2>
            <p className="text-sm text-gray-500">
              {getMonthName(budget.month)} {budget.year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Budget Settings */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lookback Period
                </label>
                <select
                  value={lookbackMonths}
                  onChange={(e) => setLookbackMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Budget Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Category Budgets</h3>
              <div className="text-sm text-gray-500">
                Total: {formatBudgetCurrency(totalBudgeted)}
              </div>
            </div>

            <div className="border rounded-md divide-y mb-4">
              {budget.budget_items.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No categories added to this budget
                </div>
              ) : (
                budget.budget_items
                  .sort((a, b) => {
                    const aName = a.category?.name || ''
                    const bName = b.category?.name || ''
                    return aName.localeCompare(bName)
                  })
                  .map((item) => {
                    const editedAmount = editingItems.get(item.id)
                    const currentAmount = editedAmount !== undefined ? editedAmount : item.budgeted_amount

                    return (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {item.category?.parent_category_id
                              ? `${categories.find(c => c.id === item.category?.parent_category_id)?.name} > ${item.category?.name}`
                              : item.category?.name}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">$</span>
                          <input
                            type="number"
                            value={currentAmount}
                            onChange={(e) => handleItemChange(item.id, Number(e.target.value))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right"
                            min={0}
                          />
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            disabled={submitting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

            {/* Add New Category */}
            {availableCategories.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Add Category</h4>
                <div className="flex items-center space-x-3">
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    {getParentCategories()
                      .filter(p => availableCategories.some(a => a.id === p.id || a.parent_category_id === p.id))
                      .map((parent) => (
                        <optgroup key={parent.id} label={parent.name}>
                          {availableCategories.filter(c => c.id === parent.id).length > 0 && (
                            <option value={parent.id}>{parent.name} (parent)</option>
                          )}
                          {getSubcategories(parent.id)
                            .filter(sub => availableCategories.some(a => a.id === sub.id))
                            .map((sub) => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </optgroup>
                      ))}
                  </select>
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-1">$</span>
                    <input
                      type="number"
                      value={newAmount || ''}
                      onChange={(e) => setNewAmount(Number(e.target.value))}
                      placeholder="Amount"
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-right"
                      min={0}
                    />
                  </div>
                  <button
                    onClick={handleAddItem}
                    disabled={submitting || !newCategoryId || newAmount <= 0}
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
