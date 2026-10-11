// Japanese / Korean / French for the business school guide. The page keeps its Chinese and English
// strings inline (`zh ? '…' : '…'`); other languages look the English string up here and fall back
// to English when a string is missing. School descriptions and programme data stay in English.
import useLangStore from '../store/langStore'

const D = {
  ja: {
    'QS Business': 'QS ビジネス', English: '英語', Bilingual: 'バイリンガル', 'QS overall': 'QS 総合', 'Website →': '公式サイト →',
    Tuition: '学費', 'See official site': '公式サイトを参照', 'Acceptance Rate': '合格率', 'See website': '公式サイトを参照',
    Specialties: '強い分野', 'Top Employment': '主な就職先', Academic: '学業', 'Undergraduate GPA': '学部 GPA',
    'GMAT Median': 'GMAT 中央値', 'GRE Accepted': 'GRE 利用可', Yes: 'はい', No: 'いいえ', 'Language Requirements': '語学要件',
    'Application Deadlines': '出願締切', 'Please visit the official website for detailed requirements': '詳しい出願要件は公式サイトをご覧ください',
    'No alumni data available': '卒業生データはありません', 'School Comparison': '学校比較', QS: 'QS', Business: 'ビジネス',
    Employment: '就職先', '+ Add': '+ 追加', Clear: 'クリア',
    'Business School Mock Interview & Admission Assessment': 'ビジネススクール模擬面接 & 合格評価',
    'Remove from compare': '比較から外す', 'Add to compare': '比較に追加', 'Tuition: see website': '学費：公式サイトを参照',
    'Details →': '詳細 →', 'Standalone school': '独立系ビジネススクール', Similar: 'ほぼ同じ',
    'Could not load the ranking. Refresh to try again.': 'ランキングを読み込めませんでした。再読み込みしてください。',
    'QS Business & Management Studies 2026': 'QS ビジネス・経営学ランキング 2026',
    'of the top 50 rank 10+ places higher than overall, or have no overall rank': '上位50校のうち、総合順位より10位以上高い、または総合ランキング外の学校',
    'By business rank': 'ビジネス順位順', 'Strongest vs overall': '総合との差が大きい順', 'QS business ranking': 'QS ビジネスランキング',
    Rank: '順位', School: '学校', 'vs overall': '総合との差', ' · View profile →': ' · 詳細を見る →', 'Sources: ': '出典：',
    'QS overall 2027 · QS business & management 2026': 'QS 総合 2027 · QS ビジネス・経営学 2026',
    'Global Business School Guide': '世界のビジネススクールガイド', Schools: '校', Countries: 'の国・地域', Languages: '言語',
    'Search schools...': '学校を検索…', 'All Lang': 'すべての言語', 'All Specialties': 'すべての分野',
    'Sort: QS overall': '並び替え：QS 総合', 'Sort: QS business': '並び替え：QS ビジネス', 'Sort: Name A→Z': '並び替え：名前 A→Z',
    'Business school ranking': 'ビジネススクールランキング', 'No schools found — try adjusting filters': '該当する学校がありません。条件を変更してください',
    All: 'すべて', 'North America': '北米', UK: '英国', Europe: 'ヨーロッパ', Asia: 'アジア', Oceania: 'オセアニア',
    'Latin America & other': '中南米・その他', Location: '所在地', Language: '授業言語', Overview: '概要', Programs: 'プログラム',
    Requirements: '出願要件', Alumni: '著名な卒業生',
    "Overall rankings measure a whole university. This subject ranking looks only at business and management: academic reputation, employer reputation and research impact. Schools such as LSE, Bocconi and INSEAD rank far higher here than overall. The comparison column shows the same university in the QS World University Rankings 2027.": "総合ランキングは大学全体を評価します。この分野別ランキングはビジネス・経営学のみを対象に、学術的評価、雇用主からの評価、研究の影響力を見ています。LSE、Bocconi、INSEAD などは総合順位よりはるかに上位です。比較列は同じ大学の QS 世界大学ランキング 2027 での順位です。",
    "Rankings: QS World University Rankings 2027 (overall) and QS World University Rankings by Subject 2026: Business & Management Studies. Tuition, GMAT, deadlines and employment figures were checked against school reports in October 2026; anything that could not be verified is left blank, so always confirm with the official school website.": "出典：QS World University Rankings 2027（総合）、QS World University Rankings by Subject 2026: Business & Management Studies。学費、GMAT、締切、就職データは 2026 年 10 月に各校の資料と照合しました。確認できなかった項目は空欄です。必ず各校の公式サイトでご確認ください。",
    "AI acts as a rigorous admissions interviewer. Combines your scores & interview to estimate admission probability (rough range) and provide actionable feedback": "AIが厳格な入試面接官を務め、成績と面接内容から合格可能性の目安（概算）と具体的な改善アドバイスを示します",
    "In-depth profiles \u00b7 specialty filters \u00b7 everything you need to choose your school": "詳しい学校情報 · 分野で絞り込み · 学校選びに必要な情報をひとつに",
  },
  ko: {
    'QS Business': 'QS 비즈니스', English: '영어', Bilingual: '이중 언어', 'QS overall': 'QS 종합', 'Website →': '공식 웹사이트 →',
    Tuition: '학비', 'See official site': '공식 웹사이트 참조', 'Acceptance Rate': '합격률', 'See website': '공식 웹사이트 참조',
    Specialties: '강점 분야', 'Top Employment': '주요 취업처', Academic: '학업', 'Undergraduate GPA': '학부 GPA',
    'GMAT Median': 'GMAT 중앙값', 'GRE Accepted': 'GRE 인정', Yes: '예', No: '아니요', 'Language Requirements': '어학 요건',
    'Application Deadlines': '지원 마감일', 'Please visit the official website for detailed requirements': '자세한 지원 요건은 공식 웹사이트를 확인하세요',
    'No alumni data available': '동문 데이터가 없습니다', 'School Comparison': '학교 비교', QS: 'QS', Business: '비즈니스',
    Employment: '취업처', '+ Add': '+ 추가', Clear: '지우기',
    'Business School Mock Interview & Admission Assessment': '경영대학 모의 면접 & 합격 평가',
    'Remove from compare': '비교에서 제거', 'Add to compare': '비교에 추가', 'Tuition: see website': '학비: 공식 웹사이트 참조',
    'Details →': '자세히 →', 'Standalone school': '독립 경영대학', Similar: '비슷함',
    'Could not load the ranking. Refresh to try again.': '순위를 불러오지 못했습니다. 새로고침해 주세요.',
    'QS Business & Management Studies 2026': 'QS 경영학 순위 2026',
    'of the top 50 rank 10+ places higher than overall, or have no overall rank': '상위 50개 중 종합 순위보다 10위 이상 높거나 종합 순위에 없는 학교',
    'By business rank': '비즈니스 순위순', 'Strongest vs overall': '종합 대비 강세순', 'QS business ranking': 'QS 비즈니스 순위',
    Rank: '순위', School: '학교', 'vs overall': '종합 대비', ' · View profile →': ' · 자세히 보기 →', 'Sources: ': '출처: ',
    'QS overall 2027 · QS business & management 2026': 'QS 종합 2027 · QS 경영학 2026',
    'Global Business School Guide': '세계 경영대학 가이드', Schools: '개 학교', Countries: '개 국가/지역', Languages: '개 언어',
    'Search schools...': '학교 검색…', 'All Lang': '모든 언어', 'All Specialties': '모든 분야',
    'Sort: QS overall': '정렬: QS 종합', 'Sort: QS business': '정렬: QS 비즈니스', 'Sort: Name A→Z': '정렬: 이름 A→Z',
    'Business school ranking': '경영대학 순위', 'No schools found — try adjusting filters': '조건에 맞는 학교가 없습니다. 필터를 조정해 보세요',
    All: '전체', 'North America': '북미', UK: '영국', Europe: '유럽', Asia: '아시아', Oceania: '오세아니아',
    'Latin America & other': '중남미 및 기타', Location: '위치', Language: '수업 언어', Overview: '개요', Programs: '프로그램',
    Requirements: '지원 요건', Alumni: '저명한 동문',
    "Overall rankings measure a whole university. This subject ranking looks only at business and management: academic reputation, employer reputation and research impact. Schools such as LSE, Bocconi and INSEAD rank far higher here than overall. The comparison column shows the same university in the QS World University Rankings 2027.": "종합 순위는 대학 전체를 평가합니다. 이 분야별 순위는 경영학만을 대상으로 학계 평판, 고용주 평판, 연구 영향력을 봅니다. LSE, Bocconi, INSEAD 같은 학교는 종합 순위보다 훨씬 높습니다. 비교 열은 같은 대학의 QS 세계 대학 순위 2027 순위입니다.",
    "Rankings: QS World University Rankings 2027 (overall) and QS World University Rankings by Subject 2026: Business & Management Studies. Tuition, GMAT, deadlines and employment figures were checked against school reports in October 2026; anything that could not be verified is left blank, so always confirm with the official school website.": "출처: QS World University Rankings 2027(종합), QS World University Rankings by Subject 2026: Business & Management Studies. 학비, GMAT, 마감일, 취업 데이터는 2026년 10월 각 학교 자료와 대조했습니다. 확인할 수 없는 항목은 비워 두었으니 반드시 학교 공식 웹사이트에서 확인하세요.",
    "AI acts as a rigorous admissions interviewer. Combines your scores & interview to estimate admission probability (rough range) and provide actionable feedback": "AI가 엄격한 입학 면접관이 되어 성적과 면접 내용을 바탕으로 합격 가능성(대략적 범위)과 구체적인 개선 조언을 제공합니다",
    "In-depth profiles \u00b7 specialty filters \u00b7 everything you need to choose your school": "상세한 학교 정보 · 분야별 필터 · 학교 선택에 필요한 모든 정보",
  },
  fr: {
    'QS Business': 'QS Business', English: 'Anglais', Bilingual: 'Bilingue', 'QS overall': 'QS général', 'Website →': 'Site officiel →',
    Tuition: 'Frais de scolarité', 'See official site': 'Voir le site officiel', 'Acceptance Rate': "Taux d'admission", 'See website': 'Voir le site officiel',
    Specialties: 'Points forts', 'Top Employment': 'Principaux employeurs', Academic: 'Résultats scolaires', 'Undergraduate GPA': 'GPA de licence',
    'GMAT Median': 'GMAT médian', 'GRE Accepted': 'GRE accepté', Yes: 'Oui', No: 'Non', 'Language Requirements': 'Exigences linguistiques',
    'Application Deadlines': 'Dates limites', 'Please visit the official website for detailed requirements': "Consultez le site officiel pour le détail des conditions d'admission",
    'No alumni data available': "Pas de données sur les anciens élèves", 'School Comparison': 'Comparaison des écoles', QS: 'QS', Business: 'Business',
    Employment: 'Employeurs', '+ Add': '+ Ajouter', Clear: 'Effacer',
    'Business School Mock Interview & Admission Assessment': "Entretien blanc d'école de commerce & évaluation d'admission",
    'Remove from compare': 'Retirer de la comparaison', 'Add to compare': 'Ajouter à la comparaison', 'Tuition: see website': 'Frais : voir le site officiel',
    'Details →': 'Détails →', 'Standalone school': 'École indépendante', Similar: 'Proche',
    'Could not load the ranking. Refresh to try again.': 'Impossible de charger le classement. Actualisez la page.',
    'QS Business & Management Studies 2026': 'QS Business & Management 2026',
    'of the top 50 rank 10+ places higher than overall, or have no overall rank': "du top 50 sont classées 10 places ou plus au-dessus de leur rang général, ou n'ont pas de rang général",
    'By business rank': 'Par rang business', 'Strongest vs overall': "Plus fort écart avec le général", 'QS business ranking': 'Classement QS business',
    Rank: 'Rang', School: 'École', 'vs overall': 'vs général', ' · View profile →': ' · Voir la fiche →', 'Sources: ': 'Sources : ',
    'QS overall 2027 · QS business & management 2026': 'QS général 2027 · QS business & management 2026',
    'Global Business School Guide': 'Guide mondial des écoles de commerce', Schools: 'écoles', Countries: 'pays et régions', Languages: 'langues',
    'Search schools...': 'Rechercher une école…', 'All Lang': 'Toutes les langues', 'All Specialties': 'Tous les domaines',
    'Sort: QS overall': 'Trier : QS général', 'Sort: QS business': 'Trier : QS business', 'Sort: Name A→Z': 'Trier : nom A→Z',
    'Business school ranking': 'Classement des écoles de commerce', 'No schools found — try adjusting filters': 'Aucune école trouvée. Modifiez les filtres',
    All: 'Toutes', 'North America': 'Amérique du Nord', UK: 'Royaume-Uni', Europe: 'Europe', Asia: 'Asie', Oceania: 'Océanie',
    'Latin America & other': 'Amérique latine et autres', Location: 'Lieu', Language: "Langue d'enseignement", Overview: 'Aperçu', Programs: 'Programmes',
    Requirements: "Conditions d'admission", Alumni: 'Anciens élèves célèbres',
    "Overall rankings measure a whole university. This subject ranking looks only at business and management: academic reputation, employer reputation and research impact. Schools such as LSE, Bocconi and INSEAD rank far higher here than overall. The comparison column shows the same university in the QS World University Rankings 2027.": "Le classement général évalue toute l'université. Ce classement par discipline ne regarde que la gestion : réputation académique, réputation auprès des employeurs et impact de la recherche. Des écoles comme LSE, Bocconi ou INSEAD y sont bien mieux classées qu'au général. La colonne de comparaison indique le rang de la même université au QS World University Rankings 2027.",
    "Rankings: QS World University Rankings 2027 (overall) and QS World University Rankings by Subject 2026: Business & Management Studies. Tuition, GMAT, deadlines and employment figures were checked against school reports in October 2026; anything that could not be verified is left blank, so always confirm with the official school website.": "Sources : QS World University Rankings 2027 (général) et QS World University Rankings by Subject 2026 : Business & Management Studies. Les frais, le GMAT, les dates limites et les données d'emploi ont été vérifiés auprès des écoles en octobre 2026 ; ce qui n'a pas pu être vérifié est laissé vide, confirmez toujours sur le site officiel de l'école.",
    "AI acts as a rigorous admissions interviewer. Combines your scores & interview to estimate admission probability (rough range) and provide actionable feedback": "Une IA joue le rôle d'un jury d'admission exigeant : à partir de vos notes et de l'entretien, elle estime vos chances d'admission (fourchette approximative) et donne des conseils concrets",
    "In-depth profiles \u00b7 specialty filters \u00b7 everything you need to choose your school": "Fiches détaillées · filtres par domaine · tout pour choisir votre école",
  },
}

