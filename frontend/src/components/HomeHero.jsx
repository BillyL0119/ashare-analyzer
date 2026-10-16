import { useEffect, useState } from 'react'
import useCompareStore from '../store/compareStore'
import { useMobile } from '../hooks/useMobile'
import { sharedJson } from '../utils/sharedFetch'
import { T } from '../i18n/translations'
import SearchBar from './SearchBar'
import Icon from './Icon'

// The first screen, laid out the way Gemini greets you: a gradient hello, one large rounded
// search, a row of suggestion cards, and then the "answer": today's live index moves and
// sentiment written out as a plain sentence, the friend in Best Friend Stock talking.

const HELLO = {
  zh: ['你好，股友', '今天想看哪只股票？'],
  en: ['Hi, friend', 'Which stock shall we look at today?'],
  ja: ['こんにちは', '今日はどの銘柄を見ますか？'],
  ko: ['안녕하세요', '오늘은 어떤 종목을 볼까요?'],
  fr: ['Bonjour', 'Quelle action regardons-nous aujourd’hui ?'],
}
const HINT = {
  zh: '免费给学生用：美股、A 股、港股、日股行情，$100,000 模拟炒股，A-Level / IB / AP 经济学。不用注册，没有广告。',
  en: 'Free for students: live US, China, Hong Kong and Japan markets, $100,000 of paper trading, and A-Level, IB and AP Economics. No sign-up, no ads.',
  ja: '学生向け・無料：米国・中国・香港・日本の相場、$100,000 の模擬トレード、A-Level・IB・AP 経済学。登録不要、広告なし。',
  ko: '학생을 위한 무료 서비스: 미국·중국·홍콩·일본 시세, $100,000 모의 투자, A-Level·IB·AP 경제학. 가입도 광고도 없습니다.',
  fr: 'Gratuit pour les élèves : marchés US, Chine, Hong Kong et Japon, 100 000 $ de bourse virtuelle, économie A-Level, IB et AP. Sans inscription ni publicité.',
}
// Suggestion cards: each one opens a real part of the site
const CARDS = [
  { icon: 'trophy', tab: 'paper', text: {
    zh: '用 $100,000 虚拟资金模拟炒股，和同学比收益', en: 'Practise trading with $100,000 of virtual cash and race your friends',
    ja: '仮想資金 $100,000 で模擬トレード、友だちと成績を競う', ko: '가상자금 $100,000로 모의 투자하고 친구와 수익률 경쟁', fr: 'S’entraîner avec 100 000 $ virtuels et se mesurer aux amis' } },
  { icon: 'spark', tab: 'ai_teacher', text: {
    zh: '问 AI 老师：市盈率到底说明了什么？', en: 'Ask the AI teacher: what does a P/E ratio actually tell me?',
    ja: 'AI 先生に質問：PER は何を示している？', ko: 'AI 선생님께 질문: PER은 무엇을 말해 줄까?', fr: 'Demander au prof IA : que dit vraiment le PER ?' } },
  { icon: 'chart', tab: 'heatmap', text: {
    zh: '看今天的市场热力图，哪些板块在涨', en: 'See today’s market heatmap and which sectors are rising',
    ja: '今日のヒートマップで上昇セクターを見る', ko: '오늘의 히트맵에서 오르는 섹터 보기', fr: 'Voir la carte du marché et les secteurs en hausse' } },
  { icon: 'cap', tab: 'study', text: {
    zh: '学 A-Level、IB、AP 经济学，配真实市场案例', en: 'Study A-Level, IB and AP Economics with real market cases',
    ja: 'A-Level・IB・AP 経済学を実例で学ぶ', ko: 'A-Level·IB·AP 경제학을 실제 사례로 공부', fr: 'Réviser l’économie A-Level, IB et AP avec des cas réels' } },
]
const NOTE_TITLE = { zh: '今天的市场，用一句话说', en: 'Today’s market, in plain words', ja: '今日の相場をひとことで', ko: '오늘의 시장, 한 문장으로', fr: 'Le marché du jour, en clair' }
const SENT = { zh: '情绪指数', en: 'Sentiment', ja: 'センチメント', ko: '심리 지수', fr: 'Sentiment' }
const FEAR = { zh: ['恐慌', '贪婪'], en: ['Fear', 'Greed'], ja: ['恐怖', '強欲'], ko: ['공포', '탐욕'], fr: ['Peur', 'Avidité'] }
const WAIT = { zh: '正在读取今天的行情…', en: 'Reading today’s market…', ja: '今日の相場を読み込み中…', ko: '오늘 시세를 불러오는 중…', fr: 'Lecture du marché du jour…' }
const NONE = { zh: '行情暂时取不到，稍后再看看。', en: 'Market data is unavailable right now. Try again in a minute.', ja: '現在データを取得できません。しばらくしてからお試しください。', ko: '지금은 시세를 불러올 수 없습니다. 잠시 후 다시 시도하세요.', fr: 'Données indisponibles pour le moment. Réessayez dans une minute.' }

