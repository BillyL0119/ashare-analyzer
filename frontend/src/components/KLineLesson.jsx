import { useState } from 'react'

const ACCENT  = '#ec4899'
const MUTED   = 'var(--text-muted)'
const BDR     = 'rgba(138,180,248,0.10)'
const CARD    = 'var(--bg-tertiary)'
const GREEN   = '#34d399'
const RED     = '#ef4444'
const BLUE    = '#8ab4f8'
const YELLOW  = '#f59e0b'

// ─── Anatomy parts ────────────────────────────────────────────────────────────
const PARTS = [
  { id: 'high',         color: YELLOW, label_zh: '最高价',  label_en: 'High',
    desc_zh: '当日交易达到的最高价格，位于上影线的顶端。',
    desc_en: 'Highest price traded in the session — the very tip of the upper wick.' },
  { id: 'upper_shadow', color: BLUE,   label_zh: '上影线',  label_en: 'Upper Wick',
    desc_zh: '从实体顶端延伸到最高价的细线，代表多方冲高后被空方打压回落的轨迹。上影线越长，上方阻力越强。',
    desc_en: 'Thin line from body top to the high. The longer the upper wick, the stronger the selling pressure at those high prices.' },
  { id: 'close',        color: GREEN,  label_zh: '收盘价',  label_en: 'Close Price',
    desc_zh: '阳线（上涨K线）中，收盘价高于开盘价，构成实体的上沿。A股以红色表示上涨，欧美以绿色表示。',
    desc_en: 'For a bullish (rising) candle, close > open — it forms the top of the body. Considered the most important price of the day.' },
  { id: 'body',         color: GREEN,  label_zh: '实体',    label_en: 'Body',
    desc_zh: '开盘价与收盘价之间的矩形。绿色/红色实体（阳线）代表当天上涨；红色/黑色（阴线）代表当天下跌。实体越长，当日方向性越强。',
    desc_en: 'Rectangle between open and close. Green = bullish (close > open, price rose); Red = bearish (close < open, price fell). Larger body = stronger directional move.' },
  { id: 'open',         color: MUTED,  label_zh: '开盘价',  label_en: 'Open Price',
    desc_zh: '当天市场开始交易时的第一笔成交价格，阳线中是实体的下沿。',
    desc_en: 'The price at which the first trade of the session occurred. For a bullish candle it is the bottom of the body.' },
  { id: 'lower_shadow', color: BLUE,   label_zh: '下影线',  label_en: 'Lower Wick',
    desc_zh: '从实体底端延伸到最低价的细线，代表空方将价格打低后多方强力托起。下影线越长，下方支撑越强。',
    desc_en: 'Thin line from body bottom to the low. The longer the lower wick, the stronger the buying support at those low prices.' },
  { id: 'low',          color: YELLOW, label_zh: '最低价',  label_en: 'Low',
    desc_zh: '当日交易达到的最低价格，位于下影线的底端。',
    desc_en: 'Lowest price traded in the session — the very bottom of the lower wick.' },
]

