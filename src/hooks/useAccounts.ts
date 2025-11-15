import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'

export interface Account {
  id: string
  household_id: string
  name: string
  account_type: string | null
  created_at: string
  updated_at: string
}

export function useAccounts() {
  const { household } = useHousehold()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!household) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('household_id', household.id)
          .order('created_at', { ascending: true })

        if (error) throw error
        setAccounts(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [household])

  const refetchAccounts = async () => {
    if (!household) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setAccounts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }

  const addAccount = async (name: string, accountType: string | null) => {
    if (!household) return { error: 'No household found' }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ household_id: household.id, name, account_type: accountType })
        .select()
        .single()

      if (error) throw error
      setAccounts([...accounts, data])
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to add account' }
    }
  }

  const updateAccount = async (id: string, name: string, accountType: string | null) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({ name, account_type: accountType })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setAccounts(accounts.map((a) => (a.id === id ? data : a)))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update account' }
    }
  }

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id)

      if (error) throw error
      setAccounts(accounts.filter((a) => a.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete account' }
    }
  }

  return {
    accounts,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    refetch: refetchAccounts,
  }
}
