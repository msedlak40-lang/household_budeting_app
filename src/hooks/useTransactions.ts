import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'

export interface Transaction {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  vendor?: string | null
  normalized_vendor?: string | null
  vendor_override?: string | null
  transaction_hash?: string | null
  category_id: string | null
  member_id: string | null
  created_at: string
  updated_at: string
}

export interface TransactionWithDetails extends Transaction {
  account?: { id: string; name: string; account_type: string | null }
  category?: { id: string; name: string }
  member?: { id: string; name: string }
}

export function useTransactions(accountId?: string) {
  const { household } = useHousehold()
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
            account:accounts(id, name, account_type),
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

    fetchTransactions()
  }, [household, accountId])

  const refetchTransactions = async () => {
    if (!household) return

    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          account:accounts(id, name, account_type),
          category:categories(id, name),
          member:household_members(id, name)
        `)
        .order('date', { ascending: false })

      if (accountId) {
        query = query.eq('account_id', accountId)
      } else {
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id')
          .eq('household_id', household.id)

        if (accounts && accounts.length > 0) {
          const accountIds = accounts.map(a => a.id)
          query = query.in('account_id', accountIds)
        } else {
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

  const importTransactions = async (
    accountId: string,
    transactions: Array<{
      date: string
      description: string
      amount: number
      vendor?: string
      normalized_vendor?: string
      transaction_hash?: string
      category_id?: string | null
      member_id?: string | null
    }>
  ) => {
    try {
      const transactionsToInsert = transactions.map(t => ({
        account_id: accountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        vendor: t.vendor || null,
        normalized_vendor: t.normalized_vendor || null,
        transaction_hash: t.transaction_hash || null,
        category_id: t.category_id || null,
        member_id: t.member_id || null,
      }))

      console.log('[useTransactions] Inserting transactions to account:', accountId)
      console.log('[useTransactions] Sample insert data:', transactionsToInsert[0])

      // Try to insert all transactions
      // Duplicates will be automatically rejected by the unique constraint
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select()

      if (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') { // Unique constraint violation
          console.warn('[useTransactions] Some transactions were duplicates and skipped')
          // Try inserting one by one to see which ones succeed
          const results = []
          for (const transaction of transactionsToInsert) {
            const { data: singleData, error: singleError } = await supabase
              .from('transactions')
              .insert(transaction)
              .select()

            if (!singleError && singleData) {
              results.push(...singleData)
            } else if (singleError?.code !== '23505') {
              // If it's not a duplicate error, something else went wrong
              throw singleError
            }
          }

          await refetchTransactions()
          const duplicateCount = transactionsToInsert.length - results.length
          return {
            error: null,
            count: results.length,
            duplicates: duplicateCount,
          }
        }

        console.error('[useTransactions] Supabase error:', error)
        throw error
      }

      console.log('[useTransactions] Insert successful:', data?.length, 'transactions')

      // Refresh the list
      await refetchTransactions()

      return { error: null, count: data?.length || 0, duplicates: 0 }
    } catch (err) {
      console.error('[useTransactions] Import failed:', err)
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

      // Refetch the updated transaction with full details
      const { data: updatedTransaction } = await supabase
        .from('transactions')
        .select(`
          *,
          account:accounts(id, name, account_type),
          category:categories(id, name),
          member:household_members(id, name)
        `)
        .eq('id', id)
        .single()

      // Update local state with full transaction details
      if (updatedTransaction) {
        setTransactions(transactions.map(t =>
          t.id === id ? updatedTransaction : t
        ))
      }

      return { error: null }
    } catch (err) {
      console.error('[useTransactions] Update failed:', err)
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
    refetch: refetchTransactions,
  }
}
