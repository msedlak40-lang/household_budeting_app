import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Household {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export function useHousehold() {
  const { user } = useAuth()
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      console.log('[useHousehold] No user found')
      setLoading(false)
      return
    }

    console.log('[useHousehold] User found:', user.id)

    const initializeHousehold = async () => {
      try {
        // Check if user has a household - get all households for this user
        const { data: existingHouseholds, error: fetchError } = await supabase
          .from('households')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: true })
          .limit(1)

        if (fetchError) {
          console.error('[useHousehold] Fetch error:', fetchError)
          throw fetchError
        }

        if (existingHouseholds && existingHouseholds.length > 0) {
          // Use the first (oldest) household
          console.log('[useHousehold] Household found:', existingHouseholds[0])
          setHousehold(existingHouseholds[0])
        } else {
          // Create a new household for this user
          const { data: newHousehold, error: createError } = await supabase
            .from('households')
            .insert({
              name: `${user.email}'s Household`,
              created_by: user.id,
            })
            .select()
            .single()

          if (createError) throw createError

          setHousehold(newHousehold)

          // Optionally create default categories
          if (newHousehold) {
            const defaultCategories = [
              'Auto',
              'Home',
              'Sports',
              'Clothing',
              'Food',
              'Subscriptions',
              'Kids',
              'Entertainment',
              'Healthcare',
              'Misc',
            ]

            await supabase.from('categories').insert(
              defaultCategories.map((name) => ({
                household_id: newHousehold.id,
                name,
              }))
            )
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize household')
      } finally {
        setLoading(false)
      }
    }

    initializeHousehold()
  }, [user])

  return { household, loading, error }
}
