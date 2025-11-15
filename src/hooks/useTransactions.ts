import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'

export interface Transaction {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  category_id: string | null
  member_id: string | null
  created_at: string
  updated_at: string
}

export interface TransactionWithDetails extends Transaction {
  account?: { id: string; name: string }
  category?: { id: string; name: string }
  member?: { id: string; name: string }
}

export function useTransactions(accountId?: string) {
  const { household } = useHousehold()
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async () => {
    if (!household) {
      setLoading(false)
      return
    }

    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          account:accounts(id, name),
          category:categories(id, name),
          member:household_members(id, name)
        `)
        .order('date', { ascending: false })

      // Filter by account if accountId is provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      } else {
        // Otherwise, get all transactions for all accounts in this household
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id')
          .eq('household_id', household.id)

        if (accounts && accounts.length > 0) {
          const accountIds = accounts.map(a => a.id)
          query = query.in('account_id', accountIds)
        } else {
          // No accounts, no transactions
          setTransactions([])
          setLoading(false)
          return
        }
      }

      const { data, error } = await query

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [household, accountId])

  const importTransactions = async (
    accountId: string,
    transactions: Array<{ date: string; description: string; amount: number }>
  ) => {
    try {
      const transactionsToInsert = transactions.map(t => ({
        account_id: accountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
      }))

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select()

      if (error) throw error

      // Refresh the list
      await fetchTransactions()

      return { error: null, count: data?.length || 0 }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to import transactions',
        count: 0
      }
    }
  }

  const updateTransaction = async (
    id: string,
    updates: { category_id?: string | null; member_id?: string | null }
  ) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Update local state
      setTransactions(transactions.map(t =>
        t.id === id ? { ...t, ...updates } : t
      ))

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update transaction' }
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTransactions(transactions.filter(t => t.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete transaction' }
    }
  }

  return {
    transactions,
    loading,
    error,
    importTransactions,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  }
}
