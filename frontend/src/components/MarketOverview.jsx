import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'

const ACCENT_BLUE   = '#8ab4f8'
const ACCENT_PURPLE = '#c084fc'
const BDR           = 'rgba(138,180,248,0.10)'

const FEATURES = [
  { icon: '📈', zh: '相似走势分析', en: 'Similar Trends',   descZh: '找到与目标股票走势高度相关的同行，判断行业性行情还是个股独立行情', descEn: 'Find stocks moving in sync with your target to identify sector vs individual momentum' },
  { icon: '🤖', zh: 'AI 智能分析',  en: 'AI Analysis',      descZh: 'Claude AI 一键生成投资洞察，分析技术面、基本面与市场情绪', descEn: 'Claude AI generates investment insights instantly — technicals, fundamentals, and sentiment' },
  { icon: '📰', zh: '新闻舆情',     en: 'News Sentiment',   descZh: '实时中英文新闻 AI 情感评分，快速把握市场对个股的看法', descEn: 'Real-time Chinese & English news with AI sentiment scoring for each stock' },
  { icon: '🎮', zh: '模拟炒股',     en: 'Paper Trading',    descZh: '100万虚拟资金，T+1规则，真实手续费，练好再用真钱', descEn: 'Practice with ¥1,000,000 virtual money, T+1 rules, and real commission fees' },
  { icon: '📚', zh: '备考学习',     en: 'Exam Study',       descZh: 'A-Level、IB、IGCSE、AP 经济学全套内容，含真实市场案例', descEn: 'A-Level, IB, IGCSE, AP Economics content with real A-share market examples' },
  { icon: '💡', zh: '每日知识',     en: 'Daily Knowledge',  descZh: '每天一个经济学概念 + 一个金融知识，积少成多', descEn: 'One economics concept + one finance insight delivered daily' },
]

function FeatureCard({ feature, lang, index }) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      className="bfs-feature-card"
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
        cursor: 'default',
        animationDelay: `${index * 0.08}s`,
        animationFillMode: 'both',
      }}
    >
      <div style={{
        fontSize: 28, marginBottom: 12,
        transition: 'transform 0.3s ease',
        transform: hover ? 'scale(1.1)' : 'scale(1)',
        display: 'inline-block',
      }}>{feature.icon}</div>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: hover ? ACCENT_BLUE : '#e8eaed',
        marginBottom: 8, transition: 'color 0.3s',
      }}>
        {lang === 'zh' ? feature.zh : feature.en}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
        {lang === 'zh' ? feature.descZh : feature.descEn}
      </div>
    </div>
  )
}

export default function MarketOverview({ lang, onTabChange }) {
  const zh = lang === 'zh'
  const isMobile = useMobile()

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
          fontSize: 11, letterSpacing: '0.15em', color: '#4a5568',
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
          {zh ? '股市里，有我陪你' : 'Your Best Friend in the Market'}
        </h1>

        <p className="bfs-hero-sub" style={{
          fontSize: 15, color: '#6b7280', margin: '0 0 32px', lineHeight: 1.6,
        }}>
          {zh
            ? '专为学生设计的 A 股智能分析平台 · 完全免费'
            : 'Smart A-Share Analysis for Students · Completely Free'}
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
            🔍 {zh ? '开始分析' : 'Start Analyzing'}
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
            📚 {zh ? '学习中心' : 'Study Center'}
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
          <FeatureCard key={f.zh} feature={f} lang={lang} index={i} />
        ))}
      </div>

      {/* ── Data source note ── */}
      <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', lineHeight: 1.8 }}>
        {zh
          ? '数据来源：AkShare · Yahoo Finance · Sina Finance · 实时更新'
          : 'Data: AkShare · Yahoo Finance · Sina Finance · Real-time updates'}
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
