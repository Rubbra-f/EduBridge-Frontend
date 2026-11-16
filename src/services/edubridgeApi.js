async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof data.detail === 'string'
        ? data.detail
        : `API request failed: ${response.status}`

    throw new Error(message)
  }

  return data
}

export function getModelInfo() {
  return apiRequest('/api/v1/model')
}

export function getFixedAssessment() {
  return apiRequest('/api/v1/assessment/fixed')
}

export function getQuestionBank() {
  return apiRequest('/api/v1/assessment/bank')
}

export function submitAssessment(studentId, responses) {
  return apiRequest('/api/v1/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({
      student_id: studentId,
      responses,
    }),
  })
}

export function getDiagnosticNarrative(studentId, responses, audience = 'student') {
  return apiRequest('/api/v1/narrative', {
    method: 'POST',
    body: JSON.stringify({
      student_id: studentId,
      responses,
      audience,
    }),
  })
}

export function getAssessmentImageUrl(questionId) {
  return `/api/v1/assessment/images/${questionId}`
}
