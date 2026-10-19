import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ISSUE_TYPES } from '../../data/mock.js'
import { useIssues } from '../../context/IssueContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import LeafletMap from '../../components/LeafletMap.jsx'

export default function ReportIssue() {
  const { addIssue } = useIssues()
  const { user } = useAuth()

  const [type, setType] = useState('Road Damage')
  const [description, setDescription] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState(user?.city || 'Vijayawada')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [coords, setCoords] = useState({ lat: 16.5062, lng: 80.648 })
  const [submittedTicket, setSubmittedTicket] = useState(null)

  function handleLocationSelect(loc) {
    setCoords({ lat: loc.lat, lng: loc.lng })
    setCity(loc.city)
    if (!area) setArea(loc.area)
  }

  function submit(e) {
    e.preventDefault()
    if (!description.trim() || !area.trim()) return

    const newIssue = addIssue({
      type,
      description,
      area,
      city,
      lat: coords.lat,
      lng: coords.lng,
    })

    setSubmittedTicket(newIssue)
    setDescription('')
    setArea('')
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Report a Community Issue</h2>
          <p style={{ color: 'var(--muted)' }}>
            Provide details, category, and landmark or pin the exact location on OpenStreetMap.
          </p>
        </div>
      </div>

      {submittedTicket ? (
        <div className="card" style={{ maxWidth: 640, textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', color: 'var(--forest)' }}>
            Issue Successfully Reported!
          </h3>
          <p style={{ marginTop: 8, color: 'var(--muted)' }}>
            Your issue has been logged into the municipal workflow engine with reference:
          </p>
          <div
            style={{
              display: 'inline-block',
              margin: '16px auto',
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: '1.3rem',
              color: 'var(--forest)',
              letterSpacing: '0.04em',
            }}
          >
            {submittedTicket.id}
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 440, margin: '0 auto 20px' }}>
            Assigned to <strong>{submittedTicket.department}</strong>. Priority score calculated as{' '}
            <strong>{submittedTicket.score} ({submittedTicket.priority})</strong>.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/citizen/reports" className="btn btn-primary">
              📋 Track in My Reports
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSubmittedTicket(null)}
            >
              ➕ Report Another Issue
            </button>
          </div>
        </div>
      ) : (
        <form className="card" style={{ maxWidth: 720 }} onSubmit={submit}>
          <label className="field">
            <span>Issue Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              required
              placeholder="What happened, and how long has it been going on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {/* Interactive Map Pin Selector */}
          <div style={{ margin: '14px 0', padding: 14, background: 'var(--bg-2)', borderRadius: 14, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <strong style={{ fontSize: 14 }}>📍 Geospatial Coordinates</strong>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '6px 12px' }}
                onClick={() => setShowMapPicker(!showMapPicker)}
              >
                {showMapPicker ? 'Hide Map Picker' : '🗺️ Click to Pin on Map'}
              </button>
            </div>

            {showMapPicker && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--forest)', fontWeight: 600, marginBottom: 8 }}>
                  👉 Click anywhere on the map below to drop a pin at the exact issue spot:
                </p>
                <LeafletMap
                  height="260px"
                  pickerMode={true}
                  selectedLocation={coords}
                  onLocationSelect={handleLocationSelect}
                  center={[coords.lat, coords.lng]}
                  zoom={13}
                />
              </div>
            )}
          </div>

          <label className="field">
            <span>Area / Landmark</span>
            <input
              required
              placeholder="e.g. Benz Circle, Main Road, Near Clock Tower"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </label>

          <label className="field">
            <span>City</span>
            <input
              required
              placeholder="Vijayawada, Guntur, Tenali..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Photo (Optional)</span>
            <input type="file" accept="image/*" />
          </label>

          <button className="btn btn-primary" type="submit" style={{ marginTop: 8, height: 46 }}>
            🚀 Submit Report
          </button>
        </form>
      )}
    </div>
  )
}
