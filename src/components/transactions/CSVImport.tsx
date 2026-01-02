import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useRules } from '@/hooks/useRules'
import { extractVendor, createTransactionHash } from '@/lib/vendorExtraction'
import { normalizeVendor } from '@/lib/vendorNormalization'

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
    debit: '',
    credit: '',
    cardNumber: '',
  })
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('single')
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'complete'>('upload')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<{ count: number; duplicates?: number } | null>(null)

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

        // Auto-detect amount columns
        const amountCol = fileHeaders.find((_, i) =>
          lowerHeaders[i] === 'amount' ||
          lowerHeaders[i].includes('amount')
        )

        // Auto-detect separate debit/credit columns
        const debitCol = fileHeaders.find((_, i) =>
          lowerHeaders[i] === 'debit' ||
          lowerHeaders[i].includes('debit')
        )
        const creditCol = fileHeaders.find((_, i) =>
          lowerHeaders[i] === 'credit' ||
          lowerHeaders[i].includes('credit')
        )

        // Determine if we should use split mode (separate debit/credit columns)
        const hasSplitColumns = debitCol && creditCol
        setAmountMode(hasSplitColumns ? 'split' : 'single')

        // Auto-detect card number column
        const cardCol = fileHeaders.find((_, i) =>
          lowerHeaders[i].includes('card') ||
          lowerHeaders[i].includes('card no') ||
          lowerHeaders[i].includes('cardno') ||
          lowerHeaders[i].includes('card number')
        )

        setColumnMapping({
          date: dateCol || '',
          description: descCol || '',
          amount: hasSplitColumns ? '' : (amountCol || ''),
          debit: debitCol || '',
          credit: creditCol || '',
          cardNumber: cardCol || '',
        })
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
      },
    })
  }

  const handleMapColumns = () => {
    if (!columnMapping.date || !columnMapping.description) {
      setError('Please map Date and Description columns')
      return
    }

    // Validate amount columns based on mode
    if (amountMode === 'single' && !columnMapping.amount) {
      setError('Please map the Amount column')
      return
    }
    if (amountMode === 'split' && (!columnMapping.debit || !columnMapping.credit)) {
      setError('Please map both Debit and Credit columns')
      return
    }

    setError('')
    setStep('preview')
  }

  const parseAmount = (amountStr: string): number => {
    if (!amountStr || amountStr.trim() === '') {
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

  // Calculate amount from row based on mode (single amount or split debit/credit)
  const getAmountFromRow = (row: ParsedRow): number => {
    if (amountMode === 'single') {
      return parseAmount(row[columnMapping.amount])
    }

    // Split mode: debit is negative (expense), credit is positive (refund/income)
    const debitValue = parseAmount(row[columnMapping.debit])
    const creditValue = parseAmount(row[columnMapping.credit])

    // If there's a debit value, it's an expense (negative)
    // If there's a credit value, it's a refund/credit (positive)
    if (debitValue !== 0) {
      return -Math.abs(debitValue)  // Debits are expenses (negative)
    }
    if (creditValue !== 0) {
      return Math.abs(creditValue)  // Credits are refunds (positive)
    }

    return 0
  }

  const parseDate = (dateStr: string): string => {
    // Try to parse various date formats and convert to YYYY-MM-DD
    const date = new Date(dateStr)

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`)
    }

    return date.toISOString().split('T')[0]
  }

  const applyCategorization = (description: string, cardNumber?: string): { categoryId: string | null; memberId: string | null } => {
    // Check each rule to see if it matches the description or card number (case-insensitive)
    const lowerDescription = description.toLowerCase()
    const lowerCardNumber = cardNumber?.toLowerCase() || ''

    for (const rule of rules) {
      const lowerPattern = rule.pattern.toLowerCase()

      // Check if pattern matches description or card number
      if (lowerDescription.includes(lowerPattern) || (lowerCardNumber && lowerCardNumber.includes(lowerPattern))) {
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
        const cardNumber = columnMapping.cardNumber ? row[columnMapping.cardNumber] : undefined
        const { categoryId, memberId } = applyCategorization(description, cardNumber)

        const date = parseDate(row[columnMapping.date])
        const amount = getAmountFromRow(row)
        const vendor = extractVendor(description)
        const normalized = normalizeVendor(description)
        const transactionHash = createTransactionHash(date, description, amount, selectedAccount)

        return {
          date,
          description,
          amount,
          vendor,
          normalized_vendor: normalized.normalized,
          transaction_hash: transactionHash,
          category_id: categoryId,
          member_id: memberId,
        }
      })

      console.log('[CSVImport] Importing transactions:', transactionsToImport.length)
      console.log('[CSVImport] Sample transaction:', transactionsToImport[0])

      const { error, count, duplicates } = await importTransactions(selectedAccount, transactionsToImport)

      if (error) {
        console.error('[CSVImport] Import error:', error)
        setError(error)
      } else {
        console.log('[CSVImport] Successfully imported:', count, 'transactions')
        console.log('[CSVImport] Skipped duplicates:', duplicates || 0)
        setImportResult({ count, duplicates })
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
    setColumnMapping({ date: '', description: '', amount: '', debit: '', credit: '', cardNumber: '' })
    setAmountMode('single')
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
    amount: getAmountFromRow(row),
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

          {/* Amount Mode Toggle */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Format <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="amountMode"
                  value="single"
                  checked={amountMode === 'single'}
                  onChange={() => setAmountMode('single')}
                  className="mr-2"
                />
                <span className="text-sm">Single Amount Column</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="amountMode"
                  value="split"
                  checked={amountMode === 'split'}
                  onChange={() => setAmountMode('split')}
                  className="mr-2"
                />
                <span className="text-sm">Separate Debit/Credit Columns</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {amountMode === 'single'
                ? 'Use this if your CSV has one amount column (negative = expense, positive = credit)'
                : 'Use this if your CSV has separate columns for debits (purchases) and credits (returns/refunds)'}
            </p>
          </div>

          {/* Single Amount Column */}
          {amountMode === 'single' && (
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
          )}

          {/* Split Debit/Credit Columns */}
          {amountMode === 'split' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Debit Column (purchases) <span className="text-red-500">*</span>
                </label>
                <select
                  value={columnMapping.debit}
                  onChange={(e) => setColumnMapping({ ...columnMapping, debit: e.target.value })}
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
                  Credit Column (returns/refunds) <span className="text-red-500">*</span>
                </label>
                <select
                  value={columnMapping.credit}
                  onChange={(e) => setColumnMapping({ ...columnMapping, credit: e.target.value })}
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
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number Column (optional)
            </label>
            <select
              value={columnMapping.cardNumber}
              onChange={(e) => setColumnMapping({ ...columnMapping, cardNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Skip (not needed)</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Use this to auto-assign members based on card number patterns
            </p>
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
                    <td className={`px-4 py-2 text-sm text-right ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.amount >= 0 ? '+' : ''}${row.amount.toFixed(2)}
                    </td>
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
              <strong>Success!</strong> Imported {importResult.count} new transaction{importResult.count !== 1 ? 's' : ''}.
            </p>
            {importResult.duplicates && importResult.duplicates > 0 && (
              <p className="text-green-800 text-sm mt-2">
                Skipped {importResult.duplicates} duplicate transaction{importResult.duplicates !== 1 ? 's' : ''} (already in database).
              </p>
            )}
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
