import { useCallback } from 'react'
import useLangStore from '../store/langStore'
import { STR, LANG_ORDER } from './strings'

function lookup(lang, key) {
  if (lang === 'zh') return key
  const row = STR[key]
  const i = LANG_ORDER.indexOf(lang)
  return (row && i >= 0 && row[i]) || key
}

function fmt(text, args) {
  let i = 0
  return text.replace(/%(?:lld|d|@)/g, () => (args[i] !== undefined ? args[i++] : ''))
}

/** t('自选股') -> translated for the current language; t('%lld 只', 3) fills printf-style slots. */
export function useT() {
  const lang = useLangStore((s) => s.lang)
  return useCallback((key, ...args) => fmt(lookup(lang, key), args), [lang])
}

export const SUPPORTED_LANGS = [
  { code: 'zh', label: '中文' }, { code: 'en', label: 'English' }, { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' }, { code: 'fr', label: 'Français' },
]
