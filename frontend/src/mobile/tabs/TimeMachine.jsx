import useLangStore from '../../store/langStore'
import TimeMachinePage from '../../components/timemachine/TimeMachinePage'

// The desktop page, drawn with the phone theme's colours (its CSS reads the desktop variable names)
const PHONE_THEME = {
  '--bg-primary': 'var(--bg)', '--bg-secondary': 'var(--surface)', '--bg-tertiary': 'var(--surface-hi)',
  '--border-primary': 'var(--stroke)', '--text-primary': 'var(--text)', '--text-secondary': 'var(--text-2)',
  '--text-muted': 'var(--text-3)',
}

export default function TimeMachine() {
  const lang = useLangStore((st) => st.lang)
  return <div style={PHONE_THEME}><TimeMachinePage lang={lang} /></div>
}
