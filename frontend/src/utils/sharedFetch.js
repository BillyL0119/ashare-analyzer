// One request per URL for a short window, shared by every component that asks for it
// (the home hero and the sentiment panel both read /api/market/sentiment).
const cache = new Map()

export function sharedJson(url, ttlMs = 30000) {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise
  const promise = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} ${r.status}`)
    return r.json()
  })
  promise.catch(() => cache.delete(url))
  cache.set(url, { at: Date.now(), promise })
  return promise
}
