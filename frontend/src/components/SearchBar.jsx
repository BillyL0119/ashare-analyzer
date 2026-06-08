import { useState, useEffect, useRef, useCallback } from 'react'
import { searchStocks, searchUSStocks, getHotStocks } from '../api/stockApi'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { trackSearch } from '../utils/analytics'

function PctBadge({ val }) {
  if (val == null) return null
  const pos = val >= 0
  const color = pos ? '#22c55e' : '#ef4444'
  const sign = pos ? '+' : ''
  return (
    <span style={{
      color, fontSize: 11, fontWeight: 600,
      background: pos ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${color}33`,
      borderRadius: 4, padding: '1px 5px', flexShrink: 0,
    }}>
      {sign}{val.toFixed(2)}%
    </span>
  )
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [searching, setSearching] = useState(false)
  const [hotCN, setHotCN] = useState([])
  const [hotUS, setHotUS] = useState([])
  const [hotLoading, setHotLoading] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)
  const hotFetchedRef = useRef(false)

  const { addSymbol, selectedSymbols, market } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]
  const zh = lang === 'zh'

  const fetchHot = useCallback(async () => {
    if (hotFetchedRef.current) return
    hotFetchedRef.current = true
    setHotLoading(true)
    try {
      const [cnRes, usRes] = await Promise.allSettled([
        getHotStocks('cn'),
        getHotStocks('us'),
      ])
      if (cnRes.status === 'fulfilled') setHotCN(cnRes.value.data.slice(0, 8))
      if (usRes.status === 'fulfilled') setHotUS(usRes.value.data.slice(0, 8))
    } catch { /* ignore */ } finally {
      setHotLoading(false)
    }
  }, [])

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = market === 'us' ? await searchUSStocks(q) : await searchStocks(q)
      const raw = res.data.slice(0, 20)
      const normalized = market === 'us'
        ? raw.map((s) => ({ ...s, code: s.code || s.symbol }))
        : raw
      setResults(normalized)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [market])

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
    addSymbol(stock)
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); e.target.blur() }
  }

  const isFull = selectedSymbols.length >= 4
  const showHot = open && !query.trim()
  const showResults = open && query.trim() && results.length > 0

  const dropdownStyle = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 12,
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
    <div ref={wrapperRef} style={{ position: 'relative', width: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={isFull ? t.searchFull : (market === 'us' ? t.searchPlaceholderUS : t.searchPlaceholder)}
          disabled={isFull}
          style={{
            width: '100%',
            padding: '8px 14px',
            background: 'var(--bg-secondary)',
            border: `1px solid ${focused ? '#0ea5e9' : 'var(--border-primary)'}`,
            borderRadius: 24,
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            cursor: isFull ? 'not-allowed' : 'text',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.15)' : 'none',
            letterSpacing: '0.15px',
          }}
        />
        {searching && (
          <span style={{ color: 'var(--text-muted)', fontSize: 11, position: 'absolute', right: 14 }}>{t.searching}</span>
        )}
      </div>

      {/* Hot stocks panel */}
      {showHot && (
        <div style={dropdownStyle}>
          <div style={{ padding: '8px 12px 6px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', borderBottom: '1px solid var(--border-primary)' }}>
            {zh ? '热门股票' : 'Hot Stocks'}
          </div>
          {hotLoading ? (
            <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              {zh ? '加载中…' : 'Loading…'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {/* CN column */}
              <div style={{ borderRight: '1px solid var(--border-primary)' }}>
                <div style={{ padding: '5px 12px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-tertiary, var(--bg-secondary))' }}>
                  🇨🇳 {zh ? 'A股' : 'A-Share'}
                </div>
                {hotCN.map((s, i) => {
                  const alreadyAdded = selectedSymbols.find((sel) => sel.code === s.code)
                  return (
                    <div
                      key={s.code}
                      onClick={() => !alreadyAdded && !isFull && handleSelect(s)}
                      style={rowStyle(alreadyAdded || isFull)}
                      onMouseEnter={(e) => { if (!alreadyAdded && !isFull) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, width: 14, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      <PctBadge val={s.change_pct} />
                    </div>
                  )
                })}
              </div>
              {/* US column */}
              <div>
                <div style={{ padding: '5px 12px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-tertiary, var(--bg-secondary))' }}>
                  🇺🇸 {zh ? '美股' : 'US'}
                </div>
                {hotUS.map((s, i) => {
                  const alreadyAdded = selectedSymbols.find((sel) => sel.code === s.code)
                  return (
                    <div
                      key={s.code}
                      onClick={() => !alreadyAdded && !isFull && handleSelect(s)}
                      style={rowStyle(alreadyAdded || isFull)}
                      onMouseEnter={(e) => { if (!alreadyAdded && !isFull) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, width: 14, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ color: '#0ea5e9', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, flexShrink: 0 }}>{s.code}</span>
                      <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      <PctBadge val={s.change_pct} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search results panel */}
      {showResults && (
        <div style={{ ...dropdownStyle, maxHeight: 320, overflowY: 'auto' }}>
          {results.map((s) => {
            const alreadyAdded = selectedSymbols.find((sel) => sel.code === s.code)
            return (
              <div
                key={s.code}
                onClick={() => !alreadyAdded && handleSelect(s)}
                style={rowStyle(alreadyAdded)}
                onMouseEnter={(e) => { if (!alreadyAdded) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: '#0ea5e9', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, flexShrink: 0 }}>{s.code}</span>
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                {s.exchange && market === 'us' && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{s.exchange}</span>}
                <PctBadge val={s.change_pct} />
                {alreadyAdded && <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{t.added}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
