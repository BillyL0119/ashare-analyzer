import { useEffect, useMemo, useState } from 'react'
import ReactECharts from '../lib/echarts'
import useLangStore from '../store/langStore'
import useThemeStore from '../store/themeStore'
import { THEME } from '../utils/chartHelpers'

// US company fundamentals (/api/us/fundamentals/{symbol} + /api/us/stock/{symbol}/realtime).
// Source data: Nasdaq. Figures in USD; fiscal periods as reported by each company.

const LABELS = {
  zh: {
    overview: '公司概况', website: '官网', more: '展开', less: '收起', keyStats: '关键数据',
    mcap: '市值', pe: '市盈率 (TTM)', eps: '每股收益 (近4季)', divYield: '股息率', perYear: '/年', none: '无',
    range: '52 周区间', avgVol: '平均成交量', target: '分析师目标价', upside: '空间', nextEarn: '下次财报',
    afterClose: '盘后', beforeOpen: '盘前', estEps: '预期 EPS', inst: '机构持股', employees: '员工人数',
    financials: '财务表现', annual: '年度', quarterly: '季度', revenue: '营收', netIncome: '净利润', netMargin: '净利率',
    grossProfit: '毛利润', opIncome: '营业利润', grossMargin: '毛利率', opMargin: '营业利润率', ocf: '经营现金流',
    fcf: '自由现金流', revGrowth: '营收同比', earnings: '盈利 vs 预期', actual: '实际 EPS', estimate: '预期 EPS',
    beat: '超预期', miss: '低于预期', analysts: '分析师评级', buy: '买入', hold: '持有', sell: '卖出',
    low: '最低', high: '最高', avg: '平均', current: '现价', analystsN: (n) => `${n} 位分析师`,
    balance: '资产负债', cash: '现金及短期投资', debt: '总负债（借款）', netCash: '净现金', equity: '股东权益',
    assets: '总资产', holders: '主要机构股东', holder: '机构', shares: '持股', value: '市值', change: '变动',
    etf: 'ETF 和基金没有公司财报，这里只显示行情数据。', cnNote: '公司基本面目前覆盖美股上市公司。A 股请用“财务分析”。',
    source: '数据来源：Nasdaq · 单位美元 · 财年按公司口径', loading: '正在加载公司数据…', error: '暂时无法获取该公司的基本面数据',
    fy: '财年',
  },
  en: {
    overview: 'Company overview', website: 'Website', more: 'More', less: 'Less', keyStats: 'Key stats',
    mcap: 'Market cap', pe: 'P/E (TTM)', eps: 'EPS (last 4 qtrs)', divYield: 'Dividend yield', perYear: '/yr', none: 'None',
    range: '52-week range', avgVol: 'Avg volume', target: 'Analyst target', upside: 'upside', nextEarn: 'Next earnings',
    afterClose: 'after close', beforeOpen: 'before open', estEps: 'est. EPS', inst: 'Institutional ownership', employees: 'Employees',
    financials: 'Financials', annual: 'Annual', quarterly: 'Quarterly', revenue: 'Revenue', netIncome: 'Net income', netMargin: 'Net margin',
    grossProfit: 'Gross profit', opIncome: 'Operating income', grossMargin: 'Gross margin', opMargin: 'Operating margin', ocf: 'Operating cash flow',
    fcf: 'Free cash flow', revGrowth: 'Revenue growth (YoY)', earnings: 'Earnings vs estimates', actual: 'Actual EPS', estimate: 'Estimate',
    beat: 'Beat', miss: 'Miss', analysts: 'Analyst ratings', buy: 'Buy', hold: 'Hold', sell: 'Sell',
    low: 'Low', high: 'High', avg: 'Average', current: 'Price', analystsN: (n) => `${n} analysts`,
    balance: 'Balance sheet', cash: 'Cash & short-term inv.', debt: 'Total debt', netCash: 'Net cash', equity: 'Shareholders\' equity',
    assets: 'Total assets', holders: 'Top institutional holders', holder: 'Holder', shares: 'Shares', value: 'Value', change: 'Change',
    etf: 'ETFs and funds have no company financials; only market data is shown.', cnNote: 'Fundamentals currently cover US-listed companies. For A-shares, use Financial Analysis.',
    source: 'Source: Nasdaq · USD · fiscal periods as reported', loading: 'Loading company data…', error: 'Fundamentals are unavailable for this company right now',
    fy: 'Fiscal year',
  },
}
LABELS.ja = { ...LABELS.en, overview: '企業概要', keyStats: '主要指標', mcap: '時価総額', pe: 'PER (TTM)', eps: 'EPS (直近4四半期)', divYield: '配当利回り',
  range: '52週レンジ', avgVol: '平均出来高', target: 'アナリスト目標株価', upside: '上昇余地', nextEarn: '次回決算', inst: '機関投資家保有比率', employees: '従業員数',
  financials: '業績', annual: '年次', quarterly: '四半期', revenue: '売上高', netIncome: '純利益', netMargin: '純利益率', grossProfit: '売上総利益',
  opIncome: '営業利益', grossMargin: '売上総利益率', opMargin: '営業利益率', ocf: '営業CF', fcf: 'フリーCF', revGrowth: '売上成長率 (前年比)',
  earnings: 'EPS 実績と予想', actual: '実績', estimate: '予想', beat: '上振れ', miss: '下振れ', analysts: 'アナリスト評価', buy: '買い', hold: '中立', sell: '売り',
  low: '最低', high: '最高', avg: '平均', current: '株価', analystsN: (n) => `${n}人のアナリスト`, balance: '財務状況', cash: '現金・短期投資', debt: '有利子負債',
  netCash: 'ネットキャッシュ', equity: '自己資本', assets: '総資産', holders: '主な機関投資家', holder: '機関', shares: '保有株数', value: '評価額', change: '増減',
  source: '出所: Nasdaq · 米ドル · 会計年度は各社基準', loading: '企業データを読み込み中…', error: 'この企業のファンダメンタルズは現在取得できません' }
