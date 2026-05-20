import { useState } from 'react'

const MODAL_STYLE = {
  background: '#161b2e',
  borderRadius: 16,
  border: '1px solid rgba(138,180,248,0.3)',
  maxWidth: '92vw',
  position: 'relative',
  textAlign: 'center',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const OVERLAY = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export default function WelcomeModal({ onLangSelect }) {
  const savedLang = localStorage.getItem('bfs_lang')
  // If lang already saved, skip step 1 and go straight to announcement
  const [step, setStep] = useState(savedLang ? 2 : 1)
  const [lang, setLangState] = useState(savedLang || 'zh')
  const [open, setOpen] = useState(true)

  if (!open) return null

  const chooseLang = (l) => {
    localStorage.setItem('bfs_lang', l)
    setLangState(l)
    onLangSelect && onLangSelect(l)
    setStep(2)
  }

  // ── Step 1: Language selection ────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={OVERLAY}>
        <div style={{ ...MODAL_STYLE, padding: '36px 32px', width: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 18 }}>📈</div>
          <div style={{ fontSize: 15, color: '#c9d1d9', marginBottom: 28, lineHeight: 1.5 }}>
            请选择您的语言 / Please select your language
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { code: 'zh', flag: '🇨🇳', primary: '中文', secondary: 'Chinese' },
              { code: 'en', flag: '🇬🇧', primary: 'English', secondary: '英文' },
            ].map(({ code, flag, primary, secondary }) => (
              <LangButton
                key={code}
                flag={flag}
                primary={primary}
                secondary={secondary}
                onClick={() => chooseLang(code)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Announcement ──────────────────────────────────────────────────
  const isZh = lang === 'zh'
  return (
    <div style={OVERLAY}>
      <div style={{ ...MODAL_STYLE, padding: '32px 28px', width: 420 }}>
        <button
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(232,234,240,0.4)', fontSize: 20, lineHeight: 1,
          }}
        >✕</button>

        <div style={{ fontSize: 36, marginBottom: 20 }}>📈</div>

        <div style={{
          padding: '20px 16px', borderRadius: 10,
          background: isZh ? 'rgba(138,180,248,0.06)' : 'rgba(167,139,250,0.06)',
          border: `0.5px solid ${isZh ? 'rgba(138,180,248,0.15)' : 'rgba(167,139,250,0.15)'}`,
        }}>
          <h2 style={{ color: '#e8eaf0', fontSize: 15, fontWeight: 600, marginBottom: 12, margin: '0 0 12px' }}>
            {isZh ? '欢迎使用 Best Friend Stock' : 'Welcome to Best Friend Stock'}
          </h2>
          <p style={{ color: 'rgba(232,234,240,0.6)', fontSize: 13, lineHeight: 1.75, margin: 0 }}>
            {isZh
              ? '此网站仅供股票学习用途，由两名高中生 Billy 和 Frank 合作开发。'
              : 'This website is for stock learning purposes only, developed by two high school students, Billy and Frank.'
            }
          </p>
        </div>

        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 36px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', marginTop: 24,
          }}
        >
          {isZh ? '我知道了' : 'Got it'}
        </button>
      </div>
    </div>
  )
}

function LangButton({ flag, primary, secondary, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        padding: '22px 12px',
        borderRadius: 12,
        border: `1.5px solid ${hover ? 'rgba(138,180,248,0.5)' : 'rgba(138,180,248,0.18)'}`,
        background: hover
          ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.18))'
          : 'rgba(255,255,255,0.04)',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: hover ? '0 0 20px rgba(138,180,248,0.15)' : 'none',
        transform: hover ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 32 }}>{flag}</span>
      <span style={{
        fontSize: 16, fontWeight: 700,
        color: hover ? '#c084fc' : '#e8eaed',
        transition: 'color 0.18s',
      }}>
        {primary}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(232,234,240,0.45)' }}>
        {secondary}
      </span>
    </button>
  )
}
