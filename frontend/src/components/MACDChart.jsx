import ReactECharts from '../lib/echarts'
import useThemeStore from '../store/themeStore'
import { buildMACDOption } from '../utils/chartHelpers'

export default function MACDChart({ macd, groupId }) {
  useThemeStore((s) => s.theme)
  if (!macd || macd.length === 0) return null

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
