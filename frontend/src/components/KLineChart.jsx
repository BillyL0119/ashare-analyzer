import ReactECharts from 'echarts-for-react'
import useLangStore from '../store/langStore'
import { buildKLineOption } from '../utils/chartHelpers'

export default function KLineChart({ candles, ma, groupId }) {
  if (!candles || candles.length === 0) return null

  const lang = useLangStore((s) => s.lang)
  const option = buildKLineOption(candles, ma, lang)

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
