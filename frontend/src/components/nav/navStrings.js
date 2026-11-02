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
  hide: 'Masquer',
}

const ALL = { zh, en, ja, ko, fr }
export default function navStrings(lang) { return ALL[lang] || en }
