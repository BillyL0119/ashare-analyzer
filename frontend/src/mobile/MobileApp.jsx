import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './mobile.css'
import { useT } from './i18n'
import { Icon } from './icons'
import Settings from './Settings'
import Market from './tabs/Market'
import { trackFeature, trackVisit } from '../utils/analytics'
import useAuthStore from '../store/authStore'
import useLangStore from '../store/langStore'

const StockDetail = lazy(() => import('./tabs/StockDetail'))
const Learning = lazy(() => import('./tabs/Learning'))
const AITeacher = lazy(() => import('./tabs/AITeacher'))
const Paper = lazy(() => import('./tabs/Paper'))
const TimeMachine = lazy(() => import('./tabs/TimeMachine'))
const Cases = lazy(() => import('./tabs/Cases'))
const Classes = lazy(() => import('./tabs/Classes'))

// Tab titles, the same wording as the desktop site (a stock page sets its own)
const TITLES = {
  zh: {
    analysis: 'BestFriendStock | 免费美股A股分析 · AI智能投资 · 模拟炒股 · 经济学学习',
    study: 'BestFriendStock | 经济学学习中心 - A-Level IB AP IGCSE 与美股入门',
    paper_trading: 'BestFriendStock | 模拟炒股 - 用虚拟资金练习美股与A股交易',
    ai_tutor: 'BestFriendStock | AI经济学老师 - 免费AI经济学与股票辅导',
    time_machine: 'BestFriendStock | 历史穿越交易 - 回到2008金融危机、2020疫情暴跌、2015股灾做投资决定',
    cases: 'BestFriendStock | 经济学案例库 - IB、A-Level、AP 论文可用的真实新闻案例',
    class: 'BestFriendStock | 班级 - 老师布置作业、查看全班模拟交易与学习进度',
  },
  en: {
    analysis: 'Best Friend Stock | Free US & China Stock Analysis, Paper Trading and Economics',
    study: 'Best Friend Stock | Economics Study Center: A-Level, IB, AP, IGCSE',
    paper_trading: 'Best Friend Stock | Paper Trading with $1M Virtual Cash',
    ai_tutor: 'Best Friend Stock | AI Economics Teacher',
    time_machine: 'Best Friend Stock | History Time Machine: Trade Through 2008, 2020 and 2022',
    cases: 'Best Friend Stock | Economics Case Library: Real-World Examples for IB, A-Level and AP Essays',
    class: 'Best Friend Stock | Classes: Assignments and Progress for Economics Teachers',
  },
}

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
  // Signed-in sessions (from either UI) carry over: paper trading uses the same account as the desktop site
  useEffect(() => {
    let cleanup
    useAuthStore.getState().init().then((fn) => { cleanup = fn })
    return () => { cleanup?.() }
  }, [])
  const loc = useLocation()
  const inStock = loc.pathname.startsWith('/stock/')
  const fullScreen = inStock || /^\/study\/.+/.test(loc.pathname)

  useEffect(() => {
    document.documentElement.classList.add('m-root')
    trackVisit('home')
    return () => document.documentElement.classList.remove('m-root')
  }, [])

  // Same feature names the desktop site reports, so both UIs show up in one usage chart.
  const section = loc.pathname === '/' ? 'analysis' : loc.pathname.startsWith('/study') ? 'study' : loc.pathname === '/paper' ? 'paper_trading' : loc.pathname === '/time-machine' ? 'time_machine' : loc.pathname === '/cases' ? 'cases' : loc.pathname.startsWith('/class') ? 'class' : loc.pathname === '/ai-teacher' ? 'ai_tutor' : null
  useEffect(() => { if (section) trackFeature(section) }, [section])
  const lang = useLangStore((st) => st.lang)
  useEffect(() => {
    if (section) document.title = (lang === 'zh' ? TITLES.zh : TITLES.en)[section]
  }, [section, lang])

  return (
    <div className="m-app">
      <Suspense fallback={<div className="m-scroll" />}>
        <Routes>
          <Route path="/" element={<Page><Market onSettings={() => setSettings(true)} /></Page>} />
          <Route path="/stock/:market/:code" element={<Page bare><StockDetail /></Page>} />
          <Route path="/study/*" element={<Page bare={fullScreen}><Learning /></Page>} />
          <Route path="/ai-teacher" element={<AITeacher />} />
          <Route path="/paper" element={<Page><Paper /></Page>} />
          <Route path="/time-machine" element={<Page><TimeMachine /></Page>} />
          <Route path="/cases" element={<Page><Cases /></Page>} />
          <Route path="/class" element={<Page><Classes /></Page>} />
          <Route path="/class/:code" element={<Page><Classes /></Page>} />
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
