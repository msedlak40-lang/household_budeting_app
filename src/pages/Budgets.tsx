import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, TrendingUp, Copy, Trash2, Eye, MoreVertical } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import {
  getBudgetProgress,
  getMonthName,
  formatBudgetCurrency,
  getBudgetProgressColor,
} from '@/lib/budgetCalculations'
import BudgetWizard from '@/components/budgets/BudgetWizard'

export default function Budgets() {
  const { budgetTemplates, loading, error, deleteBudget, copyBudgetToMonth, refetch } = useBudgets()
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const [showWizard, setShowWizard] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState<string | null>(null)
  const [copyMonth, setCopyMonth] = useState(new Date().getMonth() + 1)
  const [copyYear, setCopyYear] = useState(new Date().getFullYear())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return
    }
    const result = await deleteBudget(id)
    if (result.error) {
      alert(`Error: ${result.error}`)
    }
  }

  const handleCopy = async (budgetId: string) => {
    const result = await copyBudgetToMonth(budgetId, copyMonth, copyYear)
    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      setShowCopyModal(null)
    }
  }

  const now = new Date()
  const currentMonthBudget = budgetTemplates.find(
    b => b.month === now.getMonth() + 1 && b.year === now.getFullYear() && b.is_active
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading budgets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-gray-600 mt-1">Create and manage monthly budgets</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Budget
        </button>
      </div>

      {/* Current Month Budget Summary */}
      {currentMonthBudget && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold">Current Month</h2>
              <p className="text-gray-500">
                {getMonthName(currentMonthBudget.month)} {currentMonthBudget.year}
              </p>
            </div>
            <Link
              to={`/budgets/${currentMonthBudget.id}`}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              View Details
              <Eye className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {(() => {
            const progress = getBudgetProgress(currentMonthBudget, transactions, categories)
            const progressColor = getBudgetProgressColor(progress.percentUsed)
            const colorClasses = {
              green: 'bg-green-500',
              blue: 'bg-blue-500',
              yellow: 'bg-yellow-500',
              red: 'bg-red-500',
            }

            return (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Budgeted</div>
                    <div className="text-xl font-bold">
                      {formatBudgetCurrency(progress.totalBudgeted)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Spent</div>
                    <div className="text-xl font-bold">
                      {formatBudgetCurrency(progress.totalSpent)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Remaining</div>
                    <div className={`text-xl font-bold ${progress.totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatBudgetCurrency(progress.totalRemaining)}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress.percentUsed)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${colorClasses[progressColor]}`}
                      style={{ width: `${Math.min(100, progress.percentUsed)}%` }}
                    />
                  </div>
                </div>

                {progress.overBudgetCategories.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm font-medium text-red-800 mb-1">
                      Over Budget ({progress.overBudgetCategories.length} categories)
                    </div>
                    <div className="text-xs text-red-700">
                      {progress.overBudgetCategories.slice(0, 3).map(c => c.categoryName).join(', ')}
                      {progress.overBudgetCategories.length > 3 && ` +${progress.overBudgetCategories.length - 3} more`}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Budget List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">All Budgets</h2>
        </div>

        {budgetTemplates.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-4">No budgets yet. Create your first budget to start tracking spending.</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Budget
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {budgetTemplates.map((budget) => {
              const progress = getBudgetProgress(budget, transactions, categories)
              const progressColor = getBudgetProgressColor(progress.percentUsed)
              const colorClasses = {
                green: 'bg-green-500',
                blue: 'bg-blue-500',
                yellow: 'bg-yellow-500',
                red: 'bg-red-500',
              }
              const isCurrentMonth = budget.month === now.getMonth() + 1 && budget.year === now.getFullYear()

              return (
                <div key={budget.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Link
                          to={`/budgets/${budget.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {budget.name}
                        </Link>
                        {isCurrentMonth && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Current
                          </span>
                        )}
                        {!budget.is_active && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {getMonthName(budget.month)} {budget.year} • {budget.budget_items.length} categories • {budget.lookback_months}mo average
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right mr-4">
                        <div className="text-sm font-medium">
                          {formatBudgetCurrency(progress.totalSpent)} / {formatBudgetCurrency(progress.totalBudgeted)}
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${colorClasses[progressColor]}`}
                            style={{ width: `${Math.min(100, progress.percentUsed)}%` }}
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === budget.id ? null : budget.id)}
                          className="p-2 hover:bg-gray-100 rounded-md"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === budget.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                            <Link
                              to={`/budgets/${budget.id}`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Link>
                            <button
                              onClick={() => {
                                setShowCopyModal(budget.id)
                                setOpenMenuId(null)
                              }}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy to Month
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(budget.id, budget.name)
                                setOpenMenuId(null)
                              }}
                              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link
          to="/budget-analysis"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <div className="font-medium">Budget Analysis</div>
              <div className="text-sm text-gray-500">Compare budgets vs actual spending</div>
            </div>
          </div>
        </Link>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center">
            <Plus className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <div className="font-medium">New Budget</div>
              <div className="text-sm text-gray-500">Create a budget using historical data</div>
            </div>
          </div>
        </button>
      </div>

      {/* Budget Wizard Modal */}
      <BudgetWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={refetch}
      />

      {/* Copy Budget Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Copy Budget to New Month</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={copyMonth}
                  onChange={(e) => setCopyMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {getMonthName(i + 1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={copyYear}
                  onChange={(e) => setCopyYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCopyModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCopy(showCopyModal)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Copy Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
