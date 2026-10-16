import useCompareStore from '../store/compareStore'

// The end of the home page: what the site does, one capability per band, then a short letter
// from the two students who made it. Everything here links somewhere real.

// action.appTab  → switch the main app tab
// action.viewMode → switch ComparePanel viewMode (sub-tab)
// action.openKnowledge → open the daily knowledge popup
const FEATURES = [
  { action: { appTab: 'analysis', viewMode: 'analysis' },
    title: { zh: 'AI 个股分析', en: 'AI Stock Analysis', ja: 'AI 個別株分析', ko: 'AI 종목 분석', fr: 'Analyse IA' },
    desc: {
      zh: 'K 线、综合评分、相似走势与 AI 解读，美股和 A 股都支持',
      en: 'Charts, a five-factor score, similar movers and an AI write-up for any US or China stock',
      ja: 'チャート、総合スコア、類似銘柄、AI 解説。米国株と中国株に対応',
      ko: '차트, 종합 점수, 유사 종목, AI 해설까지. 미국·중국 주식 모두 지원',
      fr: 'Graphiques, score global, valeurs similaires et analyse IA, actions US et chinoises',
    } },
  { action: { appTab: 'news' },
    title: { zh: '每日资讯', en: 'Daily News', ja: 'デイリーニュース', ko: '데일리 뉴스', fr: 'Actualités' },
    desc: {
      zh: '美股与 A 股要闻、投行观点，每只股票附 AI 情绪评分',
      en: 'Market headlines and bank research views, with AI sentiment for each stock',
      ja: '市場ニュースと投資銀行の見解。銘柄ごとに AI センチメント付き',
      ko: '시장 뉴스와 투자은행 리포트, 종목별 AI 감성 점수 제공',
      fr: 'Actualités et avis des banques, avec sentiment IA par action',
    } },
  { action: { appTab: 'paper' },
    title: { zh: '模拟炒股', en: 'Paper Trading', ja: '模擬トレード', ko: '모의 투자', fr: 'Bourse virtuelle' },
    desc: {
      zh: '$100,000 美股虚拟资金（另有 ¥100 万 A 股账户），按实时价格下单',
      en: '$100,000 in virtual cash for US stocks, plus a ¥1M China account, filled at live prices',
      ja: '米国株用に仮想資金 $100,000（中国株口座 ¥100 万も）。リアルタイム価格で約定',
      ko: '미국 주식용 가상자금 $100,000 (중국 주식 ¥100만 계좌 별도), 실시간 가격 체결',
      fr: '100 000 $ virtuels pour les actions US, plus un compte chinois de 1 M ¥, au prix réel',
    } },
  { action: { appTab: 'study' },
    title: { zh: '学习中心', en: 'Study Center', ja: '学習センター', ko: '학습 센터', fr: "Centre d'étude" },
    desc: {
      zh: '从美股入门课到 A-Level、IB、AP 经济学，配真实市场案例',
      en: 'From a US stock primer to A-Level, IB and AP Economics, with real market cases',
      ja: '米国株入門から A-Level・IB・AP 経済学まで。実際の市場事例つき',
      ko: '미국 주식 입문부터 A-Level·IB·AP 경제학까지, 실제 시장 사례 포함',
      fr: "De l'initiation aux actions US jusqu'à l'économie A-Level, IB et AP, avec cas réels",
    } },
  { action: { appTab: 'ai_teacher' },
    title: { zh: 'AI 老师', en: 'AI Teacher', ja: 'AI 先生', ko: 'AI 선생님', fr: 'Professeur IA' },
    desc: {
      zh: '随时问投资和经济学问题，按你的水平讲解',
      en: 'Ask anything about investing or economics and get an answer pitched at your level',
      ja: '投資や経済学の疑問をいつでも質問。レベルに合わせて解説',
      ko: '투자·경제학 질문을 언제든지, 내 수준에 맞춰 설명',
      fr: "Posez vos questions d'investissement ou d'économie, expliquées à votre niveau",
    } },
  { action: { appTab: 'career' },
    title: { zh: '金融职业', en: 'Finance Careers', ja: '金融キャリア', ko: '금융 커리어', fr: 'Carrières finance' },
    desc: {
      zh: '了解投行、研究、交易等岗位，再用 AI 做一次模拟面试',
      en: 'See what banking, research and trading roles involve, then try an AI mock interview',
      ja: '投資銀行・リサーチ・トレーディングの仕事を知り、AI 模擬面接に挑戦',
      ko: 'IB·리서치·트레이딩 직무를 알아보고 AI 모의 면접까지',
      fr: 'Découvrez banque, recherche et trading, puis passez un entretien blanc avec l’IA',
    } },
]

