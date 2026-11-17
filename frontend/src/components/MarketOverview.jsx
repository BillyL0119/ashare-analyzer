import { useMobile } from '../hooks/useMobile'
import Icon from './Icon'
import useCompareStore from '../store/compareStore'
import { T } from '../i18n/translations'

const SUBTITLE = {
  zh: '专为学生设计的美股与 A 股智能分析平台 · 完全免费',
  en: 'Smart US & China Stock Analysis for Students · Completely Free',
  ja: '学生のための米国株・中国株分析プラットフォーム · 完全無料',
  ko: '학생을 위한 미국·중국 주식 분석 플랫폼 · 완전 무료',
  fr: 'Analyse des actions US et chinoises pour étudiants · Entièrement gratuit',
}

// action.appTab  → switch the main app tab
// action.viewMode → switch ComparePanel viewMode (sub-tab)
// action.openKnowledge → open the daily knowledge popup
const FEATURES = [
  { icon: 'chart', tint: 'blue', action: { appTab: 'analysis', viewMode: 'analysis' },
    title: { zh: 'AI 个股分析', en: 'AI Stock Analysis', ja: 'AI 個別株分析', ko: 'AI 종목 분석', fr: 'Analyse IA' },
    desc: {
      zh: 'K 线、综合评分、相似走势与 AI 解读，美股和 A 股都支持',
      en: 'Charts, a five-factor score, similar movers and an AI write-up for any US or China stock',
      ja: 'チャート、総合スコア、類似銘柄、AI 解説。米国株と中国株に対応',
      ko: '차트, 종합 점수, 유사 종목, AI 해설까지. 미국·중국 주식 모두 지원',
      fr: 'Graphiques, score global, valeurs similaires et analyse IA, actions US et chinoises',
    } },
  { icon: 'news', tint: 'pink', action: { appTab: 'news' },
    title: { zh: '每日资讯', en: 'Daily News', ja: 'デイリーニュース', ko: '데일리 뉴스', fr: 'Actualités' },
    desc: {
      zh: '美股与 A 股要闻、投行观点，每只股票附 AI 情绪评分',
      en: 'Market headlines and bank research views, with AI sentiment for each stock',
      ja: '市場ニュースと投資銀行の見解。銘柄ごとに AI センチメント付き',
      ko: '시장 뉴스와 투자은행 리포트, 종목별 AI 감성 점수 제공',
      fr: 'Actualités et avis des banques, avec sentiment IA par action',
    } },
  { icon: 'cash', tint: 'green', action: { appTab: 'paper' },
    title: { zh: '模拟炒股', en: 'Paper Trading', ja: '模擬トレード', ko: '모의 투자', fr: 'Bourse virtuelle' },
    desc: {
      zh: '$100,000 美股虚拟资金（另有 ¥100 万 A 股账户），按实时价格下单',
      en: '$100,000 in virtual cash for US stocks, plus a ¥1M China account, filled at live prices',
      ja: '米国株用に仮想資金 $100,000（中国株口座 ¥100 万も）。リアルタイム価格で約定',
      ko: '미국 주식용 가상자금 $100,000 (중국 주식 ¥100만 계좌 별도), 실시간 가격 체결',
      fr: '100 000 $ virtuels pour les actions US, plus un compte chinois de 1 M ¥, au prix réel',
    } },
  { icon: 'book', tint: 'orange', action: { appTab: 'study' },
    title: { zh: '学习中心', en: 'Study Center', ja: '学習センター', ko: '학습 센터', fr: "Centre d'étude" },
    desc: {
      zh: '从美股入门课到 A-Level、IB、AP 经济学，配真实市场案例',
      en: 'From a US stock primer to A-Level, IB and AP Economics, with real market cases',
      ja: '米国株入門から A-Level・IB・AP 経済学まで。実際の市場事例つき',
      ko: '미국 주식 입문부터 A-Level·IB·AP 경제학까지, 실제 시장 사례 포함',
      fr: "De l'initiation aux actions US jusqu'à l'économie A-Level, IB et AP, avec cas réels",
    } },
  { icon: 'tutor', tint: 'violet', action: { appTab: 'ai_teacher' },
    title: { zh: 'AI 老师', en: 'AI Teacher', ja: 'AI 先生', ko: 'AI 선생님', fr: 'Professeur IA' },
    desc: {
      zh: '随时问投资和经济学问题，按你的水平讲解',
      en: 'Ask anything about investing or economics and get an answer pitched at your level',
      ja: '投資や経済学の疑問をいつでも質問。レベルに合わせて解説',
      ko: '투자·경제학 질문을 언제든지, 내 수준에 맞춰 설명',
      fr: "Posez vos questions d'investissement ou d'économie, expliquées à votre niveau",
    } },
  { icon: 'briefcase', tint: 'red', action: { appTab: 'career' },
    title: { zh: '金融职业', en: 'Finance Careers', ja: '金融キャリア', ko: '금융 커리어', fr: 'Carrières finance' },
    desc: {
      zh: '了解投行、研究、交易等岗位，再用 AI 做一次模拟面试',
      en: 'See what banking, research and trading roles involve, then try an AI mock interview',
      ja: '投資銀行・リサーチ・トレーディングの仕事を知り、AI 模擬面接に挑戦',
      ko: 'IB·리서치·트레이딩 직무를 알아보고 AI 모의 면접까지',
      fr: 'Découvrez banque, recherche et trading, puis passez un entretien blanc avec l’IA',
    } },
]

