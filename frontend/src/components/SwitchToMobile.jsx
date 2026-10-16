import { parseUserAgent, setUIOverride, mobileSupports } from '../utils/device'
import useLangStore from '../store/langStore'

const LABEL = { zh: '切换到手机版', en: 'Mobile site', ja: 'モバイル版', ko: '모바일 버전', fr: 'Version mobile' }

/** Shown only to phone visitors who chose the desktop site, so they can get back to the app-style UI. */
export default function SwitchToMobile() {
  const lang = useLangStore((s) => s.lang)
  if (!parseUserAgent(navigator.userAgent).phone || !mobileSupports(window.location.pathname)) return null
  return (
    <button
      onClick={() => { setUIOverride('mobile'); window.location.reload() }}
      style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', zIndex: 9999,
        padding: '10px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)', fontSize: 15, fontWeight: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,.3)' }}
    >
      {LABEL[lang] || LABEL.en}
    </button>
  )
}