LABELS.ko = { ...LABELS.en, overview: '기업 개요', keyStats: '핵심 지표', mcap: '시가총액', pe: 'P/E (TTM)', eps: 'EPS (최근 4분기)', divYield: '배당수익률',
  range: '52주 범위', avgVol: '평균 거래량', target: '애널리스트 목표가', upside: '상승 여력', nextEarn: '다음 실적 발표', inst: '기관 보유 비중', employees: '직원 수',
  financials: '재무 실적', annual: '연간', quarterly: '분기', revenue: '매출', netIncome: '순이익', netMargin: '순이익률', grossProfit: '매출총이익',
  opIncome: '영업이익', grossMargin: '매출총이익률', opMargin: '영업이익률', ocf: '영업현금흐름', fcf: '잉여현금흐름', revGrowth: '매출 성장률 (전년 대비)',
  earnings: 'EPS 실적 vs 예상', actual: '실적', estimate: '예상', beat: '상회', miss: '하회', analysts: '애널리스트 의견', buy: '매수', hold: '보유', sell: '매도',
  low: '최저', high: '최고', avg: '평균', current: '현재가', analystsN: (n) => `애널리스트 ${n}명`, balance: '재무상태', cash: '현금 및 단기투자', debt: '총차입금',
  netCash: '순현금', equity: '자본총계', assets: '총자산', holders: '주요 기관 투자자', holder: '기관', shares: '보유 주식', value: '평가액', change: '변동',
  source: '출처: Nasdaq · 미국 달러 · 회계연도는 기업 기준', loading: '기업 데이터를 불러오는 중…', error: '현재 이 기업의 펀더멘털 데이터를 가져올 수 없습니다' }
