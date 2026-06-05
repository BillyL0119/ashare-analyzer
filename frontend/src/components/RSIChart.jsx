import ReactECharts from 'echarts-for-react'
import useThemeStore from '../store/themeStore'
import { buildRSIOption } from '../utils/chartHelpers'

export default function RSIChart({ rsi, groupId }) {
  if (!rsi || rsi.length === 0) return null

  useThemeStore((s) => s.theme)
  const option = buildRSIOption(rsi)

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
