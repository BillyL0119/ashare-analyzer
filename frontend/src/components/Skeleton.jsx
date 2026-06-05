// Reusable skeleton primitives — use .skeleton CSS class from index.css

export function SkeletonLine({ width = '100%', height = 12, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 4, flexShrink: 0, ...style }}
    />
  )
}

export function SkeletonBlock({ width = '100%', height = 100, borderRadius = 8, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  )
}

// Convenience: a column of skeleton lines with equal gap
export function SkeletonText({ lines = 3, gap = 8, style = {} }) {
  const widths = ['100%', '80%', '60%', '90%', '70%', '85%']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} height={12} />
      ))}
    </div>
  )
}
