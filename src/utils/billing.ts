import { ELECTRICITY_UNIT_PRICE } from '../data/rooms'
import { getBillingMonth, getDueDateLabel } from './date'
import type { BillRecord, BillingMode, Room } from '../types'

export interface CreateBillInput {
  room: Room
  mode: BillingMode
  meterBefore: number
  meterAfter: number
  issuedAt?: Date
}

export function createBill(input: CreateBillInput): BillRecord {
  const issuedAt = input.issuedAt ?? new Date()
  const units = Math.max(0, input.meterAfter - input.meterBefore)
  const electricAmount = units * ELECTRICITY_UNIT_PRICE
  const waterAmount = 0
  const totalAmount = input.room.monthlyRent + electricAmount + waterAmount
  const billingMonth = getBillingMonth(input.mode, issuedAt)

  return {
    id: crypto.randomUUID(),
    roomId: input.room.id,
    mode: input.mode,
    monthlyRent: input.room.monthlyRent,
    electricUnitPrice: ELECTRICITY_UNIT_PRICE,
    meterBefore: input.meterBefore,
    meterAfter: input.meterAfter,
    electricUnits: units,
    electricAmount,
    waterAmount,
    totalAmount,
    billingMonthLabel: billingMonth.label,
    billingMonthKey: billingMonth.key,
    dueDateLabel: getDueDateLabel(issuedAt),
    issuedAtISO: issuedAt.toISOString(),
    lines: [
      {
        description: 'ค่าเช่าห้องพัก',
        quantityText: '1 เดือน',
        unitPrice: input.room.monthlyRent,
        amount: input.room.monthlyRent,
      },
      {
        description: `ค่าไฟฟ้า (เลขก่อน ${input.meterBefore} เลขหลัง ${input.meterAfter})`,
        quantityText: `${units} หน่วย`,
        unitPrice: ELECTRICITY_UNIT_PRICE,
        amount: electricAmount,
      },
    ],
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}
