import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { searchStocks, searchUSStocks } from '../api/stockApi'
import useCompareStore from '../store/compareStore'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  const { addSymbol, selectedSymbols, market } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setSearching(true)
    try {
      const res = market === 'us' ? await searchUSStocks(q) : await searchStocks(q)
      setResults(res.data.slice(0, 20))
      setOpen(true)
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
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (stock) => {
    addSymbol(stock)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  const [focused, setFocused] = useState(false)
  const isFull = selectedSymbols.length >= 4

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isFull ? t.searchFull : t.searchPlaceholder}
          disabled={isFull}
          style={{
            width: '100%',
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${focused ? '#8ab4f8' : 'rgba(138,180,248,0.18)'}`,
            borderRadius: 24,
            color: '#e8eaed',
            fontSize: 13,
            outline: 'none',
            cursor: isFull ? 'not-allowed' : 'text',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(138,180,248,0.12)' : 'none',
            letterSpacing: '0.15px',
          }}
          onFocus={() => { setFocused(true); results.length > 0 && setOpen(true) }}
          onBlur={() => setFocused(false)}
        />
        {searching && (
          <span style={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap', position: 'absolute', right: 14 }}>{t.searching}</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(10,15,26,0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(138,180,248,0.15)',
            borderRadius: 12,
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(138,180,248,0.08)',
          }}
        >
          {results.map((s) => {
            const alreadyAdded = selectedSymbols.find((sel) => sel.code === s.code)
            return (
              <div
                key={s.code}
                onClick={() => !alreadyAdded && handleSelect(s)}
                style={{
                  padding: '10px 16px',
                  cursor: alreadyAdded ? 'default' : 'pointer',
                  color: alreadyAdded ? '#4a5568' : '#e8eaed',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.15s',
                  letterSpacing: '0.1px',
                }}
                onMouseEnter={(e) => {
                  if (!alreadyAdded) e.currentTarget.style.background = 'rgba(138,180,248,0.08)'
                }}
                onMouseLeave={(e) => {
                  if (!alreadyAdded) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ color: '#8ab4f8', fontFamily: 'monospace', fontSize: 12 }}>{s.code}</span>
                <span style={{ color: '#c9d1d9' }}>{s.name}</span>
                {alreadyAdded && <span style={{ fontSize: 11, color: '#4a5568' }}>{t.added}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
