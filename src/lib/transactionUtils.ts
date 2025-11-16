import type { TransactionWithDetails } from '@/hooks/useTransactions'

/**
 * Determines if a transaction is an expense based on the account type and amount.
 *
 * For Credit Card accounts:
 *   - Positive amount (credit) = Expense (you spent money, increasing balance owed)
 *   - Negative amount (debit) = Refund/Return (money credited back, decreasing balance owed)
 *
 * For Bank accounts (Checking, Savings, etc.):
 *   - Positive amount (credit/deposit) = Income (money added to account)
 *   - Negative amount (debit/withdrawal) = Expense (money removed from account)
 */
export function isExpense(transaction: TransactionWithDetails): boolean {
  const accountType = transaction.account?.account_type
  const amount = transaction.amount

  // For credit card accounts
  if (accountType === 'Credit Card') {
    // Positive amount = expense (money spent on credit card)
    // Negative amount = refund (money credited back)
    return amount > 0
  }

  // For all other account types (Checking, Savings, Investment, Other, or null)
  // Negative amount = expense (money withdrawn)
  // Positive amount = income (money deposited)
  return amount < 0
}

/**
 * Determines if a transaction is income based on the account type and amount.
 */
export function isIncome(transaction: TransactionWithDetails): boolean {
  const accountType = transaction.account?.account_type
  const amount = transaction.amount

  // For credit card accounts
  if (accountType === 'Credit Card') {
    // Negative amount = refund (treated as income)
    // Positive amount = expense
    return amount < 0
  }

  // For all other account types
  // Positive amount = income (money deposited)
  // Negative amount = expense
  return amount > 0
}

/**
 * Gets the absolute value of a transaction amount for display purposes.
 * All expenses and income should be shown as positive values in the UI.
 */
export function getTransactionAbsoluteAmount(transaction: TransactionWithDetails): number {
  return Math.abs(transaction.amount)
}
