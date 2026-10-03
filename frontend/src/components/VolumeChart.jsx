import ReactECharts from '../lib/echarts'
import useLangStore from '../store/langStore'
import useThemeStore from '../store/themeStore'
import { buildVolumeOption } from '../utils/chartHelpers'

const US_UP = '#4caf50'
const US_DOWN = '#ef5350'

export default function VolumeChart({ candles, groupId, market = 'cn' }) {
  const lang = useLangStore((s) => s.lang)
  useThemeStore((s) => s.theme)
  if (!candles || candles.length === 0) return null

  const upColor = market === 'us' ? US_UP : undefined
  const downColor = market === 'us' ? US_DOWN : undefined
  const option = buildVolumeOption(candles, lang, upColor, downColor)

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
