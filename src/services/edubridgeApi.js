const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail = data.detail
    const message = typeof detail === 'string'
      ? detail
      : detail?.message || `API request failed (${response.status})`
    throw new Error(message)
  }

  return data
}

export const getModelInfo = () => apiRequest('/api/v1/model')
export const getFixedAssessment = () => apiRequest('/api/v1/assessment/fixed')
export const getQuestionBank = () => apiRequest('/api/v1/assessment/bank')

export function submitAssessment(studentId, responses) {
  return apiRequest('/api/v1/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, responses }),
  })
}

export function getDiagnosticNarrative(studentId, responses, audience = 'student') {
  return apiRequest('/api/v1/narrative', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, responses, audience }),
  })
}

export const getAssessmentImageUrl = (questionId) =>
  `${API_BASE}/api/v1/assessment/images/${encodeURIComponent(questionId)}`
