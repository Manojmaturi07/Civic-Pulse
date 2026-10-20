import { useState, useEffect } from 'react'
import { Badge } from '../../components/ui.jsx'
import { WORKLOAD } from '../../data/mock.js'
import { api } from '../../services/api.js'

export default function ResourcePlanning() {
  const [workloads, setWorkloads] = useState(WORKLOAD)
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [wData, aData] = await Promise.allSettled([
          api.getDepartmentWorkload(),
          api.getResourceAllocations(),
        ])
        if (wData.status === 'fulfilled' && Array.isArray(wData.value) && wData.value.length > 0) {
          setWorkloads(wData.value)
        }
        if (aData.status === 'fulfilled' && Array.isArray(aData.value)) {
          setAllocations(aData.value)
        }
      } catch (err) {
        console.warn('Using baseline workload:', err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function handleApprove(allocId, status) {
    try {
      await api.approveAllocation(allocId, { allocation_status: status })
      setAllocations((prev) =>
        prev.map((a) => (a.id === allocId ? { ...a, allocation_status: status } : a))
      )
      setActionMsg(`Allocation ${allocId} marked as ${status}!`)
      setTimeout(() => setActionMsg(''), 3000)
    } catch (err) {
      console.error('Approval failed:', err.message)
    }
  }

  async function handleRegenerate() {
    setLoading(true)
    try {
      const recs = await api.generateRecommendations()
      if (Array.isArray(recs)) {
        setAllocations(recs)
        setActionMsg('Fresh crew recommendations derived from ML hotspot forecasts!')
        setTimeout(() => setActionMsg(''), 4000)
      }
    } catch (err) {
      console.error('Failed to regenerate recommendations:', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Resource Planning & Crew Dispatch</h2>
          <p style={{ color: 'var(--muted)' }}>
            Department workload, ML hotspot demand forecasting, and constrained crew deployment.
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleRegenerate}
          disabled={loading}
        >
          {loading ? 'Processing...' : '🔄 Recalculate Dispatch Plan'}
        </button>
      </div>

      {actionMsg && (
        <div className="auth-alert success-alert" style={{ marginBottom: 16 }}>
          <span>✅</span>
          <span>{actionMsg}</span>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontFamily: 'Fraunces, serif', marginBottom: 12 }}>Department Capacity & Active Pressure</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Open Tickets</th>
              <th>Crew Available</th>
              <th>Suggested Allocation</th>
              <th>Need Level</th>
            </tr>
          </thead>
          <tbody>
            {workloads.map((w) => (
              <tr key={w.department}>
                <td><strong>{w.department}</strong></td>
                <td>{w.open}</td>
                <td>{w.crew} crews</td>
                <td>{w.suggested_allocation || `${Math.ceil(w.open / Math.max(w.crew, 1))} tickets / crew`}</td>
                <td>
                  <Badge value={w.need} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommended Zone Allocations */}
      {allocations.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', marginBottom: 12 }}>
            Zone-Specific Dispatch Recommendations (Forward 7 Days)
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>Zone / Ward</th>
                <th>Department</th>
                <th>Predicted Demand</th>
                <th>Recommended Crews</th>
                <th>Equipment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allocations.slice(0, 6).map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.area}</strong>, {a.city}</td>
                  <td>{a.department}</td>
                  <td>{a.predicted_demand} issues</td>
                  <td>
                    <span style={{ fontWeight: 800, color: 'var(--forest)' }}>
                      {a.recommended_crews} crew(s)
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {(a.equipment_requirements || []).join(', ')}
                    </span>
                  </td>
                  <td>
                    <Badge value={a.allocation_status === 'Approved' ? 'Resolved' : a.priority} />
                  </td>
                  <td>
                    {a.allocation_status !== 'Approved' ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleApprove(a.id, 'Approved')}
                      >
                        Approve
                      </button>
                    ) : (
                      <span style={{ color: 'var(--forest)', fontSize: 12, fontWeight: 700 }}>✓ Approved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cards" style={{ marginTop: 16 }}>
        <article className="card">
          <h4>Priority-Based Dispatch</h4>
          <p>Send extra sanitation and roads crews to Benz Circle and PNBS first — highest density plus high severity.</p>
        </article>
        <article className="card">
          <h4>Equipment Constrained Planning</h4>
          <p>Allocation balances hydraulic lift trucks, compactors, and asphalt patch units under strict municipal caps.</p>
        </article>
        <article className="card">
          <h4>Decision Support Algorithm</h4>
          <p>Scores combine Random Forest demand forecasts, structural severity, citizen reports, and wait times.</p>
        </article>
      </div>
    </div>
  )
}
