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

// Cross-fade timing (ms) — 200ms overlap between content-in and splash-out
const CONTENT_SHOW_MS = 1500
const SPLASH_FADE_MS  = 1700
const UNMOUNT_MS      = 2380

// Split title into chars for per-character animation
const TITLE_CHARS = [...'Best Friend Stock']

export default function SplashScreen({ onContentVisible, onDone }) {
  const [hiding, setHiding] = useState(false)

  // Detect once at mount — stable for component lifetime
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

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
      background: '#040a18',
      overflow: 'hidden',
      opacity: hiding ? 0 : 1,
      transition: 'opacity 0.62s cubic-bezier(0.4, 0, 1, 1)',
      pointerEvents: hiding ? 'none' : 'all',
    }}>

      {/* ─── BACKGROUND ENVIRONMENT ──────────────────────────────── */}

      {/* Mesh grid (desktop) */}
      {!isMobile && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: [
            'linear-gradient(rgba(14,165,233,0.038) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(14,165,233,0.038) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '52px 52px',
        }} />
      )}

      {/* Aurora blob — blue (top-left) */}
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: isMobile ? '100vw' : 'clamp(400px, 62vw, 720px)',
        height: isMobile ? '100vw' : 'clamp(400px, 62vw, 720px)',
        top: '-20%', left: '-18%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.34) 0%, transparent 68%)',
        filter: `blur(${isMobile ? 40 : 62}px)`,
        animation: isMobile ? undefined : 'bfsA1 9s ease-in-out infinite',
        willChange: isMobile ? undefined : 'transform',
      }} />

      {/* Aurora blob — purple (bottom-right) */}
      <div style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: isMobile ? '80vw' : 'clamp(340px, 54vw, 640px)',
        height: isMobile ? '80vw' : 'clamp(340px, 54vw, 640px)',
        bottom: '-16%', right: '-14%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 66%)',
        filter: `blur(${isMobile ? 35 : 56}px)`,
        animation: isMobile ? undefined : 'bfsA2 11s ease-in-out infinite',
        willChange: isMobile ? undefined : 'transform',
      }} />

      {/* Aurora blob — pink accent (desktop only) */}
      {!isMobile && (
        <div style={{
          position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
          width: 'clamp(220px, 40vw, 500px)', height: 'clamp(220px, 40vw, 500px)',
          top: '40%', right: '14%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 65%)',
          filter: 'blur(72px)',
          animation: 'bfsA3 13s ease-in-out infinite',
          willChange: 'transform',
        }} />
      )}

      {/* Moving light beam (desktop) — slow drift simulating ambient light source */}
      {!isMobile && (
        <div style={{
          position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
          width: '55vw', height: '55vw',
          background: 'radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)',
          filter: 'blur(24px)',
          animation: 'bfsLightDrift 8s ease-in-out infinite',
          willChange: 'transform',
        }} />
      )}

      {/* ─── GLASS CARD ──────────────────────────────────────────── */}

      {/*
        Positioning wrapper is separate from the animated card so that
        the keyframe's `transform: scale(...)` doesn't fight with
        `transform: translate(-50%, -50%)` centering.
      */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '90vw' : 'min(460px, 88vw)',
        zIndex: 4,
      }}>
        <div style={{
          background: 'rgba(6, 14, 34, 0.58)',
          backdropFilter: isMobile ? 'blur(20px)' : 'blur(36px) saturate(1.5)',
          WebkitBackdropFilter: isMobile ? 'blur(20px)' : 'blur(36px) saturate(1.5)',
          // Layered borders: thin top highlight (light hitting the glass edge)
          // + all-sides faint border for definition
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(255,255,255,0.18)',
          borderRadius: isMobile ? 20 : 26,
          boxShadow: [
            '0 0 0 1px rgba(0,0,0,0.45)',               // crisp outer ring
            `0 ${isMobile ? 28 : 52}px ${isMobile ? 56 : 104}px rgba(0,0,0,0.62)`, // depth shadow
            '0 0 100px rgba(14,165,233,0.07)',            // blue ambient glow
            'inset 0 1px 0 rgba(255,255,255,0.14)',       // top glass edge
            'inset 0 -1px 0 rgba(0,0,0,0.24)',            // bottom dark edge
          ].join(', '),
          padding: isMobile ? '28px 22px 30px' : 'clamp(36px, 5vw, 54px) clamp(32px, 5vw, 52px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
          animation: 'bfsGlassIn 0.78s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}>

          {/* ── LOGO 3D ENTRANCE ──────────────────────────────── */}

          {/*
            perspective on the container establishes the 3D space.
            The inner div's keyframe uses rotateX + translateZ to
            create the "coming forward from depth" Apple entrance feel.
          */}
          <div style={{
            perspective: isMobile ? undefined : '900px',
            perspectiveOrigin: '50% 40%',
            display: 'flex', justifyContent: 'center',
          }}>
            {/* 3D-animated wrapper */}
            <div style={{
              animation: isMobile
                ? 'bfsLogoSimple 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both'
                : 'bfsLogoIn 1.08s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both',
              position: 'relative',
            }}>
              {/* Overflow clip for sheen — separate from 3D wrapper
                  so clip doesn't interfere with 3D transforms */}
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 6 }}>
                <img
                  src="/logo-dark.png"
                  alt=""
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    height: isMobile ? 44 : 'clamp(46px, 6.5vw, 66px)',
                    width: 'auto',
                    filter: 'brightness(0) invert(1)',
                    position: 'relative', zIndex: 1,
                  }}
                />

                {/* Light sheen — sweeps left-to-right after logo settles (~1.1s) */}
                {!isMobile && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(108deg, transparent 18%, rgba(255,255,255,0.26) 50%, transparent 82%)',
                    animation: 'bfsLogoSheen 0.68s cubic-bezier(0.22, 1, 0.36, 1) 1.08s both',
                    pointerEvents: 'none',
                    zIndex: 2,
                    transformOrigin: 'center',
                  }} />
                )}
              </div>
            </div>
          </div>

          {/* ── TITLE (per-character) ─────────────────────────── */}

          {/*
            Each character is an inline-block span with:
              from: rotateY(26deg) + translateY(6px) + opacity 0
              to:   rotateY(0)     + translateY(0)   + opacity 1
            Staggered 28ms per character starting at 620ms.
            The perspective on the container makes the Y-rotation read correctly.
          */}
          <div style={{
            perspective: isMobile ? undefined : '520px',
            perspectiveOrigin: '50% 100%',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            marginTop: isMobile ? 15 : 21,
            lineHeight: 1,
          }}>
            {TITLE_CHARS.map((char, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  fontSize: isMobile ? 19 : 'clamp(18px, 3.4vw, 26px)',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.3px',
                  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  whiteSpace: 'pre',
                  transformOrigin: 'center bottom',
                  animation: isMobile
                    ? `bfsFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${0.58 + i * 0.022}s both`
                    : `bfsSplashChar 0.54s cubic-bezier(0.22, 1, 0.36, 1) ${0.62 + i * 0.028}s both`,
                  willChange: 'transform, opacity',
                }}
              >
                {char}
              </span>
            ))}
          </div>

          {/* ── TAGLINE ───────────────────────────────────────── */}
          <div style={{
            marginTop: isMobile ? 10 : 13,
            fontSize: isMobile ? 11 : 'clamp(11px, 1.4vw, 13px)',
            color: 'rgba(255,255,255,0.36)',
            letterSpacing: '0.45px',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            animation: `bfsFadeUp 0.56s cubic-bezier(0.22, 1, 0.36, 1) ${isMobile ? 0.95 : 1.42}s both`,
          }}>
            AI-Powered Stock Analysis · A股 · 美股
          </div>

          {/* ── Separator line ────────────────────────────────── */}
          <div style={{
            width: '38%', height: 1,
            marginTop: isMobile ? 18 : 26,
            background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.28), rgba(139,92,246,0.28), transparent)',
            animation: `bfsFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${isMobile ? 1.05 : 1.54}s both`,
          }} />
        </div>
      </div>

      {/* ─── BOTTOM PROGRESS BAR ─────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, zIndex: 5, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(14,165,233,0.9) 30%, rgba(139,92,246,0.9) 70%, transparent 100%)',
          animation: 'bfsSplashBar 2.18s cubic-bezier(0.4, 0, 0.2, 1) both',
          transformOrigin: 'left',
        }} />
      </div>

      <style>{`
        /* ── Aurora drifts ─────────────────────────────────── */
        @keyframes bfsA1 {
          0%, 100% { transform: translate(0%,   0%)   scale(1);    }
          35%       { transform: translate(9%,   14%)  scale(1.18); }
          65%       { transform: translate(-5%,  7%)   scale(0.93); }
        }
        @keyframes bfsA2 {
          0%, 100% { transform: translate(0%,   0%)   scale(1);    }
          42%       { transform: translate(-10%, -8%)  scale(1.13); }
          74%       { transform: translate(6%,  -5%)   scale(1.06); }
        }
        @keyframes bfsA3 {
          0%, 100% { transform: translate(0%,   0%)   scale(1);    }
          50%       { transform: translate(-13%, 11%)  scale(1.24); }
        }
        @keyframes bfsLightDrift {
          0%   { transform: translate(-28vw, -22vw); }
          50%  { transform: translate(22vw,  16vw);  }
          100% { transform: translate(-28vw, -22vw); }
        }

        /* ── Glass card entrance ──────────────────────────── */
        @keyframes bfsGlassIn {
          from { opacity: 0; transform: scale(0.92) translateY(14px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }

        /* ── Logo 3D entrance (desktop) ───────────────────── */
        @keyframes bfsLogoIn {
          from {
            opacity: 0;
            transform: rotateX(18deg) translateZ(-90px) scale(0.84);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: rotateX(0deg) translateZ(0px) scale(1);
            filter: blur(0px);
          }
        }

        /* ── Logo simple entrance (mobile) ────────────────── */
        @keyframes bfsLogoSimple {
          from { opacity: 0; transform: scale(0.88) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }

        /* ── Logo sheen sweep ─────────────────────────────── */
        @keyframes bfsLogoSheen {
          from { transform: translateX(-140%); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          to   { transform: translateX(140%);  opacity: 0; }
        }

        /* ── Per-character title entrance (desktop) ───────── */
        @keyframes bfsSplashChar {
          from {
            opacity: 0;
            transform: rotateY(28deg) translateY(7px);
          }
          to {
            opacity: 1;
            transform: rotateY(0deg)  translateY(0);
          }
        }

        /* ── Shared fade-up (mobile chars, tagline, line) ─── */
        @keyframes bfsFadeUp {
          from { opacity: 0; transform: translateY(9px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* ── Bottom progress bar ──────────────────────────── */
        @keyframes bfsSplashBar {
          0%   { transform: scaleX(0); opacity: 0; }
          5%   { opacity: 1; }
          78%  { transform: scaleX(1); }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
