/** Ticker picker for the single-stock tabs; renders nothing unless two or more stocks are selected. */
export default function TickerSwitch({ stocks, code, onChange, label }) {
  if (!stocks || stocks.length < 2) return null
  return (
    <div className="qp-seg" role="group" aria-label={label}>
      {stocks.map((s) => (
        <button key={s.code} type="button" aria-pressed={s.code === code} onClick={() => onChange(s.code)}>
          {s.code}
        </button>
      ))}
    </div>
  )
}
