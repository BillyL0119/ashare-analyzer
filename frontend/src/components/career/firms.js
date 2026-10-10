// Firm directory for the Career Guide. Public facts only (HQ city, listing); "known" summarises each
// firm's best-known franchises in our own words. `ticker` links to our stock page:
// US listings as `us:SYM`, A-shares as `cn:CODE` (linked); other exchanges as `sto:SYM` etc. (shown, not
// linked); null when the firm is not listed itself (private, partnership or subsidiary).

export const CATEGORIES = [
  { key: 'bb',    zh: '大型投行',     en: 'Bulge Bracket' },
  { key: 'eb',    zh: '精品投行',     en: 'Elite Boutique' },
  { key: 'mm',    zh: '中型投行',     en: 'Middle Market' },
  { key: 'pe',    zh: '私募股权',     en: 'Private Equity' },
  { key: 'hf',    zh: '对冲基金',     en: 'Hedge Funds' },
  { key: 'quant', zh: '量化 / 做市',  en: 'Trading & Quant' },
  { key: 'am',    zh: '资产管理',     en: 'Asset Management' },
  { key: 'cn',    zh: '中资券商',     en: 'China Securities' },
]

const f = (name, cat, hq, ticker, zh, en) => ({ name, cat, hq, ticker, known: { zh, en } })

