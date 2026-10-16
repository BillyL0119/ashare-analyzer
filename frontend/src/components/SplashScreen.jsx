import { useState, useEffect } from 'react'

/**
 * Returns true when the splash screen should be shown this session.
 * Skips when:
 *  - First-ever visit (no lang saved) → WelcomeModal takes priority
 *  - Already shown this browser session (sessionStorage key)
 *  - User prefers reduced motion → accessibility
 */
export function shouldShowSplash() {
  if (typeof window === 'undefined') return false
  if (!localStorage.getItem('bfs_lang')) return false
  if (sessionStorage.getItem('bfs_splash_seen')) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

// Short and flat: the mark and the name rise from behind their baseline, then the page takes over.
const CONTENT_SHOW_MS = 900
const SPLASH_FADE_MS  = 1000
const UNMOUNT_MS      = 1500

export default function SplashScreen({ onContentVisible, onDone }) {
  const [hiding, setHiding] = useState(false)
  const dark = (document.documentElement.dataset.theme || 'dark') !== 'light'

  useEffect(() => {
    sessionStorage.setItem('bfs_splash_seen', '1')
    const t1 = setTimeout(onContentVisible, CONTENT_SHOW_MS)
    const t2 = setTimeout(() => setHiding(true), SPLASH_FADE_MS)
    const t3 = setTimeout(onDone, UNMOUNT_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line

  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: hiding ? 0 : 1,
      transition: 'opacity 0.5s cubic-bezier(0.4, 0, 1, 1)',
      pointerEvents: hiding ? 'none' : 'all',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="bfs-mask-line"><span>
          <img src="/logo-dark.png" alt="" style={{ height: 'clamp(40px, 6vw, 64px)', width: 'auto', display: 'block', filter: dark ? 'brightness(0) invert(1)' : 'none' }} />
        </span></span>
        <span className="bfs-mask-line"><span style={{
          fontSize: 'clamp(28px, 4.4vw, 56px)', fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1.05,
        }}>Best Friend Stock</span></span>
      </div>
    </div>
  )
}
