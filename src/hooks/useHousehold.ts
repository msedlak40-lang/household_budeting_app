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
      setLoading(false)
      return
    }

    const initializeHousehold = async () => {
      try {
        // Check if user has a household
        const { data: existingHousehold, error: fetchError } = await supabase
          .from('households')
          .select('*')
          .eq('created_by', user.id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned", which is expected for new users
          throw fetchError
        }

        if (existingHousehold) {
          setHousehold(existingHousehold)
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
