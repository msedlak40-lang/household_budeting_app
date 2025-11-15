import { useMemo, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { detectRecurringTransactions, isOverdue, getDaysUntil } from '@/lib/recurringDetection'

export default function Recurring() {
  const { transactions, loading } = useTransactions()
  const { categories, getCategoryDisplayName } = useCategories()
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)

  const recurringPatterns = useMemo(() => {
    return detectRecurringTransactions(transactions)
  }, [transactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getFrequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'bg-purple-100 text-purple-800'
      case 'biweekly':
        return 'bg-blue-100 text-blue-800'
      case 'monthly':
        return 'bg-green-100 text-green-800'
      case 'quarterly':
        return 'bg-yellow-100 text-yellow-800'
      case 'yearly':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800'
    if (confidence >= 75) return 'bg-blue-100 text-blue-800'
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading recurring transactions...</div>
      </div>
    )
  }

  const activePatterns = recurringPatterns.filter(p => p.confidence >= 60)
  const totalMonthlyEstimate = activePatterns
    .filter(p => p.frequency === 'monthly')
    .reduce((sum, p) => sum + p.averageAmount, 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recurring Transactions</h1>
        <p className="text-gray-600 mt-1">
          Automatically detected subscriptions and recurring expenses
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase font-medium">Detected Patterns</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{activePatterns.length}</div>
          <div className="text-xs text-gray-500 mt-1">With 60%+ confidence</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase font-medium">Monthly Subscriptions</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {activePatterns.filter(p => p.frequency === 'monthly').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Recurring monthly</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase font-medium">Est. Monthly Cost</div>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {formatCurrency(totalMonthlyEstimate)}
          </div>
          <div className="text-xs text-gray-500 mt-1">From monthly patterns</div>
        </div>
      </div>

      {/* Recurring Patterns List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Detected Recurring Transactions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Click on a pattern to see transaction history
          </p>
        </div>

        {activePatterns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-2">No recurring patterns detected yet</p>
            <p className="text-sm text-gray-400">
              Import more transactions to help detect recurring expenses and subscriptions
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activePatterns.map((pattern, index) => {
              const category = pattern.categoryId
                ? categories.find(c => c.id === pattern.categoryId)
                : null
              const categoryName = category ? getCategoryDisplayName(category) : 'Uncategorized'
              const isExpanded = expandedPattern === pattern.vendor
              const daysUntil = pattern.nextExpectedDate ? getDaysUntil(pattern.nextExpectedDate) : null
              const overdue = pattern.nextExpectedDate ? isOverdue(pattern.nextExpectedDate) : false

              return (
                <div key={index} className="hover:bg-gray-50 transition-colors">
                  <div
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => setExpandedPattern(isExpanded ? null : pattern.vendor)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{pattern.vendor}</h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getFrequencyBadgeColor(
                              pattern.frequency
                            )}`}
                          >
                            {pattern.frequency}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceBadgeColor(
                              pattern.confidence
                            )}`}
                          >
                            {pattern.confidence}% confident
                          </span>
                        </div>

                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Average:</span> {formatCurrency(pattern.averageAmount)}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {categoryName}
                          </div>
                          <div>
                            <span className="font-medium">Occurrences:</span> {pattern.transactions.length}
                          </div>
                        </div>

                        {pattern.nextExpectedDate && (
                          <div className="mt-2">
                            <span className="text-sm">
                              <span className="font-medium text-gray-700">Next expected:</span>{' '}
                              <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                {new Date(pattern.nextExpectedDate).toLocaleDateString()}
                              </span>
                              {daysUntil !== null && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({overdue ? `${Math.abs(daysUntil)} days overdue` : `in ${daysUntil} days`})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Transaction History */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-gray-50">
                      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Description
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {pattern.transactions.map(t => (
                              <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {new Date(t.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {pattern.description}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">
                                  {formatCurrency(Math.abs(t.amount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-900">
          <strong>How it works:</strong> We automatically detect recurring transactions by analyzing
          patterns in your transaction history. Transactions with similar amounts occurring at regular
          intervals (weekly, monthly, etc.) are identified as potential subscriptions or recurring bills.
        </p>
      </div>
    </div>
  )
}
