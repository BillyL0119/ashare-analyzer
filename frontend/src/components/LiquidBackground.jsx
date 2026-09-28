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
            Gooey filter – desktop:
            Step 1 – feTurbulence generates a fractal noise field.
            Step 2 – feDisplacementMap distorts the source pixels using that noise
                     (scale=44 → up to ±44px displacement), creating organic edges.
            Step 3 – feGaussianBlur blurs displaced blobs so their halos overlap.
            Step 4 – feColorMatrix boosts alpha contrast: alpha_out = alpha×20 − 8
                     → cutoff ≈ 0.40; above = opaque liquid, below = transparent.
            As blobs drift (CSS transform), they move through different regions of
            the noise field → edges change organically without JS.
          */}
          <filter id="bfs-goo" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="3" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="44" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 20 -8"
            />
          </filter>

          {/* Lighter version for mobile (smaller displacement + blur = less GPU load) */}
          <filter id="bfs-goo-sm" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.010" numOctaves="2" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="9" result="blur" />
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
