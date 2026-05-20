import { useState } from 'react'

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

function FeatureCard({ feature, lang }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(138,180,248,0.07)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hover ? 'rgba(138,180,248,0.22)' : BDR}`,
        borderRadius: 14,
        padding: '22px 20px',
        transition: 'all 0.18s ease',
        transform: hover ? 'translateY(-2px)' : 'none',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 12 }}>{feature.icon}</div>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: hover ? ACCENT_BLUE : '#e8eaed',
        marginBottom: 8, transition: 'color 0.18s',
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
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#4a5568', textTransform: 'uppercase', marginBottom: 18 }}>
          bestfriendstock.com
        </div>

        <h1 style={{
          margin: '0 0 16px',
          fontSize: 'clamp(26px, 4vw, 40px)',
          fontWeight: 800,
          background: `linear-gradient(90deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.2, letterSpacing: '-0.3px',
        }}>
          {zh ? '发现你的下一只好股票' : 'Discover Your Next Great Stock'}
        </h1>

        <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 32px', lineHeight: 1.6 }}>
          {zh
            ? '专为学生设计的 A 股智能分析平台 · 完全免费'
            : 'Smart A-Share Analysis for Students · Completely Free'}
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={focusSearch}
            style={{
              background: `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_PURPLE})`,
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 28px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.2px',
              boxShadow: '0 4px 20px rgba(138,180,248,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(138,180,248,0.4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(138,180,248,0.3)' }}
          >
            🔍 {zh ? '开始分析' : 'Start Analyzing'}
          </button>

          <button
            onClick={() => onTabChange && onTabChange('study')}
            style={{
              background: 'rgba(192,132,252,0.1)',
              color: ACCENT_PURPLE,
              border: `1px solid rgba(192,132,252,0.25)`,
              borderRadius: 10, padding: '12px 28px',
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.2px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(192,132,252,0.18)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(192,132,252,0.1)' }}
          >
            📚 {zh ? '学习中心' : 'Study Center'}
          </button>
        </div>
      </div>

      {/* ── Feature cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 14, width: '100%', marginBottom: 36,
      }}>
        {FEATURES.map((f) => (
          <FeatureCard key={f.zh} feature={f} lang={lang} />
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
    </div>
  )
}