LABELS.fr = { ...LABELS.en, overview: 'Présentation', keyStats: 'Chiffres clés', mcap: 'Capitalisation', pe: 'PER (12 m)', eps: 'BPA (4 derniers trim.)', divYield: 'Rendement',
  range: 'Plage 52 semaines', avgVol: 'Volume moyen', target: 'Objectif des analystes', upside: 'potentiel', nextEarn: 'Prochains résultats', inst: 'Détention institutionnelle', employees: 'Salariés',
  financials: 'Résultats financiers', annual: 'Annuel', quarterly: 'Trimestriel', revenue: 'Chiffre d\'affaires', netIncome: 'Résultat net', netMargin: 'Marge nette',
  grossProfit: 'Marge brute', opIncome: 'Résultat opérationnel', grossMargin: 'Taux de marge brute', opMargin: 'Marge opérationnelle', ocf: 'Flux de trésorerie opérationnel',
  fcf: 'Flux de trésorerie disponible', revGrowth: 'Croissance du CA (sur un an)', earnings: 'BPA vs consensus', actual: 'BPA publié', estimate: 'Consensus',
  beat: 'Au-dessus', miss: 'En dessous', analysts: 'Avis des analystes', buy: 'Achat', hold: 'Conserver', sell: 'Vente', low: 'Bas', high: 'Haut', avg: 'Moyenne', current: 'Cours',
  analystsN: (n) => `${n} analystes`, balance: 'Bilan', cash: 'Trésorerie et placements', debt: 'Dette totale', netCash: 'Trésorerie nette', equity: 'Capitaux propres',
  assets: 'Total actif', holders: 'Principaux actionnaires institutionnels', holder: 'Institution', shares: 'Actions', value: 'Valeur', change: 'Variation',
  source: 'Source : Nasdaq · USD · exercices tels que publiés', loading: 'Chargement des données…', error: 'Données fondamentales indisponibles pour le moment' }

const BLUE = '#5b9cf6', TEAL = '#26a69a', AMBER = '#f5a524', RED = '#ef5350', GREEN = '#26a69a'

const money = (v, d = 1) => {
  if (v == null || Number.isNaN(v)) return '—'
  if (v === 0) return '$0'
  const a = Math.abs(v), s = v < 0 ? '-' : ''
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(d)}B`
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(d)}M`
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(d)}K`
  return `${s}$${a.toFixed(2)}`
}
const num = (v) => (v == null ? '—' : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toLocaleString('en-US'))
const pct = (v, d = 1) => (v == null ? '—' : `${v.toFixed(d)}%`)
const signPct = (v, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`)
const fmtDate = (iso, lang) => {
  if (!iso) return '—'
  const loc = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }[lang] || 'en-US'
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' })
}

const CSS = `
.fu-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius); padding: 16px; min-width: 0; }
.fu-h { margin: 0 0 12px; font-size: 12px; font-weight: 600; letter-spacing: .06em;  color: var(--text-muted); }
.fu-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.fu-tile { background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: var(--radius); padding: 11px 12px; min-width: 0; }
.fu-tile .l { font-size: 11px; color: var(--text-muted); margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-tile .v { font-size: 17px; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-tile .s { font-size: 11px; color: var(--text-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
.fu-table { width: 100%; border-collapse: collapse; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.fu-table th { font-size: 11px; font-weight: 600; color: var(--text-muted); text-align: right; padding: 7px 8px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; }
.fu-table th:first-child, .fu-table td:first-child { text-align: left; }
.fu-table td { padding: 7px 8px; text-align: right; color: var(--text-secondary); border-bottom: 1px solid var(--border-primary); white-space: nowrap; }
.fu-table tr:last-child td { border-bottom: none; }
.fu-table td.k { color: var(--text-primary); font-weight: 600; }
.fu-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); }
.fu-seg button { border: none; background: transparent; color: var(--text-secondary); font-size: 12px; padding: 4px 10px; border-radius: 6px; cursor: pointer; }
.fu-seg button.on { background: var(--bg-secondary); color: var(--text-primary); font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
@media (max-width: 1100px) { .fu-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .fu-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .fu-two { grid-template-columns: minmax(0, 1fr); } }
`

