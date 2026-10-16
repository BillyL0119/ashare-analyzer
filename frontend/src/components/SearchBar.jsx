import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { searchStocks, searchUSStocks, getHotStocks, searchIntlStocks, getIntlHot } from '../api/stockApi'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { trackSearch } from '../utils/analytics'
import { riseColor, fallColor } from '../utils/chartHelpers'
import { MARKET_TINT, marketLabel, localName } from '../utils/markets'

// HK / Japan rows from /api/{hk,jp}/search and /hot, in the shape the rest of the bar uses
const intlRow = (s, m, lang) => ({ ...s, code: s.symbol, name: localName(s, lang, m), _market: m })

function PctBadge({ val, market }) {
  if (val == null) return null
  const pos = val >= 0
  const color = pos ? riseColor(market) : fallColor(market)
  const sign = pos ? '+' : ''
  return (
    <span style={{
      color, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
      background: `${color}1a`,
      border: `1px solid ${color}33`,
      borderRadius: 4, padding: '1px 5px', flexShrink: 0,
    }}>
      {sign}{val.toFixed(2)}%
    </span>
  )
}

export default function SearchBar({ fullWidth = false, autoFocus = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [searching, setSearching] = useState(false)
  const [hotCN, setHotCN] = useState([])
  const [hotUS, setHotUS] = useState([])
  const [hotIntl, setHotIntl] = useState({ hk: [], jp: [] })
  const [hotLoading, setHotLoading] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)
  const hotFetchedRef = useRef(false)

  const { addSymbol, switchMarketAndAddSymbol, selectedSymbols, market } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang] || T.en
  const langRef = useRef(lang); langRef.current = lang
  const marketRef = useRef(market); marketRef.current = market

  const fetchHot = useCallback(async () => {
    if (hotFetchedRef.current) return
    hotFetchedRef.current = true
    setHotLoading(true)
    try {
      const [cnRes, usRes, hkRes, jpRes] = await Promise.allSettled([
        getHotStocks('cn'),
        getHotStocks('us'),
        getIntlHot('hk'),
        getIntlHot('jp'),
      ])
      if (cnRes.status === 'fulfilled') setHotCN(cnRes.value.data.slice(0, 8))
      if (usRes.status === 'fulfilled') setHotUS(usRes.value.data.slice(0, 8))
      setHotIntl({
        hk: hkRes.status === 'fulfilled' ? hkRes.value.data.slice(0, 8) : [],
        jp: jpRes.status === 'fulfilled' ? jpRes.value.data.slice(0, 8) : [],
      })
    } catch { /* ignore */ } finally {
      setHotLoading(false)
    }
  }, [])

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const [cnRes, usRes, hkRes, jpRes] = await Promise.allSettled([
        searchStocks(q),
        searchUSStocks(q),
        searchIntlStocks('hk', q),
        searchIntlStocks('jp', q),
      ])
      const lists = {
        cn: cnRes.status === 'fulfilled' ? cnRes.value.data.slice(0, 10).map((s) => ({ ...s, _market: 'cn' })) : [],
        us: usRes.status === 'fulfilled' ? usRes.value.data.slice(0, 10).map((s) => ({ ...s, code: s.code || s.symbol, _market: 'us' })) : [],
        hk: hkRes.status === 'fulfilled' ? hkRes.value.data.slice(0, 6).map((s) => intlRow(s, 'hk', langRef.current)) : [],
        jp: jpRes.status === 'fulfilled' ? jpRes.value.data.slice(0, 6).map((s) => intlRow(s, 'jp', langRef.current)) : [],
      }
      // The market being browsed comes first
      const order = [marketRef.current, ...['cn', 'us', 'hk', 'jp'].filter((m) => m !== marketRef.current)]
      setResults(order.flatMap((m) => lists[m]))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  // Clear a leftover query when the user navigates elsewhere (e.g. opens a stock from a card).
  const { pathname } = useLocation()
  useEffect(() => {
    setQuery('')
    setResults([])
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
  }, [query, doSearch])

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (stock) => {
    const targetMarket = stock._market || market
    if (targetMarket !== market) {
      switchMarketAndAddSymbol(targetMarket, stock)
    } else {
      addSymbol(stock)
    }
    trackSearch(stock.code)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  const handleFocus = () => {
    setFocused(true)
    setOpen(true)
    fetchHot()
  }

  // Opened from the phone header's search icon: show the hot list straight away
  useEffect(() => { if (autoFocus) handleFocus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); e.target.blur() }
  }

  const isFull = selectedSymbols.length >= 4
  const showHot = open && !query.trim()
  const showResults = open && query.trim() && results.length > 0
  const showNoResults = open && query.trim() && !searching && results.length === 0

  const dropdownStyle = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius)',
    zIndex: 1000,
    boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  }

  const rowStyle = (disabled) => ({
    padding: '8px 12px',
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    borderBottom: '1px solid var(--border-primary)',
    transition: 'background 0.12s',
    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  })

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: fullWidth ? '100%' : 'clamp(150px, 22vw, 300px)', minWidth: 0, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={isFull ? t.searchFull : t.searchPlaceholder}
          disabled={isFull}
          style={{
            width: '100%',
            padding: '8px 14px',
            background: 'var(--bg-secondary)',
            border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-primary)'}`,
            borderRadius: 'var(--radius)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            cursor: isFull ? 'not-allowed' : 'text',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            
            letterSpacing: '0.15px',
          }}
        />
        {searching && (
          <span style={{ color: 'var(--text-muted)', fontSize: 13, position: 'absolute', right: 14 }}>{t.searching}</span>
        )}
      </div>

      {/* Hot stocks panel */}
      {showHot && (
        <div style={{ ...dropdownStyle, right: 'auto', width: fullWidth ? '100%' : 'min(520px, calc(100vw - 32px))' }}>
          <div style={{ padding: '8px 12px 6px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', borderBottom: '1px solid var(--border-primary)' }}>
            {t.sbHot}
          </div>
          {hotLoading ? (
            <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              {t.loading}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
              {(market === 'us' ? ['us', 'cn'] : market === 'cn' ? ['cn', 'us'] : [market, 'us']).map((m, col) => (
                <div key={m} style={{ minWidth: 0, borderLeft: col ? '1px solid var(--border-primary)' : 'none' }}>
                  <div style={{ padding: '5px 12px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-tertiary, var(--bg-secondary))' }}>
                    {m === 'us' ? t.marketUS : m === 'cn' ? t.marketCN : marketLabel(m, lang)}
                  </div>
                  {(m === 'us' ? hotUS : m === 'cn' ? hotCN : hotIntl[m].map((x) => intlRow(x, m, lang))).map((s, i) => {
                    const alreadyAdded = selectedSymbols.find((sel) => sel.code === s.code)
                    return (
                      <div
                        key={s.code}
                        onClick={() => !alreadyAdded && !isFull && handleSelect({ ...s, _market: m })}
                        style={rowStyle(alreadyAdded || isFull)}
                        onMouseEnter={(e) => { if (!alreadyAdded && !isFull) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 14, flexShrink: 0 }}>{i + 1}</span>
                        {m !== 'cn' && (
                          <span style={{ color: 'var(--accent)', fontFamily: 'var(--sans)', fontSize: 13, flexShrink: 0 }}>{s.code}</span>
                        )}
                        <span style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        <PctBadge val={s.change_pct} market={m} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search results panel */}
      {showResults && (
        <div style={{ ...dropdownStyle, maxHeight: 320, overflowY: 'auto' }}>
          {results.map((s) => {
            const alreadyAdded = selectedSymbols.find((sel) => sel.code === s.code)
            const tint = MARKET_TINT[s._market] || MARKET_TINT.us
            return (
              <div
                key={`${s._market}-${s.code}`}
                onClick={() => !alreadyAdded && !isFull && handleSelect(s)}
                style={rowStyle(alreadyAdded || isFull)}
                onMouseEnter={(e) => { if (!alreadyAdded && !isFull) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--sans)', fontSize: 13, flexShrink: 0 }}>{s.code}</span>
                <span style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                  background: `${tint}1f`, color: tint,
                }}>
                  {s._market === 'us' ? 'US' : s._market === 'cn' ? (lang === 'zh' ? 'A股' : 'CN') : marketLabel(s._market, lang)}
                </span>
                <PctBadge val={s.change_pct} market={s._market} />
                {alreadyAdded && <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{t.added}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* No results panel */}
      {showNoResults && (
        <div style={dropdownStyle}>
          <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            {t.searchNoResults}
          </div>
        </div>
      )}
    </div>
  )
}
