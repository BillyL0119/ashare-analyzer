/**
 * CareerGuidePage
 * Three sub-modules:
 *   1. Job Requirements Library — 8 finance roles with static content
 *   2. Interview Question Bank  — filterable static Q&A
 *   3. AI Mock Interview        — streaming DeepSeek conversation
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import useThemeStore from '../store/themeStore'

// ── Static data ───────────────────────────────────────────────────────────────

const ROLES = [
  {
    id: 'IBD',
    title: '投资银行部 (IBD)',
    titleEn: 'Investment Banking (IBD)',
    icon: '🏦',
    color: '#0ea5e9',
    tagline: '资本市场的核心枢纽，交易撮合与财务顾问',
    taglineEn: 'The core of capital markets — deal-making and financial advisory',
    description:
      'IBD帮助企业进行IPO、债券发行、并购（M&A）等重大资本运作。分析师每天深度参与财务建模、尽职调查和客户提案材料（Pitch Book）的制作，是最高强度也最受认可的入门岗位之一。',
    descriptionEn:
      'IBD advises corporations on IPOs, debt issuances, and M&A transactions. Analysts build detailed financial models, conduct due diligence, and produce pitch books — one of the most demanding yet prestigious entry-level finance roles.',
    skills: ['DCF估值建模', 'LBO模型', '并购财务分析', 'Pitch Book制作', '资本市场结构', 'Excel / PowerPoint精通', '会计三表联动'],
    skillsEn: ['DCF valuation modeling', 'LBO modeling', 'M&A financial analysis', 'Pitch book creation', 'Capital markets structure', 'Advanced Excel / PowerPoint', 'Three-statement modeling'],
    certs: ['CFA（进阶推荐）', 'FINRA Series 7/63（美国）', '保荐代表人（中国）'],
    certsEn: ['CFA (recommended for advancement)', 'FINRA Series 7/63 (US)', 'Sponsor Representative (China)'],
    entry: '顶尖商学院/经济学/金融学本科；GPA 3.5+；暑期实习至关重要；超模型（super-day）流程',
    entryEn: 'Target school finance/economics degree; GPA 3.5+; summer internship is critical; super-day interview process',
    career: '分析师(2-3年) → 副总裁(Associate) → 副总裁(VP) → 董事总经理(MD)；常见出路：PE、对冲基金、公司BD',
    careerEn: 'Analyst (2-3y) → Associate → VP → MD; common exits: PE, hedge fund, corporate development',
    salary: '初级分析师：¥30–50万/年（国内）；$100–150K（美国）；奖金占比可达50–100%基本工资',
    salaryEn: 'Junior Analyst: RMB 300-500K/yr (China); $100-150K base (US); bonus can equal 50-100% of base',
    disclaimer: '以上薪资为市场估算区间，因机构规模、城市及个人绩效差异显著，仅供参考，不构成任何承诺。',
    disclaimerEn: 'Salary ranges are market estimates only. Actual compensation varies significantly by firm, location, and performance. Not a guarantee.',
    typical: '收到客户指令 → 更新财务模型 → 整理尽调材料 → 深夜修改Pitch → 会议准备',
    typicalEn: 'Receive client mandate → update financial model → organize due diligence → late-night pitch revisions → prep for client meeting',
  },
  {
    id: 'EquityResearch',
    title: '股票研究 (Equity Research)',
    titleEn: 'Equity Research',
    icon: '🔍',
    color: '#8b5cf6',
    tagline: '深度挖掘上市公司价值，发布买/卖/持有评级',
    taglineEn: 'Deep-dive on public companies, publishing Buy/Sell/Hold ratings',
    description:
      '研究分析师覆盖特定行业的上市公司，通过基本面分析发布研究报告，给出目标价和投资评级。需要同时掌握行业洞察、财务建模与写作能力，是同时接触买方和卖方视角的岗位。',
    descriptionEn:
      'Research analysts cover listed companies within a sector, publishing reports with target prices and ratings. Requires industry expertise, financial modeling, and clear writing — a unique vantage point across both buy-side and sell-side.',
    skills: ['行业深度研究', '财务建模（DCF/相对估值）', '调研与草根调查', '报告写作', '数据分析', '管理层访谈', '投资逻辑构建'],
    skillsEn: ['Deep industry research', 'Financial modeling (DCF / relative valuation)', 'Channel checks & scuttlebutt', 'Report writing', 'Data analysis', 'Management interviews', 'Investment thesis building'],
    certs: ['CFA（强烈推荐，行业标配）', 'FRM（金融风险管理）'],
    certsEn: ['CFA (strongly recommended — industry standard)', 'FRM (Financial Risk Manager)'],
    entry: '金融/会计/相关行业本科；行业经验加分；Bloomberg操作能力；部分要求MBA',
    entryEn: 'Finance/accounting/relevant sector background; industry experience a plus; Bloomberg proficiency; some roles require MBA',
    career: '研究助理 → 初级分析师 → 高级分析师 → 首席分析师（明星分析师）；出路：对冲基金/公募基金买方',
    careerEn: 'Research Associate → Junior Analyst → Senior Analyst → Lead Analyst (star analyst); exits: hedge funds / long-only buy-side',
    salary: '初级：¥25–40万（国内）；$80–120K（美国）；卖方奖金与佣金收入挂钩',
    salaryEn: 'Junior: RMB 250-400K (China); $80-120K (US); sell-side bonus linked to commission revenue',
    disclaimer: '以上薪资为市场估算区间，仅供参考。',
    disclaimerEn: 'Salary ranges are market estimates only. For reference only.',
    typical: '阅读行业新闻 → 更新财务模型 → 联系公司IR → 撰写研究观点 → 与销售团队沟通推送',
    typicalEn: 'Read industry news → update models → call company IR → write research notes → brief sales team on thesis',
  },
  {
    id: 'ST',
    title: '销售与交易 (Sales & Trading)',
    titleEn: 'Sales & Trading',
    icon: '📈',
    color: '#26a69a',
    tagline: '市场实时博弈，做市商与机构客户之间的桥梁',
    taglineEn: 'Real-time market execution — bridging market-making and institutional clients',
    description:
      'Sales负责与机构客户沟通，理解其需求并推荐交易策略；Trading负责在市场中执行交易、管理风险敞口。该岗位节奏极快，要求极强的数字敏感度、抗压能力和对市场结构的深刻理解。',
    descriptionEn:
      'Sales communicates with institutional clients to understand needs and pitch trading ideas; Trading executes positions and manages risk exposure. Ultra fast-paced, demanding sharp numerics, composure under pressure, and deep market structure knowledge.',
    skills: ['市场微观结构', '衍生品定价基础', '风险管理（delta/gamma对冲）', '产品知识（股票/债券/FX/商品）', '快速决策', '客户关系管理'],
    skillsEn: ['Market microstructure', 'Derivatives pricing basics', 'Risk management (delta/gamma hedging)', 'Product knowledge (equities/FI/FX/commodities)', 'Rapid decision-making', 'Client relationship management'],
    certs: ['CFA', 'FINRA Series 7/63（美国）', '期货从业资格（国内）'],
    certsEn: ['CFA', 'FINRA Series 7/63 (US)', 'Futures Practitioner License (China)'],
    entry: '数学/物理/CS/金融本科；心理素质稳定；在校模拟交易经历加分；部分岗位技术测试',
    entryEn: 'Math/physics/CS/finance background; emotional stability; simulated trading experience a plus; some roles include technical tests',
    career: '初级交易员/销售 → 高级交易员 → 做市主管 → 交易主管；出路：对冲基金、自营交易公司(Prop Firm)',
    careerEn: 'Junior Trader/Sales → Senior Trader → Head of Desk → Head of Trading; exits: hedge funds, prop trading firms',
    salary: '初级：¥20–40万（国内）；$85–130K（美国）；交易台奖金与PnL强相关',
    salaryEn: 'Junior: RMB 200-400K (China); $85-130K base (US); desk bonus highly correlated with P&L',
    disclaimer: '以上薪资为市场估算区间，仅供参考。',
    disclaimerEn: 'Salary ranges are market estimates only. For reference only.',
    typical: '开市前查看隔夜市场 → 接受客户询价 → 管理日内风险 → 收市后盘点PnL → 准备明日策略',
    typicalEn: 'Pre-market review of overnight flows → take client inquiries → manage intraday risk → EOD P&L review → prep next-day strategy',
  },
  {
    id: 'AM',
    title: '资产管理 (Asset Management)',
    titleEn: 'Asset Management',
    icon: '💼',
    color: '#f6c90e',
    tagline: '为机构或个人管理资金组合，实现长期稳健回报',
    taglineEn: 'Managing institutional or individual portfolios for long-term risk-adjusted returns',
    description:
      '资产管理公司（公募基金、私募、养老金等）负责管理客户资产，基于宏观判断和个股研究构建投资组合。岗位分工多样：组合经理负责最终决策，研究员负责标的深挖，销售负责AUM扩张。',
    descriptionEn:
      'Asset managers (mutual funds, private funds, pensions) manage client capital, constructing portfolios based on macro views and stock-level research. Diverse roles: portfolio managers make final calls, analysts dig deep, sales expands AUM.',
    skills: ['投资组合构建', '因子分析（价值/成长/动量）', '宏观分析', '风险收益优化', '客户沟通', 'Bloomberg/Wind操作', '量化筛选'],
    skillsEn: ['Portfolio construction', 'Factor analysis (value/growth/momentum)', 'Macro analysis', 'Risk-return optimization', 'Client communication', 'Bloomberg/Wind proficiency', 'Quantitative screening'],
    certs: ['CFA（几乎必备）', 'FRM', '基金从业资格（国内）'],
    certsEn: ['CFA (near-essential)', 'FRM', 'Fund Practitioner License (China)'],
    entry: '金融/经济学/理工科本科或硕士；CFA进阶必要；部分要求投资研究背景',
    entryEn: 'Finance/economics/STEM undergrad or master; CFA increasingly required; some roles need prior research experience',
    career: '研究助理 → 行业研究员 → 高级研究员 → 基金经理助理 → 基金经理',
    careerEn: 'Research Associate → Sector Analyst → Senior Analyst → Junior PM → Portfolio Manager',
    salary: '初级研究员：¥20–35万（国内公募）；$75–110K（美国）；绩效奖金与基金收益挂钩',
    salaryEn: 'Junior Analyst: RMB 200-350K (China mutual fund); $75-110K (US); performance bonus tied to fund returns',
    disclaimer: '以上薪资为市场估算区间，仅供参考。',
    disclaimerEn: 'Salary ranges are market estimates only. For reference only.',
    typical: '晨会讨论市场 → 跟踪持仓标的 → 阅读公司公告 → 调研新标的 → 更新组合归因分析',
    typicalEn: 'Morning meeting on markets → monitor existing holdings → read company announcements → research new ideas → update portfolio attribution',
  },
  {
    id: 'PE',
    title: '私募股权 (Private Equity)',
    titleEn: 'Private Equity',
    icon: '🦅',
    color: '#ef5350',
    tagline: '收购未上市企业，通过价值创造实现超额回报',
    taglineEn: 'Acquire private companies, create value, and realize outsized returns',
    description:
      'PE基金通过杠杆收购（LBO）或成长型投资持有私有企业股权，在3-7年内通过改善运营、战略并购或IPO退出实现回报。对候选人的建模能力、行业判断和尽职调查经验要求极高，招聘竞争激烈。',
    descriptionEn:
      'PE funds acquire stakes in private companies through LBOs or growth equity, creating value over 3-7 years via operational improvement, add-on acquisitions, or IPO exits. Highly competitive hiring — demands strong modeling, sector conviction, and due diligence skills.',
    skills: ['LBO建模', '运营价值提升分析', '尽职调查（财务/法律/运营）', '投资备忘录（IC Memo）', '行业深度判断', '管理层访谈', 'IRR/MOIC计算'],
    skillsEn: ['LBO modeling', 'Operational value creation analysis', 'Due diligence (financial/legal/operational)', 'Investment committee memo', 'Sector conviction', 'Management interviews', 'IRR / MOIC calculations'],
    certs: ['CFA（进阶推荐）', 'MBA（中后期晋升路径）'],
    certsEn: ['CFA (recommended for advancement)', 'MBA (mid-career promotion path)'],
    entry: '通常由IBD分析师转岗（2年IBD经验）；极少直接招本科；招聘流程包括建模测试+案例分析',
    entryEn: 'Typically sourced from IBD analysts (2 years IBD experience); rarely hire undergrads directly; process includes modeling test + case study',
    career: '助理(Associate) → 高级助理 → 副总裁(VP) → 合伙人；部分回读MBA再重新进入',
    careerEn: 'Associate → Senior Associate → VP → Partner; some exit for MBA then re-enter',
    salary: '初级助理：¥40–80万（国内顶级机构）；$150–200K（美国中型PE）；carry是主要长期激励',
    salaryEn: 'Junior Associate: RMB 400-800K (top China PE); $150-200K (US mid-market PE); carried interest is the key long-term incentive',
    disclaimer: '以上薪资为市场估算区间，仅供参考。',
    disclaimerEn: 'Salary ranges are market estimates only. For reference only.',
    typical: '审阅交易材料 → 更新LBO模型 → 行业尽调电话 → 撰写IC备忘录 → 投委会报告',
    typicalEn: 'Review deal materials → update LBO model → industry diligence calls → write IC memo → present to investment committee',
  },
  {
    id: 'Quant',
    title: '量化金融 (Quant)',
    titleEn: 'Quantitative Finance',
    icon: '🤖',
    color: '#38bdf8',
    tagline: '用数学与算法在市场中寻找可持续的统计套利机会',
    taglineEn: 'Using math and algorithms to find sustainable statistical edges in markets',
    description:
      'Quant角色涵盖量化研究员（开发Alpha因子）、量化交易员（执行策略）和量化开发工程师（系统搭建）。需要极强的数理背景，是近年来竞争最激烈的金融岗位之一，薪资天花板极高。',
    descriptionEn:
      'Quant roles span quantitative researchers (developing alpha signals), quant traders (executing strategies), and quant developers (building infrastructure). Requires elite math skills — now one of the most competitive finance roles with a very high compensation ceiling.',
    skills: ['Python / C++编程', '统计学与概率论', '机器学习（ML）', '时间序列分析', '回测框架搭建', '因子挖掘与组合优化', '随机过程/Black-Scholes'],
    skillsEn: ['Python / C++ programming', 'Statistics and probability theory', 'Machine learning', 'Time series analysis', 'Backtesting framework design', 'Factor mining & portfolio optimization', 'Stochastic processes / Black-Scholes'],
    certs: ['FRM', 'CFA（部分岗位要求）', '数学/CS/物理博士学历（顶级机构）'],
    certsEn: ['FRM', 'CFA (some roles)', 'Math/CS/Physics PhD (elite firms)'],
    entry: '数学/物理/CS/统计学顶尖本科或博士；编程能力必须；Leetcode中等及以上；数理测试',
    entryEn: 'Top math/physics/CS/stats undergraduate or PhD; strong programming required; LeetCode medium+ level; quantitative assessment tests',
    career: '初级研究员 → 高级研究员 → 策略主管 → 合伙人/PM；顶级薪资在市场中极具竞争力',
    careerEn: 'Junior Researcher → Senior Researcher → Strategy Lead → Partner/PM; top-tier comp among all finance roles',
    salary: '初级：¥40–100万（国内顶级量化私募）；$150–250K+（美国顶级对冲基金）；Citadel/TwoSigma等可达$500K+',
    salaryEn: 'Junior: RMB 400K-1M (top China quant funds); $150-250K+ (top US hedge funds); elite firms like Citadel/Two Sigma can reach $500K+',
    disclaimer: '以上薪资为市场估算区间，仅供参考。顶级量化机构薪资明显高于行业均值。',
    disclaimerEn: 'Salary ranges are market estimates only. Elite quant firms pay significantly above market average.',
    typical: '阅读学术论文 → 构建新因子 → 历史回测 → 代码Review → 策略容量分析 → 模拟盘验证',
    typicalEn: 'Read academic papers → build new signals → historical backtesting → code review → strategy capacity analysis → paper trading validation',
  },
  {
    id: 'CorpFinance',
    title: '企业财务 (Corporate Finance)',
    titleEn: 'Corporate Finance / FP&A',
    icon: '🏢',
    color: '#a78bfa',
    tagline: '企业内部的财务规划、资本结构与战略决策支持',
    taglineEn: 'Internal financial planning, capital structure, and strategic decision support',
    description:
      '企业财务涵盖FP&A（财务规划与分析）、资金管理（Treasury）、财务会计和企业并购（Corp Dev）等职能。与投行相比，工作与生活的平衡更好，但薪资天花板相对较低。是金融学生进入实体行业的重要通道。',
    descriptionEn:
      'Corporate finance covers FP&A, treasury, accounting, and corporate development (M&A). Better work-life balance versus banking but a lower comp ceiling. An important entry point for finance students into the corporate world.',
    skills: ['财务规划与预算', '财务报表分析', '资金管理', '成本分析', '项目NPV评估', 'ERP系统（SAP/Oracle）', '汇报与沟通'],
    skillsEn: ['Financial planning & budgeting', 'Financial statement analysis', 'Treasury management', 'Cost analysis', 'Project NPV evaluation', 'ERP systems (SAP/Oracle)', 'Reporting & communication'],
    certs: ['CPA（注册会计师，国内高度认可）', 'CMA（注册管理会计师）', 'CFA（进阶路径）'],
    certsEn: ['CPA (highly valued in China)', 'CMA (Certified Management Accountant)', 'CFA (for advancement)'],
    entry: '会计/金融/经济学本科；大型企业更倾向会计专业；实习经历重要',
    entryEn: 'Accounting/finance/economics degree; large corporations prefer accounting majors; internship experience important',
    career: '财务分析师 → 高级分析师 → 财务经理 → 财务总监(CFO路径)；或横向进入投行/咨询',
    careerEn: 'Financial Analyst → Senior Analyst → Finance Manager → CFO track; or lateral to banking/consulting',
    salary: '初级：¥15–30万（国内）；$60–90K（美国）；稳定性强，工时相对合理',
    salaryEn: 'Junior: RMB 150-300K (China); $60-90K (US); stable with reasonable working hours',
    disclaimer: '以上薪资为市场估算区间，仅供参考。',
    disclaimerEn: 'Salary ranges are market estimates only. For reference only.',
    typical: '整理月度财务报表 → 更新预算对比实际 → 准备管理层汇报 → 分析业务部门成本 → 现金流预测',
    typicalEn: 'Prepare monthly financials → update budget vs actuals → prep management presentation → analyze business unit costs → cash flow forecasting',
  },
  {
    id: 'Risk',
    title: '风险管理与合规 (Risk & Compliance)',
    titleEn: 'Risk Management & Compliance',
    icon: '🛡️',
    color: '#fb923c',
    tagline: '识别、量化并管控金融机构的各类风险敞口',
    taglineEn: 'Identify, quantify, and manage the full spectrum of financial institution risk exposures',
    description:
      '风险管理岗位涵盖市场风险（Market Risk）、信用风险（Credit Risk）、流动性风险和操作风险。合规岗位确保机构遵守监管要求（如巴塞尔协议III、MiFID II、证监会规定）。监管日趋严格，该领域需求持续增长。',
    descriptionEn:
      'Risk roles span market risk, credit risk, liquidity risk, and operational risk. Compliance ensures adherence to regulations (Basel III, MiFID II, CSRC requirements). Growing demand as regulatory scrutiny intensifies globally.',
    skills: ['VaR/CVaR计算', '压力测试', '信用评估模型', '监管资本框架（巴塞尔III）', '衍生品风险建模', '合规政策解读', '内部控制'],
    skillsEn: ['VaR / CVaR calculation', 'Stress testing', 'Credit scoring models', 'Regulatory capital framework (Basel III)', 'Derivatives risk modeling', 'Compliance policy interpretation', 'Internal controls'],
    certs: ['FRM（金融风险管理师，该领域黄金认证）', 'PRM', 'CFA', '合规从业资格（国内）'],
    certsEn: ['FRM (Financial Risk Manager — gold standard for this field)', 'PRM (Professional Risk Manager)', 'CFA', 'Compliance Practitioner License (China)'],
    entry: '数学/统计/金融/工程本科；编程加分（Python/R）；FRM考取对求职帮助极大',
    entryEn: 'Math/stats/finance/engineering background; programming a plus (Python/R); FRM certification significantly boosts employability',
    career: '风险分析师 → 高级分析师 → 风险经理 → 首席风险官（CRO）路径',
    careerEn: 'Risk Analyst → Senior Analyst → Risk Manager → Chief Risk Officer (CRO) track',
    salary: '初级：¥18–32万（国内银行）；$70–100K（美国）；监管专家溢价明显',
    salaryEn: 'Junior: RMB 180-320K (China banks); $70-100K (US); regulatory specialists command a significant premium',
    disclaimer: '以上薪资为市场估算区间，仅供参考。',
    disclaimerEn: 'Salary ranges are market estimates only. For reference only.',
    typical: '查看隔夜市场敞口 → 运行压力测试 → 审查交易限额 → 监管报告整理 → 与前台业务沟通',
    typicalEn: 'Review overnight risk exposures → run stress tests → review trading limits → prepare regulatory reports → communicate with front office',
  },
]

const QUESTIONS = [
  // ── Technical ──────────────────────────────────────────────────────────────
  {
    id: 1,
    type: 'technical',
    roles: ['IBD', 'PE'],
    q: 'DCF估值中，自由现金流（FCF）如何计算？折现率选取有哪些常见方法？',
    qEn: 'How is Free Cash Flow (FCF) calculated in a DCF? What are the common approaches to selecting the discount rate?',
    framework: 'FCF = EBIT×(1-税率) + 折旧摊销 - 资本支出 - 营运资本变动。折现率通常用WACC（加权平均资本成本），其中股权成本用CAPM计算（Ke = Rf + β×ERP）；进一步讨论Beta的选取（可比公司去杠杆再重新加杠杆），以及终值计算方法（Gordon增长模型 vs. 退出倍数法）。',
    frameworkEn: 'FCF = EBIT×(1-tax rate) + D&A - CapEx - ΔWorking Capital. Discount rate is typically WACC; equity cost via CAPM (Ke = Rf + β×ERP). Discuss beta selection (unlevering comparable companies\' betas, then re-levering), and terminal value methods (Gordon growth vs. exit multiple).',
  },
  {
    id: 2,
    type: 'technical',
    roles: ['PE', 'IBD'],
    q: 'LBO模型中，私募股权如何实现回报？请解释IRR和MOIC的计算逻辑。',
    qEn: 'How does private equity generate returns in an LBO? Explain the calculation logic of IRR and MOIC.',
    framework: 'LBO回报来源：1）利润增长（EBITDA扩张）；2）估值倍数扩张；3）债务偿还（Debt Paydown）。MOIC = 退出权益价值 / 初始股权投入。IRR = 使净现值NPV=0的折现率，需逐年现金流计算（通常用Excel IRR函数）。补充：PE一般要求5年内达到2-3x MOIC / 20-25%+ IRR。',
    frameworkEn: 'LBO returns from: 1) EBITDA growth, 2) multiple expansion, 3) debt paydown. MOIC = Exit equity value / Initial equity invested. IRR = discount rate making NPV=0, solved iteratively from annual cash flows. Supplement: PE typically targets 2-3x MOIC / 20-25%+ IRR over 5 years.',
  },
  {
    id: 3,
    type: 'technical',
    roles: ['IBD', 'EquityResearch', 'AM'],
    q: '三种主流估值方法是什么？各自适用场景有何不同？',
    qEn: 'What are the three main valuation methodologies? How do their applicable scenarios differ?',
    framework: '1）DCF（内在价值法）：适合现金流稳定可预测的成熟企业，对假设敏感；2）可比公司分析（Comps）：用行业EV/EBITDA、P/E等倍数，快速、直观但依赖市场情绪；3）先例交易（Precedent Transactions）：M&A历史案例，通常含控制权溢价（20-30%）。三者结合"足球场图"（Football Field）综合判断。',
    frameworkEn: '1) DCF (intrinsic value): best for mature companies with predictable cash flows; highly sensitive to assumptions. 2) Comparable company analysis (Comps): uses sector EV/EBITDA, P/E multiples — quick but market-sentiment-dependent. 3) Precedent transactions: historical M&A deals, typically include a control premium (20-30%). Combine all three in a "football field" chart.',
  },
  {
    id: 4,
    type: 'technical',
    roles: ['EquityResearch', 'AM'],
    q: '你会如何分析一家公司的护城河（Moat）？请举例说明。',
    qEn: 'How would you analyze a company\'s economic moat? Give a concrete example.',
    framework: 'Morningstar的五类护城河：1）无形资产（品牌/专利）；2）转换成本（客户粘性）；3）网络效应；4）成本优势（规模/地理）；5）有效规模。分析框架：先判断ROE/ROIC是否持续高于行业均值（通常10年+），再用竞争动态解释为何竞争者难以侵蚀。举例如茅台（品牌+稀缺性）、腾讯微信（网络效应）、苹果（生态系统=转换成本）。',
    frameworkEn: 'Morningstar\'s five moat sources: 1) Intangible assets (brand/patents), 2) Switching costs, 3) Network effects, 4) Cost advantages (scale/geography), 5) Efficient scale. Framework: check if ROIC/ROE consistently exceeds industry average (10+ years), then explain why competitors can\'t erode it. Examples: Moutai (brand+scarcity), Tencent WeChat (network effects), Apple ecosystem (switching costs).',
  },
  {
    id: 5,
    type: 'technical',
    roles: ['Quant', 'Risk'],
    q: 'VaR（在险价值）的定义是什么？它有哪些局限性，如何弥补？',
    qEn: 'What is VaR (Value at Risk)? What are its limitations and how can they be addressed?',
    framework: 'VaR定义：在给定置信水平（如95%/99%）和持有期内，投资组合可能遭受的最大损失。计算方法：历史模拟法、方差-协方差法、蒙特卡洛模拟。局限：1）不捕捉尾部损失（"胖尾"问题）；2）正态分布假设失效；3）不具有次可加性（非相干风险度量）。补充：CVaR（条件在险价值）= 超过VaR部分的期望损失，比VaR更保守，是更优的尾部风险度量。',
    frameworkEn: 'VaR: max loss over a holding period at a given confidence level (95%/99%). Methods: historical simulation, variance-covariance, Monte Carlo. Limitations: 1) misses tail losses (fat-tail problem), 2) normal distribution assumption fails, 3) not subadditive (not a coherent risk measure). Supplement: CVaR (Expected Shortfall) = expected loss beyond VaR — more conservative and a superior tail risk measure.',
  },
  {
    id: 6,
    type: 'technical',
    roles: ['Quant'],
    q: 'P/B因子和动量因子在量化选股中如何使用？有哪些陷阱需要注意？',
    qEn: 'How are Price-to-Book and Momentum factors used in quantitative stock selection? What pitfalls should you watch for?',
    framework: 'P/B（价值因子）：低P/B历史上跑赢市场，但需控制行业暴露，避免Value Trap（盈利持续下滑的低PB股）。动量因子：12-1月价格动量在全球市场有效，但存在动量崩溃（Momentum Crash）风险（市场反转时大幅回撤）。陷阱：1）数据挖掘过拟合；2）交易成本侵蚀；3）容量约束；4）时段偏差（仅在牛市有效）。正确做法：组合多因子，控制行业/市值中性，严格样本外回测。',
    frameworkEn: 'P/B (value factor): historically outperforms, but control sector exposure and avoid value traps (low P/B stocks with deteriorating fundamentals). Momentum: 12-1 month price momentum works globally, but momentum crash risk exists (large drawdowns in market reversals). Pitfalls: 1) data mining / overfitting, 2) transaction costs, 3) capacity constraints, 4) regime-dependence (only works in certain markets). Best practice: multi-factor combination, industry/market-cap neutralization, rigorous out-of-sample testing.',
  },
  {
    id: 7,
    type: 'technical',
    roles: ['ST', 'Quant'],
    q: '解释期权的Delta、Gamma、Vega三个希腊值，以及做市商如何管理这些风险。',
    qEn: 'Explain the option Greeks Delta, Gamma, and Vega, and how market makers manage these risks.',
    framework: 'Delta：期权价格对标的价格1单位变动的敏感度（0-1之间对看涨期权）；Gamma：Delta本身对标的价格变动的敏感度（ATM期权最大）；Vega：期权价格对隐含波动率1%变动的敏感度。做市商管理：动态Delta对冲（持续买卖标的以维持Delta中性）；Gamma风险难完全对冲，ATM短Gamma仓位在波动放大时亏损；Vega通过期权组合对冲（不同行权价/到期日）。',
    frameworkEn: 'Delta: option price sensitivity to 1-unit move in underlying (0-1 for calls); Gamma: sensitivity of delta itself to underlying price (highest at ATM); Vega: sensitivity to 1% change in implied vol. Market maker management: continuous delta hedging (buy/sell underlying to stay delta-neutral); Gamma is hard to hedge fully — short gamma at ATM loses when volatility spikes; Vega managed via option spreads (different strikes/expiries).',
  },
  {
    id: 8,
    type: 'technical',
    roles: ['Risk', 'IBD'],
    q: '如何分析一家银行的资产负债表健康度？关键指标有哪些？',
    qEn: 'How do you assess the health of a bank\'s balance sheet? What are the key metrics?',
    framework: '关键指标：1）资本充足率（CET1 Ratio）：巴塞尔III要求≥4.5%，实际行业要求远高于此；2）不良贷款率（NPL Ratio）：越低越好；3）拨备覆盖率（>150%健康）；4）流动性覆盖率（LCR≥100%）；5）净稳定资金比率（NSFR）；6）NIM（净息差）：盈利能力指标。分析框架：从资产质量、流动性、资本充足性、盈利能力四个维度（CAMELS框架简化版）展开。',
    frameworkEn: 'Key metrics: 1) CET1 ratio (Basel III minimum 4.5%; industry expects much higher); 2) NPL ratio (lower is better); 3) Provision coverage (>150% is healthy); 4) Liquidity Coverage Ratio (LCR ≥100%); 5) NSFR; 6) Net Interest Margin (NIM). Framework: analyze across asset quality, liquidity, capital adequacy, and profitability — simplified CAMELS framework.',
  },
  // ── Behavioral ─────────────────────────────────────────────────────────────
  {
    id: 9,
    type: 'behavioral',
    roles: ['IBD', 'PE', 'AM', 'EquityResearch', 'ST', 'Quant', 'CorpFinance', 'Risk'],
    q: '请告诉我你为什么选择金融行业，以及为什么是这个具体方向？',
    qEn: 'Tell me why you chose finance, and specifically why this particular area?',
    framework: '结构：1）早期触发点（具体经历，不要说"小时候就对投资感兴趣"）→2）深化兴趣的过程（实习/课程/项目/自学）→3）行业认知（了解这个岗位的真实工作内容，能讲出具体场景）→4）与自身优势的匹配。关键：具体>泛泛，诚实>模板化，展现真实思考>背稿。',
    frameworkEn: 'Structure: 1) Specific trigger (concrete experience, not "always interested in investing since childhood") → 2) How your interest deepened (internship/course/project/self-study) → 3) Industry awareness (show you know what the job actually involves day-to-day) → 4) Fit with your strengths. Key: specific > vague, genuine > template, show real thinking > recited script.',
  },
  {
    id: 10,
    type: 'behavioral',
    roles: ['IBD', 'PE', 'AM', 'EquityResearch', 'ST', 'Quant', 'CorpFinance', 'Risk'],
    q: '描述一次你在团队中遇到冲突的经历，你是如何处理的？',
    qEn: 'Describe a time you experienced conflict in a team setting. How did you handle it?',
    framework: 'STAR框架：Situation（设定背景）→ Task（你的职责）→ Action（你具体采取了哪些步骤：先倾听对方视角/寻找共同目标/提出解决方案）→ Result（结果和反思）。注意：1）选真实且有实质性冲突的例子；2）不要推卸责任；3）重点在解决过程而非"谁对谁错"；4）结尾要有明确可量化的结果或学到的教训。',
    frameworkEn: 'STAR framework: Situation → Task (your role) → Action (steps: listen first / find common ground / propose solution) → Result (outcome and reflection). Notes: 1) Use a real example with genuine tension; 2) Don\'t deflect blame; 3) Focus on the resolution process, not who was right; 4) End with a measurable outcome or a specific lesson learned.',
  },
  {
    id: 11,
    type: 'behavioral',
    roles: ['IBD', 'PE', 'ST'],
    q: '你是如何在极高压力或截止日期紧迫的情况下管理自己的状态和工作的？',
    qEn: 'How do you manage yourself and your work under extreme pressure or tight deadlines?',
    framework: '两个维度：系统层面（优先级排序/任务拆分/提前沟通风险）+ 个人层面（心理调节机制/如何维持输出质量）。举一个具体案例：量化说明时间压力（如"36小时内完成"）和你的具体应对步骤，以及最终交付结果。金融行业面试官希望看到你能在压力下仍保持系统性思维，而不是仅仅"努力工作"。',
    frameworkEn: 'Two dimensions: systemic (prioritization / task decomposition / proactive risk communication) + personal (mental resilience / maintaining output quality). Give a specific example with quantified time pressure ("completed in 36 hours") and your concrete steps and the final outcome. Interviewers want to see systematic thinking under pressure — not just "I worked hard."',
  },
  {
    id: 12,
    type: 'behavioral',
    roles: ['AM', 'EquityResearch', 'PE'],
    q: '给我推荐一只股票，并解释你的投资逻辑。',
    qEn: 'Pitch me a stock. Explain your investment thesis.',
    framework: '结构化股票推荐（3-5分钟）：1）公司简介（一句话）；2）行业背景与竞争格局；3）投资核心逻辑（1-2个关键催化剂，不超过3点）；4）估值支撑（具体倍数+可比公司）；5）主要风险与对冲措施；6）目标价及时间框架。注意：面试官往往更看重逻辑严密性和风险意识，而非方向是否"正确"。避免选择过于显而易见的股票，尝试选一个有独特观点的标的。',
    frameworkEn: 'Structured stock pitch (3-5 min): 1) One-line company description; 2) Industry background and competitive landscape; 3) Core investment thesis (1-2 key catalysts, no more than 3 points); 4) Valuation support (specific multiples + comps); 5) Key risks and mitigants; 6) Target price and time horizon. Note: interviewers value logical rigor and risk awareness over being "right" on direction. Avoid too-obvious names — try to have a differentiated view.',
  },
  // ── Case Analysis ──────────────────────────────────────────────────────────
  {
    id: 13,
    type: 'case',
    roles: ['IBD', 'PE'],
    q: '你的客户是一家制造业公司，考虑以10亿美元收购一家竞争对手。请描述你如何为该交易进行财务分析。',
    qEn: 'Your client is a manufacturing company considering a $1B acquisition of a competitor. Walk me through how you would financially analyze this deal.',
    framework: '步骤：1）战略逻辑梳理（协同效应来源：收入协同/成本协同/财务协同）；2）目标公司独立估值（DCF+Comps+Precedents）；3）协同效应量化（保守/基准/乐观假设，通常折现50%）；4）并购模型搭建（收购价格→融资方式→EPS摊薄/增厚分析→信用指标影响）；5）付款方式分析（现金/换股/混合）；6）风险识别（整合风险/人才流失/反垄断）。面试重点：展示你理解M&A不只是"数字游戏"，而是有战略目的和执行风险的复杂决策。',
    frameworkEn: 'Steps: 1) Clarify strategic rationale (revenue/cost/financial synergies); 2) Standalone valuation of target (DCF+Comps+Precedents); 3) Quantify synergies (conservative/base/optimistic; typically haircut by 50%); 4) Build merger model (purchase price → financing → EPS accretion/dilution → credit impact); 5) Consideration mix analysis (cash/stock/hybrid); 6) Risk identification (integration risk, talent retention, antitrust). Key: show you understand M&A is not just numbers but a strategic decision with complex execution risks.',
  },
  {
    id: 14,
    type: 'case',
    roles: ['AM', 'EquityResearch'],
    q: '如果你是一个基金经理，市场突然出现大幅下跌（-15%），你会如何决策？',
    qEn: 'If you were a fund manager and the market suddenly dropped 15%, how would you make decisions?',
    framework: '框架：先区分三个问题——1）这是系统性下跌还是个股/行业事件？（判断原因：宏观/流动性/情绪）；2）基本面是否改变？（如果估值更吸引但基本面未变，可能是买入机会）；3）组合当前暴露是否匹配投资目标？然后决策树：检查持仓是否有流动性压力→是否触发止损阈值→与基金投资策略的约束（规模/风格/集中度限制）。最后强调：纪律重于情绪，系统化决策流程优于临时判断。',
    frameworkEn: 'Framework: first distinguish three questions — 1) Is this a systemic drop or stock/sector-specific? (assess cause: macro/liquidity/sentiment); 2) Has the fundamental thesis changed? (if valuation improved but fundamentals unchanged, potentially a buy opportunity); 3) Does current portfolio exposure match investment mandate? Then decision tree: check for liquidity pressure in holdings → whether stop-loss thresholds are hit → fund mandate constraints (size/style/concentration limits). Key: discipline over emotion, systematic process over ad hoc judgment.',
  },
  {
    id: 15,
    type: 'case',
    roles: ['Risk', 'Quant'],
    q: '如果你发现公司的某个交易台的VaR模型持续低估了实际亏损，你会如何排查问题？',
    qEn: 'If you discover that a trading desk\'s VaR model is consistently underestimating actual losses, how would you investigate?',
    framework: '排查路径：1）数据质量检查（历史数据是否包含极端市场状态？代理数据是否恰当？）；2）模型假设审视（正态分布假设？相关性矩阵是否过时？持有期假设？）；3）回测分析（P&L归因：模型捕捉到的风险因子 vs. 实际驱动亏损的因子）；4）尾部风险检验（极端情景压力测试）；5）与交易台沟通（是否有新增头寸/策略变化未纳入模型）。解决方案：更新模型、增加风险因子覆盖、引入CVaR/ES作为补充度量。',
    frameworkEn: 'Investigation path: 1) Data quality check (does historical data include stress periods? Are proxies appropriate?); 2) Model assumption review (normal distribution assumption? Stale correlation matrix? Holding period assumption?); 3) Back-testing (P&L attribution: which risk factors does the model capture vs. what actually drove losses?); 4) Tail risk analysis (extreme scenario stress testing); 5) Trading desk communication (new positions or strategy changes not in model?). Solution: update model, expand risk factor coverage, introduce CVaR/ES as complementary measure.',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCENT = '#0ea5e9'
const PURPLE = '#8b5cf6'

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '16px 18px',
}

function Tag({ label, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: color ? `${color}22` : 'rgba(255,255,255,0.06)',
      color: color || 'var(--text-muted)',
      border: `1px solid ${color ? `${color}44` : 'rgba(255,255,255,0.1)'}`,
    }}>
      {label}
    </span>
  )
}

// ── Sub-module 1: Job Library ──────────────────────────────────────────────────

function Section({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
          padding: 0, display: 'flex', alignItems: 'center', gap: 4, width: '100%', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
        {title}
      </button>
      {open && <div style={{ marginTop: 8, paddingLeft: 14 }}>{children}</div>}
    </div>
  )
}

function JobCard({ role, zh }) {
  const [expanded, setExpanded] = useState(false)
  const title = zh ? role.title : role.titleEn
  const tagline = zh ? role.tagline : role.taglineEn
  const desc = zh ? role.description : role.descriptionEn
  const skills = zh ? role.skills : role.skillsEn
  const certs = zh ? role.certs : role.certsEn
  const entry = zh ? role.entry : role.entryEn
  const career = zh ? role.career : role.careerEn
  const salary = zh ? role.salary : role.salaryEn
  const disclaimer = zh ? role.disclaimer : role.disclaimerEn
  const typical = zh ? role.typical : role.typicalEn

  return (
    <div
      style={{
        ...cardStyle,
        cursor: 'pointer',
        borderColor: expanded ? `${role.color}55` : 'rgba(255,255,255,0.08)',
        transition: 'border-color 0.2s',
      }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{role.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: role.color }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tagline}</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? '收起 ▲' : '展开 ▼'}
        </span>
      </div>

      {expanded && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 14 }}>
          {/* Description */}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>{desc}</p>

          {/* Core skills */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: role.color, fontWeight: 700, marginBottom: 6 }}>
              {zh ? '核心技能' : 'Core Skills'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {skills.map((s, i) => <Tag key={i} label={s} color={role.color} />)}
            </div>
          </div>

          <Section title={zh ? '推荐证书' : 'Recommended Certifications'}>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
              {certs.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </Section>

          <Section title={zh ? '入行要求' : 'Entry Requirements'}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{entry}</p>
          </Section>

          <Section title={zh ? '职业晋升路径' : 'Career Path'}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{career}</p>
          </Section>

          <Section title={zh ? '薪资参考范围' : 'Salary Reference Range'}>
            <p style={{ fontSize: 12, color: '#26a69a', lineHeight: 1.7, margin: 0 }}>{salary}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>{disclaimer}</p>
          </Section>

          <Section title={zh ? '日常工作一天' : 'A Typical Day'}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, fontFamily: 'monospace' }}>{typical}</p>
          </Section>
        </div>
      )}
    </div>
  )
}

