export type Building = 'A' | 'B'
export type BillingMode = 'prepaid' | 'postpaid'

export interface Room {
  id: string
  building: Building
  number: number
  monthlyRent: number
}

export interface BillLineItem {
  description: string
  quantityText: string
  unitPrice: number
  amount: number
}

export interface BillRecord {
  id: string
  roomId: string
  mode: BillingMode
  monthlyRent: number
  electricUnitPrice: number
  meterBefore: number
  meterAfter: number
  electricUnits: number
  electricAmount: number
  waterAmount: number
  totalAmount: number
  billingMonthLabel: string
  billingMonthKey: string
  dueDateLabel: string
  issuedAtISO: string
  lines: BillLineItem[]
}

export type BillsByRoom = Record<string, BillRecord>
