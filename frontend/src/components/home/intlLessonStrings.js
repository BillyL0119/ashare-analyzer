// Words for the home page's top panel when the A-share, Hong Kong or Japan market is selected (MarketLesson.jsx),
// and for the phone home card (mobile/LessonCard.jsx, US and A-shares). The desktop US panel uses lessonStrings.js.

const pctWord = { zh: (p) => `${p}%`, en: (p) => `${p}%`, ja: (p) => `${p}%`, ko: (p) => `${p}%`, fr: (p) => `${p} %` }

const zh = {
  market: { us: '美股', cn: 'A股', hk: '港股', jp: '日股' },
  index: { us: '标普500', cn: '上证指数', hk: '恒生指数', jp: '日经225' },
  open: (m) => `${zh.market[m]}交易中`, lunch: (m) => `${zh.market[m]}午间休市`, closed: (m) => `${zh.market[m]}已收盘`,
  title: (m, dir, live, day) => live
    ? { up: `${zh.market[m]}今天上涨`, down: `${zh.market[m]}今天下跌`, flat: `${zh.market[m]}今天基本持平` }[dir]
    : { up: `${zh.market[m]}${day}上涨`, down: `${zh.market[m]}${day}下跌`, flat: `${zh.market[m]}${day}几乎没动` }[dir],
  sentence: ({ m, dir, live, price, pct, sector, up, total }) => {
    const move = dir === 'flat' ? '变化不大' : `${dir === 'up' ? '涨' : '跌'} ${pctWord.zh(pct)}`
    let out = `${zh.index[m]}${live ? '现在是' : '收于'} ${price}，${move}。`
    if (sector && dir !== 'flat') out += `${sector}板块${dir === 'up' ? '涨' : '跌'}得最多`
    if (up != null && total && dir !== 'flat') out += `${sector ? '，' : ''}${total} 只股票里有 ${up} 只${dir === 'up' ? '上涨' : '下跌'}`
    return out.endsWith('。') ? out : out + '。'
  },
  movers: '热门股里涨跌最大的', chartLabel: (m) => `${zh.index[m]}近三个月`,
  study: '学一学', studyText: '股票和指数入门', try: '试一试', tryText: '用模拟资金练习买卖',
}

const en = {
  market: { us: 'US stocks', cn: 'China A-shares', hk: 'Hong Kong stocks', jp: 'Japanese stocks' },
  index: { us: 'The S&P 500', cn: 'The SSE Composite', hk: 'The Hang Seng Index', jp: 'The Nikkei 225' },
  open: (m) => `${en.market[m]}: trading`, lunch: (m) => `${en.market[m]}: lunch break`, closed: (m) => `${en.market[m]}: closed`,
  title: (m, dir, live, day) => live
    ? { up: `${en.market[m]} are up today`, down: `${en.market[m]} are down today`, flat: `${en.market[m]} are flat so far today` }[dir]
    : { up: `${en.market[m]} rose on ${day}`, down: `${en.market[m]} fell on ${day}`, flat: `${en.market[m]} barely moved on ${day}` }[dir],
  sentence: ({ m, dir, live, price, pct, sector, up, total }) => {
    const move = dir === 'flat' ? 'little changed' : `${dir === 'up' ? 'up' : 'down'} ${pct}%`
    let out = `${en.index[m]} ${live ? 'is at' : 'closed at'} ${price}, ${move}.`
    if (sector && dir !== 'flat') out += ` ${sector} ${dir === 'up' ? 'rose' : 'fell'} the most`
    if (up != null && total && dir !== 'flat') out += `${sector ? ', and' : ''} ${up} of ${total} stocks ${dir === 'up' ? 'rose' : 'fell'}`
    return out.endsWith('.') ? out : out + '.'
  },
  movers: 'Biggest movers among popular stocks', chartLabel: (m) => `${en.index[m].replace(/^The /, '')}, last three months`,
  study: 'Learn', studyText: 'Stocks and indices for beginners', try: 'Try', tryText: 'Practise trading with paper money',
}

