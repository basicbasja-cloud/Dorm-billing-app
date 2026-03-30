import { forwardRef } from 'react'
import { DORM_ADDRESS, DORM_NAME } from '../data/rooms'
import { formatCurrency } from '../utils/billing'
import type { BillRecord } from '../types'

interface BillDocumentProps {
  bill: BillRecord
}

export const BillDocument = forwardRef<HTMLDivElement, BillDocumentProps>(
  ({ bill }, ref) => {
    return (
      <article className="bill-sheet" ref={ref}>
        <header className="bill-header">
          <div>
            <h2>{DORM_NAME}</h2>
            <p>{DORM_ADDRESS}</p>
          </div>
          <div className="bill-meta">
            <p>ห้อง {bill.roomId}</p>
            <p>
              ประเภทการชำระ: {bill.mode === 'prepaid' ? 'จ่ายล่วงหน้า' : 'จ่ายเดือนปัจจุบัน'}
            </p>
            <p>เดือนค่าเช่า: {bill.billingMonthLabel}</p>
          </div>
        </header>

        <table className="bill-table">
          <thead>
            <tr>
              <th>รายการ</th>
              <th>จำนวน</th>
              <th>หน่วยละ</th>
              <th>รวม</th>
            </tr>
          </thead>
          <tbody>
            {bill.lines.map((line) => (
              <tr key={line.description}>
                <td>{line.description}</td>
                <td>{line.quantityText}</td>
                <td>{formatCurrency(line.unitPrice)}</td>
                <td>{formatCurrency(line.amount)}</td>
              </tr>
            ))}
            <tr>
              <td>ค่าน้ำ</td>
              <td>ฟรี</td>
              <td>{formatCurrency(0)}</td>
              <td>{formatCurrency(0)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>ยอดรวมทั้งสิ้น</td>
              <td>{formatCurrency(bill.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <footer className="bill-footer">
          <p>
            กรุณาชำระภายในวันที่ 5 ของเดือนถัดไป: <strong>{bill.dueDateLabel}</strong>
          </p>
          <p>ขอบคุณที่ใช้บริการ {DORM_NAME}</p>
        </footer>
      </article>
    )
  },
)

BillDocument.displayName = 'BillDocument'
