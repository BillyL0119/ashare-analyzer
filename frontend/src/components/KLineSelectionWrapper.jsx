/**
 * KLineSelectionWrapper
 *
 * Wraps a KLineChart with a drag-to-select overlay.
 * When the user drags a region:
 *   1. A blue highlight rectangle is shown during drag.
 *   2. On mouse-up, pixel coordinates are converted to data indices via
 *      ECharts' convertFromPixel(), then mapped to actual dates.
 *   3. Quick stats (return, high, low, amplitude, volatility) are computed
 *      locally from the candles slice — no API call needed.
 *   4. A KLineSegmentPanel appears below the chart letting the user trigger
 *      full AI analysis (backend call).
 *
 * Usage:
 *   <KLineSelectionWrapper
 *     candles={data.candles} ma={data.ma}
 *     groupId={groupId} market={market}
 *     code={code} name={name} lang={lang} isMobile={isMobile}
 *   />
 */
import { useRef, useState, useCallback } from 'react'
import KLineChart from './KLineChart'
import KLineSegmentPanel from './KLineSegmentPanel'
import useThemeStore from '../store/themeStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function computePreviewStats(candles, startIdx, endIdx) {
  const slice = candles.slice(startIdx, endIdx + 1)
  if (slice.length < 2) return null

  const opens  = slice.map((c) => c.open)
  const closes = slice.map((c) => c.close)
  const highs  = slice.map((c) => c.high)
  const lows   = slice.map((c) => c.low)

  const period_return = (closes[closes.length - 1] - opens[0]) / opens[0] * 100
  const high          = Math.max(...highs)
  const low           = Math.min(...lows)
  const amplitude     = (high - low) / opens[0] * 100

  const rets = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])
  let volatility = 0
  if (rets.length >= 2) {
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length
    volatility = Math.sqrt(variance) * Math.sqrt(252) * 100
  }

  return {
    bars: slice.length,
    period_return,
    high,
    low,
    amplitude,
    volatility,
  }
}

