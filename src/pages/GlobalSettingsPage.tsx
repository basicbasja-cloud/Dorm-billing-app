import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { loadGlobalSettings, saveGlobalSettings } from '../lib/global-settings'
import { supabase } from '../lib/supabase'
import type { GlobalSettings } from '../types'

export function GlobalSettingsPage() {
  const [isAuthorized] = useState(() => sessionStorage.getItem('owner_access') === 'ok')
  const [settings, setSettings] = useState<GlobalSettings | null>(null)
  const [electricDraft, setElectricDraft] = useState('')
  const [waterDraft, setWaterDraft] = useState('')
  const [setupKeyDraft, setSetupKeyDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isAuthorized) {
      return
    }

    void (async () => {
      const loaded = await loadGlobalSettings()
      setSettings(loaded)
      setElectricDraft(String(loaded.electricUnitPrice))
      setWaterDraft(String(loaded.waterUnitPrice))
      setSetupKeyDraft(loaded.tenantSetupKey)
    })()
  }, [isAuthorized])

  if (!isAuthorized) {
    return <Navigate to="/owner" replace />
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()

    if (isSaving || !settings) {
      return
    }

    setError('')
    setSuccess('')

    const electricPrice = Number(electricDraft)
    const waterPrice = Number(waterDraft)

    if (!Number.isFinite(electricPrice) || electricPrice < 0) {
      setError('ราคาค่าไฟต่อหน่วยไม่ถูกต้อง')
      return
    }

    if (!Number.isFinite(waterPrice) || waterPrice < 0) {
      setError('ราคาค่าน้ำรายเดือนไม่ถูกต้อง')
      return
    }

    if (setupKeyDraft.trim().length < 4) {
      setError('รหัสยืนยันการลงทะเบียนต้องมีอย่างน้อย 4 ตัวอักษร')
      return
    }

    const updated: GlobalSettings = {
      electricUnitPrice: electricPrice,
      waterUnitPrice: waterPrice,
      tenantSetupKey: setupKeyDraft.trim(),
    }

    try {
      setIsSaving(true)
      await saveGlobalSettings(updated)
      setSettings(updated)
      setSuccess('บันทึกการตั้งค่าเรียบร้อย')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return (
      <main className="page">
        <section className="panel">
          <h1>ตั้งค่าส่วนกลาง</h1>
          <p>กำลังโหลดข้อมูล...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="panel-header-row">
          <h1>ตั้งค่าส่วนกลาง</h1>
          <Link to="/owner" className="btn btn-ghost">
            ← กลับไปแดชบอร์ด
          </Link>
        </div>
        <p className="panel-description">
          กำหนดราคาค่าไฟต่อหน่วยและค่าน้ำรายเดือน สำหรับใช้ในการออกบิลครั้งถัดไป
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="status-text success">{success}</p> : null}

        <form onSubmit={(event) => void handleSave(event)} className="global-settings-form">
          <div className="form-row">
            <label htmlFor="electric-price">ค่าไฟ (บาท/หน่วย)</label>
            <input
              id="electric-price"
              type="number"
              min={0}
              step={0.5}
              value={electricDraft}
              onChange={(event) => setElectricDraft(event.target.value)}
              placeholder="6"
              disabled={isSaving}
            />
            <p className="field-hint">ราคาค่าไฟฟ้าต่อหน่วย ปัจจุบันหน่วยละ {settings.electricUnitPrice} บาท</p>
          </div>

          <div className="form-row">
            <label htmlFor="water-price">ค่าน้ำรายเดือน (บาท)</label>
            <input
              id="water-price"
              type="number"
              min={0}
              step={0.5}
              value={waterDraft}
              onChange={(event) => setWaterDraft(event.target.value)}
              placeholder="0"
              disabled={isSaving}
            />
            <p className="field-hint">
              {settings.waterUnitPrice > 0
                ? `ปัจจุบันคิดค่าน้ำเดือนละ ${settings.waterUnitPrice} บาท`
                : 'ปัจจุบันค่าน้ำฟรี (ใส่ 0 เพื่อคงสถานะฟรี)'}
            </p>
          </div>

          <div className="form-row">
            <label htmlFor="setup-key">รหัสยืนยันลงทะเบียนผู้เช่า</label>
            <input
              id="setup-key"
              type="text"
              value={setupKeyDraft}
              onChange={(event) => setSetupKeyDraft(event.target.value)}
              placeholder="setup-tenant-2026"
              disabled={isSaving}
            />
            <p className="field-hint">ผู้เช่าต้องใช้รหัสนี้ในการลงทะเบียนครั้งแรก (อย่างน้อย 4 ตัวอักษร)</p>
          </div>

          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </form>

        {supabase ? (
          <p className="field-hint" style={{ marginTop: '16px' }}>
            ข้อมูลจะถูกบันทึกทั้งในเครื่องและซิงก์ไปยังฐานข้อมูล
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
