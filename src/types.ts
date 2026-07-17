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

/** Raw row shape from the Supabase `bills` table (snake_case). */
export interface BillRow {
  id: string
  room_id: string
  mode: BillRecord['mode']
  monthly_rent: number
  electric_unit_price: number
  meter_before: number
  meter_after: number
  electric_units: number
  electric_amount: number
  water_amount: number
  total_amount: number
  billing_month_label: string
  billing_month_key: string
  due_date_label: string
  issued_at_iso: string
  lines: BillRecord['lines']
}

export interface GlobalSettings {
  electricUnitPrice: number
  waterUnitPrice: number
  tenantSetupKey: string
}
