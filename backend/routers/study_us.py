"""US-stock lessons, prepended to the 'stocks' curriculum (zh + en; ja/ko/fr fall back to en)."""


def _s(heading, heading_en, body, body_en, terms, terms_en, real, real_en, tip, tip_en):
    return {
        "heading": heading, "heading_en": heading_en,
        "body": body, "body_en": body_en,
        "key_terms": terms, "key_terms_en": terms_en,
        "real_world": real, "real_world_en": real_en,
        "exam_tip": tip, "exam_tip_en": tip_en,
    }


US_PAPER = {
    "id": "stocks_us",
    "title": "美股专题 / US Stocks",
    "title_en": "US Stocks",
    "topics": [
        {
            "id": "us_1",
            "title": "美股市场基础 / How the US Market Works",
            "title_en": "How the US Market Works",
            "estimated_time": "15 min",
            "sections": [
                _s(
                    "交易所、代码与交易时间", "Exchanges, Tickers and Trading Hours",
                    "美股主要在纽约证券交易所（NYSE）和纳斯达克（Nasdaq）交易。股票用1到5个字母的代码表示，例如苹果是 AAPL，英伟达是 NVDA。常规交易时间是美东时间周一至周五 9:30–16:00；此外还有盘前（约 4:00–9:30）和盘后（16:00–20:00）交易，这两段成交量小、价差大，价格波动更剧烈。美股遇到节假日休市，感恩节后的次日等少数日子提前在 13:00 收盘。",
                    "US stocks trade mainly on the New York Stock Exchange (NYSE) and Nasdaq. Each company has a ticker of one to five letters, such as AAPL for Apple or NVDA for Nvidia. Regular trading runs 9:30–16:00 Eastern Time, Monday to Friday. There is also pre-market (about 4:00–9:30) and after-hours (16:00–20:00) trading, where volume is thin, bid-ask spreads are wide and prices can jump. The market closes on holidays, and a few days such as the day after Thanksgiving close early at 13:00.",
                    ["NYSE", "纳斯达克", "股票代码", "盘前交易", "盘后交易"],
                    ["NYSE", "Nasdaq", "ticker", "pre-market", "after-hours"],
                    "财报通常在盘后发布，所以股价常常在盘后就大幅跳动，第二天开盘再继续调整。",
                    "Earnings are usually released after the close, so a stock often moves sharply after-hours and then keeps adjusting at the next open.",
                    "区分“常规时段”和“延长时段”：延长时段流动性差，限价单比市价单更安全。",
                    "Separate regular hours from extended hours. Liquidity is poor outside regular hours, so limit orders are safer than market orders.",
                ),
                _s(
                    "与A股规则的差异", "Key Differences from A-Shares",
                    "美股没有每日涨跌停限制，一只股票一天可以大涨或大跌 20% 以上；但整个市场有熔断机制，标普 500 单日下跌 7%、13% 时暂停交易，下跌 20% 则当天休市。美股目前实行 T+1 交收（2024 年 5 月起），买入后可以当天卖出，没有 A股“当天买次日才能卖”的限制。可以买零股（部分券商支持），也可以做空。颜色习惯与A股相反：美股通常绿涨红跌。",
                    "US stocks have no daily price limits, so a single stock can rise or fall more than 20% in a day. The whole market does have circuit breakers: trading pauses when the S&P 500 falls 7% and 13% in a day, and halts for the day at 20%. Settlement is T+1 (since May 2024), and you can sell on the day you buy, unlike the A-share rule that shares bought today can only be sold tomorrow. Many brokers allow fractional shares, and short selling is possible. The colour convention is the reverse of A-shares: green usually means up and red means down.",
                    ["涨跌停", "熔断", "T+1", "零股", "红涨绿跌 / 绿涨红跌"],
                    ["price limit", "circuit breaker", "T+1", "fractional share", "green-up / red-up"],
                    "2020 年 3 月，美股在十天内四次触发熔断，说明极端行情下制度会直接介入。",
                    "In March 2020 US markets triggered circuit breakers four times in ten days, showing how the rules step in during extreme moves.",
                    "比较两个市场时，从涨跌幅限制、交收周期、做空机制和交易时间四个维度回答。",
                    "When comparing markets, answer along four dimensions: price limits, settlement cycle, short selling and trading hours.",
                ),
            ],
        },
        {
            "id": "us_2",
            "title": "指数与ETF / Indices and ETFs",
            "title_en": "Indices and ETFs",
            "estimated_time": "15 min",
            "sections": [
                _s(
                    "四大指数怎么读", "Reading the Four Major Indices",
                    "标普 500 包含美国 500 家大型公司，按市值加权，是最常用的“美股大盘”指标。纳斯达克综合指数偏重科技股。道琼斯工业平均指数只有 30 只股票，按股价加权，历史最悠久但代表性较弱。罗素 2000 代表小型公司，对经济和利率更敏感。看指数时要同时看涨跌幅和上涨家数：如果指数上涨但下跌的股票更多，说明上涨集中在少数大公司。",
                    "The S&P 500 holds 500 large US companies, weighted by market value, and is the most common gauge of the US market. The Nasdaq Composite leans toward technology. The Dow Jones Industrial Average has only 30 stocks, weighted by share price; it is the oldest but least representative. The Russell 2000 tracks small companies and is more sensitive to the economy and interest rates. Look at both the index move and breadth: if the index is up but more stocks are falling, the gain is concentrated in a few large companies.",
                    ["标普500", "纳斯达克", "道琼斯", "罗素2000", "市值加权", "市场宽度"],
                    ["S&P 500", "Nasdaq", "Dow Jones", "Russell 2000", "market-cap weighted", "market breadth"],
                    "近年来苹果、微软、英伟达等“七巨头”占标普 500 的权重很高，它们的涨跌会明显拉动整个指数。",
                    "In recent years the “Magnificent 7” (Apple, Microsoft, Nvidia and others) carry a large weight in the S&P 500, so their moves pull the whole index.",
                    "能说明市值加权和价格加权的区别，并各举一个指数例子。",
                    "Be able to explain market-cap weighting versus price weighting and give one index example of each.",
                ),
                _s(
                    "ETF：一只基金买下一篮子股票", "ETFs: A Basket of Stocks in One Trade",
                    "ETF（交易所交易基金）像股票一样在交易所买卖，但背后持有一篮子资产。SPY 和 VOO 跟踪标普 500，QQQ 跟踪纳斯达克 100，XLK、XLF 等板块 ETF 分别对应科技、金融等行业。ETF 的优点是分散风险、费用低（管理费通常每年零点几个百分点）、买卖方便。对没有时间研究个股的学生，定期定额买宽基指数 ETF 是常见的入门方式。",
                    "An ETF (exchange-traded fund) trades on an exchange like a stock but holds a basket of assets. SPY and VOO track the S&P 500, QQQ tracks the Nasdaq-100, and sector ETFs such as XLK and XLF cover technology and financials. ETFs offer diversification, low fees (the annual expense ratio is often a fraction of a percent) and easy trading. For students with no time to research individual stocks, buying a broad index ETF regularly is a common starting point.",
                    ["ETF", "管理费率", "宽基指数", "板块ETF", "定期定额"],
                    ["ETF", "expense ratio", "broad index", "sector ETF", "dollar-cost averaging"],
                    "本站“行业板块”里的 11 个方块，就是 11 只板块 ETF（XLK、XLF、XLE 等）的当日涨跌。",
                    "The 11 sector tiles on this site are the daily moves of 11 sector ETFs (XLK, XLF, XLE and so on).",
                    "ETF 不保证盈利：它只是分散了个股风险，市场整体下跌时仍会下跌。",
                    "An ETF does not guarantee a profit: it removes single-stock risk, but it still falls when the whole market falls.",
                ),
            ],
        },
        {
            "id": "us_3",
            "title": "财报季与估值 / Earnings Season and Valuation",
            "title_en": "Earnings Season and Valuation",
            "estimated_time": "15 min",
            "sections": [
                _s(
                    "财报季怎么看", "How to Read Earnings Season",
                    "美国上市公司每季度公布一次财报（10-Q），年底公布年报（10-K）。大多数公司集中在 1、4、7、10 月之后的几周内发布，这段时间叫财报季。市场最关注：每股收益（EPS）和营收是否超过分析师预期，以及公司对下一季度的指引（guidance）。股价的反应取决于“相对预期”而不是“绝对好坏”：业绩增长但低于预期，股价也可能下跌。",
                    "US-listed companies report every quarter (Form 10-Q) and once a year (Form 10-K). Most report in the weeks after January, April, July and October, which is called earnings season. The market focuses on whether earnings per share (EPS) and revenue beat analyst expectations, and on the company's guidance for the next quarter. The share price reacts to results relative to expectations, not to whether they are good in absolute terms: profits can grow and the stock can still fall if they miss expectations.",
                    ["财报", "EPS", "分析师预期", "业绩指引", "10-K / 10-Q"],
                    ["earnings report", "EPS", "analyst consensus", "guidance", "10-K / 10-Q"],
                    "一家公司利润增长 20%，但市场预期是 30%，财报发布后股价仍可能大跌。",
                    "A company can grow profit by 20% and still drop sharply if the market expected 30%.",
                    "解释股价反应时，用“预期差”：实际结果与市场预期的差距，而不是结果本身。",
                    "When explaining a price reaction, use the expectations gap: the difference between the result and what the market had priced in.",
                ),
                _s(
                    "市盈率与市值", "P/E Ratio and Market Cap",
                    "市值 = 股价 × 总股本，衡量公司在市场上值多少钱。市盈率（P/E）= 股价 ÷ 每股收益，表示按当前盈利水平，多少年能“回本”。高市盈率通常意味着市场预期公司未来增长快（如科技股），低市盈率常见于增长慢的成熟行业。市盈率只能在相似公司之间比较，并且要区分用过去 12 个月盈利（TTM）还是对未来的预测（Forward P/E）。",
                    "Market cap = share price × shares outstanding, and shows what the market thinks the company is worth. The price-to-earnings ratio (P/E) = share price ÷ earnings per share, roughly how many years of current earnings the price represents. A high P/E usually means the market expects fast growth (typical of tech), while a low P/E is common in slow, mature industries. P/E is only useful when comparing similar companies, and you should check whether it uses trailing twelve-month earnings (TTM) or forecasts (forward P/E).",
                    ["市值", "市盈率", "TTM", "远期市盈率", "每股收益"],
                    ["market cap", "P/E ratio", "TTM", "forward P/E", "earnings per share"],
                    "在本站个股详情页可以直接看到市盈率和总市值，可以拿苹果和微软对比。",
                    "The stock detail page on this site shows P/E and market cap, so you can compare Apple and Microsoft side by side.",
                    "不要用市盈率比较不同行业，也不要把高市盈率直接等同于“贵”。",
                    "Do not compare P/E across different industries, and do not treat a high P/E as automatically expensive.",
                ),
            ],
        },
        {
            "id": "us_4",
            "title": "做空、杠杆与风险 / Short Selling, Leverage and Risk",
            "title_en": "Short Selling, Leverage and Risk",
            "estimated_time": "15 min",
            "sections": [
                _s(
                    "什么是做空", "What is Short Selling?",
                    "做空是先向券商借入股票卖出，等价格下跌后再买回归还，赚取差价。如果价格上涨，就要用更高价格买回，亏损。做多的最大亏损是本金（股价归零），而做空的理论亏损没有上限，因为股价可以无限上涨。借股票还要付利息，被借出的股票太少时，做空者会被迫补仓买回，引发“逼空”（short squeeze）。",
                    "Short selling means borrowing shares from a broker and selling them, then buying them back later at a lower price and returning them, keeping the difference. If the price rises you must buy back at a higher price and lose money. A long position can lose at most your investment (the price falls to zero), but a short position has no theoretical limit on losses because a price can keep rising. You also pay interest to borrow shares, and when many shorts are forced to buy back at once it can cause a short squeeze.",
                    ["做空", "借券", "补仓", "逼空", "保证金"],
                    ["short selling", "borrowing shares", "covering", "short squeeze", "margin"],
                    "2021 年 1 月，游戏驿站（GME）被散户集体买入，股价在两周内上涨十几倍，大量做空机构被迫高价补仓，亏损惨重。",
                    "In January 2021, retail traders bought GameStop (GME) in large numbers and the price rose many times over within two weeks, forcing short sellers to cover at high prices and take heavy losses.",
                    "回答“为什么做空风险更大”：亏损无上限、要付借券利息、可能被逼空。",
                    "For “why is shorting riskier”: losses are unlimited, borrowing costs interest, and a squeeze can force you out.",
                ),
                _s(
                    "杠杆与学生投资者的底线", "Leverage and a Student's Ground Rules",
                    "杠杆（保证金）让你用借来的钱放大仓位：赚得多，亏得也多，亏损超过一定比例券商会强制平仓。期权、杠杆 ETF 同样放大波动，不适合新手直接使用。比较稳妥的原则：只用不影响生活的闲钱；先在模拟盘练习至少 1–3 个月；分散到不同行业；提前设定止损；不要因为社交媒体上的热门消息追高。本站的内容仅供学习，不构成投资建议。",
                    "Leverage (margin) lets you take a larger position with borrowed money: gains are larger, but so are losses, and a broker will force-sell your position if losses pass a threshold. Options and leveraged ETFs also amplify swings and are not suitable for beginners. Sensible ground rules: use only money you can afford to lose, practise on paper trading for at least 1–3 months, spread across industries, set a stop-loss in advance, and do not chase hot tips from social media. Everything on this site is for learning and is not investment advice.",
                    ["杠杆", "保证金", "强制平仓", "止损", "模拟盘"],
                    ["leverage", "margin", "forced liquidation", "stop-loss", "paper trading"],
                    "本站模拟盘默认美股，初始虚拟资金让你先体验买卖、盈亏和手续费，而不承担真实风险。",
                    "The paper-trading tab defaults to US stocks and gives you virtual cash, so you can practise buying, selling and costs with no real risk.",
                    "能列出杠杆放大风险的机制：放大盈亏、追加保证金、强制平仓。",
                    "Be able to describe how leverage magnifies risk: amplified gains and losses, margin calls and forced liquidation.",
                ),
            ],
        },
    ],
}


def _inject_translations():
    from .study_us_translations import US_PAPER_TITLE, US_TRANSLATIONS
    for lang, val in US_PAPER_TITLE.items():
        US_PAPER[f"title_{lang}"] = val
    for topic in US_PAPER["topics"]:
        trans = US_TRANSLATIONS.get(topic["id"], {})
        for lang, val in trans.get("title", {}).items():
            topic[f"title_{lang}"] = val
        for section, sec_trans in zip(topic["sections"], trans.get("sections", [])):
            for field in ("heading", "body", "real_world", "exam_tip"):
                for lang, val in sec_trans.get(field, {}).items():
                    section[f"{field}_{lang}"] = val


_inject_translations()
