import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { suggestCategory, suggestCategories } from '@/lib/categorySuggestions'

export default function Categories() {
  const { categories, loading, error, addCategory, updateCategory, deleteCategory, getCategoryDisplayName, getParentCategories } = useCategories()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', parentCategoryId: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Update suggestions when name changes
  useEffect(() => {
    if (formData.name.trim().length > 2 && !editingId) {
      const suggested = suggestCategories(formData.name, 3)
      setSuggestions(suggested)
    } else {
      setSuggestions([])
    }
  }, [formData.name, editingId])

  const handleSuggestionClick = (suggestedCategory: string) => {
    // Find the category ID for the suggested parent
    const parentCategory = getParentCategories().find(c => c.name === suggestedCategory)
    if (parentCategory) {
      setFormData({ ...formData, parentCategoryId: parentCategory.id })
      setSuggestions([])
    }
  }

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
        setFormData({ name: '', parentCategoryId: '' })
        setIsAdding(false)
      }
    } else {
      const { error } = await addCategory(
        formData.name.trim(),
        formData.parentCategoryId || null
      )
      if (error) {
        setFormError(error)
      } else {
        setFormData({ name: '', parentCategoryId: '' })
        setIsAdding(false)
      }
    }

    setSubmitting(false)
  }

  const handleEdit = (category: typeof categories[0]) => {
    setEditingId(category.id)
    setFormData({ name: category.name, parentCategoryId: category.parent_category_id || '' })
    setIsAdding(true)
    setFormError('')
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: '', parentCategoryId: '' })
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Groceries, Gas, Entertainment"
                disabled={submitting}
                autoFocus
              />
              {suggestions.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs font-medium text-blue-900 mb-2">
                    💡 Suggested parent categories for "{formData.name}":
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Use "{suggestion}"
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Click a suggestion to set it as the parent category, preventing duplicate categories.
                  </p>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="parentCategory" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Category (Optional)
              </label>
              <select
                id="parentCategory"
                value={formData.parentCategoryId}
                onChange={(e) => setFormData({ ...formData, parentCategoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">None (Create as parent category)</option>
                {getParentCategories().map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select a parent category to create a subcategory, or leave blank to create a parent category
              </p>
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
        <div className="space-y-6">
          {/* Parent Categories */}
          {categories.filter(c => !c.parent_category_id).map((parentCategory) => {
            const subcategories = categories.filter(c => c.parent_category_id === parentCategory.id)

            return (
              <div key={parentCategory.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Parent Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      📁 {parentCategory.name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(parentCategory)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(parentCategory.id, parentCategory.name)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {subcategories.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {subcategories.length} subcategor{subcategories.length === 1 ? 'y' : 'ies'}
                    </p>
                  )}
                </div>

                {/* Subcategories */}
                {subcategories.length > 0 && (
                  <div className="px-6 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {subcategories.map((subCategory) => (
                        <div
                          key={subCategory.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">→</span>
                            <span className="text-sm text-gray-900">{subCategory.name}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(subCategory)}
                              className="text-blue-600 hover:text-blue-900 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(subCategory.id, subCategory.name)}
                              className="text-red-600 hover:text-red-900 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Standalone Categories (no parent) that aren't parents themselves */}
          {categories.filter(c => !c.parent_category_id && !categories.some(sub => sub.parent_category_id === c.id)).length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Other Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {categories.filter(c => !c.parent_category_id && !categories.some(sub => sub.parent_category_id === c.id)).map((category) => (
                  <div
                    key={category.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-900">{category.name}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-900 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
                        className="text-red-600 hover:text-red-900 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
