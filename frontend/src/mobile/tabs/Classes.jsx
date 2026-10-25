import { useParams } from 'react-router-dom'
import useLangStore from '../../store/langStore'
import ClassPage from '../../components/classes/ClassPage'

// Classroom mode in the phone theme (its CSS reads the desktop variable names). Teachers sign in from Settings.
const PHONE_THEME = {
  '--bg-primary': 'var(--bg)', '--bg-secondary': 'var(--surface)', '--bg-tertiary': 'var(--surface-hi)',
  '--border-primary': 'var(--stroke)', '--text-primary': 'var(--text)', '--text-secondary': 'var(--text-2)',
  '--text-muted': 'var(--text-3)',
}

export default function Classes() {
  const lang = useLangStore((st) => st.lang)
  const { code } = useParams()
  return <div style={PHONE_THEME}><ClassPage lang={lang} code={code} phone /></div>
}
