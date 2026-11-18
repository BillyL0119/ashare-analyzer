import { useState } from 'react'

/** Which selected stock a single-stock tab shows: the last one added, unless the reader picked another. */
export default function useActiveTicker(stocks) {
  const [picked, setPicked] = useState(null)
  const codes = (stocks || []).map((s) => s.code)
  const code = picked && codes.includes(picked) ? picked : codes[codes.length - 1] || null
  return [code, setPicked]
}