export default function FundamentalsPanel({ stocks, market }) {
  useThemeStore((s) => s.theme)
  const lang = useLangStore((s) => s.lang)
  const t = LABELS[lang] || LABELS.en
  if (market !== 'us') {
    return <div className="fu-card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.cnNote}</div>
  }
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <style>{CSS}</style>
      {stocks.map((s) => <CompanyFundamentals key={s.code} code={s.code} t={t} lang={lang} />)}
    </div>
  )
}

function CompanyFundamentals({ code, t, lang }) {
  const [data, setData] = useState(null)
  const [quote, setQuote] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null); setErr(false)
    fetch(`/api/us/fundamentals/${code}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => alive && setData(d)).catch(() => alive && setErr(true))
    fetch(`/api/us/stock/${code}/realtime`).then((r) => r.json()).then((q) => alive && setQuote(q)).catch(() => {})
    return () => { alive = false }
  }, [code])

  if (err) return <div className="fu-card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{code}: {t.error}</div>
  if (!data) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="skeleton" style={{ height: 110, borderRadius: 'var(--radius)' }} />
        <div className="skeleton" style={{ height: 150, borderRadius: 'var(--radius)' }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius)' }} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.loading}</div>
      </div>
    )
  }

  const isCompany = !!data.annual
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Overview data={data} quote={quote} t={t} />
      <KeyStats data={data} quote={quote} t={t} lang={lang} />
      {!isCompany && <div className="fu-card" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.etf}</div>}
      {isCompany && <Financials data={data} t={t} />}
      {(data.earnings?.length > 0 || data.analysts) && (
        <div className="fu-two">
          {data.earnings?.length > 0 && <Earnings rows={data.earnings} t={t} />}
          {data.analysts && <Analysts a={data.analysts} price={quote?.price} t={t} />}
        </div>
      )}
      {(isCompany || data.holders?.top?.length > 0) && (
        <div className="fu-two">
          {isCompany && <Balance a={data.annual} t={t} />}
          {data.holders?.top?.length > 0 && <Holders h={data.holders} t={t} />}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.source}</div>
    </div>
  )
}

function Overview({ data, quote, t }) {
  const [open, setOpen] = useState(false)
  const p = data.profile || {}
  const name = p.name || quote?.name || data.symbol
  const desc = p.description || quote?.description
  const meta = [p.sector, p.industry, p.exchange].filter(Boolean)
  return (
    <section className="fu-card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-.2px' }}>{name}</h3>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text-muted)' }}>{data.symbol}</span>
        {p.website && (
          <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 12, color: BLUE, textDecoration: 'none' }}>
            {t.website} ↗
          </a>
        )}
      </div>
      {meta.length > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>{meta.join(' · ')}</div>}
      {desc && (
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: 900,
          ...(open ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
          {desc}
        </p>
      )}
      {desc && desc.length > 220 && (
        <button onClick={() => setOpen((v) => !v)} style={{ marginTop: 4, padding: 0, border: 'none', background: 'none', color: BLUE, fontSize: 12, cursor: 'pointer' }}>
          {open ? t.less : t.more}
        </button>
      )}
    </section>
  )
}

function Tile({ label, value, sub, children }) {
  return (
    <div className="fu-tile">
      <div className="l" title={label}>{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s" title={typeof sub === 'string' ? sub : undefined}>{sub}</div>}
      {children}
    </div>
  )
}

function KeyStats({ data, quote, t, lang }) {
  const st = data.stats || {}
  const price = quote?.price
  const ttmEps = data.earnings?.length >= 4 ? data.earnings.slice(-4).reduce((s, e) => s + (e.eps ?? 0), 0) : null
  const lo = st.week52_low ?? quote?.week52_low, hi = st.week52_high ?? quote?.week52_high
  const posPct = price != null && lo != null && hi > lo ? Math.min(100, Math.max(0, ((price - lo) / (hi - lo)) * 100)) : null
  const target = data.analysts?.target ?? st.one_year_target
  const upside = target && price ? ((target - price) / price) * 100 : null
  const ne = data.next_earnings
  const isCompany = !!data.annual
  const tiles = [
    { label: t.mcap, value: money(st.market_cap ?? quote?.market_cap, 2) },
    { label: t.pe, value: quote?.pe_ratio ? quote.pe_ratio.toFixed(1) : '—' },
    { label: t.eps, value: ttmEps != null ? `$${ttmEps.toFixed(2)}` : '—' },
    // "None" only for companies: ETF summaries simply don't carry the yield
    { label: t.divYield, value: st.dividend_yield ? pct(st.dividend_yield, 2) : isCompany ? t.none : '—',
      sub: st.annual_dividend ? `$${st.annual_dividend.toFixed(2)}${t.perYear}` : null },
    { label: t.range, value: lo != null && hi != null ? `$${lo.toFixed(0)}–${hi.toFixed(0)}` : '—',
      extra: posPct != null && (
        <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'var(--border-primary)', marginTop: 8 }}>
          <span style={{ position: 'absolute', left: `calc(${posPct}% - 4px)`, top: -3, width: 8, height: 10, borderRadius: 2, background: BLUE }} />
        </div>
      ) },
    { label: t.avgVol, value: num(st.avg_volume) },
    { label: t.target, value: target ? `$${target.toFixed(2)}` : '—',
      sub: upside != null ? <span style={{ color: upside >= 0 ? GREEN : RED }}>{signPct(upside)} {t.upside}</span> : null },
    { label: t.nextEarn, value: ne?.date ? fmtDate(ne.date, lang) : '—',
      sub: ne ? [ne.timing === 'after_close' ? t.afterClose : ne.timing === 'before_open' ? t.beforeOpen : null, ne.eps_estimate != null ? `${t.estEps} $${ne.eps_estimate.toFixed(2)}` : null].filter(Boolean).join(' · ') : null },
    { label: t.inst, value: pct(data.holders?.institutional_pct) },
    { label: t.employees, value: quote?.employees ? quote.employees.toLocaleString('en-US') : '—' },
  ].filter((x) => x.value !== '—')   // hide stats the source doesn't have (e.g. most of them for ETFs)
  return (
    <section className="fu-card">
      <h4 className="fu-h">{t.keyStats}</h4>
      <div className="fu-grid">
        {tiles.map((x) => <Tile key={x.label} label={x.label} value={x.value} sub={x.sub}>{x.extra}</Tile>)}
      </div>
    </section>
  )
}

function Financials({ data, t }) {
  const [freq, setFreq] = useState('annual')
  const f = (freq === 'annual' ? data.annual : data.quarterly) || data.annual
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 64, right: 52, top: 36, bottom: 28 },
    legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: THEME.text, fontSize: 11 } },
    tooltip: {
      trigger: 'axis', backgroundColor: THEME.tooltipBg, borderColor: THEME.border, textStyle: { color: THEME.tooltipText, fontSize: 12 },
      valueFormatter: (v) => (v == null ? '—' : Math.abs(v) <= 100 && !Number.isInteger(v) ? `${v.toFixed(1)}%` : money(v)),
    },
    xAxis: { type: 'category', data: f.periods, axisLabel: { color: THEME.text, fontSize: 11 }, axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false } },
    yAxis: [
      { type: 'value', axisLabel: { color: THEME.text, fontSize: 10, formatter: (v) => money(v, 0) }, splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } } },
      { type: 'value', axisLabel: { color: THEME.text, fontSize: 10, formatter: '{value}%' }, splitLine: { show: false } },
    ],
    series: [
      { name: t.revenue, type: 'bar', data: f.revenue, barMaxWidth: 34, itemStyle: { color: BLUE, borderRadius: [3, 3, 0, 0] } },
      { name: t.netIncome, type: 'bar', data: f.net_income.map((v) => ({ value: v, itemStyle: { color: v < 0 ? RED : TEAL } })), barMaxWidth: 34, itemStyle: { color: TEAL, borderRadius: [3, 3, 0, 0] } },
      { name: t.netMargin, type: 'line', yAxisIndex: 1, data: f.net_margin, symbolSize: 6, lineStyle: { width: 2, color: AMBER }, itemStyle: { color: AMBER } },
    ],
  }), [f, t])

  const growth = f.revenue.map((v, i) => {
    const j = freq === 'annual' ? i - 1 : -1   // quarterly YoY would need 8 quarters; we only get 4
    return j >= 0 && f.revenue[j] ? ((v - f.revenue[j]) / Math.abs(f.revenue[j])) * 100 : null
  })
  const rows = [
    [t.revenue, f.revenue, money],
    ...(freq === 'annual' ? [[t.revGrowth, growth, signPct]] : []),
    [t.grossProfit, f.gross_profit, money],
    [t.opIncome, f.operating_income, money],
    [t.netIncome, f.net_income, money],
    [t.grossMargin, f.gross_margin, pct],
    [t.opMargin, f.operating_margin, pct],
    [t.netMargin, f.net_margin, pct],
    [t.ocf, f.operating_cash_flow, money],
    [t.fcf, f.free_cash_flow, money],
  ]
  return (
    <section className="fu-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h4 className="fu-h" style={{ margin: 0 }}>{t.financials}</h4>
        <div className="fu-seg" role="tablist">
          {['annual', 'quarterly'].map((k) => (
            <button key={k} className={freq === k ? 'on' : ''} role="tab" aria-selected={freq === k} onClick={() => setFreq(k)}>{t[k]}</button>
          ))}
        </div>
      </div>
      <ReactECharts option={option} notMerge style={{ height: 280, width: '100%' }} />
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table className="fu-table">
          <thead><tr><th>{freq === 'annual' ? t.fy : ''}</th>{f.periods.map((p) => <th key={p}>{p}</th>)}</tr></thead>
          <tbody>
            {rows.map(([label, vals, fmt]) => (
              <tr key={label}><td className="k">{label}</td>{vals.map((v, i) => <td key={i} style={v < 0 ? { color: RED } : undefined}>{fmt(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Earnings({ rows, t }) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 44, right: 12, top: 30, bottom: 24 },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: THEME.text, fontSize: 11 } },
    tooltip: { trigger: 'axis', backgroundColor: THEME.tooltipBg, borderColor: THEME.border, textStyle: { color: THEME.tooltipText, fontSize: 12 }, valueFormatter: (v) => (v == null ? '—' : `$${v.toFixed(2)}`) },
    xAxis: { type: 'category', data: rows.map((r) => r.quarter), axisLabel: { color: THEME.text, fontSize: 11 }, axisLine: { lineStyle: { color: THEME.border } }, axisTick: { show: false } },
    yAxis: { type: 'value', scale: true, axisLabel: { color: THEME.text, fontSize: 10, formatter: (v) => `$${v.toFixed(2)}` }, splitLine: { lineStyle: { color: THEME.border, type: 'dashed' } } },
    series: [
      { name: t.estimate, type: 'scatter', symbol: 'circle', symbolSize: 13, data: rows.map((r) => r.estimate), itemStyle: { color: 'transparent', borderColor: THEME.text, borderWidth: 2 } },
      { name: t.actual, type: 'scatter', symbolSize: 13, data: rows.map((r) => ({ value: r.eps, itemStyle: { color: r.eps >= (r.estimate ?? r.eps) ? GREEN : RED } })), itemStyle: { color: GREEN } },
    ],
  }), [rows, t])
  return (
    <section className="fu-card">
      <h4 className="fu-h">{t.earnings}</h4>
      <ReactECharts option={option} notMerge style={{ height: 190, width: '100%' }} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`, gap: 6, marginTop: 6 }}>
        {rows.map((r) => {
          const beat = r.surprise_pct == null ? null : r.surprise_pct >= 0
          const c = beat == null ? 'var(--text-muted)' : beat ? GREEN : RED
          return (
            <div key={r.quarter} style={{ textAlign: 'center', fontSize: 11, padding: '6px 4px', borderRadius: 8, background: 'var(--bg-tertiary)' }}>
              <div style={{ color: c, fontWeight: 600 }}>{signPct(r.surprise_pct)}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{beat == null ? '' : beat ? t.beat : t.miss}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Analysts({ a, price, t }) {
  const total = (a.buy || 0) + (a.hold || 0) + (a.sell || 0)
  const parts = [[t.buy, a.buy, GREEN], [t.hold, a.hold, AMBER], [t.sell, a.sell, RED]]
  const lo = Math.min(a.target_low ?? price ?? 0, price ?? Infinity)
  const hi = Math.max(a.target_high ?? price ?? 0, price ?? -Infinity)
  const at = (v) => (hi > lo && v != null ? ((v - lo) / (hi - lo)) * 100 : null)
  return (
    <section className="fu-card">
      <h4 className="fu-h">{t.analysts}</h4>
      {total > 0 && (
        <>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--border-primary)' }}>
            {parts.map(([k, n, c]) => n > 0 && <span key={k} style={{ flex: n, background: c }} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, flexWrap: 'wrap' }}>
            {parts.map(([k, n, c]) => (
              <span key={k} style={{ color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: c, marginRight: 6 }} />
                {k} <b style={{ color: 'var(--text-primary)' }}>{n}</b>
              </span>
            ))}
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{t.analystsN(total)}</span>
          </div>
        </>
      )}
      {a.target != null && (
        <div style={{ marginTop: 22 }}>
          <div style={{ position: 'relative', height: 6, borderRadius: 3, background: `${RED}55` }}>
            {/* average target: blue bar; current price: ring (stays visible when the two coincide) */}
            {at(a.target) != null && <span title={t.avg} style={{ position: 'absolute', left: `calc(${at(a.target)}% - 2px)`, top: -6, width: 4, height: 18, borderRadius: 2, background: BLUE }} />}
            {at(price) != null && <span title={t.current} style={{ position: 'absolute', left: `calc(${at(price)}% - 7px)`, top: -4, width: 14, height: 14, borderRadius: 7, border: '2px solid var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }} />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 14, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            {[[t.low, a.target_low], [t.avg, a.target], [t.high, a.target_high], [t.current, price]].map(([k, v]) => (
              <div key={k}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{k}</div>
                <div style={{ color: k === t.avg ? BLUE : 'var(--text-primary)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {k === t.current && <span style={{ width: 9, height: 9, borderRadius: 5, border: '2px solid var(--text-primary)', boxSizing: 'border-box' }} />}{v != null ? `$${v.toFixed(2)}` : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Balance({ a, t }) {
  const n = a.periods.length
  const cols = [n - 2, n - 1].filter((i) => i >= 0)
  const net = a.cash_and_investments.map((c, i) => (c != null && a.total_debt[i] != null ? c - a.total_debt[i] : null))
  const rows = [[t.cash, a.cash_and_investments], [t.debt, a.total_debt], [t.netCash, net], [t.equity, a.total_equity], [t.assets, a.total_assets]]
  return (
    <section className="fu-card">
      <h4 className="fu-h">{t.balance}</h4>
      <table className="fu-table">
        <thead><tr><th />{cols.map((i) => <th key={i}>{a.periods[i]}</th>)}</tr></thead>
        <tbody>
          {rows.map(([label, vals]) => (
            <tr key={label}><td className="k">{label}</td>{cols.map((i) => <td key={i} style={vals[i] < 0 ? { color: RED } : undefined}>{money(vals[i])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Holders({ h, t }) {
  return (
    <section className="fu-card" style={{ overflowX: 'auto' }}>
      <h4 className="fu-h">{t.holders}</h4>
      <table className="fu-table">
        <thead><tr><th>{t.holder}</th><th>{t.shares}</th><th>{t.value}</th><th>{t.change}</th></tr></thead>
        <tbody>
          {h.top.slice(0, 6).map((r) => (
            <tr key={r.name}>
              <td className="k" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.name}>{r.name}</td>
              <td>{num(r.shares)}</td>
              <td>{money(r.value)}</td>
              <td style={{ color: r.change_pct == null ? undefined : r.change_pct >= 0 ? GREEN : RED }}>{signPct(r.change_pct, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
