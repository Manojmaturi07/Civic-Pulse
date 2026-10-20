import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../services/api.js'

const IssueContext = createContext(null)

export function IssueProvider({ children }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const remoteIssues = await api.getIssues({ limit: 100 })
      if (Array.isArray(remoteIssues)) {
        setIssues(remoteIssues)
      } else {
        setIssues([])
      }
    } catch (err) {
      console.error('Could not fetch issues from backend API:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  async function addIssue({ type, description, area, city, photo, lat, lng }) {
    let latitude = lat !== undefined ? Number(lat) : 16.5062
    let longitude = lng !== undefined ? Number(lng) : 80.648

    if (lat === undefined || lng === undefined) {
      const cityClean = (city || '').toLowerCase()
      if (cityClean.includes('guntur')) {
        latitude = 16.3067
        longitude = 80.4365
      } else if (cityClean.includes('tenali')) {
        latitude = 16.2428
        longitude = 80.6404
      } else if (cityClean.includes('mangalagiri')) {
        latitude = 16.4308
        longitude = 80.568
      }
    }

    // Call backend API - do NOT fake success before backend confirms
    const created = await api.createIssue({
      type,
      description,
      area: area || 'Downtown',
      city: city || 'Vijayawada',
      lat: latitude,
      lng: longitude,
      photo: photo || null,
    })

    if (created) {
      setIssues((prev) => [created, ...prev])
      return created
    }
    throw new Error('Failed to create civic complaint record on backend server.')
  }

  async function updateIssue(id, field, value) {
    const payload = typeof field === 'object' ? field : { [field]: value }
    const updated = await api.updateIssue(id, payload)
    if (updated) {
      setIssues((prev) =>
        prev.map((item) => ((item.id === id || item.issue_code === id) ? updated : item))
      )
      return updated
    }
  }

  async function deleteIssue(id) {
    await api.deleteIssue(id)
    setIssues((prev) => prev.filter((item) => item.id !== id && item.issue_code !== id))
  }

  // Calculate live statistics from active database issues
  const stats = {
    total: issues.length,
    pending: issues.filter((i) => i.status === 'Pending').length,
    resolved: issues.filter((i) => i.status === 'Resolved').length,
    highPriority: issues.filter((i) => i.priority === 'High' || i.priority === 'Critical').length,
    assigned: issues.filter((i) => i.status === 'Assigned' || i.status === 'In Progress').length,
  }

  // Calculate category mix
  const typeMap = issues.reduce((acc, curr) => {
    const t = curr.type || 'Other'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  const typeCounts = Object.entries(typeMap).map(([type, count]) => ({
    type,
    count,
  }))

  return (
    <IssueContext.Provider
      value={{
        issues,
        loading,
        error,
        refreshIssues: fetchIssues,
        addIssue,
        updateIssue,
        deleteIssue,
        stats,
        typeCounts,
      }}
    >
      {children}
    </IssueContext.Provider>
  )
}

export function useIssues() {
  const ctx = useContext(IssueContext)
  if (!ctx) {
    throw new Error('useIssues must be used within an IssueProvider')
  }
  return ctx
}
