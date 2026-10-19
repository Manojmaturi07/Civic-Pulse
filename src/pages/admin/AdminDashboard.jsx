import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui.jsx'
import { HOTSPOTS } from '../../data/mock.js'
import { useIssues } from '../../context/IssueContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import LeafletMap from '../../components/LeafletMap.jsx'

export default function AdminDashboard() {
  const { issues, stats, typeCounts } = useIssues()
  const { user } = useAuth()

  const highPriorityIssues = issues.filter(
    (i) => i.priority === 'High' || i.priority === 'Critical',
  )

  const maxTypeCount = Math.max(...typeCounts.map((t) => t.count), 1)

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Municipal Command Dashboard</h2>
          <p style={{ color: 'var(--muted)' }}>
            Real-time municipal operations, hotspot clustering, and priority resolution.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge assigned">
            Logged in: {user?.name || 'Administrator'}
          </span>
          <Link className="btn btn-primary" to="/admin/issues">
            Manage Issues
          </Link>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <b>{stats.total}</b>
          <span>Total Issues</span>
        </div>
        <div className="card kpi">
          <b>{stats.pending}</b>
          <span>Pending Review</span>
        </div>
        <div className="card kpi">
          <b>{stats.assigned}</b>
          <span>Active Works</span>
        </div>
        <div className="card kpi">
          <b>{stats.highPriority}</b>
          <span>High / Critical</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Fraunces, serif' }}>Hotspot Map Density</h3>
            <Link to="/admin/hotspots" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 700 }}>
              Open Full Map →
            </Link>
          </div>
          <LeafletMap height="320px" hotspots={HOTSPOTS} issues={issues.slice(0, 8)} zoom={11} />
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

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif' }}>High Priority Action Queue</h3>
          <Link to="/admin/issues" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 700 }}>
            View all ({issues.length}) →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Area</th>
                <th>Score</th>
                <th>Department</th>
                <th>Status</th>
                <th>Reports</th>
              </tr>
            </thead>
            <tbody>
              {highPriorityIssues.slice(0, 6).map((i) => (
                <tr key={i.id} style={i.isUserCreated ? { backgroundColor: 'rgba(47, 143, 107, 0.05)' } : undefined}>
                  <td>
                    <strong>{i.id}</strong>
                    {i.isUserCreated && (
                      <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--gold-soft)', color: '#684a00', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>
                        Citizen
                      </span>
                    )}
                  </td>
                  <td>{i.type}</td>
                  <td>
                    {i.area}, {i.city}
                  </td>
                  <td>
                    {i.score} <Badge value={i.priority} />
                  </td>
                  <td>{i.department}</td>
                  <td>
                    <Badge value={i.status} />
                  </td>
                  <td>{i.reports}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
