import { useState } from 'react'
import { CUR } from '../../utils/markets'
import { MUTED, DOWN, Modal, Field, inputStyle, Button, Seg } from './ui'

// Starting-cash choices per market (the server accepts anything in the same range)
const CASH = { us: [10_000, 100_000, 1_000_000], cn: [100_000, 1_000_000, 10_000_000], hk: [100_000, 1_000_000, 10_000_000], jp: [1_000_000, 10_000_000, 100_000_000] }
const isoIn = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }

export default function GamesModal({ s, accountKey, nickname, marketLabels, onClose, onJoined }) {
  const g = s.game
  const [mode, setMode] = useState('join')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [market, setMarket] = useState('us')
  const [cash, setCash] = useState(100_000)
  const [end, setEnd] = useState(isoIn(30))
  const [short, setShort] = useState(false)
  const [nick, setNick] = useState(nickname && !/^用户#/.test(nickname) ? nickname : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const post = async (path, body) => {
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/paper/games/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: accountKey, ...body }) })
      const d = await r.json()
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'Error')
      onJoined(d.game)
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <Modal onClose={onClose} width={480}>
      <h2 style={{ margin: '0 0 4px', fontSize: 19 }}>{g.title}</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{g.intro}</p>
      <Seg value={mode} onChange={setMode} full options={[{ value: 'join', label: g.join }, { value: 'create', label: g.create }]} />
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {mode === 'join' ? (
          <Field label={g.code}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder={g.codePh}
              style={{ ...inputStyle, letterSpacing: 4, fontWeight: 600, fontSize: 18, textAlign: 'center' }} autoFocus />
          </Field>
        ) : (<>
          <Field label={g.name}><input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder={g.namePh} style={inputStyle} /></Field>
          <Field label={g.market}>
            <Seg value={market} onChange={(m) => { setMarket(m); setCash(CASH[m][1]); if (m !== 'us') setShort(false) }} size="sm"
              options={['us', 'cn', 'hk', 'jp'].map((m) => ({ value: m, label: marketLabels[m] }))} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label={g.startCash}>
              <select value={cash} onChange={(e) => setCash(Number(e.target.value))} style={inputStyle}>
                {CASH[market].map((c) => <option key={c} value={c}>{CUR[market]}{c.toLocaleString('en-US')}</option>)}
              </select>
            </Field>
            <Field label={g.endDate}><input type="date" value={end} min={isoIn(1)} max={isoIn(365)} onChange={(e) => setEnd(e.target.value)} style={inputStyle} /></Field>
          </div>
          {market === 'us' && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={short} onChange={(e) => setShort(e.target.checked)} /> {g.allowShort}
            </label>
          )}
        </>)}
        <Field label={g.nickname}><input value={nick} onChange={(e) => setNick(e.target.value.slice(0, 16))} placeholder={g.nicknamePh} style={inputStyle} /></Field>
        {err && <div role="alert" style={{ color: DOWN, fontSize: 13 }}>{err}</div>}
        <Button disabled={busy || (mode === 'join' ? code.length !== 6 : name.trim().length < 2)} style={{ width: '100%' }}
          onClick={() => (mode === 'join'
            ? post('join', { code, nickname: nick || null })
            : post('create', { name, market, start_cash: cash, end_date: end, allow_short: short, nickname: nick || null }))}>
          {mode === 'join' ? g.join : g.create}
        </Button>
      </div>
    </Modal>
  )
}
