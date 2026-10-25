// Wording for "why did it move". Five languages.

const zh = {
  tab: '涨跌原因', title: '为什么大涨大跌？',
  intro: '过去一年里这只股票波动最大的交易日，以及当天有据可查的事实。先看大盘和行业同一天怎么走：一起跌是整体市场的原因，只有它跌才是公司自身的原因。',
  threshold: (t) => `入选标准：单日涨跌超过 ${t}%（约为平时波动的 2 倍以上）`,
  kinds: { market: '整体市场', sector: '行业带动', stock: '个股原因' },
  kindHelp: { market: '大盘同一天也大幅同向波动', sector: '同行业整体同向波动', stock: '大盘和行业都没有这么大的波动' },
  market: (b) => (b === 'SPY' ? '标普500' : b === '510300' ? '沪深300' : b), sector: (etf) => `行业（${etf}）`,
  filings: '向美国证监会（SEC）提交的文件', fomc: '美联储议息决议日', news: '当天的新闻标题', anns: '公司公告（巨潮资讯）',
  noFacts: '这里的记录没有显示当天公司有公告或新闻。可能是市场情绪、分析师观点或尚未公开的信息。',
  ai: 'AI 解读', aiLoading: '正在根据以上事实解读…', aiFail: '暂时无法解读，请稍后再试。',
  aiNote: 'AI 只根据上面列出的事实解读，"同时发生"不等于"因为它"。',
  loading: '正在查找过去一年的大涨大跌日…（第一次可能需要十几秒）', none: '过去一年没有特别大的单日涨跌。', err: '暂时拿不到这只股票的价格历史。',
  unsupported: '涨跌原因目前支持美股和 A 股。', et: '美东时间', newsNote: (d) => `新闻标题只覆盖 ${d} 以后`,
}

const en = {
  tab: 'Why it moved', title: 'Why did it jump or drop?',
  intro: "This stock's biggest one-day moves of the past year, with the facts on record for each day. Check the market and sector first: if they fell too, it was a market-wide move; if only this stock fell, the reason is the company's own.",
  threshold: (t) => `Days shown: moves over ${t}% (about twice the stock's usual daily range or more)`,
  kinds: { market: 'Market-wide', sector: 'Sector-wide', stock: 'Company-specific' },
  kindHelp: { market: 'The market moved sharply the same way that day', sector: 'Its industry moved the same way', stock: 'Neither the market nor its sector moved this much' },
  market: (b) => (b === 'SPY' ? 'S&P 500' : b === '510300' ? 'CSI 300' : b), sector: (etf) => `Sector (${etf})`,
  filings: 'Filings with the SEC', fomc: 'Federal Reserve rate decision day', news: 'Headlines that day', anns: 'Company announcements (cninfo)',
  noFacts: 'The records here show no company filing or news that day. It may have been sentiment, analyst views or information not yet public.',
  ai: 'AI explanation', aiLoading: 'Explaining from the facts above…', aiFail: 'No explanation available right now.',
  aiNote: 'The AI uses only the facts listed above; happening at the same time is not proof of cause.',
  loading: 'Finding the biggest moves of the past year… (the first time can take a few seconds)', none: 'No unusually large one-day moves in the past year.', err: 'Price history for this stock is not available right now.',
  unsupported: 'Why-it-moved covers US stocks and China A-shares.', et: 'ET', newsNote: (d) => `Headlines only go back to ${d}`,
}

const ja = {
  ...en,
  tab: '値動きの理由', title: 'なぜ大きく動いた？',
  intro: '過去1年でこの銘柄が最も大きく動いた日と、その日の記録に残る事実です。まず市場と業種の動きを確認：一緒に下げたなら市場全体、この銘柄だけなら会社固有の理由です。',
  threshold: (t) => `表示条件：1日の変動が ${t}% 超（普段の値幅の約2倍以上）`,
  kinds: { market: '市場全体', sector: '業種全体', stock: '個別要因' },
  kindHelp: { market: '同じ日に市場も同じ方向に大きく動いた', sector: '業種全体が同じ方向に動いた', stock: '市場も業種もここまでは動いていない' },
  market: (b) => (b === 'SPY' ? 'S&P500' : b === '510300' ? 'CSI300' : b), sector: (etf) => `業種（${etf}）`,
  filings: 'SEC への提出書類', fomc: 'FRB の金融政策決定日', news: '当日のニュース見出し', anns: '会社の開示（巨潮資訊）',
  noFacts: 'この記録では当日の会社の開示やニュースは見当たりません。市場心理やアナリストの見方などの可能性があります。',
  ai: 'AI 解説', aiLoading: '上の事実をもとに解説中…', aiFail: '現在は解説できません。', aiNote: 'AI は上の事実だけを使います。同時に起きたことが原因とは限りません。',
  loading: '過去1年の大きな値動きを探しています…', none: '過去1年に特に大きな値動きはありません。', err: '現在この銘柄の価格履歴を取得できません。',
  unsupported: '米国株と中国A株に対応しています。', et: '米東部時間', newsNote: (d) => `ニュース見出しは ${d} 以降のみ`,
}

