import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'
import useCompareStore from '../store/compareStore'
import { T } from '../i18n/translations'

const ACCENT_BLUE   = '#8ab4f8'
const ACCENT_PURPLE = '#c084fc'
const BDR           = 'rgba(138,180,248,0.10)'

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
  { icon: '📈', action: { appTab: 'analysis', viewMode: 'analysis' },
    title: { zh: 'AI 个股分析', en: 'AI Stock Analysis', ja: 'AI 個別株分析', ko: 'AI 종목 분석', fr: 'Analyse IA' },
    desc: {
      zh: 'K 线、综合评分、相似走势与 AI 解读，美股和 A 股都支持',
      en: 'Charts, a five-factor score, similar movers and an AI write-up for any US or China stock',
      ja: 'チャート、総合スコア、類似銘柄、AI 解説。米国株と中国株に対応',
      ko: '차트, 종합 점수, 유사 종목, AI 해설까지. 미국·중국 주식 모두 지원',
      fr: 'Graphiques, score global, valeurs similaires et analyse IA, actions US et chinoises',
    } },
  { icon: '📰', action: { appTab: 'news' },
    title: { zh: '每日资讯', en: 'Daily News', ja: 'デイリーニュース', ko: '데일리 뉴스', fr: 'Actualités' },
    desc: {
      zh: '美股与 A 股要闻、投行观点，每只股票附 AI 情绪评分',
      en: 'Market headlines and bank research views, with AI sentiment for each stock',
      ja: '市場ニュースと投資銀行の見解。銘柄ごとに AI センチメント付き',
      ko: '시장 뉴스와 투자은행 리포트, 종목별 AI 감성 점수 제공',
      fr: 'Actualités et avis des banques, avec sentiment IA par action',
    } },
  { icon: '🎮', action: { appTab: 'paper' },
    title: { zh: '模拟炒股', en: 'Paper Trading', ja: '模擬トレード', ko: '모의 투자', fr: 'Bourse virtuelle' },
    desc: {
      zh: '$100,000 美股虚拟资金（另有 ¥100 万 A 股账户），按实时价格下单',
      en: '$100,000 in virtual cash for US stocks, plus a ¥1M China account, filled at live prices',
      ja: '米国株用に仮想資金 $100,000（中国株口座 ¥100 万も）。リアルタイム価格で約定',
      ko: '미국 주식용 가상자금 $100,000 (중국 주식 ¥100만 계좌 별도), 실시간 가격 체결',
      fr: '100 000 $ virtuels pour les actions US, plus un compte chinois de 1 M ¥, au prix réel',
    } },
  { icon: '📚', action: { appTab: 'study' },
    title: { zh: '学习中心', en: 'Study Center', ja: '学習センター', ko: '학습 센터', fr: "Centre d'étude" },
    desc: {
      zh: '从美股入门课到 A-Level、IB、AP 经济学，配真实市场案例',
      en: 'From a US stock primer to A-Level, IB and AP Economics, with real market cases',
      ja: '米国株入門から A-Level・IB・AP 経済学まで。実際の市場事例つき',
      ko: '미국 주식 입문부터 A-Level·IB·AP 경제학까지, 실제 시장 사례 포함',
      fr: "De l'initiation aux actions US jusqu'à l'économie A-Level, IB et AP, avec cas réels",
    } },
  { icon: '🤖', action: { appTab: 'ai_teacher' },
    title: { zh: 'AI 老师', en: 'AI Teacher', ja: 'AI 先生', ko: 'AI 선생님', fr: 'Professeur IA' },
    desc: {
      zh: '随时问投资和经济学问题，按你的水平讲解',
      en: 'Ask anything about investing or economics and get an answer pitched at your level',
      ja: '投資や経済学の疑問をいつでも質問。レベルに合わせて解説',
      ko: '투자·경제학 질문을 언제든지, 내 수준에 맞춰 설명',
      fr: "Posez vos questions d'investissement ou d'économie, expliquées à votre niveau",
    } },
  { icon: '💼', action: { appTab: 'career' },
    title: { zh: '金融职业', en: 'Finance Careers', ja: '金融キャリア', ko: '금융 커리어', fr: 'Carrières finance' },
    desc: {
      zh: '了解投行、研究、交易等岗位，再用 AI 做一次模拟面试',
      en: 'See what banking, research and trading roles involve, then try an AI mock interview',
      ja: '投資銀行・リサーチ・トレーディングの仕事を知り、AI 模擬面接に挑戦',
      ko: 'IB·리서치·트레이딩 직무를 알아보고 AI 모의 면접까지',
      fr: 'Découvrez banque, recherche et trading, puis passez un entretien blanc avec l’IA',
    } },
]

