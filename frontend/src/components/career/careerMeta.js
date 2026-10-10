// Structured, comparable facts per career track (the long-form text lives in ../careerData.js).
// Compensation figures are generalized US estimates compiled from public reporting (bank pay
// announcements, compensation surveys, press coverage) for 2025–26; they vary widely by firm,
// group, city, year and performance. Shown with that caveat in the UI.

export const META = {
  IBD: {
    short: { zh: '投行', en: 'IB' },
    hours: '70–90',
    entryAllIn: '$170–230K',
    recruitStart: { zh: '大二春季', en: 'Sophomore spring' },
    exits: { zh: ['私募股权', '对冲基金', '企业战略/并购', '成长型投资'], en: ['Private equity', 'Hedge funds', 'Corp dev', 'Growth equity'] },
    ladder: [
      { level: { zh: '分析师', en: 'Analyst' }, years: '0–3', base: '$110–130K', allIn: '$170–230K' },
      { level: { zh: '经理 (Associate)', en: 'Associate' }, years: '3–6', base: '$175–225K', allIn: '$275–425K' },
      { level: { zh: '副总裁 (VP)', en: 'Vice President' }, years: '6–9', base: '$250–300K', allIn: '$400–650K' },
      { level: { zh: '董事 (Director)', en: 'Director / ED' }, years: '9–12', base: '$300–400K', allIn: '$600K–1M' },
      { level: { zh: '董事总经理 (MD)', en: 'Managing Director' }, years: '12+', base: '$400–600K', allIn: '$1M+' },
    ],
    timeline: [
      { when: { zh: '大一–大二', en: 'Freshman–sophomore' }, what: { zh: '加入金融社团，开始 networking，争取早期项目 (early insight / sophomore program)', en: 'Join finance clubs, start networking, apply to early-insight and sophomore programs' } },
      { when: { zh: '大二春季', en: 'Sophomore spring' }, what: { zh: '大三暑期实习招聘开始（比入职早约 18 个月），技术面试准备', en: 'Junior-summer internship recruiting opens (~18 months ahead); prepare technicals' } },
      { when: { zh: '大三暑期', en: 'Junior summer' }, what: { zh: '10 周暑期实习，表现决定是否拿到全职 return offer', en: '10-week summer internship; performance decides the full-time return offer' } },
      { when: { zh: '大四秋季', en: 'Senior fall' }, what: { zh: '未拿到 offer 的同学参加全职校招', en: 'Full-time recruiting for those without a return offer' } },
    ],
  },
  EquityResearch: {
    short: { zh: '研究', en: 'ER' },
    hours: '60–70',
    entryAllIn: '$130–200K',
    recruitStart: { zh: '大三秋季', en: 'Junior fall' },
    exits: { zh: ['对冲基金', '共同基金', '投资者关系', '企业战略'], en: ['Hedge funds', 'Mutual funds', 'Investor relations', 'Corp strategy'] },
    ladder: [
      { level: { zh: '研究助理', en: 'Research Associate' }, years: '0–3', base: '$100–125K', allIn: '$130–200K' },
      { level: { zh: '高级研究助理', en: 'Senior Associate' }, years: '3–5', base: '$130–175K', allIn: '$160–250K' },
      { level: { zh: '分析师 / VP', en: 'Analyst / VP' }, years: '5–9', base: '$175–250K', allIn: '$250–500K' },
      { level: { zh: '首席分析师 / MD', en: 'Senior Analyst / MD' }, years: '9+', base: '$250–400K', allIn: '$500K–1M+' },
    ],
    timeline: [
      { when: { zh: '大二–大三', en: 'Sophomore–junior' }, what: { zh: '写个股研究报告、参加投资比赛，建立行业观点', en: 'Write stock pitches and enter investment competitions to build a sector view' } },
      { when: { zh: '大三秋季', en: 'Junior fall' }, what: { zh: '研究部暑期实习招聘，常含写作测试（一份完整个股报告）', en: 'Summer analyst recruiting, often with a written test (a full stock report)' } },
      { when: { zh: '大三暑期', en: 'Junior summer' }, what: { zh: '跟随一个覆盖团队更新模型、撰写财报点评', en: 'Join a coverage team: update models, write earnings notes' } },
      { when: { zh: '大四秋季', en: 'Senior fall' }, what: { zh: '全职招聘与 return offer', en: 'Full-time recruiting and return offers' } },
    ],
  },
  ST: {
    short: { zh: '交易', en: 'S&T' },
    hours: '55–65',
    entryAllIn: '$140–200K',
    recruitStart: { zh: '大二春季', en: 'Sophomore spring' },
    exits: { zh: ['对冲基金', '自营交易', '资产管理', '金融科技'], en: ['Hedge funds', 'Prop trading', 'Asset management', 'Fintech'] },
    ladder: [
      { level: { zh: '分析师', en: 'Analyst' }, years: '0–3', base: '$110–125K', allIn: '$140–200K' },
      { level: { zh: '经理 (Associate)', en: 'Associate' }, years: '3–6', base: '$150–175K', allIn: '$200–350K' },
      { level: { zh: '副总裁 (VP)', en: 'Vice President' }, years: '6–9', base: '$200–250K', allIn: '$300–600K' },
      { level: { zh: '董事 / MD', en: 'Director / MD' }, years: '9+', base: '$300–500K', allIn: '$500K–1M+' },
    ],
    timeline: [
      { when: { zh: '大一–大二', en: 'Freshman–sophomore' }, what: { zh: '关注市场、练习心算和概率题，参加交易类比赛', en: 'Follow markets, practise mental maths and probability, enter trading competitions' } },
      { when: { zh: '大二春季', en: 'Sophomore spring' }, what: { zh: '大三暑期实习申请开放，含市场面试和心算测试', en: 'Junior-summer applications open: markets interviews and mental-maths tests' } },
      { when: { zh: '大三暑期', en: 'Junior summer' }, what: { zh: '轮岗多个交易台，最后由交易台“认领”', en: 'Rotate across desks; a desk picks you at the end' } },
      { when: { zh: '大四秋季', en: 'Senior fall' }, what: { zh: '全职招聘与 return offer', en: 'Full-time recruiting and return offers' } },
    ],
  },
  AM: {
    short: { zh: '资管', en: 'AM' },
    hours: '50–60',
    entryAllIn: '$110–170K',
    recruitStart: { zh: '大三秋季', en: 'Junior fall' },
    exits: { zh: ['基金经理', '对冲基金', '家族办公室', '机构投资者'], en: ['Portfolio manager', 'Hedge funds', 'Family offices', 'Pensions & endowments'] },
    ladder: [
      { level: { zh: '分析师', en: 'Analyst' }, years: '0–3', base: '$90–120K', allIn: '$110–170K' },
      { level: { zh: '经理 / 高级分析师', en: 'Associate / Senior Analyst' }, years: '3–6', base: '$130–180K', allIn: '$150–250K' },
      { level: { zh: '副总裁 / 行业负责人', en: 'VP / Sector Head' }, years: '6–10', base: '$180–250K', allIn: '$250–500K' },
      { level: { zh: '基金经理', en: 'Portfolio Manager' }, years: '10+', base: '$250–400K', allIn: '$400K–1M+' },
    ],
    timeline: [
      { when: { zh: '大二–大三', en: 'Sophomore–junior' }, what: { zh: '建立自己的投资组合和投资逻辑，考 CFA 一级', en: 'Run a personal portfolio with a clear thesis; consider CFA Level I' } },
      { when: { zh: '大三秋季', en: 'Junior fall' }, what: { zh: '暑期实习招聘，面试常要求现场推荐一只股票', en: 'Summer recruiting; interviews often ask for a live stock pitch' } },
      { when: { zh: '大三暑期', en: 'Junior summer' }, what: { zh: '跟随投资团队做行业研究', en: 'Sector research with an investment team' } },
      { when: { zh: '大四秋季', en: 'Senior fall' }, what: { zh: '全职招聘与 return offer', en: 'Full-time recruiting and return offers' } },
    ],
  },
  PE: {
    short: { zh: '私募', en: 'PE' },
    hours: '60–80',
    entryAllIn: '$200–350K',
    recruitStart: { zh: '投行分析师第 1 年', en: '1st year as IB analyst' },
    exits: { zh: ['更高级别 PE', '被投企业管理层', '对冲基金', '创业'], en: ['Senior PE roles', 'Portfolio company ops', 'Hedge funds', 'Founding a company'] },
    ladder: [
      { level: { zh: '投资经理 (Associate)', en: 'Associate (pre-MBA)' }, years: '2–4', base: '$150–200K', allIn: '$200–350K' },
      { level: { zh: '高级投资经理', en: 'Senior Associate' }, years: '4–6', base: '$200–250K', allIn: '$300–500K' },
      { level: { zh: '副总裁 (VP)', en: 'Vice President' }, years: '6–9', base: '$250–350K', allIn: '$500–900K + carry' },
      { level: { zh: '董事 / 合伙人', en: 'Principal / Partner' }, years: '9+', base: '$350K+', allIn: '$700K–2M+ + carry' },
    ],
    timeline: [
      { when: { zh: '入行前', en: 'Before' }, what: { zh: '通常先做 2 年投行或咨询，积累建模和交易经验', en: 'Usually 2 years in IB or consulting first, for modelling and deal experience' } },
      { when: { zh: '分析师第 1 年', en: 'Analyst year 1' }, what: { zh: '大型基金的 on-cycle 招聘开始得很早，往往入职几个月内就面试', en: 'Mega-fund on-cycle recruiting starts early, often months into the job' } },
      { when: { zh: '面试', en: 'Interviews' }, what: { zh: 'LBO 建模测试（限时 1–3 小时）+ 案例讨论', en: 'LBO modelling test (1–3 hours) plus a case discussion' } },
      { when: { zh: '入职', en: 'Start' }, what: { zh: '投行分析师项目结束后（约 2 年后）加入', en: 'Join after the 2-year analyst program ends' } },
    ],
  },
  Quant: {
    short: { zh: '量化', en: 'Quant' },
    hours: '50–60',
    entryAllIn: '$250–500K',
    recruitStart: { zh: '提前 ~1 年（秋季）', en: '~1 year ahead (fall)' },
    exits: { zh: ['对冲基金', '自营交易公司', '科技公司', '创业'], en: ['Hedge funds', 'Prop trading firms', 'Big tech', 'Founding a company'] },
    ladder: [
      { level: { zh: '研究员 / 交易员（应届）', en: 'Researcher / Trader (new grad)' }, years: '0–2', base: '$150–250K', allIn: '$250–500K' },
      { level: { zh: '研究员', en: 'Researcher' }, years: '2–5', base: '$200–300K', allIn: '$350–700K' },
      { level: { zh: '高级研究员', en: 'Senior Researcher' }, years: '5–8', base: '$250–350K', allIn: '$500K–1M+' },
      { level: { zh: '投资组合经理 / 合伙人', en: 'PM / Partner' }, years: '8+', base: '—', allIn: '$1M+ (P&L-linked)' },
    ],
    timeline: [
      { when: { zh: '前一年秋季', en: 'Fall, a year ahead' }, what: { zh: '实习申请开放，先做在线测评（概率、编程、心算）', en: 'Internship applications open; online assessments (probability, coding, mental maths)' } },
      { when: { zh: '面试', en: 'Interviews' }, what: { zh: '多轮技术面：概率脑筋急转弯、统计、编程、市场直觉', en: 'Several technical rounds: probability puzzles, statistics, coding, market sense' } },
      { when: { zh: '暑期', en: 'Summer' }, what: { zh: '实习项目 + 交易模拟，决定全职 offer', en: 'Intern project plus trading simulations decide the full-time offer' } },
      { when: { zh: '博士生', en: 'PhD students' }, what: { zh: '研究岗常直接招博士，时间表更灵活', en: 'Research roles often hire PhDs directly on a more flexible timeline' } },
    ],
  },
  CorpFinance: {
    short: { zh: '企业财务', en: 'Corp Fin' },
    hours: '45–55',
    entryAllIn: '$75–110K',
    recruitStart: { zh: '大三秋季', en: 'Junior fall' },
    exits: { zh: ['财务总监 / CFO 路线', '企业战略', '咨询', '创业公司财务'], en: ['CFO track', 'Corp strategy', 'Consulting', 'Startup finance'] },
    ladder: [
      { level: { zh: '财务分析师 (FP&A)', en: 'Financial Analyst (FP&A)' }, years: '0–3', base: '$70–95K', allIn: '$75–110K' },
      { level: { zh: '高级分析师', en: 'Senior Analyst' }, years: '3–5', base: '$90–120K', allIn: '$100–140K' },
      { level: { zh: '财务经理', en: 'Finance Manager' }, years: '5–8', base: '$120–160K', allIn: '$135–190K' },
      { level: { zh: '财务总监', en: 'Director of Finance' }, years: '8+', base: '$160–230K', allIn: '$190–300K' },
    ],
    timeline: [
      { when: { zh: '大二–大三', en: 'Sophomore–junior' }, what: { zh: '会计、Excel 和财务建模基础', en: 'Accounting, Excel and modelling basics' } },
      { when: { zh: '大三秋季', en: 'Junior fall' }, what: { zh: '大公司财务轮岗项目 (FLDP) 招聘', en: 'Recruiting for corporate finance rotational programs (FLDP)' } },
      { when: { zh: '大三暑期', en: 'Junior summer' }, what: { zh: '财务实习：预算、预测、经营分析', en: 'Internship: budgeting, forecasting, business analysis' } },
      { when: { zh: '全年', en: 'Year-round' }, what: { zh: '招聘节奏比投行宽松，滚动录取较多', en: 'Less rigid than IB; much rolling hiring' } },
    ],
  },
  Risk: {
    short: { zh: '风控', en: 'Risk' },
    hours: '45–55',
    entryAllIn: '$85–130K',
    recruitStart: { zh: '大三秋季', en: 'Junior fall' },
    exits: { zh: ['首席风险官路线', '监管机构', '量化', '资管风控'], en: ['CRO track', 'Regulators', 'Quant roles', 'Buy-side risk'] },
    ladder: [
      { level: { zh: '风险分析师', en: 'Risk Analyst' }, years: '0–3', base: '$80–110K', allIn: '$85–130K' },
      { level: { zh: '经理 (Associate)', en: 'Associate' }, years: '3–6', base: '$110–150K', allIn: '$125–190K' },
      { level: { zh: '副总裁 (VP)', en: 'Vice President' }, years: '6–10', base: '$150–220K', allIn: '$180–300K' },
      { level: { zh: '董事 / 风险主管', en: 'Director / Head of Risk' }, years: '10+', base: '$220–350K', allIn: '$300–550K' },
    ],
    timeline: [
      { when: { zh: '大二–大三', en: 'Sophomore–junior' }, what: { zh: '统计、Python、衍生品基础，可考 FRM', en: 'Statistics, Python and derivatives basics; consider the FRM' } },
      { when: { zh: '大三秋季', en: 'Junior fall' }, what: { zh: '银行风险部暑期实习招聘', en: 'Bank risk-division summer recruiting' } },
      { when: { zh: '大三暑期', en: 'Junior summer' }, what: { zh: '市场风险 / 信用风险 / 模型验证实习', en: 'Market risk, credit risk or model-validation internship' } },
      { when: { zh: '大四秋季', en: 'Senior fall' }, what: { zh: '全职招聘与 return offer', en: 'Full-time recruiting and return offers' } },
    ],
  },
}

// Which firm categories (see firms.js) hire for each track
export const TRACK_FIRMS = {
  IBD: ['bb', 'eb', 'mm', 'cn'],
  EquityResearch: ['bb', 'mm', 'cn'],
  ST: ['bb', 'quant'],
  AM: ['am'],
  PE: ['pe'],
  Quant: ['quant', 'hf'],
  CorpFinance: [],
  Risk: ['bb', 'am'],
}
