import useCompareStore from '../store/compareStore'

// Peers suggested for the stock already on screen; anything else falls back to popular picks.
const US_PEERS = {
  NVDA: ['AMD', 'AVGO', 'INTC'], AMD: ['NVDA', 'INTC', 'AVGO'], AAPL: ['MSFT', 'GOOGL', 'AMZN'],
  MSFT: ['AAPL', 'GOOGL', 'AMZN'], GOOGL: ['META', 'MSFT', 'AMZN'], META: ['GOOGL', 'SNAP', 'PINS'],
  AMZN: ['WMT', 'MSFT', 'GOOGL'], TSLA: ['F', 'GM', 'RIVN'], JPM: ['BAC', 'GS', 'MS'],
}
const US_NAMES = {
  AMD: 'AMD', AVGO: 'Broadcom', INTC: 'Intel', NVDA: 'NVIDIA', MSFT: 'Microsoft', GOOGL: 'Alphabet',
  AMZN: 'Amazon', AAPL: 'Apple', META: 'Meta', SNAP: 'Snap', PINS: 'Pinterest', WMT: 'Walmart',
  F: 'Ford', GM: 'General Motors', RIVN: 'Rivian', BAC: 'Bank of America', GS: 'Goldman Sachs',
  MS: 'Morgan Stanley', SPY: 'S&P 500 ETF', QQQ: 'Nasdaq-100 ETF', TSLA: 'Tesla', JPM: 'JPMorgan',
}
const US_POPULAR = ['AAPL', 'MSFT', 'NVDA', 'SPY']
const CN_POPULAR = [
  { code: '600519', name: '贵州茅台' }, { code: '000858', name: '五粮液' },
  { code: '300750', name: '宁德时代' }, { code: '601318', name: '中国平安' },
]

const COPY = {
  zh: { title: '对比分析需要至少两只股票', body: '相关性、价差和走势对比都需要一组股票。可以从下面直接添加，或用顶部搜索框加入任意股票。', add: '添加' },
  en: { title: 'Comparison analysis needs at least two stocks', body: 'Correlation, spread and trend comparisons work on a pair. Add one below, or search for any stock at the top.', add: 'Add' },
}

export default function AddComparisonStocks({ lang = 'zh' }) {
  const { selectedSymbols, addSymbol, market } = useCompareStore()
  const c = COPY[lang] || COPY.en
  const held = new Set(selectedSymbols.map((s) => s.code))
  const first = selectedSymbols[0]?.code
  const picks = market === 'us'
    ? (US_PEERS[first] || US_POPULAR).filter((code) => !held.has(code)).map((code) => ({ code, name: US_NAMES[code] || code }))
    : CN_POPULAR.filter((s) => !held.has(s.code))

  return (
    <div style={{
      maxWidth: 520, margin: '32px auto', padding: '24px 26px', textAlign: 'center',
      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 14,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{c.title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{c.body}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {picks.slice(0, 4).map((s) => (
          <button
            key={s.code}
            className="bfs-add-peer"
            onClick={() => addSymbol(s)}
            style={{
              padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'rgba(14,165,233,0.10)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.35)',
            }}
          >
            + {market === 'us' ? s.code : s.name}
            {s.name !== s.code && (
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{market === 'us' ? s.name : s.code}</span>
            )}
          </button>
        ))}
      </div>
      <style>{`.bfs-add-peer:hover { background: rgba(14,165,233,0.18) !important; }
        .bfs-add-peer:focus-visible { outline: 2px solid #0ea5e9; outline-offset: 2px; }`}</style>
    </div>
  )
}
