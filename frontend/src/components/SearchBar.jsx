import { useState, useEffect, useRef, useCallback } from 'react'
import { searchStocks } from '../api/stockApi'
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

  const { addSymbol, selectedSymbols } = useCompareStore()
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setSearching(true)
    try {
      const res = await searchStocks(q)
      setResults(res.data.slice(0, 20))
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

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

  const isFull = selectedSymbols.length >= 4

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isFull ? t.searchFull : t.searchPlaceholder}
          disabled={isFull}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 6,
            color: '#c9d1d9',
            fontSize: 14,
            outline: 'none',
            cursor: isFull ? 'not-allowed' : 'text',
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {searching && (
          <span style={{ color: '#8b949e', fontSize: 12, whiteSpace: 'nowrap' }}>{t.searching}</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 6,
            marginTop: 4,
            maxHeight: 300,
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {results.map((s) => {
            const alreadyAdded = selectedSymbols.find((sel) => sel.code === s.code)
            return (
              <div
                key={s.code}
                onClick={() => !alreadyAdded && handleSelect(s)}
                style={{
                  padding: '10px 14px',
                  cursor: alreadyAdded ? 'default' : 'pointer',
                  color: alreadyAdded ? '#484f58' : '#c9d1d9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  borderBottom: '1px solid #21262d',
                  background: alreadyAdded ? '#0d1117' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!alreadyAdded) e.currentTarget.style.background = '#21262d'
                }}
                onMouseLeave={(e) => {
                  if (!alreadyAdded) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ color: '#64b5f6', fontFamily: 'monospace' }}>{s.code}</span>
                <span>{s.name}</span>
                {alreadyAdded && <span style={{ fontSize: 11, color: '#484f58' }}>{t.added}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
