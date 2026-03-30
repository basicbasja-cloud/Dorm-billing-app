import { supabase } from './supabase'
import { ROOM_IDS } from '../data/rooms'

const TENANT_DOMAIN = 'tenant.somjai.app'
const LEGACY_TENANT_DOMAIN = 'tenant.somjai.local'
const TENANT_SETUP_KEY = import.meta.env.VITE_TENANT_SETUP_KEY ?? 'somjai1234'

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

async function getProfileRoom(userId: string): Promise<string | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('tenant_profiles')
    .select('room_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.room_id as string
}

export async function getCurrentTenant(): Promise<TenantIdentity | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return null
  }

  const roomId = await getProfileRoom(data.user.id)
  if (!roomId) {
    return null
  }

  return {
    userId: data.user.id,
    roomId,
    email: data.user.email ?? roomToTenantEmail(roomId),
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

  if (params.setupKey !== TENANT_SETUP_KEY) {
    throw new Error('รหัสยืนยันการลงทะเบียนไม่ถูกต้อง')
  }

  const email = roomToTenantEmail(params.roomId)

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('email rate limit exceeded')) {
      throw new Error('สมัครบัญชีถี่เกินไปชั่วคราว (email rate limit exceeded) กรุณารอประมาณ 1-5 นาที แล้วลองใหม่อีกครั้ง')
    }

    throw new Error(error.message)
  }

  const userId = data.user?.id
  if (!userId) {
    throw new Error('ไม่สามารถสร้างผู้ใช้ได้ กรุณาปิด email confirmation ใน Supabase Auth ก่อนทดสอบ')
  }

  const { error: profileError } = await supabase.from('tenant_profiles').upsert({
    user_id: userId,
    room_id: params.roomId,
  })

  if (profileError) {
    throw new Error(profileError.message)
  }
}

export async function signInTenant(roomId: string, password: string): Promise<TenantIdentity> {
  if (!supabase) {
    throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  }

  const primaryEmail = roomToTenantEmail(roomId)
  let usedEmail = primaryEmail
  let { data, error } = await supabase.auth.signInWithPassword({
    email: primaryEmail,
    password,
  })

  if (error || !data.user) {
    const legacyEmail = roomToTenantEmail(roomId, LEGACY_TENANT_DOMAIN)
    if (legacyEmail !== primaryEmail) {
      const legacyResult = await supabase.auth.signInWithPassword({
        email: legacyEmail,
        password,
      })

      data = legacyResult.data
      error = legacyResult.error
      usedEmail = legacyEmail
    }
  }

  if (error || !data.user) {
    throw new Error(error?.message ?? 'เข้าสู่ระบบไม่สำเร็จ')
  }

  const profileRoom = await getProfileRoom(data.user.id)
  if (!profileRoom) {
    throw new Error('ไม่พบการผูกบัญชีกับเลขห้อง')
  }

  if (profileRoom !== roomId) {
    throw new Error('บัญชีนี้ไม่ตรงกับเลขห้องที่เลือก')
  }

  return {
    userId: data.user.id,
    roomId: profileRoom,
    email: data.user.email ?? usedEmail,
  }
}

export async function signOutTenant(): Promise<void> {
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
}
