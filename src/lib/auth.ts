import { supabase } from './supabase'
import { ROOM_IDS } from '../data/rooms'
import type { BillRecord } from '../types'

const TENANT_DOMAIN = 'tenant.somjai.app'
const TENANT_SESSION_STORAGE_KEY = 'tenant_session_v2'

interface TenantSession {
  roomId: string
  passwordHash: string
}

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

export interface TenantIdentity {
  userId: string
  roomId: string
  email: string
}

export function roomToTenantEmail(roomId: string, domain: string = TENANT_DOMAIN): string {
  return `${roomId.toLowerCase()}@${domain}`
}

export function canUseTenantAuth(): boolean {
  return Boolean(supabase)
}

function toBillRecord(row: BillRow): BillRecord {
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

function getTenantSession(): TenantSession | null {
  try {
    const raw = localStorage.getItem(TENANT_SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<TenantSession>
    if (!parsed.roomId || !parsed.passwordHash) {
      return null
    }

    return {
      roomId: parsed.roomId,
      passwordHash: parsed.passwordHash,
    }
  } catch {
    return null
  }
}

function setTenantSession(session: TenantSession | null): void {
  if (!session) {
    localStorage.removeItem(TENANT_SESSION_STORAGE_KEY)
    return
  }

  localStorage.setItem(TENANT_SESSION_STORAGE_KEY, JSON.stringify(session))
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const digestArray = Array.from(new Uint8Array(digest))
  return digestArray.map((value) => value.toString(16).padStart(2, '0')).join('')
}

export async function getCurrentTenant(): Promise<TenantIdentity | null> {
  const session = getTenantSession()
  if (!session) {
    return null
  }

  if (!supabase) {
    return {
      userId: session.roomId,
      roomId: session.roomId,
      email: roomToTenantEmail(session.roomId),
    }
  }

  const { data, error } = await supabase.rpc('tenant_login', {
    p_room_id: session.roomId,
    p_password_hash: session.passwordHash,
  })

  if (error || data !== true) {
    setTenantSession(null)
    return null
  }

  return {
    userId: session.roomId,
    roomId: session.roomId,
    email: roomToTenantEmail(session.roomId),
  }
}

export async function registerTenantWithRoom(params: {
  roomId: string
  password: string
  setupKey: string
}): Promise<void> {
  if (!supabase) {
    throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  }

  if (!ROOM_IDS.includes(params.roomId)) {
    throw new Error('เลขห้องไม่ถูกต้อง')
  }

  const passwordHash = await hashPassword(params.password)
  const { error } = await supabase.rpc('tenant_register', {
    p_room_id: params.roomId,
    p_password_hash: passwordHash,
    p_setup_key: params.setupKey.trim(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function signInTenant(roomId: string, password: string): Promise<TenantIdentity> {
  if (!supabase) {
    throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  }

  const passwordHash = await hashPassword(password)
  const { data, error } = await supabase.rpc('tenant_login', {
    p_room_id: roomId,
    p_password_hash: passwordHash,
  })

  if (error || data !== true) {
    throw new Error(error?.message ?? 'เลขห้องหรือรหัสผ่านไม่ถูกต้อง')
  }

  setTenantSession({ roomId, passwordHash })

  return {
    userId: roomId,
    roomId,
    email: roomToTenantEmail(roomId),
  }
}

export async function getTenantBills(roomId: string): Promise<BillRecord[]> {
  if (!supabase) {
    return []
  }

  const session = getTenantSession()
  if (!session || session.roomId !== roomId) {
    return []
  }

  const { data, error } = await supabase.rpc('tenant_fetch_bills', {
    p_room_id: roomId,
    p_password_hash: session.passwordHash,
  })

  if (error || !Array.isArray(data)) {
    return []
  }

  return (data as BillRow[]).map(toBillRecord)
}

export async function signOutTenant(): Promise<void> {
  setTenantSession(null)
}
