import { supabase } from './supabase'
import type { GlobalSettings } from '../types'

const STORAGE_KEY = 'dorm_global_settings_v1'

const DEFAULTS: GlobalSettings = {
  electricUnitPrice: 6,
  waterUnitPrice: 0,
  tenantSetupKey: 'setup-tenant-2026',
}

function getLocalSettings(): GlobalSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULTS }
    }
    const parsed = JSON.parse(raw) as Partial<GlobalSettings>
    return {
      electricUnitPrice: parsed.electricUnitPrice ?? DEFAULTS.electricUnitPrice,
      waterUnitPrice: parsed.waterUnitPrice ?? DEFAULTS.waterUnitPrice,
      tenantSetupKey: parsed.tenantSetupKey ?? DEFAULTS.tenantSetupKey,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function setLocalSettings(settings: GlobalSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export async function loadGlobalSettings(): Promise<GlobalSettings> {
  const local = getLocalSettings()

  if (!supabase) {
    return local
  }

  const { data, error } = await supabase.rpc('get_global_settings')

  if (error || !data) {
    return local
  }

  const remote: GlobalSettings = {
    electricUnitPrice: (data as Record<string, unknown>).electric_unit_price as number ?? local.electricUnitPrice,
    waterUnitPrice: (data as Record<string, unknown>).water_unit_price as number ?? local.waterUnitPrice,
    tenantSetupKey: (data as Record<string, unknown>).tenant_setup_key as string ?? local.tenantSetupKey,
  }

  // Merge: remote overrides local
  const merged = { ...local, ...remote }
  setLocalSettings(merged)
  return merged
}

export async function saveGlobalSettings(settings: GlobalSettings): Promise<void> {
  setLocalSettings(settings)

  if (!supabase) {
    return
  }

  const { error } = await supabase.rpc('upsert_global_settings', {
    p_electric_unit_price: settings.electricUnitPrice,
    p_water_unit_price: settings.waterUnitPrice,
    p_tenant_setup_key: settings.tenantSetupKey,
  })

  if (error) {
    console.warn('Supabase upsert_global_settings failed; using local only:', error.message)
  }
}

export { DEFAULTS as DEFAULT_GLOBAL_SETTINGS }
