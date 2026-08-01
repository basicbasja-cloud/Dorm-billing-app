import type { BillingMode } from '../types'

/**
 * Billing cycle rule:
 * - Day 1-15 of a month  → billing month = this month
 * - Day 16-31 of a month → billing month = next month
 * Due date is always the 5th of the billing month.
 */
export function getCurrentMonthKey(): string {
  const now = new Date()
  const day = now.getDate()
  const offset = day <= 15 ? 0 : 1
  const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function shiftMonth(date: Date, monthOffset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + monthOffset, 1)
}

function formatThaiMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Shared: figure out which calendar month this bill is actually billing for.
function getBillingTargetDate(mode: BillingMode, issuedAt: Date): Date {
  if (mode === 'prepaid') {
    // Prepaid: always next month
    return shiftMonth(issuedAt, 1)
  }
  // Postpaid: day 1-15 = this month, day 16-31 = next month
  const day = issuedAt.getDate()
  const offset = day <= 15 ? 0 : 1
  return shiftMonth(issuedAt, offset)
}

export function getBillingMonth(mode: BillingMode, issuedAt: Date) {
  const targetDate = getBillingTargetDate(mode, issuedAt)
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  return {
    label: formatThaiMonthYear(targetDate),
    key: `${year}-${month}`,
  }
}

// Due date is always the 5th of the billing month itself, for both modes.
export function getDueDateLabel(mode: BillingMode, issuedAt: Date): string {
  const targetDate = getBillingTargetDate(mode, issuedAt)
  const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 5)

  const day = new Intl.DateTimeFormat('th-TH', { day: 'numeric' }).format(dueDate)
  const monthYear = new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(dueDate)
  return `${day} ${monthYear}`
}