const ko = {
  ...en,
  tab: '등락 이유', title: '왜 크게 올랐다 내렸나?',
  intro: '지난 1년간 이 종목이 가장 크게 움직인 날과 그날 기록으로 확인되는 사실입니다. 먼저 시장과 업종을 보세요: 함께 떨어졌다면 시장 전체, 이 종목만 떨어졌다면 회사 자체의 이유입니다.',
  threshold: (t) => `표시 기준: 하루 등락 ${t}% 초과 (평소 변동의 약 2배 이상)`,
  kinds: { market: '시장 전체', sector: '업종 전체', stock: '종목 고유' },
  kindHelp: { market: '같은 날 시장도 같은 방향으로 크게 움직임', sector: '업종 전체가 같은 방향으로 움직임', stock: '시장과 업종 모두 이만큼 움직이지 않음' },
  market: (b) => (b === 'SPY' ? 'S&P 500' : b === '510300' ? 'CSI 300' : b), sector: (etf) => `업종 (${etf})`,
  filings: 'SEC 제출 서류', fomc: '연준 금리 결정일', news: '당일 뉴스 헤드라인', anns: '회사 공시 (cninfo)',
  noFacts: '여기 기록에는 그날 회사 공시나 뉴스가 없습니다. 시장 심리나 애널리스트 의견일 수 있습니다.',
  ai: 'AI 해설', aiLoading: '위 사실로 해설하는 중…', aiFail: '지금은 해설할 수 없습니다.', aiNote: 'AI는 위 사실만 사용합니다. 동시에 일어났다고 원인인 것은 아닙니다.',
  loading: '지난 1년의 큰 등락을 찾는 중…', none: '지난 1년간 특별히 큰 하루 등락이 없습니다.', err: '지금은 이 종목의 가격 기록을 가져올 수 없습니다.',
  unsupported: '미국 주식과 중국 A주를 지원합니다.', et: '미 동부시간', newsNote: (d) => `뉴스 헤드라인은 ${d} 이후만`,
}

const fr = {
  ...en,
  tab: 'Pourquoi ça bouge', title: 'Pourquoi une telle hausse ou baisse ?',
  intro: "Les plus fortes variations d'une journée de cette action sur un an, avec les faits documentés pour chaque jour. Regardez d'abord le marché et le secteur : s'ils ont baissé aussi, c'est un mouvement général ; si seule l'action a baissé, la raison tient à l'entreprise.",
  threshold: (t) => `Jours retenus : variations de plus de ${t} % (environ deux fois l'amplitude habituelle ou plus)`,
  kinds: { market: 'Tout le marché', sector: 'Tout le secteur', stock: "Propre à l'entreprise" },
  kindHelp: { market: 'Le marché a fortement bougé dans le même sens', sector: 'Son secteur a bougé dans le même sens', stock: 'Ni le marché ni le secteur n\'ont autant bougé' },
  market: (b) => (b === 'SPY' ? 'S&P 500' : b === '510300' ? 'CSI 300' : b), sector: (etf) => `Secteur (${etf})`,
  filings: 'Documents déposés à la SEC', fomc: 'Jour de décision de la Fed', news: 'Titres du jour', anns: "Annonces de l'entreprise (cninfo)",
  noFacts: "Les données ici ne montrent aucune publication ni actualité ce jour-là. Cela peut venir du sentiment de marché ou d'avis d'analystes.",
  ai: 'Explication IA', aiLoading: 'Explication à partir des faits ci-dessus…', aiFail: 'Explication indisponible pour le moment.', aiNote: "L'IA n'utilise que les faits ci-dessus ; survenir en même temps n'est pas une preuve de cause.",
  loading: 'Recherche des plus fortes variations de l\'année…', none: 'Aucune variation journalière inhabituelle sur un an.', err: "Historique de prix indisponible pour le moment.",
  unsupported: 'Disponible pour les actions US et les actions A chinoises.', et: 'heure de New York', newsNote: (d) => `Les titres ne remontent qu'au ${d}`,
}

const ALL = { zh, en, ja, ko, fr }
export default function movesStrings(lang) { return ALL[lang] || en }
