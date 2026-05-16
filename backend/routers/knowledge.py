"""
Daily knowledge card — /api/knowledge/today

Returns two cards per day:
  - economics: from ECONOMICS_DB (macroeconomics / microeconomics)
  - finance:   from FINANCE_DB   (valuation, technical, fundamentals, A-share rules)
Both are deterministic by date so every user sees the same items on the same day.
"""

from fastapi import APIRouter
import random
import datetime

router = APIRouter()

ECONOMICS_DB = [
    {
        "topic_zh": "CPI 通货膨胀",
        "topic_en": "Consumer Price Index",
        "category": "宏观经济",
        "content_zh": "CPI衡量一篮子消费品价格变化，是通货膨胀的主要指标。CPI过高央行会加息抑制通胀，CPI过低会降息刺激经济。持有优质股票是对抗长期通胀的方法之一。",
        "content_en": "CPI measures changes in consumer prices and is the key inflation indicator. High CPI leads to rate hikes. Equities can hedge against long-term inflation.",
        "key_formula": "CPI = (Current Period Price / Base Period Price) x 100",
        "example": "CPI rises to 5%, central bank may raise interest rates to cool the economy.",
        "difficulty": "2",
        "tags": ["宏观经济", "通胀"],
    },
    {
        "topic_zh": "GDP 与股市关系",
        "topic_en": "GDP and Stock Market",
        "category": "宏观经济",
        "content_zh": "GDP是衡量一国经济总量的指标。GDP增速加快往往带动企业盈利上升，利好股市。但股市是经济的先行指标，通常提前6到12个月反映经济变化。",
        "content_en": "GDP measures total economic output. Faster GDP growth boosts corporate earnings and stock markets. Stock markets typically lead the economy by 6-12 months.",
        "key_formula": "GDP = Consumption + Investment + Government Spending + Net Exports",
        "example": "GDP growth accelerates from 3% to 5%, stock market often rallies in advance.",
        "difficulty": "2",
        "tags": ["宏观经济", "经济周期"],
    },
    {
        "topic_zh": "利率与股市",
        "topic_en": "Interest Rates and Stocks",
        "category": "宏观经济",
        "content_zh": "利率是资金的价格。加息时债券收益率上升，股票估值承压；降息时资金涌入股市，估值扩张。成长股对利率最敏感。",
        "content_en": "When rates rise, bond yields become more attractive and stock valuations compress. Growth stocks are most sensitive to rate changes.",
        "key_formula": "Stock Value = Future Cash Flows / (1 + Discount Rate)^n",
        "example": "Fed raises rates by 1%, high-growth tech stocks often drop 20-30%.",
        "difficulty": "3",
        "tags": ["宏观经济", "货币政策"],
    },
    {
        "topic_zh": "经济周期四阶段",
        "topic_en": "Four Phases of Economic Cycle",
        "category": "宏观经济",
        "content_zh": "经济周期分为复苏、扩张、衰退、萧条四个阶段。复苏期买周期股，扩张期买成长股，衰退期转向防御股，萧条期持现金或债券。",
        "content_en": "The economic cycle has four phases: recovery, expansion, recession, depression. Cyclical stocks do well in recovery, defensive stocks in recession.",
        "key_formula": "Leading Indicators: PMI, yield curve / Lagging: unemployment rate",
        "example": "PMI above 50 = expansion. Consider buying industrials and materials stocks.",
        "difficulty": "3",
        "tags": ["宏观经济", "周期"],
    },
    {
        "topic_zh": "供给与需求",
        "topic_en": "Supply and Demand",
        "category": "微观经济",
        "content_zh": "价格由供给和需求共同决定。当需求增加或供给减少时，价格上涨；当需求减少或供给增加时，价格下降。这是理解大宗商品和行业景气度的基础。",
        "content_en": "Prices are determined by supply and demand. When demand rises or supply falls, prices increase. This framework explains commodity cycles and industry dynamics.",
        "key_formula": "Equilibrium: Quantity Demanded = Quantity Supplied",
        "example": "Lithium demand surges from EVs, supply cannot keep up, lithium price triples.",
        "difficulty": "1",
        "tags": ["微观经济", "基础"],
    },
    {
        "topic_zh": "机会成本",
        "topic_en": "Opportunity Cost",
        "category": "微观经济",
        "content_zh": "机会成本是做一个选择时放弃的最好替代方案的价值。把钱放在低收益资产中的机会成本是放弃了高收益机会。这是所有投资决策的核心概念。",
        "content_en": "Opportunity cost is the value of the next best alternative foregone. Holding cash has the opportunity cost of missing market returns.",
        "key_formula": "Opportunity Cost = Return of Best Alternative - Return of Chosen Option",
        "example": "Holding cash at 0% when stocks return 10% = 10% opportunity cost per year.",
        "difficulty": "1",
        "tags": ["微观经济", "决策"],
    },
    {
        "topic_zh": "规模经济",
        "topic_en": "Economies of Scale",
        "category": "微观经济",
        "content_zh": "规模经济是指随着产量增加，单位成本下降的现象。这是大企业的核心竞争优势之一。巴菲特特别喜欢具有规模经济护城河的企业。",
        "content_en": "Economies of scale mean unit costs fall as output increases. This is a key competitive moat. Buffett favors companies with scale advantages.",
        "key_formula": "Average Cost = Total Cost / Units Produced (decreases with scale)",
        "example": "Walmart's massive scale lets it negotiate lower prices from suppliers than small retailers.",
        "difficulty": "2",
        "tags": ["微观经济", "竞争优势"],
    },
    {
        "topic_zh": "美联储加息的影响",
        "topic_en": "Impact of Fed Rate Hikes",
        "category": "宏观经济",
        "content_zh": "美联储加息会提高全球美元资产收益率，导致资金从新兴市场撤离，人民币承压贬值，A股也会受到一定冲击。理解美联储政策是全球投资的必修课。",
        "content_en": "Fed rate hikes strengthen the dollar, pulling capital from emerging markets. This pressures currencies like RMB and can trigger A-share volatility.",
        "key_formula": "Dollar Index rises -> EM capital outflows -> Local currency depreciates",
        "example": "2022 Fed rate hike cycle: NASDAQ fell 33%, A-shares fell around 20%.",
        "difficulty": "3",
        "tags": ["宏观经济", "美联储"],
    },
]