// ─── Anatomy SVG (bullish candle with labeled parts) ─────────────────────────
function AnatomySVG({ hovered, onHover }) {
  // Canvas: 320 × 220
  // Candle: cx=160, bw=36
  // y coords: high=20, close=65, open=150, low=195
  const cx = 160, bw = 36
  const HY = 20, CY = 65, OY = 150, LY = 195
  const hi = (id) => hovered === id
  const c  = (id, def) => hi(id) ? YELLOW : def

  return (
    <svg width={320} height={220} style={{ overflow: 'visible', userSelect: 'none' }}>
      {/* Upper wick */}
      <line x1={cx} y1={HY} x2={cx} y2={CY}
        stroke={hi('upper_shadow') ? YELLOW : BLUE} strokeWidth={hi('upper_shadow') ? 3 : 2}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHover('upper_shadow')} onMouseLeave={() => onHover(null)} />
      <line x1={cx-5} y1={HY} x2={cx+5} y2={HY} stroke={c('high', YELLOW)} strokeWidth={2} />

      {/* Body */}
      <rect x={cx - bw/2} y={CY} width={bw} height={OY - CY}
        fill={hi('body') ? 'rgba(245,158,11,0.2)' : 'rgba(52,211,153,0.15)'}
        stroke={hi('body') ? YELLOW : GREEN} strokeWidth={hi('body') ? 2.5 : 2} rx={2}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHover('body')} onMouseLeave={() => onHover(null)} />

      {/* Lower wick */}
      <line x1={cx} y1={OY} x2={cx} y2={LY}
        stroke={hi('lower_shadow') ? YELLOW : BLUE} strokeWidth={hi('lower_shadow') ? 3 : 2}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHover('lower_shadow')} onMouseLeave={() => onHover(null)} />
      <line x1={cx-5} y1={LY} x2={cx+5} y2={LY} stroke={c('low', YELLOW)} strokeWidth={2} />

      {/* ── Right labels ── */}
      {[
        { id: 'high',  y: HY,                  label: '最高价 High' },
        { id: 'close', y: CY,                  label: '收盘价 Close' },
        { id: 'open',  y: OY,                  label: '开盘价 Open' },
        { id: 'low',   y: LY,                  label: '最低价 Low' },
      ].map(({ id, y, label }) => (
        <g key={id} style={{ cursor: 'pointer' }}
          onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)}>
          <line x1={cx + bw/2 + 1} y1={y} x2={cx + bw/2 + 26} y2={y}
            stroke={c(id, 'var(--text-muted)')} strokeWidth={1} strokeDasharray="3,2" />
          <text x={cx + bw/2 + 30} y={y + 4}
            fill={c(id, PARTS.find(p => p.id === id)?.color || MUTED)} fontSize={11}>
            {label}
          </text>
        </g>
      ))}

      {/* ── Left labels ── */}
      {[
        { id: 'upper_shadow', y: (HY + CY) / 2,  label: '上影线 Upper Wick' },
        { id: 'body',         y: (CY + OY) / 2,  label: '实体 Body' },
        { id: 'lower_shadow', y: (OY + LY) / 2,  label: '下影线 Lower Wick' },
      ].map(({ id, y, label }) => (
        <g key={id} style={{ cursor: 'pointer' }}
          onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)}>
          <line x1={cx - bw/2 - 1} y1={y} x2={cx - bw/2 - 26} y2={y}
            stroke={c(id, 'var(--text-muted)')} strokeWidth={1} strokeDasharray="3,2" />
          <text x={cx - bw/2 - 30} y={y + 4} textAnchor="end"
            fill={c(id, PARTS.find(p => p.id === id)?.color || MUTED)} fontSize={11}>
            {label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Mini candle for pattern cards ───────────────────────────────────────────
// open, close, high, low are SVG y-coords (lower y = higher price)
function MiniCandle({ cx, w, open, close, high, low }) {
  const bullish = close < open
  const fill   = bullish ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'
  const stroke = bullish ? GREEN : RED
  const bodyTop = Math.min(open, close)
  const bodyH   = Math.max(Math.abs(close - open), 2.5)
  const bw      = w * 0.55
  return (
    <g>
      <line x1={cx} y1={high} x2={cx} y2={low} stroke={stroke} strokeWidth={1.5} />
      <rect x={cx - bw/2} y={bodyTop} width={bw} height={bodyH}
        fill={fill} stroke={stroke} strokeWidth={1.5} rx={1} />
    </g>
  )
}

// ─── Pattern definitions ──────────────────────────────────────────────────────
// y-coords for SVG height 130 (top=10, bottom=120)
const PATTERNS = [
  {
    id: 'bullish_marubozu', name_zh: '大阳线', name_en: 'Bullish Marubozu',
    signal: 'bull',
    meaning_zh: '全天多方主导，开盘即低点、收盘即高点，无上下影线。强烈上涨信号。',
    meaning_en: 'Bulls dominated all day. No wicks, open = low, close = high. Strong bullish signal.',
    candles: [{ cx: 30, w: 40, open: 110, close: 20, high: 20, low: 110 }],
  },
  {
    id: 'bearish_marubozu', name_zh: '大阴线', name_en: 'Bearish Marubozu',
    signal: 'bear',
    meaning_zh: '全天空方主导，开盘即高点、收盘即低点，无上下影线。强烈下跌信号。',
    meaning_en: 'Bears dominated all day. No wicks, open = high, close = low. Strong bearish signal.',
    candles: [{ cx: 30, w: 40, open: 20, close: 110, high: 20, low: 110 }],
  },
  {
    id: 'doji', name_zh: '十字星（Doji）', name_en: 'Doji',
    signal: 'neutral',
    meaning_zh: '开盘价≈收盘价，实体极小，多空力量均衡，市场犹豫。常出现在趋势反转前。',
    meaning_en: 'Open ≈ close, almost no body. Bulls and bears balanced — market indecision. Often precedes trend reversals.',
    candles: [{ cx: 30, w: 40, open: 65, close: 65, high: 20, low: 110 }],
  },
  {
    id: 'hammer', name_zh: '锤子线（Hammer）', name_en: 'Hammer',
    signal: 'bull',
    meaning_zh: '下跌趋势末端出现，小实体居上，下影线≥实体2倍。空方压低后被多方强力托起，看涨反转信号。',
    meaning_en: 'Appears at end of downtrend. Small body near top, long lower wick (≥2× body). Bears tried to push down but bulls fought back — bullish reversal.',
    candles: [{ cx: 30, w: 40, open: 45, close: 30, high: 25, low: 110 }],
  },
  {
    id: 'shooting_star', name_zh: '射击之星', name_en: 'Shooting Star',
    signal: 'bear',
    meaning_zh: '上涨趋势末端出现，小实体居下，上影线≥实体2倍。多方冲高被空方打压，看跌反转信号。',
    meaning_en: 'Appears at end of uptrend. Small body near bottom, long upper wick (≥2× body). Bulls pushed up but were rejected hard — bearish reversal.',
    candles: [{ cx: 30, w: 40, open: 95, close: 110, high: 20, low: 115 }],
  },
  {
    id: 'engulfing', name_zh: '吞噬形态', name_en: 'Engulfing Pattern',
    signal: 'reversal',
    meaning_zh: '后一根K线实体完全"吞噬"前一根。看涨吞噬（前阴后阳）=买盘强势接管，看跌吞噬相反。',
    meaning_en: 'Second candle body completely covers the first. Bullish engulfing (red→green) = bulls took full control. Bearish engulfing signals the reverse.',
    candles: [
      { cx: 22, w: 30, open: 65, close: 80, high: 60, low: 85 },
      { cx: 55, w: 30, open: 90, close: 50, high: 45, low: 95 },
    ],
  },
  {
    id: 'morning_star', name_zh: '早晨/黄昏之星', name_en: 'Morning / Evening Star',
    signal: 'reversal',
    meaning_zh: '三根组合：大阴线 + 小实体（含十字星）+ 大阳线 = 早晨之星（底部反转）。反过来为黄昏之星（顶部反转）。',
    meaning_en: 'Three candles: big bearish + small body/doji + big bullish = Morning Star (bottom reversal). Reverse = Evening Star (top reversal).',
    candles: [
      { cx: 18, w: 26, open: 30, close: 90, high: 25, low: 95 },
      { cx: 46, w: 26, open: 72, close: 75, high: 65, low: 82 },
      { cx: 74, w: 26, open: 90, close: 30, high: 25, low: 95 },
    ],
  },
]

const SIGNAL_COLOR = { bull: GREEN, bear: RED, neutral: MUTED, reversal: BLUE }
const SIGNAL_LABEL = { bull: { zh: '看涨', en: 'Bullish' }, bear: { zh: '看跌', en: 'Bearish' }, neutral: { zh: '中性', en: 'Neutral' }, reversal: { zh: '反转', en: 'Reversal' } }

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
  {
    q_zh: '上涨趋势末端出现一根小实体K线，上影线很长（超过实体2倍），下影线极短。这最可能是？',
    q_en: 'At the top of an uptrend, a candle appears with a tiny body, long upper wick (2× body), very short lower wick. What pattern is this?',
    opts_zh: ['锤子线', '射击之星', '大阳线', '十字星'],
    opts_en: ['Hammer', 'Shooting Star', 'Bullish Marubozu', 'Doji'],
    answer: 1,
    exp_zh: '射击之星（Shooting Star）出现在上涨趋势末端，长上影线代表多方冲高后被空方强力打回，是看跌反转信号。',
    exp_en: 'Shooting Star appears at the top of an uptrend. The long upper wick shows bulls pushed prices up but were sharply rejected — a bearish reversal signal.',
  },
  {
    q_zh: '一根K线的开盘价和收盘价几乎完全相等，上下各有一段影线。这是？',
    q_en: 'A candle where open ≈ close, with wicks on both top and bottom. What is this called?',
    opts_zh: ['大阳线', '锤子线', '十字星（Doji）', '吞噬形态'],
    opts_en: ['Bullish Marubozu', 'Hammer', 'Doji', 'Engulfing Pattern'],
    answer: 2,
    exp_zh: '十字星（Doji）的核心特征是开盘价≈收盘价，实体极小甚至为零，说明多空力量暂时均衡，市场处于犹豫状态。',
    exp_en: 'A Doji has open ≈ close, forming almost no body. It signals a balance between buyers and sellers — market indecision that often precedes a reversal.',
  },
  {
    q_zh: '在下跌趋势中，出现了两根K线：第一根是小阴线，第二根是阳线且实体完全覆盖第一根。这是？',
    q_en: 'During a downtrend, two candles appear: a small bearish candle followed by a bullish candle whose body completely covers the first. What is this?',
    opts_zh: ['射击之星', '早晨之星', '看涨吞噬形态', '锤子线'],
    opts_en: ['Shooting Star', 'Morning Star', 'Bullish Engulfing', 'Hammer'],
    answer: 2,
    exp_zh: '看涨吞噬形态：第二根阳线完全吞噬第一根阴线的实体，说明买盘强力接管，是下跌趋势中的看涨反转信号。',
    exp_en: 'Bullish Engulfing: the second candle\'s body completely covers the first. This shows buyers overpowered sellers decisively — a bullish reversal in a downtrend.',
  },
]

// ─── Section tabs ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'anatomy',  label_zh: '📐 K线解剖', label_en: '📐 Anatomy' },
  { id: 'patterns', label_zh: '📊 常见形态', label_en: '📊 Patterns' },
  { id: 'quiz',     label_zh: '✏️ 小测验',  label_en: '✏️ Quiz' },
]

