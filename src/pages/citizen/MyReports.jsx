import { Badge } from '../../components/ui.jsx'
import { useIssues } from '../../context/IssueContext.jsx'
import { Link } from 'react-router-dom'

export default function MyReports() {
  const { issues } = useIssues()

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>My Reports</h2>
          <p style={{ color: 'var(--muted)' }}>
            Real-time status tracking of all issues reported by you.
          </p>
        </div>
        <Link className="btn btn-primary" to="/citizen/report">
          ➕ Report New Issue
        </Link>
      </div>

      <div className="card">
        {issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <p style={{ fontSize: 18, marginBottom: 12 }}>No reported issues found.</p>
            <Link to="/citizen/report" className="btn btn-primary">
              Report your first issue
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Issue Type</th>
                  <th>Location</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.id} style={i.isUserCreated ? { backgroundColor: 'rgba(47, 143, 107, 0.05)' } : undefined}>
                    <td>
                      <strong>{i.id}</strong>
                      {i.isUserCreated && (
                        <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--gold-soft)', color: '#684a00', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                          New
                        </span>
                      )}
                    </td>
                    <td>{i.type}</td>
                    <td>
                      {i.area}, {i.city}
                    </td>
                    <td>{i.department || 'Public Works'}</td>
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
        )}
      </div>
    </div>
  )
}
