import { createContext, useContext, useEffect, useState } from 'react'
import { ISSUES as INITIAL_ISSUES } from '../data/mock.js'

const IssueContext = createContext(null)

export function IssueProvider({ children }) {
  const [issues, setIssues] = useState(() => {
    try {
      const stored = localStorage.getItem('civicpulse_issues')
      return stored ? JSON.parse(stored) : INITIAL_ISSUES
    } catch {
      return INITIAL_ISSUES
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('civicpulse_issues', JSON.stringify(issues))
    } catch (e) {
      console.error('Failed to sync issues to localStorage', e)
    }
  }, [issues])

  function addIssue({ type, description, area, city, photo }) {
    // Determine next ID
    const maxNum = issues.reduce((acc, curr) => {
      const num = parseInt(curr.id.replace('CP-', ''), 10)
      return isNaN(num) ? acc : Math.max(acc, num)
    }, 1042)

    const nextId = `CP-${maxNum + 1}`
    const today = new Date().toISOString().split('T')[0]

    // Default coordinates based on city/area or fallback
    let lat = 16.5062
    let lng = 80.648
    if (city?.toLowerCase().includes('guntur')) {
      lat = 16.3067
      lng = 80.4365
    } else if (city?.toLowerCase().includes('tenali')) {
      lat = 16.2428
      lng = 80.6404
    } else if (city?.toLowerCase().includes('mangalagiri')) {
      lat = 16.4308
      lng = 80.568
    }

    // Default severity and score
    const severity = type === 'Road Damage' || type === 'Drainage Blockage' ? 8 : 7
    const score = 75 + Math.floor(Math.random() * 15)
    const priority = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low'

    // Department mapping
    const deptMap = {
      'Road Damage': 'Roads & Transport',
      'Water Leakage': 'Water Supply',
      'Drainage Blockage': 'Public Works',
      'Garbage Accumulation': 'Sanitation',
      'Streetlight Failure': 'Electrical',
    }

    const newIssue = {
      id: nextId,
      type,
      description,
      city: city || 'Vijayawada',
      area: area || 'Downtown',
      lat,
      lng,
      status: 'Pending',
      priority,
      score,
      severity,
      reports: 1,
      department: deptMap[type] || 'Public Works',
      date: today,
      photo: photo || null,
      isUserCreated: true,
    }

    setIssues((prev) => [newIssue, ...prev])
    return newIssue
  }

  function updateIssue(id, field, value) {
    setIssues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  function deleteIssue(id) {
    setIssues((prev) => prev.filter((item) => item.id !== id))
  }

  // Calculate live statistics
  const stats = {
    total: issues.length,
    pending: issues.filter((i) => i.status === 'Pending').length,
    resolved: issues.filter((i) => i.status === 'Resolved').length,
    highPriority: issues.filter((i) => i.priority === 'High' || i.priority === 'Critical').length,
    assigned: issues.filter((i) => i.status === 'Assigned' || i.status === 'In Progress').length,
  }

  // Calculate type counts
  const typeMap = issues.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1
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
