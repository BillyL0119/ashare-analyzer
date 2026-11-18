/** A site token's current value, read at render time so a theme switch re-colours charts. */
export function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}
