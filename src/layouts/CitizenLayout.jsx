import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Brand } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const links = [
  { to: '/citizen', label: '📊 Dashboard', end: true },
  { to: '/citizen/report', label: '➕ Report an Issue' },
  { to: '/citizen/reports', label: '📋 My Reports' },
  { to: '/citizen/map', label: '🗺️ Community Map' },
  { to: '/citizen/profile', label: '👤 Profile & Settings' },
]

export default function CitizenLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: '/citizen', message: 'Please sign in or register to access the Citizen Portal.' }}
        replace
      />
    )
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const displayName = user?.name || 'Citizen Member'
  const displayCity = user?.city || 'Vijayawada'

  return (
    <div className="app-shell">
      <aside className="side">
        <Brand to="/citizen" />
        <div className="sidebar-role-badge citizen-tag">
          <span className="dot online"></span>
          <span>Citizen Portal</span>
        </div>

        {/* User preview widget */}
        <div className="user-profile-widget">
          <div className="user-avatar">{user?.avatar || '👤'}</div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-location">📍 {displayCity}</span>
          </div>
        </div>

        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
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
