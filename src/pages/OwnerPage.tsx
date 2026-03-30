import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BillDocument } from '../components/BillDocument'
import { ROOMS } from '../data/rooms'
import {
  clearAllBills,
  getAllBills,
  getLatestBills,
  getRoomHistoryFromBills,
  saveBill,
  summarizeMonthlyRevenue,
} from '../lib/storage'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/billing'
import { createBill } from '../utils/billing'
import type { BillRecord, BillsByRoom, BillingMode } from '../types'
import { saveNodeAsPng } from '../utils/png'

interface MeterDraft {
  meterBefore: number
  meterAfter: number
  mode: BillingMode
}

const OWNER_PIN = import.meta.env.VITE_OWNER_PIN ?? '123789'

function createInitialDrafts(latestBills: BillsByRoom = {}): Record<string, MeterDraft> {
  return ROOMS.reduce<Record<string, MeterDraft>>((acc, room) => {
    const latestBill = latestBills[room.id]
    const initialMeter = latestBill?.meterAfter ?? 0

    acc[room.id] = {
      meterBefore: initialMeter,
      meterAfter: initialMeter,
      mode: 'postpaid',
    }
    return acc
  }, {})
}

export function OwnerPage() {
  const [pin, setPin] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(sessionStorage.getItem('owner_access') === 'ok')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [tenantAccountRoomId, setTenantAccountRoomId] = useState(ROOMS[0].id)
  const [isDeletingTenantAccount, setIsDeletingTenantAccount] = useState(false)
  const [billsByRoom, setBillsByRoom] = useState<BillsByRoom>({})
  const [drafts, setDrafts] = useState<Record<string, MeterDraft>>(() => createInitialDrafts())
  const [selectedRoomId, setSelectedRoomId] = useState(ROOMS[0].id)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [allBills, setAllBills] = useState<BillRecord[]>([])
  const [historyRoomId, setHistoryRoomId] = useState(ROOMS[0].id)

  const billRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const latestBillPanelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    void (async () => {
      const latest = await getLatestBills()
      setBillsByRoom(latest)
      setDrafts(createInitialDrafts(latest))
      const all = await getAllBills()
      setAllBills(all)
    })()
  }, [])

  const selectedBill = useMemo<BillRecord | undefined>(
    () => billsByRoom[selectedRoomId],
    [billsByRoom, selectedRoomId],
  )

  const roomHistory = useMemo(() => getRoomHistoryFromBills(allBills, historyRoomId), [allBills, historyRoomId])
  const monthlyReport = useMemo(() => summarizeMonthlyRevenue(allBills), [allBills])

  async function authorizeOwner(event: FormEvent) {
    event.preventDefault()

    if (isSigningIn) {
      return
    }

    if (pin !== OWNER_PIN) {
      setError('PIN ไม่ถูกต้อง')
      return
    }

    if (supabase) {
      if (!ownerEmail || !ownerPassword) {
        setError('กรุณากรอกอีเมลและรหัสผ่านเจ้าของหอ เพื่อบันทึกข้อมูลข้ามอุปกรณ์')
        return
      }

      try {
        setIsSigningIn(true)
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: ownerEmail,
          password: ownerPassword,
        })

        if (signInError || !data.user) {
          throw new Error(signInError?.message ?? 'เข้าสู่ระบบ Supabase ไม่สำเร็จ')
        }

        const { data: ownerProfile, error: ownerProfileError } = await supabase
          .from('owner_profiles')
          .select('user_id')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (ownerProfileError || !ownerProfile) {
          throw new Error('บัญชีนี้ยังไม่ถูกกำหนดสิทธิ์ owner ในตาราง owner_profiles')
        }
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : 'เข้าสู่ระบบเจ้าของหอไม่สำเร็จ')
        return
      } finally {
        setIsSigningIn(false)
      }
    }

    sessionStorage.setItem('owner_access', 'ok')
    setIsAuthorized(true)
    setError('')
  }

  function updateDraft(roomId: string, patch: Partial<MeterDraft>) {
    setDrafts((current) => ({
      ...current,
      [roomId]: {
        ...current[roomId],
        ...patch,
      },
    }))
  }

  async function issueBillForRoom(roomId: string) {
    setError('')
    setSuccess('')
    const room = ROOMS.find((item) => item.id === roomId)
    const draft = drafts[roomId]

    if (!room || !draft) {
      return
    }

    if (draft.meterAfter < draft.meterBefore) {
      setError(`ห้อง ${roomId}: เลขมิเตอร์หลังต้องมากกว่าหรือเท่ากับเลขก่อน`)
      return
    }

    const bill = createBill({
      room,
      mode: draft.mode,
      meterBefore: draft.meterBefore,
      meterAfter: draft.meterAfter,
    })

    try {
      await saveBill(bill)
      setBillsByRoom((current) => ({ ...current, [roomId]: bill }))
      setAllBills((current) => [bill, ...current])
      setDrafts((current) => ({
        ...current,
        [roomId]: {
          ...current[roomId],
          meterBefore: bill.meterAfter,
          meterAfter: bill.meterAfter,
        },
      }))
      setSelectedRoomId(roomId)
      setSuccess(`ออกบิลห้อง ${roomId} เรียบร้อย`)
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : 'ออกบิลไม่สำเร็จ')
    }
  }

  async function saveRoomBill(roomId: string, openPreviewOnMobile = true) {
    const bill = billsByRoom[roomId]
    const node = billRefs.current[roomId]

    if (!bill || !node) {
      setError(`ไม่พบบิลของห้อง ${roomId}`)
      return
    }

    const result = await saveNodeAsPng(node, `${bill.roomId}_${bill.billingMonthKey}.png`, {
      openPreviewOnMobile,
    })
    if (result === 'preview') {
      setSuccess('มือถือบางรุ่นจะไม่ดาวน์โหลดอัตโนมัติ ระบบเปิดรูปให้แล้ว กรุณากดค้างที่รูปแล้วเลือกบันทึกภาพ')
    }
  }

  async function saveAllBills() {
    setError('')
    const issued = ROOMS.map((room) => room.id).filter((roomId) => Boolean(billsByRoom[roomId]))

    if (issued.length === 0) {
      setError('ยังไม่มีบิลที่ออกแล้วให้เซฟ')
      return
    }

    for (const roomId of issued) {
      await saveRoomBill(roomId, false)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }

    setSuccess('เซฟบิลทั้งหมดเรียบร้อย')
  }

  function viewBill(roomId: string) {
    setSelectedRoomId(roomId)
    requestAnimationFrame(() => {
      latestBillPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function signOutOwner() {
    sessionStorage.removeItem('owner_access')

    if (supabase) {
      await supabase.auth.signOut()
    }

    setIsAuthorized(false)
    setPin('')
    setOwnerPassword('')
    setError('')
    setSuccess('')
  }

  async function clearAllData() {
    const shouldClear = window.confirm('ยืนยันล้างข้อมูลบิลทั้งหมด? การดำเนินการนี้ย้อนกลับไม่ได้')
    if (!shouldClear) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await clearAllBills()
      setBillsByRoom({})
      setAllBills([])
      setDrafts(createInitialDrafts())
      setSelectedRoomId(ROOMS[0].id)
      setHistoryRoomId(ROOMS[0].id)
      setSuccess('ล้างข้อมูลบิลทั้งหมดเรียบร้อย')
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'ล้างข้อมูลไม่สำเร็จ')
    }
  }

  async function deleteTenantAccount() {
    if (!supabase) {
      setError('ยังไม่ได้ตั้งค่า Supabase')
      return
    }

    const shouldDelete = window.confirm(`ยืนยันลบบัญชีผู้เช่าห้อง ${tenantAccountRoomId}? ผู้เช่าจะต้องลงทะเบียนใหม่`)
    if (!shouldDelete) {
      return
    }

    setError('')
    setSuccess('')

    try {
      setIsDeletingTenantAccount(true)
      const { error: deleteError } = await supabase.from('tenant_accounts').delete().eq('room_id', tenantAccountRoomId)
      if (deleteError) {
        throw new Error(deleteError.message)
      }

      setSuccess(`ลบบัญชีผู้เช่าห้อง ${tenantAccountRoomId} แล้ว`)
    } catch (deleteAccountError) {
      setError(deleteAccountError instanceof Error ? deleteAccountError.message : 'ลบบัญชีผู้เช่าไม่สำเร็จ')
    } finally {
      setIsDeletingTenantAccount(false)
    }
  }

  if (!isAuthorized) {
    return (
      <main className="page">
        <section className="panel owner-gate">
          <h1>เฉพาะเจ้าของหอ</h1>
          <p>กรอก PIN เพื่อเข้าหน้าออกบิล</p>
          {supabase ? <p className="panel-description">ถ้าต้องการให้ข้อมูลซิงก์ข้ามอุปกรณ์ กรุณาล็อกอิน Supabase owner ด้วย</p> : null}
          <form onSubmit={(event) => void authorizeOwner(event)} className="pin-form">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Owner PIN"
            />
            {supabase ? (
              <>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder="Owner email (Supabase Auth)"
                />
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  placeholder="Owner password"
                />
              </>
            ) : null}
            <button className="btn btn-primary" type="submit">
              {isSigningIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
          {error ? <p className="error-text">{error}</p> : null}
        </section>
      </main>
    )
  }

  return (
    <main className="page owner-page">
      <section className="panel">
        <div className="panel-header-row">
          <h1>แดชบอร์ดเจ้าของหอ</h1>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => void saveAllBills()}>
              เซฟทั้งหมด (ทุกห้อง)
            </button>
            <button className="btn btn-danger" onClick={() => void clearAllData()}>
              ล้างข้อมูลทั้งหมด
            </button>
            <button className="btn btn-ghost" onClick={() => void signOutOwner()}>
              ออกจากระบบ
            </button>
          </div>
        </div>

        <p className="panel-description">ใส่เลขมิเตอร์หลังและตรวจสอบเลขมิเตอร์ก่อนก่อนออกบิล ระบบจะดึงเลขไฟก่อนจากบิลล่าสุดให้อัตโนมัติหลังจากเริ่มใช้งานครั้งแรก แต่เจ้าของหอยังแก้ไขเองได้</p>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="status-text success">{success}</p> : null}

        <div className="room-grid">
          {ROOMS.map((room) => {
            const draft = drafts[room.id] ?? { meterBefore: 0, meterAfter: 0, mode: 'postpaid' as BillingMode }
            const latestBill = billsByRoom[room.id]
            const hasIssued = Boolean(latestBill)

            return (
              <article key={room.id} className="room-card">
                <header>
                  <h3>{room.id}</h3>
                  <p>ค่าเช่า {room.monthlyRent.toLocaleString('th-TH')} บาท</p>
                </header>

                <label>
                  เลขไฟก่อน
                  <input
                    type="number"
                    min={0}
                    value={draft.meterBefore}
                    onChange={(event) => updateDraft(room.id, { meterBefore: Number(event.target.value) })}
                  />
                </label>

                <p className="field-hint">
                  {latestBill
                    ? `ดึงจากเลขไฟหลังล่าสุด ${latestBill.meterAfter.toLocaleString('th-TH')} อัตโนมัติ และยังแก้เองได้`
                    : 'ห้องนี้ยังไม่มีบิลเดิม กรุณากรอกเลขไฟก่อนเองครั้งแรก'}
                </p>

                <label>
                  เลขไฟหลัง
                  <input
                    type="number"
                    min={0}
                    value={draft.meterAfter}
                    onChange={(event) => updateDraft(room.id, { meterAfter: Number(event.target.value) })}
                  />
                </label>

                <label>
                  ประเภทการชำระ
                  <select
                    value={draft.mode}
                    onChange={(event) => updateDraft(room.id, { mode: event.target.value as BillingMode })}
                  >
                    <option value="postpaid">จ่ายเดือนปัจจุบัน</option>
                    <option value="prepaid">จ่ายล่วงหน้า</option>
                  </select>
                </label>

                <div className="card-actions">
                  <button className="btn btn-primary" onClick={() => void issueBillForRoom(room.id)}>
                    ออกบิล
                  </button>
                  <button className="btn btn-secondary" onClick={() => void saveRoomBill(room.id)} disabled={!hasIssued}>
                    เซฟ PNG
                  </button>
                  <button className="btn btn-ghost" onClick={() => viewBill(room.id)} disabled={!hasIssued}>
                    ดูบิล
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h2>จัดการบัญชีผู้เช่า</h2>
        <p className="panel-description">ใช้เมื่อลูกบ้านย้ายออก เพื่อเปิดให้คนใหม่ลงทะเบียนห้องเดิมได้ทันที</p>
        <div className="tenant-account-tools">
          <select value={tenantAccountRoomId} onChange={(event) => setTenantAccountRoomId(event.target.value)}>
            {ROOMS.map((room) => (
              <option key={room.id} value={room.id}>
                {room.id}
              </option>
            ))}
          </select>
          <button className="btn btn-danger" onClick={() => void deleteTenantAccount()} disabled={isDeletingTenantAccount}>
            {isDeletingTenantAccount ? 'กำลังลบ...' : 'ลบบัญชีผู้เช่าห้องนี้'}
          </button>
        </div>
      </section>

      <section className="panel bill-panel" ref={latestBillPanelRef}>
        <h2>ตัวอย่างบิลล่าสุด</h2>
        {selectedBill ? <BillDocument bill={selectedBill} /> : <p>ยังไม่มีบิลที่ออกแล้ว</p>}
      </section>

      <section className="panel">
        <h2>ประวัติบิลย้อนหลังรายห้อง</h2>
        <div className="form-row">
          <label htmlFor="history-room">เลือกห้อง</label>
          <select id="history-room" value={historyRoomId} onChange={(event) => setHistoryRoomId(event.target.value)}>
            {ROOMS.map((room) => (
              <option key={room.id} value={room.id}>
                {room.id}
              </option>
            ))}
          </select>
        </div>
        {roomHistory.length === 0 ? <p>ยังไม่มีประวัติบิลของห้องนี้</p> : null}
        {roomHistory.length > 0 ? (
          <div className="table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>เดือนค่าเช่า</th>
                  <th>ประเภท</th>
                  <th>ค่าไฟ</th>
                  <th>รวมทั้งสิ้น</th>
                  <th>ออกบิลเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {roomHistory.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.billingMonthLabel}</td>
                    <td>{bill.mode === 'prepaid' ? 'ล่วงหน้า' : 'เดือนปัจจุบัน'}</td>
                    <td>{formatCurrency(bill.electricAmount)}</td>
                    <td>{formatCurrency(bill.totalAmount)}</td>
                    <td>{new Date(bill.issuedAtISO).toLocaleDateString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>รายงานยอดรวมทั้งหอรายเดือน</h2>
        {monthlyReport.length === 0 ? <p>ยังไม่มีข้อมูลสรุปรายเดือน</p> : null}
        {monthlyReport.length > 0 ? (
          <div className="table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th>จำนวนบิล</th>
                  <th>รวมค่าเช่า</th>
                  <th>รวมค่าไฟ</th>
                  <th>ยอดรวมทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.map((row) => (
                  <tr key={row.billingMonthKey}>
                    <td>{row.billingMonthLabel}</td>
                    <td>{row.billCount}</td>
                    <td>{formatCurrency(row.rentTotal)}</td>
                    <td>{formatCurrency(row.electricTotal)}</td>
                    <td>{formatCurrency(row.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="hidden-bills" aria-hidden>
        {Object.values(billsByRoom).map((bill) => (
          <BillDocument
            key={bill.id}
            bill={bill}
            ref={(node) => {
              billRefs.current[bill.roomId] = node
            }}
          />
        ))}
      </section>
    </main>
  )
}
