import { getBillingMonth, getDueDateLabel } from './date'
import type { BillRecord, BillingMode, Room } from '../types'

export interface CreateBillInput {
  room: Room
  mode: BillingMode
  meterBefore: number
  meterAfter: number
  electricUnitPrice: number
  waterUnitPrice: number
  issuedAt?: Date
}

export function createBill(input: CreateBillInput): BillRecord {
  const issuedAt = input.issuedAt ?? new Date()
  const units = Math.max(0, input.meterAfter - input.meterBefore)
  const electricAmount = units * input.electricUnitPrice
  const waterAmount = input.waterUnitPrice
  const totalAmount = input.room.monthlyRent + electricAmount + waterAmount
  const billingMonth = getBillingMonth(input.mode, issuedAt)

  const lines: BillRecord['lines'] = [
    {
      description: 'ค่าเช่าห้องพัก',
      quantityText: '1 เดือน',
      unitPrice: input.room.monthlyRent,
      amount: input.room.monthlyRent,
    },
    {
      description: `ค่าไฟฟ้า (เลขก่อน ${input.meterBefore} เลขหลัง ${input.meterAfter})`,
      quantityText: `${units} หน่วย`,
      unitPrice: input.electricUnitPrice,
      amount: electricAmount,
    },
  ]

  // ค่าน้ำ — แสดงเฉพาะเมื่อมีค่าใช้จ่าย
  if (waterAmount > 0) {
    lines.push({
      description: 'ค่าน้ำรายเดือน',
      quantityText: '1 เดือน',
      unitPrice: waterAmount,
      amount: waterAmount,
    })
  } else {
    lines.push({
      description: 'ค่าน้ำ',
      quantityText: 'ฟรี',
      unitPrice: 0,
      amount: 0,
    })
  }

  return {
    id: crypto.randomUUID(),
    roomId: input.room.id,
    mode: input.mode,
    monthlyRent: input.room.monthlyRent,
    electricUnitPrice: input.electricUnitPrice,
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
    lines,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}
