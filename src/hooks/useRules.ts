import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'

export interface Rule {
  id: string
  household_id: string
  pattern: string
  category_id: string
  member_id: string | null
  created_at: string
  updated_at: string
}

export function useRules() {
  const { household } = useHousehold()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRules = async () => {
      if (!household) {
        console.log('[useRules] No household found')
        setLoading(false)
        return
      }

      console.log('[useRules] Fetching rules for household:', household.id)

      try {
        const { data, error } = await supabase
          .from('rules')
          .select('*')
          .eq('household_id', household.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        console.log('[useRules] Rules fetched:', data?.length || 0, 'rules')
        setRules(data || [])
      } catch (error) {
        console.error('[useRules] Error fetching rules:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRules()
  }, [household])

  const addRule = async (
    pattern: string,
    categoryId: string,
    memberId: string | null = null
  ) => {
    if (!household) throw new Error('No household found')

    console.log('[useRules] Adding rule:', { pattern, categoryId, memberId })

    const { data, error } = await supabase
      .from('rules')
      .insert({
        household_id: household.id,
        pattern,
        category_id: categoryId,
        member_id: memberId,
      })
      .select()
      .single()

    if (error) throw error

    console.log('[useRules] Rule added:', data)
    setRules([data, ...rules])
    return data
  }

  const updateRule = async (
    id: string,
    updates: {
      pattern?: string
      category_id?: string
      member_id?: string | null
    }
  ) => {
    console.log('[useRules] Updating rule:', id, updates)

    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    console.log('[useRules] Rule updated:', data)
    setRules(rules.map((r) => (r.id === id ? data : r)))
    return data
  }

  const deleteRule = async (id: string) => {
    console.log('[useRules] Deleting rule:', id)

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id)

    if (error) throw error

    console.log('[useRules] Rule deleted')
    setRules(rules.filter((r) => r.id !== id))
  }

  const refetch = async () => {
    if (!household) return

    console.log('[useRules] Refetching rules')
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[useRules] Rules refetched:', data?.length || 0, 'rules')
      setRules(data || [])
    } catch (error) {
      console.error('[useRules] Error refetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    rules,
    loading,
    addRule,
    updateRule,
    deleteRule,
    refetch,
  }
}
