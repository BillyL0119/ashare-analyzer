import useLangStore from '../store/langStore'
import useThemeStore from '../store/themeStore'
import { setUIOverride, inAppName } from '../utils/device'
import { useT, SUPPORTED_LANGS } from './i18n'
import { Segment } from './ui'
import { useState } from 'react'
import useAuthStore from '../store/authStore'
import AuthModal from '../components/AuthModal'

export default function Settings({ onClose }) {
  const t = useT()
  const { lang, setLang } = useLangStore()
  const { theme, setTheme } = useThemeStore()
  const inApp = inAppName()

  const changeLang = (code) => { setLang(code); try { localStorage.setItem('bfs_lang', code) } catch { /* ignore */ } }
  const desktop = () => { setUIOverride('desktop'); window.location.reload() }

  return (
    <div className="m-sheet-back" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="m-grabber" />
        <div className="m-stack" style={{ gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 20 }}>Best Friend Stock</b>
            <div className="m-label" style={{ marginTop: 4 }}>{t('Best Friend Stock · 版本 1.0')}</div>
          </div>
          <div>
            <div className="m-sec"><span>{t('外观')}</span></div>
            <Segment full value={theme} onChange={setTheme} options={[{ value: 'dark', label: t('深色') }, { value: 'light', label: t('浅色') }]} />
          </div>
          <div>
            <div className="m-sec"><span>{t('语言')}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SUPPORTED_LANGS.map((l) => (
                <button key={l.code} aria-pressed={lang === l.code} onClick={() => changeLang(l.code)}
                  style={{ padding: '10px 4px', borderRadius: 999, fontWeight: 650, fontSize: 14,
                    background: lang === l.code ? 'var(--accent)' : 'var(--surface-hi)', color: lang === l.code ? '#fff' : 'var(--text)' }}>{l.label}</button>
              ))}
            </div>
          </div>
          <Account lang={lang} />
          {inApp && <div className="m-tile m-muted" style={{ fontSize: 12.5 }}>{t('在 App 内置浏览器中打开')} · {t('用系统浏览器打开')} ↗</div>}
          <button className="m-btn ghost" onClick={desktop}>{t('切换到电脑版')}</button>
          <div className="m-card">
            <b style={{ fontSize: 14 }}>{t('免责声明')}</b>
            <p className="m-muted" style={{ fontSize: 12.5, margin: '6px 0 0' }}>{t('本应用仅供学习和教育目的，不构成任何投资建议。股市有风险，投资需谨慎。行情数据可能存在延迟。AI 老师内容由 AI 生成，仅供参考。')}</p>
          </div>
          <button className="m-btn" onClick={onClose}>{t('关闭')}</button>
        </div>
      </div>
    </div>
  )
}

// Sign in to share the paper trading account (and saved settings) with the desktop site
function Account({ lang }) {
  const t = useT()
  const { user, signOut } = useAuthStore()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="m-sec"><span>{t('账户')}</span></div>
      <div className="m-card" style={{ display: 'grid', gap: 10 }}>
        {user ? (
          <>
            <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
            <button className="m-btn ghost" onClick={() => signOut()}>{t('退出登录')}</button>
          </>
        ) : (
          <>
            <span className="m-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{t('登录后，模拟盘账户在手机和电脑上同步。')}</span>
            <button className="m-btn" onClick={() => setOpen(true)}>{t('登录 / 注册')}</button>
          </>
        )}
      </div>
      <AuthModal open={open} onClose={() => setOpen(false)} lang={lang} />
    </div>
  )
}
