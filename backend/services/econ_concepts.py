"""
Economics concepts for the essay-example library, each linked to the study-centre topics
(routers/study.py curricula) where it is taught. Definitions are our own short wording.

  id: (zh name, en name, zh definition, en definition, {board: [topic ids]})
Boards: alevel (Cambridge 9708), igcse (Cambridge 0455), ap_macro, ap_micro, ib.
"""

CONCEPTS = {
    "demand_pull_inflation": ("需求拉动型通胀", "Demand-pull inflation",
        "总需求增长快于经济的供给能力，推动整体物价上涨。", "Aggregate demand grows faster than the economy can supply, pushing the general price level up.",
        {"alevel": ["macro_1", "macro_2"], "igcse": ["igcse_6"], "ap_macro": ["ap_2", "ap_3"], "ib": ["ib_5"]}),
    "cost_push_inflation": ("成本推动型通胀", "Cost-push inflation",
        "工资、能源或原材料等生产成本上升，企业提价，导致物价上涨。", "Higher costs of production such as wages, energy or materials lead firms to raise prices.",
        {"alevel": ["macro_1", "macro_2"], "igcse": ["igcse_6"], "ap_macro": ["ap_3"], "ib": ["ib_5"]}),
    "monetary_policy": ("货币政策与利率", "Monetary policy and interest rates",
        "央行通过调整利率和货币供应来影响借贷、支出和通胀。", "The central bank changes interest rates and the money supply to influence borrowing, spending and inflation.",
        {"alevel": ["macro_3"], "igcse": ["igcse_7"], "ap_macro": ["ap_4", "ap_5"], "ib": ["ib_6"]}),
    "quantitative_easing": ("量化宽松与央行资产负债表", "Quantitative easing",
        "央行大规模购买债券等资产，压低长期利率、向经济注入资金。", "The central bank buys bonds and other assets on a large scale to lower long-term rates and add money to the economy.",
        {"alevel": ["macro_3"], "ap_macro": ["ap_4", "ap_5"], "ib": ["ib_6"]}),
    "fiscal_policy": ("财政政策", "Fiscal policy",
        "政府通过支出和税收的变化来影响总需求和经济活动。", "The government changes spending and taxation to influence aggregate demand and economic activity.",
        {"alevel": ["macro_3"], "igcse": ["igcse_7"], "ap_macro": ["ap_3", "ap_5"], "ib": ["ib_6"]}),
    "public_debt": ("政府债务与赤字", "Government debt and deficits",
        "政府支出大于税收时出现赤字，长期累积形成债务，可能推高利率或挤出私人投资。", "Spending above tax revenue creates a deficit; deficits add up to debt, which can raise interest rates or crowd out private investment.",
        {"alevel": ["macro_3"], "igcse": ["igcse_7"], "ap_macro": ["ap_5"], "ib": ["ib_6"]}),
    "unemployment": ("失业与就业", "Unemployment and the labour market",
        "愿意工作却找不到工作的人；可分为周期性、结构性、摩擦性失业等。", "People willing to work who cannot find a job; it can be cyclical, structural or frictional.",
        {"alevel": ["macro_1"], "igcse": ["igcse_6"], "ap_macro": ["ap_2"], "ap_micro": ["ap_micro_5"], "ib": ["ib_4", "ib_5"]}),
    "growth_cycle": ("经济增长与经济周期", "Economic growth and the business cycle",
        "实际 GDP 的长期增长与短期的扩张、衰退交替；衰退时产出低于潜在水平。", "Long-run growth in real GDP and the short-run swings between expansion and recession, when output falls below potential.",
        {"alevel": ["macro_1", "macro_2"], "igcse": ["igcse_6"], "ap_macro": ["ap_2", "ap_3"], "ib": ["ib_4", "ib_5"]}),
    "exchange_rates": ("汇率", "Exchange rates",
        "一种货币兑换另一种货币的价格；升值或贬值会影响出口、进口和通胀。", "The price of one currency in another; appreciation or depreciation changes exports, imports and inflation.",
        {"alevel": ["macro_4"], "igcse": ["igcse_8"], "ap_macro": ["ap_6"], "ib": ["ib_8"]}),
    "trade_protectionism": ("关税与贸易保护", "Tariffs and protectionism",
        "用关税、配额等限制进口以保护本国产业，代价是更高的价格和可能的报复。", "Tariffs, quotas and similar barriers that shield domestic producers, at the cost of higher prices and possible retaliation.",
        {"alevel": ["macro_4"], "igcse": ["igcse_8"], "ap_macro": ["ap_6"], "ib": ["ib_7"]}),
    "balance_of_payments": ("国际收支与经常账户", "Balance of payments",
        "一国与世界其他地区的交易记录，包括贸易差额和资本流动。", "A record of a country's transactions with the rest of the world, including the trade balance and capital flows.",
        {"alevel": ["macro_4"], "igcse": ["igcse_8"], "ap_macro": ["ap_6"], "ib": ["ib_8"]}),
    "supply_shock": ("供给冲击", "Supply shocks",
        "能源、粮食、供应链等突发变化使供给骤减或骤增，影响价格和产出。", "A sudden change in supply, such as energy, food or supply-chain disruption, that moves prices and output.",
        {"alevel": ["micro_2", "macro_2"], "igcse": ["igcse_3"], "ap_macro": ["ap_3"], "ap_micro": ["ap_micro_2"], "ib": ["ib_2", "ib_5"]}),
    "supply_demand": ("供求与价格", "Supply, demand and prices",
        "某个市场的需求或供给变化，如何改变均衡价格和数量。", "How a change in demand or supply in one market moves its equilibrium price and quantity.",
        {"alevel": ["micro_2"], "igcse": ["igcse_3"], "ap_micro": ["ap_micro_2"], "ib": ["ib_2"]}),
    "elasticity": ("弹性", "Elasticity",
        "需求量或供给量对价格、收入变化的敏感程度。", "How strongly quantity demanded or supplied responds to a change in price or income.",
        {"alevel": ["micro_2"], "igcse": ["igcse_3"], "ap_micro": ["ap_micro_2"], "ib": ["ib_2"]}),
    "market_power": ("垄断、寡头与竞争政策", "Market power and competition policy",
        "少数企业控制市场时可以抬高价格；政府用反垄断和监管来维护竞争。", "When a few firms control a market they can raise prices; governments use antitrust and regulation to protect competition.",
        {"alevel": ["micro_3", "micro_4"], "igcse": ["igcse_5"], "ap_micro": ["ap_micro_4"], "ib": ["ib_3"]}),
    "externalities": ("外部性与环境", "Externalities and the environment",
        "生产或消费给第三方带来的未被计价的成本或收益，例如污染和碳排放。", "Costs or benefits that fall on third parties without being priced, such as pollution and carbon emissions.",
        {"alevel": ["micro_3"], "igcse": ["igcse_4"], "ap_micro": ["ap_micro_6"], "ib": ["ib_3"]}),
    "govt_intervention": ("税收、补贴与价格管制", "Taxes, subsidies and price controls",
        "政府用间接税、补贴、最高或最低限价来改变市场结果。", "Indirect taxes, subsidies and maximum or minimum prices that governments use to change market outcomes.",
        {"alevel": ["micro_4"], "igcse": ["igcse_4"], "ap_micro": ["ap_micro_2", "ap_micro_6"], "ib": ["ib_3"]}),
    "information_failure": ("信息不对称与市场失灵", "Information failure",
        "交易一方掌握的信息比另一方多，导致市场配置失灵。", "One side of a deal knows more than the other, so the market allocates resources badly.",
        {"alevel": ["micro_3"], "ap_micro": ["ap_micro_6"], "ib": ["ib_3"]}),
    "wages_inequality": ("工资与收入分配", "Wages and income inequality",
        "劳动力市场如何决定工资，以及收入和财富在人群间的分配。", "How labour markets set wages, and how income and wealth are shared across people.",
        {"igcse": ["igcse_2"], "ap_micro": ["ap_micro_5"], "ib": ["ib_5"]}),
    "financial_markets": ("金融市场与银行", "Financial markets and banks",
        "银行、债券和股票市场如何为经济融资，以及资产价格波动的影响。", "How banks, bond and stock markets fund the economy, and what swings in asset prices do.",
        {"alevel": ["macro_3"], "ap_macro": ["ap_4"], "ib": ["ib_6"], "stocks": ["stocks_5"]}),
    "firms_costs": ("企业成本、利润与决策", "Firms' costs, profits and decisions",
        "企业如何根据成本、收入和竞争决定产量、价格和投资。", "How firms decide output, prices and investment from their costs, revenue and competition.",
        {"igcse": ["igcse_5"], "ap_micro": ["ap_micro_3"], "ib": ["ib_2"]}),
    "development": ("发展经济学", "Development economics",
        "低收入和新兴经济体如何实现增长、减贫和改善生活水平。", "How low-income and emerging economies grow, reduce poverty and raise living standards.",
        {"alevel": ["macro_4"], "igcse": ["igcse_8"], "ib": ["ib_9"]}),
}

BOARDS = ("alevel", "igcse", "ap_macro", "ap_micro", "ib")


def concept_view(cid: str, lang: str) -> dict:
    zh_name, en_name, zh_def, en_def, topics = CONCEPTS[cid]
    zh = lang == "zh"
    return {"id": cid, "name": zh_name if zh else en_name, "definition": zh_def if zh else en_def, "topics": topics}
