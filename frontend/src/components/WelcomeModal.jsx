import { useState } from 'react'

const ACCENT_BLUE = '#8ab4f8'
const ACCENT_PURPLE = '#c084fc'

export default function WelcomeModal({ lang }) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const isCN = lang === 'zh'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#161b2e',
          borderRadius: 16,
          padding: '36px 32px 28px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          border: '1px solid transparent',
          backgroundClip: 'padding-box',
          position: 'relative',
        }}
      >
        {/* Gradient border via pseudo-element workaround using outline box */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            padding: 1,
            background: `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }}
        />

        {/* Icon */}
        <div style={{ fontSize: 40, marginBottom: 14 }}>📈</div>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 16px',
            fontSize: 20,
            fontWeight: 700,
            background: `linear-gradient(90deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.3px',
          }}
        >
          {isCN ? '欢迎使用 Best Friend Stock' : 'Welcome to Best Friend Stock'}
        </h2>

        {/* Body */}
        <p
          style={{
            margin: '0 0 28px',
            color: 'rgba(232,234,237,0.78)',
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {isCN
            ? '此网站仅供股票学习用途，由两名高中生 Billy 和 Frank 合作开发。'
            : 'This website is for stock learning purposes only, developed by two high school students, Billy and Frank.'}
        </p>

        {/* Button */}
        <button
          onClick={() => setVisible(false)}
          style={{
            background: `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
            border: 'none',
            borderRadius: 8,
            color: '#0a0e1a',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 32px',
            cursor: 'pointer',
            letterSpacing: '0.3px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {isCN ? '我知道了' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
