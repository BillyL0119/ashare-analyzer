// Which paper account this browser trades, and the headers that prove it. A signed-in user's account
// is keyed by their user id, so the server also needs their access token; otherwise the account is
// this browser's random device id.
import useAuthStore from '../store/authStore'
import getDeviceId from './deviceId'

export function paperKey() {
  return useAuthStore.getState().user?.id || getDeviceId()
}

export function paperHeaders() {
  const token = useAuthStore.getState().session?.access_token
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}
