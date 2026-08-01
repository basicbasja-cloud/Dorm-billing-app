import type { BillingMode } from '../types'

/**
 * Get the billing month key for a postpaid bill issued today.
 * - วันที่ 1-15: billing month = เดือนที่แล้ว (postpaid ของเดือนที่แล้ว)
 * - วันที่ 16+:   billing month = เดือนนี้
 */
export function getCurrentMonthKey(): string {
  const now = new Date()
  const day = now.getDate()
  const offset = day <= 15 ? -1 : 0
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
  // Postpaid: before 16th = previous month, after 15th = current month
  const day = issuedAt.getDate()
  const offset = day <= 15 ? -1 : 0
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

// Due date is now derived from the *billing target month*, not raw issuedAt,
// so it stays consistent regardless of which day the bill was issued.
export function getDueDateLabel(mode: BillingMode, issuedAt: Date): string {
  const targetDate = getBillingTargetDate(mode, issuedAt)
  // Postpaid: due 1 month after the billed month. Prepaid: due within the billed month itself.
  const dueMonthOffset = mode === 'postpaid' ? 1 : 0
  const dueDate = shiftMonth(targetDate, dueMonthOffset)
  dueDate.setDate(5)

  const day = new Intl.DateTimeFormat('th-TH', { day: 'numeric' }).format(dueDate)
  const monthYear = new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(dueDate)
  return `${day} ${monthYear}`
}    const day = issuedAt.getDate()
    const offset = day <= 15 ? -1 : 0
    targetDate = shiftMonth(issuedAt, offset)
  }

  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')

  return {
    label: formatThaiMonthYear(targetDate),
    key: `${year}-${month}`,
  }
}

export function getDueDateLabel(issuedAt: Date): string {
  const dueDate = new Date(issuedAt.getFullYear(), issuedAt.getMonth() + 1, 5)

  const day = new Intl.DateTimeFormat('th-TH', { day: 'numeric' }).format(dueDate)
  const monthYear = new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(dueDate)

  return `${day} ${monthYear}`
}
