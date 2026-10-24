// Wording for the essay-example library (cases). Case text comes from the server: Chinese for zh,
// English for the other languages.

const zh = {
  title: '经济学案例库', nav: '案例库',
  subtitle: '每天从真实新闻里挑出能写进经济学论文的案例：对应考纲知识点、可以引用的数据、评估角度和一道练习题。',
  allBoards: '全部考试', boards: { ib: 'IB', alevel: 'A-Level', ap_macro: 'AP 宏观', ap_micro: 'AP 微观', igcse: 'IGCSE' },
  search: '搜索案例，例如 关税、通胀、OPEC', concepts: '知识点', allConcepts: '全部知识点', saved: '我的收藏',
  what: '发生了什么', angle: '经济学角度', data: '可以引用的数据', evaluate: '评估角度', question: '练习题',
  readSource: '阅读原文', copy: '复制引用', copied: '已复制', save: '收藏', unsave: '取消收藏', study: '复习这个知识点',
  more: '加载更多', count: (n) => `${n} 个案例`, none: '没有找到符合条件的案例。换个知识点或关键词试试。',
  building: '案例库正在建设中：每 90 分钟从最新新闻里挑选新的案例，稍后再来看看。',
  savedEmpty: '还没有收藏。看到能写进论文的案例，点“收藏”保存在这台设备上。',
  how: '怎么用', howText: '写论文时，先说明知识点和机制（经济学角度），再用真实数据支撑，最后给出评估。考官最看重“真实案例 + 评估”。',
  note: '案例由 AI 根据新闻标题和导语撰写，只使用原文中的事实；引用的数据都出自原文。引用前请阅读原文核实。',
  sourceLang: { cn: '中文来源', en: '英文来源' },
}

const en = {
  title: 'Economics Case Library', nav: 'Case Library',
  subtitle: 'Real news turned into examples you can use in economics essays: the syllabus concept, figures to quote, an evaluation point and a practice question.',
  allBoards: 'All exams', boards: { ib: 'IB', alevel: 'A-Level', ap_macro: 'AP Macro', ap_micro: 'AP Micro', igcse: 'IGCSE' },
  search: 'Search cases, e.g. tariffs, inflation, OPEC', concepts: 'Concepts', allConcepts: 'All concepts', saved: 'Saved',
  what: 'What happened', angle: 'The economics', data: 'Figures to quote', evaluate: 'Evaluation', question: 'Practice question',
  readSource: 'Read the article', copy: 'Copy citation', copied: 'Copied', save: 'Save', unsave: 'Remove', study: 'Revise this topic',
  more: 'Load more', count: (n) => `${n} case${n === 1 ? '' : 's'}`, none: 'No cases match. Try another concept or keyword.',
  building: 'The library is being built: new cases are picked from the latest news every 90 minutes. Check back soon.',
  savedEmpty: 'Nothing saved yet. When you find a case for your essay, press Save to keep it on this device.',
  how: 'How to use it', howText: 'In an essay, name the concept and explain the mechanism, back it with real figures, then evaluate. Examiners reward a real example plus evaluation.',
  note: 'Cases are written by AI from the article headline and lead, using only facts from the article; every quoted figure comes from it. Read the original before citing.',
  sourceLang: { cn: 'Chinese source', en: 'English source' },
}

const ja = {
  ...en,
  title: '経済学ケースライブラリ', nav: 'ケース集',
  subtitle: '実際のニュースを経済学の論述で使える事例に：シラバスの概念、引用できる数字、評価のポイント、練習問題。',
  allBoards: 'すべての試験', boards: { ib: 'IB', alevel: 'A-Level', ap_macro: 'AP マクロ', ap_micro: 'AP ミクロ', igcse: 'IGCSE' },
  search: 'ケースを検索（例：関税、インフレ）', concepts: '概念', allConcepts: 'すべての概念', saved: '保存済み',
  what: '何が起きたか', angle: '経済学の視点', data: '引用できる数字', evaluate: '評価', question: '練習問題',
  readSource: '元記事を読む', copy: '出典をコピー', copied: 'コピーしました', save: '保存', unsave: '保存を解除', study: 'この単元を復習',
  more: 'もっと見る', count: (n) => `${n} 件`, none: '該当するケースがありません。別の概念やキーワードを試してください。',
  building: 'ライブラリを作成中です。90分ごとに最新ニュースから新しいケースを追加します。',
  savedEmpty: 'まだ保存がありません。論述に使えるケースは「保存」でこの端末に残せます。',
  how: '使い方', howText: '論述では概念とメカニズムを説明し、実際の数字で裏付け、最後に評価を加えます。',
  note: 'ケースは記事の見出しとリードをもとにAIが作成し、記事中の事実だけを使っています。引用前に元記事を確認してください。（本文は英語で表示されます）',
  sourceLang: { cn: '中国語の記事', en: '英語の記事' },
}

