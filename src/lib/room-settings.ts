import { ROOMS } from '../data/rooms'
import { supabase } from './supabase'
import type { Room } from '../types'

const STORAGE_KEY = 'dorm_room_settings_v1'

export interface RoomSetting {
  roomId: string
  monthlyRent: number
}

function getLocalSettings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

function setLocalSettings(settings: Record<string, number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export async function loadRoomSettings(): Promise<Record<string, number>> {
  const local = getLocalSettings()

  if (!supabase) {
    return local
  }

  const { data, error } = await supabase
    .from('room_settings')
    .select('room_id, monthly_rent')

  if (error || !data) {
    return local
  }

  const remote: Record<string, number> = {}
  for (const row of data) {
    remote[row.room_id] = row.monthly_rent
  }

  // Merge: remote overrides local, but always keep local as base fallback
  const merged = { ...local, ...remote }
  setLocalSettings(merged)
  return merged
}

export async function saveRoomSetting(roomId: string, monthlyRent: number): Promise<void> {
  const local = getLocalSettings()
  local[roomId] = monthlyRent
  setLocalSettings(local)

  if (!supabase) {
    return
  }

  const { error } = await supabase.from('room_settings').upsert(
    {
      room_id: roomId,
      monthly_rent: monthlyRent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' },
  )

  if (error) {
    console.warn('Supabase room_settings upsert failed; using local only:', error.message)
  }
}

/**
 * Returns rooms with any overridden rent prices applied.
 */
export function getRoomsWithSettings(settings: Record<string, number>): Room[] {
  return ROOMS.map((room) => ({
    ...room,
    monthlyRent: settings[room.id] ?? room.monthlyRent,
  }))
}
