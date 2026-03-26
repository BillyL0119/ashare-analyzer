// Shared dark theme colors
export const THEME = {
  bg: '#0d1117',
  gridBg: '#161b22',
  text: '#c9d1d9',
  border: '#30363d',
  up: '#ef5350',
  down: '#26a69a',
  ma5: '#f0e68c',
  ma10: '#64b5f6',
  ma20: '#ff9800',
  ma60: '#ab47bc',
  dif: '#ffffff',
  dea: '#ff9800',
  macdUp: '#ef5350',
  macdDown: '#26a69a',
  rsi6: '#64b5f6',
  rsi12: '#ff9800',
  rsi24: '#ab47bc',
  volume: '#42a5f5',
}

const sharedDataZoom = [
  {
    type: 'inside',
    xAxisIndex: [0],
    start: 60,
    end: 100,
    zoomOnMouseWheel: true,
  },
  {
    type: 'slider',
    xAxisIndex: [0],
    start: 60,
    end: 100,
    height: 20,
    bottom: 0,
    borderColor: THEME.border,
    textStyle: { color: THEME.text },
    fillerColor: 'rgba(100,181,246,0.1)',
    handleStyle: { color: THEME.text },
  },
]

export function buildKLineOption(candles, maData, lang = 'zh', upColor = THEME.up, downColor = THEME.down) {
  const dates = candles.map((c) => c.date.slice(0, 10))
  const ohlc = candles.map((c) => [c.open, c.close, c.low, c.high])

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
      { key: 'ma5', color: THEME.ma5, label: 'MA5' },
      { key: 'ma10', color: THEME.ma10, label: 'MA10' },
      { key: 'ma20', color: THEME.ma20, label: 'MA20' },
      { key: 'ma60', color: THEME.ma60, label: 'MA60' },
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
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 12 },
      formatter: (params) => {
        const kline = params.find((p) => p.seriesName === labels.kline)
        if (!kline) return ''
        const [o, c, l, h] = kline.data
        const date = kline.axisValue
        const pct = candles[kline.dataIndex]?.pct_change ?? 0
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
      top: 4,
      left: 8,
      textStyle: { color: THEME.text, fontSize: 11 },
      itemWidth: 16,
      itemHeight: 8,
    },
    grid: { top: 36, bottom: 36, left: 64, right: 12, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: THEME.text, fontSize: 10 },
      axisLine: { lineStyle: { color: THEME.border } },
      splitLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: { color: THEME.text, fontSize: 10 },
    },
    dataZoom: sharedDataZoom,
    series,
  }
}

