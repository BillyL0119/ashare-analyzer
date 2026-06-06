import { useEffect } from 'react'

const MUTED  = 'var(--text-muted)'
const GREEN  = '#34d399'
const RED    = '#ef4444'
const BLUE   = '#8ab4f8'
const YELLOW = '#f59e0b'
const BDR    = 'rgba(138,180,248,0.12)'

// ─── Tiny candle SVG helper ───────────────────────────────────────────────────
// open, close, high, low are y-coords in a 70px-tall canvas
function TinyCandle({ cx, w, open, close, high, low }) {
  const bullish = close < open
  const stroke  = bullish ? GREEN : RED
  const fill    = bullish ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'
  const bTop    = Math.min(open, close)
  const bH      = Math.max(Math.abs(close - open), 2)
  const bw      = w * 0.6
  return (
    <g>
      <line x1={cx} y1={high} x2={cx} y2={low} stroke={stroke} strokeWidth={1.5} />
      <rect x={cx - bw/2} y={bTop} width={bw} height={bH}
        fill={fill} stroke={stroke} strokeWidth={1.5} rx={1} />
    </g>
  )
}

// ─── Anatomy mini-SVG ────────────────────────────────────────────────────────
function AnatomyMini() {
  // Bullish candle: cx=32, width=200, height=110
  const cx = 32, bw = 22
  const HY = 8, CY = 28, OY = 75, LY = 100

  return (
    <svg width={210} height={110} style={{ overflow: 'visible', userSelect: 'none' }}>
      {/* Upper wick */}
      <line x1={cx} y1={HY} x2={cx} y2={CY} stroke={BLUE} strokeWidth={1.5} />
      <line x1={cx-4} y1={HY} x2={cx+4} y2={HY} stroke={YELLOW} strokeWidth={1.5} />

      {/* Body */}
      <rect x={cx - bw/2} y={CY} width={bw} height={OY - CY}
        fill="rgba(52,211,153,0.15)" stroke={GREEN} strokeWidth={1.5} rx={2} />

      {/* Lower wick */}
      <line x1={cx} y1={OY} x2={cx} y2={LY} stroke={BLUE} strokeWidth={1.5} />
      <line x1={cx-4} y1={LY} x2={cx+4} y2={LY} stroke={YELLOW} strokeWidth={1.5} />

      {/* Labels */}
      {[
        { y: HY,                   text: '最高价 High',         color: YELLOW  },
        { y: (HY + CY) / 2,        text: '上影线 Upper Wick',   color: BLUE    },
        { y: CY,                   text: '收盘价 Close',         color: GREEN   },
        { y: (CY + OY) / 2,        text: '实体 Body',           color: GREEN   },
        { y: OY,                   text: '开盘价 Open',          color: MUTED   },
        { y: (OY + LY) / 2,        text: '下影线 Lower Wick',   color: BLUE    },
        { y: LY,                   text: '最低价 Low',           color: YELLOW  },
      ].map(({ y, text, color }) => (
        <g key={text}>
          <line x1={cx + bw/2 + 1} y1={y} x2={cx + bw/2 + 16} y2={y}
            stroke="#333" strokeWidth={1} strokeDasharray="2,2" />
          <text x={cx + bw/2 + 20} y={y + 4} fill={color} fontSize={10}>{text}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Pattern quick-ref data ──────────────────────────────────────────────────
// Each candle: cx, w, open, close, high, low (y-coords in 70px canvas)
const PATTERNS = [
  {
    name_zh: '大阳线',     name_en: 'Marubozu↑',
    tip_zh: '全天上涨，无影线',  tip_en: 'Bulls all day, no wicks',
    signal: 'bull',
    candles: [{ cx: 20, w: 28, open: 60, close: 10, high: 10, low: 60 }],
  },
  {
    name_zh: '十字星',     name_en: 'Doji',
    tip_zh: '多空均衡，可能反转', tip_en: 'Indecision, watch for reversal',
    signal: 'neutral',
    candles: [{ cx: 20, w: 28, open: 35, close: 35, high: 10, low: 60 }],
  },
  {
    name_zh: '锤子线',     name_en: 'Hammer',
    tip_zh: '下跌末期，看涨反转', tip_en: 'Bottom reversal signal',
    signal: 'bull',
    candles: [{ cx: 20, w: 28, open: 28, close: 18, high: 15, low: 65 }],
  },
  {
    name_zh: '射击之星',   name_en: 'Shooting Star',
    tip_zh: '上涨末期，看跌反转', tip_en: 'Top reversal signal',
    signal: 'bear',
    candles: [{ cx: 20, w: 28, open: 52, close: 62, high: 8, low: 66 }],
  },
  {
    name_zh: '吞噬形态',   name_en: 'Engulfing',
    tip_zh: '第二根完全吞噬第一根', tip_en: '2nd candle engulfs the 1st',
    signal: 'reversal',
    candles: [
      { cx: 12, w: 18, open: 38, close: 48, high: 34, low: 52 },
      { cx: 32, w: 18, open: 55, close: 28, high: 24, low: 59 },
    ],
  },
]

const SIG_COLOR = { bull: GREEN, bear: RED, neutral: MUTED, reversal: BLUE }

export default function KLineTip({ zh, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1201,
        width: 'min(480px, 95vw)',
        maxHeight: '85vh',
        overflowY: 'auto',
        background: '#10141f',
        border: `1px solid ${BDR}`,
        borderRadius: 14,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        padding: '18px 20px 24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              {zh ? '📐 K线图速查' : '📐 Candlestick Quick Ref'}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
              {zh ? '悬停或点击学习中心查看完整教程' : 'Visit Study Center for the full interactive lesson'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 18, color: MUTED, padding: '2px 6px', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Anatomy */}
        <div style={{
          background: 'rgba(255,255,255,0.025)', border: `1px solid ${BDR}`,
          borderRadius: 10, padding: '12px 14px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {zh ? 'K线结构（阳线）' : 'Candlestick Anatomy (Bullish)'}
          </div>
          <AnatomyMini />
        </div>

        {/* Patterns */}
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {zh ? '常见形态速查' : 'Common Patterns'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PATTERNS.map(pat => {
            const svgW = pat.candles.length > 1 ? 56 : 42
            return (
              <div key={pat.name_en} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.025)', border: `1px solid ${BDR}`,
                borderRadius: 8, padding: '8px 12px',
              }}>
                <svg width={svgW} height={70} style={{ flexShrink: 0 }}>
                  {pat.candles.map((c, i) => <TinyCandle key={i} {...c} />)}
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {zh ? pat.name_zh : pat.name_en}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                      background: `${SIG_COLOR[pat.signal]}1a`, color: SIG_COLOR[pat.signal],
                    }}>
                      {pat.signal.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>
                    {zh ? pat.tip_zh : pat.tip_en}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 14, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {zh
            ? '* K线形态须结合趋势和成交量综合判断，不可单独作为买卖依据。'
            : '* Always confirm patterns with trend direction and volume. Never use alone as a trading signal.'}
        </div>
      </div>
    </>
  )
}
