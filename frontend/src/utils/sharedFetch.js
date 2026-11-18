// One request per URL at a time, and a short memory of the answer: components that need the same
// data at the same moment (the home page's market lesson and market panel both read the US market
// overview) share one network request instead of each sending its own.
const cache = new Map()      // url -> { at, data }
const inflight = new Map()   // url -> Promise

export function getJSON(url, maxAgeMs = 20000) {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < maxAgeMs) return Promise.resolve(hit.data)
  if (inflight.has(url)) return inflight.get(url)
  const p = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => { cache.set(url, { at: Date.now(), data }); return data })
    .finally(() => inflight.delete(url))
  inflight.set(url, p)
  return p
}
