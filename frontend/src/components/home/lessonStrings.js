// Words for the home page's market lesson (MarketLesson.jsx). Five languages.
// `dir` is 'up' | 'down' | 'flat'; `live` is true while the US market is open.

export const SECTOR_NAMES = {
  zh: { Energy: '能源', Industrials: '工业', 'Consumer Discretionary': '可选消费', Technology: '科技', Materials: '原材料',
        'Consumer Staples': '必需消费', 'Health Care': '医疗保健', Communication: '通信服务', 'Real Estate': '房地产', Utilities: '公用事业', Financials: '金融' },
  ja: { Energy: 'エネルギー', Industrials: '資本財', 'Consumer Discretionary': '一般消費財', Technology: 'テクノロジー', Materials: '素材',
        'Consumer Staples': '生活必需品', 'Health Care': 'ヘルスケア', Communication: '通信サービス', 'Real Estate': '不動産', Utilities: '公益事業', Financials: '金融' },
  ko: { Energy: '에너지', Industrials: '산업재', 'Consumer Discretionary': '경기소비재', Technology: '기술', Materials: '소재',
        'Consumer Staples': '필수소비재', 'Health Care': '헬스케어', Communication: '커뮤니케이션', 'Real Estate': '부동산', Utilities: '유틸리티', Financials: '금융' },
  fr: { Energy: "L'énergie", Industrials: "L'industrie", 'Consumer Discretionary': 'La consommation discrétionnaire', Technology: 'La technologie', Materials: 'Les matériaux',
        'Consumer Staples': 'La consommation de base', 'Health Care': 'La santé', Communication: 'Les communications', 'Real Estate': "L'immobilier", Utilities: 'Les services publics', Financials: 'La finance' },
}

const en = {
  movers: 'Biggest movers',
  loading: 'US market',
  open: 'US market open',
  pre: 'US pre-market trading',
  post: 'US after-hours trading',
  closed: (h, m, when) => (h != null ? `US market closed, opens in ${h} h ${m} min` : when ? `US market closed, opens ${when} New York time` : 'US market closed'),
  title: (dir, live, day) => live
    ? { up: 'US stocks are up today', down: 'US stocks are down today', flat: 'US stocks are flat so far today' }[dir]
    : { up: `US stocks rose on ${day}`, down: `US stocks fell on ${day}`, flat: `US stocks barely moved on ${day}` }[dir],
  sentence: ({ dir, live, price, pct, sector, n, total }) => {
    const move = dir === 'flat' ? `little changed` : `${dir === 'up' ? 'up' : 'down'} ${pct}%`
    let out = live ? `The S&P 500 is at ${price}, ${move}.` : `The S&P 500 closed at ${price}, ${move}.`
    if (sector && dir !== 'flat') out += ` ${sector} ${dir === 'up' ? 'rose' : 'fell'} the most`
    if (n != null && total && dir !== 'flat') out += `${sector ? ', and' : ''} ${n} of ${total} large US companies ${live ? 'are' : 'ended'} ${dir === 'up' ? 'higher' : 'lower'}`
    return out.endsWith('.') ? out : out + '.'
  },
  chartLabel: 'S&P 500 (SPY), last three months',
  why: 'Why it moved',
  moved: (name, dir, pct) => `${name} ${dir === 'up' ? 'rose' : 'fell'} ${pct}%`,
  findMover: "Find the day's biggest movers",
  idea: 'The idea behind it',
  ideaText: 'What moves a stock index',
  try: 'Try it yourself',
  tryText: 'Trade with $100,000 in virtual cash',
}

