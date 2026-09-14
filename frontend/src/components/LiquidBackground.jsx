// Purely presentational – no state, no effects.
// All motion control is handled in CSS (prefers-reduced-motion / media queries).
export default function LiquidBackground() {
  return (
    <div aria-hidden="true" className="bfs-liquid-bg">
      <div className="bfs-blob bfs-b1" />
      <div className="bfs-blob bfs-b2" />
      <div className="bfs-blob bfs-b3" />
      <div className="bfs-blob bfs-b4" />
      <div className="bfs-blob bfs-b5" />
    </div>
  )
}
