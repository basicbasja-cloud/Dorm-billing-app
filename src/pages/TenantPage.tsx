import { useEffect, useMemo, useRef, useState } from 'react'
import { BillDocument } from '../components/BillDocument'
import { ROOM_IDS } from '../data/rooms'
import {
  canUseTenantAuth,
  getTenantBills,
  getCurrentTenant,
  registerTenantWithRoom,
  signInTenant,
  signOutTenant,
  type TenantIdentity,
} from '../lib/auth'
import type { BillRecord } from '../types'
import { saveNodeAsPng } from '../utils/png'

export function TenantPage() {
  const [identity, setIdentity] = useState<TenantIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')
  const [authRoomId, setAuthRoomId] = useState<string>(ROOM_IDS[0])
  const [password, setPassword] = useState('')
  const [setupKey, setSetupKey] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin')
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [history, setHistory] = useState<BillRecord[]>([])
  const [selectedBillId, setSelectedBillId] = useState<string>('')
  const billRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      setIsLoading(true)
      try {
        const current = await getCurrentTenant()
        if (current) {
          setIdentity(current)
          const bills = await getTenantBills(current.roomId)
          setHistory(bills)
          setSelectedBillId(bills[0]?.id ?? '')
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'โหลดบิลไม่สำเร็จ')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const bill = useMemo<BillRecord | undefined>(() => {
    if (!selectedBillId) {
      return history[0]
    }
    return history.find((item) => item.id === selectedBillId)
  }, [history, selectedBillId])

  async function refreshRoomBills(roomId: string) {
    const bills = await getTenantBills(roomId)
    setHistory(bills)
    setSelectedBillId(bills[0]?.id ?? '')
  }

  async function handleTenantSignIn() {
    if (isAuthSubmitting) {
      return
    }

    setError('')
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน')
      return
    }

    try {
      setIsAuthSubmitting(true)
      const tenant = await signInTenant(authRoomId, password)
      setIdentity(tenant)
      await refreshRoomBills(tenant.roomId)
      setPassword('')
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  async function handleTenantRegister() {
    if (isAuthSubmitting) {
      return
    }

    setError('')
    if (!password || password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    try {
      setIsAuthSubmitting(true)
      await registerTenantWithRoom({
        roomId: authRoomId,
        password,
        setupKey,
      })
      const tenant = await signInTenant(authRoomId, password)
      setIdentity(tenant)
      await refreshRoomBills(tenant.roomId)
      setPassword('')
      setSetupKey('')
      setAuthMode('signin')
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'ลงทะเบียนไม่สำเร็จ')
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  async function handleSignOut() {
    await signOutTenant()
    setIdentity(null)
    setHistory([])
    setSelectedBillId('')
  }

  async function saveBillAsPng() {
    setError('')
    setNotice('')

    if (!billRef.current || !bill) {
      return
    }

    try {
      const result = await saveNodeAsPng(billRef.current, `${bill.roomId}_${bill.billingMonthKey}.png`)
      if (result === 'preview') {
        setNotice('มือถือบางรุ่นจะไม่ดาวน์โหลดอัตโนมัติ ระบบเปิดรูปให้แล้ว กรุณากดค้างที่รูปแล้วเลือกบันทึกภาพ')
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'เซฟ PNG ไม่สำเร็จ')
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <h1>โหมดผู้เช่า (ล็อกอินแยกห้อง)</h1>
        <p className="panel-description">ผู้เช่าจะเห็นเฉพาะบิลของห้องตัวเองเท่านั้น</p>

        {isLoading ? <p>กำลังโหลดข้อมูล...</p> : null}
        {!canUseTenantAuth() ? (
          <p className="status-text warning">ยังไม่ได้ตั้งค่า Supabase จึงไม่สามารถล็อกอินผู้เช่าแบบแยกห้องได้</p>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="status-text warning">{notice}</p> : null}

        {!identity && canUseTenantAuth() ? (
          <div className="tenant-auth-box">
            <div className="toggle-auth-mode">
              <button
                className={`btn ${authMode === 'signin' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAuthMode('signin')}
                type="button"
                disabled={isAuthSubmitting}
              >
                เข้าสู่ระบบ
              </button>
              <button
                className={`btn ${authMode === 'register' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAuthMode('register')}
                type="button"
                disabled={isAuthSubmitting}
              >
                ลงทะเบียนครั้งแรก
              </button>
            </div>

            <div className="form-row">
              <label htmlFor="tenant-auth-room">เลขห้อง</label>
              <select id="tenant-auth-room" value={authRoomId} onChange={(event) => setAuthRoomId(event.target.value)}>
                {ROOM_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="tenant-password">รหัสผ่าน</label>
              <input
                id="tenant-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                disabled={isAuthSubmitting}
              />
            </div>

            {authMode === 'register' ? (
              <div className="form-row">
                <label htmlFor="tenant-setup-key">รหัสยืนยันลงทะเบียน</label>
                <input
                  id="tenant-setup-key"
                  type="password"
                  value={setupKey}
                  onChange={(event) => setSetupKey(event.target.value)}
                  placeholder="รับจากเจ้าของหอ"
                  disabled={isAuthSubmitting}
                />
              </div>
            ) : null}

            {authMode === 'signin' ? (
              <button className="btn btn-primary" type="button" onClick={() => void handleTenantSignIn()} disabled={isAuthSubmitting}>
                {isAuthSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบผู้เช่า'}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => void handleTenantRegister()} disabled={isAuthSubmitting}>
                {isAuthSubmitting ? 'กำลังลงทะเบียน...' : 'สร้างบัญชีห้องนี้'}
              </button>
            )}
          </div>
        ) : null}

        {identity ? (
          <div className="tenant-session-head">
            <p className="status-text success">เข้าสู่ระบบแล้ว: ห้อง {identity.roomId}</p>
            <button className="btn btn-secondary" onClick={() => void handleSignOut()}>
              ออกจากระบบ
            </button>
          </div>
        ) : null}

        {identity && !isLoading && !bill ? (
          <p className="status-text warning">ห้อง {identity.roomId} ยังไม่มีประวัติบิล</p>
        ) : null}

        {identity && history.length > 0 ? (
          <div className="form-row">
            <label htmlFor="tenant-history">ประวัติบิลย้อนหลัง</label>
            <select
              id="tenant-history"
              value={bill?.id ?? ''}
              onChange={(event) => setSelectedBillId(event.target.value)}
            >
              {history.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.billingMonthLabel} ({item.mode === 'prepaid' ? 'ล่วงหน้า' : 'เดือนปัจจุบัน'})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {identity && bill ? (
          <>
            <p className="status-text success">ห้อง {bill.roomId} มีบิลเดือน {bill.billingMonthLabel}</p>
            <button className="btn btn-primary" onClick={() => void saveBillAsPng()}>
              เซฟบิลเป็น PNG
            </button>
            <div className="bill-preview">
              <BillDocument bill={bill} ref={billRef} />
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}
