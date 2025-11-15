import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'

export interface Category {
  id: string
  household_id: string
  name: string
  created_at: string
  updated_at: string
}

export function useCategories() {
  const { household } = useHousehold()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    if (!household) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
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

  useEffect(() => {
    fetchCategories()
  }, [household])

  const addCategory = async (name: string) => {
    if (!household) return { error: 'No household found' }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ household_id: household.id, name })
        .select()
        .single()

      if (error) throw error
      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)))
      return { error: null }
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

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  }
}
