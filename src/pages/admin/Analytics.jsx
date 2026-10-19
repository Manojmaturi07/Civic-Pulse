import { TRENDS } from '../../data/mock.js'
import { useIssues } from '../../context/IssueContext.jsx'

export default function Analytics() {
  const { stats, typeCounts } = useIssues()
  const max = Math.max(...TRENDS.map((t) => t.issues))
  const maxTypeCount = Math.max(...typeCounts.map((t) => t.count), 1)

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Analytics & Intelligence</h2>
          <p style={{ color: 'var(--muted)' }}>
            Category mix, location pressure, severity, citizen reports, and resolution trends.
          </p>
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => alert('Exporting CivicPulse dataset as CSV...')}
        >
          📥 Export CSV / PDF
        </button>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <b>{stats.total}</b>
          <span>Records Analysed</span>
        </div>
        <div className="card kpi">
          <b>{typeCounts.length}</b>
          <span>Issue Categories</span>
        </div>
        <div className="card kpi">
          <b>4</b>
          <span>Cities Monitored</span>
        </div>
        <div className="card kpi">
          <b>{resolutionRate}%</b>
          <span>Resolution Rate</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces, serif', marginBottom: 8 }}>Resolution Trends</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
            <span style={{ color: 'var(--forest)', fontWeight: 700 }}>■ Green = Reported</span> ·{' '}
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>■ Gold = Resolved</span>
          </p>
          <div className="trend">
            {TRENDS.map((t) => (
              <div key={t.month} className="col">
                <div className="a" style={{ height: `${(t.issues / max) * 140}px` }} title={`Reported: ${t.issues}`} />
                <div className="b" style={{ height: `${(t.resolved / max) * 140}px` }} title={`Resolved: ${t.resolved}`} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, color: 'var(--muted)', fontSize: 13 }}>
            {TRENDS.map((t) => (
              <span key={t.month}>{t.month}</span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces, serif', marginBottom: 12 }}>Issues by Category</h3>
          <div className="bars">
            {typeCounts.map((row) => (
              <div className="bar-row" key={row.type}>
                <strong style={{ fontSize: 13 }}>{row.type}</strong>
                <div className="bar">
                  <i style={{ width: `${(row.count / maxTypeCount) * 100}%` }} />
                </div>
                <span>{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
