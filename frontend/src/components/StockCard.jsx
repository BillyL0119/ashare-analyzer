import { delayNote } from '../utils/quoteDelay'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Fixed bar heights to avoid Math.random() re-renders
const SK_KLINE = [45,62,38,71,55,48,66,42,78,52,60,35,70,58,44,68,51,74,40,63]
const SK_VOL   = [30,55,25,80,45,35,60,28,70,40,52,22,65,48,32,62,38,72,28,55]
import * as echarts from 'echarts/core'
import { useStockData } from '../hooks/useStockData'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import useWatchlistStore from '../store/watchlistStore'
import { T } from '../i18n/translations'
import KLineChart from './KLineChart'
import KLineSelectionWrapper from './KLineSelectionWrapper'
import VolumeChart from './VolumeChart'
import MACDChart from './MACDChart'
import RSIChart from './RSIChart'
import { THEME } from '../utils/chartHelpers'
import useThemeStore from '../store/themeStore'
import { useMobile } from '../hooks/useMobile'
import KLineTip from './KLineTip'
import { CUR, localName } from '../utils/markets'
import Icon from './Icon'
import './stockCard.css'

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
  const nav = useNavigate()

  const { data, loading, error, quote, refetch } = useStockData(code, {
    period,
    startDate,
    endDate,
    adjust,
    market,
  })

  const [showKLineTip, setShowKLineTip] = useState(false)
  const [copied, setCopied] = useState(false)

  const groupId = `group_${code}`
  useEffect(() => {
    echarts.connect(groupId)
  }, [groupId])

  // Opened from a URL the stock only knows its code; fall back to the name the data endpoint returns.
  // HK / Japan quotes carry every name variant: show the one for the reader's language
  const intlName = (market === 'hk' || market === 'jp') && quote ? localName(quote, lang, market) : ''
  const displayName = [intlName, name, data?.name, quote?.name].find((n) => n && n !== code) || ''

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
      }}
    >
      {/* Header: the company and its price on the left, chart controls and actions on the right.
          One primary action (paper trade); everything else is quiet. Styles in stockCard.css */}
      <div className={`sc-head${isMobile ? ' is-mobile' : ''}`}>
        <div className="sc-id">
          <span className="sc-name">{displayName || code}</span>
          {displayName && <span className="sc-code">{code}</span>}
        </div>

        {quote && (
          <div className="sc-price">
            <span className="sc-p">{market !== 'cn' ? CUR[market] : ''}{quote.price.toFixed(2)}</span>
            <span className="sc-c" style={{ color: priceColor }}>{priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(2)}%</span>
            {delayNote(market, lang) && <span className="sc-delay">{delayNote(market, lang)}</span>}
          </div>
        )}

        <div className="sc-tools">
          <div className="sc-seg" role="group" aria-label={t.periodDaily}>
            {Object.entries(periodLabels).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}>{label}</button>
            ))}
          </div>

          {market === 'cn' && (
            <div className="sc-seg" role="group">
              {Object.entries(adjustLabels).map(([key, label]) => (
                <button key={key || 'none'} type="button" aria-pressed={adjust === key} onClick={() => setAdjust(key)}>{label}</button>
              ))}
            </div>
          )}

          {/* How to read a candlestick chart */}
          <button type="button" className="sc-ghost" onClick={() => setShowKLineTip(true)} title={t.klineLearn}>
            <Icon name="book" size={14} />{t.klineBtn}
          </button>

          <button type="button" className="sc-ghost" onClick={() => window.open(`/api/export/pdf/${code}`, '_blank')} title={t.exportTooltip}>
            {t.exportBtn}
          </button>

          <button type="button" className={`sc-icon${inWatchlist ? ' is-on' : ''}`}
            onClick={() => inWatchlist ? wlRemove(code) : wlAdd({ ...stock, market })}
            title={inWatchlist ? t.watchRemove : t.watchAdd} aria-label={inWatchlist ? t.watchRemove : t.watchAdd} aria-pressed={inWatchlist}>
            {inWatchlist ? '★' : '☆'}
          </button>

          <button type="button" className="sc-icon" title={t.copyLink} aria-label={t.copyLink}
            onClick={async () => {
              const url = `${window.location.origin}/stock/${market}/${code}`
              await navigator.clipboard.writeText(url).catch(() => {})
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}>
            {copied ? <Icon name="check" size={15} /> : <Icon name="link" size={15} />}
          </button>

          {/* Practise with this stock in paper trading (order form opens filled in) */}
          <button type="button" className="sc-primary" title={t.paperTradeHint}
            onClick={() => nav(`/paper?buy=${encodeURIComponent(code)}&market=${market}`)}>
            {t.paperTradeBtn}
          </button>

          <button type="button" className="sc-icon" onClick={() => removeSymbol(code)} title={t.remove} aria-label={t.remove}>
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>×</span>
          </button>
        </div>
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
            <div style={{ color: 'var(--red-bright)', fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
              {market !== 'cn'
                ? (String(error).includes('API_LIMIT') || String(error).includes('limit')
                    ? t.apiLimitMsg
                    : t.apiErrorMsg)
                : error}
            </div>
            {market !== 'cn' && (
              <button
                onClick={refetch}
                style={{
                  padding: '5px 18px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: '#4f86f7',
                  color: '#fff',
                }}
              >
                {t.retry}
              </button>
            )}
          </div>
        )}
        {data && !loading && (
          <>
            <KLineSelectionWrapper
              candles={data.candles}
              ma={data.ma}
              groupId={groupId}
              market={market}
              code={code}
              name={name}
              lang={lang}
              isMobile={isMobile}
            />
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
        <KLineTip zh={lang === 'zh'} lang={lang} onClose={() => setShowKLineTip(false)} />
      )}
    </div>
  )
}
