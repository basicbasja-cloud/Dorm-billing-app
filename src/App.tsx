import { Navigate, Route, Routes } from 'react-router-dom'
import { TopNav } from './components/TopNav'
import { HomePage } from './pages/HomePage'
import { OwnerPage } from './pages/OwnerPage'
import { RulesPage } from './pages/RulesPage'
import { TenantPage } from './pages/TenantPage'

function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tenant" element={<TenantPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/owner" element={<OwnerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
