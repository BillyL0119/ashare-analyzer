import ReactECharts from 'echarts-for-react'
import useThemeStore from '../store/themeStore'
import { buildMACDOption } from '../utils/chartHelpers'

export default function MACDChart({ macd, groupId }) {
  if (!macd || macd.length === 0) return null

  useThemeStore((s) => s.theme)
  const option = buildMACDOption(macd)

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
