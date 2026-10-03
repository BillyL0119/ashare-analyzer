// Tree-shaken ECharts: register only the chart types and components the
// site uses, instead of pulling in the full ~1 MB `echarts` bundle.
// If a new chart type or option (e.g. `geo`, `heatmap`) is added, register it here.
import { forwardRef } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import {
  LineChart, BarChart, CandlestickChart, PieChart, GaugeChart,
  RadarChart, TreemapChart, ScatterChart,
} from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DataZoomComponent, MarkLineComponent, MarkPointComponent, MarkAreaComponent,
  VisualMapComponent, AxisPointerComponent, RadarComponent, GraphicComponent,
  DatasetComponent, PolarComponent, TransformComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart, BarChart, CandlestickChart, PieChart, GaugeChart,
  RadarChart, TreemapChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DataZoomComponent, MarkLineComponent, MarkPointComponent, MarkAreaComponent,
  VisualMapComponent, AxisPointerComponent, RadarComponent, GraphicComponent,
  DatasetComponent, PolarComponent, TransformComponent,
  LabelLayout, UniversalTransition, CanvasRenderer,
])

const ReactECharts = forwardRef(function ReactECharts(props, ref) {
  return <ReactEChartsCore ref={ref} echarts={echarts} {...props} />
})

export default ReactECharts