export function buildVolumeOption(candles, lang = 'zh', upColor = THEME.up, downColor = THEME.down) {
  const dates = candles.map((c) => c.date.slice(0, 10))
  const volLabel = lang === 'en' ? 'Volume' : '成交量'
  const volumes = candles.map((c) => ({
    value: c.volume,
    itemStyle: {
      color: c.close >= c.open ? upColor : downColor,
      opacity: 0.8,
    },
  }))

  return {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 12 },
      formatter: (params) => {
        const p = params[0]
        return `${p.axisValue}<br/>${volLabel}: ${(p.value / 100000000).toFixed(2)}${lang === 'en' ? 'B' : '亿'}`
      },
    },
    grid: { top: 8, bottom: 36, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: THEME.border } },
      axisTick: { show: false },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: {
        color: THEME.text,
        fontSize: 9,
        formatter: (v) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}${lang === 'en' ? 'B' : '亿'}` : `${(v / 1e4).toFixed(0)}${lang === 'en' ? 'W' : '万'}`),
      },
    },
    dataZoom: sharedDataZoom,
    series: [
      {
        name: volLabel,
        type: 'bar',
        data: volumes,
        barMaxWidth: 8,
      },
    ],
  }
}

export function buildMACDOption(macdData) {
  const dates = macdData.map((d) => d.date.slice(0, 10))
  const difData = macdData.map((d) => d.dif)
  const deaData = macdData.map((d) => d.dea)
  const histData = macdData.map((d) => ({
    value: d.macd,
    itemStyle: { color: (d.macd ?? 0) >= 0 ? THEME.macdUp : THEME.macdDown },
  }))

  return {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 11 },
      formatter: (params) => {
        let html = `<div>${params[0]?.axisValue}</div>`
        params.forEach((p) => {
          if (p.data?.value != null || p.data != null) {
            const val = p.data?.value ?? p.data
            if (val != null)
              html += `<div style="color:${p.color}">${p.seriesName}: ${Number(val).toFixed(4)}</div>`
          }
        })
        return html
      },
    },
    legend: {
      top: 2,
      left: 8,
      textStyle: { color: THEME.text, fontSize: 10 },
      itemWidth: 14,
      itemHeight: 6,
    },
    grid: { top: 24, bottom: 36, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: THEME.border } },
      axisTick: { show: false },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: { color: THEME.text, fontSize: 9 },
    },
    dataZoom: sharedDataZoom,
    series: [
      {
        name: 'MACD',
        type: 'bar',
        data: histData,
        barMaxWidth: 6,
      },
      {
        name: 'DIF',
        type: 'line',
        data: difData,
        showSymbol: false,
        lineStyle: { width: 1.5, color: THEME.dif },
        itemStyle: { color: THEME.dif },
      },
      {
        name: 'DEA',
        type: 'line',
        data: deaData,
        showSymbol: false,
        lineStyle: { width: 1.5, color: THEME.dea },
        itemStyle: { color: THEME.dea },
      },
    ],
  }
}

export function buildRSIOption(rsiData) {
  const dates = rsiData.map((d) => d.date.slice(0, 10))

  return {
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text, fontSize: 11 },
    },
    legend: {
      top: 2,
      left: 8,
      textStyle: { color: THEME.text, fontSize: 10 },
      itemWidth: 14,
      itemHeight: 6,
    },
    grid: { top: 24, bottom: 36, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: THEME.text, fontSize: 10 },
      axisLine: { lineStyle: { color: THEME.border } },
      axisTick: { show: false },
    },
    yAxis: {
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: { color: THEME.text, fontSize: 9 },
    },
    dataZoom: sharedDataZoom,
    series: [
      {
        name: 'RSI6',
        type: 'line',
        data: rsiData.map((d) => d.rsi6),
        showSymbol: false,
        lineStyle: { width: 1.5, color: THEME.rsi6 },
        itemStyle: { color: THEME.rsi6 },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: 'rgba(239,83,80,0.4)', type: 'dashed' },
          data: [{ yAxis: 70 }, { yAxis: 30 }],
          label: { color: THEME.text, fontSize: 9 },
        },
      },
      {
        name: 'RSI12',
        type: 'line',
        data: rsiData.map((d) => d.rsi12),
        showSymbol: false,
        lineStyle: { width: 1.5, color: THEME.rsi12 },
        itemStyle: { color: THEME.rsi12 },
      },
      {
        name: 'RSI24',
        type: 'line',
        data: rsiData.map((d) => d.rsi24),
        showSymbol: false,
        lineStyle: { width: 1.5, color: THEME.rsi24 },
        itemStyle: { color: THEME.rsi24 },
      },
    ],
  }
}

export function buildOverlayOption(symbolsData, lang = 'zh') {
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
    backgroundColor: THEME.gridBg,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,17,23,0.9)',
      borderColor: THEME.border,
      textStyle: { color: THEME.text },
      formatter: (params) => {
        let html = `<div style="font-weight:bold">${params[0]?.axisValue}</div>`
        params.forEach((p) => {
          if (p.data != null)
            html += `<div style="color:${p.color}">${p.seriesName}: ${p.data}%</div>`
        })
        return html
      },
    },
    legend: {
      top: 8,
      textStyle: { color: THEME.text },
    },
    grid: { top: 48, bottom: 36, left: 64, right: 12 },
    xAxis: {
      type: 'category',
      data: allDates,
      axisLabel: { color: THEME.text, fontSize: 10 },
      axisLine: { lineStyle: { color: THEME.border } },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } },
      axisLabel: {
        color: THEME.text,
        formatter: (v) => `${v}%`,
      },
    },
    dataZoom: sharedDataZoom,
    series,
  }
}
