// Shared heatmap helpers (desktop ECharts page and the phone UI's lightweight DOM version).

export const SECTOR_ZH = {
  Technology: '科技', 'Health Care': '医疗保健', Finance: '金融', 'Consumer Discretionary': '非必需消费',
  Industrials: '工业', 'Real Estate': '房地产', Energy: '能源', Utilities: '公用事业',
  'Basic Materials': '基础材料', 'Consumer Staples': '必需消费', Telecommunications: '电信', Miscellaneous: '其他', Other: '其他',
}

const NEUTRAL = [58, 63, 76]
const GREEN = [22, 163, 74]
const RED = [220, 38, 38]

const NEUTRAL_LIGHT = [172, 182, 196]   // darker than the map's no-data land (#d8e4ee) so flat markets stay visible

/** Tile colour for a % move: A-shares red up / green down, every other market green up / red down;
 *  full colour at ±3%.
 *  `light` starts from a pale grey for light backgrounds (the world map in the light theme). */
export function tileColor(chg, market, light = false) {
  const base = light ? NEUTRAL_LIGHT : NEUTRAL
  if (chg == null) return `rgb(${base})`
  const up = market === 'cn' ? RED : GREEN
  const down = market === 'cn' ? GREEN : RED
  const target = chg >= 0 ? up : down
  const k = Math.min(Math.abs(chg) / 3, 1) ** (light ? 0.6 : 0.8)
  return `rgb(${base.map((n, i) => Math.round(n + (target[i] - n) * k))})`
}

export function money(v, market) {
  const cur = { us: '$', cn: '¥', hk: 'HK$', jp: '¥' }[market] || '$'
  if (v >= 1e12) return `${cur}${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `${cur}${(v / 1e9).toFixed(1)}B`
  return `${cur}${(v / 1e6).toFixed(0)}M`
}

export const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)

/**
 * Squarified treemap (Bruls, Huizing & van Wijk): lays `items` (each with a positive `value`)
 * into the rectangle x,y,w,h keeping tiles as close to square as possible.
 * Returns [{ x, y, w, h, item }] in the input order of rows (largest first if sorted).
 */
export function squarify(items, x, y, w, h) {
  const total = items.reduce((a, it) => a + it.value, 0)
  if (!total || w <= 0 || h <= 0) return []
  const scale = (w * h) / total
  const queue = items.filter((it) => it.value > 0).map((item) => ({ item, a: item.value * scale }))
  const out = []
  let rx = x, ry = y, rw = w, rh = h
  const worst = (row, side) => {
    const s = row.reduce((acc, r) => acc + r.a, 0)
    let max = 0, min = Infinity
    for (const r of row) { if (r.a > max) max = r.a; if (r.a < min) min = r.a }
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min))
  }
  const place = (row) => {
    const s = row.reduce((acc, r) => acc + r.a, 0)
    if (rw >= rh) {                      // column on the left
      const cw = s / rh
      let cy = ry
      for (const r of row) { const ch = r.a / cw; out.push({ x: rx, y: cy, w: cw, h: ch, item: r.item }); cy += ch }
      rx += cw; rw -= cw
    } else {                             // row along the top
      const rhh = s / rw
      let cx = rx
      for (const r of row) { const cw = r.a / rhh; out.push({ x: cx, y: ry, w: cw, h: rhh, item: r.item }); cx += cw }
      ry += rhh; rh -= rhh
    }
  }
  let row = []
  for (const q of queue) {
    const side = Math.min(rw, rh)
    if (!row.length || worst([...row, q], side) <= worst(row, side)) row.push(q)
    else { place(row); row = [q] }
  }
  if (row.length) place(row)
  return out
}
