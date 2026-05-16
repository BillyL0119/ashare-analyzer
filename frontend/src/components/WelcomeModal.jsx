import { useState } from 'react'

export default function WelcomeModal() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#161b2e', borderRadius: 16,
        border: '1px solid rgba(138,180,248,0.3)',
        padding: '32px 28px', width: 460, maxWidth: '92vw',
        position: 'relative', textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <button onClick={() => setOpen(false)} style={{
          position: 'absolute', top: 14, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(232,234,240,0.4)', fontSize: 20, lineHeight: 1,
        }}>✕</button>
        <div style={{ fontSize: 36, marginBottom: 20 }}>📈</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{
            flex: 1, padding: '16px', borderRadius: 10,
            background: 'rgba(138,180,248,0.06)',
            border: '0.5px solid rgba(138,180,248,0.15)',
          }}>
            <h2 style={{ color: '#e8eaf0', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              欢迎使用 Best Friend Stock
            </h2>
            <p style={{ color: 'rgba(232,234,240,0.6)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              此网站仅供股票学习用途，由两名高中生 Billy 和 Frank 合作开发。
            </p>
          </div>
          <div style={{
            flex: 1, padding: '16px', borderRadius: 10,
            background: 'rgba(167,139,250,0.06)',
            border: '0.5px solid rgba(167,139,250,0.15)',
          }}>
            <h2 style={{ color: '#e8eaf0', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              Welcome to Best Friend Stock
            </h2>
            <p style={{ color: 'rgba(232,234,240,0.6)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              This website is for stock learning purposes only, developed by two high school students, Billy and Frank.
            </p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 36px', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', marginTop: 24,
        }}>我知道了 / Got it</button>
      </div>
    </div>
  )
}
