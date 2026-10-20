import { useState, useEffect } from 'react'
import LeafletMap from '../../components/LeafletMap.jsx'
import { Badge } from '../../components/ui.jsx'
import { api } from '../../services/api.js'

export default function Hotspots() {
  const [hotspotList, setHotspotList] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function fetchHotspots() {
      setLoading(true)
      setErrorMsg('')
      try {
        const live = await api.getHotspots()
        if (Array.isArray(live) && live.length > 0) {
          setHotspotList(live)
          setActive(live[0])
        } else {
          setHotspotList([])
          setActive(null)
        }
      } catch (err) {
        console.error('Failed to load predicted hotspots:', err.message)
        setErrorMsg(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHotspots()
  }, [])

  async function handleRecalculate() {
    setRefreshing(true)
    setErrorMsg('')
    try {
      const refreshed = await api.triggerPredictHotspots({ days_ahead: 7 })
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setHotspotList(refreshed)
        setActive(refreshed[0])
      }
    } catch (err) {
      console.error('Failed to trigger ML forecast refresh:', err.message)
      setErrorMsg('Failed to recalculate ML forecast: ' + err.message)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Hotspot Spatial Density & Cluster Analysis</h2>
          <p style={{ color: 'var(--muted)' }}>
            Real-time geospatial OpenStreetMap intelligence showing critical civic problem clusters and forward 7-day ML forecasts.
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleRecalculate}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>{refreshing ? '⚙️ Running Random Forest Model...' : '🤖 Recalculate ML Forecast'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="auth-alert error-alert" style={{ marginBottom: 16 }}>
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <p style={{ fontSize: 16 }}>Loading geospatial hotspot predictions from Random Forest engine...</p>
        </div>
      ) : hotspotList.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
          <h3 style={{ fontFamily: 'Fraunces, serif', marginBottom: 8, color: 'var(--ink)' }}>No Predictions Available</h3>
          <p style={{ maxWidth: 480, margin: '0 auto 20px', fontSize: 14 }}>
            No forward 7-day hotspot demand predictions were found in the database. Trigger the ML prediction pipeline to generate forecasts for monitored zones.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRecalculate}
            disabled={refreshing}
          >
            {refreshing ? 'Generating Forecasts...' : 'Generate 7-Day Hotspot Forecasts'}
          </button>
        </div>
      ) : (
        <div className="dash-grid">
          <div className="card" style={{ padding: 12 }}>
            <LeafletMap
              height="460px"
              hotspots={hotspotList}
              activeItem={active}
              onItemSelect={(h) => setActive(h)}
              center={[active?.lat || 16.5062, active?.lng || 80.648]}
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
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.4rem' }}>{active?.name}</h3>
                <Badge value={active?.priority || active?.risk_level} />
              </div>
              <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: 14 }}>
                <strong>{active?.issues}</strong> concentrated complaints registered in this zone
              </p>
              {active?.predicted_issue_count !== undefined && (
                <div
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 10,
                    fontSize: 13,
                  }}
                >
                  <span>🤖 Forward 7-Day ML Forecast: </span>
                  <strong style={{ color: 'var(--forest)' }}>{active.predicted_issue_count} predicted issues</strong>
                  {active?.model_version && <span style={{ opacity: 0.7 }}> ({active.model_version})</span>}
                </div>
              )}
              <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                Priority algorithms weigh issue frequency, structural severity rating, and average unresolved wait time. Municipal crews and allocated budget are routed to the highest-density cluster first to maximize community impact.
              </p>
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hotspotList.map((h) => (
                <button
                  key={h.name || h.id}
                  type="button"
                  onClick={() => setActive(h)}
                  className="card"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderColor: active?.name === h.name ? 'var(--forest)' : undefined,
                    background: active?.name === h.name ? 'var(--bg-2)' : '#fff',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{h.name}</strong>
                    <Badge value={h.priority || h.risk_level} />
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{h.issues} clustered tickets · Lat: {h.lat}, Lng: {h.lng}</span>
                    {h.predicted_issue_count && <span>Est: <strong>{h.predicted_issue_count}</strong></span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
