import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'

export default function Categories() {
  const { categories, loading, error, addCategory, updateCategory, deleteCategory } = useCategories()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name.trim()) {
      setFormError('Category name is required')
      return
    }

    // Check for duplicates
    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase() === formData.name.trim().toLowerCase() && cat.id !== editingId
    )
    if (isDuplicate) {
      setFormError('A category with this name already exists')
      return
    }

    setSubmitting(true)

    if (editingId) {
      const { error } = await updateCategory(editingId, formData.name.trim())
      if (error) {
        setFormError(error)
      } else {
        setEditingId(null)
        setFormData({ name: '' })
        setIsAdding(false)
      }
    } else {
      const { error } = await addCategory(formData.name.trim())
      if (error) {
        setFormError(error)
      } else {
        setFormData({ name: '' })
        setIsAdding(false)
      }
    }

    setSubmitting(false)
  }

  const handleEdit = (category: typeof categories[0]) => {
    setEditingId(category.id)
    setFormData({ name: category.name })
    setIsAdding(true)
    setFormError('')
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: '' })
    setFormError('')
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This will unlink all transactions from this category.`
      )
    ) {
      const { error } = await deleteCategory(id)
      if (error) {
        alert(`Error: ${error}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading categories...</div>
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
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-gray-600 mt-1">Organize your spending into categories</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Category
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Groceries, Gas, Entertainment"
                disabled={submitting}
                autoFocus
              />
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

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No custom categories added yet</p>
          <p className="text-gray-400 text-sm mb-4">
            Default categories were created when you signed up
          </p>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add a Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                </div>
                <div className="flex space-x-2 ml-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Categories help you track where your money goes. You can assign them to
            transactions and create rules to automatically categorize similar transactions.
          </p>
        </div>
      )}
    </div>
  )
}
