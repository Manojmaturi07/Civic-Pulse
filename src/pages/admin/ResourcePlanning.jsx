import { Badge } from '../../components/ui.jsx'
import { WORKLOAD } from '../../data/mock.js'

export default function ResourcePlanning() {
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Resource planning</h2>
          <p style={{ color: 'var(--muted)' }}>
            Department workload, priority-based allocation, and crew requirements.
          </p>
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Open tickets</th>
              <th>Crew available</th>
              <th>Suggested allocation</th>
              <th>Need</th>
            </tr>
          </thead>
          <tbody>
            {WORKLOAD.map((w) => (
              <tr key={w.department}>
                <td>{w.department}</td>
                <td>{w.open}</td>
                <td>{w.crew}</td>
                <td>{Math.ceil(w.open / Math.max(w.crew, 1))} tickets / crew</td>
                <td>
                  <Badge value={w.need} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cards" style={{ marginTop: 16 }}>
        <article className="card">
          <h4>Priority-based allocation</h4>
          <p>Send extra sanitation and roads crews to Benz Circle and PNBS first — highest density plus high severity.</p>
        </article>
        <article className="card">
          <h4>Resource requirements</h4>
          <p>Estimate: +4 road crew shifts and +3 sanitation trucks this week to cut pending high-priority work.</p>
        </article>
        <article className="card">
          <h4>Decision support</h4>
          <p>Scores combine severity, area importance, citizen report count, and unresolved wait time.</p>
        </article>
      </div>
    </div>
  )
}