export default function MarketOverview({ lang, onTabChange, onOpenKnowledge }) {
  const t = T[lang] || T.en
  const zh = lang === 'zh'
  const isMobile = useMobile()
  const { setViewMode } = useCompareStore()

  const handleCardClick = (action) => {
    if (!action) return
    if (action.openKnowledge) {
      onOpenKnowledge?.()
      return
    }
    if (action.appTab) onTabChange?.(action.appTab)
    if (action.viewMode) setViewMode(action.viewMode)
  }

  const focusSearch = () => {
    const input = document.querySelector('header input[type="text"]') ||
                  document.querySelector('header input')
    if (input) { input.focus(); input.select() }
  }

  // The site's own index: a big heading, two round buttons, then every section as a tile
  return (
    <section className="bfs-about" style={{ padding: isMobile ? '32px 0 24px' : '56px 0 40px', width: '100%' }}>
      <h2 style={{ margin: '0 0 10px', fontSize: isMobile ? 30 : 44, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.035em' }}>{t.moSlogan}</h2>
      <p style={{ fontSize: isMobile ? 15 : 17, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5, maxWidth: '60ch' }}>
        {SUBTITLE[lang] || SUBTITLE.en}
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
        <button className="bfs-about-btn is-primary" onClick={focusSearch}>{t.moStart}</button>
        <button className="bfs-about-btn" onClick={() => onTabChange && onTabChange('study')}>{t.moStudy}</button>
      </div>

      <ul className="bfs-about-list" role="list">
        {FEATURES.map((f) => (
          <li key={f.title.en}>
            <button type="button" onClick={() => handleCardClick(f.action)}>
              <span className="bfs-about-chip" style={{ background: `var(--chip-${f.tint})` }}><Icon name={f.icon} size={22} strokeWidth={2} /></span>
              <span>
                <b>{f.title[lang] || f.title.en}</b>
                <span className="bfs-about-text">{f.desc[lang] || f.desc.en}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.8, margin: '24px 0 0' }}>
        {zh
          ? '由两名高中生 Billy 和 Frank 合作开发 · 仅供学习用途'
          : 'Built by two high school students, Billy & Frank · For educational use only'}
        <br />
        {zh
          ? '数据来源：腾讯财经 · 纳斯达克 · 新浪财经 · AkShare'
          : 'Data: Tencent Finance · Nasdaq · Sina Finance · AkShare'}
      </p>

      <style>{`
        .bfs-about-btn {
          padding: 13px 26px; border-radius: 999px; cursor: pointer;
          font: inherit; font-size: 15px; font-weight: 700;
          border: 0; background: var(--bg-tertiary); color: var(--text-primary);
        }
        .bfs-about-btn:hover { background: var(--bg-hover); }
        .bfs-about-btn.is-primary { background: var(--accent-blue); color: #fff; }
        .bfs-about-btn.is-primary:hover { background: var(--accent-blue); filter: brightness(1.1); }
        .bfs-about-list {
          list-style: none; margin: 0; padding: 0;
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;
        }
        .bfs-about-list button {
          display: flex; align-items: flex-start; gap: 14px; width: 100%; height: 100%; padding: 18px; text-align: left;
          background: var(--bg-secondary); border: 0; border-radius: 18px; cursor: pointer; font: inherit; color: inherit;
        }
        .bfs-about-list button:hover { background: var(--bg-hover); }
        .bfs-about-chip { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; color: #fff; }
        .bfs-about-list b { display: block; margin-bottom: 4px; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: var(--text-primary); }
        .bfs-about-text { display: block; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
        @media (max-width: 900px) { .bfs-about-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .bfs-about-list { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </section>
  )
}
