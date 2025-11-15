import { useState } from 'react'
import { useRules } from '@/hooks/useRules'
import { useCategories } from '@/hooks/useCategories'
import { useMembers } from '@/hooks/useMembers'

export default function Rules() {
  const { rules, loading, addRule, updateRule, deleteRule } = useRules()
  const { categories } = useCategories()
  const { members } = useMembers()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    pattern: '',
    category_id: '',
    member_id: '',
  })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.pattern.trim()) {
      setFormError('Pattern is required')
      return
    }

    if (!formData.category_id) {
      setFormError('Category is required')
      return
    }

    setSubmitting(true)

    try {
      if (editingId) {
        await updateRule(editingId, {
          pattern: formData.pattern.trim(),
          category_id: formData.category_id,
          member_id: formData.member_id || null,
        })
        setEditingId(null)
        setFormData({ pattern: '', category_id: '', member_id: '' })
        setIsAdding(false)
      } else {
        await addRule(
          formData.pattern.trim(),
          formData.category_id,
          formData.member_id || null
        )
        setFormData({ pattern: '', category_id: '', member_id: '' })
        setIsAdding(false)
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'An error occurred')
    }

    setSubmitting(false)
  }

  const handleEdit = (rule: typeof rules[0]) => {
    setEditingId(rule.id)
    setFormData({
      pattern: rule.pattern,
      category_id: rule.category_id,
      member_id: rule.member_id || '',
    })
    setIsAdding(true)
    setFormError('')
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ pattern: '', category_id: '', member_id: '' })
    setFormError('')
  }

  const handleDelete = async (id: string, pattern: string) => {
    if (
      confirm(
        `Are you sure you want to delete the rule for "${pattern}"? Future transactions won't be auto-categorized using this rule.`
      )
    ) {
      try {
        await deleteRule(id)
      } catch (error) {
        alert(`Error: ${error instanceof Error ? error.message : 'An error occurred'}`)
      }
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || 'Unknown'
  }

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return 'All Members'
    const member = members.find((m) => m.id === memberId)
    return member?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading rules...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Auto-Categorization Rules</h1>
          <p className="text-gray-600 mt-1">
            Automatically categorize transactions based on description patterns
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Rule
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Rule' : 'Add New Rule'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pattern" className="block text-sm font-medium text-gray-700 mb-1">
                Pattern (text to match in transaction description)
              </label>
              <input
                id="pattern"
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., STARBUCKS, AMAZON, SHELL"
                disabled={submitting}
                autoFocus
              />
              <p className="mt-1 text-sm text-gray-500">
                Case-insensitive. Will match if transaction description contains this text.
              </p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-1">
                Member (optional)
              </label>
              <select
                id="member"
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">All Members</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
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

      {rules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No auto-categorization rules yet</p>
          <p className="text-gray-400 text-sm mb-4">
            Rules help automatically categorize your transactions based on patterns in the description.
          </p>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Your First Rule
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pattern
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rule.pattern}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getCategoryName(rule.category_id)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{getMemberName(rule.member_id)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id, rule.pattern)}
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

      {rules.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-900">
            <strong>How it works:</strong> When importing transactions or manually categorizing, if a
            transaction description contains any of these patterns (case-insensitive), it will
            automatically be assigned to the specified category and member.
          </p>
        </div>
      )}
    </div>
  )
}
