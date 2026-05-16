'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Home, GitCompare } from 'lucide-react'

export default function NavBar() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: '首页 Home', icon: Home },
    { href: '/compare', label: '对比 Compare', icon: GitCompare },
  ]

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🐂</span>
            <div className="flex flex-col leading-tight">
              <span className="text-emerald-400 font-bold text-sm tracking-wide">Best Friend Ashare</span>
              <span className="text-gray-400 text-xs">最佳股友</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1 ml-4">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right side - API indicator */}
          <div className="ml-auto flex items-center gap-2">
            <BarChart2 size={16} className="text-emerald-400" />
            <span className="text-xs text-gray-500 hidden sm:block">AkShare · 实时行情</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
