import { useEffect, useState } from 'react'
import useCompareStore from '../store/compareStore'
import { useMobile } from '../hooks/useMobile'
import { sharedJson } from '../utils/sharedFetch'
import { T } from '../i18n/translations'

// The first screen. The site is named for a friend who explains the market, so the hero is that
// friend talking: today's live index moves and sentiment, written out as a plain sentence in the
// reader's language. The market switch on the note is the same switch as the one in the bar.

const LINES = {
  zh: ['股市里，', '有我陪你。'],
  en: ['Your best friend', 'in the market.'],
  ja: ['株式市場の', 'ベストフレンド。'],
  ko: ['주식 시장의', '베스트 프렌드.'],
  fr: ['Votre meilleur ami', 'en bourse.'],
}
const SUB = {
  zh: '给学生的免费股票网站：美股、A 股、港股、日股的行情和 K 线，$100,000 虚拟资金模拟炒股，A-Level、IB、AP 经济学课程。不用注册，没有广告。',
  en: 'A free stock site for students: live US, China, Hong Kong and Japan markets, $100,000 of virtual cash to practise trading, and A-Level, IB and AP Economics. No sign-up, no ads.',
  ja: '学生のための無料株式サイト。米国・中国・香港・日本の相場とチャート、仮想資金 $100,000 の模擬トレード、A-Level・IB・AP 経済学。登録不要、広告なし。',
  ko: '학생을 위한 무료 주식 사이트. 미국·중국·홍콩·일본 시세와 차트, 가상자금 $100,000 모의 투자, A-Level·IB·AP 경제학. 가입도 광고도 없습니다.',
  fr: 'Un site boursier gratuit pour les élèves : marchés US, Chine, Hong Kong et Japon en direct, 100 000 $ virtuels pour s’entraîner, et l’économie A-Level, IB et AP. Sans inscription ni publicité.',
}
const CTA = { zh: '用 $100,000 模拟炒股', en: 'Practise with $100,000', ja: '$100,000 で模擬トレード', ko: '$100,000로 모의 투자', fr: 'S’entraîner avec 100 000 $' }
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

  const lines = LINES[lang] || LINES.en
  const byCode = Object.fromEntries((data?.indices || []).map((i) => [i.symbol, i]))
  const list = (PICK[market] || PICK.us).map((c) => byCode[c]).filter((i) => i && i.change_pct != null)
  const sent = market === 'cn' ? data?.cn_sentiment : market === 'us' ? data?.us_sentiment : null
  const redUp = market === 'cn'
  const tone = (p) => (p === 0 ? 'var(--text-secondary)' : (p > 0) !== redUp ? 'var(--green-bright)' : 'var(--red-bright)')
  const fear = FEAR[lang] || FEAR.en

  return (
    <section className="bfs-hero" aria-labelledby="bfs-hero-title">
      <div className="bfs-hero-copy">
        <h1 id="bfs-hero-title" className="bfs-hero-title">
          <span className="bfs-mask-line"><span>{lines[0]}</span></span>
          <span className="bfs-mask-line"><span>{lines[1]}</span></span>
        </h1>
        <p className="bfs-hero-sub">{SUB[lang] || SUB.en}</p>
        <div className="bfs-hero-actions">
          <button className="bfs-primary" onClick={() => onTabChange?.('paper')}>{CTA[lang] || CTA.en}</button>
          <button className="bfs-quiet" onClick={() => onTabChange?.('study')}>{(t.moStudy || '').replace(/^\S+\s/, '')}</button>
        </div>
      </div>

      {/* The note: a working fragment of the product, live */}
      <div className="bfs-note" data-ui aria-live="polite">
        <div className="bfs-note-top">
          <span className="bfs-note-title">{NOTE_TITLE[lang] || NOTE_TITLE.en}</span>
          <div role="group" aria-label="Market" className="bfs-note-tabs">
            {[['us', t.marketUS], ['cn', t.marketCN], ['hk', t.marketHK], ['jp', t.marketJP]].map(([k, label]) => (
              <button key={k} aria-pressed={market === k} onClick={() => setMarket(k)}>
                {isMobile && lang !== 'zh' ? k.toUpperCase() : label}
              </button>
            ))}
          </div>
        </div>

        <p className="bfs-note-sentence" key={market + lang}>
          {list.length ? sentence(list, lang) : failed ? (NONE[lang] || NONE.en) : (WAIT[lang] || WAIT.en)}
        </p>

        {list.length > 0 && (
          <div className="bfs-note-figures" key={'f' + market}>
            {list.map((i) => (
              <div key={i.symbol}>
                <div className="bfs-note-name">{nameOf(i, lang)}</div>
                <div className="bfs-note-value">{i.close != null ? i.close.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>
                <div className="bfs-note-pct" style={{ color: tone(i.change_pct) }}>{i.change_pct > 0 ? '+' : ''}{i.change_pct.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        )}

        {sent && (
          <div className="bfs-note-meter">
            <div className="bfs-note-meter-head">
              <span>{SENT[lang] || SENT.en}</span>
              <strong>{Math.round(sent.score)} · {lang === 'zh' ? sent.label_zh : sent.label_en}</strong>
            </div>
            <div className="bfs-note-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(sent.score)}>
              <span className="bfs-note-mark" style={{ left: `${Math.max(0, Math.min(100, sent.score))}%` }} />
            </div>
            <div className="bfs-note-ends"><span>{fear[0]}</span><span>{fear[1]}</span></div>
          </div>
        )}
      </div>

      <style>{`
        .bfs-hero { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: 24px; row-gap: 40px;
          align-items: start; padding: 64px 0 96px; }
        .bfs-hero-copy { grid-column: 1 / span 6; }
        html .bfs-hero .bfs-hero-title { margin: 0 0 32px !important; font-size: clamp(48px, 6.4vw, 104px) !important; line-height: 1.0 !important;
          font-weight: 500 !important; letter-spacing: -0.045em !important; }
                .bfs-hero-sub { font-size: var(--step-body); line-height: 1.55; color: var(--text-primary); max-width: 34em; margin: 0 0 32px;
          animation: bfsSlideUp .7s cubic-bezier(.22,1,.36,1) .35s both; }
        .bfs-hero-actions { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; animation: bfsSlideUp .7s cubic-bezier(.22,1,.36,1) .45s both; }
        .bfs-hero-actions .bfs-primary { min-height: 48px; padding: 0 24px; font-size: 16px; }

        .bfs-note { grid-column: 7 / span 6; background: var(--bg-secondary); border-radius: var(--radius); padding: 28px 28px 24px;
          animation: bfsSlideUp .8s cubic-bezier(.22,1,.36,1) .25s both; }
        .bfs-note-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
        .bfs-note-title { font-size: 14px; color: var(--text-secondary); }
        .bfs-note-tabs { display: flex; gap: 2px; background: var(--bg-tertiary); padding: 3px; border-radius: var(--radius); }
        .bfs-note-tabs button { border: 0; background: transparent; color: var(--text-secondary); font-size: 13px; padding: 6px 10px; border-radius: 4px; cursor: pointer; }
        .bfs-note-tabs button:hover { color: var(--text-primary); }
        .bfs-note-tabs button[aria-pressed="true"] { background: var(--bg-hover); color: var(--text-primary); }
        .bfs-note-sentence { font-size: clamp(22px, 1.9vw, 30px); line-height: 1.28; letter-spacing: -0.02em; margin: 0 0 28px; min-height: 2.56em;
          animation: bfsSlideUp .5s cubic-bezier(.22,1,.36,1) both; }
        .bfs-note-figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; padding: 20px 0 0;
          animation: bfsSlideUp .5s cubic-bezier(.22,1,.36,1) .06s both; }
        .bfs-note-name { font-size: 13px; color: var(--text-secondary); }
        .bfs-note-value { font-size: 26px; letter-spacing: -0.03em; margin: 2px 0; }
        .bfs-note-pct { font-size: 14px; font-weight: 500; }
        .bfs-note-meter { margin-top: 28px; }
        .bfs-note-meter-head { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; }
        .bfs-note-meter-head strong { color: var(--text-primary); font-weight: 500; }
        .bfs-note-track { position: relative; height: 8px; border-radius: 4px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; }
        .bfs-note-track::before { content: ''; grid-column: 1 / -1; grid-row: 1; border-radius: 4px; background:
          var(--bg-tertiary); }
        .bfs-note-mark { position: absolute; top: -5px; width: 4px; height: 18px; margin-left: -2px; border-radius: 2px; background: var(--accent);
          transition: left 1s cubic-bezier(.22,1,.36,1); }
        .bfs-note-ends { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted); margin-top: 8px; }

        @media (max-width: 1000px) {
          .bfs-hero { padding: 28px 0 40px; row-gap: 28px; }
          .bfs-hero-copy, .bfs-note { grid-column: 1 / -1; }
          html .bfs-hero .bfs-hero-title { font-size: clamp(40px, 11vw, 64px) !important; margin-bottom: 18px !important; }
          .bfs-note { padding: 20px 18px; }
          .bfs-hero-actions .bfs-primary { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bfs-hero-sub, .bfs-hero-actions, .bfs-note, .bfs-note-sentence, .bfs-note-figures { animation: none; }
          .bfs-note-mark { transition: none; }
        }
      `}</style>
    </section>
  )
}
