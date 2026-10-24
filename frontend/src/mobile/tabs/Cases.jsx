import useLangStore from '../../store/langStore'
import CasesPage from '../../components/cases/CasesPage'

// The case library in the phone theme (its CSS reads the desktop variable names); study links use the phone routes
const PHONE_THEME = {
  '--bg-primary': 'var(--bg)', '--bg-secondary': 'var(--surface)', '--bg-tertiary': 'var(--surface-hi)',
  '--border-primary': 'var(--stroke)', '--text-primary': 'var(--text)', '--text-secondary': 'var(--text-2)',
  '--text-muted': 'var(--text-3)',
}
const phoneStudy = (board, topic) => `/study/${board}/${topic}`

export default function Cases() {
  const lang = useLangStore((st) => st.lang)
  return <div style={PHONE_THEME}><CasesPage lang={lang} studyHref={phoneStudy} /></div>
}
