// Technical indicators computed on the client from OHLC candles (same maths as the iOS app).
export function ma(closes, n) {
  return closes.map((_, i) => (i + 1 < n ? null : +(closes.slice(i + 1 - n, i + 1).reduce((a, b) => a + b, 0) / n).toFixed(4)))
}

function ema(values, n) {
  const k = 2 / (n + 1); const out = []; let prev = null
  values.forEach((v, i) => {
    if (v == null) { out.push(null); return }
    prev = prev == null ? v : v * k + prev * (1 - k)
    out.push(i < n - 1 ? null : prev)
  })
  return out
}

export function macd(closes, fast = 12, slow = 26, sig = 9) {
  const ef = ema(closes, fast), es = ema(closes, slow)
  const dif = closes.map((_, i) => (ef[i] == null || es[i] == null ? null : ef[i] - es[i]))
  const dea = ema(dif.map((v) => v), sig)
  const hist = dif.map((v, i) => (v == null || dea[i] == null ? null : (v - dea[i]) * 2))
  return { dif, dea, hist }
}

export function rsi(closes, n = 14) {
  const out = closes.map(() => null)
  if (closes.length <= n) return out
  let g = 0, l = 0
  for (let i = 1; i <= n; i++) { const d = closes[i] - closes[i - 1]; g += Math.max(d, 0); l += Math.max(-d, 0) }
  g /= n; l /= n
  out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l)
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l)
  }
  return out
}

export function boll(closes, n = 20, k = 2) {
  const mid = ma(closes, n)
  const up = [], lo = []
  closes.forEach((_, i) => {
    if (mid[i] == null) { up.push(null); lo.push(null); return }
    const w = closes.slice(i + 1 - n, i + 1)
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - mid[i]) ** 2, 0) / n)
    up.push(mid[i] + k * sd); lo.push(mid[i] - k * sd)
  })
  return { up, mid, lo }
}
