import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import { useHousehold } from '@/hooks/useHousehold'

export default function Layout() {
  const { household, loading, error } = useHousehold()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Setting up your household...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!household) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No household found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