function FeatureCard({ feature, lang, index, onClick }) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      className="bfs-feature-card"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: hover ? 'rgba(138,180,248,0.07)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hover ? 'rgba(138,180,248,0.28)' : BDR}`,
        borderRadius: 14,
        padding: '22px 20px',
        transition: 'all 0.3s ease',
        transform: pressed
          ? 'scale(0.97)'
          : hover ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hover
          ? '0 8px 32px rgba(138,180,248,0.13), 0 0 0 1px rgba(138,180,248,0.08), 0 0 24px rgba(192,132,252,0.07)'
          : 'none',
        cursor: 'pointer',
        animationDelay: `${index * 0.08}s`,
        animationFillMode: 'both',
        position: 'relative',
      }}
    >
      <div style={{
        fontSize: 28, marginBottom: 12,
        transition: 'transform 0.3s ease',
        transform: hover ? 'scale(1.1)' : 'scale(1)',
        display: 'inline-block',
      }}>{feature.icon}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700,
          color: hover ? ACCENT_BLUE : 'var(--text-primary)',
          transition: 'color 0.3s',
        }}>
          {feature.title[lang] || feature.title.en}
        </span>
        <span style={{
          fontSize: 13, color: ACCENT_BLUE,
          opacity: hover ? 1 : 0,
          transform: hover ? 'translateX(3px)' : 'translateX(-4px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>→</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {feature.desc[lang] || feature.desc.en}
      </div>
    </div>
  )
}

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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 24px 40px', maxWidth: 860, margin: '0 auto', width: '100%',
    }}>

      {/* ── Hero ── */}
      <div className="bfs-hero" style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{
          fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-muted)',
          textTransform: 'uppercase', marginBottom: 18,
        }}>
          bestfriendstock.com
        </div>

        <h1 className="bfs-hero-title" style={{
          margin: '0 0 16px',
          fontSize: isMobile ? 28 : 'clamp(30px, 4vw, 40px)',
          fontWeight: 800,
          background: `linear-gradient(90deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE}, #a78bfa, ${ACCENT_BLUE})`,
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2, letterSpacing: '-0.3px',
        }}>
          {t.moSlogan}
        </h1>

        <p className="bfs-hero-sub" style={{
          fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 32px', lineHeight: 1.6,
        }}>
          {SUBTITLE[lang] || SUBTITLE.en}
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            className="bfs-cta-primary"
            onClick={focusSearch}
            style={{
              background: `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 28px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.2px',
              minHeight: 44, width: isMobile ? '100%' : 'auto',
            }}
          >
            {t.moStart}
          </button>

          <button
            className="bfs-cta-secondary"
            onClick={() => onTabChange && onTabChange('study')}
            style={{
              background: 'rgba(192,132,252,0.1)',
              color: ACCENT_PURPLE,
              border: `1px solid rgba(192,132,252,0.25)`,
              borderRadius: 10, padding: '12px 28px',
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.2px',
              minHeight: 44, width: isMobile ? '100%' : 'auto',
            }}
          >
            {t.moStudy}
          </button>
        </div>
      </div>

      {/* ── Feature cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: isMobile ? 10 : 14, width: '100%', marginBottom: 36,
      }}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title.en} feature={f} lang={lang} index={i} onClick={() => handleCardClick(f.action)} />
        ))}
      </div>

      {/* ── Data source note ── */}
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.75, textAlign: 'center', lineHeight: 1.8 }}>
        {zh
          ? '数据来源：腾讯财经 · 纳斯达克 · 新浪财经 · AkShare'
          : 'Data: Tencent Finance · Nasdaq · Sina Finance · AkShare'}
        <br />
        {zh
          ? '由两名高中生 Billy 和 Frank 合作开发 · 仅供学习用途'
          : 'Built by two high school students, Billy & Frank · For educational use only'}
      </div>

      <style>{`
        .bfs-hero {
          animation: bfsHeroIn 0.6s ease both;
        }
        .bfs-hero-title {
          animation: bfsTitleGrad 6s ease infinite, bfsHeroIn 0.6s ease both;
        }
        @keyframes bfsTitleGrad {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .bfs-hero-sub {
          animation: bfsSubFade 0.6s ease 0.28s both;
        }
        @keyframes bfsSubFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bfs-cta-primary {
          animation: bfsPulse 2.8s ease-in-out infinite;
          transition: transform 0.2s ease;
        }
        .bfs-cta-primary:hover {
          animation-play-state: paused;
          transform: translateY(-2px);
        }
        .bfs-cta-primary:active {
          transform: scale(0.96) !important;
        }
        @keyframes bfsPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(138,180,248,0.28); }
          50%       { box-shadow: 0 4px 32px rgba(138,180,248,0.55), 0 0 0 5px rgba(138,180,248,0.07); }
        }
        .bfs-cta-secondary {
          transition: all 0.2s ease;
        }
        .bfs-cta-secondary:hover {
          background: rgba(192,132,252,0.18) !important;
          transform: translateY(-1px);
        }
        .bfs-cta-secondary:active {
          transform: scale(0.96);
        }
        .bfs-feature-card {
          animation: bfsCardIn 0.5s ease both;
        }
        @keyframes bfsCardIn {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bfsHeroIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .bfs-hero,
          .bfs-hero-title,
          .bfs-hero-sub,
          .bfs-cta-primary,
          .bfs-feature-card {
            animation: none !important;
          }
          .bfs-cta-primary {
            box-shadow: 0 4px 20px rgba(138,180,248,0.3);
          }
        }
      `}</style>
    </div>
  )
}
