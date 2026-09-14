import { useState } from 'react'
import { supabase } from '../lib/supabase'

const SIGNIN = 'signin'
const SIGNUP = 'signup'
const RESET  = 'reset'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    </svg>
  )
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px', boxSizing: 'border-box',
          borderRadius: 8, border: '1px solid var(--border-primary)',
          background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
          fontSize: 14, outline: 'none', transition: 'border-color 0.15s',
        }}
        onFocus={e  => { e.target.style.borderColor = '#0ea5e9' }}
        onBlur={e   => { e.target.style.borderColor = 'var(--border-primary)' }}
      />
    </div>
  )
}

export default function AuthModal({ open, onClose, lang = 'en' }) {
  const zh = lang === 'zh'
  const [mode,     setMode]     = useState(SIGNIN)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [message,  setMessage]  = useState('')

  if (!open) return null

  const switchMode = (m) => { setMode(m); setError(''); setMessage('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      if (mode === RESET) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage(zh ? '重置链接已发送，请查收邮件' : 'Reset link sent — please check your inbox')
      } else if (mode === SIGNUP) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage(zh
          ? '注册成功！请查收验证邮件后再登录'
          : 'Registered! Please verify your email then sign in')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  const title = mode === RESET
    ? (zh ? '重置密码' : 'Reset Password')
    : mode === SIGNUP
    ? (zh ? '创建账号' : 'Create Account')
    : (zh ? '欢迎回来' : 'Welcome Back')

  const subtitle = mode === RESET
    ? (zh ? '输入邮箱，我们将发送重置链接' : "Enter your email and we'll send a reset link")
    : mode === SIGNUP
    ? (zh ? '创建账号，解锁跨设备数据同步' : 'Create an account to sync your data across devices')
    : (zh ? '登录你的 Best Friend Stock 账号' : 'Sign in to your Best Friend Stock account')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 16, width: '100%', maxWidth: 420,
        position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'bfsPageFadeIn 0.2s ease both',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}
        >
          ✕
        </button>

        <div style={{ padding: '28px 32px' }}>
          {/* Header */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {subtitle}
            </div>
          </div>

          {/* Sign In / Sign Up tab switcher */}
          {mode !== RESET && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-tertiary)', borderRadius: 8, padding: 3 }}>
              {[
                { k: SIGNIN, label: zh ? '登录' : 'Sign In' },
                { k: SIGNUP, label: zh ? '注册' : 'Sign Up' },
              ].map(({ k, label }) => (
                <button
                  key={k}
                  onClick={() => switchMode(k)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: mode === k ? 'var(--bg-secondary)' : 'transparent',
                    color: mode === k ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: mode === k ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Google OAuth */}
          {mode !== RESET && (
            <>
              <button
                onClick={handleGoogle}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '10px 0', borderRadius: 8,
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                  cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                  marginBottom: 16, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
              >
                <GoogleIcon />
                {zh ? '使用 Google 继续' : 'Continue with Google'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{zh ? '或用邮箱' : 'or use email'}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
              </div>
            </>
          )}

          {/* Email + password form */}
          <form onSubmit={handleSubmit}>
            <Field
              label={zh ? '邮箱地址' : 'Email Address'}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={zh ? '请输入邮箱' : 'Enter your email'}
            />

            {mode !== RESET && (
              <Field
                label={zh ? '密码' : 'Password'}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === SIGNUP
                  ? (zh ? '至少 6 位字符' : 'At least 6 characters')
                  : (zh ? '请输入密码' : 'Enter your password')}
              />
            )}

            {/* Forgot password link */}
            {mode === SIGNIN && (
              <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -6 }}>
                <button
                  type="button"
                  onClick={() => switchMode(RESET)}
                  style={{ fontSize: 12, color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {zh ? '忘记密码？' : 'Forgot password?'}
                </button>
              </div>
            )}

            {/* Feedback messages */}
            {error && (
              <div style={{ fontSize: 12, color: '#ef5350', marginBottom: 12, padding: '8px 12px', background: 'rgba(239,83,80,0.08)', borderRadius: 6, lineHeight: 1.4 }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ fontSize: 12, color: '#26a69a', marginBottom: 12, padding: '8px 12px', background: 'rgba(38,166,154,0.08)', borderRadius: 6, lineHeight: 1.4 }}>
                {message}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
                background: loading ? 'rgba(14,165,233,0.4)' : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {loading
                ? (zh ? '处理中...' : 'Processing...')
                : mode === RESET
                  ? (zh ? '发送重置邮件' : 'Send Reset Email')
                  : mode === SIGNUP
                    ? (zh ? '创建账号' : 'Create Account')
                    : (zh ? '登录' : 'Sign In')}
            </button>

            {/* Back from reset */}
            {mode === RESET && (
              <button
                type="button"
                onClick={() => switchMode(SIGNIN)}
                style={{ display: 'block', margin: '14px auto 0', fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ← {zh ? '返回登录' : 'Back to Sign In'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
