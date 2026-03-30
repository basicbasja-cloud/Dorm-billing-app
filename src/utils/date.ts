import type { BillingMode } from '../types'

function shiftMonth(date: Date, monthOffset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + monthOffset, 1)
}

function formatThaiMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getBillingMonth(mode: BillingMode, issuedAt: Date) {
  const targetDate = mode === 'prepaid' ? shiftMonth(issuedAt, 1) : shiftMonth(issuedAt, 0)

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
