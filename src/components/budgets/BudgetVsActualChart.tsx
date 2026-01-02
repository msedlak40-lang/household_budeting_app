import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { BudgetVsActual } from '@/lib/budgetCalculations'
import { formatBudgetCurrency } from '@/lib/budgetCalculations'

interface BudgetVsActualChartProps {
  data: BudgetVsActual[]
}

export default function BudgetVsActualChart({ data }: BudgetVsActualChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      month: item.monthYear,
      Budgeted: item.budgetedTotal,
      Actual: item.actualTotal,
      Variance: item.variance,
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No budget data available
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number) => formatBudgetCurrency(value)}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '0.75rem',
            }}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Bar
            dataKey="Budgeted"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name="Budget"
          />
          <Bar
            dataKey="Actual"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="Actual"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