const GO = { zh: '打开', en: 'Open', ja: '開く', ko: '열기', fr: 'Ouvrir' }
const HEAD = {
  zh: '一个网站，六件事',
  en: 'One site, six things to do',
  ja: 'ひとつのサイトで、六つのこと',
  ko: '한 사이트에서 여섯 가지',
  fr: 'Un site, six choses à faire',
}

// The letter only restates what the site already says about itself (see index.html):
// who made it, why it is named what it is, what is free, and that it is for learning.
const LETTER = {
  zh: {
    p: [
      '我们是 Billy 和 Frank，两个高中生。Best Friend Stock 是我们一起做的。',
      '名字来自我们想做的事：在你学股票、学经济学的路上，当一个最好的朋友。把今天市场发生了什么讲清楚，不卖弄术语，也不替你做决定。',
      '我们相信每个学生都应该有机会学投资。在动用真钱之前，先在这里用虚拟资金练习，犯错也不要紧。',
      '所以这里的一切都免费，没有广告，不注册也能用。登录只是为了在不同设备上保存你的自选股和模拟账户。',
      '发现问题或者想要新功能，直接写信给我们：',
    ],
    role: 'Best Friend Stock 的两位作者',
  },
  en: {
    p: [
      'We are Billy and Frank, two high-school students, and we made Best Friend Stock together.',
      'The name is the job we set ourselves: to be a student’s best friend in the market and in economics class. To say plainly what happened today, without showing off the jargon and without deciding for you.',
      'We think every student should get a chance to learn investing, and should practise here with virtual money before any real money is involved. Mistakes are free.',
      'So everything is free, there are no ads, and you can use it without an account. Signing in only keeps your watchlist and paper account across devices.',
      'If something breaks or you want something new, write to us:',
    ],
    role: 'The two people who make Best Friend Stock',
  },
  ja: {
    p: [
      '私たちは Billy と Frank、二人の高校生です。Best Friend Stock は二人で作りました。',
      '名前は私たちの目標そのものです。株や経済学を学ぶ学生のベストフレンドになること。今日の相場で何が起きたかを、専門用語に頼らず、判断を押しつけずに伝えます。',
      'すべての学生に投資を学ぶ機会があるべきだと考えています。本物のお金を使う前に、ここで仮想資金を使って練習してください。失敗しても大丈夫です。',
      'だからすべて無料で、広告もなく、登録なしで使えます。ログインはお気に入りと模擬口座を端末間で保存するためだけです。',
      '不具合やご要望はこちらまで：',
    ],
    role: 'Best Friend Stock の作者二人',
  },
  ko: {
    p: [
      '저희는 고등학생 Billy와 Frank입니다. Best Friend Stock은 둘이 함께 만들었습니다.',
      '이름이 곧 목표입니다. 주식과 경제학을 배우는 학생의 가장 좋은 친구가 되는 것. 오늘 시장에서 무슨 일이 있었는지 어려운 말 없이, 대신 결정하지 않고 설명합니다.',
      '모든 학생이 투자를 배울 기회를 가져야 한다고 생각합니다. 진짜 돈을 쓰기 전에 여기서 가상 자금으로 연습하세요. 실수해도 괜찮습니다.',
      '그래서 모든 기능이 무료이고, 광고가 없으며, 가입 없이 쓸 수 있습니다. 로그인은 관심 종목과 모의 계좌를 기기 간에 저장하기 위한 것입니다.',
      '문제가 있거나 새 기능이 필요하면 메일 주세요:',
    ],
    role: 'Best Friend Stock을 만드는 두 사람',
  },
  fr: {
    p: [
      'Nous sommes Billy et Frank, deux lycéens, et nous avons créé Best Friend Stock ensemble.',
      'Le nom résume notre but : être le meilleur ami des élèves en bourse et en cours d’économie. Dire simplement ce qui s’est passé aujourd’hui, sans jargon et sans décider à votre place.',
      'Nous pensons que chaque élève devrait pouvoir apprendre à investir, et s’entraîner ici avec de l’argent virtuel avant de toucher à de l’argent réel. Les erreurs ne coûtent rien.',
      'Tout est donc gratuit, sans publicité, et utilisable sans compte. La connexion sert seulement à garder votre liste et votre compte virtuel d’un appareil à l’autre.',
      'Un problème, une idée ? Écrivez-nous :',
    ],
    role: 'Les deux auteurs de Best Friend Stock',
  },
}

