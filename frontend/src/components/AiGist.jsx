import { AI_LABEL } from '../utils/aiGist'

export default function AiGist({ text, lang }) {
  if (!text) return null
  return (
    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 4 }}>
      <span style={{ color: '#0ea5e9', fontWeight: 600, marginRight: 6 }}>{AI_LABEL[lang] || AI_LABEL.en}</span>
      {text}
    </div>
  )
}
