/**
 * CareerGuidePage
 * Three sub-modules:
 *   1. Job Requirements Library — 8 finance roles with static content
 *   2. Interview Question Bank  — filterable static Q&A
 *   3. AI Mock Interview        — streaming DeepSeek conversation
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import useThemeStore from '../store/themeStore'
import { ROLES } from './careerData'

// ── Static data ───────────────────────────────────────────────────────────────


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
  {
    id: 16,
    type: 'technical',
    roles: ['IBD', 'PE', 'EquityResearch', 'AM'],
    q: 'WACC的各组成部分如何计算？哪些情境下WACC不适合用作折现率？',
    qEn: 'How is each component of WACC calculated? In what situations is WACC inappropriate as a discount rate?',
    framework: 'WACC = Wd×Kd×(1-t) + We×Ke。Kd=税前债务成本（用当前市场利率，不用历史成本）；Ke用CAPM计算（Ke = Rf + β×ERP，其中β从可比公司去杠杆后再重新加杠杆）；权重用市值而非账面价值。WACC不适用的情况：①目标公司资本结构与收购方差异极大（杠杆率大幅变化时WACC本身在变）；②公司处于财务困境（预期资本结构难以确定）；③多元化公司中不同业务的风险差异显著（应对每个分部用独立WACC）。替代方法：APV（调整后现值法）——将无杠杆基础NPV与融资税盾分开计算，更适用于高度杠杆或资本结构变化的场景（如LBO）。',
    frameworkEn: 'WACC = Wd×Kd×(1-t) + We×Ke. Kd = current market cost of debt (not historical); Ke via CAPM (Ke = Rf + β×ERP, with β unlevered from comps then re-levered); use market value weights, not book value. When WACC is inappropriate: ① target\'s capital structure differs significantly from acquirer (WACC itself shifts during a leveraged deal); ② company in financial distress (future capital structure unknowable); ③ conglomerate with divisions of very different risk profiles (use division-specific WACCs). Alternative: APV (Adjusted Present Value) — separates unlevered base NPV from financing tax shield; more suitable for highly leveraged or capital-structure-changing scenarios (e.g., LBOs).',
  },
  {
    id: 17,
    type: 'technical',
    roles: ['IBD', 'CorpFinance', 'Risk'],
    q: '商誉（Goodwill）是如何产生的？减值测试如何进行，分析师为何高度关注商誉减值公告？',
    qEn: 'How is goodwill created? How is impairment testing conducted, and why do analysts pay close attention to goodwill impairment announcements?',
    framework: '商誉 = 收购价格 − 被收购方可辨认净资产公允价值（IFRS/GAAP均适用）。产生原因：代表收购方为品牌、客户关系、协同效应等无法单独确认的无形价值所支付的溢价。减值测试（不摊销，每年至少一次）：以报告单元（Reporting Unit）的账面价值 vs. 公允价值对比——若账面价值 > 公允价值，直接确认差额为减值损失（IFRS 9采用单步法，ASC 350过去为两步法，现已简化）。分析师关注原因：①商誉减值通常意味着早期收购定价过高（溢价无法实现），是管理层战略判断失误的信号；②减值为非现金支出但直接冲击净利润（影响EPS）；③大额商誉的公司在估值时，应将商誉单独剔除分析（EV/EBITDA比P/E更能规避商誉减值噪音）。',
    frameworkEn: 'Goodwill = acquisition price − fair value of identifiable net assets (both IFRS and GAAP). Created as a premium for brand, customer relationships, and synergies that cannot be separately recognized. Impairment testing (no amortization, at least annually): compare reporting unit\'s carrying amount vs. fair value — if carrying > fair value, recognize the difference as impairment loss immediately (IFRS uses single-step; ASC 350 simplified from two-step). Why analysts pay attention: ① impairment signals original acquisition was overpriced (premium failed to materialize) — a strategic judgment red flag; ② non-cash charge that directly reduces net income (EPS impact); ③ companies with large goodwill balances should be analyzed with goodwill stripped out (EV/EBITDA is less distorted by goodwill impairment than P/E).',
  },
  {
    id: 18,
    type: 'technical',
    roles: ['AM', 'Risk', 'ST', 'EquityResearch'],
    q: '利率上升对股票、债券、房地产三类资产的影响机制是什么？不同行业的股票受影响程度有何差异？',
    qEn: 'What are the transmission mechanisms through which rising rates affect equities, bonds, and real estate? How does the impact differ across equity sectors?',
    framework: '债券：利率上升→债券价格下跌（反向关系），修正久期决定敏感度（ΔP/P ≈ −D×Δy），久期越长影响越大（30年期国债远敏于2年期）。股票：双重冲击——①折现率提高→DCF内在价值直接下降；②无风险利率上升→股票风险溢价（ERP）相对收窄，压制估值倍数。成长股（高PE、远期现金流占比高=高"隐含久期"）受影响大于价值股；金融股（银行NIM扩大）、资源股（大宗商品上涨预期）相对防御。房地产：房贷利率上升→购房需求下降；商业地产Capitalization Rate（Cap Rate）随利率上升→估值下降。REITs因高杠杆+现金流折现敏感性，通常随利率上升大幅下跌。综合：利率上升周期中超配顺序通常为：能源>金融>消费必需品>科技/成长。',
    frameworkEn: 'Bonds: rising rates → falling prices (inverse relationship); modified duration governs sensitivity (ΔP/P ≈ −D×Δy) — longer duration = greater impact (30-yr far more sensitive than 2-yr). Equities: dual channels — ① higher discount rate → direct reduction in DCF intrinsic value; ② higher risk-free rate → equity risk premium (ERP) narrows, compressing valuation multiples. Growth stocks (high P/E, cash flows far in the future = high "implied duration") hurt more than value; financials (bank NIM expansion) and energy (inflation pass-through) are relatively defensive. Real estate: higher mortgage rates → weaker demand; commercial cap rates rise → valuations fall; REITs (high leverage + long-duration cash flows) typically underperform sharply. General rotation in rate-rising cycles: Energy > Financials > Consumer Staples > Tech/Growth.',
  },
  {
    id: 19,
    type: 'technical',
    roles: ['EquityResearch', 'IBD', 'AM'],
    q: 'P/E估值有哪些根本局限性？什么情境下EV/EBITDA比P/E更适合？EV/EBITDA本身的局限又是什么？',
    qEn: 'What are the fundamental limitations of P/E valuation? When is EV/EBITDA more appropriate than P/E, and what are EV/EBITDA\'s own limitations?',
    framework: 'P/E局限性：①受资本结构影响（高杠杆公司利息支出压低净利，P/E失真）；②净利润可被盈余管理操纵（折旧政策/一次性项目/应计利润）；③亏损公司无法适用；④不同行业折旧政策差异大导致跨行业不可比。EV/EBITDA适用场景：①行业资本密集度差异大（折旧差异显著）；②跨国或跨税率比较（EBITDA排除税率差异）；③并购分析（收购方要支付整个EV包含债务）；④含高额债务公司（代表经营现金流生成能力）。EV/EBITDA自身局限：①EBITDA忽略资本支出（高CapEx行业如半导体/航空，EBITDA严重高估经营现金流）→改用EV/EBIT或EV/FCF；②不考虑营运资本变化；③含大量折旧的公司（摊销不需要现金支出），EBITDA可能混淆盈利质量。',
    frameworkEn: 'P/E limitations: ① capital structure-dependent (high debt → high interest expense → lower net income → distorted P/E); ② manipulable via earnings management (depreciation policy, one-time items, accruals); ③ inapplicable for loss-making companies; ④ cross-industry comparisons distorted by different depreciation policies. EV/EBITDA preferred when: ① capital intensity varies across comparables (differing D&A); ② cross-border or cross-tax-rate comparisons; ③ M&A analysis (acquirer assumes entire EV including debt); ④ highly levered companies (EBITDA better proxies operating cash generation). EV/EBITDA limitations: ① ignores capex — high-capex sectors (semiconductors/airlines) severely overstate cash generation → use EV/EBIT or EV/FCF instead; ② ignores working capital changes; ③ large amortization companies: EBITDA may mask earnings quality differences.',
  },
  {
    id: 20,
    type: 'technical',
    roles: ['Risk', 'AM', 'ST'],
    q: '什么是久期（Duration）和凸度（Convexity）？它们在固定收益组合管理和利率对冲中如何应用？',
    qEn: 'What are duration and convexity? How are they applied in fixed income portfolio management and interest rate hedging?',
    framework: '修正久期（Modified Duration）：债券价格对利率变化的一阶敏感度。近似公式：ΔP/P ≈ −D×Δy。久期越长=利率风险越大（30年期国债久期约18-20，2年期约1.9）。凸度（Convexity）：二阶修正，捕捉久期本身随利率变化的非线性关系：完整公式：ΔP/P ≈ −D×Δy + ½×C×(Δy)²。高凸度债券（含权债券/可赎回债的"负凸度"需注意）在利率下降时涨得更多、上升时跌得更少，对投资者更有利。应用：①利率对冲：匹配资产和负债的久期（资产负债管理ALM）；②凸度对冲：多头久期+卖空凸度（常见的凸度套利策略）；③关键利率久期（KRD）：比单一久期更精确地捕捉收益率曲线各期限的非平行移动。重要：久期中性策略能消除平行移动风险，但无法消除曲线形变（steepening/flattening）风险。',
    frameworkEn: 'Modified Duration: first-order sensitivity of bond price to rate changes. Approximation: ΔP/P ≈ −D×Δy. Longer duration = more rate risk (30-yr Treasury ≈ 18-20; 2-yr ≈ 1.9). Convexity: second-order correction, capturing the non-linearity of duration itself as rates change: full formula: ΔP/P ≈ −D×Δy + ½×C×(Δy)². High-convexity bonds rise more when rates fall and fall less when rates rise (favorable for investors); callable bonds exhibit "negative convexity" — be careful. Applications: ① rate hedging: match asset and liability duration (ALM); ② convexity hedging: long duration + short convexity (classic convexity arbitrage); ③ Key Rate Duration (KRD): more precise than single duration — captures non-parallel shifts at specific maturities. Important: duration-neutral strategy eliminates parallel shift risk but not curve reshaping risk (steepening/flattening).',
  },
  {
    id: 21,
    type: 'technical',
    roles: ['Quant', 'AM', 'EquityResearch'],
    q: '什么是有效市场假说（EMH）的三种形式？量化投资和基本面投资的逻辑分别对应哪种EMH假设？',
    qEn: 'What are the three forms of the Efficient Market Hypothesis (EMH)? Which form does quantitative investing vs. fundamental investing implicitly challenge?',
    framework: '弱式有效（Weak Form）：价格已反映所有历史价格信息，纯技术分析无法持续超额。半强式有效（Semi-strong Form）：价格已反映所有公开信息（财报/新闻/分析师报告），基本面分析也无法持续超额。强式有效（Strong Form）：价格反映包括内幕信息在内的所有信息，任何策略均无法超额。量化投资通常假设市场"整体有效但存在短期局部无效性"——试图挖掘统计意义上的系统性价格规律（挑战弱式），部分量化也挑战半强式（NLP解析公告情绪）。基本面投资假设市场对公司长期价值存在系统性误判（挑战半强式）——需要更深度的定性判断（护城河/管理层）才能获得非共识信息优势。重要补充：行为金融学为市场无效性提供了理论基础（过度反应/惯性/锚定效应），但同时也提醒Alpha难以持续——当Alpha被发现并广泛交易时，它会因被套利而消失。',
    frameworkEn: 'Weak Form: prices reflect all historical price data — pure technical analysis cannot consistently outperform. Semi-strong Form: prices reflect all public information (earnings, news, analyst reports) — fundamental analysis also cannot consistently outperform. Strong Form: prices reflect all information including insider knowledge — no strategy generates alpha. Quantitative investing assumes markets are "broadly efficient with local short-term inefficiencies" — seeks statistically significant systematic patterns (challenges weak form); some quant also challenges semi-strong (NLP on filings/sentiment). Fundamental investing assumes systematic mispricing of long-term value (challenges semi-strong) — requires deeper qualitative judgment (moats/management) to develop non-consensus informational edge. Key addendum: behavioral finance provides the theoretical basis for market inefficiency (overreaction/momentum/anchoring), but also warns that alpha is fleeting — when discovered and widely traded, it gets arbitraged away.',
  },
  {
    id: 22,
    type: 'technical',
    roles: ['Risk', 'AM', 'ST', 'EquityResearch'],
    q: '收益率曲线倒挂（Inverted Yield Curve）意味着什么？对银行盈利能力有何具体影响？',
    qEn: 'What does an inverted yield curve signal? What is its specific impact on bank profitability?',
    framework: '倒挂定义：短期利率（2年期国债）> 长期利率（10年期国债），即"2s10s利差"为负。经济含义：市场预期未来经济将放缓，中央银行将被迫降息，因此长端利率提前下行。历史意义：美国1980年以来每次倒挂后均出现经济衰退（通常有6-24个月滞后），是最受关注的宏观领先指标之一。对银行盈利的具体影响：银行商业模式本质是"借短贷长"——吸收短期存款（低息）、发放长期贷款（高息），赚取净息差（NIM）。曲线倒挂时：①NIM被压缩甚至为负；②银行倾向于收紧信贷标准（贷款利润率下降→减少风险放贷）；③信贷收缩进一步加剧经济衰退压力（自我强化）。分析框架：关注NIM趋势+信贷增速+拨备覆盖率，三者结合判断银行股估值是否已充分反映衰退预期。',
    frameworkEn: 'Inverted curve: short-term rates (2-yr Treasury) > long-term rates (10-yr Treasury) — the "2s10s spread" is negative. Economic signal: markets expect growth to slow and central banks will eventually cut, pulling long-end yields lower in advance. Historical significance: every US recession since 1980 was preceded by inversion (typically 6-24 month lead time) — one of the most watched macro leading indicators. Specific bank profitability impact: banks are inherently "borrow short, lend long" — taking in short-term deposits (low rate) to fund long-term loans (high rate), earning Net Interest Margin (NIM). During inversion: ① NIM compressed or negative; ② banks tighten lending standards (falling loan margins → less risk-taking); ③ credit contraction amplifies economic slowdown (self-reinforcing). Analytical framework: track NIM trend + credit growth + provision coverage ratio together — this combination determines whether bank valuations already reflect recession expectations.',
  },
  {
    id: 23,
    type: 'technical',
    roles: ['IBD', 'PE', 'EquityResearch'],
    q: 'DCF中终值（Terminal Value）通常占整体估值的60-80%，这有什么隐患？如何正确构建敏感性分析？',
    qEn: 'Terminal Value typically represents 60-80% of total DCF value. What are the risks, and how should sensitivity analysis be properly constructed?',
    framework: '隐患核心：终值由两个高度假设性参数决定——①永续增长率g（通常设2-3%，但不能超过长期名义GDP增速，否则公司将最终超过整个经济体）；②退出倍数（EV/EBITDA）。这两个参数的微小变化可导致终值剧烈波动，使整个估值结论可以"任意调整"——即"垃圾进垃圾出"（GIGO）风险。敏感性分析的正确做法：①双重终值验证：Gordon增长模型 vs. 退出倍数法两种方式交叉验证，若结果差距大于30%则需重新审视假设；②构建二维敏感性矩阵（Sensitivity Table）：以WACC（行，通常±1%区间，步长0.5%）× 永续增长率g（列，通常±0.5%区间）制作；③同时检验终值比例——若终值占比 > 80%，说明显性预测期（DCF的前5-7年）的价值创建过弱，模型依赖性过高；④结合可比公司分析（Comps）和先例交易做"足球场图"（Football Field）交叉验证，防止DCF成为唯一锚点。',
    frameworkEn: 'Core risk: terminal value is driven by two highly assumptive parameters — ① perpetuity growth rate g (typically 2-3%, must not exceed long-run nominal GDP growth or the company eventually exceeds the entire economy); ② exit multiple (EV/EBITDA). Small changes to these can swing terminal value dramatically, making the overall valuation malleable — the classic "garbage in, garbage out" (GIGO) risk. Proper sensitivity analysis: ① dual terminal value validation: cross-check Gordon Growth Model vs. Exit Multiple Method — if results diverge >30%, revisit assumptions; ② two-dimensional sensitivity matrix: WACC (rows, ±1% range, 0.5% steps) × perpetuity growth g (columns, ±0.5% range); ③ check the terminal value proportion — if >80%, the explicit forecast period (years 1-7) generates too little value, indicating over-reliance on unprovable long-run assumptions; ④ combine with Comps and precedent transactions in a "Football Field" chart — prevents DCF from becoming the sole valuation anchor.',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCENT = '#0ea5e9'
const PURPLE = '#8b5cf6'

const cardStyle = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
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
      background: color ? `${color}22` : 'var(--bg-hover)',
      color: color || 'var(--text-muted)',
      border: `1px solid ${color ? `${color}44` : 'var(--border-primary)'}`,
    }}>
      {label}
    </span>
  )
}

// ── Sub-module 1: Job Library ──────────────────────────────────────────────────

function Section({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 8, marginTop: 8 }}>
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
  const coreScenario = zh ? (role.coreScenario || '') : (role.coreScenarioEn || '')
  const differentiators = zh ? (role.differentiators || []) : (role.differentiatorsEn || [])
  const typicalDay = zh ? (role.typicalDay || null) : (role.typicalDayEn || null)

  return (
    <div
      style={{
        ...cardStyle,
        cursor: 'pointer',
        borderColor: expanded ? `${role.color}55` : 'var(--border-primary)',
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

          {/* Core Scenario */}
          {coreScenario && (
            <Section title={zh ? '典型工作场景' : 'Typical Work Scenario'}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>{coreScenario}</p>
            </Section>
          )}

          {/* Core skills */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: role.color, fontWeight: 700, marginBottom: 6 }}>
              {zh ? '核心技能工具' : 'Core Skills & Tools'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {skills.map((s, i) => <Tag key={i} label={s} color={role.color} />)}
            </div>
          </div>

          {/* Differentiators */}
          {differentiators.length > 0 && (
            <Section title={zh ? '与相近岗位的区别' : 'How This Role Differs'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {differentiators.map((d, i) => (
                  <div key={i} style={{
                    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
                    paddingLeft: 10, borderLeft: `2px solid ${role.color}55`,
                  }}>
                    {d}
                  </div>
                ))}
              </div>
            </Section>
          )}

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

          <Section title={zh ? '典型一天工作流' : 'A Typical Day'}>
            {typicalDay && Array.isArray(typicalDay) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {typicalDay.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'monospace', padding: '2px 0' }}>
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, fontFamily: 'monospace' }}>
                {zh ? (role.typical || '') : (role.typicalEn || '')}
              </p>
            )}
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
          background: showFramework ? 'rgba(14,165,233,0.15)' : 'var(--bg-tertiary)',
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
    background: active ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' : 'var(--bg-tertiary)',
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
                      : 'var(--bg-hover)',
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
                      : 'var(--bg-hover)',
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
                : 'var(--bg-hover)',
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
            padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border-primary)',
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', border: '1px solid var(--border-primary)', borderRadius: 5 }}>
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
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
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
                : 'var(--bg-tertiary)',
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
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 24, paddingBottom: 48 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {zh ? '金融求职指南' : 'Finance Career Guide'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {zh
              ? '8大金融岗位深度解析 · 精选面试题库 · AI模拟面试练习'
              : '8 finance roles in depth · curated question bank · AI mock interview practice'}
          </p>
          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { icon: '💼', label: zh ? '8 大岗位' : '8 Roles' },
              { icon: '📝', label: zh ? '精选题库' : 'Question Bank' },
              { icon: '🤖', label: zh ? 'AI 模拟面试' : 'AI Mock Interview' },
              { icon: '🌐', label: zh ? '中英双语' : 'Bilingual' },
            ].map(chip => (
              <span key={chip.label} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, padding: '3px 9px', borderRadius: 20,
                background: 'rgba(14,165,233,0.08)',
                border: '1px solid rgba(14,165,233,0.18)',
                color: 'var(--text-secondary)',
              }}>
                <span>{chip.icon}</span>{chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: 1, marginBottom: 18,
        background: 'linear-gradient(90deg, rgba(14,165,233,0.4) 0%, rgba(139,92,246,0.3) 50%, transparent 100%)',
      }} />

      {/* Sub-tab nav */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
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
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-primary)',
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