export default function MarketOverview({ lang, onTabChange, onOpenKnowledge }) {
  const { setViewMode } = useCompareStore()
  const letter = LETTER[lang] || LETTER.en

  const open = (action) => {
    if (!action) return
    if (action.openKnowledge) { onOpenKnowledge?.(); return }
    if (action.appTab) onTabChange?.(action.appTab)
    if (action.viewMode) setViewMode(action.viewMode)
  }

  return (
    <div className="bfs-home-end">
      <section className="bfs-bands" data-reveal aria-label={HEAD[lang] || HEAD.en}>
        <h2 className="bfs-bands-head">{HEAD[lang] || HEAD.en}</h2>
        {FEATURES.map((f) => (
          <a key={f.title.en} className="bfs-band" href={`/${f.action.appTab === 'analysis' ? '' : f.action.appTab === 'ai_teacher' ? 'ai-teacher' : f.action.appTab}`}
            onClick={(e) => { e.preventDefault(); open(f.action) }}>
            <span className="bfs-band-title">{f.title[lang] || f.title.en}</span>
            <span className="bfs-band-desc">{f.desc[lang] || f.desc.en}</span>
            <span className="bfs-band-go">{GO[lang] || GO.en}<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          </a>
        ))}
      </section>

      <section className="bfs-letter" data-reveal aria-label="Billy & Frank">
        <img src="/logo-dark.png" alt="" className="bfs-letter-mark" width="44" height="44" />
        {letter.p.map((x, i) => (
          <p key={i}>{x}{i === letter.p.length - 1 && <> <a href="mailto:billyl090119@gmail.com">billyl090119@gmail.com</a></>}</p>
        ))}
        <div className="bfs-letter-sign">Billy &amp; Frank</div>
        <div className="bfs-letter-role">{letter.role}</div>
      </section>

      <style>{`
        .bfs-home-end { padding-top: 120px; }
        .bfs-bands-head { font-size: clamp(30px, 3.2vw, 52px) !important; letter-spacing: -0.035em !important; margin: 0 0 32px !important; }
        .bfs-band { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr) auto; align-items: baseline; gap: 24px;
          padding: 28px 24px; margin: 0 -24px; border-radius: var(--radius); color: var(--text-primary); text-decoration: none;
          transition: background-color .25s ease; }
        .bfs-band + .bfs-band { margin-top: 4px; }
        .bfs-band:hover, .bfs-band:focus-visible { background: var(--bg-secondary); }
        .bfs-band-title { font-size: clamp(24px, 2.4vw, 36px); letter-spacing: -0.03em; line-height: 1.1; }
        .bfs-band-desc { font-size: var(--step-body); line-height: 1.5; color: var(--text-secondary); }
        .bfs-band:hover .bfs-band-desc { color: var(--text-primary); }
        .bfs-band-go { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: var(--text-secondary); }
        .bfs-band-go svg { transition: transform .25s cubic-bezier(.22,1,.36,1); }
        .bfs-band:hover .bfs-band-go { color: var(--accent); }
        .bfs-band:hover .bfs-band-go svg { transform: translateX(4px); }

        .bfs-letter { max-width: 560px; margin: 0 auto; padding: 160px 0 40px; }
        .bfs-letter-mark { display: block; width: 44px; height: 44px; border-radius: 50%; background: #f2f2f2; padding: 8px; object-fit: contain; margin-bottom: 28px; }
        .bfs-letter p { font-size: 17px; line-height: 1.6; margin: 0 0 1.1em; color: var(--text-primary); }
        .bfs-letter a { color: var(--text-primary); text-underline-offset: 4px; text-decoration-color: var(--accent); }
        .bfs-letter-sign { font-size: 22px; font-style: italic; letter-spacing: -0.02em; margin-top: 28px; }
        .bfs-letter-role { font-size: 14px; color: var(--text-muted); margin-top: 2px; }

        @media (max-width: 800px) {
          .bfs-home-end { padding-top: 72px; }
          .bfs-band { grid-template-columns: 1fr auto; padding: 20px 16px; margin: 0 -16px; gap: 6px 16px; }
          .bfs-band-title { grid-column: 1; }
          .bfs-band-desc { grid-column: 1; grid-row: 2; font-size: 15px; }
          .bfs-band-go { grid-column: 2; grid-row: 1 / span 2; align-self: center; font-size: 0; }
          .bfs-letter { padding: 96px 0 24px; }
          .bfs-letter p { font-size: 16px; }
        }
        @media (prefers-reduced-motion: reduce) { .bfs-band-go svg { transition: none; } }
      `}</style>
    </div>
  )
}
