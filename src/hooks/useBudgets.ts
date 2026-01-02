import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'

export interface BudgetTemplate {
  id: string
  household_id: string
  name: string
  month: number // 1-12
  year: number
  lookback_months: number // typically 3, 6, or 12
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetItem {
  id: string
  budget_template_id: string
  category_id: string
  budgeted_amount: number
  created_at: string
  updated_at: string
  category?: { id: string; name: string; parent_category_id: string | null }
}

export interface BudgetTemplateWithItems extends BudgetTemplate {
  budget_items: BudgetItem[]
}

export function useBudgets() {
  const { household } = useHousehold()
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplateWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBudgets = async () => {
      if (!household) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('budget_templates')
          .select(`
            *,
            budget_items(
              *,
              category:categories(id, name, parent_category_id)
            )
          `)
          .eq('household_id', household.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false })

        if (error) throw error
        setBudgetTemplates(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch budgets')
      } finally {
        setLoading(false)
      }
    }

    fetchBudgets()
  }, [household])

  const refetchBudgets = async () => {
    if (!household) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('budget_templates')
        .select(`
          *,
          budget_items(
            *,
            category:categories(id, name, parent_category_id)
          )
        `)
        .eq('household_id', household.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (error) throw error
      setBudgetTemplates(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budgets')
    } finally {
      setLoading(false)
    }
  }

  const createBudget = async (
    name: string,
    month: number,
    year: number,
    lookbackMonths: number,
    items: Array<{ category_id: string; budgeted_amount: number }>
  ) => {
    if (!household) return { error: 'No household found' }

    try {
      // Create the budget template
      const { data: template, error: templateError } = await supabase
        .from('budget_templates')
        .insert({
          household_id: household.id,
          name,
          month,
          year,
          lookback_months: lookbackMonths,
          is_active: true,
        })
        .select()
        .single()

      if (templateError) throw templateError

      // Create budget items
      if (items.length > 0) {
        const budgetItems = items.map(item => ({
          budget_template_id: template.id,
          category_id: item.category_id,
          budgeted_amount: item.budgeted_amount,
        }))

        const { error: itemsError } = await supabase
          .from('budget_items')
          .insert(budgetItems)

        if (itemsError) throw itemsError
      }

      await refetchBudgets()
      return { error: null, data: template }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to create budget' }
    }
  }

  const updateBudget = async (
    id: string,
    updates: {
      name?: string
      is_active?: boolean
      lookback_months?: number
    }
  ) => {
    try {
      const { error } = await supabase
        .from('budget_templates')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await refetchBudgets()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update budget' }
    }
  }

  const deleteBudget = async (id: string) => {
    try {
      // Delete budget items first (cascade should handle this, but being explicit)
      await supabase
        .from('budget_items')
        .delete()
        .eq('budget_template_id', id)

      const { error } = await supabase
        .from('budget_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
      setBudgetTemplates(budgetTemplates.filter(b => b.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete budget' }
    }
  }

  const updateBudgetItem = async (
    itemId: string,
    budgetedAmount: number
  ) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .update({ budgeted_amount: budgetedAmount })
        .eq('id', itemId)

      if (error) throw error
      await refetchBudgets()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update budget item' }
    }
  }

  const addBudgetItem = async (
    budgetTemplateId: string,
    categoryId: string,
    budgetedAmount: number
  ) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .insert({
          budget_template_id: budgetTemplateId,
          category_id: categoryId,
          budgeted_amount: budgetedAmount,
        })

      if (error) throw error
      await refetchBudgets()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to add budget item' }
    }
  }

  const removeBudgetItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      await refetchBudgets()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to remove budget item' }
    }
  }

  // Get the active budget for a specific month/year
  const getBudgetForMonth = (month: number, year: number): BudgetTemplateWithItems | null => {
    return budgetTemplates.find(b => b.month === month && b.year === year && b.is_active) || null
  }

  // Get the current month's active budget
  const getCurrentMonthBudget = (): BudgetTemplateWithItems | null => {
    const now = new Date()
    return getBudgetForMonth(now.getMonth() + 1, now.getFullYear())
  }

  // Copy a budget to a new month
  const copyBudgetToMonth = async (
    sourceBudgetId: string,
    targetMonth: number,
    targetYear: number,
    newName?: string
  ) => {
    if (!household) return { error: 'No household found' }

    const sourceBudget = budgetTemplates.find(b => b.id === sourceBudgetId)
    if (!sourceBudget) return { error: 'Source budget not found' }

    try {
      // Create new budget template
      const { data: template, error: templateError } = await supabase
        .from('budget_templates')
        .insert({
          household_id: household.id,
          name: newName || `${getMonthName(targetMonth)} ${targetYear} Budget`,
          month: targetMonth,
          year: targetYear,
          lookback_months: sourceBudget.lookback_months,
          is_active: true,
        })
        .select()
        .single()

      if (templateError) throw templateError

      // Copy budget items
      if (sourceBudget.budget_items.length > 0) {
        const budgetItems = sourceBudget.budget_items.map(item => ({
          budget_template_id: template.id,
          category_id: item.category_id,
          budgeted_amount: item.budgeted_amount,
        }))

        const { error: itemsError } = await supabase
          .from('budget_items')
          .insert(budgetItems)

        if (itemsError) throw itemsError
      }

      await refetchBudgets()
      return { error: null, data: template }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to copy budget' }
    }
  }

  return {
    budgetTemplates,
    loading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    updateBudgetItem,
    addBudgetItem,
    removeBudgetItem,
    getBudgetForMonth,
    getCurrentMonthBudget,
    copyBudgetToMonth,
    refetch: refetchBudgets,
  }
}

// Helper function to get month name
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1] || ''
}
