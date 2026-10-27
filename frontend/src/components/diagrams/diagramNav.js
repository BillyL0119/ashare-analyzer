// The few diagram-lab words other pages need (nav tab, cards, links), kept apart from
// diagramStrings.js so the main bundle and the study and case pages stay small.

const NAV = {
  zh: { title: '经济学图表实验室', nav: '图表实验室', drawLink: '画出这张图', openLab: '在图表实验室里动手画这张图',
    card: '拖动供求、AD–AS、外部性、关税和汇率图，按考官要求的方式标注，还能看到用到它的真实新闻。' },
  en: { title: 'Economics Diagram Lab', nav: 'Diagram Lab', drawLink: 'Draw the diagram', openLab: 'Try this diagram in the Diagram Lab',
    card: 'Drag supply and demand, AD–AS, externality, tariff and exchange-rate diagrams, labelled the way examiners expect, with the news stories that use them.' },
  ja: { title: '経済学ダイアグラム・ラボ', nav: '図解ラボ', drawLink: '図を描く', openLab: 'この図を図解ラボで動かす',
    card: '需要と供給、AD–AS、外部性、関税、為替の図をドラッグで動かせます。採点者が求めるラベル付きで、関連ニュースも表示します。' },
  ko: { title: '경제학 다이어그램 랩', nav: '다이어그램 랩', drawLink: '그래프 그리기', openLab: '다이어그램 랩에서 이 그래프 움직여 보기',
    card: '수요·공급, AD–AS, 외부효과, 관세, 환율 그래프를 드래그해 보세요. 채점자가 요구하는 표기와 관련 뉴스까지 함께 보여 줍니다.' },
  fr: { title: 'Laboratoire de graphiques économiques', nav: 'Labo graphiques', drawLink: 'Tracer le graphique', openLab: 'Manipuler ce graphique dans le labo',
    card: "Manipulez les graphiques d'offre et de demande, AD–AS, externalités, droits de douane et taux de change, légendés comme l'attendent les correcteurs, avec les articles qui les utilisent." },
}

export default function diagramNav(lang) { return NAV[lang] || NAV.en }

// Lab link for a case from /api/cases (its `diagram` is set by services/econ_diagrams.py)
export function diagramHref(c) {
  if (!c?.diagram?.id) return null
  const q = new URLSearchParams({ d: c.diagram.id })
  if (c.diagram.preset) q.set('p', c.diagram.preset)
  if (c.diagram.currency) q.set('cur', c.diagram.currency)
  q.set('case', c.id)
  return `/diagrams?${q}`
}

// Study-centre diagrams (routers/study.py diagram_type) that the lab can draw, and the preset to open
export const STUDY_DIAGRAM_LINKS = {
  as_model: '/diagrams?d=adas&p=sras_decrease',
  ad_as_gap: '/diagrams?d=adas&p=ad_decrease',
  phillips: '/diagrams?d=phillips&p=phillips_move_up',
  forex: '/diagrams?d=forex&p=fx_demand_increase&cur=USD',
}
