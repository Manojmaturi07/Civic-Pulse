import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [city, setCity] = useState(user?.city || 'Vijayawada')
  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    updateUser({ name, city })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Profile & Settings</h2>
          <p style={{ color: 'var(--muted)' }}>Manage your personal details and location preferences.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 540 }}>
        {saved && (
          <div className="toast" style={{ marginBottom: 16 }}>
            ✅ Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--bg-2)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 32,
              }}
            >
              {user?.avatar || '👤'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{user?.name || 'Citizen'}</h3>
              <span className="badge assigned" style={{ marginTop: 4 }}>
                {user?.role === 'admin' ? '🏛️ Municipal Staff' : '👤 Citizen Member'}
              </span>
            </div>
          </div>

          <label className="field">
            <span>Full Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Email Address</span>
            <input
              disabled
              value={user?.email || 'citizen@civicpulse.app'}
              style={{ background: 'var(--bg-2)', cursor: 'not-allowed', color: 'var(--muted)' }}
            />
          </label>

          <label className="field">
            <span>Primary City / Municipality</span>
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>

          <button className="btn btn-primary" type="submit" style={{ marginTop: 12 }}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
