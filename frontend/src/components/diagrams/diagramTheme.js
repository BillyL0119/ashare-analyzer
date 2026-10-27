// Colours for the diagram lab: curves and shaded areas, tuned separately for the light and dark themes.

export const DIAGRAM_CSS = `
.dl-svg { display: block; width: 100%; height: auto; user-select: none; -webkit-user-select: none; overflow: visible; }
.dl-svg, .dl-vars {
  --c-d: #2563eb; --c-s: #ea580c; --c-lr: #7c3aed; --c-social: #9333ea; --c-ctrl: #dc2626; --c-world: #0d9488; --c-tr: #16a34a;
  --f-cs: rgba(37,99,235,.15); --f-ps: rgba(234,88,12,.15); --f-dwl: rgba(220,38,38,.28); --f-rev: rgba(22,163,74,.2);
  --f-revC: rgba(22,163,74,.32); --f-revP: rgba(13,148,136,.17); --f-cost: rgba(202,138,4,.26); --f-gain: rgba(22,163,74,.32); --f-loss: rgba(220,38,38,.28);
  --dl-ink: var(--text-primary); --dl-ink2: var(--text-secondary); --dl-bg: var(--bg-secondary); }
:root:not([data-theme="light"]) .dl-svg, :root:not([data-theme="light"]) .dl-vars {
  --c-d: #60a5fa; --c-s: #fb923c; --c-lr: #c084fc; --c-social: #d8b4fe; --c-ctrl: #f87171; --c-world: #2dd4bf; --c-tr: #4ade80;
  --f-cs: rgba(96,165,250,.16); --f-ps: rgba(251,146,60,.16); --f-dwl: rgba(248,113,113,.32); --f-rev: rgba(74,222,128,.17);
  --f-revC: rgba(74,222,128,.28); --f-revP: rgba(45,212,191,.16); --f-cost: rgba(250,204,21,.22); --f-gain: rgba(74,222,128,.3); --f-loss: rgba(248,113,113,.3); }
.dl-svg text { font-family: inherit; }
.dl-svg .dl-hit { cursor: grab; outline: none; touch-action: none; }
.dl-svg .dl-hit:active { cursor: grabbing; }
.dl-svg .dl-hit:hover + .dl-curve, .dl-svg .dl-hit:focus-visible + .dl-curve { stroke-width: 4; }
.dl-svg .dl-hit:focus-visible + .dl-curve { filter: drop-shadow(0 0 3px var(--c-d)); }
.dl-svg .dl-pt-hit { cursor: grab; outline: none; touch-action: none; }
.dl-svg .dl-pt-hit:focus-visible + circle { stroke-width: 4; }
`

export const COLOR = { d: 'var(--c-d)', s: 'var(--c-s)', lr: 'var(--c-lr)', social: 'var(--c-social)', ctrl: 'var(--c-ctrl)', world: 'var(--c-world)', tr: 'var(--c-tr)' }
export const FILL = { cs: 'var(--f-cs)', ps: 'var(--f-ps)', dwl: 'var(--f-dwl)', rev: 'var(--f-rev)', revC: 'var(--f-revC)', revP: 'var(--f-revP)', cost: 'var(--f-cost)', gain: 'var(--f-gain)', loss: 'var(--f-loss)' }
