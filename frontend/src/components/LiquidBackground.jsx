// Gooey/metaball liquid background.
// Layer 1: ambient large blurs (atmosphere glow).
// Layer 2: gooey-filter layer — feGaussianBlur + feColorMatrix alpha-boost
//   causes overlapping blobs to merge like liquid droplets.
// All motion via CSS transform (GPU-only), prefers-reduced-motion handled in CSS.
export default function LiquidBackground() {
  return (
    <div aria-hidden="true" className="bfs-liquid-bg">

      {/* ── SVG filter definitions (zero-size, not rendered) ── */}
      <svg aria-hidden="true" className="bfs-svg-defs">
        <defs>
          {/*
            Gooey filter – desktop (stdDeviation 14):
            feGaussianBlur blurs all sibling blobs together so halos overlap.
            feColorMatrix boosts alpha contrast: alpha_out = alpha_in×20 − 8
            → cutoff ≈ 0.40; blurred bridges above cutoff become opaque liquid,
              areas below become transparent, creating the merge/split animation.
          */}
          <filter id="bfs-goo" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 20 -8"
            />
          </filter>

          {/* Lighter version for mobile (smaller blur = less GPU load) */}
          <filter id="bfs-goo-sm" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 18 -7"
            />
          </filter>
        </defs>
      </svg>

      {/* ── Layer 1: ambient atmosphere (large soft blurs) ── */}
      <div className="bfs-blob bfs-b1" />
      <div className="bfs-blob bfs-b2" />
      <div className="bfs-blob bfs-b3" />

      {/* ── Layer 2: gooey merging blobs ── */}
      <div className="bfs-goo-layer">
        <div className="bfs-gblob bg1" />
        <div className="bfs-gblob bg2" />
        <div className="bfs-gblob bg3" />
        <div className="bfs-gblob bg4" />
        <div className="bfs-gblob bg5" />
        <div className="bfs-gblob bg6" />
      </div>

    </div>
  )
}
