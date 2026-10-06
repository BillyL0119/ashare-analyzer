import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './mobile.css'
import { useT } from './i18n'
import { Icon } from './icons'
import Settings from './Settings'
import Market from './tabs/Market'
import { trackFeature, trackVisit } from '../utils/analytics'

const StockDetail = lazy(() => import('./tabs/StockDetail'))
const Learning = lazy(() => import('./tabs/Learning'))
const AITeacher = lazy(() => import('./tabs/AITeacher'))
const Paper = lazy(() => import('./tabs/Paper'))

function TabBar() {
  const t = useT()
  const tabs = [
    { to: '/', end: true, label: t('行情'), icon: Icon.chart },
    { to: '/study', label: t('学习中心'), icon: Icon.book },
    { to: '/ai-teacher', label: t('AI老师'), icon: Icon.spark },
    { to: '/paper', label: t('模拟盘'), icon: Icon.coin },
  ]
  return (
    <nav className="m-tabbar" role="tablist">
      {tabs.map((x) => (
        <NavLink key={x.to} to={x.to} end={x.end} className="m-tab" role="tab">{x.icon}<span>{x.label}</span></NavLink>
      ))}
    </nav>
  )
}

export default function MobileApp() {
  const [settings, setSettings] = useState(false)
  const loc = useLocation()
  const inStock = loc.pathname.startsWith('/stock/')
  const fullScreen = inStock || /^\/study\/.+/.test(loc.pathname)

  useEffect(() => {
    document.documentElement.classList.add('m-root')
    trackVisit('home')
    return () => document.documentElement.classList.remove('m-root')
  }, [])

  // Same feature names the desktop site reports, so both UIs show up in one usage chart.
  const section = loc.pathname === '/' ? 'analysis' : loc.pathname.startsWith('/study') ? 'study' : loc.pathname === '/paper' ? 'paper_trading' : loc.pathname === '/ai-teacher' ? 'ai_tutor' : null
  useEffect(() => { if (section) trackFeature(section) }, [section])

  return (
    <div className="m-app">
      <Suspense fallback={<div className="m-scroll" />}>
        <Routes>
          <Route path="/" element={<Page><Market onSettings={() => setSettings(true)} /></Page>} />
          <Route path="/stock/:market/:code" element={<Page bare><StockDetail /></Page>} />
          <Route path="/study/*" element={<Page bare={fullScreen}><Learning /></Page>} />
          <Route path="/ai-teacher" element={<AITeacher />} />
          <Route path="/paper" element={<Page><Paper /></Page>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!inStock && <TabBar />}
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  )
}

function Page({ children, bare }) {
  return <div className={'m-scroll' + (bare ? ' m-no-tabbar' : '')} key={useLocation().pathname}>{children}</div>
}
