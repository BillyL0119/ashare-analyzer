import { useState, useEffect } from 'react'

/**
 * Returns true when the splash screen should be shown this session.
 * - Skip on first-ever visit (no lang saved): WelcomeModal takes priority.
 * - Skip if already shown this browser session.
 */
export function shouldShowSplash() {
  if (typeof window === 'undefined') return false
  if (!localStorage.getItem('bfs_lang')) return false        // first visit
  if (sessionStorage.getItem('bfs_splash_seen')) return false // already shown
  return true
}

// Timing constants (ms)
const CONTENT_SHOW_MS = 1500   // when main content starts fading in
const SPLASH_FADE_MS  = 1700   // when splash overlay starts fading out
const UNMOUNT_MS      = 2350   // when component unmounts

export default function SplashScreen({ onContentVisible, onDone }) {
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    sessionStorage.setItem('bfs_splash_seen', '1')
    const t1 = setTimeout(onContentVisible, CONTENT_SHOW_MS)
    const t2 = setTimeout(() => setHiding(true), SPLASH_FADE_MS)
    const t3 = setTimeout(onDone, UNMOUNT_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: '#060d1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', overflow: 'hidden',
      opacity: hiding ? 0 : 1,
      transition: 'opacity 0.6s cubic-bezier(0.4, 0, 1, 1)',
      pointerEvents: hiding ? 'none' : 'all',
    }}>

      {/* Subtle mesh grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(rgba(14,165,233,0.045) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(14,165,233,0.045) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '48px 48px',
      }} />

      {/* Aurora blob – blue */}
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: 'clamp(320px, 65vw, 700px)', height: 'clamp(320px, 65vw, 700px)',
        top: '-18%', left: '-18%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.30) 0%, transparent 68%)',
        filter: 'blur(60px)',
        animation: 'bfsA1 9s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* Aurora blob – purple */}
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: 'clamp(280px, 55vw, 620px)', height: 'clamp(280px, 55vw, 620px)',
        bottom: '-14%', right: '-14%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.28) 0%, transparent 66%)',
        filter: 'blur(55px)',
        animation: 'bfsA2 11s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* Aurora blob – pink accent */}
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: 'clamp(200px, 42vw, 520px)', height: 'clamp(200px, 42vw, 520px)',
        top: '42%', right: '16%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 65%)',
        filter: 'blur(70px)',
        animation: 'bfsA3 13s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* Logo — blur+scale animation */}
      <img
        src="/logo-dark.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'relative', zIndex: 1,
          height: 'clamp(44px, 7.5vw, 72px)', width: 'auto',
          animation: 'bfsSplashLogo 1s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      />

      {/* Product name */}
      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: 'clamp(14px, 2.5vw, 22px)',
        fontSize: 'clamp(18px, 3.8vw, 28px)',
        fontWeight: 700, color: '#fff', letterSpacing: '-0.4px',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        animation: 'bfsSplashText 0.72s cubic-bezier(0.16, 1, 0.3, 1) 0.52s both',
      }}>
        Best Friend Stock
      </div>

      {/* Tagline */}
      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: 'clamp(6px, 1.2vw, 11px)',
        fontSize: 'clamp(11px, 1.8vw, 13px)',
        color: 'rgba(255,255,255,0.40)',
        letterSpacing: '0.5px',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        animation: 'bfsSplashText 0.72s cubic-bezier(0.16, 1, 0.3, 1) 0.78s both',
      }}>
        AI-Powered Stock Analysis · A股 · 美股
      </div>

      {/* Bottom progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, zIndex: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(14,165,233,0.8) 30%, rgba(139,92,246,0.8) 70%, transparent 100%)',
          animation: 'bfsSplashBar 2.1s cubic-bezier(0.4, 0, 0.2, 1) both',
          transformOrigin: 'left',
        }} />
      </div>

      <style>{`
        @keyframes bfsA1 {
          0%, 100% { transform: translate(0%,   0%)   scale(1);    }
          35%       { transform: translate(8%,   13%)  scale(1.16); }
          65%       { transform: translate(-4%,  7%)   scale(0.94); }
        }
        @keyframes bfsA2 {
          0%, 100% { transform: translate(0%,   0%)   scale(1);    }
          40%       { transform: translate(-9%, -8%)   scale(1.12); }
          72%       { transform: translate(5%,  -4%)  scale(1.05); }
        }
        @keyframes bfsA3 {
          0%, 100% { transform: translate(0%,  0%)   scale(1);    }
          50%       { transform: translate(-12%, 10%) scale(1.22); }
        }
        @keyframes bfsSplashLogo {
          from {
            opacity: 0;
            transform: scale(0.80);
            filter: brightness(0) invert(1) blur(10px);
          }
          to {
            opacity: 1;
            transform: scale(1);
            filter: brightness(0) invert(1) blur(0px);
          }
        }
        @keyframes bfsSplashText {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes bfsSplashBar {
          0%   { transform: scaleX(0); opacity: 0; }
          6%   { opacity: 1; }
          80%  { transform: scaleX(1); }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
