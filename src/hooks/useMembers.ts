import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'

export interface Member {
  id: string
  household_id: string
  name: string
  role: 'adult' | 'child'
  created_at: string
  updated_at: string
}

export function useMembers() {
  const { household } = useHousehold()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMembers = async () => {
      if (!household) {
        console.log('[useMembers] No household found')
        setLoading(false)
        return
      }

      console.log('[useMembers] Fetching members for household:', household.id)

      try {
        const { data, error } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', household.id)
          .order('created_at', { ascending: true })

        if (error) throw error
        console.log('[useMembers] Members fetched:', data?.length || 0, 'members')
        setMembers(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch members')
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [household])

  const refetchMembers = async () => {
    if (!household) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members')
    } finally {
      setLoading(false)
    }
  }

  const addMember = async (name: string, role: 'adult' | 'child') => {
    if (!household) return { error: 'No household found' }

    try {
      const { data, error } = await supabase
        .from('household_members')
        .insert({ household_id: household.id, name, role })
        .select()
        .single()

      if (error) throw error
      setMembers([...members, data])
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to add member' }
    }
  }

  const updateMember = async (id: string, name: string, role: 'adult' | 'child') => {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .update({ name, role })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setMembers(members.map((m) => (m.id === id ? data : m)))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update member' }
    }
  }

  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase.from('household_members').delete().eq('id', id)

      if (error) throw error
      setMembers(members.filter((m) => m.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete member' }
    }
  }

  return {
    members,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    refetch: refetchMembers,
  }
}
