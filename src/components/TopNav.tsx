import { Link, NavLink } from 'react-router-dom'

export function TopNav() {
  return (
    <header className="top-nav">
      <Link to="/" className="brand">
        หอพักสมใจ
      </Link>
      <nav>
        <NavLink to="/tenant">ผู้เช่า</NavLink>
        <NavLink to="/rules">กฎหอพัก</NavLink>
        <NavLink to="/owner">เจ้าของหอ</NavLink>
      </nav>
    </header>
  )
}
