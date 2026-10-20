import { useState, useEffect } from 'react'
import { ISSUE_TYPES } from '../../data/mock.js'
import { Badge } from '../../components/ui.jsx'
import { useIssues } from '../../context/IssueContext.jsx'
import LeafletMap from '../../components/LeafletMap.jsx'
import { api } from '../../services/api.js'

export default function CommunityMap() {
  const { issues } = useIssues()
  const [hotspots, setHotspots] = useState([])
  const [selectedType, setSelectedType] = useState('All')
  const [activeItem, setActiveItem] = useState(issues[0] || null)

  useEffect(() => {
    async function loadHotspots() {
      try {
        const live = await api.getHotspots()
        if (Array.isArray(live)) {
          setHotspots(live)
        }
      } catch (err) {
        console.warn('Could not load live hotspots in CommunityMap:', err.message)
      }
    }
    loadHotspots()
  }, [])

  useEffect(() => {
    if (!activeItem && issues.length > 0) {
      setActiveItem(issues[0])
    }
  }, [issues, activeItem])

  const filteredIssues =
    selectedType === 'All'
      ? issues
      : issues.filter((i) => i.type === selectedType)

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Community Geospatial Map</h2>
          <p style={{ color: 'var(--muted)' }}>
            Interactive OpenStreetMap showing local community complaints, infrastructure hazards, and active repairs.
          </p>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setSelectedType('All')}
          className={`badge ${selectedType === 'All' ? 'resolved' : 'assigned'}`}
          style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
        >
          All Categories ({issues.length})
        </button>
        {ISSUE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedType(t)}
            className={`badge ${selectedType === t ? 'resolved' : 'pending'}`}
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card" style={{ padding: 12 }}>
          <LeafletMap
            height="480px"
            hotspots={hotspots}
            issues={filteredIssues}
            activeItem={activeItem}
            onItemSelect={(item) => setActiveItem(item)}
            center={[activeItem?.lat || 16.5062, activeItem?.lng || 80.648]}
            zoom={12}
          />
          <div style={{ marginTop: 12, padding: '0 8px', fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>🕳️ Road Damage</span>
            <span>💧 Water Leak</span>
            <span>🌊 Drainage Block</span>
            <span>🚯 Garbage</span>
            <span>💡 Streetlight</span>
            <span style={{ marginLeft: 'auto' }}>Circles = Municipal Hotspot Density</span>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14, borderLeft: '4px solid var(--leaf)' }}>
            <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800 }}>
              Active Selection
            </span>
            {activeItem ? (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.3rem' }}>
                    {activeItem.type || activeItem.name}
                  </h3>
                  <Badge value={activeItem.status || activeItem.priority} />
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0' }}>
                  📍 {activeItem.area}, {activeItem.city}
                </div>
                {activeItem.description && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
                    {activeItem.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                  <span>ID: <strong>{activeItem.id || 'Hotspot'}</strong></span>
                  {activeItem.department && <span>Dept: <strong>{activeItem.department}</strong></span>}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Click any pin or ticket below to focus.</p>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginBottom: 10, fontSize: '1rem' }}>
              Nearby Registered Tickets ({filteredIssues.length})
            </h4>
            <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredIssues.map((i) => (
                <div
                  key={i.id}
                  onClick={() => setActiveItem(i)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    background: activeItem?.id === i.id ? 'var(--bg-2)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>{i.type}</strong>
                    <Badge value={i.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    📍 {i.area}, {i.city} · {i.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