// Which indices speak for each market, in the order they are read out
const PICK = {
  us: ['^GSPC', '^IXIC', '^DJI'],
  cn: ['sh000001', 'sz399001', 'sz399006'],
  hk: ['^HSI', 'sh000001'],
  jp: ['^N225', '^KS11'],
}
const SHORT_EN = { 'S&P 500': 'S&P 500', NASDAQ: 'Nasdaq', 'Dow Jones': 'Dow', 'Nikkei 225': 'Nikkei 225', 'Hang Seng': 'Hang Seng', KOSPI: 'KOSPI' }
const CN_EN = { 上证指数: 'Shanghai Composite', 深证成指: 'Shenzhen Component', 创业板指: 'ChiNext' }

const nameOf = (i, lang) => (lang === 'zh' ? i.name_zh || i.name : SHORT_EN[i.name] || CN_EN[i.name] || i.name)
const fmtPct = (p, lang) => {
  const v = Math.abs(p).toFixed(2)
  return lang === 'fr' ? `${v.replace('.', ',')} %` : `${v}%`
}

function sentence(list, lang) {
  const parts = list.map((i) => {
    const n = nameOf(i, lang), p = i.change_pct, flat = Math.abs(p) < 0.005, up = p > 0
    switch (lang) {
      case 'zh': return flat ? `${n}持平` : `${n}${up ? '涨' : '跌'} ${fmtPct(p, lang)}`
      case 'ja': return flat ? `${n}は横ばい` : `${n}は${fmtPct(p, lang)}${up ? '上昇' : '下落'}`
      case 'ko': return flat ? `${n} 보합` : `${n} ${fmtPct(p, lang)} ${up ? '상승' : '하락'}`
      case 'fr': return flat ? `${n} stable` : `${n} en ${up ? 'hausse' : 'baisse'} de ${fmtPct(p, lang)}`
      default: return flat ? `the ${n} was flat` : `the ${n} ${up ? 'rose' : 'fell'} ${fmtPct(p, lang)}`
    }
  })
  if (lang === 'zh') return parts.join('，') + '。'
  if (lang === 'ja') return parts.join('、') + '。'
  if (lang === 'ko' || lang === 'fr') return parts.join(', ') + '.'
  const s = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
  return s.charAt(0).toUpperCase() + s.slice(1) + '.'
}

// Gemini's four-point sparkle, filled with its gradient
export function Sparkle({ size = 28, id = 'g-sparkle-fill' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="g-sparkle">
      <defs>
        <linearGradient id={id} x1="0" y1="28" x2="28" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4285f4" /><stop offset=".55" stopColor="#9b72cb" /><stop offset="1" stopColor="#d96570" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M14 28C14 26.06 13.63 24.24 12.88 22.53 12.16 20.81 11.17 19.32 9.92 18.08 8.67 16.83 7.19 15.84 5.47 15.12 3.76 14.38 1.94 14 0 14 1.94 14 3.76 13.63 5.47 12.88 7.19 12.16 8.67 11.17 9.92 9.92 11.17 8.67 12.16 7.19 12.88 5.47 13.63 3.76 14 1.94 14 0 14 1.94 14.37 3.76 15.1 5.47 15.84 7.19 16.83 8.67 18.08 9.92 19.33 11.17 20.81 12.16 22.53 12.88 24.24 13.63 26.06 14 28 14 26.06 14 24.24 14.38 22.53 15.12 20.81 15.84 19.33 16.83 18.08 18.08 16.83 19.32 15.84 20.81 15.1 22.53 14.37 24.24 14 26.06 14 28Z" />
    </svg>
  )
}