const ko = {
  ...en,
  title: '경제학 사례 라이브러리', nav: '사례집',
  subtitle: '실제 뉴스를 경제학 에세이에 쓸 수 있는 사례로: 교과 개념, 인용할 수치, 평가 포인트와 연습 문제.',
  allBoards: '모든 시험', boards: { ib: 'IB', alevel: 'A-Level', ap_macro: 'AP 거시', ap_micro: 'AP 미시', igcse: 'IGCSE' },
  search: '사례 검색 (예: 관세, 인플레이션)', concepts: '개념', allConcepts: '모든 개념', saved: '저장함',
  what: '무슨 일이 있었나', angle: '경제학 관점', data: '인용할 수치', evaluate: '평가', question: '연습 문제',
  readSource: '원문 읽기', copy: '출처 복사', copied: '복사됨', save: '저장', unsave: '저장 취소', study: '이 단원 복습',
  more: '더 보기', count: (n) => `${n}건`, none: '조건에 맞는 사례가 없습니다. 다른 개념이나 키워드를 시도해 보세요.',
  building: '라이브러리를 만드는 중입니다. 90분마다 최신 뉴스에서 새 사례를 추가합니다.',
  savedEmpty: '아직 저장한 사례가 없습니다. 에세이에 쓸 사례는 "저장"을 눌러 이 기기에 보관하세요.',
  how: '활용법', howText: '에세이에서는 개념과 작동 원리를 설명하고, 실제 수치로 뒷받침한 뒤 평가로 마무리하세요.',
  note: '사례는 기사 제목과 도입부를 바탕으로 AI가 작성했으며 기사 속 사실만 사용합니다. 인용 전에 원문을 확인하세요. (본문은 영어로 표시됩니다)',
  sourceLang: { cn: '중국어 기사', en: '영어 기사' },
}

const fr = {
  ...en,
  title: "Bibliothèque d'études de cas", nav: 'Études de cas',
  subtitle: "L'actualité réelle transformée en exemples pour vos dissertations d'économie : la notion du programme, des chiffres à citer, un point d'évaluation et une question d'entraînement.",
  allBoards: 'Tous les examens', boards: { ib: 'IB', alevel: 'A-Level', ap_macro: 'AP Macro', ap_micro: 'AP Micro', igcse: 'IGCSE' },
  search: 'Rechercher, ex. droits de douane, inflation', concepts: 'Notions', allConcepts: 'Toutes les notions', saved: 'Enregistrés',
  what: "Ce qui s'est passé", angle: "L'analyse économique", data: 'Chiffres à citer', evaluate: 'Évaluation', question: "Question d'entraînement",
  readSource: "Lire l'article", copy: 'Copier la référence', copied: 'Copié', save: 'Enregistrer', unsave: 'Retirer', study: 'Réviser ce chapitre',
  more: 'Voir plus', count: (n) => `${n} cas`, none: 'Aucun cas ne correspond. Essayez une autre notion ou un autre mot-clé.',
  building: 'La bibliothèque se construit : de nouveaux cas sont tirés de l\'actualité toutes les 90 minutes.',
  savedEmpty: 'Rien d\'enregistré. Quand un cas vous servira, appuyez sur « Enregistrer » pour le garder sur cet appareil.',
  how: 'Mode d\'emploi', howText: 'Dans une dissertation, nommez la notion, expliquez le mécanisme, appuyez-vous sur des chiffres réels, puis évaluez.',
  note: "Les cas sont rédigés par une IA à partir du titre et du chapeau de l'article, avec uniquement les faits de l'article. Lisez l'original avant de citer. (Texte affiché en anglais)",
  sourceLang: { cn: 'Source chinoise', en: 'Source anglaise' },
}

const ALL = { zh, en, ja, ko, fr }
export default function casesStrings(lang) { return ALL[lang] || en }