export default function KLineLesson({ zh }) {
  const [section,   setSection]   = useState('anatomy')
  const [hovered,   setHovered]   = useState(null)
  const [expanded,  setExpanded]  = useState(null)
  const [quizIdx,   setQuizIdx]   = useState(0)
  const [selected,  setSelected]  = useState(null)   // chosen option index
  const [revealed,  setRevealed]  = useState(false)
  const [score,     setScore]     = useState(0)
  const [done,      setDone]      = useState(false)

  const hoveredPart = PARTS.find(p => p.id === hovered)

  const handleQuizSelect = (i) => {
    if (revealed) return
    setSelected(i)
    setRevealed(true)
    if (i === QUIZ[quizIdx].answer) setScore(s => s + 1)
  }

  const nextQuestion = () => {
    if (quizIdx + 1 >= QUIZ.length) { setDone(true); return }
    setQuizIdx(q => q + 1)
    setSelected(null)
    setRevealed(false)
  }

  const restartQuiz = () => {
    setQuizIdx(0); setSelected(null); setRevealed(false); setScore(0); setDone(false)
  }

  const q = QUIZ[quizIdx]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Section tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '12px 20px 0',
        background: 'var(--bg-tertiary)', borderBottom: `1px solid ${BDR}`, flexShrink: 0,
      }}>
        {SECTIONS.map(s => {
          const active = section === s.id
          return (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              padding: '8px 20px', borderRadius: '8px 8px 0 0',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
              background: active ? '#0b0f1a' : 'transparent',
              color: active ? ACCENT : MUTED,
              borderTop: active ? `2px solid ${ACCENT}` : '2px solid transparent',
              borderLeft: active ? `1px solid ${BDR}` : '1px solid transparent',
              borderRight: active ? `1px solid ${BDR}` : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              {zh ? s.label_zh : s.label_en}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#0b0f1a', padding: '24px 28px 40px' }}>

        {/* ── ANATOMY ── */}
        {section === 'anatomy' && (
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              {zh ? 'K线图解——解读每一根蜡烛' : 'Candlestick Anatomy — Reading Every Candle'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
              {zh
                ? '每根K线（蜡烛图）记录了一段时间内的4个关键价格。将鼠标悬停在图中各部分或下方标签上查看详细说明。'
                : 'Each candlestick records 4 key prices for a time period. Hover over any part of the diagram or the labels below for an explanation.'}
            </p>

            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* SVG */}
              <div style={{
                background: CARD, border: `1px solid ${BDR}`,
                borderRadius: 12, padding: '20px 16px', flexShrink: 0,
              }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, textAlign: 'center' }}>
                  {zh ? '（阳线示例 — 当日上涨）' : '(Bullish candle example — price rose)'}
                </div>
                <AnatomySVG hovered={hovered} onHover={setHovered} />
              </div>

              {/* Description panel */}
              <div style={{ flex: 1, minWidth: 240 }}>
                {hoveredPart ? (
                  <div style={{
                    background: `rgba(${hoveredPart.color === GREEN ? '52,211,153' : hoveredPart.color === BLUE ? '138,180,248' : '245,158,11'},0.08)`,
                    border: `1px solid ${hoveredPart.color}44`,
                    borderRadius: 10, padding: '16px 18px',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: hoveredPart.color, marginBottom: 8 }}>
                      {zh ? hoveredPart.label_zh : hoveredPart.label_en}
                    </div>
                    <div style={{ fontSize: 13, color: '#c9d1d9', lineHeight: 1.7 }}>
                      {zh ? hoveredPart.desc_zh : hoveredPart.desc_en}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: CARD, border: `1px solid ${BDR}`,
                    borderRadius: 10, padding: '16px 18px', color: MUTED, fontSize: 13,
                  }}>
                    {zh ? '👆 将鼠标悬停在K线的任意部分查看详细说明' : '👆 Hover over any part of the candle to see its explanation'}
                  </div>
                )}

                {/* Part list */}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {PARTS.map(p => (
                    <div key={p.id}
                      onMouseEnter={() => setHovered(p.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                        background: hovered === p.id ? `${p.color}14` : 'transparent',
                        border: hovered === p.id ? `1px solid ${p.color}33` : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: hovered === p.id ? 'var(--text-primary)' : MUTED, fontWeight: hovered === p.id ? 600 : 400 }}>
                        {zh ? p.label_zh : p.label_en}
                        {' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          {zh ? `— ${p.label_en}` : `— ${p.label_zh}`}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick summary cards */}
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                { icon: '🟢', title_zh: '阳线（上涨）', title_en: 'Bullish Candle', body_zh: '收盘价 > 开盘价。A股用红色，欧美常用绿色。代表当日价格上涨。', body_en: 'Close > open. Shown in green (or red in Chinese markets). Price rose during the session.' },
                { icon: '🔴', title_zh: '阴线（下跌）', title_en: 'Bearish Candle', body_zh: '收盘价 < 开盘价。A股用绿色，欧美常用红色。代表当日价格下跌。', body_en: 'Close < open. Shown in red (or green in Chinese markets). Price fell during the session.' },
                { icon: '📏', title_zh: '影线的意义', title_en: 'What Wicks Tell You', body_zh: '上影线越长→上方阻力越强；下影线越长→下方支撑越强。', body_en: 'Longer upper wick = stronger resistance above; longer lower wick = stronger support below.' },
                { icon: '🕐', title_zh: '时间周期', title_en: 'Time Frames', body_zh: '一根K线可以代表1分钟、1小时、1天、1周等不同时间段，形状逻辑相同。', body_en: 'A candle can represent 1 min, 1 hour, 1 day, 1 week, etc. The same shape logic applies.' },
              ].map(card => (
                <div key={card.icon} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{card.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {zh ? card.title_zh : card.title_en}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                    {zh ? card.body_zh : card.body_en}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PATTERNS ── */}
        {section === 'patterns' && (
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              {zh ? '常见K线形态' : 'Common Candlestick Patterns'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
              {zh
                ? '以下是7种最常用的K线形态。点击形态卡片展开详细说明。实战中需结合趋势和成交量综合判断。'
                : '7 of the most widely used candlestick patterns. Click a card to expand. Always confirm signals with trend context and volume.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PATTERNS.map(pat => {
                const isOpen = expanded === pat.id
                const sigColor = SIGNAL_COLOR[pat.signal]
                const sigLabel = SIGNAL_LABEL[pat.signal]
                const svgW = pat.candles.length === 1 ? 60 : pat.candles.length === 2 ? 80 : 100

                return (
                  <div key={pat.id}
                    onClick={() => setExpanded(isOpen ? null : pat.id)}
                    style={{
                      background: isOpen ? 'rgba(255,255,255,0.035)' : CARD,
                      border: `1px solid ${isOpen ? sigColor + '44' : BDR}`,
                      borderRadius: 10, cursor: 'pointer', overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                      {/* Mini SVG */}
                      <svg width={svgW} height={60} style={{ flexShrink: 0 }}>
                        {pat.candles.map((c, i) => (
                          <MiniCandle key={i} {...c}
                            open={10 + (c.open / 130) * 50}
                            close={10 + (c.close / 130) * 50}
                            high={10 + (c.high / 130) * 50}
                            low={10 + (c.low / 130) * 50}
                          />
                        ))}
                      </svg>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {zh ? pat.name_zh : pat.name_en}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: `${sigColor}1a`, color: sigColor, border: `1px solid ${sigColor}44`,
                          }}>
                            {zh ? sigLabel.zh : sigLabel.en}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                          {zh ? pat.meaning_zh.slice(0, 45) + '…' : pat.meaning_en.slice(0, 55) + '…'}
                        </div>
                      </div>

                      <div style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>
                        {isOpen ? '▲' : '▼'}
                      </div>
                    </div>

                    {/* Expanded */}
                    {isOpen && (
                      <div style={{
                        padding: '0 16px 16px', borderTop: `1px solid ${BDR}`,
                        display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap',
                      }}>
                        {/* Larger SVG */}
                        <svg width={svgW * 1.6} height={90} style={{ flexShrink: 0, marginTop: 14 }}>
                          {pat.candles.map((c, i) => (
                            <MiniCandle key={i}
                              cx={c.cx * 1.6} w={c.w * 1.6}
                              open={10 + (c.open / 130) * 72}
                              close={10 + (c.close / 130) * 72}
                              high={10 + (c.high / 130) * 72}
                              low={10 + (c.low / 130) * 72}
                            />
                          ))}
                        </svg>
                        <div style={{ flex: 1, minWidth: 200, paddingTop: 14 }}>
                          <div style={{ fontSize: 12, color: '#c9d1d9', lineHeight: 1.8 }}>
                            {zh ? pat.meaning_zh : pat.meaning_en}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(138,180,248,0.05)', border: `1px solid ${BLUE}22`, borderRadius: 8, fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
              {zh
                ? '⚠️ K线形态是参考信号，不是买卖指令。需结合趋势（多日走势）、成交量（是否放量）和其他技术指标综合分析。'
                : '⚠️ Candlestick patterns are reference signals, not buy/sell orders. Always combine with trend direction, volume confirmation, and other technical indicators.'}
            </div>
          </div>
        )}

        {/* ── QUIZ ── */}
        {section === 'quiz' && (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              {zh ? '小测验——检验一下你的理解' : 'Quick Quiz — Test Your Understanding'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: MUTED }}>
              {zh ? `第 ${quizIdx + 1} / ${QUIZ.length} 题` : `Question ${quizIdx + 1} of ${QUIZ.length}`}
            </p>

            {done ? (
              <div style={{
                background: score === QUIZ.length ? 'rgba(52,211,153,0.08)' : CARD,
                border: `1px solid ${score === QUIZ.length ? GREEN + '44' : BDR}`,
                borderRadius: 12, padding: '32px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                  {score === QUIZ.length ? '🎉' : score >= 2 ? '👍' : '📖'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {zh ? `得分：${score} / ${QUIZ.length}` : `Score: ${score} / ${QUIZ.length}`}
                </div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.6 }}>
                  {score === QUIZ.length
                    ? (zh ? '完美！你已掌握K线基础知识，可以尝试在股票分析页面观察实际走势了。' : 'Perfect! You have mastered the basics. Try spotting these patterns in the live charts!')
                    : score >= 2
                    ? (zh ? '做得不错！回顾一下「常见形态」章节，巩固薄弱知识点。' : 'Good job! Review the Patterns section to reinforce any weak spots.')
                    : (zh ? '继续加油！先仔细阅读「K线解剖」和「常见形态」，再来挑战一次吧。' : 'Keep going! Read through the Anatomy and Patterns sections carefully, then try again.')}
                </div>
                <button onClick={restartQuiz} style={{
                  padding: '10px 28px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700,
                  background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`, color: '#fff',
                }}>
                  {zh ? '重新测验' : 'Try Again'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '20px 18px', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                    {zh ? q.q_zh : q.q_en}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(zh ? q.opts_zh : q.opts_en).map((opt, i) => {
                    let bg = CARD, border = `1px solid ${BDR}`, color = '#c9d1d9'
                    if (revealed) {
                      if (i === q.answer) { bg = 'rgba(52,211,153,0.1)'; border = `1px solid ${GREEN}55`; color = GREEN }
                      else if (i === selected) { bg = 'rgba(239,68,68,0.1)'; border = `1px solid ${RED}55`; color = RED }
                    }
                    return (
                      <button key={i} onClick={() => handleQuizSelect(i)} style={{
                        padding: '12px 16px', borderRadius: 8, border, cursor: revealed ? 'default' : 'pointer',
                        fontSize: 13, fontWeight: 500, color, background: bg,
                        textAlign: 'left', transition: 'all 0.15s',
                      }}>
                        <span style={{ marginRight: 10, color: MUTED }}>
                          {['A', 'B', 'C', 'D'][i]}.
                        </span>
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {revealed && (
                  <div style={{
                    marginTop: 16, padding: '14px 16px', borderRadius: 8,
                    background: selected === q.answer ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${selected === q.answer ? GREEN : RED}33`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: selected === q.answer ? GREEN : RED, marginBottom: 6 }}>
                      {selected === q.answer
                        ? (zh ? '✓ 正确！' : '✓ Correct!')
                        : (zh ? '✗ 答错了，正确答案是：' + (zh ? q.opts_zh : q.opts_en)[q.answer] : '✗ Incorrect. The answer is: ' + (zh ? q.opts_zh : q.opts_en)[q.answer])}
                    </div>
                    <div style={{ fontSize: 12, color: '#c9d1d9', lineHeight: 1.7 }}>
                      {zh ? q.exp_zh : q.exp_en}
                    </div>
                  </div>
                )}

                {revealed && (
                  <button onClick={nextQuestion} style={{
                    marginTop: 16, padding: '10px 28px', borderRadius: 20, border: 'none',
                    cursor: 'pointer', fontSize: 14, fontWeight: 700,
                    background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`, color: '#fff',
                  }}>
                    {quizIdx + 1 >= QUIZ.length ? (zh ? '查看结果' : 'See Results') : (zh ? '下一题 →' : 'Next →')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
