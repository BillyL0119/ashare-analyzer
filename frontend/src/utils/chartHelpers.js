import useCompareStore from '../store/compareStore'

// US convention is green-up / red-down, A-shares are red-up / green-down.
const RISE_CN = '#ef5350', FALL_CN = '#26a69a'
export const riseColor = (market) => (market === 'us' ? FALL_CN : RISE_CN)
export const fallColor = (market) => (market === 'us' ? RISE_CN : FALL_CN)

// ── Theme-reactive palette ────────────────────────────────────────────────────
export function getChartTheme() {
  const market = useCompareStore.getState().market
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'
  return {
    bg:         isLight ? '#ffffff'              : '#020813',
    gridBg:     isLight ? '#f8fafc'              : '#060f1e',
    text:       isLight ? '#475569'              : '#94a3b8',
    border:     isLight ? '#e2e8f0'              : '#1a2f50',
    tooltipBg:  isLight ? 'rgba(255,255,255,0.97)' : 'rgba(2,8,19,0.95)',
    tooltipText:isLight ? '#0f172a'              : '#94a3b8',
    up:      riseColor(market),
    down:    fallColor(market),
    ma5:     '#f0e68c',
    ma10:    '#8ab4f8',
    ma20:    '#ff9800',
    ma60:    '#c084fc',
    dif:        isLight ? '#374151'              : '#e8eaed',
    dea:     '#ff9800',
    macdUp:  riseColor(market),
    macdDown:fallColor(market),
    rsi6:    '#8ab4f8',
    rsi12:   '#ff9800',
    rsi24:   '#c084fc',
    volume:  '#8ab4f8',
  }
}

// Live proxy — every THEME.xxx read returns the current theme value.
// Components still need to subscribe to useThemeStore to trigger re-renders.
export const THEME = new Proxy({}, {
  get(_, prop) { return getChartTheme()[prop] },
})

// ── Shared data zoom (built per call so colours are reactive) ─────────────────
// Sub-charts (volume, MACD, RSI) are echarts.connect-ed to the K-line chart, so only the
// main chart needs a visible slider; the others keep the inside zoom to stay in sync.
function makeDataZoom(T, withSlider = true) {
  const inside = {
    type: 'inside',
    xAxisIndex: [0],
    start: 60,
    end: 100,
    zoomOnMouseWheel: true,
  }
  if (!withSlider) return [inside]
  return [
    inside,
    {
      type: 'slider',
      xAxisIndex: [0],
      start: 60,
      end: 100,
      height: 20,
      bottom: 0,
      borderColor: T.border,
      textStyle: { color: T.text },
      fillerColor: 'rgba(100,181,246,0.1)',
      handleStyle: { color: T.text },
    },
  ]
}

// Category date axis: short MM-DD labels, thinned by echarts so they never overlap.
function dateAxisLabel(T) {
  return { color: T.text, fontSize: 10, hideOverlap: true, margin: 8, formatter: (v) => String(v).slice(5) }
}

// Volume in the reader's units: 万/亿 for Chinese, K/M/B for everything else.
function formatVolume(v, lang) {
  if (lang === 'zh') return v >= 1e8 ? `${(v / 1e8).toFixed(1)}亿` : `${(v / 1e4).toFixed(0)}万`
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(v)
}

