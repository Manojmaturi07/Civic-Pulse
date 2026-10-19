import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui.jsx'
import { useIssues } from '../../context/IssueContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function CitizenDashboard() {
  const { issues, stats } = useIssues()
  const { user } = useAuth()

  const recent = issues.slice(0, 5)

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Welcome back, {user?.name || 'Citizen'}</h2>
          <p style={{ color: 'var(--muted)' }}>
            Track your civic reports and observe active works across {user?.city || 'Vijayawada'}.
          </p>
        </div>
        <Link className="btn btn-primary" to="/citizen/report">
          ➕ Report an Issue
        </Link>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <b>{stats.total}</b>
          <span>Community Reports</span>
        </div>
        <div className="card kpi">
          <b>{stats.pending}</b>
          <span>Pending Review</span>
        </div>
        <div className="card kpi">
          <b>{stats.assigned}</b>
          <span>Assigned / In Progress</span>
        </div>
        <div className="card kpi">
          <b>{stats.resolved}</b>
          <span>Resolved Works</span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif' }}>Recent Activity & Tickets</h3>
          <Link to="/citizen/reports" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 700 }}>
            View all ({issues.length}) →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((i) => (
                <tr key={i.id} style={i.isUserCreated ? { backgroundColor: 'rgba(47, 143, 107, 0.05)' } : undefined}>
                  <td>
                    <strong>{i.id}</strong>
                    {i.isUserCreated && (
                      <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--gold-soft)', color: '#684a00', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>
                        Your Report
                      </span>
                    )}
                  </td>
                  <td>{i.type}</td>
                  <td>
                    {i.area}, {i.city}
                  </td>
                  <td>
                    <Badge value={i.priority} />
                  </td>
                  <td>
                    <Badge value={i.status} />
                  </td>
                  <td>{i.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