const zh = {
  movers: '涨跌最多的股票',
  loading: '美股',
  open: '美股交易中',
  pre: '美股盘前交易中',
  post: '美股盘后交易中',
  closed: (h, m, when) => (h != null ? `美股已收盘，${h} 小时 ${m} 分钟后开盘` : when ? `美股已收盘，美东时间${when}开盘` : '美股已收盘'),
  title: (dir, live, day) => live
    ? { up: '美股今天上涨', down: '美股今天下跌', flat: '美股今天基本持平' }[dir]
    : { up: `美股${day}上涨`, down: `美股${day}下跌`, flat: `美股${day}基本持平` }[dir],
  sentence: ({ dir, live, price, pct, sector, n, total }) => {
    const move = dir === 'flat' ? '几乎没变' : `${dir === 'up' ? '上涨' : '下跌'} ${pct}%`
    let out = live ? `标普 500 现在 ${price}，${move}。` : `标普 500 收于 ${price}，${move}。`
    if (sector && dir !== 'flat') out += `${sector}板块${dir === 'up' ? '涨' : '跌'}得最多`
    if (n != null && total && dir !== 'flat') out += `${sector ? '，' : ''}${total} 家美国大公司里有 ${n} 家${dir === 'up' ? '上涨' : '下跌'}`
    return out.endsWith('。') ? out : out + '。'
  },
  chartLabel: '标普 500（SPY），最近三个月',
  why: '为什么涨跌',
  moved: (name, dir, pct) => `${name}${dir === 'up' ? '上涨' : '下跌'} ${pct}%`,
  findMover: '看今天涨跌最多的股票',
  idea: '背后的经济学',
  ideaText: '股票指数为什么会涨跌',
  try: '自己试试',
  tryText: '用 10 万美元虚拟资金交易',
}

const ja = {
  movers: '値動きの大きい銘柄',
  loading: '米国市場',
  open: '米国市場 取引中',
  pre: '米国市場 プレマーケット',
  post: '米国市場 時間外取引',
  closed: (h, m, when) => (h != null ? `米国市場 取引終了、${h}時間${m}分後に開始` : when ? `米国市場 取引終了、米国東部時間 ${when} に開始` : '米国市場 取引終了'),
  title: (dir, live, day) => live
    ? { up: '米国株は本日上昇', down: '米国株は本日下落', flat: '米国株は本日ほぼ横ばい' }[dir]
    : { up: `米国株は${day}に上昇`, down: `米国株は${day}に下落`, flat: `米国株は${day}ほぼ横ばい` }[dir],
  sentence: ({ dir, live, price, pct, sector, n, total }) => {
    const move = dir === 'flat' ? 'ほぼ変わらず' : `${pct}% ${dir === 'up' ? '上昇' : '下落'}`
    let out = live ? `S&P 500 は現在 ${price}、${move}。` : `S&P 500 は ${price} で引け、${move}しました。`
    if (sector && dir !== 'flat') out += `最も${dir === 'up' ? '上げた' : '下げた'}のは${sector}セクター`
    if (n != null && total && dir !== 'flat') out += `${sector ? 'で、' : ''}米国大型株 ${total} 社のうち ${n} 社が${dir === 'up' ? '上昇' : '下落'}`
    return out.endsWith('。') ? out : out + 'しました。'
  },
  chartLabel: 'S&P 500（SPY）、直近3か月',
  why: '値動きの理由',
  moved: (name, dir, pct) => `${name} が ${pct}% ${dir === 'up' ? '上昇' : '下落'}`,
  findMover: '今日大きく動いた銘柄を見る',
  idea: '背景にある経済学',
  ideaText: '株価指数が動く理由',
  try: '自分で試す',
  tryText: '10万ドルの仮想資金で売買',
}

