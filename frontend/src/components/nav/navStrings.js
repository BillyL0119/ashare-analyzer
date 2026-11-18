// Words for the grouped desktop nav and the home page's "start here" block. Five languages.
// Page names and descriptions come from each feature's own strings (see navItems.js and StartHere.jsx);
// these are only the words no page had yet.

const zh = {
  label: '网站栏目',
  sections: { markets: '行情', practice: '模拟练习', learn: '学习', future: '升学与求职' },
  startTitle: '第一次来？从这里开始',
  students: '学生：先试试这些',
  teachers: '老师：班级与作业',
  studyCard: '选你的考试（A-Level、IB、AP、IGCSE）或股票入门，从第一课学起，附考试技巧和真实案例。',
  hasCode: '老师给了你班级码？',
  isTeacher: '是老师？',
  introTitle: '用真实行情学投资和经济学',
  introSub: '免费给中学生和大学生用：看美股和 A 股，用虚拟资金练习交易，备考 A-Level、IB 和 AP 经济学。',
  startStudy: '去学习中心',
  searchStock: '搜索股票',
  paperCard: '用 10 万美元虚拟资金买卖美股，按实时价格成交。',
  tryThese: '也可以试试',
  hide: '收起',
}

const en = {
  label: 'Site sections',
  sections: { markets: 'Markets', practice: 'Practice', learn: 'Learn', future: 'Universities & careers' },
  startTitle: 'New here? Start here',
  students: 'Students: try these first',
  teachers: 'Teachers: classes and assignments',
  studyCard: 'Pick your exam (A-Level, IB, AP or IGCSE) or stock-market basics and start from the first lesson, with exam tips and real-world examples.',
  hasCode: 'Got a class code from your teacher?',
  isTeacher: 'Teacher?',
  introTitle: 'Learn investing and economics with real market data',
  introSub: 'Free for school and university students: follow US and China stocks, practise trading with virtual money, and prepare for A-Level, IB and AP Economics.',
  startStudy: 'Open the study center',
  searchStock: 'Search a stock',
  paperCard: 'Trade US stocks with $100,000 in virtual cash, filled at live prices.',
  tryThese: 'Also try',
  hide: 'Hide',
}

const ja = {
  label: 'サイトのメニュー',
  sections: { markets: 'マーケット', practice: '実践', learn: '学ぶ', future: '進学・キャリア' },
  startTitle: 'はじめての方はここから',
  students: '学生のみなさん：まずはこちら',
  teachers: '先生のみなさん：クラスと課題',
  studyCard: '試験（A-Level・IB・AP・IGCSE）か株式入門を選び、最初の単元から学べます。試験のコツと実例つきです。',
  hasCode: '先生からクラスコードをもらいましたか？',
  isTeacher: '先生の方は',
  introTitle: '本物の相場で投資と経済学を学ぶ',
  introSub: '中高生・大学生向けに無料。米国株と中国株を見て、仮想資金で売買を練習し、A-Level・IB・AP 経済学の試験に備えられます。',
  startStudy: '学習センターへ',
  searchStock: '銘柄を検索',
  paperCard: '10万ドルの仮想資金で米国株を売買。実際の株価で約定します。',
  tryThese: 'こちらもどうぞ',
  hide: '閉じる',
}

const ko = {
  label: '사이트 메뉴',
  sections: { markets: '시장', practice: '실전 연습', learn: '배우기', future: '진학·취업' },
  startTitle: '처음이라면 여기서 시작하세요',
  students: '학생: 이것부터 해 보세요',
  teachers: '선생님: 클래스와 과제',
  studyCard: '시험(A-Level, IB, AP, IGCSE)이나 주식 입문을 고르고 첫 단원부터 시작하세요. 시험 팁과 실제 사례가 함께 나옵니다.',
  hasCode: '선생님께 클래스 코드를 받았나요?',
  isTeacher: '선생님이신가요?',
  introTitle: '실제 시장 데이터로 배우는 투자와 경제학',
  introSub: '중고등학생과 대학생을 위한 무료 사이트입니다. 미국·중국 주식을 보고, 가상 자금으로 매매를 연습하고, A-Level·IB·AP 경제학 시험을 준비하세요.',
  startStudy: '학습 센터 열기',
  searchStock: '종목 검색',
  paperCard: '가상 자금 10만 달러로 미국 주식을 실시간 가격에 매매합니다.',
  tryThese: '이것도 해 보세요',
  hide: '접기',
}

const fr = {
  label: 'Sections du site',
  sections: { markets: 'Marchés', practice: "S'entraîner", learn: 'Apprendre', future: 'Études et carrières' },
  startTitle: 'Première visite ? Commencez ici',
  students: 'Élèves et étudiants : commencez par ceci',
  teachers: 'Enseignants : classes et devoirs',
  studyCard: "Choisissez votre examen (A-Level, IB, AP ou IGCSE) ou l'initiation à la Bourse, puis commencez par la première leçon, avec des conseils d'examen et des exemples réels.",
  hasCode: 'Votre enseignant vous a donné un code de classe ?',
  isTeacher: 'Enseignant ?',
  introTitle: "Apprendre l'investissement et l'économie avec de vraies données de marché",
  introSub: "Gratuit pour les lycéens et les étudiants : suivez les actions américaines et chinoises, entraînez-vous avec de l'argent virtuel et préparez l'économie A-Level, IB et AP.",
  startStudy: "Ouvrir le centre d'étude",
  searchStock: 'Chercher une action',
  paperCard: "Achetez et vendez des actions américaines avec 100 000 $ virtuels, aux prix en direct.",
  tryThese: 'À essayer aussi',
  hide: 'Masquer',
}

const ALL = { zh, en, ja, ko, fr }
export default function navStrings(lang) { return ALL[lang] || en }
