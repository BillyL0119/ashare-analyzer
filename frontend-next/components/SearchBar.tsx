'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { searchStocks, StockInfo } from '@/lib/api'

interface SearchBarProps {
  placeholder?: string
  onSelect?: (stock: StockInfo) => void
  className?: string
}

export default function SearchBar({ placeholder = '搜索股票代码或名称...', onSelect, className = '' }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const data = await searchStocks(q)
      setResults(data)
      setOpen(data.length > 0)
    } catch {
      setResults([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (stock: StockInfo) => {
    setQuery('')
    setOpen(false)
    setSelected(-1)
    if (onSelect) {
      onSelect(stock)
    } else {
      // Save to recent searches
      try {
        const recent: StockInfo[] = JSON.parse(localStorage.getItem('recentSearches') || '[]')
        const filtered = recent.filter(s => s.code !== stock.code)
        localStorage.setItem('recentSearches', JSON.stringify([stock, ...filtered].slice(0, 10)))
      } catch {}
      router.push(`/stock/${stock.code}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selected >= 0 && results[selected]) {
        handleSelect(results[selected])
      } else if (query.trim()) {
        // Navigate directly if it looks like a code
        router.push(`/stock/${query.trim()}`)
        setQuery('')
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(-1) }}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-9 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 text-gray-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto"
        >
          {results.map((stock, i) => (
            <button
              key={stock.code}
              onClick={() => handleSelect(stock)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors ${
                i === selected ? 'bg-gray-700' : ''
              } ${i === 0 ? 'rounded-t-lg' : ''} ${i === results.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              <span className="font-mono text-emerald-400 text-xs w-16 shrink-0">{stock.code}</span>
              <span className="text-gray-200 flex-1 text-left ml-2 truncate">{stock.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