export function buildKLineOption(candles, maData, lang = 'zh', upColor, downColor) {
  const T = getChartTheme()
  upColor   = upColor   ?? T.up
  downColor = downColor ?? T.down

  const dates = candles.map((c) => c.date.slice(0, 10))
  const ohlc  = candles.map((c) => [c.open, c.close, c.low, c.high])

  const labels = lang === 'en'
    ? { open: 'Open', close: 'Close', high: 'High', low: 'Low', change: 'Change', kline: 'Candlestick' }
    : { open: '开', close: '收', high: '高', low: '低', change: '涨跌幅', kline: 'K线' }

  const series = [
    {
      name: labels.kline,
      type: 'candlestick',
      data: ohlc,
      itemStyle: {
        color: upColor,
        color0: downColor,
        borderColor: upColor,
        borderColor0: downColor,
      },
    },
  ]

  if (maData) {
    const maLines = [
      { key: 'ma5',  color: T.ma5,  label: 'MA5'  },
      { key: 'ma10', color: T.ma10, label: 'MA10' },
      { key: 'ma20', color: T.ma20, label: 'MA20' },
      { key: 'ma60', color: T.ma60, label: 'MA60' },
    ]
    for (const { key, color, label } of maLines) {
      series.push({
        name: label,
        type: 'line',
        data: maData.map((m) => m[key]),
        smooth: false,
        showSymbol: false,
        lineStyle: { width: 1.5, color },
        itemStyle: { color },
      })
    }
  }

  return {
    backgroundColor: T.gridBg,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: T.tooltipBg,
      borderColor: T.border,
      textStyle: { color: T.tooltipText, fontSize: 12 },
      formatter: (params) => {
        const kline = params.find((p) => p.seriesName === labels.kline)
        if (!kline) return ''
        const [o, c, l, h] = kline.data
        const date  = kline.axisValue
        const pct   = candles[kline.dataIndex]?.pct_change ?? 0
        const color = c >= o ? upColor : downColor
        let html = `<div style="font-weight:bold;margin-bottom:4px">${date}</div>`
        html += `<div>${labels.open}: <span style="color:${color}">${o}</span></div>`
        html += `<div>${labels.close}: <span style="color:${color}">${c}</span></div>`
        html += `<div>${labels.high}: ${h} ${labels.low}: ${l}</div>`
        html += `<div>${labels.change}: <span style="color:${color}">${pct.toFixed(2)}%</span></div>`
        params.filter((p) => p.seriesName !== labels.kline).forEach((p) => {
          if (p.data != null)
            html += `<div>${p.seriesName}: <span style="color:${p.color}">${Number(p.data).toFixed(2)}</span></div>`
        })
        return html
      },
    },
    legend: {
      top: 4, left: 8,
      textStyle: { color: T.text, fontSize: 11 },
      itemWidth: 16, itemHeight: 8,
    },
    grid: { top: 36, bottom: 52, left: 64, right: 12, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: dateAxisLabel(T),
      axisLine: { lineStyle: { color: T.border } },
      splitLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: T.border, type: 'dashed' } },
      axisLabel: { color: T.text, fontSize: 10 },
    },
    dataZoom: makeDataZoom(T),
    series,
  }
}

export function buildVolumeOption(candles, lang = 'zh', upColor, downColor) {
  const T = getChartTheme()
  upColor   = upColor   ?? T.up
  downColor = downColor ?? T.down

  const dates    = candles.map((c) => c.date.slice(0, 10))
  const volLabel = lang === 'en' ? 'Volume' : '成交量'
  const volumes  = candles.map((c) => ({
    value: c.volume,
    itemStyle: { color: c.close >= c.open ? upColor : downColor, opacity: 0.8 },
  }))

  return {
    backgroundColor: T.gridBg,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: T.tooltipBg,
      borderColor: T.border,
      textStyle: { color: T.tooltipText, fontSize: 12 },
      formatter: (params) => {
        const p = params[0]
        return `${p.axisValue}<br/>${volLabel}: ${formatVolume(p.value, lang)}`
      },
    },
    grid: { top: 8, bottom: 8, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
    },
    yAxis: {
      min: 0,  // bars must start at zero or volume differences look exaggerated
      splitLine: { lineStyle: { color: T.border, type: 'dashed' } },
      axisLabel: {
        color: T.text, fontSize: 9,
        formatter: (v) => formatVolume(v, lang),
      },
    },
    dataZoom: makeDataZoom(T, false),
    series: [{ name: volLabel, type: 'bar', data: volumes, barMaxWidth: 8 }],
  }
}

export function buildMACDOption(macdData) {
  const T = getChartTheme()

  const dates    = macdData.map((d) => d.date.slice(0, 10))
  const difData  = macdData.map((d) => d.dif)
  const deaData  = macdData.map((d) => d.dea)
  const histData = macdData.map((d) => ({
    value: d.macd,
    itemStyle: { color: (d.macd ?? 0) >= 0 ? T.macdUp : T.macdDown },
  }))

  return {
    backgroundColor: T.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: T.tooltipBg,
      borderColor: T.border,
      textStyle: { color: T.tooltipText, fontSize: 11 },
      formatter: (params) => {
        let html = `<div>${params[0]?.axisValue}</div>`
        params.forEach((p) => {
          const val = p.data?.value ?? p.data
          if (val != null)
            html += `<div style="color:${p.color}">${p.seriesName}: ${Number(val).toFixed(4)}</div>`
        })
        return html
      },
    },
    legend: {
      top: 2, left: 8,
      textStyle: { color: T.text, fontSize: 10 },
      itemWidth: 14, itemHeight: 6,
    },
    grid: { top: 24, bottom: 8, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: T.border, type: 'dashed' } },
      axisLabel: { color: T.text, fontSize: 9 },
    },
    dataZoom: makeDataZoom(T, false),
    series: [
      { name: 'MACD', type: 'bar',  data: histData, barMaxWidth: 6 },
      { name: 'DIF',  type: 'line', data: difData,  showSymbol: false, lineStyle: { width: 1.5, color: T.dif  }, itemStyle: { color: T.dif  } },
      { name: 'DEA',  type: 'line', data: deaData,  showSymbol: false, lineStyle: { width: 1.5, color: T.dea  }, itemStyle: { color: T.dea  } },
    ],
  }
}

