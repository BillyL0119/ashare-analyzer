// Plain-language meaning of every figure on the quote pages, keyed by the row keys the quote APIs send
// (see the framework's key list). Shown by <Term k="..."> (Term.jsx). Owned by the Statistics slice.
//
// Shape: GLOSSARY[key] = { en: { d: 'one or two sentences', f: 'formula, or null' }, zh: {...}, ja, ko, fr }
export const GLOSSARY = {}

/** { d, f } in the reader's language (English when missing), or null when the key has no entry */
export function explain(key, lang) {
  const e = GLOSSARY[key]
  return e ? (e[lang] || e.en || null) : null
}