FINANCE_DB = [
    {
        "topic_zh": "市盈率 P/E Ratio",
        "topic_en": "Price-to-Earnings Ratio",
        "category": "估值",
        "content_zh": "市盈率是股票价格除以每股收益，衡量投资者愿意为每1元利润支付多少钱。PE越低可能越便宜，但也要结合行业背景判断。成长行业PE通常高于传统行业。",
        "content_en": "P/E ratio equals stock price divided by EPS. It shows how much investors pay per dollar of earnings. Growth industries typically have higher P/E than mature industries.",
        "key_formula": "P/E = Stock Price / EPS",
        "example": "Stock price 100 yuan, EPS = 5 yuan, P/E = 20x. Needs 20 years to recoup at current earnings.",
        "difficulty": "2",
        "tags": ["估值", "基本面"],
    },
    {
        "topic_zh": "移动平均线 MA",
        "topic_en": "Moving Average",
        "category": "技术分析",
        "content_zh": "移动平均线是过去N天收盘价的平均值。MA5短期，MA20中期，MA60长期。金叉（短线上穿长线）是买入信号，死叉（短线下穿长线）是卖出信号。",
        "content_en": "MA smooths price data over N days. MA5 is short-term, MA60 is long-term. A golden cross (short MA crosses above long MA) is a bullish signal.",
        "key_formula": "MA(N) = Sum of N closing prices / N",
        "example": "MA5=10.2, MA20=9.8. MA5 above MA20 = golden cross = buy signal.",
        "difficulty": "2",
        "tags": ["技术分析", "趋势"],
    },
    {
        "topic_zh": "MACD 指标",
        "topic_en": "MACD Indicator",
        "category": "技术分析",
        "content_zh": "MACD由DIF、DEA和柱状图组成。DIF是快慢均线之差，DEA是DIF的均线。柱状图由红变绿是卖出信号，由绿变红是买入信号。",
        "content_en": "MACD consists of DIF (fast EMA minus slow EMA), DEA (signal line), and histogram. Histogram turning from positive to negative signals a sell.",
        "key_formula": "DIF = EMA12 - EMA26 / DEA = EMA9 of DIF / MACD Bar = DIF - DEA",
        "example": "DIF crosses above DEA from below = buy signal.",
        "difficulty": "3",
        "tags": ["技术分析", "动量"],
    },
    {
        "topic_zh": "RSI 相对强弱指数",
        "topic_en": "Relative Strength Index",
        "category": "技术分析",
        "content_zh": "RSI衡量价格涨跌的力度对比，范围0到100。高于70表示超买，低于30表示超卖。超买不代表马上下跌，强势股可以长期维持高RSI，需结合趋势判断。",
        "content_en": "RSI ranges from 0-100. Above 70 = overbought, below 30 = oversold. Strong uptrends can maintain high RSI for extended periods.",
        "key_formula": "RSI = 100 - (100 / (1 + RS)) where RS = Avg Gain / Avg Loss",
        "example": "RSI = 75 in a downtrend = strong sell signal. RSI = 75 in an uptrend = normal.",
        "difficulty": "3",
        "tags": ["技术分析", "震荡"],
    },
    {
        "topic_zh": "ROE 净资产收益率",
        "topic_en": "Return on Equity",
        "category": "基本面",
        "content_zh": "ROE衡量公司用股东资金赚钱的效率。巴菲特认为ROE持续高于15%的公司值得关注。ROE可以用杜邦分析拆解为净利率、资产周转率、财务杠杆三个因子。",
        "content_en": "ROE measures how efficiently a company generates profit from equity. Buffett targets companies with ROE consistently above 15%.",
        "key_formula": "ROE = Net Income / Shareholders Equity x 100%",
        "example": "Net income 1B, equity 5B, ROE = 20%. Company earns 20 cents per yuan of equity.",
        "difficulty": "2",
        "tags": ["基本面", "盈利能力"],
    },
    {
        "topic_zh": "涨跌停板制度",
        "topic_en": "Price Limit System",
        "category": "A股特色",
        "content_zh": "A股主板涨跌幅限制10%，科创板创业板20%，ST股5%。涨停时买盘堆积流动性极差，跌停时卖盘堆积无法出逃。这是A股有别于全球大多数市场的独特制度。",
        "content_en": "A-share main board has 10% daily price limits. STAR Market allows 20%. ST stocks are limited to 5%. This system is unique to Chinese equity markets.",
        "key_formula": "Limit Up = Previous Close x 1.10 / Limit Down = Previous Close x 0.90",
        "example": "Stock closed at 10 yuan, limit up today = 11 yuan, limit down = 9 yuan.",
        "difficulty": "1",
        "tags": ["A股", "交易规则"],
    },
    {
        "topic_zh": "复利效应",
        "topic_en": "Compound Interest",
        "category": "投资理念",
        "content_zh": "复利被爱因斯坦称为世界第八大奇迹。年化10%收益，10年变2.6倍，20年变6.7倍，30年变17.4倍。越早开始投资，复利效果越惊人，时间是普通投资者最大的优势。",
        "content_en": "Einstein called compound interest the eighth wonder of the world. At 10% annually, money grows 2.6x in 10 years and 6.7x in 20 years. Time is the ordinary investor's greatest advantage.",
        "key_formula": "FV = PV x (1 + r)^n",
        "example": "10000 yuan at 10% for 20 years = 67275 yuan. For 30 years = 174494 yuan.",
        "difficulty": "1",
        "tags": ["投资理念", "长期投资"],
    },
    {
        "topic_zh": "北向资金",
        "topic_en": "Northbound Capital",
        "category": "A股特色",
        "content_zh": "北向资金是通过沪深港通从香港流入A股的境外资金，被市场视为聪明钱。持续大幅净流入往往被解读为外资看好A股，是重要的市场情绪参考指标。",
        "content_en": "Northbound capital flows from Hong Kong into A-shares via Stock Connect. Large net inflows signal foreign investor confidence and are closely watched as a sentiment indicator.",
        "key_formula": "Net Inflow = Northbound Buy Volume - Northbound Sell Volume",
        "example": "10B yuan net inflow on a day = strong bullish signal from foreign institutions.",
        "difficulty": "2",
        "tags": ["A股", "资金流向"],
    },
    {
        "topic_zh": "市净率 P/B Ratio",
        "topic_en": "Price-to-Book Ratio",
        "category": "估值",
        "content_zh": "市净率是股价除以每股净资产，反映市场对公司账面价值的溢价程度。银行股通常用P/B估值，P/B小于1可能意味着破净，股价低于清算价值。",
        "content_en": "P/B compares market value to book value. P/B below 1 means the stock trades below its net asset value. Commonly used to value bank stocks.",
        "key_formula": "P/B = Stock Price / Book Value per Share",
        "example": "Stock at 8 yuan, book value 10 yuan, P/B = 0.8x. Trading below book value.",
        "difficulty": "2",
        "tags": ["估值", "银行股"],
    },
]


def _beijing_date() -> datetime.date:
    return (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).date()


@router.get("/today")
def knowledge_today():
    """Return two knowledge cards of the day (deterministic by date seed)."""
    today = _beijing_date()
    seed  = int(today.strftime("%Y%m%d"))

    econ_rng    = random.Random(seed)
    finance_rng = random.Random(seed + 1)

    return {
        "date":      today.isoformat(),
        "economics": econ_rng.choice(ECONOMICS_DB),
        "finance":   finance_rng.choice(FINANCE_DB),
    }
