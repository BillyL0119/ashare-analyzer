import useCompareStore from '../store/compareStore'

// Chart colours without the chart library: components that only need the palette (header search,
// watchlist, site stats) import from here, so loading them does not pull in ECharts.

// A-shares are red-up / green-down; US, Hong Kong and Japan use green-up / red-down.
// On the light theme both are a shade darker so the numbers stay readable on white (AA contrast).
const isLight = () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
const red = () => (isLight() ? '#dc2626' : '#e5484d')
const green = () => (isLight() ? '#15803d' : '#3fb67a')
export const riseColor = (market) => (market !== 'cn' ? green() : red())
export const fallColor = (market) => (market !== 'cn' ? red() : green())

// ── Theme-reactive palette ────────────────────────────────────────────────────
export function getChartTheme() {
  const market = useCompareStore.getState().market
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'
  return {
    bg:         isLight ? '#ffffff'              : '#0a1a36',
    gridBg:     isLight ? '#f6f9fd'              : '#0f2447',
    text:       isLight ? '#3a4f76'              : '#a9b9d6',
    border:     isLight ? '#d9e2f0'              : '#1f3b69',
    tooltipBg:  isLight ? 'rgba(255,255,255,0.97)' : 'rgba(7,23,48,0.96)',
    tooltipText:isLight ? '#0a1f44'              : '#e6eefb',
    up:      riseColor(market),
    down:    fallColor(market),
    ma5:     '#f0e68c',
    ma10:    '#6c9cff',
    ma20:    '#ff9800',
    ma60:    '#a99ad6',
    dif:        isLight ? '#1f3a66'              : '#e8eef9',
    dea:     '#ff9800',
    macdUp:  riseColor(market),
    macdDown:fallColor(market),
    rsi6:    '#6c9cff',
    rsi12:   '#ff9800',
    rsi24:   '#a99ad6',
    volume:  '#6c9cff',
  }
}

// Live proxy — every THEME.xxx read returns the current theme value.
// Components still need to subscribe to useThemeStore to trigger re-renders.
export const THEME = new Proxy({}, {
  get(_, prop) { return getChartTheme()[prop] },
})
