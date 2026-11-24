// After a deploy the old build's files are gone (each build has new file names), so a tab opened before the deploy
// fails the first time it loads a page it has not loaded yet. Such failures are fixed by loading the new build:
// reload once, but never twice within 10 seconds (a real outage must not become a reload loop).
const KEY = 'bfs_chunk_reload_at'

export function isChunkError(err) {
  const msg = String(err?.message || err || '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|is not a valid JavaScript MIME type|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(msg)
}

export function reloadOnce() {
  let last = 0
  try { last = Number(sessionStorage.getItem(KEY) || 0) } catch { /* storage blocked */ }
  if (Date.now() - last < 10_000) return false
  try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* storage blocked */ }
  window.location.reload()
  return true
}
