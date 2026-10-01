import { useState } from 'react'
import useAuthStore from '../store/authStore'

// ── Inline SVG flag components ─────────────────────────────────────────

function IconChart({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      <polyline points="2,17 8.5,10.5 13.5,15.5 22,7"
        stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16,7 22,7 22,13"
        stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function FlagCN({ height = 24 }) {
  return (
    <svg width={height * 1.5} height={height} viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#DE2910"/>
      <polygon fill="#FFDE00"
        points="6,3.5 6.79,5.92 9.33,5.92 7.27,7.41 8.06,9.83 6,8.34 3.94,9.83 4.73,7.41 2.67,5.92 5.21,5.92"/>
      <polygon fill="#FFDE00"
        points="12,0.8 12.27,1.63 13.14,1.63 12.44,2.14 12.71,2.97 12,2.46 11.29,2.97 11.56,2.14 10.86,1.63 11.73,1.63"/>
      <polygon fill="#FFDE00"
        points="14,3.8 14.27,4.63 15.14,4.63 14.44,5.14 14.71,5.97 14,5.46 13.29,5.97 13.56,5.14 12.86,4.63 13.73,4.63"/>
      <polygon fill="#FFDE00"
        points="14,7.8 14.27,8.63 15.14,8.63 14.44,9.14 14.71,9.97 14,9.46 13.29,9.97 13.56,9.14 12.86,8.63 13.73,8.63"/>
      <polygon fill="#FFDE00"
        points="12,10.8 12.27,11.63 13.14,11.63 12.44,12.14 12.71,12.97 12,12.46 11.29,12.97 11.56,12.14 10.86,11.63 11.73,11.63"/>
    </svg>
  )
}

function FlagUS({ height = 24 }) {
  const strH = 20 / 13
  return (
    <svg width={height * 1.9} height={height} viewBox="0 0 38 20"
      xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="38" height="20" fill="#fff"/>
      {[0, 2, 4, 6, 8, 10, 12].map(i => (
        <rect key={i} x="0" y={i * strH} width="38" height={strH} fill="#B22234"/>
      ))}
      <rect x="0" y="0" width="15.2" height={7 * strH} fill="#3C3B6E"/>
      {[0, 1, 2, 3, 4].map(row => [0, 1, 2, 3, 4].map(col => (
        <circle key={`a${row}${col}`}
          cx={1.52 + col * 2.44} cy={0.75 + row * 2.1} r="0.5" fill="#fff"/>
      )))}
      {[0, 1, 2, 3].map(row => [0, 1, 2, 3].map(col => (
        <circle key={`b${row}${col}`}
          cx={2.74 + col * 2.44} cy={1.8 + row * 2.1} r="0.5" fill="#fff"/>
      )))}
    </svg>
  )
}

function FlagJP({ height = 24 }) {
  return (
    <svg width={height * 1.5} height={height} viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#ffffff"/>
      <circle cx="15" cy="10" r="6" fill="#BC002D"/>
    </svg>
  )
}

function FlagKR({ height = 24 }) {
  return (
    <svg width={height * 1.5} height={height} viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#ffffff"/>
      {/* Taeguk circle — red half */}
      <path d="M15,5 A5,5 0 0,1 15,15 A2.5,2.5 0 0,0 15,10 A2.5,2.5 0 0,1 15,5" fill="#CD2E3A"/>
      {/* Taeguk circle — blue half */}
      <path d="M15,5 A5,5 0 0,0 15,15 A2.5,2.5 0 0,1 15,10 A2.5,2.5 0 0,0 15,5" fill="#003478"/>
      {/* Top-left trigram (건) */}
      <rect x="1.5" y="2.5" width="5" height="1" fill="#000"/>
      <rect x="1.5" y="4.2" width="5" height="1" fill="#000"/>
      <rect x="1.5" y="5.9" width="5" height="1" fill="#000"/>
      {/* Top-right trigram (이) */}
      <rect x="23.5" y="2.5" width="2" height="1" fill="#000"/>
      <rect x="26.5" y="2.5" width="2" height="1" fill="#000"/>
      <rect x="23.5" y="4.2" width="5" height="1" fill="#000"/>
      <rect x="23.5" y="5.9" width="2" height="1" fill="#000"/>
      <rect x="26.5" y="5.9" width="2" height="1" fill="#000"/>
      {/* Bottom-left trigram (감) */}
      <rect x="1.5" y="13.1" width="5" height="1" fill="#000"/>
      <rect x="1.5" y="14.8" width="2" height="1" fill="#000"/>
      <rect x="4.5" y="14.8" width="2" height="1" fill="#000"/>
      <rect x="1.5" y="16.5" width="5" height="1" fill="#000"/>
      {/* Bottom-right trigram (곤) */}
      <rect x="23.5" y="13.1" width="2" height="1" fill="#000"/>
      <rect x="26.5" y="13.1" width="2" height="1" fill="#000"/>
      <rect x="23.5" y="14.8" width="2" height="1" fill="#000"/>
      <rect x="26.5" y="14.8" width="2" height="1" fill="#000"/>
      <rect x="23.5" y="16.5" width="2" height="1" fill="#000"/>
      <rect x="26.5" y="16.5" width="2" height="1" fill="#000"/>
    </svg>
  )
}

function FlagFR({ height = 24 }) {
  return (
    <svg width={height * 1.5} height={height} viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#ffffff"/>
      <rect x="0" y="0" width="10" height="20" fill="#002395"/>
      <rect x="20" y="0" width="10" height="20" fill="#ED2939"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { code: 'zh', nativeLabel: '中文',     subLabel: 'Chinese',  Flag: FlagCN },
  { code: 'en', nativeLabel: 'English',  subLabel: '英文',     Flag: FlagUS },
  { code: 'ja', nativeLabel: '日本語',   subLabel: 'Japanese', Flag: FlagJP },
  { code: 'ko', nativeLabel: '한국어',   subLabel: 'Korean',   Flag: FlagKR },
  { code: 'fr', nativeLabel: 'Français', subLabel: 'French',   Flag: FlagFR },
]

const WELCOME_TEXT = {
  zh: { title: '欢迎使用 Best Friend Stock', body: '此网站仅供股票学习用途，由两名高中生 Billy 和 Frank 合作开发。', cta: '我知道了' },
  en: { title: 'Welcome to Best Friend Stock', body: 'This website is for stock learning purposes only, developed by two high school students, Billy and Frank.', cta: 'Got it' },
  ja: { title: 'Best Friend Stock へようこそ', body: 'このウェブサイトは株式学習のみを目的としており、高校生の Billy と Frank が共同開発しました。', cta: '了解しました' },
  ko: { title: 'Best Friend Stock에 오신 것을 환영합니다', body: '이 웹사이트는 주식 학습 목적으로만 사용되며, 고등학생인 Billy와 Frank가 공동 개발했습니다.', cta: '확인' },
  fr: { title: 'Bienvenue sur Best Friend Stock', body: "Ce site est uniquement destiné à l'apprentissage boursier, développé par deux lycéens, Billy et Frank.", cta: "C'est compris" },
}

export default function WelcomeModal({ onLangSelect }) {
  const { user, loading } = useAuthStore()
  const [step, setStep] = useState(1)
  const [selectedLang, setSelectedLang] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  // Show only after auth resolves and user is NOT logged in.
  // Logged-in users get their language from their account — no modal needed.
  // Unauthenticated users always see the picker on every visit (no localStorage persistence).
  const open = !loading && !user && !dismissed

  if (!open) return null

  const handleLangSelect = (lang) => {
    setSelectedLang(lang)
    setStep(2)
    if (onLangSelect) onLangSelect(lang)
  }

  const handleClose = () => setDismissed(true)

  const welcomeText = WELCOME_TEXT[selectedLang] ?? WELCOME_TEXT.en

  if (step === 1) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#161b2e', borderRadius: 16,
          border: '1px solid rgba(14,165,233,0.3)',
          padding: '40px 32px', width: 480, maxWidth: '94vw',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <IconChart size={40} />
          </div>
          <p style={{ color: 'rgba(232,234,240,0.7)', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            请选择您的语言 · Please select your language
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 12,
          }}>
            {LANG_OPTIONS.map(({ code, nativeLabel, subLabel, Flag }) => (
              <button
                key={code}
                onClick={() => handleLangSelect(code)}
                style={{
                  padding: '16px 10px', borderRadius: 12,
                  background: 'rgba(14,165,233,0.06)',
                  border: '1px solid rgba(14,165,233,0.2)',
                  cursor: 'pointer', color: '#e8eaf0',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(99,102,241,0.2)'
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(14,165,233,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(14,165,233,0.2)'
                }}
              >
                <Flag height={22} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>{nativeLabel}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,234,240,0.4)' }}>{subLabel}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#161b2e', borderRadius: 16,
        border: '1px solid rgba(14,165,233,0.3)',
        padding: '32px 28px', width: 400, maxWidth: '92vw',
        position: 'relative', textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <button onClick={handleClose} style={{
          position: 'absolute', top: 14, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(232,234,240,0.4)', fontSize: 20, lineHeight: 1,
        }}>&#x2715;</button>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <IconChart size={36} />
        </div>
        <h2 style={{ color: '#e8eaf0', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          {welcomeText.title}
        </h2>
        <p style={{ color: 'rgba(232,234,240,0.6)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          {welcomeText.body}
        </p>
        <button onClick={handleClose} style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 36px', fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}>
          {welcomeText.cta}
        </button>
      </div>
    </div>
  )
}
