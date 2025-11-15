import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'

export interface Category {
  id: string
  household_id: string
  name: string
  parent_category_id: string | null
  created_at: string
  updated_at: string
  parent?: { id: string; name: string }
}

export function useCategories() {
  const { household } = useHousehold()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      if (!household) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('categories')
          .select(`
            *,
            parent:categories!parent_category_id(id, name)
          `)
          .eq('household_id', household.id)
          .order('name', { ascending: true })

        if (error) throw error
        setCategories(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [household])

  const refetchCategories = async () => {
    if (!household) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:categories!parent_category_id(id, name)
        `)
        .eq('household_id', household.id)
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async (name: string, parentCategoryId?: string | null) => {
    if (!household) return { error: 'No household found' }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          household_id: household.id,
          name,
          parent_category_id: parentCategoryId || null
        })
        .select(`
          *,
          parent:categories!parent_category_id(id, name)
        `)
        .single()

      if (error) throw error
      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)))
      return { error: null, data }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to add category' }
    }
  }

  const updateCategory = async (id: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setCategories(categories.map((c) => (c.id === id ? data : c)).sort((a, b) => a.name.localeCompare(b.name)))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update category' }
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)

      if (error) throw error
      setCategories(categories.filter((c) => c.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete category' }
    }
  }

  // Sort categories: parents first, then children under their parents
  const sortedCategories = [...categories].sort((a, b) => {
    // If both are parents or both are children at same level, sort by name
    if ((!a.parent_category_id && !b.parent_category_id) ||
        (a.parent_category_id === b.parent_category_id)) {
      return a.name.localeCompare(b.name)
    }

    // Parents come before children
    if (!a.parent_category_id) return -1
    if (!b.parent_category_id) return 1

    // Sort children by parent name, then by child name
    const aParentName = a.parent?.name || ''
    const bParentName = b.parent?.name || ''
    if (aParentName !== bParentName) {
      return aParentName.localeCompare(bParentName)
    }
    return a.name.localeCompare(b.name)
  })

  const getCategoryDisplayName = (category: Category): string => {
    if (category.parent?.name) {
      return `${category.parent.name} → ${category.name}`
    }
    return category.name
  }

  // Get only parent categories (no parent_category_id)
  const getParentCategories = (): Category[] => {
    return sortedCategories.filter(c => !c.parent_category_id)
  }

  // Get subcategories for a given parent
  const getSubcategories = (parentId: string): Category[] => {
    return sortedCategories.filter(c => c.parent_category_id === parentId)
  }

  // Get the category object by id
  const getCategoryById = (id: string | null): Category | null => {
    if (!id) return null
    return sortedCategories.find(c => c.id === id) || null
  }

  return {
    categories: sortedCategories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: refetchCategories,
    getCategoryDisplayName,
    getParentCategories,
    getSubcategories,
    getCategoryById,
  }
}