// Convert a pixel x coordinate to a candle index using ECharts convertFromPixel.
// Returns null if it cannot be determined.
function pixelToIndex(chart, x, candleCount) {
  if (!chart) return null
  try {
    const val = chart.convertFromPixel({ xAxisIndex: 0 }, x)
    if (val == null || (typeof val !== 'number' && typeof val !== 'string')) return null
    const idx = typeof val === 'number' ? Math.round(val) : parseInt(val, 10)
    if (isNaN(idx)) return null
    return Math.max(0, Math.min(idx, candleCount - 1))
  } catch {
    return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KLineSelectionWrapper({ candles, ma, groupId, market, code, name, lang, isMobile }) {
  useThemeStore((s) => s.theme)
  const zh = lang !== 'en'

  const klineRef     = useRef(null)   // ReactECharts instance
  const containerRef = useRef(null)   // div wrapping the chart

  // Selection state
  const [selectMode,    setSelectMode]    = useState(false)
  const [dragging,      setDragging]      = useState(false)
  const [dragStartX,    setDragStartX]    = useState(null)
  const [dragCurrentX,  setDragCurrentX]  = useState(null)
  const [selectedRange, setSelectedRange] = useState(null) // {startDate, endDate, previewStats}

  const chartHeight = isMobile ? 300 : 360

  // ── Mode toggle ─────────────────────────────────────────────────────────────
  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev)
    setDragging(false)
    setDragStartX(null)
    setDragCurrentX(null)
    setSelectedRange(null)
  }

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    setDragging(true)
    setDragStartX(x)
    setDragCurrentX(x)
    setSelectedRange(null)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDragCurrentX(e.clientX - rect.left)
  }, [dragging])

  const handleMouseUp = useCallback((e) => {
    if (!dragging) return
    setDragging(false)

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x2 = e.clientX - rect.left
    const x1 = dragStartX

    // Need at least a few pixels of drag
    if (Math.abs(x2 - x1) < 8) {
      setDragStartX(null)
      setDragCurrentX(null)
      return
    }

    const chart = klineRef.current?.getEchartsInstance?.()
    const idx1 = pixelToIndex(chart, Math.min(x1, x2), candles.length)
    const idx2 = pixelToIndex(chart, Math.max(x1, x2), candles.length)

    if (idx1 == null || idx2 == null || idx2 - idx1 < 2) {
      setDragStartX(null)
      setDragCurrentX(null)
      return
    }

    const startDate  = candles[idx1]?.date?.slice(0, 10)
    const endDate    = candles[idx2]?.date?.slice(0, 10)
    const preview    = computePreviewStats(candles, idx1, idx2)

    if (!startDate || !endDate || !preview) {
      setDragStartX(null)
      setDragCurrentX(null)
      return
    }

    setSelectedRange({ startDate, endDate, previewStats: preview })
  }, [dragging, dragStartX, candles])

  const handleMouseLeave = useCallback((e) => {
    if (dragging) handleMouseUp(e)
  }, [dragging, handleMouseUp])

  // ── Rendered selection box ──────────────────────────────────────────────────
  const selBoxStyle = (() => {
    if (dragStartX == null || dragCurrentX == null) return null
    const left  = Math.min(dragStartX, dragCurrentX)
    const width = Math.abs(dragCurrentX - dragStartX)
    if (width < 2) return null
    return { left, width }
  })()

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Chart area with optional overlay */}
      <div ref={containerRef} style={{ height: chartHeight, position: 'relative' }}>
        <KLineChart
          ref={klineRef}
          candles={candles}
          ma={ma}
          groupId={groupId}
          market={market}
        />

        {/* Drag-selection overlay — only active in selectMode */}
        {selectMode && (
          <div
            style={{
              position: 'absolute', inset: 0,
              cursor: 'crosshair',
              userSelect: 'none',
              zIndex: 10,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* Selection rectangle during drag */}
            {selBoxStyle && (
              <div style={{
                position: 'absolute',
                top: 0, bottom: 0,
                left: selBoxStyle.left,
                width: selBoxStyle.width,
                background: 'rgba(100,181,246,0.15)',
                borderLeft:  '2px solid rgba(100,181,246,0.75)',
                borderRight: '2px solid rgba(100,181,246,0.75)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Confirmed selection shading (persists after mouse up) */}
            {!dragging && selectedRange && (() => {
              // Re-derive pixel bounds from the confirmed dates for the shading bar
              const chart = klineRef.current?.getEchartsInstance?.()
              if (!chart) return null
              try {
                const dates = candles.map((c) => c.date.slice(0, 10))
                const i1    = dates.indexOf(selectedRange.startDate)
                const i2    = dates.indexOf(selectedRange.endDate)
                if (i1 < 0 || i2 < 0) return null
                const px1 = chart.convertToPixel({ xAxisIndex: 0 }, i1)
                const px2 = chart.convertToPixel({ xAxisIndex: 0 }, i2)
                if (px1 == null || px2 == null) return null
                return (
                  <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: Math.min(px1, px2),
                    width: Math.abs(px2 - px1),
                    background: 'rgba(100,181,246,0.10)',
                    borderLeft:  '2px solid rgba(100,181,246,0.6)',
                    borderRight: '2px solid rgba(100,181,246,0.6)',
                    pointerEvents: 'none',
                  }} />
                )
              } catch {
                return null
              }
            })()}
          </div>
        )}

        {/* Floating toggle button — top-right of chart */}
        <button
          onClick={toggleSelectMode}
          style={{
            position: 'absolute', top: 5, right: 8, zIndex: 20,
            padding: '3px 9px', borderRadius: 4, border: 'none',
            cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: selectMode
              ? 'rgba(239,83,80,0.18)'
              : 'rgba(138,180,248,0.12)',
            color: selectMode ? '#ef5350' : '#8ab4f8',
            transition: 'all 0.15s',
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = selectMode
              ? 'rgba(239,83,80,0.3)'
              : 'rgba(138,180,248,0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = selectMode
              ? 'rgba(239,83,80,0.18)'
              : 'rgba(138,180,248,0.12)'
          }}
          title={selectMode
            ? (zh ? '退出框选模式' : 'Exit selection mode')
            : (zh ? '拖拽框选K线区间进行AI解读' : 'Drag to select a K-line range for AI analysis')}
        >
          {selectMode
            ? (zh ? '× 取消框选' : '× Cancel')
            : (zh ? '框选分析' : 'Select range')}
        </button>
      </div>

      {/* Segment analysis panel — shown when a range has been confirmed */}
      {selectedRange && (
        <KLineSegmentPanel
          symbol={code}
          name={name}
          market={market}
          startDate={selectedRange.startDate}
          endDate={selectedRange.endDate}
          previewStats={selectedRange.previewStats}
          onClose={() => {
            setSelectedRange(null)
            setDragStartX(null)
            setDragCurrentX(null)
          }}
          lang={lang}
        />
      )}
    </div>
  )
}
