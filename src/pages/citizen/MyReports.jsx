import { useState, useEffect } from 'react'
import { Badge } from '../../components/ui.jsx'
import { useIssues } from '../../context/IssueContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { api } from '../../services/api.js'
import { Link } from 'react-router-dom'

export default function MyReports() {
  const { issues } = useIssues()
  const { user } = useAuth()
  const [myIssues, setMyIssues] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadMyReports() {
      setLoading(true)
      try {
        const data = await api.getMyIssues()
        if (Array.isArray(data)) {
          setMyIssues(data)
        }
      } catch (err) {
        console.warn('Could not fetch user tickets from API, filtering local issues:', err.message)
      } finally {
        setLoading(false)
      }
    }
    if (user) {
      loadMyReports()
    }
  }, [user])

  const displayedList = showAll
    ? issues
    : (myIssues.length > 0
        ? myIssues
        : issues.filter((i) => i.isUserCreated || (user && String(i.user_id) === String(user.id))))

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>My Reports</h2>
          <p style={{ color: 'var(--muted)' }}>
            Real-time status tracking of all issues reported by you.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? '👤 View Only My Reports' : '🌐 View All Community Reports'}
          </button>
          <Link className="btn btn-primary" to="/citizen/report">
            ➕ Report New Issue
          </Link>
        </div>
      </div>

      <div className="card">
        {displayedList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <p style={{ fontSize: 18, marginBottom: 12 }}>You have not reported any issues yet.</p>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              Report a broken streetlight, pothole, garbage overflow, or water leak in your neighborhood.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link to="/citizen/report" className="btn btn-primary">
                Report your first issue
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAll(true)}
              >
                Browse community issues
              </button>
            </div>
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
                {displayedList.map((i) => (
                  <tr
                    key={i.id || i.issue_code}
                    style={
                      i.isUserCreated || (user && String(i.user_id) === String(user.id))
                        ? { backgroundColor: 'rgba(47, 143, 107, 0.05)' }
                        : undefined
                    }
                  >
                    <td>
                      <strong>{i.id || i.issue_code}</strong>
                      {(i.isUserCreated || (user && String(i.user_id) === String(user.id))) && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            background: 'var(--gold-soft)',
                            color: '#684a00',
                            padding: '2px 6px',
                            borderRadius: 6,
                            fontWeight: 700,
                          }}
                        >
                          My Ticket
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