function JobLibrary({ zh }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
        {zh
          ? '点击任意岗位卡片展开详细信息。薪资数据为市场估算区间，仅供参考。'
          : 'Click any role card to expand details. Salary data are market estimates for reference only.'}
      </div>
      {ROLES.map(role => <JobCard key={role.id} role={role} zh={zh} />)}
    </div>
  )
}

// ── Sub-module 2: Interview Questions ────────────────────────────────────────

const TYPE_LABELS_ZH = { technical: '技术面试', behavioral: '行为面试', case: '案例分析' }
const TYPE_LABELS_EN = { technical: 'Technical', behavioral: 'Behavioral', case: 'Case Analysis' }
const TYPE_COLORS = { technical: '#0ea5e9', behavioral: '#8b5cf6', case: '#26a69a' }

function QuestionCard({ q, zh }) {
  const [showFramework, setShowFramework] = useState(false)
  const typeLabel = zh ? TYPE_LABELS_ZH[q.type] : TYPE_LABELS_EN[q.type]

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Tags */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <Tag label={typeLabel} color={TYPE_COLORS[q.type]} />
        {q.roles.slice(0, 3).map(r => (
          <Tag key={r} label={r} />
        ))}
        {q.roles.length > 3 && <Tag label={`+${q.roles.length - 3}`} />}
      </div>

      {/* Question */}
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.6 }}>
        {zh ? q.q : q.qEn}
      </div>

      {/* Framework toggle */}
      <button
        onClick={() => setShowFramework(v => !v)}
        style={{
          alignSelf: 'flex-start',
          padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 600,
          background: showFramework ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.05)',
          color: showFramework ? ACCENT : 'var(--text-muted)',
          transition: 'all 0.15s',
        }}
      >
        {showFramework
          ? (zh ? '隐藏思路框架' : 'Hide Framework')
          : (zh ? '查看思路框架' : 'Show Thinking Framework')}
      </button>

      {showFramework && (
        <div style={{
          background: 'rgba(14,165,233,0.04)',
          border: '1px solid rgba(14,165,233,0.2)',
          borderRadius: 6, padding: '10px 12px',
          fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.75,
        }}>
          {(zh ? q.framework : q.frameworkEn).split('；').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 ? '；' : ''}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionBank({ zh }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = QUESTIONS.filter(q => {
    if (typeFilter !== 'all' && q.type !== typeFilter) return false
    if (roleFilter !== 'all' && !q.roles.includes(roleFilter)) return false
    return true
  })

  const filterBtnStyle = (active) => ({
    padding: '4px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: active ? 600 : 400,
    background: active ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' : 'rgba(255,255,255,0.05)',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
          {zh ? '类型：' : 'Type:'}
        </span>
        {[['all', zh ? '全部' : 'All'], ['technical', zh ? '技术' : 'Technical'], ['behavioral', zh ? '行为' : 'Behavioral'], ['case', zh ? '案例' : 'Case']].map(([key, label]) => (
          <button key={key} onClick={() => setTypeFilter(key)} style={filterBtnStyle(typeFilter === key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Role filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
          {zh ? '岗位：' : 'Role:'}
        </span>
        {['all', 'IBD', 'PE', 'EquityResearch', 'AM', 'ST', 'Quant', 'CorpFinance', 'Risk'].map(key => (
          <button key={key} onClick={() => setRoleFilter(key)} style={filterBtnStyle(roleFilter === key)}>
            {key === 'all' ? (zh ? '全部' : 'All') : key}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {zh ? `共 ${filtered.length} 题` : `${filtered.length} questions`}
      </div>

      {filtered.map(q => <QuestionCard key={q.id} q={q} zh={zh} />)}
    </div>
  )
}

// ── Sub-module 3: AI Mock Interview ───────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'IBD',           labelZh: '投资银行 (IBD)',              labelEn: 'Investment Banking (IBD)' },
  { value: 'EquityResearch',labelZh: '股票研究 (Equity Research)',   labelEn: 'Equity Research' },
  { value: 'ST',            labelZh: '销售与交易 (S&T)',             labelEn: 'Sales & Trading' },
  { value: 'AM',            labelZh: '资产管理 (AM)',                labelEn: 'Asset Management' },
  { value: 'PE',            labelZh: '私募股权 (PE)',                labelEn: 'Private Equity' },
  { value: 'Quant',         labelZh: '量化金融 (Quant)',             labelEn: 'Quantitative Finance' },
  { value: 'CorpFinance',   labelZh: '企业财务 (Corp Finance)',      labelEn: 'Corporate Finance' },
  { value: 'Risk',          labelZh: '风险管理与合规 (Risk)',         labelEn: 'Risk & Compliance' },
]

const TYPE_OPTIONS = [
  { value: 'technical',    labelZh: '技术面试',    labelEn: 'Technical' },
  { value: 'behavioral',   labelZh: '行为面试',    labelEn: 'Behavioral' },
  { value: 'comprehensive',labelZh: '综合面试',    labelEn: 'Comprehensive' },
]

function ChatBubble({ role: msgRole, content, streaming }) {
  const isUser = msgRole === 'user'

  // Split on [FEEDBACK_START] to render feedback block
  const parts = content.split('[FEEDBACK_START]')
  const preText = parts[0]
  const feedbackText = parts.length > 1 ? parts[1] : null

  const renderText = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 5 }} />
      const boldParts = line.split(/(\*\*[^*]+\*\*)/)
      return (
        <div key={i} style={{ lineHeight: 1.7, fontSize: 13 }}>
          {boldParts.map((p, j) =>
            /^\*\*[^*]+\*\*$/.test(p)
              ? <strong key={j} style={{ color: ACCENT }}>{p.slice(2, -2)}</strong>
              : p
          )}
        </div>
      )
    })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 8, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
        background: isUser ? 'rgba(139,92,246,0.2)' : 'rgba(14,165,233,0.2)',
        border: `1px solid ${isUser ? '#8b5cf6' : ACCENT}44`,
      }}>
        {isUser ? '👤' : '🎯'}
      </div>
      <div style={{
        maxWidth: '80%',
        background: isUser ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.07)',
        border: `1px solid ${isUser ? '#8b5cf688' : `${ACCENT}44`}`,
        borderRadius: 8, padding: '10px 14px',
        color: 'var(--text-primary)',
      }}>
        {renderText(preText)}
        {feedbackText && (
          <div style={{
            marginTop: 12,
            background: 'rgba(14,165,233,0.08)',
            border: `1px solid ${ACCENT}55`,
            borderRadius: 6, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, marginBottom: 6 }}>
              面试反馈
            </div>
            {renderText(feedbackText)}
          </div>
        )}
        {streaming && <span style={{ color: ACCENT, fontSize: 13 }}>▋</span>}
      </div>
    </div>
  )
}

function MockInterview({ zh, lang }) {
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState([]) // {role: 'user'|'assistant', content: string}
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const startInterview = useCallback(async () => {
    if (!selectedRole || !selectedType) return
    setStarted(true)
    setMessages([])
    setError(null)
    await sendToAI([], selectedRole, selectedType)
  }, [selectedRole, selectedType])

  const sendToAI = useCallback(async (history, role, type) => {
    setStreaming(true)
    setError(null)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/career/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: role || selectedRole,
          interview_type: type || selectedType,
          history,
          lang,
          device_id: 'browser',
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let aiText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.done) break
          if (data.error) throw new Error(data.error)
          if (data.text) {
            aiText += data.text
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: aiText }
              return next
            })
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || (zh ? 'AI连接失败，请重试' : 'AI connection failed. Please retry.'))
        setMessages(prev => prev.filter(m => m.content !== ''))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [selectedRole, selectedType, lang, zh])

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return
    const userMsg = { role: 'user', content: input.trim() }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    await sendToAI(newHistory, selectedRole, selectedType)
  }, [input, streaming, messages, selectedRole, selectedType, sendToAI])

  const handleReset = () => {
    abortRef.current?.abort()
    setStarted(false)
    setMessages([])
    setInput('')
    setError(null)
    setStreaming(false)
    setSelectedRole('')
    setSelectedType('')
  }

  // Setup screen
  if (!started) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>
            {zh ? '配置你的模拟面试' : 'Configure Your Mock Interview'}
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {zh ? '选择目标岗位' : 'Select Target Role'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedRole(opt.value)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: selectedRole === opt.value ? 600 : 400,
                    background: selectedRole === opt.value
                      ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)'
                      : 'rgba(255,255,255,0.06)',
                    color: selectedRole === opt.value ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {zh ? opt.labelZh : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {zh ? '选择面试类型' : 'Select Interview Type'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedType(opt.value)}
                  style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: selectedType === opt.value ? 600 : 400,
                    background: selectedType === opt.value
                      ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)'
                      : 'rgba(255,255,255,0.06)',
                    color: selectedType === opt.value ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {zh ? opt.labelZh : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startInterview}
            disabled={!selectedRole || !selectedType}
            style={{
              padding: '11px 0',
              background: selectedRole && selectedType
                ? 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)'
                : 'rgba(255,255,255,0.06)',
              color: selectedRole && selectedType ? '#fff' : 'var(--text-muted)',
              border: 'none', borderRadius: 6, cursor: selectedRole && selectedType ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 600,
              transition: 'opacity 0.15s',
            }}
          >
            {zh ? '开始模拟面试' : 'Start Mock Interview'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, textAlign: 'center' }}>
          {zh
            ? 'AI面试官将进行4-5轮问答后给出全面反馈。问答过程中请认真作答，就像真实面试一样。'
            : 'The AI interviewer will conduct 4-5 rounds of Q&A then provide comprehensive feedback. Answer seriously — treat it like a real interview.'}
        </div>
      </div>
    )
  }

  // Chat screen
  const roleLabel = ROLE_OPTIONS.find(o => o.value === selectedRole)?.[zh ? 'labelZh' : 'labelEn'] || selectedRole
  const typeLabel = TYPE_OPTIONS.find(o => o.value === selectedType)?.[zh ? 'labelZh' : 'labelEn'] || selectedType

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>{roleLabel}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>· {typeLabel}</span>
        </div>
        <button
          onClick={handleReset}
          style={{
            padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 11, color: 'var(--text-muted)',
          }}
        >
          {zh ? '重新开始' : 'Restart'}
        </button>
      </div>

      {/* Messages */}
      <div style={{
        ...cardStyle,
        minHeight: 320, maxHeight: 480, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
        padding: '16px',
      }}>
        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            role={msg.role}
            content={msg.content}
            streaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        {error && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5 }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!messages.some(m => m.content.includes('[FEEDBACK_START]')) && (
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={streaming}
            placeholder={zh ? '输入你的回答（Enter发送，Shift+Enter换行）' : 'Type your answer (Enter to send, Shift+Enter for newline)'}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 13,
              resize: 'none',
              minHeight: 72,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            style={{
              padding: '0 18px',
              background: !streaming && input.trim()
                ? 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)'
                : 'rgba(255,255,255,0.05)',
              color: !streaming && input.trim() ? '#fff' : 'var(--text-muted)',
              border: 'none', borderRadius: 6,
              cursor: !streaming && input.trim() ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}
          >
            {streaming ? '...' : (zh ? '发送' : 'Send')}
          </button>
        </div>
      )}

      {messages.some(m => m.content.includes('[FEEDBACK_START]')) && (
        <button
          onClick={handleReset}
          style={{
            padding: '10px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          {zh ? '开始新的模拟面试' : 'Start a New Mock Interview'}
        </button>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CareerGuidePage({ lang }) {
  useThemeStore((s) => s.theme)
  const zh = lang !== 'en'
  const [subTab, setSubTab] = useState('jobs')

  const TABS = [
    { key: 'jobs',      labelZh: '金融岗位库',    labelEn: 'Job Library' },
    { key: 'questions', labelZh: '面试题库',       labelEn: 'Question Bank' },
    { key: 'mock',      labelZh: 'AI 模拟面试',    labelEn: 'AI Mock Interview' },
  ]

  return (
    <div style={{ paddingTop: 16, paddingBottom: 40 }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          margin: 0, fontSize: 22, fontWeight: 700,
          background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {zh ? '金融求职指南' : 'Finance Career Guide'}
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {zh
            ? '8大金融岗位详解 · 精选面试题库 · AI模拟面试练习，助你在求职路上更有底气'
            : '8 finance roles in depth · curated interview question bank · AI mock interview practice'}
        </p>
      </div>

      {/* Sub-tab nav */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: 4, width: 'fit-content',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            style={{
              padding: '7px 16px', borderRadius: 5, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: subTab === tab.key ? 600 : 400,
              background: subTab === tab.key
                ? 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)'
                : 'transparent',
              color: subTab === tab.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {zh ? tab.labelZh : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'jobs'      && <JobLibrary zh={zh} />}
      {subTab === 'questions' && <QuestionBank zh={zh} />}
      {subTab === 'mock'      && <MockInterview zh={zh} lang={lang} />}

      {/* Footer disclaimer */}
      <div style={{
        marginTop: 32,
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 6,
        fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7,
      }}>
        {zh
          ? '免责声明：本页所有内容（含岗位描述、薪资范围、面试题目）均为原创编写，仅供学习参考，不代表任何机构的招聘标准或薪资承诺。AI模拟面试仅用于练习目的，与实际面试流程无关。不构成职业建议或投资建议。'
          : 'Disclaimer: All content on this page (role descriptions, salary ranges, interview questions) is original and for educational reference only. It does not represent any firm\'s hiring standards or compensation commitments. AI mock interviews are for practice purposes only and unrelated to actual interview processes. Not professional or investment advice.'}
      </div>
    </div>
  )
}
