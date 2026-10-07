import { useEffect, useRef, useState } from 'react'
import useLangStore from '../../store/langStore'
import { useT } from '../i18n'
import { Icon } from '../icons'
import Markdown from '../Markdown'

const SHORTCUTS = ['什么是标普500', 'ETF是什么', '如何看财报季', '什么是做空', 'PE比率怎么看', '什么是止损']
// stroke icons (24px grid), one per shortcut
const SHORTCUT_ICONS = [
  <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>,
  <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" /></>,
  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="14" y2="17" /></>,
  <><line x1="7" y1="7" x2="17" y2="17" /><polyline points="17 8 17 17 8 17" /></>,
  <><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="3" width="4" height="18" rx="1" /><rect x="17" y="8" width="4" height="13" rx="1" /></>,
  <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
]

function deviceId() {
  let id = localStorage.getItem('bfs_device_id')
  if (!id) { id = Math.random().toString(36).slice(2, 11) + Date.now(); localStorage.setItem('bfs_device_id', id) }
  return id
}

export default function AITeacher() {
  const t = useT(); const lang = useLangStore((s) => s.lang)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const ctrl = useRef(null); const bottom = useRef(null)

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [msgs])

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q || busy) return
    setInput('')
    const history = msgs.map((m) => ({ role: m.role, content: m.content }))
    setMsgs((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '', streaming: true }])
    setBusy(true)
    ctrl.current = new AbortController()
    const patch = (fn) => setMsgs((m) => { const c = m.slice(); c[c.length - 1] = fn(c[c.length - 1]); return c })
    try {
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.current.signal,
        body: JSON.stringify({ message: q, device_id: deviceId(), history, lang }) })
      if (!res.ok) throw new Error(res.status === 429 ? 'rate' : 'http')
      const reader = res.body.getReader(); const dec = new TextDecoder('utf-8')
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let nl
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1)
          if (!line.startsWith('data:')) continue
          try {
            const j = JSON.parse(line.slice(5))
            if (j.text) patch((x) => ({ ...x, content: x.content + j.text }))
            if (j.error) throw new Error(j.error)
          } catch (e) { if (e.message && !(e instanceof SyntaxError)) throw e }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') patch((x) => ({ ...x, content: x.content || t('出错了：%@', e.message === 'rate' ? '429' : t('服务器错误')) }))
    } finally {
      patch((x) => ({ ...x, streaming: false })); setBusy(false)
    }
  }

  return (
    <>
      <div className="m-scroll m-no-tabbar" style={{ paddingBottom: 12 }}>
        <div style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0 14px' }}>{t('AI老师')}</div>
        {msgs.length === 0 ? (
          <div className="m-stack" style={{ gap: 20, alignItems: 'center', paddingTop: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', boxShadow: '0 10px 28px color-mix(in srgb, var(--accent) 35%, transparent)' }}>
              <span style={{ width: 34, height: 34 }}>{Icon.spark}</span>
            </div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800 }}>{t('AI股票老师')}</div><div className="m-muted" style={{ marginTop: 5, fontSize: 14 }}>{t('股票、基金、经济学，有问必答')}</div></div>
            <div style={{ width: '100%' }}>
              <div className="m-sec"><span>{t('快速提问')}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {SHORTCUTS.map((s, i) => (
                  <button key={s} className="m-card" style={{ textAlign: 'left', minHeight: 96, padding: 14, fontWeight: 600, fontSize: 14, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10 }} onClick={() => send(t(s))}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SHORTCUT_ICONS[i]}</svg>
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>
            <div className="m-footer">{t('仅供学习，不构成投资建议')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {msgs.map((m, i) => m.role === 'user' ? (
              <div key={i} style={{ justifySelf: 'end', maxWidth: '85%', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', color: '#fff', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
            ) : (
              <div key={i} style={{ justifySelf: 'start', maxWidth: '92%', padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: 'var(--surface)', border: '1px solid var(--stroke)', fontSize: 15, lineHeight: 1.5 }}>
                {m.content ? <Markdown text={m.content} /> : <span className="m-muted">● ● ●</span>}
              </div>
            ))}
            <div ref={bottom} />
          </div>
        )}
      </div>
      <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', background: 'color-mix(in srgb, var(--surface) 90%, transparent)', borderTop: '1px solid var(--stroke)', marginBottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))' }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder={t('输入问题…')}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          style={{ flex: 1, resize: 'none', maxHeight: 110, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--stroke)', background: 'var(--surface)', color: 'var(--text)', font: 'inherit', fontSize: 16, outline: 0 }} />
        {busy ? (
          <button onClick={() => ctrl.current?.abort()} aria-label={t('停止生成')} style={{ width: 40, height: 40, borderRadius: 20, background: '#ef4444', color: '#fff', display: 'grid', placeItems: 'center' }}><span style={{ width: 18, height: 18 }}>{Icon.stop}</span></button>
        ) : (
          <button onClick={() => send()} disabled={!input.trim()} aria-label={t('发送')} style={{ width: 40, height: 40, borderRadius: 20, color: '#fff', display: 'grid', placeItems: 'center', background: input.trim() ? 'var(--accent)' : 'var(--text-3)', opacity: input.trim() ? 1 : .5 }}><span style={{ width: 20, height: 20 }}>{Icon.up}</span></button>
        )}
      </div>
      <div className="m-tabbar-spacer" />
    </>
  )
}
