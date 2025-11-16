import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { suggestCategories } from '@/lib/categorySuggestions'

export default function Categories() {
  const { categories, loading, error, addCategory, updateCategory, deleteCategory, getParentCategories, getSubcategories } = useCategories()
  const [formData, setFormData] = useState({ name: '', parentCategoryId: '' })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({ name: '', parentCategoryId: '' })

  // Update suggestions when name changes
  useEffect(() => {
    if (formData.name.trim().length > 2) {
      const suggested = suggestCategories(formData.name, 3)
      setSuggestions(suggested)
    } else {
      setSuggestions([])
    }
  }, [formData.name])

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
    setFormSuccess('')

    if (!formData.name.trim()) {
      setFormError('Category name is required')
      return
    }

    // Check for duplicates
    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase() === formData.name.trim().toLowerCase()
    )
    if (isDuplicate) {
      setFormError('A category with this name already exists')
      return
    }

    setSubmitting(true)

    const { error } = await addCategory(
      formData.name.trim(),
      formData.parentCategoryId || null
    )

    if (error) {
      setFormError(error)
    } else {
      const parentName = formData.parentCategoryId
        ? getParentCategories().find(c => c.id === formData.parentCategoryId)?.name
        : null

      setFormSuccess(
        parentName
          ? `✓ Created "${formData.name}" under "${parentName}"`
          : `✓ Created "${formData.name}" as a parent category`
      )
      setFormData({ name: '', parentCategoryId: '' })

      // Clear success message after 3 seconds
      setTimeout(() => setFormSuccess(''), 3000)
    }

    setSubmitting(false)
  }

  const handleEdit = (category: typeof categories[0]) => {
    setEditingId(category.id)
    setEditFormData({
      name: category.name,
      parentCategoryId: category.parent_category_id || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditFormData({ name: '', parentCategoryId: '' })
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return

    setFormError('')
    setFormSuccess('')

    if (!editFormData.name.trim()) {
      setFormError('Category name is required')
      return
    }

    // Check for duplicates (excluding current category)
    const isDuplicate = categories.some(
      (cat) => cat.id !== editingId && cat.name.toLowerCase() === editFormData.name.trim().toLowerCase()
    )
    if (isDuplicate) {
      setFormError('A category with this name already exists')
      return
    }

    setSubmitting(true)

    const { error } = await updateCategory(
      editingId,
      editFormData.name.trim(),
      editFormData.parentCategoryId || null
    )

    if (error) {
      setFormError(error)
    } else {
      setFormSuccess('✓ Category updated successfully')
      setEditingId(null)
      setEditFormData({ name: '', parentCategoryId: '' })

      setTimeout(() => setFormSuccess(''), 3000)
    }

    setSubmitting(false)
  }

  const handleDelete = async (id: string, name: string) => {
    // Check if this is a parent category with subcategories
    const subcategories = getSubcategories(id)
    if (subcategories.length > 0) {
      if (!confirm(`"${name}" has ${subcategories.length} subcategory(ies). Deleting it will also delete all subcategories and may affect categorized transactions. Are you sure?`)) {
        return
      }
    } else {
      if (!confirm(`Are you sure you want to delete "${name}"? This may affect categorized transactions.`)) {
        return
      }
    }

    const { error } = await deleteCategory(id)
    if (error) {
      alert(`Error: ${error}`)
    } else {
      setFormSuccess(`✓ Deleted "${name}"`)
      setTimeout(() => setFormSuccess(''), 3000)
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

  const parentCategoriesCount = categories.filter(c => !c.parent_category_id).length
  const subcategoriesCount = categories.filter(c => c.parent_category_id).length

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-gray-600 mt-1">Add categories and subcategories for organizing transactions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{parentCategoriesCount}</div>
          <div className="text-sm text-gray-600">Parent Categories</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{subcategoriesCount}</div>
          <div className="text-sm text-gray-600">Subcategories</div>
        </div>
      </div>

      {/* Add Category Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Category</h2>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {formSuccess}
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
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Adding Category...' : 'Add Category'}
          </button>
        </form>
      </div>

      {/* Existing Categories List */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Your Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Click Edit to modify name or parent category</p>
        </div>

        {categories.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No categories yet. Add your first category above.
          </div>
        ) : (
          <div className="p-6">
            {getParentCategories().map((parentCategory) => (
              <div key={parentCategory.id} className="mb-6 last:mb-0">
                {/* Parent Category */}
                {editingId === parentCategory.id ? (
                  <form onSubmit={handleUpdateSubmit} className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-3">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={submitting}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                        <select
                          value={editFormData.parentCategoryId}
                          onChange={(e) => setEditFormData({ ...editFormData, parentCategoryId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={submitting}
                        >
                          <option value="">None (Make this a parent category)</option>
                          {getParentCategories()
                            .filter(c => c.id !== parentCategory.id) // Can't be its own parent
                            .map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={submitting}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200 mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{parentCategory.name}</div>
                      <div className="text-xs text-gray-500">Parent Category</div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(parentCategory)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(parentCategory.id, parentCategory.name)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Subcategories */}
                {getSubcategories(parentCategory.id).map((subcategory) => (
                  <div key={subcategory.id} className="ml-6">
                    {editingId === subcategory.id ? (
                      <form onSubmit={handleUpdateSubmit} className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-2">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory Name</label>
                            <input
                              type="text"
                              value={editFormData.name}
                              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={submitting}
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                            <select
                              value={editFormData.parentCategoryId}
                              onChange={(e) => setEditFormData({ ...editFormData, parentCategoryId: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={submitting}
                            >
                              <option value="">None (Make this a parent category)</option>
                              {getParentCategories().map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              disabled={submitting}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {submitting ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={submitting}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-between items-center bg-white p-3 rounded-md border border-gray-200 mb-2">
                        <div>
                          <div className="text-gray-900">{subcategory.name}</div>
                          <div className="text-xs text-gray-400">Subcategory of {parentCategory.name}</div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(subcategory)}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(subcategory.id, subcategory.name)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> Use the smart suggestions to keep your categories organized. Categories are used throughout the app for transaction filtering and spending analysis on the Dashboard.
        </p>
      </div>
    </div>
  )
}
