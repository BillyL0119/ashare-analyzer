// Fire-and-forget analytics helpers. Never throws — silently swallows errors.

function getDeviceId() {
  const key = 'bfs_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = Math.random().toString(36).substr(2, 9) + Date.now()
    localStorage.setItem(key, id)
  }
  return id
}

export function trackVisit(page = 'home') {
  fetch('/api/analytics/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), page }),
  }).catch(() => {})
}

export function trackSearch(symbol) {
  if (!symbol) return
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), event: 'search', symbol }),
  }).catch(() => {})
}

export function trackFeature(feature) {
  if (!feature) return
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), event: 'feature', feature }),
  }).catch(() => {})
}
