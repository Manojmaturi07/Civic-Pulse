import { useState } from 'react'
import { HOTSPOTS } from '../../data/mock.js'
import LeafletMap from '../../components/LeafletMap.jsx'
import { Badge } from '../../components/ui.jsx'

export default function Hotspots() {
  const [active, setActive] = useState(HOTSPOTS[0])

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Hotspot Spatial Density & Cluster Analysis</h2>
          <p style={{ color: 'var(--muted)' }}>
            Real-time geospatial OpenStreetMap intelligence showing critical civic problem clusters.
          </p>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card" style={{ padding: 12 }}>
          <LeafletMap
            height="460px"
            hotspots={HOTSPOTS}
            activeItem={active}
            onItemSelect={(h) => setActive(h)}
            center={[active.lat || 16.5062, active.lng || 80.648]}
            zoom={12}
          />
          <div style={{ marginTop: 12, padding: '0 8px', fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 16 }}>
            <span>🔴 <strong>Critical</strong> (Radius: 1.4km)</span>
            <span>🟠 <strong>High</strong> (Radius: 1.0km)</span>
            <span>🟡 <strong>Medium</strong> (Radius: 0.7km)</span>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14, borderLeft: '4px solid var(--forest)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.4rem' }}>{active.name}</h3>
              <Badge value={active.priority} />
            </div>
            <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: 14 }}>
              <strong>{active.issues}</strong> concentrated complaints registered in this zone
            </p>
            <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Priority algorithms weigh issue frequency, structural severity rating, and average unresolved wait time. Municipal crews and allocated budget are routed to the highest-density cluster first to maximize community impact.
            </p>
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {HOTSPOTS.map((h) => (
              <button
                key={h.name}
                type="button"
                onClick={() => setActive(h)}
                className="card"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderColor: active.name === h.name ? 'var(--forest)' : undefined,
                  background: active.name === h.name ? 'var(--bg-2)' : '#fff',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{h.name}</strong>
                  <Badge value={h.priority} />
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                  {h.issues} clustered tickets · Lat: {h.lat}, Lng: {h.lng}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