export const FIRMS = [
  // Bulge bracket
  f('Goldman Sachs', 'bb', 'New York', 'us:GS', '并购顾问、股票承销、交易业务', 'M&A advisory, equity underwriting, markets'),
  f('Morgan Stanley', 'bb', 'New York', 'us:MS', '科技 IPO、股权资本市场、财富管理', 'Tech IPOs, equity capital markets, wealth management'),
  f('JPMorgan', 'bb', 'New York', 'us:JPM', '美国资产规模最大的银行；债务融资、杠杆融资', 'Largest US bank by assets; debt and leveraged finance'),
  f('Bank of America', 'bb', 'Charlotte', 'us:BAC', '债务资本市场、杠杆融资', 'Debt capital markets, leveraged finance'),
  f('Citi', 'bb', 'New York', 'us:C', '全球交易银行、债券与外汇', 'Global transaction banking, bonds and FX'),
  f('Barclays', 'bb', 'London', 'us:BCS', '债务资本市场、英美企业覆盖', 'Debt capital markets, US and UK coverage'),
  f('UBS', 'bb', 'Zurich', 'us:UBS', '全球财富管理、投行', 'Global wealth management, investment banking'),
  f('Deutsche Bank', 'bb', 'Frankfurt', 'us:DB', '债务资本市场、利率与外汇交易', 'Debt capital markets, rates and FX trading'),
  // Elite boutiques
  f('Evercore', 'eb', 'New York', 'us:EVR', '独立并购顾问、重组', 'Independent M&A advisory, restructuring'),
  f('Lazard', 'eb', 'New York', 'us:LAZ', '并购、重组、资产管理', 'M&A, restructuring, asset management'),
  f('Centerview Partners', 'eb', 'New York', null, '大型战略并购顾问', 'Large-cap strategic M&A advisory'),
  f('PJT Partners', 'eb', 'New York', 'us:PJT', '重组、战略顾问、基金募资 (Park Hill)', 'Restructuring, strategic advisory, fund placement (Park Hill)'),
  f('Moelis & Company', 'eb', 'New York', 'us:MC', '并购、重组', 'M&A, restructuring'),
  f('Perella Weinberg', 'eb', 'New York', 'us:PWP', '并购、重组', 'M&A, restructuring'),
  f('Qatalyst Partners', 'eb', 'San Francisco', null, '科技行业并购', 'Technology M&A'),
  f('Guggenheim Securities', 'eb', 'New York', null, '并购顾问、资本市场', 'M&A advisory, capital markets'),
  // Middle market
  f('Houlihan Lokey', 'mm', 'Los Angeles', 'us:HLI', '重组、中型并购、估值', 'Restructuring, mid-market M&A, valuation'),
  f('Jefferies', 'mm', 'New York', 'us:JEF', '杠杆融资、并购', 'Leveraged finance, M&A'),
  f('William Blair', 'mm', 'Chicago', null, '成长型企业并购、股权融资', 'Growth-company M&A, equity capital markets'),
  f('Harris Williams', 'mm', 'Richmond', null, '中型企业并购', 'Middle-market M&A'),
  f('Baird', 'mm', 'Milwaukee', null, '中型企业并购', 'Middle-market M&A'),
  f('Piper Sandler', 'mm', 'Minneapolis', 'us:PIPR', '医疗、金融机构投行', 'Healthcare and financial-institutions banking'),
  f('Lincoln International', 'mm', 'Chicago', null, '中型并购、估值', 'Mid-market M&A, valuations'),
  f('Raymond James', 'mm', 'St. Petersburg, FL', 'us:RJF', '财富管理、中型投行', 'Wealth management, mid-market banking'),
  // Private equity
  f('Blackstone', 'pe', 'New York', 'us:BX', '全球最大另类资产管理人；私募、房地产', 'Largest alternative asset manager; PE, real estate'),
  f('KKR', 'pe', 'New York', 'us:KKR', '杠杆收购 (LBO) 先驱', 'Pioneer of the leveraged buyout'),
  f('Apollo', 'pe', 'New York', 'us:APO', '私募信贷、私募股权', 'Private credit, private equity'),
  f('Carlyle', 'pe', 'Washington, D.C.', 'us:CG', '全球私募股权', 'Global private equity'),
  f('TPG', 'pe', 'Fort Worth', 'us:TPG', '成长投资、影响力投资', 'Growth and impact investing'),
  f('Ares Management', 'pe', 'Los Angeles', 'us:ARES', '私募信贷', 'Private credit'),
  f('Bain Capital', 'pe', 'Boston', null, '私募股权、信贷、风险投资', 'PE, credit, venture'),
  f('Thoma Bravo', 'pe', 'Chicago', null, '软件行业收购', 'Software buyouts'),
  f('Warburg Pincus', 'pe', 'New York', null, '成长型投资', 'Growth investing'),
  f('Hellman & Friedman', 'pe', 'San Francisco', null, '大型收购', 'Large buyouts'),
  f('Advent International', 'pe', 'Boston', null, '全球收购', 'Global buyouts'),
  f('EQT', 'pe', 'Stockholm', 'sto:EQT', '欧洲最大私募股权机构之一', 'One of Europe\'s largest PE firms'),
  // Hedge funds
  f('Citadel', 'hf', 'Miami', null, '多策略对冲基金', 'Multi-strategy hedge fund'),
  f('Millennium Management', 'hf', 'New York', null, '多基金经理平台', 'Multi-manager platform'),
  f('Point72', 'hf', 'Stamford, CT', null, '多基金经理、股票多空', 'Multi-manager, long/short equity'),
  f('Bridgewater Associates', 'hf', 'Westport, CT', null, '全球宏观', 'Global macro'),
  f('D. E. Shaw', 'hf', 'New York', null, '量化与主观策略', 'Quantitative and discretionary strategies'),
  f('Two Sigma', 'hf', 'New York', null, '量化投资', 'Quantitative investing'),
  f('Renaissance Technologies', 'hf', 'East Setauket, NY', null, '量化投资（大奖章基金）', 'Quantitative investing (Medallion fund)'),
  f('Elliott Management', 'hf', 'West Palm Beach', null, '激进投资者策略', 'Activist investing'),
  f('Balyasny', 'hf', 'Chicago', null, '多策略对冲基金', 'Multi-strategy hedge fund'),
  // Trading & quant
  f('Jane Street', 'quant', 'New York', null, 'ETF 做市、量化交易', 'ETF market making, quantitative trading'),
  f('Citadel Securities', 'quant', 'Miami', null, '做市商', 'Market making'),
  f('Hudson River Trading', 'quant', 'New York', null, '算法交易', 'Algorithmic trading'),
  f('Jump Trading', 'quant', 'Chicago', null, '高频交易', 'High-frequency trading'),
  f('Optiver', 'quant', 'Amsterdam', null, '期权做市', 'Options market making'),
  f('IMC Trading', 'quant', 'Amsterdam', null, '做市商', 'Market making'),
  f('Susquehanna (SIG)', 'quant', 'Bala Cynwyd, PA', null, '期权做市', 'Options market making'),
  f('Virtu Financial', 'quant', 'New York', 'us:VIRT', '电子化做市', 'Electronic market making'),
  // Asset management
  f('BlackRock', 'am', 'New York', 'us:BLK', '全球最大资管；iShares ETF', 'Largest asset manager; iShares ETFs'),
  f('Vanguard', 'am', 'Malvern, PA', null, '指数基金', 'Index funds'),
  f('Fidelity Investments', 'am', 'Boston', null, '主动管理基金、经纪业务', 'Active funds, brokerage'),
  f('State Street', 'am', 'Boston', 'us:STT', 'SPDR ETF、托管', 'SPDR ETFs, custody'),
  f('T. Rowe Price', 'am', 'Baltimore', 'us:TROW', '主动股票管理', 'Active equity'),
  f('Capital Group', 'am', 'Los Angeles', null, 'American Funds 系列基金', 'American Funds'),
  f('PIMCO', 'am', 'Newport Beach', null, '固定收益', 'Fixed income'),
  f('Wellington Management', 'am', 'Boston', null, '主动资产管理', 'Active management'),
  f('Invesco', 'am', 'Atlanta', 'us:IVZ', 'QQQ ETF', 'QQQ ETF'),
  // China securities firms
  f('中金公司 CICC', 'cn', '北京 Beijing', 'cn:601995', 'IPO、并购、跨境业务', 'IPOs, M&A, cross-border deals'),
  f('中信证券 CITIC Securities', 'cn', '北京 Beijing', 'cn:600030', '中国规模最大的券商', 'China\'s largest securities firm'),
  f('中信建投 CSC Financial', 'cn', '北京 Beijing', 'cn:601066', '投行、股票承销', 'Investment banking, equity underwriting'),
  f('华泰证券 Huatai Securities', 'cn', '南京 Nanjing', 'cn:601688', '经纪、财富科技', 'Brokerage, wealth tech'),
  f('国泰海通 Guotai Haitong', 'cn', '上海 Shanghai', 'cn:601211', '投行、经纪', 'Investment banking, brokerage'),
  f('中国银河 China Galaxy', 'cn', '北京 Beijing', 'cn:601881', '经纪、投行', 'Brokerage, investment banking'),
  f('招商证券 China Merchants Securities', 'cn', '深圳 Shenzhen', 'cn:600999', '经纪、投行', 'Brokerage, investment banking'),
  f('广发证券 GF Securities', 'cn', '广州 Guangzhou', 'cn:000776', '经纪、资管', 'Brokerage, asset management'),
]
