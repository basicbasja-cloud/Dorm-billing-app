import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="page home-page">
      <section className="hero-card">
        <p className="eyebrow">ระบบบริหารค่าหอพัก</p>
        <h1>ระบบออกบิลรายเดือน</h1>
        <p>
          จัดการห้องพัก ออกบิล และติดตามสถานะการชำระได้ในที่เดียว
        </p>

        <div className="cta-row">
          <Link to="/tenant" className="btn btn-primary">
            เข้าสู่โหมดผู้เช่า
          </Link>
          <Link to="/owner" className="btn btn-secondary">
            เข้าสู่โหมดเจ้าของหอ
          </Link>
          <a
            className="btn btn-ghost"
            href="https://maps.app.goo.gl/LfnFiuw8VZrc93tb7"
            target="_blank"
            rel="noreferrer"
          >
            เปิดแผนที่หอพัก
          </a>
        </div>
      </section>

      <section className="stats-grid">
        <article>
          <h3>หลัง A</h3>
          <p>7 ห้อง</p>
          <small>ห้องละ 1,600 บาท</small>
        </article>
        <article>
          <h3>หลัง B</h3>
          <p>9 ห้อง</p>
          <small>B6 และ B8 = 2,000 บาท, ห้องอื่น 2,500 บาท</small>
        </article>
        <article>
          <h3>ค่าน้ำ</h3>
          <p>ฟรี</p>
          <small>ค่าไฟหน่วยละ 6 บาท</small>
        </article>
      </section>
    </main>
  )
}
