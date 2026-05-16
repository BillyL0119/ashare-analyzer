'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Clock, Star, X, ExternalLink, Loader2 } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import { getWatchlist, removeFromWatchlist, WatchlistItem, StockInfo } from '@/lib/api'

export default function HomePage() {
  const [recentSearches, setRecentSearches] = useState<StockInfo[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [watchlistLoading, setWatchlistLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches')
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
    loadWatchlist()
  }, [])

  const loadWatchlist = async () => {
    setWatchlistLoading(true)
    try {
      const data = await getWatchlist()
      setWatchlist(data)
    } catch {
      // Supabase might not be configured; ignore
    } finally {
      setWatchlistLoading(false)
    }
  }

  const handleRemoveRecent = (code: string) => {
    const updated = recentSearches.filter(s => s.code !== code)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const handleRemoveWatchlist = async (code: string) => {
    try {
      await removeFromWatchlist(code)
      setWatchlist(prev => prev.filter(s => s.code !== code))
    } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="flex justify-center items-center gap-3">
          <span className="text-5xl">🐂</span>
          <div className="text-left">
            <h1 className="text-3xl font-bold text-emerald-400">Best Friend Ashare</h1>
            <p className="text-xl text-gray-400">最佳股友 · A股分析平台</p>
          </div>
        </div>
        <p className="text-gray-400 max-w-xl mx-auto text-sm">
          专业的A股市场分析工具，提供K线图表、技术指标、蒙特卡洛模拟等功能。
          数据来源于 AkShare，仅供学习研究使用。
        </p>
        <div className="max-w-lg mx-auto">
          <SearchBar
            placeholder="搜索股票代码或名称，如 600519 贵州茅台..."
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          {[
            { code: '600519', name: '贵州茅台' },
            { code: '000001', name: '平安银行' },
            { code: '300750', name: '宁德时代' },
            { code: '601318', name: '中国平安' },
            { code: '000858', name: '五粮液' },
          ].map(s => (
            <Link
              key={s.code}
              href={`/stock/${s.code}`}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-600 rounded-full text-gray-300 hover:text-emerald-400 transition-colors"
            >
              {s.name} <span className="text-gray-500 text-xs ml-1">{s.code}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '📈',
              title: 'K线图表',
              desc: '专业K线图，支持日线/周线/月线，成交量叠加显示',
            },
            {
              icon: '📊',
              title: '技术指标',
              desc: 'MA均线、MACD、RSI、布林带，多指标联动分析',
            },
            {
              icon: '🎲',
              title: '蒙特卡洛',
              desc: '基于历史数据的随机路径模拟，量化未来价格分布',
            },
          ].map(card => (
            <div key={card.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="text-2xl mb-2">{card.icon}</div>
              <h3 className="font-semibold text-gray-100 mb-1">{card.title}</h3>
              <p className="text-xs text-gray-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-400">最近搜索</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map(s => (
              <div key={s.code} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-1 py-1.5">
                <Link
                  href={`/stock/${s.code}`}
                  className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-emerald-400 transition-colors"
                >
                  <span className="font-mono text-xs text-gray-500">{s.code}</span>
                  <span>{s.name}</span>
                </Link>
                <button
                  onClick={() => handleRemoveRecent(s.code)}
                  className="ml-1 p-0.5 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Watchlist */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-400">自选股</h2>
          </div>
          {watchlistLoading && <Loader2 size={14} className="animate-spin text-gray-600" />}
        </div>

        {!watchlistLoading && watchlist.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Star size={28} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">暂无自选股</p>
            <p className="text-gray-600 text-xs mt-1">在股票详情页点击"加入自选"添加</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {watchlist.map(item => (
              <div
                key={item.code}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3 transition-colors group"
              >
                <Link href={`/stock/${item.code}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-100 text-sm">{item.name}</span>
                      <ExternalLink size={12} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="font-mono text-xs text-emerald-400">{item.code}</span>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemoveWatchlist(item.code)}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                  title="移出自选"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
