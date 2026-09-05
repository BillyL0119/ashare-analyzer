import { useState } from 'react'

// ── Inline SVG components — no emoji, no font dependency ──────────────

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

// Chinese flag: red background + 1 main star + 4 small stars (all pre-computed polygons)
function FlagCN({ height = 28 }) {
  return (
    <svg width={height * 1.5} height={height} viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#DE2910"/>
      {/* Main 5-pointed star */}
      <polygon fill="#FFDE00"
        points="6,3.5 6.79,5.92 9.33,5.92 7.27,7.41 8.06,9.83 6,8.34 3.94,9.83 4.73,7.41 2.67,5.92 5.21,5.92"/>
      {/* 4 small stars */}
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

// US flag: 13 red/white stripes + blue canton with simplified stars
function FlagUS({ height = 28 }) {
  const strH = 20 / 13
  return (
    <svg width={height * 1.9} height={height} viewBox="0 0 38 20"
      xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="38" height="20" fill="#fff"/>
      {[0, 2, 4, 6, 8, 10, 12].map(i => (
        <rect key={i} x="0" y={i * strH} width="38" height={strH} fill="#B22234"/>
      ))}
      <rect x="0" y="0" width="15.2" height={7 * strH} fill="#3C3B6E"/>
      {/* Stars: 5 rows of 5 */}
      {[0, 1, 2, 3, 4].map(row => [0, 1, 2, 3, 4].map(col => (
        <circle key={`a${row}${col}`}
          cx={1.52 + col * 2.44} cy={0.75 + row * 2.1} r="0.5" fill="#fff"/>
      )))}
      {/* Stars: 4 offset rows of 4 */}
      {[0, 1, 2, 3].map(row => [0, 1, 2, 3].map(col => (
        <circle key={`b${row}${col}`}
          cx={2.74 + col * 2.44} cy={1.8 + row * 2.1} r="0.5" fill="#fff"/>
      )))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────

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

  const handleClose = () => setOpen(false)

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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <IconChart size={40} />
          </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <FlagCN height={28} />
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <FlagUS height={28} />
              </div>
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
        }}>&#x2715;</button>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <IconChart size={36} />
        </div>
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
