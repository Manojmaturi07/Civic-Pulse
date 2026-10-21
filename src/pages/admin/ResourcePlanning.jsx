import { useState, useEffect, useMemo, useRef } from 'react'
import { Badge } from '../../components/ui.jsx'
import { WORKLOAD, DEPARTMENTS } from '../../data/mock.js'
import { api } from '../../services/api.js'
import { useIssues } from '../../context/IssueContext.jsx'

const DEPT_ICONS = {
  'Roads & Transport': '🛣️',
  'Sanitation': '🧹',
  'Water Supply': '💧',
  'Public Works': '🏗️',
  'Electrical': '⚡',
}

export default function ResourcePlanning() {
  const { issues, updateIssue, refreshIssues } = useIssues()

  const [workloads, setWorkloads] = useState(WORKLOAD)
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Active issues inspection & solving state
  const [selectedDept, setSelectedDept] = useState('All')
  const [issueSearch, setIssueSearch] = useState('')
  const [showOnlyOpen, setShowOnlyOpen] = useState(true)
  const [solvingId, setSolvingId] = useState(null)
  const [bulkSolving, setBulkSolving] = useState(false)

  // Allocation table filters & search
  const [allocSearch, setAllocSearch] = useState('')
  const [allocStatusFilter, setAllocStatusFilter] = useState('All')

  // Crew adjustment modal state
  const [editingAlloc, setEditingAlloc] = useState(null)
  const [editCrews, setEditCrews] = useState(2)
  const [editStatus, setEditStatus] = useState('Approved')
  const [editNotes, setEditNotes] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const issuesSectionRef = useRef(null)

  // Fetch workloads and allocations on mount
  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
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

  useEffect(() => {
    loadData()
  }, [])

  // Sync department workloads whenever issues change
  useEffect(() => {
    async function syncWorkloads() {
      try {
        const wData = await api.getDepartmentWorkload()
        if (Array.isArray(wData) && wData.length > 0) {
          setWorkloads(wData)
        }
      } catch {
        // Fallback to local computation from issues
      }
    }
    if (issues && issues.length > 0) {
      syncWorkloads()
    }
  }, [issues])

  function showSuccess(msg) {
    setActionMsg(msg)
    setErrorMsg('')
    setTimeout(() => setActionMsg(''), 4500)
  }

  function showError(msg) {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(''), 5000)
  }

  // Handle single allocation status update
  async function handleUpdateAllocationStatus(allocId, status) {
    try {
      const updated = await api.approveAllocation(allocId, { allocation_status: status })
      setAllocations((prev) =>
        prev.map((a) => (a.id === allocId ? { ...a, allocation_status: status } : a))
      )
      showSuccess(`Dispatch plan for ${updated?.area || 'zone'} updated to "${status}"!`)
    } catch (err) {
      showError(`Allocation update failed: ${err.message}`)
    }
  }

  // Regenerate recommendations
  async function handleRegenerate() {
    setLoading(true)
    try {
      const recs = await api.generateRecommendations()
      if (Array.isArray(recs)) {
        setAllocations(recs)
        showSuccess('Fresh crew recommendations recalculated from Random Forest hotspot forecasts!')
      }
    } catch (err) {
      showError(`Failed to recalculate plan: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle single issue solving
  async function handleSolveIssue(issueId, issueCode) {
    setSolvingId(issueId)
    try {
      await updateIssue(issueId, 'status', 'Resolved')
      showSuccess(`Issue ${issueCode || issueId} marked as Solved & Resolved!`)
      // Refresh workload counts from backend
      try {
        const freshWorkload = await api.getDepartmentWorkload()
        if (Array.isArray(freshWorkload)) setWorkloads(freshWorkload)
      } catch {
        // silent
      }
    } catch (err) {
      showError(`Could not resolve issue: ${err.message}`)
    } finally {
      setSolvingId(null)
    }
  }

  // Handle bulk solve for all open issues in the selected department
  async function handleBulkSolveDepartment(deptName) {
    const toSolve = issues.filter(
      (i) =>
        i.status !== 'Resolved' &&
        (deptName === 'All' || i.department === deptName)
    )
    if (toSolve.length === 0) return

    setBulkSolving(true)
    try {
      for (const item of toSolve) {
        await updateIssue(item.id, 'status', 'Resolved')
      }
      showSuccess(`All ${toSolve.length} open tickets in ${deptName === 'All' ? 'all divisions' : deptName} have been resolved!`)
      try {
        const freshWorkload = await api.getDepartmentWorkload()
        if (Array.isArray(freshWorkload)) setWorkloads(freshWorkload)
      } catch {
        // silent
      }
    } catch (err) {
      showError(`Bulk resolution notice: ${err.message}`)
    } finally {
      setBulkSolving(false)
    }
  }

  // Open adjustment modal
  function openAdjustmentModal(alloc) {
    setEditingAlloc(alloc)
    setEditCrews(alloc.recommended_crews || 2)
    setEditStatus(alloc.allocation_status === 'Pending Review' ? 'Approved' : alloc.allocation_status)
    setEditNotes(alloc.notes || '')
  }

  // Save crew adjustment
  async function handleSaveAdjustment(e) {
    e.preventDefault()
    if (!editingAlloc) return
    setSavingEdit(true)
    try {
      await api.approveAllocation(editingAlloc.id, {
        allocation_status: editStatus,
        approved_crews: Number(editCrews),
        notes: editNotes,
      })
      setAllocations((prev) =>
        prev.map((a) =>
          a.id === editingAlloc.id
            ? {
                ...a,
                allocation_status: editStatus,
                recommended_crews: Number(editCrews),
                notes: editNotes,
              }
            : a
        )
      )
      showSuccess(`Allocation for ${editingAlloc.area} adjusted: ${editCrews} crew(s) · ${editStatus}`)
      setEditingAlloc(null)
    } catch (err) {
      showError(`Failed to save adjustment: ${err.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  // Jump and filter to a department's issues
  function inspectDepartment(dept) {
    setSelectedDept(dept)
    setShowOnlyOpen(true)
    if (issuesSectionRef.current) {
      issuesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Computed issues
  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const matchDept = selectedDept === 'All' || i.department === selectedDept
      const matchStatus = !showOnlyOpen || i.status !== 'Resolved'
      const searchLower = issueSearch.toLowerCase().trim()
      const matchSearch =
        !searchLower ||
        (i.issue_code || i.id || '').toLowerCase().includes(searchLower) ||
        (i.description || '').toLowerCase().includes(searchLower) ||
        (i.area || '').toLowerCase().includes(searchLower) ||
        (i.type || '').toLowerCase().includes(searchLower)
      return matchDept && matchStatus && matchSearch
    })
  }, [issues, selectedDept, showOnlyOpen, issueSearch])

  // Count open issues by department
  const openCountByDept = useMemo(() => {
    const counts = { All: 0 }
    DEPARTMENTS.forEach((d) => (counts[d] = 0))
    issues.forEach((i) => {
      if (i.status !== 'Resolved') {
        counts.All += 1
        const d = i.department || 'Roads & Transport'
        counts[d] = (counts[d] || 0) + 1
      }
    })
    return counts
  }, [issues])

  // Computed allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const matchStatus = allocStatusFilter === 'All' || a.allocation_status === allocStatusFilter
      const searchLower = allocSearch.toLowerCase().trim()
      const matchSearch =
        !searchLower ||
        (a.area || '').toLowerCase().includes(searchLower) ||
        (a.city || '').toLowerCase().includes(searchLower) ||
        (a.department || '').toLowerCase().includes(searchLower)
      return matchStatus && matchSearch
    })
  }, [allocations, allocStatusFilter, allocSearch])

  // Stats calculation
  const totalOpenTickets = openCountByDept.All
  const totalCrewCap = workloads.reduce((sum, w) => sum + (w.crew || 0), 0)
  const approvedAllocationsCount = allocations.filter(
    (a) => a.allocation_status === 'Approved' || a.allocation_status === 'Deployed'
  ).length
  const deployedAllocationsCount = allocations.filter((a) => a.allocation_status === 'Deployed').length

  return (
    <div>
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h2>Resource Planning & Crew Dispatch</h2>
          <p style={{ color: 'var(--muted)' }}>
            Department workload, ML hotspot demand forecasting, and constrained crew deployment.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleRegenerate}
            disabled={loading}
          >
            {loading ? 'Processing...' : '🔄 Recalculate Dispatch Plan'}
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {actionMsg && (
        <div className="auth-alert success-alert" style={{ marginBottom: 16 }}>
          <span>✅</span>
          <span>{actionMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="auth-alert error-alert" style={{ marginBottom: 16 }}>
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Executive KPI Metric Cards */}
      <div className="resource-kpi-grid">
        <div className="resource-kpi-card">
          <div className="resource-kpi-val">{totalOpenTickets}</div>
          <div className="resource-kpi-label">Active Open Issues</div>
          <div className="resource-kpi-sub">
            {totalOpenTickets === 0
              ? '✨ All municipal issues resolved'
              : `${totalOpenTickets} civic tickets requiring crew action`}
          </div>
        </div>

        <div className="resource-kpi-card">
          <div className="resource-kpi-val">{totalCrewCap}</div>
          <div className="resource-kpi-label">Total Municipal Crews</div>
          <div className="resource-kpi-sub">Across 5 monitored divisions</div>
        </div>

        <div className="resource-kpi-card">
          <div className="resource-kpi-val">{allocations.length}</div>
          <div className="resource-kpi-label">Monitored Zones</div>
          <div className="resource-kpi-sub">Random Forest demand forecasts</div>
        </div>

        <div className="resource-kpi-card">
          <div className="resource-kpi-val" style={{ color: 'var(--ok)' }}>
            {deployedAllocationsCount} / {allocations.length}
          </div>
          <div className="resource-kpi-label">Deployed Crew Units</div>
          <div className="resource-kpi-sub">
            {approvedAllocationsCount} plans approved for deployment
          </div>
        </div>
      </div>

      {/* Department Capacity Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontFamily: 'Fraunces, serif', margin: 0 }}>
              Department Capacity & Active Pressure
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0 0' }}>
              Real-time ticket load vs. crew capacity. Click on any department to view and solve its open issues.
            </p>
          </div>
          {totalOpenTickets > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => handleBulkSolveDepartment('All')}
              disabled={bulkSolving}
            >
              {bulkSolving ? 'Resolving...' : '⚡ Solve All Open Issues Across City'}
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Open Tickets</th>
                <th>Crew Available</th>
                <th>Suggested Allocation</th>
                <th>Need Level</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workloads.map((w) => {
                const openCount = openCountByDept[w.department] !== undefined ? openCountByDept[w.department] : w.open
                return (
                  <tr key={w.department}>
                    <td>
                      <span style={{ marginRight: 6 }}>{DEPT_ICONS[w.department] || '🏢'}</span>
                      <strong>{w.department}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: openCount > 0 ? 'var(--warn)' : 'var(--ok)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: openCount > 0 ? '#fff3d6' : '#e7f5ec',
                        }}
                      >
                        {openCount} {openCount === 1 ? 'ticket' : 'tickets'}
                      </span>
                    </td>
                    <td>{w.crew} crews</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {openCount === 0
                          ? 'Optimal (0 backlog)'
                          : w.suggested_allocation || `${Math.ceil(openCount / Math.max(w.crew, 1))} tickets / crew`}
                      </span>
                    </td>
                    <td>
                      <Badge value={openCount === 0 ? 'Normal' : w.need} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => inspectDepartment(w.department)}
                        >
                          🔍 Inspect Issues ({openCount})
                        </button>
                        {openCount > 0 && (
                          <button
                            type="button"
                            className="solve-issue-btn"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleBulkSolveDepartment(w.department)}
                            disabled={bulkSolving}
                          >
                            ⚡ Solve All
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Department Issues & One-Click Solving Section */}
      <div className="card" ref={issuesSectionRef} style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ fontFamily: 'Fraunces, serif', margin: 0 }}>
              Active Issues Demanding Municipal Resources
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0 0' }}>
              Inspect tickets driving department workload. Mark them as <strong>Solved & Resolved</strong> directly as crew dispatch is approved.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showOnlyOpen}
                onChange={(e) => setShowOnlyOpen(e.target.checked)}
              />
              Show Only Unresolved Tickets
            </label>
            {selectedDept !== 'All' && openCountByDept[selectedDept] > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => handleBulkSolveDepartment(selectedDept)}
                disabled={bulkSolving}
              >
                {bulkSolving ? 'Solving...' : `⚡ Solve All ${selectedDept} Issues`}
              </button>
            )}
          </div>
        </div>

        {/* Department Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            type="button"
            className={`dept-filter-btn ${selectedDept === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedDept('All')}
          >
            All Departments ({openCountByDept.All || 0} open)
          </button>
          {DEPARTMENTS.map((dept) => {
            const count = openCountByDept[dept] || 0
            return (
              <button
                key={dept}
                type="button"
                className={`dept-filter-btn ${selectedDept === dept ? 'active' : ''}`}
                onClick={() => setSelectedDept(dept)}
              >
                {DEPT_ICONS[dept] || ''} {dept} ({count})
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            placeholder="🔍 Search tickets by ID, area, type, or description..."
            value={issueSearch}
            onChange={(e) => setIssueSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 420, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}
          />
        </div>

        {/* Issues List Table */}
        {filteredIssues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--subtle)', borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <h4 style={{ margin: '0 0 6px 0' }}>No tickets found</h4>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              {showOnlyOpen
                ? 'All issues for this selection are resolved! Department capacity is optimal.'
                : 'No issues match your current filters.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket Code</th>
                  <th>Department & Category</th>
                  <th>Location</th>
                  <th>Description</th>
                  <th>Score & Priority</th>
                  <th>Current Status</th>
                  <th>Solve Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue) => {
                  const isResolved = issue.status === 'Resolved'
                  const isSolving = solvingId === issue.id
                  return (
                    <tr
                      key={issue.id || issue.issue_code}
                      style={{
                        backgroundColor: isResolved ? 'rgba(47, 143, 107, 0.04)' : undefined,
                        opacity: isResolved ? 0.78 : 1,
                      }}
                    >
                      <td>
                        <strong>{issue.issue_code || issue.id}</strong>
                        {issue.isUserCreated && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              background: 'var(--gold-soft)',
                              color: '#684a00',
                              padding: '2px 5px',
                              borderRadius: 4,
                              fontWeight: 700,
                            }}
                          >
                            Citizen
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>
                          {DEPT_ICONS[issue.department] || ''} {issue.department || 'Roads & Transport'}
                        </span>
                        <strong>{issue.type}</strong>
                      </td>
                      <td>
                        {issue.area}, {issue.city}
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{issue.description}</span>
                        {issue.reports && (
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            📢 {issue.reports} citizen reports
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{issue.score || 80}</span>
                          <Badge value={issue.priority || 'Medium'} />
                        </div>
                      </td>
                      <td>
                        <select
                          value={issue.status}
                          onChange={(e) => updateIssue(issue.id, 'status', e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            borderColor:
                              issue.status === 'Resolved'
                                ? 'var(--ok)'
                                : issue.status === 'Pending'
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
                      <td>
                        {isResolved ? (
                          <span style={{ color: 'var(--ok)', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ✓ Solved
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="solve-issue-btn"
                            disabled={isSolving}
                            onClick={() => handleSolveIssue(issue.id, issue.issue_code)}
                          >
                            {isSolving ? 'Solving...' : '⚡ Solve Issue'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Zone-Specific Dispatch Recommendations Section */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ fontFamily: 'Fraunces, serif', margin: 0 }}>
              Zone-Specific Dispatch Recommendations (Forward 7 Days)
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0 0' }}>
              ML hotspot forecasts with constrained municipal crew allocations and equipment assignment.
            </p>
          </div>

          {/* Search & Status Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Filter zones or wards..."
              value={allocSearch}
              onChange={(e) => setAllocSearch(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }}
            />

            <select
              value={allocStatusFilter}
              onChange={(e) => setAllocStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Deployed">Deployed</option>
            </select>
          </div>
        </div>

        {filteredAllocations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)' }}>
            No dispatch allocations match current filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Zone / Ward</th>
                  <th>Department</th>
                  <th>Predicted Demand</th>
                  <th>Recommended Crews</th>
                  <th>Equipment Assignment</th>
                  <th>Priority</th>
                  <th>Allocation Status</th>
                  <th>Dispatch Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((a) => {
                  const isApproved = a.allocation_status === 'Approved'
                  const isDeployed = a.allocation_status === 'Deployed'
                  const isPending = a.allocation_status === 'Pending Review'

                  // Count matching open issues in this zone
                  const zoneOpenCount = issues.filter(
                    (i) => i.area === a.area && i.status !== 'Resolved'
                  ).length

                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.area}</strong>, {a.city}
                        {zoneOpenCount > 0 && (
                          <div style={{ marginTop: 3 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setIssueSearch(a.area)
                                setSelectedDept('All')
                                setShowOnlyOpen(true)
                                issuesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
                              }}
                              style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                border: 'none',
                                borderRadius: 4,
                                padding: '1px 6px',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ⚡ {zoneOpenCount} active ticket(s) in zone
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ marginRight: 4 }}>{DEPT_ICONS[a.department] || '🏢'}</span>
                        {a.department}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{a.predicted_demand}</span> issues
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, color: 'var(--forest)', fontSize: 14 }}>
                            {a.recommended_crews} crew(s)
                          </span>
                          <button
                            type="button"
                            title="Adjust Crews"
                            onClick={() => openAdjustmentModal(a)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--line)',
                              borderRadius: 4,
                              padding: '2px 5px',
                              fontSize: 10,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        {(a.equipment_requirements || []).map((eq, idx) => (
                          <span key={idx} className="equip-pill">
                            {eq}
                          </span>
                        ))}
                      </td>
                      <td>
                        <Badge value={a.priority || 'Medium'} />
                      </td>
                      <td>
                        {/* Display true allocation status */}
                        <Badge value={a.allocation_status || 'Pending Review'} />
                        {a.notes && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            📝 {a.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: 11, borderColor: 'var(--forest)', color: 'var(--forest)' }}
                                onClick={() => handleUpdateAllocationStatus(a.id, 'Approved')}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: 11 }}
                                onClick={() => handleUpdateAllocationStatus(a.id, 'Deployed')}
                              >
                                Deploy
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: 11, background: '#059669', borderColor: '#059669' }}
                              onClick={() => handleUpdateAllocationStatus(a.id, 'Deployed')}
                            >
                              🚀 Deploy Crews
                            </button>
                          )}

                          {isDeployed && (
                            <span style={{ color: 'var(--ok)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              ✓ Deployed
                            </span>
                          )}

                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => openAdjustmentModal(a)}
                          >
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Strategic Guidance Cards */}
      <div className="cards" style={{ marginTop: 20 }}>
        <article className="card">
          <h4>Priority-Based Dispatch</h4>
          <p>
            Send extra sanitation and roads crews to Benz Circle and PNBS first — highest density of citizen complaints plus structural severity.
          </p>
        </article>
        <article className="card">
          <h4>Equipment Constrained Planning</h4>
          <p>
            Allocation balances hydraulic lift trucks, compactors, and asphalt patch units under strict municipal inventory limits.
          </p>
        </article>
        <article className="card">
          <h4>Decision Support Algorithm</h4>
          <p>
            Scores combine Random Forest demand forecasts, structural severity, citizen reports, and wait times to optimize response times.
          </p>
        </article>
      </div>

      {/* Crew Adjustment Modal */}
      {editingAlloc && (
        <div className="modal-backdrop-custom" onClick={() => setEditingAlloc(null)}>
          <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif' }}>
                Adjust Crew Dispatch Plan
              </h3>
              <button
                type="button"
                onClick={() => setEditingAlloc(null)}
                style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 14, background: 'var(--subtle)', padding: 12, borderRadius: 10 }}>
              <div><strong>Zone:</strong> {editingAlloc.area}, {editingAlloc.city}</div>
              <div><strong>Department:</strong> {editingAlloc.department}</div>
              <div><strong>Forecasted Demand:</strong> {editingAlloc.predicted_demand} issues</div>
              <div><strong>Available Department Crews:</strong> {editingAlloc.available_crews} total</div>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <label className="field">
                <span>Assigned Crews Count</span>
                <input
                  type="number"
                  min="1"
                  max={editingAlloc.available_crews || 15}
                  value={editCrews}
                  onChange={(e) => setEditCrews(e.target.value)}
                  required
                />
              </label>

              <label className="field" style={{ marginTop: 12 }}>
                <span>Allocation Status</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Deployed">Deployed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>

              <label className="field" style={{ marginTop: 12 }}>
                <span>Dispatch Operational Notes</span>
                <textarea
                  rows="3"
                  placeholder="e.g., Night shift team deployed with patch truck..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingAlloc(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : 'Save & Update Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
