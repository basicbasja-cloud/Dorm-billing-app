import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadRoomSettings, saveRoomSetting } from '../lib/room-settings'
import { ROOMS } from '../data/rooms'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/billing'

export function RoomSettingsPage() {
  const [settings, setSettings] = useState<Record<string, number>>({})
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    void (async () => {
      const loaded = await loadRoomSettings()
      setSettings(loaded)
    })()
  }, [])

  function handleRentChange(roomId: string, rawValue: string) {
    setDraftValues((prev) => ({ ...prev, [roomId]: rawValue }))
  }

  function getDisplayValue(roomId: string): string {
    if (roomId in draftValues) {
      return draftValues[roomId]
    }
    const overridden = roomId in settings
    return overridden ? String(settings[roomId]) : String(ROOMS.find((r) => r.id === roomId)?.monthlyRent ?? '')
  }

  async function handleSave(roomId: string) {
    setError('')
    setSuccess('')
    const raw = draftValues[roomId] ?? getDisplayValue(roomId)
    const numeric = Number(raw)

    if (!Number.isFinite(numeric) || numeric < 0) {
      setError(`ค่าเช่าห้อง ${roomId} ไม่ถูกต้อง`)
      return
    }

    setSaving((prev) => ({ ...prev, [roomId]: true }))
    try {
      await saveRoomSetting(roomId, numeric)
      setSettings((prev) => ({ ...prev, [roomId]: numeric }))
      setDraftValues((prev) => {
        const copy = { ...prev }
        delete copy[roomId]
        return copy
      })
      setSuccess(`บันทึกค่าเช่าห้อง ${roomId} แล้ว`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving((prev) => ({ ...prev, [roomId]: false }))
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="panel-header-row">
          <h1>ตั้งค่าค่าเช่ารายห้อง</h1>
          <Link to="/owner" className="btn btn-ghost">
            ← กลับไปแดชบอร์ด
          </Link>
        </div>
        <p className="panel-description">
          แก้ไขค่าเช่ารายห้องได้ที่นี่ ค่าเช่าที่บันทึกจะถูกใช้ในการออกบิลครั้งถัดไป
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="status-text success">{success}</p> : null}

        <div className="room-settings-grid">
          <div className="room-settings-header">
            <span>ห้อง</span>
            <span>ค่าเช่าปัจจุบัน</span>
            <span>ค่าเช่าใหม่</span>
            <span />
          </div>
          {ROOMS.map((room) => {
            const currentRent = ROOMS.find((r) => r.id === room.id)?.monthlyRent ?? 0
            const effectiveRent = settings[room.id] ?? currentRent
            const isOverridden = room.id in settings
            const isSaving = saving[room.id] ?? false

            return (
              <div key={room.id} className={`room-settings-row ${isOverridden ? 'overridden' : ''}`}>
                <span className="room-label">{room.id}</span>
                <span className={`rent-current ${effectiveRent !== currentRent ? 'strikethrough' : ''}`}>
                  {formatCurrency(currentRent)}
                </span>
                <input
                  type="number"
                  min={0}
                  value={getDisplayValue(room.id)}
                  onChange={(event) => handleRentChange(room.id, event.target.value)}
                  placeholder={String(currentRent)}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => void handleSave(room.id)}
                  disabled={isSaving}
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            )
          })}
        </div>

        {supabase ? (
          <p className="field-hint" style={{ marginTop: '16px' }}>
            ข้อมูลจะถูกบันทึกทั้งในเครื่องและซิงก์ไปยังฐานข้อมูล (ถ้าล็อกอิน Supabase อยู่)
          </p>
        ) : (
          <p className="field-hint" style={{ marginTop: '16px' }}>
            บันทึกเฉพาะในเครื่อง (ไม่มีการเชื่อมต่อ Supabase)
          </p>
        )}
      </section>
    </main>
  )
}
