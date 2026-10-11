// Chinese names for the common releases (other languages keep the official English names)
export const NAME_ZH = {
  'Core CPI': '核心CPI', CPI: 'CPI 消费者物价指数', PPI: 'PPI 生产者物价指数', 'Core PPI': '核心PPI',
  'Retail Sales': '零售销售', 'Core Retail Sales': '核心零售销售', 'Initial Jobless Claims': '首次申领失业救济人数',
  'Nonfarm Payrolls': '非农就业人数', 'Unemployment Rate': '失业率', 'Fed Interest Rate Decision': '美联储利率决议',
  'FOMC Meeting Minutes': '美联储会议纪要', 'Beige Book': '美联储褐皮书', GDP: 'GDP 国内生产总值',
  'Core PCE Price Index': '核心PCE物价指数', 'PCE price index': 'PCE物价指数', 'PCE Price index': 'PCE物价指数',
  'Michigan Consumer Sentiment': '密歇根大学消费者信心', 'CB Consumer Confidence': '世企研究会消费者信心',
  'ISM Manufacturing PMI': 'ISM制造业PMI', 'ISM Non-Manufacturing PMI': 'ISM非制造业PMI',
  'S&P Global Manufacturing PMI': '标普全球制造业PMI', 'S&P Global Services PMI': '标普全球服务业PMI',
  'S&P Global Composite PMI': '标普全球综合PMI', 'JOLTs Job Openings': 'JOLTS职位空缺', 'Crude Oil Inventories': 'EIA原油库存',
  'Housing Starts': '新屋开工', 'Building Permits': '营建许可', 'Existing Home Sales': '成屋销售', 'New Home Sales': '新屋销售',
  'Trade Balance': '贸易差额', 'Durable Goods Orders': '耐用品订单', 'Core Durable Goods Orders': '核心耐用品订单',
  'Industrial Production': '工业产出', 'Personal Income': '个人收入', 'Personal Spending': '个人支出',
  'Interest Rate Decision': '利率决议', 'Caixin Manufacturing PMI': '财新制造业PMI', 'Caixin Services PMI': '财新服务业PMI',
}

export function eventName(name, lang) {
  if (lang !== 'zh') return name
  if (NAME_ZH[name]) return NAME_ZH[name]
  let m = name.match(/^Fed Chair (\w+) Speaks$/)
  if (m) return `美联储主席${m[1]}讲话`
  m = name.match(/^(?:Fed|FOMC Member) (\w+) Speaks$/)
  if (m) return `美联储官员${m[1]}讲话`
  return name
}
