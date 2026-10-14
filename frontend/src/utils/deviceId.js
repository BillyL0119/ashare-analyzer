// The browser's anonymous ID. It is also the only key to this browser's paper trading account, so
// a new one must be unguessable: 128 bits from the platform's secure random generator.
// Existing IDs are kept as they are (changing one would lose that account).

export function newDeviceId() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return 'w' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export default function getDeviceId(key = 'bfs_device_id') {
  try {
    let id = localStorage.getItem(key)
    if (!id) {
      id = newDeviceId()
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return newDeviceId()        // storage blocked (private mode): a fresh ID for this session
  }
}
