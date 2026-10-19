import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Brand } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const links = [
  { to: '/admin', label: '📊 Dashboard Overview', end: true },
  { to: '/admin/hotspots', label: '📍 Hotspot Analysis' },
  { to: '/admin/issues', label: '🛠️ Issue Management' },
  { to: '/admin/analytics', label: '📈 Analytics & Trends' },
  { to: '/admin/resources', label: '👥 Resource Planning' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const displayName = user?.name || 'Municipal Officer'
  const displayDept = user?.department || 'Municipal Administration'

  return (
    <div className="app-shell">
      <aside className="side admin-side">
        <Brand to="/admin" />
        <div className="sidebar-role-badge admin-tag">
          <span className="dot admin-dot"></span>
          <span>Municipal Admin</span>
        </div>

        {/* Admin profile widget */}
        <div className="user-profile-widget admin-widget">
          <div className="user-avatar">{user?.avatar || '🏛️'}</div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-location">🏢 {displayDept}</span>
          </div>
        </div>

        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/citizen">👥 Switch to Citizen View</NavLink>
          <NavLink to="/">🏠 Back to home</NavLink>
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout-btn" onClick={handleLogout}>
            <span>🚪 Sign Out</span>
          </button>
        </div>
      </aside>
      <section className="main">
        <Outlet />
      </section>
    </div>
  )
}