export function buildRSIOption(rsiData) {
  const T = getChartTheme()

  const dates = rsiData.map((d) => d.date.slice(0, 10))

  return {
    backgroundColor: T.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: T.tooltipBg,
      borderColor: T.border,
      textStyle: { color: T.tooltipText, fontSize: 11 },
    },
    legend: {
      top: 2, left: 8,
      textStyle: { color: T.text, fontSize: 10 },
      itemWidth: 14, itemHeight: 6,
    },
    grid: { top: 24, bottom: 8, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: T.text, fontSize: 10 },
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
    },
    yAxis: {
      min: 0, max: 100,
      splitLine: { lineStyle: { color: T.border, type: 'dashed' } },
      axisLabel: { color: T.text, fontSize: 9 },
    },
    dataZoom: makeDataZoom(T, false),
    series: [
      {
        name: 'RSI6', type: 'line', data: rsiData.map((d) => d.rsi6),
        showSymbol: false,
        lineStyle: { width: 1.5, color: T.rsi6 }, itemStyle: { color: T.rsi6 },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: 'rgba(239,83,80,0.4)', type: 'dashed' },
          data: [{ yAxis: 70 }, { yAxis: 30 }],
          label: { color: T.text, fontSize: 9 },
        },
      },
      {
        name: 'RSI12', type: 'line', data: rsiData.map((d) => d.rsi12),
        showSymbol: false,
        lineStyle: { width: 1.5, color: T.rsi12 }, itemStyle: { color: T.rsi12 },
      },
      {
        name: 'RSI24', type: 'line', data: rsiData.map((d) => d.rsi24),
        showSymbol: false,
        lineStyle: { width: 1.5, color: T.rsi24 }, itemStyle: { color: T.rsi24 },
      },
    ],
  }
}

export function buildOverlayOption(symbolsData, lang = 'zh') {
  const T      = getChartTheme()
  const colors = ['#64b5f6', '#ef5350', '#66bb6a', '#ffca28']
  const allDates = [...new Set(
    symbolsData.flatMap((s) => s.candles.map((c) => c.date.slice(0, 10)))
  )].sort()

  const series = symbolsData.map((s, i) => {
    const candleMap = new Map(s.candles.map((c) => [c.date.slice(0, 10), c.close]))
    const firstDate = s.candles[0]?.date.slice(0, 10)
    const base = candleMap.get(firstDate) || 1
    return {
      name: `${s.symbol} ${s.name}`,
      type: 'line',
      data: allDates.map((d) => {
        const price = candleMap.get(d)
        return price != null ? ((price / base) * 100).toFixed(2) : null
      }),
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 2, color: colors[i % colors.length] },
      itemStyle: { color: colors[i % colors.length] },
    }
  })

  return {
    backgroundColor: T.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: T.tooltipBg,
      borderColor: T.border,
      textStyle: { color: T.tooltipText },
      formatter: (params) => {
        let html = `<div style="font-weight:bold">${params[0]?.axisValue}</div>`
        params.forEach((p) => {
          if (p.data != null)
            html += `<div style="color:${p.color}">${p.seriesName}: ${p.data}%</div>`
        })
        return html
      },
    },
    legend: { top: 8, textStyle: { color: T.text } },
    grid: { top: 48, bottom: 52, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: allDates,
      axisLabel: dateAxisLabel(T),
      axisLine: { lineStyle: { color: T.border } },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: T.border, type: 'dashed' } },
      axisLabel: { color: T.text, formatter: (v) => `${v}%` },
    },
    dataZoom: makeDataZoom(T),
    series,
  }
}