// Sentences with numbers in them
const F = {
  ja: {
    gapAbove: (g) => `総合順位より ${g} 位上`, classOf: (y) => `${y}年卒`, compareN3: (n) => `比較 (${n}/3)`, compareN: (n) => `${n} 校を比較`,
    showMore: (n) => `さらに表示（残り ${n} 校）`, published: (d) => `（${d} 公表）；`,
    overallPublished: (d) => `（${d} 公表）。「独立系ビジネススクール」は総合ランキングに含まれない学校です。詳細のある学校はクリックで開けます。`,
    directory: (n) => `学校一覧 · ${n}`,
  },
  ko: {
    gapAbove: (g) => `종합 순위보다 ${g}위 높음`, classOf: (y) => `${y}년 졸업`, compareN3: (n) => `비교 (${n}/3)`, compareN: (n) => `${n}개 학교 비교`,
    showMore: (n) => `더 보기 (${n}개 남음)`, published: (d) => ` (${d} 발표); `,
    overallPublished: (d) => ` (${d} 발표). '독립 경영대학'은 종합 순위에 포함되지 않은 학교입니다. 프로필이 있는 학교를 누르면 자세히 볼 수 있습니다.`,
    directory: (n) => `학교 목록 · ${n}`,
  },
  fr: {
    gapAbove: (g) => `${g} places au-dessus du général`, classOf: (y) => `Promotion ${y}`, compareN3: (n) => `Comparer (${n}/3)`, compareN: (n) => `Comparer ${n} écoles`,
    showMore: (n) => `Afficher plus (${n} restantes)`, published: (d) => ` (publié le ${d}) ; `,
    overallPublished: (d) => ` (publié le ${d}). « École indépendante » désigne un établissement absent du classement général. Les lignes avec une fiche ouvrent son détail.`,
    directory: (n) => `Annuaire des écoles · ${n}`,
  },
}

const lang = () => useLangStore.getState().lang

/** Inline pair → the reader's language (zh / en as written, ja / ko / fr from the table above). */
export function tx(zhStr, enStr) {
  const l = lang()
  if (l === 'zh') return zhStr
  return D[l]?.[enStr] ?? enStr
}

/** An English label from the data (regions, compare rows, tabs) in ja / ko / fr. */
export function txEn(enStr) {
  return D[lang()]?.[enStr] ?? enStr
}

/** Sentences with numbers: F[lang][key](...args), or null to keep the inline zh / en version. */
export function txf(key, ...args) {
  const f = F[lang()]?.[key]
  return f ? f(...args) : null
}