export default function HomeHero({ lang, market, onTabChange }) {
  const t = T[lang] || T.en
  const isMobile = useMobile()
  const setMarket = useCompareStore((s) => s.setMarket)
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    sharedJson('/api/market/sentiment').then((d) => alive && setData(d)).catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [])

  const hello = HELLO[lang] || HELLO.en
  const byCode = Object.fromEntries((data?.indices || []).map((i) => [i.symbol, i]))
  const list = (PICK[market] || PICK.us).map((c) => byCode[c]).filter((i) => i && i.change_pct != null)
  const sent = market === 'cn' ? data?.cn_sentiment : market === 'us' ? data?.us_sentiment : null
  const redUp = market === 'cn'
  const tone = (p) => (p === 0 ? 'var(--text-secondary)' : (p > 0) !== redUp ? 'var(--green-bright)' : 'var(--red-bright)')
  const fear = FEAR[lang] || FEAR.en

  return (
    <section className="g-home" aria-labelledby="g-hello">
      <h1 id="g-hello" className="g-hello">
        <span className="bfs-mask-line"><span className="g-grad">{hello[0]}</span></span>
        <span className="bfs-mask-line"><span className="g-ask">{hello[1]}</span></span>
      </h1>

      <div className="g-search"><SearchBar hero /></div>
      <p className="g-hint">{HINT[lang] || HINT.en}</p>

      <div className="g-cards">
        {CARDS.map((c) => (
          <button key={c.tab} className="g-card" onClick={() => onTabChange?.(c.tab)}>
            <span className="g-card-text">{c.text[lang] || c.text.en}</span>
            <span className="g-card-icon"><Icon name={c.icon} size={20} /></span>
          </button>
        ))}
      </div>

      {/* The answer: a working fragment of the product, live */}
      <div className="g-answer" data-ui aria-live="polite">
        <div className="g-answer-head">
          <Sparkle />
          <span className="g-answer-title">{NOTE_TITLE[lang] || NOTE_TITLE.en}</span>
          <div role="group" aria-label="Market" className="g-tabs">
            {[['us', t.marketUS], ['cn', t.marketCN], ['hk', t.marketHK], ['jp', t.marketJP]].map(([k, label]) => (
              <button key={k} aria-pressed={market === k} onClick={() => setMarket(k)}>
                {isMobile && lang !== 'zh' ? k.toUpperCase() : label}
              </button>
            ))}
          </div>
        </div>

        <p className="g-answer-text" key={market + lang}>
          {list.length ? sentence(list, lang) : failed ? (NONE[lang] || NONE.en) : (WAIT[lang] || WAIT.en)}
        </p>

        {list.length > 0 && (
          <div className="g-figures" key={'f' + market}>
            {list.map((i) => (
              <div key={i.symbol} className="g-figure">
                <div className="g-figure-name">{nameOf(i, lang)}</div>
                <div className="g-figure-value">{i.close != null ? i.close.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>
                <div className="g-figure-pct" style={{ color: tone(i.change_pct) }}>{i.change_pct > 0 ? '+' : ''}{i.change_pct.toFixed(2)}%</div>
              </div>
            ))}
            {sent && (
              <div className="g-figure g-meter">
                <div className="g-figure-name">{SENT[lang] || SENT.en}</div>
                <div className="g-figure-value">{Math.round(sent.score)} <small>{lang === 'zh' ? sent.label_zh : sent.label_en}</small></div>
                <div className="g-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(sent.score)}>
                  <span className="g-mark" style={{ left: `${Math.max(0, Math.min(100, sent.score))}%` }} />
                </div>
                <div className="g-ends"><span>{fear[0]}</span><span>{fear[1]}</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .g-home { padding: 72px 0 64px; }
        html .g-home .g-hello { margin: 0 0 40px !important; font-size: clamp(40px, 4.6vw, 64px) !important; line-height: 1.12 !important;
          font-weight: 500 !important; letter-spacing: -0.02em !important; }
        .g-grad { background: var(--gemini); -webkit-background-clip: text; background-clip: text; color: transparent;
          background-size: 200% 100%; animation: bfsMaskRise 0.9s cubic-bezier(.16,1,.3,1) both, gGrad 9s ease-in-out 1s infinite alternate; padding-bottom: .06em; }
        .g-ask { color: var(--text-muted); }
        @keyframes gGrad { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }

        .g-search { animation: bfsSlideUp .7s cubic-bezier(.22,1,.36,1) .3s both; }
        .g-hint { margin: 16px 8px 40px; font-size: 15px; line-height: 1.55; color: var(--text-secondary);
          animation: bfsSlideUp .7s cubic-bezier(.22,1,.36,1) .38s both; }

        .g-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 40px; }
        .g-card { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 24px; min-height: 176px;
          padding: 18px 18px 16px; text-align: left; border: 0; border-radius: var(--radius); cursor: pointer;
          background: var(--bg-secondary); color: var(--text-primary); font: inherit; font-size: 16px; line-height: 1.45;
          transition: background-color .2s ease; animation: bfsSlideUp .7s cubic-bezier(.22,1,.36,1) both; }
        .g-card:nth-child(1) { animation-delay: .44s; } .g-card:nth-child(2) { animation-delay: .5s; }
        .g-card:nth-child(3) { animation-delay: .56s; } .g-card:nth-child(4) { animation-delay: .62s; }
        .g-card:hover { background: var(--bg-hover); }
        .g-card-icon { align-self: flex-end; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
          background: var(--bg-primary); color: var(--text-primary); transition: color .2s ease; }
        .g-card:hover .g-card-icon { color: var(--accent); }

        .g-answer { background: var(--bg-secondary); border-radius: 24px; padding: 28px 32px 30px;
          animation: bfsSlideUp .8s cubic-bezier(.22,1,.36,1) .66s both; }
        .g-answer-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
        .g-sparkle { flex: none; animation: gSpin 1.2s cubic-bezier(.22,1,.36,1) .8s both; }
        @keyframes gSpin { from { transform: rotate(-90deg) scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
        .g-answer-title { font-size: 15px; color: var(--text-secondary); }
        .g-tabs { margin-left: auto; display: flex; gap: 4px; }
        .g-tabs button { border: 0; background: transparent; color: var(--text-secondary); font: inherit; font-size: 14px;
          padding: 7px 14px; border-radius: 999px; cursor: pointer; transition: background-color .15s ease, color .15s ease; }
        .g-tabs button:hover { background: var(--bg-hover); color: var(--text-primary); }
        .g-tabs button[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); }
        .g-answer-text { font-size: clamp(22px, 2vw, 28px); line-height: 1.4; margin: 0 0 28px 42px; min-height: 1.4em;
          animation: bfsSlideUp .5s cubic-bezier(.22,1,.36,1) both; }
        .g-figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-left: 42px;
          animation: bfsSlideUp .5s cubic-bezier(.22,1,.36,1) .06s both; }
        .g-figure { background: var(--bg-primary); border-radius: 16px; padding: 14px 16px; }
        .g-figure-name { font-size: 13px; color: var(--text-secondary); }
        .g-figure-value { font-size: 24px; margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
        .g-figure-value small { font-size: 14px; color: var(--text-secondary); margin-left: 4px; }
        .g-figure-pct { font-size: 14px; font-weight: 500; }
        .g-track { position: relative; height: 6px; border-radius: 3px; margin-top: 10px;
          background: linear-gradient(90deg, var(--red-bright), var(--accent-gold), var(--green-bright)); opacity: .9; }
        .g-mark { position: absolute; top: -4px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%;
          background: var(--text-primary); box-shadow: 0 0 0 3px var(--bg-primary); transition: left 1s cubic-bezier(.22,1,.36,1); }
        .g-ends { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted); margin-top: 6px; }

        @media (max-width: 1000px) {
          .g-home { padding: 32px 0 40px; }
          .g-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          html .g-home .g-hello { font-size: clamp(28px, 7vw, 48px) !important; margin-bottom: 24px !important; }
          .g-card { min-height: 132px; }
          .g-answer { padding: 20px 18px 22px; border-radius: 20px; }
          .g-answer-text, .g-figures { margin-left: 0; }
          .g-tabs { margin-left: 0; width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .g-grad, .g-search, .g-hint, .g-card, .g-answer, .g-sparkle, .g-answer-text, .g-figures { animation: none; }
          .g-mark { transition: none; }
        }
      `}</style>
    </section>
  )
}
