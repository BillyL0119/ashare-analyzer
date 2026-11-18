import { riseColor, fallColor } from '../../utils/chartTheme'
import useThemeStore from '../../store/themeStore'
import useQuoteApi from './useQuoteApi'
import { DASH, isNum, fmtSignedPct } from './format'
import summaryStrings, { fill } from './summaryStrings'
import './quotepage.css'
import './summary.css'

const barColor = (v) => (v >= 0 ? riseColor('us') : fallColor('us'))

function Line({ label, v, neg, pos, color }) {
  const range = neg + pos || 1
  const zero = (neg / range) * 100
  const w = isNum(v) ? (Math.abs(v) / range) * 100 : 0
  return (
    <div className="qs-perf-line">
      <span className="k" title={label}>{label}</span>
      <span className="qs-track" style={{ '--zero': `${zero}%` }} aria-hidden="true">
        {isNum(v) && <b style={{ left: `${v >= 0 ? zero : zero - w}%`, width: `${w}%`, background: color(v) }} />}
      </span>
      <span className="v" style={{ color: isNum(v) ? barColor(v) : 'var(--text-muted)' }}>{isNum(v) ? fmtSignedPct(v, 1) : DASH}</span>
    </div>
  )
}

const abs1 = (v) => Math.abs(v).toFixed(1)

function sentence(S, sym, rows) {
  const r = rows.find((x) => x.key === '1y' && isNum(x.stock) && isNum(x.benchmark)) || rows.find((x) => isNum(x.stock) && isNum(x.benchmark))
  if (!r) return null
  const base = fill(S.perfSentence, {
    period: S[`perfPhrase_${r.key}`], sym, va: r.stock >= 0 ? S.rose : S.fell, a: abs1(r.stock),
    vb: r.benchmark >= 0 ? S.rose : S.fell, b: abs1(r.benchmark),
  })
  const diff = r.stock - r.benchmark
  if (Math.abs(diff) < 0.05) return base
  return `${base} ${fill(diff > 0 ? S.perfBeat : S.perfTrail, { sym, d: abs1(diff) })}`
}

export default function SummaryPerformance({ code, lang }) {
  const S = summaryStrings(lang)
  useThemeStore((s) => s.theme)          // bar colours are read per render: re-render when the theme flips
  const { data, error, loading } = useQuoteApi(`/api/us/quote/${code}/performance`, { ttl: 300_000 })

  if (loading) return <div className="qp-skel" style={{ height: 300 }} aria-hidden="true" />
  const rows = data?.rows || []
  const usable = rows.some((r) => isNum(r.stock) || isNum(r.benchmark))
  const vals = rows.flatMap((r) => [r.stock, r.benchmark]).filter(isNum)
  const neg = Math.max(0, ...vals.filter((v) => v < 0).map((v) => -v))
  const pos = Math.max(0, ...vals.filter((v) => v > 0))
  const bench = data?.benchmark?.name === 'S&P 500' ? S.sp500 : data?.benchmark?.name

  return (
    <section className="qp-card" aria-label={S.perfTitle}>
      <div className="qp-head"><h3 className="qp-h">{S.perfTitle}</h3></div>
      {!usable ? (
        <div className="qp-empty">{error ? S.perfError : S.perfEmpty}</div>
      ) : (
        <>
          <p className="qp-sub" style={{ margin: '-6px 0 12px' }}>{S.perfHint}</p>
          <div className="qs-perf">
            {rows.map((r) => (
              <div key={r.key} className="qs-perf-row">
                <span className="qs-perf-label">{S[`perf_${r.key}`]}</span>
                <Line label={code} v={r.stock} neg={neg} pos={pos} color={barColor} />
                <Line label={bench} v={r.benchmark} neg={neg} pos={pos} color={() => 'var(--text-muted)'} />
              </div>
            ))}
          </div>
          {sentence(S, code, rows) && <p className="qs-sentence">{sentence(S, code, rows)}</p>}
          <p className="qp-note">{S.perfNote}</p>
        </>
      )}
    </section>
  )
}