const ja = {
  ...en,
  market: { us: '米国株', cn: '中国A株', hk: '香港株', jp: '日本株' },
  index: { us: 'S&P500', cn: '上海総合指数', hk: 'ハンセン指数', jp: '日経平均' },
  open: (m) => `${ja.market[m]}：取引中`, lunch: (m) => `${ja.market[m]}：昼休み`, closed: (m) => `${ja.market[m]}：取引終了`,
  title: (m, dir, live, day) => live
    ? { up: `${ja.market[m]}は今日上昇`, down: `${ja.market[m]}は今日下落`, flat: `${ja.market[m]}は今日ほぼ横ばい` }[dir]
    : { up: `${ja.market[m]}は${day}に上昇`, down: `${ja.market[m]}は${day}に下落`, flat: `${ja.market[m]}は${day}ほぼ動かず` }[dir],
  sentence: ({ m, dir, live, price, pct }) => `${ja.index[m]}は${live ? '現在' : '終値'} ${price}、${dir === 'flat' ? 'ほぼ変わらず' : `${pct}%${dir === 'up' ? '上昇' : '下落'}`}。`,
  movers: '人気銘柄の値動き', chartLabel: (m) => `${ja.index[m]}（過去3か月）`,
  study: '学ぶ', studyText: '株と指数の入門', try: '試す', tryText: '仮想資金で売買を練習',
}

const ko = {
  ...en,
  market: { us: '미국 주식', cn: '중국 A주', hk: '홍콩 주식', jp: '일본 주식' },
  index: { us: 'S&P 500', cn: '상하이종합지수', hk: '항셍지수', jp: '닛케이225' },
  open: (m) => `${ko.market[m]}: 거래 중`, lunch: (m) => `${ko.market[m]}: 점심 휴장`, closed: (m) => `${ko.market[m]}: 장 마감`,
  title: (m, dir, live, day) => live
    ? { up: `${ko.market[m]} 오늘 상승`, down: `${ko.market[m]} 오늘 하락`, flat: `${ko.market[m]} 오늘 보합` }[dir]
    : { up: `${ko.market[m]} ${day} 상승`, down: `${ko.market[m]} ${day} 하락`, flat: `${ko.market[m]} ${day} 보합` }[dir],
  sentence: ({ m, dir, live, price, pct }) => `${ko.index[m]} ${live ? '현재' : '종가'} ${price}, ${dir === 'flat' ? '거의 변동 없음' : `${pct}% ${dir === 'up' ? '상승' : '하락'}`}.`,
  movers: '인기 종목 중 가장 크게 움직인 종목', chartLabel: (m) => `${ko.index[m]} 최근 3개월`,
  study: '배우기', studyText: '주식과 지수 입문', try: '해보기', tryText: '모의 자금으로 매매 연습',
}

const fr = {
  ...en,
  market: { us: 'Les actions américaines', cn: 'Les actions A chinoises', hk: 'Les actions de Hong Kong', jp: 'Les actions japonaises' },
  index: { us: 'Le S&P 500', cn: "L'indice SSE Composite", hk: "L'indice Hang Seng", jp: 'Le Nikkei 225' },
  open: (m) => `${fr.market[m]} : séance en cours`, lunch: (m) => `${fr.market[m]} : pause de midi`, closed: (m) => `${fr.market[m]} : marché fermé`,
  title: (m, dir, live, day) => live
    ? { up: `${fr.market[m]} montent aujourd'hui`, down: `${fr.market[m]} baissent aujourd'hui`, flat: `${fr.market[m]} sont stables aujourd'hui` }[dir]
    : { up: `${fr.market[m]} ont monté ${day}`, down: `${fr.market[m]} ont baissé ${day}`, flat: `${fr.market[m]} ont peu bougé ${day}` }[dir],
  sentence: ({ m, dir, live, price, pct }) => `${fr.index[m]} ${live ? 'est à' : 'a clôturé à'} ${price}, ${dir === 'flat' ? 'quasi stable' : `${dir === 'up' ? 'en hausse' : 'en baisse'} de ${pctWord.fr(pct)}`}.`,
  movers: 'Les plus fortes variations parmi les valeurs suivies', chartLabel: (m) => `${fr.index[m].replace(/^(L'indice |Le )/, '')}, trois derniers mois`,
  study: 'Apprendre', studyText: 'Actions et indices pour débuter', try: 'Essayer', tryText: "S'entraîner avec de l'argent fictif",
}

export default { zh, en, ja, ko, fr }
