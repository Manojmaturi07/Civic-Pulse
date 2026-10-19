import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui.jsx'
import { DEPARTMENTS, ISSUE_TYPES } from '../../data/mock.js'
import { useIssues } from '../../context/IssueContext.jsx'

export default function IssueManagement() {
  const { issues, updateIssue } = useIssues()

  const [type, setType] = useState('All')
  const [status, setStatus] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const matchType = type === 'All' || i.type === type
      const matchStatus = status === 'All' || i.status === status
      const matchSearch =
        searchTerm === '' ||
        i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.city.toLowerCase().includes(searchTerm.toLowerCase())

      return matchType && matchStatus && matchSearch
    })
  }, [issues, type, status, searchTerm])

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Issue Management & Department Dispatch</h2>
          <p style={{ color: 'var(--muted)' }}>
            Filter reports, assign municipal departments, and update ticket lifecycle status.
          </p>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Search ticket ID, area, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: 260 }}
        />

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="All">All Categories</option>
          {ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <span style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
          Showing {filtered.length} of {issues.length} records
        </span>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Location</th>
                <th>Score</th>
                <th>Department Assignment</th>
                <th>Lifecycle Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
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
                  <td>
                    <select
                      value={i.department || 'Public Works'}
                      onChange={(e) => updateIssue(i.id, 'department', e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13 }}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={i.status}
                      onChange={(e) => updateIssue(i.id, 'status', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        borderColor:
                          i.status === 'Resolved'
                            ? 'var(--ok)'
                            : i.status === 'Pending'
                            ? 'var(--warn)'
                            : 'var(--forest)',
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
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
