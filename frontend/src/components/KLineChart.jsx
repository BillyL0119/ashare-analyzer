import ReactECharts from 'echarts-for-react'
import useLangStore from '../store/langStore'
import { buildKLineOption } from '../utils/chartHelpers'

const US_UP = '#4caf50'
const US_DOWN = '#ef5350'

export default function KLineChart({ candles, ma, groupId, market = 'cn' }) {
  if (!candles || candles.length === 0) return null

  const lang = useLangStore((s) => s.lang)
  const upColor = market === 'us' ? US_UP : undefined
  const downColor = market === 'us' ? US_DOWN : undefined
  const option = buildKLineOption(candles, ma, lang, upColor, downColor)

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      group={groupId}
      notMerge={false}
      lazyUpdate={true}
    />
  )
}
