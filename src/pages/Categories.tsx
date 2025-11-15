import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { suggestCategories } from '@/lib/categorySuggestions'

export default function Categories() {
  const { categories, loading, error, addCategory, getParentCategories } = useCategories()
  const [formData, setFormData] = useState({ name: '', parentCategoryId: '' })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

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

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> Use the smart suggestions to keep your categories organized. Categories are used throughout the app for transaction filtering and spending analysis on the Dashboard.
        </p>
      </div>
    </div>
  )
}
