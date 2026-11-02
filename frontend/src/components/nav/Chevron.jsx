// Small down-chevron for menus and fold buttons; turns over when open (index.css .bfs-chevron)
export default function Chevron({ open }) {
  return (
    <span className={`bfs-chevron${open ? ' is-open' : ''}`} aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}>
        <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
