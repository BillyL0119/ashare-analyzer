import { useState } from 'react'

export default function WelcomeModal({ onLangSelect }) {
  const savedLang = localStorage.getItem('bfs_lang')
  const [step, setStep] = useState(1)
  const [selectedLang, setSelectedLang] = useState(savedLang || null)
  const [open, setOpen] = useState(true)

  if (!open) return null

  const handleLangSelect = (lang) => {
    localStorage.setItem('bfs_lang', lang)
    setSelectedLang(lang)
    setStep(2)
    if (onLangSelect) onLangSelect(lang)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const isZh = selectedLang === 'zh' || (!selectedLang)

  if (step === 1) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#161b2e', borderRadius: 16,
          border: '1px solid rgba(138,180,248,0.3)',
          padding: '40px 32px', width: 420, maxWidth: '92vw',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>📈</div>
          <p style={{ color: 'rgba(232,234,240,0.7)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
            请选择您的语言<br />
            <span style={{ fontSize: 13, color: 'rgba(232,234,240,0.4)' }}>Please select your language</span>
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => handleLangSelect('zh')} style={{
              flex: 1, padding: '20px 16px', borderRadius: 12,
              background: 'rgba(138,180,248,0.06)',
              border: '1px solid rgba(138,180,248,0.2)',
              cursor: 'pointer', color: '#e8eaf0',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(138,180,248,0.06)'}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🇨🇳</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>中文</div>
              <div style={{ fontSize: 12, color: 'rgba(232,234,240,0.4)', marginTop: 4 }}>Chinese</div>
            </button>
            <button onClick={() => handleLangSelect('en')} style={{
              flex: 1, padding: '20px 16px', borderRadius: 12,
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.2)',
              cursor: 'pointer', color: '#e8eaf0',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.06)'}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🇬🇧</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>English</div>
              <div style={{ fontSize: 12, color: 'rgba(232,234,240,0.4)', marginTop: 4 }}>英文</div>
            </button>
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
        border: '1px solid rgba(138,180,248,0.3)',
        padding: '32px 28px', width: 400, maxWidth: '92vw',
        position: 'relative', textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <button onClick={handleClose} style={{
          position: 'absolute', top: 14, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(232,234,240,0.4)', fontSize: 20, lineHeight: 1,
        }}>✕</button>
        <div style={{ fontSize: 36, marginBottom: 16 }}>📈</div>
        <h2 style={{ color: '#e8eaf0', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          {isZh ? '欢迎使用 Best Friend Stock' : 'Welcome to Best Friend Stock'}
        </h2>
        <p style={{ color: 'rgba(232,234,240,0.6)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          {isZh
            ? '此网站仅供股票学习用途，由两名高中生 Billy 和 Frank 合作开发。'
            : 'This website is for stock learning purposes only, developed by two high school students, Billy and Frank.'}
        </p>
        <button onClick={handleClose} style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 36px', fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}>
          {isZh ? '我知道了' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
