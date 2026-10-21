const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function getAuthToken() {
  try {
    return localStorage.getItem('civicpulse_token') || ''
  } catch {
    return ''
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem('civicpulse_token', token)
    } else {
      localStorage.removeItem('civicpulse_token')
    }
  } catch (err) {
    console.error('Failed to update local auth token', err)
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = getAuthToken()
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)
    const contentType = response.headers.get('content-type') || ''
    let data = null

    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      const errorMsg =
        (data && (data.detail || data.message || (Array.isArray(data.errors) ? data.errors.join(', ') : null))) ||
        `Request failed with status ${response.status}`
      const error = new Error(errorMsg)
      error.status = response.status
      error.data = data
      throw error
    }

    return data
  } catch (err) {
    // If backend is unreachable, throw informative error
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('Cannot connect to CivicPulse backend server at ' + API_BASE_URL)
      netError.status = 503
      throw netError
    }
    throw err
  }
}

export const api = {
  // Authentication
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request('/auth/me'),

  updateProfile: (updates) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  // Issues
  getIssues: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.city && filters.city !== 'All') params.append('city', filters.city)
    if (filters.type && filters.type !== 'All') params.append('type', filters.type)
    if (filters.status && filters.status !== 'All') params.append('status', filters.status)
    if (filters.area && filters.area !== 'All') params.append('area', filters.area)
    if (filters.search) params.append('search', filters.search)
    if (filters.limit) params.append('limit', String(filters.limit))
    const query = params.toString() ? `?${params.toString()}` : ''
    return request(`/issues${query}`)
  },

  getMyIssues: () => request('/issues/mine'),

  getIssue: (id) => request(`/issues/${id}`),

  createIssue: (issue) =>
    request('/issues', {
      method: 'POST',
      body: JSON.stringify(issue),
    }),

  updateIssue: (id, updates) =>
    request(`/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteIssue: (id) =>
    request(`/issues/${id}`, {
      method: 'DELETE',
    }),

  // Hotspot Predictions
  getHotspots: (forceRefresh = false) => {
    const query = forceRefresh ? '?force_refresh=true' : ''
    return request(`/hotspots${query}`)
  },

  getHotspotByArea: (area) => request(`/hotspots/${encodeURIComponent(area)}`),

  triggerPredictHotspots: (params = {}) =>
    request('/hotspots/predict', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Analytics & ML Model
  getAnalyticsOverview: () => request('/analytics/overview'),
  getIssuesByType: () => request('/analytics/issues-by-type'),
  getTrends: (granularity = 'monthly') => request(`/analytics/trends?granularity=${encodeURIComponent(granularity)}`),
  getAreaComparison: () => request('/analytics/area-comparison'),
  getDepartmentWorkload: () => request('/analytics/department-workload'),
  getResolutionPerformance: () => request('/analytics/resolution-performance'),
  getModelMetrics: () => request('/analytics/model-metrics'),

  // Resource Planning
  getResourceAllocations: () => request('/resources'),
  generateRecommendations: () =>
    request('/resources/recommend', {
      method: 'POST',
    }),
  planResources: () =>
    request('/resources/plan', {
      method: 'POST',
    }),
  approveAllocation: (allocId, payload) =>
    request(`/resources/${allocId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateResourceAllocation: (allocId, payload) =>
    request(`/resources/${allocId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
}
