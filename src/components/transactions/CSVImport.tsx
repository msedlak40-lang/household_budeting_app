import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useRules } from '@/hooks/useRules'

interface ParsedRow {
  [key: string]: string
}

export default function CSVImport() {
  const { accounts } = useAccounts()
  const { importTransactions } = useTransactions()
  const { rules } = useRules()

  const [selectedAccount, setSelectedAccount] = useState('')
  const [csvData, setCsvData] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    description: '',
    amount: '',
  })
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'complete'>('upload')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<{ count: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('The CSV file is empty')
          return
        }

        const data = results.data as ParsedRow[]
        const fileHeaders = results.meta.fields || []

        setCsvData(data)
        setHeaders(fileHeaders)
        setStep('map')

        // Try to auto-detect columns
        const lowerHeaders = fileHeaders.map(h => h.toLowerCase())

        // Auto-detect date column
        const dateCol = fileHeaders.find((_, i) =>
          lowerHeaders[i].includes('date') || lowerHeaders[i].includes('posted')
        )

        // Auto-detect description column
        const descCol = fileHeaders.find((_, i) =>
          lowerHeaders[i].includes('description') ||
          lowerHeaders[i].includes('memo') ||
          lowerHeaders[i].includes('merchant') ||
          lowerHeaders[i].includes('name')
        )

        // Auto-detect amount column
        const amountCol = fileHeaders.find((_, i) =>
          lowerHeaders[i].includes('amount') ||
          lowerHeaders[i].includes('debit') ||
          lowerHeaders[i].includes('credit')
        )

        setColumnMapping({
          date: dateCol || '',
          description: descCol || '',
          amount: amountCol || '',
        })
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
      },
    })
  }

  const handleMapColumns = () => {
    if (!columnMapping.date || !columnMapping.description || !columnMapping.amount) {
      setError('Please map all required columns')
      return
    }

    setError('')
    setStep('preview')
  }

  const parseAmount = (amountStr: string): number => {
    if (!amountStr || amountStr.trim() === '') {
      console.warn('[CSVImport] Empty amount string, defaulting to 0')
      return 0
    }

    // Remove currency symbols, commas, and whitespace
    const cleaned = amountStr.replace(/[$,\s]/g, '')

    // Handle parentheses for negative numbers
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      const value = parseFloat(cleaned.slice(1, -1))
      if (isNaN(value)) {
        console.warn('[CSVImport] Invalid amount in parentheses:', amountStr, 'defaulting to 0')
        return 0
      }
      return -value
    }

    const value = parseFloat(cleaned)
    if (isNaN(value)) {
      console.warn('[CSVImport] Invalid amount:', amountStr, 'defaulting to 0')
      return 0
    }

    return value
  }

  const parseDate = (dateStr: string): string => {
    // Try to parse various date formats and convert to YYYY-MM-DD
    const date = new Date(dateStr)

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`)
    }

    return date.toISOString().split('T')[0]
  }

  const applyCategorization = (description: string): { categoryId: string | null; memberId: string | null } => {
    // Check each rule to see if it matches the description (case-insensitive)
    const lowerDescription = description.toLowerCase()

    for (const rule of rules) {
      if (lowerDescription.includes(rule.pattern.toLowerCase())) {
        return {
          categoryId: rule.category_id,
          memberId: rule.member_id,
        }
      }
    }

    return { categoryId: null, memberId: null }
  }

  const handleImport = async () => {
    if (!selectedAccount) {
      setError('Please select an account')
      return
    }

    setImporting(true)
    setError('')

    try {
      const transactionsToImport = csvData.map(row => {
        const description = row[columnMapping.description]
        const { categoryId, memberId } = applyCategorization(description)

        return {
          date: parseDate(row[columnMapping.date]),
          description,
          amount: parseAmount(row[columnMapping.amount]),
          category_id: categoryId,
          member_id: memberId,
        }
      })

      console.log('[CSVImport] Importing transactions:', transactionsToImport.length)
      console.log('[CSVImport] Sample transaction:', transactionsToImport[0])

      const { error, count } = await importTransactions(selectedAccount, transactionsToImport)

      if (error) {
        console.error('[CSVImport] Import error:', error)
        setError(error)
      } else {
        console.log('[CSVImport] Successfully imported:', count, 'transactions')
        setImportResult({ count })
        setStep('complete')
      }
    } catch (err) {
      console.error('[CSVImport] Exception during import:', err)
      setError(err instanceof Error ? err.message : 'Failed to import transactions')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setCsvData([])
    setHeaders([])
    setColumnMapping({ date: '', description: '', amount: '' })
    setStep('upload')
    setError('')
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const previewData = csvData.slice(0, 5).map(row => ({
    date: row[columnMapping.date],
    description: row[columnMapping.description],
    amount: row[columnMapping.amount],
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Import Transactions from CSV</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload CSV File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={!selectedAccount}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="text-sm text-gray-500 mt-1">
              Select an account first, then upload your bank's CSV export
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-900">
              <strong>Map your CSV columns</strong> to the required fields. We've tried to auto-detect them.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Column <span className="text-red-500">*</span>
            </label>
            <select
              value={columnMapping.date}
              onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select column...</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description Column <span className="text-red-500">*</span>
            </label>
            <select
              value={columnMapping.description}
              onChange={(e) => setColumnMapping({ ...columnMapping, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select column...</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Column <span className="text-red-500">*</span>
            </label>
            <select
              value={columnMapping.amount}
              onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select column...</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleMapColumns}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Next: Preview
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-900">
              <strong>Preview:</strong> Here are the first 5 transactions. If they look correct, click Import.
            </p>
          </div>

          <div className="text-sm text-gray-600 mb-2">
            <strong>Total transactions:</strong> {csvData.length}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{row.date}</td>
                    <td className="px-4 py-2 text-sm">{row.description}</td>
                    <td className="px-4 py-2 text-sm text-right">${parseAmount(row.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${csvData.length} Transactions`}
            </button>
            <button
              onClick={() => setStep('map')}
              disabled={importing}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={handleReset}
              disabled={importing}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-900">
              <strong>Success!</strong> Imported {importResult.count} transactions.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Import More Transactions
          </button>
        </div>
      )}
    </div>
  )
}
