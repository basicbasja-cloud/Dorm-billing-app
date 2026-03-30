import { supabase } from './supabase'
import type { BillRecord, BillsByRoom } from '../types'

const STORAGE_KEY = 'dorm_bills_v1'

interface BillRow {
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

function isBillRecord(value: unknown): value is BillRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  return 'roomId' in value && 'issuedAtISO' in value
}

function fromRow(row: BillRow): BillRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    mode: row.mode,
    monthlyRent: row.monthly_rent,
    electricUnitPrice: row.electric_unit_price,
    meterBefore: row.meter_before,
    meterAfter: row.meter_after,
    electricUnits: row.electric_units,
    electricAmount: row.electric_amount,
    waterAmount: row.water_amount,
    totalAmount: row.total_amount,
    billingMonthLabel: row.billing_month_label,
    billingMonthKey: row.billing_month_key,
    dueDateLabel: row.due_date_label,
    issuedAtISO: row.issued_at_iso,
    lines: row.lines,
  }
}

function getLocalBills(): BillRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isBillRecord)
  } catch {
    return []
  }
}

function setLocalBills(bills: BillRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills))
}

function toLatestMap(bills: BillRecord[]): BillsByRoom {
  const sorted = [...bills].sort((a, b) => {
    return new Date(b.issuedAtISO).getTime() - new Date(a.issuedAtISO).getTime()
  })

  return sorted.reduce<BillsByRoom>((acc, bill) => {
    if (!acc[bill.roomId]) {
      acc[bill.roomId] = bill
    }
    return acc
  }, {})
}

function sortBillsNewestFirst(bills: BillRecord[]): BillRecord[] {
  return [...bills].sort((a, b) => {
    return new Date(b.issuedAtISO).getTime() - new Date(a.issuedAtISO).getTime()
  })
}

async function hasAuthenticatedUser(): Promise<boolean> {
  if (!supabase) {
    return false
  }

  const { data, error } = await supabase.auth.getUser()
  if (error) {
    return false
  }

  return Boolean(data.user)
}

async function getAuthenticatedClient() {
  if (!supabase) {
    return null
  }

  const hasUser = await hasAuthenticatedUser()
  if (!hasUser) {
    return null
  }

  return supabase
}

export interface MonthlySummary {
  billingMonthKey: string
  billingMonthLabel: string
  billCount: number
  rentTotal: number
  electricTotal: number
  grandTotal: number
}

export function summarizeMonthlyRevenue(bills: BillRecord[]): MonthlySummary[] {
  const grouped = bills.reduce<Record<string, MonthlySummary>>((acc, bill) => {
    const key = bill.billingMonthKey
    if (!acc[key]) {
      acc[key] = {
        billingMonthKey: key,
        billingMonthLabel: bill.billingMonthLabel,
        billCount: 0,
        rentTotal: 0,
        electricTotal: 0,
        grandTotal: 0,
      }
    }

    acc[key].billCount += 1
    acc[key].rentTotal += bill.monthlyRent
    acc[key].electricTotal += bill.electricAmount
    acc[key].grandTotal += bill.totalAmount
    return acc
  }, {})

  return Object.values(grouped).sort((a, b) => b.billingMonthKey.localeCompare(a.billingMonthKey))
}

export function getRoomHistoryFromBills(allBills: BillRecord[], roomId: string): BillRecord[] {
  return sortBillsNewestFirst(allBills.filter((bill) => bill.roomId === roomId))
}

export async function getAllBills(): Promise<BillRecord[]> {
  const client = await getAuthenticatedClient()
  if (!client) {
    return sortBillsNewestFirst(getLocalBills())
  }

  const { data, error } = await client
    .from('bills')
    .select('*')
    .order('issued_at_iso', { ascending: false })

  if (error || !data) {
    return sortBillsNewestFirst(getLocalBills())
  }

  const remoteBills = (data as BillRow[]).map(fromRow)
  setLocalBills(remoteBills)
  return sortBillsNewestFirst(remoteBills)
}

export async function getBillsByRoom(roomId: string): Promise<BillRecord[]> {
  const client = await getAuthenticatedClient()
  if (!client) {
    return getRoomHistoryFromBills(getLocalBills(), roomId)
  }

  const { data, error } = await client
    .from('bills')
    .select('*')
    .eq('room_id', roomId)
    .order('issued_at_iso', { ascending: false })

  if (error || !data) {
    return getRoomHistoryFromBills(getLocalBills(), roomId)
  }

  return (data as BillRow[]).map(fromRow)
}

export async function getLatestBills(): Promise<BillsByRoom> {
  const client = await getAuthenticatedClient()
  if (!client) {
    return toLatestMap(getLocalBills())
  }

  const { data, error } = await client
    .from('bills')
    .select('*')
    .order('issued_at_iso', { ascending: false })

  if (error || !data) {
    return toLatestMap(getLocalBills())
  }

  const remoteBills = (data as BillRow[]).map(fromRow)
  setLocalBills(remoteBills)
  return toLatestMap(remoteBills)
}

export async function saveBill(bill: BillRecord): Promise<void> {
  const currentBills = getLocalBills()
  const nextBills = [...currentBills, bill]
  setLocalBills(nextBills)

  const client = await getAuthenticatedClient()
  if (!client) {
    return
  }

  const { error } = await client.from('bills').insert({
    id: bill.id,
    room_id: bill.roomId,
    mode: bill.mode,
    monthly_rent: bill.monthlyRent,
    electric_unit_price: bill.electricUnitPrice,
    meter_before: bill.meterBefore,
    meter_after: bill.meterAfter,
    electric_units: bill.electricUnits,
    electric_amount: bill.electricAmount,
    water_amount: bill.waterAmount,
    total_amount: bill.totalAmount,
    billing_month_label: bill.billingMonthLabel,
    billing_month_key: bill.billingMonthKey,
    due_date_label: bill.dueDateLabel,
    issued_at_iso: bill.issuedAtISO,
    lines: bill.lines,
  })

  if (error) {
    // Roll back local cache to avoid showing success while remote history is missing.
    setLocalBills(currentBills)

    if (error.message.toLowerCase().includes('row-level security')) {
      throw new Error('บันทึกบิลไม่สำเร็จ: ไม่มีสิทธิ์เขียนข้อมูล (RLS) กรุณาตรวจ owner_profiles และ policy ใน Supabase')
    }

    throw new Error(`บันทึกบิลไม่สำเร็จ: ${error.message}`)
  }
}

export async function clearAllBills(): Promise<void> {
  setLocalBills([])

  const client = await getAuthenticatedClient()
  if (!client) {
    return
  }

  const { error } = await client.from('bills').delete().not('id', 'is', null)
  if (error) {
    throw new Error(`ลบข้อมูลบน Supabase ไม่สำเร็จ: ${error.message}`)
  }
}