const ko = {
  movers: '변동 폭이 큰 종목',
  loading: '미국 증시',
  open: '미국 증시 거래 중',
  pre: '미국 증시 프리마켓',
  post: '미국 증시 애프터마켓',
  closed: (h, m, when) => (h != null ? `미국 증시 마감, ${h}시간 ${m}분 뒤 개장` : when ? `미국 증시 마감, 미국 동부시간 ${when} 개장` : '미국 증시 마감'),
  title: (dir, live, day) => live
    ? { up: '미국 증시 오늘 상승', down: '미국 증시 오늘 하락', flat: '미국 증시 오늘 보합' }[dir]
    : { up: `미국 증시 ${day} 상승`, down: `미국 증시 ${day} 하락`, flat: `미국 증시 ${day} 보합` }[dir],
  sentence: ({ dir, live, price, pct, sector, n, total }) => {
    const move = dir === 'flat' ? '거의 변동이 없었습니다' : `${pct}% ${dir === 'up' ? '상승했습니다' : '하락했습니다'}`
    let out = live ? `S&P 500은 현재 ${price}로 ${move}.` : `S&P 500은 ${price}에 마감해 ${move}.`
    if (sector && dir !== 'flat') out += ` 가장 많이 ${dir === 'up' ? '오른' : '내린'} 업종은 ${sector}`
    if (n != null && total && dir !== 'flat') out += `${sector ? '이며,' : ''} 미국 대형주 ${total}개 중 ${n}개가 ${dir === 'up' ? '올랐습니다' : '내렸습니다'}`
    return out.endsWith('.') ? out : out + '.'
  },
  chartLabel: 'S&P 500(SPY), 최근 3개월',
  why: '왜 움직였나',
  moved: (name, dir, pct) => `${name} ${pct}% ${dir === 'up' ? '상승' : '하락'}`,
  findMover: '오늘 가장 많이 움직인 종목 보기',
  idea: '그 뒤의 경제학',
  ideaText: '주가지수가 움직이는 이유',
  try: '직접 해 보기',
  tryText: '가상 자금 10만 달러로 매매',
}

const fr = {
  movers: 'Plus fortes variations',
  loading: 'Marché américain',
  open: 'Marché américain ouvert',
  pre: 'Marché américain en pré-ouverture',
  post: 'Marché américain après la clôture',
  closed: (h, m, when) => (h != null ? `Marché américain fermé, ouverture dans ${h} h ${m} min` : when ? `Marché américain fermé, ouverture ${when} (heure de New York)` : 'Marché américain fermé'),
  title: (dir, live, day) => live
    ? { up: "Les actions américaines montent aujourd'hui", down: "Les actions américaines baissent aujourd'hui", flat: "Les actions américaines bougent peu aujourd'hui" }[dir]
    : { up: `Les actions américaines ont monté ${day}`, down: `Les actions américaines ont baissé ${day}`, flat: `Les actions américaines ont peu bougé ${day}` }[dir],
  sentence: ({ dir, live, price, pct, sector, n, total }) => {
    const move = dir === 'flat' ? 'quasi stable' : `en ${dir === 'up' ? 'hausse' : 'baisse'} de ${pct} %`
    let out = live ? `Le S&P 500 est à ${price}, ${move}.` : `Le S&P 500 a clôturé à ${price}, ${move}.`
    if (sector && dir !== 'flat') out += ` ${sector} a le plus ${dir === 'up' ? 'monté' : 'reculé'}`
    if (n != null && total && dir !== 'flat') out += `${sector ? ', et' : ''} ${n} des ${total} grandes entreprises américaines ${live ? 'sont' : 'ont fini'} en ${dir === 'up' ? 'hausse' : 'baisse'}`
    return out.endsWith('.') ? out : out + '.'
  },
  chartLabel: 'S&P 500 (SPY), trois derniers mois',
  why: 'Pourquoi ça a bougé',
  moved: (name, dir, pct) => `${name} ${dir === 'up' ? 'a monté' : 'a baissé'} de ${pct} %`,
  findMover: 'Voir les plus fortes variations du jour',
  idea: "L'idée derrière",
  ideaText: "Ce qui fait bouger un indice boursier",
  try: 'Essayez vous-même',
  tryText: 'Investir 100 000 $ virtuels',
}

export default { zh, en, ja, ko, fr }
