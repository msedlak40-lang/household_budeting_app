import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/hooks/useTransactions'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/members', label: 'Members' },
  { path: '/accounts', label: 'Accounts' },
  { path: '/categories', label: 'Categories' },
  { path: '/rules', label: 'Rules' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/inbox', label: 'Inbox', showBadge: true },
  { path: '/recurring', label: 'Recurring' },
  { path: '/analysis', label: 'Analysis' },
]

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { transactions } = useTransactions()

  const uncategorizedCount = transactions.filter(t => !t.category_id).length

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Budget App</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md relative',
                    location.pathname === item.path
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.label}
                  {item.showBadge && uncategorizedCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {uncategorizedCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
