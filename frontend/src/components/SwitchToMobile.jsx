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
        padding: '10px 18px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(20,24,34,.92)', color: '#fff', fontSize: 14, fontWeight: 600,
        boxShadow: '0 6px 20px rgba(0,0,0,.4)', backdropFilter: 'blur(10px)' }}
    >
      {LABEL[lang] || LABEL.en}
    </button>
  )
}
