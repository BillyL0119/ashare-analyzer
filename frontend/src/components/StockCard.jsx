import { useEffect, useState } from 'react'

// Fixed bar heights to avoid Math.random() re-renders
const SK_KLINE = [45,62,38,71,55,48,66,42,78,52,60,35,70,58,44,68,51,74,40,63]
const SK_VOL   = [30,55,25,80,45,35,60,28,70,40,52,22,65,48,32,62,38,72,28,55]
import * as echarts from 'echarts'
import { useStockData } from '../hooks/useStockData'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import useWatchlistStore from '../store/watchlistStore'
import { T } from '../i18n/translations'
import KLineChart from './KLineChart'
import VolumeChart from './VolumeChart'
import MACDChart from './MACDChart'
import RSIChart from './RSIChart'
import { THEME } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'
import { useMobile } from '../hooks/useMobile'
import KLineTip from './KLineTip'

export default function StockCard({ stock }) {
  useThemeStore((s) => s.theme) // re-render on theme toggle
  const { code, name } = stock
  const { period, startDate, endDate, adjust, removeSymbol, setPeriod, setAdjust, market } =
    useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const { add: wlAdd, remove: wlRemove, has: wlHas } = useWatchlistStore()
  const inWatchlist = wlHas(code)
  const t = T[lang]
  const isMobile = useMobile()

  const { data, loading, error, quote, refetch } = useStockData(code, {
    period,
    startDate,
    endDate,
    adjust,
    market,
  })

  const [showKLineTip, setShowKLineTip] = useState(false)

  const groupId = `group_${code}`
  useEffect(() => {
    echarts.connect(groupId)
  }, [groupId])

  const priceDelta = quote?.pct_change ?? 0
  const priceColor = priceDelta >= 0 ? THEME.up : THEME.down

  const periodLabels = {
    daily: t.periodDaily,
    weekly: t.periodWeekly,
    monthly: t.periodMonthly,
  }
  const adjustLabels = {
    qfq: t.adjFwd,
    hfq: t.adjBack,
    '': t.adjNone,
  }

  return (
    <div
      style={{
        background: THEME.gridBg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#2a4a7f'
        e.currentTarget.style.boxShadow = '0 0 20px rgba(14,165,233,0.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = THEME.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          paddingLeft: 12,
          borderBottom: `1px solid ${THEME.border}`,
          borderLeft: '3px solid #0ea5e9',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 12,
          flexShrink: 0,
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: '#64b5f6', fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>
            {code}
          </span>
          <span style={{ color: THEME.text, fontSize: 14 }}>{name}</span>
        </div>

        {quote && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ color: priceColor, fontSize: 18, fontWeight: 700 }}>
              {market === 'us' ? '$' : ''}{quote.price.toFixed(2)}
            </span>
            <span style={{ color: priceColor, fontSize: 13 }}>
              {priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(2)}%
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
          {/* K-line education button — placed right next to period selector */}
          <button
            onClick={() => setShowKLineTip(true)}
            title={lang === 'zh' ? '学习K线图基础知识' : 'Learn candlestick basics'}
            style={{
              padding: '3px 9px',
              borderRadius: 4,
              border: '1px solid rgba(138,180,248,0.35)',
              cursor: 'pointer',
              fontSize: 11,
              background: 'rgba(138,180,248,0.08)',
              color: '#8ab4f8',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.2)'; e.currentTarget.style.borderColor = '#8ab4f8' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.08)'; e.currentTarget.style.borderColor = 'rgba(138,180,248,0.35)' }}
          >
            📖 {lang === 'zh' ? 'K线教学' : 'Learn'}
          </button>

          {Object.entries(periodLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                background: period === key ? 'linear-gradient(135deg, #8ab4f8, #c084fc)' : 'rgba(255,255,255,0.06)',
                color: period === key ? '#fff' : THEME.text,
                transition: 'background 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {market !== 'us' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {Object.entries(adjustLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAdjust(key)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  background: adjust === key ? 'linear-gradient(135deg, #8ab4f8, #c084fc)' : 'rgba(255,255,255,0.06)',
                  color: adjust === key ? '#fff' : THEME.text,
                  transition: 'background 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Export PDF */}
        <button
          onClick={() => window.open(`/api/export/pdf/${code}`, '_blank')}
          title={lang === 'zh' ? '导出PDF报告' : 'Export PDF Report'}
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid rgba(138,180,248,0.18)',
            cursor: 'pointer',
            fontSize: 11,
            background: 'transparent',
            color: 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,180,248,0.12)'; e.currentTarget.style.color = '#8ab4f8' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          {lang === 'zh' ? '导出报告' : 'Export PDF'}
        </button>

        {/* Watchlist star */}
        <button
          onClick={() => inWatchlist ? wlRemove(code) : wlAdd(stock)}
          title={inWatchlist ? (lang === 'zh' ? '移出收藏' : 'Remove from watchlist') : (lang === 'zh' ? '加入收藏' : 'Add to watchlist')}
          style={{
            padding: '3px 6px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            background: 'transparent',
            color: inWatchlist ? '#f6c90e' : 'var(--text-muted)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f6c90e' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = inWatchlist ? '#f6c90e' : 'var(--text-muted)' }}
        >
          {inWatchlist ? '★' : '☆'}
        </button>

        <button
          onClick={() => removeSymbol(code)}
          style={{
            padding: '3px 10px',
            borderRadius: 4,
            border: `1px solid ${THEME.border}`,
            cursor: 'pointer',
            fontSize: 12,
            background: 'transparent',
            color: 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,83,80,0.15)'
            e.currentTarget.style.color = '#ef5350'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {t.remove}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div className="skeleton-appear" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* K-line skeleton */}
            <div style={{ height: isMobile ? 300 : 360, padding: '12px 8px 8px', display: 'flex', alignItems: 'flex-end', gap: 2 }}>
              {SK_KLINE.map((h, i) => (
                <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: 2 }} />
              ))}
            </div>
            {/* Volume skeleton */}
            <div style={{ height: isMobile ? 80 : 120, borderTop: `1px solid ${THEME.border}`, padding: '8px 8px 4px', display: 'flex', alignItems: 'flex-end', gap: 2 }}>
              {SK_VOL.map((h, i) => (
                <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: 2, opacity: 0.7 }} />
              ))}
            </div>
            {/* MACD skeleton */}
            <div style={{ height: isMobile ? 80 : 120, borderTop: `1px solid ${THEME.border}`, padding: '20px 12px' }}>
              <div className="skeleton" style={{ height: '35%', borderRadius: 3 }} />
            </div>
            {/* RSI skeleton */}
            <div style={{ height: isMobile ? 80 : 120, borderTop: `1px solid ${THEME.border}`, padding: '20px 12px' }}>
              <div className="skeleton" style={{ height: '35%', borderRadius: 3 }} />
            </div>
          </div>
        )}
        {error && (
          <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ color: '#f85149', fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
              {market === 'us'
                ? (String(error).includes('API_LIMIT') || String(error).includes('limit')
                    ? (lang === 'zh' ? '今日数据请求已达上限，显示缓存数据' : 'Daily data limit reached. Cached data shown where available.')
                    : (lang === 'zh' ? '数据加载失败，请重试' : 'Unable to load data. Please try again.'))
                : error}
            </div>
            {market === 'us' && (
              <button
                onClick={refetch}
                style={{
                  padding: '5px 18px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: 'linear-gradient(135deg, #8ab4f8, #c084fc)',
                  color: '#fff',
                }}
              >
                {lang === 'zh' ? '重试' : 'Retry'}
              </button>
            )}
          </div>
        )}
        {data && !loading && (
          <>
            <div style={{ height: isMobile ? 300 : 360 }}>
              <KLineChart candles={data.candles} ma={data.ma} groupId={groupId} market={market} />
            </div>
            <div style={{ height: isMobile ? 80 : 120, borderTop: `1px solid ${THEME.border}` }}>
              <VolumeChart candles={data.candles} groupId={groupId} market={market} />
            </div>
            <div style={{ height: isMobile ? 80 : 120, borderTop: `1px solid ${THEME.border}` }}>
              <MACDChart macd={data.macd} groupId={groupId} />
            </div>
            <div style={{ height: isMobile ? 80 : 120, borderTop: `1px solid ${THEME.border}` }}>
              <RSIChart rsi={data.rsi} groupId={groupId} />
            </div>
          </>
        )}
      </div>

      {showKLineTip && (
        <KLineTip zh={lang === 'zh'} onClose={() => setShowKLineTip(false)} />
      )}
    </div>
  )
}
