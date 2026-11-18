// Phone-only strings for the quote sections; everything else comes from the desktop summaryStrings.
const S = {
  en: { formula: 'Formula', close: 'Tap again to close.', error: 'Could not load this section. Try again.' },
  zh: { formula: '公式', close: '再点一次关闭。', error: '无法加载此部分，请重试。' },
  ja: { formula: '計算式', close: 'もう一度タップすると閉じます。', error: 'この項目を読み込めませんでした。もう一度お試しください。' },
  ko: { formula: '계산식', close: '다시 누르면 닫힙니다.', error: '이 항목을 불러오지 못했습니다. 다시 시도하세요.' },
  fr: { formula: 'Formule', close: 'Touchez à nouveau pour fermer.', error: 'Impossible de charger cette section. Réessayez.' },
}
export default function quoteStrings(lang) { return { ...S.en, ...(S[lang] || {}) } }
