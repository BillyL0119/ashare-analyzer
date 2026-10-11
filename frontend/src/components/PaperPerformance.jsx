import { useEffect, useMemo, useState } from 'react'
import ReactECharts from '../lib/echarts'
import { riseColor, fallColor } from '../utils/chartHelpers'

// Paper trading performance: the account's value day by day (rebuilt from its trades on the server)
// against the S&P 500 (US) or CSI 300 (A-shares), both starting from the same money.

const L = {
  zh: { title: '收益曲线', mine: '我的组合', beat: (x) => `跑赢大盘 ${x}`, lag: (x) => `跑输大盘 ${x}`, ret: '我的收益', bench: (n) => n, dd: '最大回撤', since: (d) => `自 ${d} 起`, empty: '完成第一笔交易后，这里会显示你每天的账户价值，并和大盘对比，看看你是跑赢还是跑输市场。', pending: '已记录你的交易。收益曲线会在下一个交易日收盘后出现。', note: '大盘按同样的本金换算。跑赢大盘比单纯赚钱更难：大多数专业基金长期都跑不赢指数。' },
  en: { title: 'Performance', mine: 'My portfolio', beat: (x) => `Beating the market by ${x}`, lag: (x) => `Trailing the market by ${x}`, ret: 'My return', bench: (n) => n, dd: 'Max drawdown', since: (d) => `since ${d}`, empty: 'After your first trade, this chart shows your account value day by day next to the market, so you can see whether you are beating it.', pending: 'Your trade is in. The chart appears after the next market close.', note: 'The market line starts with the same money. Beating the index is harder than making money: most professional funds fail to do it over the long run.' },
  ja: { title: 'パフォーマンス', mine: '私のポートフォリオ', beat: (x) => `市場を ${x} 上回る`, lag: (x) => `市場を ${x} 下回る`, ret: '私のリターン', bench: (n) => n, dd: '最大ドローダウン', since: (d) => `${d} から`, empty: '最初の取引の後、ここに口座価値の推移が市場と並んで表示され、市場に勝っているかが分かります。', pending: '取引を記録しました。チャートは次の取引日の終値後に表示されます。', note: '市場の線は同じ元本で換算しています。指数に勝つのはお金を稼ぐより難しく、多くのプロのファンドも長期では勝てません。' },
  ko: { title: '수익 곡선', mine: '내 포트폴리오', beat: (x) => `시장 대비 ${x} 앞섬`, lag: (x) => `시장 대비 ${x} 뒤처짐`, ret: '내 수익률', bench: (n) => n, dd: '최대 낙폭', since: (d) => `${d}부터`, empty: '첫 거래 후 이곳에 계좌 가치 추이가 시장과 함께 표시되어 시장을 이기고 있는지 확인할 수 있습니다.', pending: '거래가 기록되었습니다. 차트는 다음 거래일 장 마감 후 표시됩니다.', note: '시장 선은 같은 원금으로 환산합니다. 지수를 이기는 것은 돈을 버는 것보다 어렵습니다. 대부분의 전문 펀드도 장기적으로 지수를 이기지 못합니다.' },
  fr: { title: 'Performance', mine: 'Mon portefeuille', beat: (x) => `Bat le marché de ${x}`, lag: (x) => `En retard sur le marché de ${x}`, ret: 'Ma performance', bench: (n) => n, dd: 'Perte max.', since: (d) => `depuis le ${d}`, empty: 'Après votre premier ordre, ce graphique montre la valeur de votre compte jour après jour face au marché, pour voir si vous le battez.', pending: 'Votre ordre est enregistré. Le graphique apparaîtra après la prochaine clôture.', note: "La courbe du marché part du même capital. Battre l'indice est plus difficile que gagner de l'argent : la plupart des fonds professionnels n'y parviennent pas sur la durée." },
}
const BENCH_ZH = { 'S&P 500': '标普500', 'CSI 300': '沪深300' }

const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)

export default function PaperPerformance({ accountKey, market, lang, refreshKey }) {
  const t = L[lang] || L.en
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    fetch('/api/paper/performance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: accountKey, market }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setData(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [accountKey, market, refreshKey])  // refreshKey changes after every trade

  const cur = market === 'us' ? '$' : '¥'
  const bench = lang === 'zh' ? (BENCH_ZH[data?.benchmark] || data?.benchmark) : data?.benchmark
  const points = data?.points || []

  const option = useMemo(() => points.length < 2 ? null : ({
    backgroundColor: 'transparent',
    grid: { top: 30, bottom: 26, left: 64, right: 14 },
    legend: { top: 0, textStyle: { color: '#8a94a6', fontSize: 11 }, itemWidth: 14, itemHeight: 3 },
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(10,15,26,0.95)', borderColor: 'rgba(138,180,248,0.2)', textStyle: { color: '#e5e7eb', fontSize: 12 },
      valueFormatter: (v) => `${cur}${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    },
    xAxis: { type: 'category', data: points.map((p) => p.date.slice(5)), axisLabel: { color: '#8a94a6', fontSize: 10 }, axisLine: { lineStyle: { color: 'rgba(138,180,248,0.15)' } } },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: '#8a94a6', fontSize: 10, formatter: (v) => `${cur}${v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : (v / 1e3).toFixed(1) + 'K'}` },
      splitLine: { lineStyle: { color: 'rgba(138,180,248,0.07)' } },
    },
    series: [
      { name: t.mine, type: 'line', data: points.map((p) => p.value), smooth: true, symbol: 'none', lineStyle: { width: 2.5, color: '#0ea5e9' }, areaStyle: { color: 'rgba(14,165,233,0.08)' } },
      { name: bench, type: 'line', data: points.map((p) => p.bench), smooth: true, symbol: 'none', lineStyle: { width: 1.8, color: '#8a94a6', type: 'dashed' } },
      { name: '', type: 'line', data: points.map(() => data.initial), symbol: 'none', lineStyle: { width: 1, color: 'rgba(138,180,248,0.25)' }, tooltip: { show: false }, silent: true },
    ],
  }), [points, bench, cur, t, data])

  const ahead = (data?.excess_pct ?? 0) >= 0
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</span>
        {data?.since && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.since(data.since)}</span>}
      </div>
      {!option ? (
        <p style={{ margin: '6px 0 2px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data?.pending ? t.pending : t.empty}</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '6px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
            <Stat label={t.ret} value={pct(data.return_pct)} color={data.return_pct >= 0 ? riseColor(market) : fallColor(market)} />
            <Stat label={bench} value={pct(data.bench_return_pct)} />
            <Stat label={t.dd} value={pct(data.max_drawdown_pct)} />
            <span style={{ alignSelf: 'center', fontSize: 12.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
              color: ahead ? '#0ea5e9' : '#f59e0b', background: ahead ? 'rgba(14,165,233,0.12)' : 'rgba(245,158,11,0.12)' }}>
              {ahead ? t.beat(pct(data.excess_pct).replace('+', '')) : t.lag(pct(data.excess_pct).replace('-', ''))}
            </span>
          </div>
          <ReactECharts option={option} notMerge style={{ height: 230 }} />
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.note}</p>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
