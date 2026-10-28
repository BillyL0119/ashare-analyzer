"""
"Be the Fed chair" scenarios: a student sets the US policy rate one quarter at a time through a real
episode, and the economy answers.

The numbers are the real quarterly history from the Federal Reserve Board's FRB/US database
(tools/build_governor.py writes them to data/governor/): unemployment, the Fed staff's estimate of
the natural rate, the fed funds rate, PCE and CPI inflation, and surveyed long-run inflation
expectations. If the student copies the real Fed, they get exactly what happened. Any other choice
changes the path only by the effect of the difference in rates, through a small textbook model
(services/governor_model.py), so the shocks the economy really went through all stay in.

Events: what happened during each quarter, shown after that quarter's decision. Each is a
well-documented public fact with the institution that announced or recorded it; numbers appear only
where they are the official published figure. Nothing is invented.

Each event: (quarter, source, zh, en).
"""

SCENARIOS = [
    {
        "id": "inflation_2021",
        "start": "2021Q2", "end": "2024Q4",
        "chair": {"zh": "鲍威尔", "en": "Jerome Powell"},
        "title": {"zh": "2021–2024：通胀卷土重来", "en": "2021–2024: Inflation Comes Back"},
        "tagline": {
            "zh": "2021 年春天，疫情后的经济重新开放，政府刚发了大笔补贴。利率接近零，通胀才刚开始抬头。现在加息，还是再等等？",
            "en": "Spring 2021. The economy is reopening after the pandemic and a large relief package has just passed. Rates are near zero and inflation is only starting to rise. Raise rates now, or wait?",
        },
        "study": ["monetary_policy", "inflation"],
        "events": [
            ("2021Q1", "White House", "拜登总统签署 1.9 万亿美元的《美国救援计划》。", "President Biden signs the $1.9 trillion American Rescue Plan."),
            ("2021Q2", "BLS", "4 月 CPI 同比上涨 4.2%，是 2008 年以来最大涨幅。", "April CPI rises 4.2% from a year earlier, the biggest increase since 2008."),
            ("2021Q2", "Federal Reserve", "美联储在声明中说，通胀上升“主要反映暂时性因素”。", "The Fed's statement says inflation has risen, 'largely reflecting transitory factors'."),
            ("2021Q4", "Federal Reserve", "美联储宣布开始减少购买债券（缩减量化宽松），12 月又把缩减速度加倍。", "The Fed announces it will start slowing its bond purchases (tapering), and in December doubles the pace."),
            ("2021Q4", "Federal Reserve", "鲍威尔在国会作证时说，是时候不再用“暂时性”来形容通胀了。", "In testimony to Congress, Powell says it is time to retire the word 'transitory' for inflation."),
            ("2021Q4", "BLS", "11 月 CPI 同比上涨 6.8%，为 1982 年以来最高。", "November CPI rises 6.8% from a year earlier, the highest since 1982."),
            ("2022Q1", "—", "俄罗斯入侵乌克兰，油价和粮价大涨。", "Russia invades Ukraine; oil and grain prices jump."),
            ("2022Q2", "BLS", "5 月 CPI 同比上涨 8.6%，高于预期。", "May CPI rises 8.6% from a year earlier, above expectations."),
            ("2022Q2", "Federal Reserve", "美联储一次加息 0.75 个百分点，为 1994 年以来最大单次加息。", "The Fed raises rates by three quarters of a point, the largest single increase since 1994."),
            ("2022Q3", "BLS", "6 月 CPI 同比上涨 9.1%，这是这一轮通胀的最高点。", "June CPI rises 9.1% from a year earlier, the peak of this inflation."),
            ("2022Q3", "Federal Reserve", "鲍威尔在杰克逊霍尔年会上警告，压低通胀会给家庭和企业带来“一些痛苦”。", "At Jackson Hole, Powell warns that bringing inflation down will bring 'some pain' to households and businesses."),
            ("2022Q4", "BLS", "10 月 CPI 同比上涨 7.7%，低于预期。", "October CPI rises 7.7% from a year earlier, below expectations."),
            ("2023Q1", "FDIC", "硅谷银行倒闭，几天后签名银行也被关闭；美联储推出新的贷款工具支持银行。", "Silicon Valley Bank fails, and Signature Bank is closed days later; the Fed sets up a new lending program for banks."),
            ("2023Q2", "FDIC", "第一共和银行被接管，并出售给摩根大通。", "First Republic Bank is seized by regulators and sold to JPMorgan Chase."),
            ("2023Q2", "Federal Reserve", "美联储在连续十次加息后第一次暂停。", "The Fed pauses after ten straight rate increases."),
            ("2023Q3", "Federal Reserve", "美联储把利率区间升到 5.25%–5.5%，这是这一轮的最后一次加息。", "The Fed raises its range to 5.25%–5.5%, the last increase of this cycle."),
            ("2024Q2", "BLS", "5 月 CPI 同比上涨 3.3%。", "May CPI rises 3.3% from a year earlier."),
            ("2024Q3", "BLS", "7 月失业率升到 4.3%。", "The unemployment rate rises to 4.3% in July."),
            ("2024Q3", "Federal Reserve", "美联储降息 0.5 个百分点，是 2020 年以来首次降息。", "The Fed cuts rates by half a point, its first cut since 2020."),
            ("2024Q4", "Federal Reserve", "美联储 11 月和 12 月各降息 0.25 个百分点，利率区间降到 4.25%–4.5%。", "The Fed cuts by a quarter point in November and again in December, to a 4.25%–4.5% range."),
        ],
        "epilogue": {
            "zh": "真实的美联储等到 2022 年 3 月才开始加息，之后不到一年半加了 5 个多百分点，是几十年来最快的一轮。通胀从 2022 年的高点回落，失业率却没有像很多人担心的那样大幅上升，这被称为“软着陆”。不过很多经济学家认为，美联储如果早点行动，通胀可能不会升得这么高。",
            "en": "The real Fed waited until March 2022 to start raising rates, then raised them by more than 5 points in under a year and a half, the fastest pace in decades. Inflation came down from its 2022 peak without the big rise in unemployment many had feared, which became known as a 'soft landing'. Many economists still think that acting sooner would have kept inflation from rising so high.",
        },
    },
    {
        "id": "volcker_1979",
        "start": "1979Q3", "end": "1982Q4",
        "chair": {"zh": "沃尔克", "en": "Paul Volcker"},
        "title": {"zh": "1979–1982：沃尔克大战通胀", "en": "1979–1982: Volcker vs. Inflation"},
        "tagline": {
            "zh": "1979 年夏天，美国通胀已经接近两位数，石油危机让物价继续飞涨，人们开始默认物价每年都会大涨。你能把通胀打下来吗？代价是什么？",
            "en": "Summer 1979. US inflation is heading for double digits, an oil shock is pushing prices higher, and people have come to expect big price rises every year. Can you break inflation, and at what cost?",
        },
        "study": ["monetary_policy", "inflation"],
        "events": [
            ("1979Q2", "Federal Reserve History", "伊朗革命打乱了石油供应，油价大幅上涨（第二次石油危机）。", "The Iranian Revolution disrupts oil supplies and oil prices surge (the second oil shock)."),
            ("1979Q3", "Federal Reserve History", "保罗·沃尔克就任美联储主席。", "Paul Volcker becomes chair of the Federal Reserve."),
            ("1979Q4", "Federal Reserve History", "美联储在一次周六的特别会议上宣布，改为控制货币供应量，并允许利率想升多高就升多高。", "At a special Saturday meeting, the Fed switches to controlling the money supply and lets interest rates rise as far as needed."),
            ("1980Q1", "Federal Reserve History", "卡特总统宣布信贷管制，美联储随之限制银行放贷。", "President Carter announces credit controls, and the Fed puts limits on bank lending."),
            ("1980Q1", "NBER", "经济在 1 月开始衰退（美国国家经济研究局后来认定）。", "A recession begins in January (as later dated by the National Bureau of Economic Research)."),
            ("1980Q2", "BLS", "3 月 CPI 同比上涨 14.8%，是这一轮通胀的最高点。", "March CPI rises 14.8% from a year earlier, the peak of this inflation."),
            ("1980Q3", "NBER", "信贷管制取消，衰退在 7 月结束，只持续了半年。", "Credit controls are lifted and the recession ends in July, after only six months."),
            ("1980Q4", "—", "里根当选美国总统。", "Ronald Reagan is elected president."),
            ("1980Q4", "Federal Reserve History", "银行的最优惠贷款利率在 12 月升到创纪录的 21.5%。", "Banks' prime lending rate reaches a record 21.5% in December."),
            ("1981Q3", "NBER", "经济在 7 月再次陷入衰退，这次更深。", "A second, deeper recession begins in July."),
            ("1981Q3", "—", "里根签署《经济复苏税法》，大幅减税。", "Reagan signs the Economic Recovery Tax Act, cutting income taxes sharply."),
            ("1982Q3", "Federal Reserve History", "墨西哥宣布无力偿还外债，拉美债务危机爆发。", "Mexico says it cannot pay its foreign debts, starting the Latin American debt crisis."),
            ("1982Q4", "Federal Reserve History", "美联储不再严格盯住货币供应量，开始放松政策。", "The Fed stops targeting the money supply closely and begins to ease."),
            ("1982Q4", "BLS", "11 月和 12 月失业率达到 10.8%。", "Unemployment reaches 10.8% in November and December."),
            ("1982Q4", "NBER", "衰退在 11 月结束。", "The recession ends in November."),
        ],
        "epilogue": {
            "zh": "沃尔克把联邦基金利率推到将近 20%，经济连续两次衰退，失业率升到 10.8%，农民和建筑工人甚至到美联储门口抗议。但通胀从 1980 年的近 15% 降到 1983 年的 3% 左右，人们对通胀的预期也慢慢回落。此后美国经历了二十多年的低通胀和稳定增长。这段历史常被用来说明：央行的可信度很重要，打破根深蒂固的通胀预期代价很高。",
            "en": "Volcker pushed the fed funds rate close to 20%. The economy went through two recessions, unemployment reached 10.8%, and farmers and builders protested outside the Fed. But inflation fell from nearly 15% in 1980 to about 3% by 1983, and expectations slowly followed. Two decades of low inflation and steady growth came after. The episode is often used to show that a central bank's credibility matters, and that breaking entrenched inflation expectations is costly.",
        },
    },
    {
        "id": "crisis_2007",
        "start": "2007Q3", "end": "2010Q4",
        "chair": {"zh": "伯南克", "en": "Ben Bernanke"},
        "title": {"zh": "2007–2010：金融危机", "en": "2007–2010: The Financial Crisis"},
        "tagline": {
            "zh": "2007 年夏天，美国次贷问题开始蔓延，失业率还很低，油价却在上涨。你什么时候降息、降多快？当利率降到零以后，你还能做什么？",
            "en": "Summer 2007. Trouble with US subprime mortgages is spreading. Unemployment is still low, but oil prices are rising. When do you cut rates, and how fast? And what can you do once rates reach zero?",
        },
        "study": ["monetary_policy", "unemployment"],
        "events": [
            ("2007Q2", "—", "多家次级房贷公司倒闭，最大的次贷公司之一新世纪金融申请破产。", "Several subprime mortgage lenders collapse, including New Century Financial, one of the largest."),
            ("2007Q3", "BNP Paribas", "法国巴黎银行冻结三只投资美国次贷的基金，银行间借贷市场突然紧张。", "BNP Paribas freezes three funds exposed to US subprime mortgages, and lending between banks suddenly seizes up."),
            ("2007Q4", "Federal Reserve", "美联储推出定期拍卖工具，直接向银行提供贷款。", "The Fed creates the Term Auction Facility to lend directly to banks."),
            ("2007Q4", "NBER", "经济在 12 月开始衰退（后来认定）。", "A recession begins in December (as later dated)."),
            ("2008Q1", "Federal Reserve", "美联储在一次紧急会议上降息 0.75 个百分点。", "The Fed cuts rates by three quarters of a point at an emergency meeting."),
            ("2008Q1", "Federal Reserve", "摩根大通在美联储支持下收购濒临倒闭的贝尔斯登。", "JPMorgan Chase agrees to buy the failing Bear Stearns with support from the Fed."),
            ("2008Q2", "—", "油价不断创下历史新高。", "Oil prices keep setting record highs."),
            ("2008Q3", "FHFA", "政府接管房贷巨头房利美和房地美。", "The government takes over the mortgage giants Fannie Mae and Freddie Mac."),
            ("2008Q3", "Lehman Brothers", "雷曼兄弟申请破产，美联储第二天救助 AIG，金融恐慌达到顶点。", "Lehman Brothers files for bankruptcy; the next day the Fed rescues AIG, and the panic peaks."),
            ("2008Q4", "U.S. Congress", "7000 亿美元的银行救助计划（TARP）通过。", "Congress passes the $700 billion bank rescue program (TARP)."),
            ("2008Q4", "Federal Reserve", "美联储宣布购买房贷支持证券（第一轮量化宽松），并在 12 月把利率降到 0–0.25%。", "The Fed announces purchases of mortgage-backed securities (the first quantitative easing) and in December cuts rates to 0–0.25%."),
            ("2009Q1", "U.S. Congress", "奥巴马签署约 7870 亿美元的经济刺激法案。", "President Obama signs a stimulus package of about $787 billion."),
            ("2009Q1", "Federal Reserve", "美联储扩大量化宽松，开始购买长期国债。", "The Fed expands quantitative easing and starts buying long-term Treasuries."),
            ("2009Q2", "Federal Reserve", "大银行压力测试结果公布，市场信心开始恢复。", "Results of stress tests on the largest banks are published, and confidence starts to return."),
            ("2009Q2", "NBER", "衰退在 6 月结束（后来认定），这是二战后最长的一次衰退。", "The recession ends in June (as later dated), the longest since the Second World War."),
            ("2009Q4", "BLS", "10 月失业率达到 10.0%。", "Unemployment reaches 10.0% in October."),
            ("2010Q2", "European Commission / IMF", "希腊债务危机爆发，欧盟和国际货币基金组织出手救助。", "Greece's debt crisis breaks out and the EU and IMF agree a rescue."),
            ("2010Q3", "U.S. Congress", "《多德-弗兰克法案》签署，加强金融监管。", "The Dodd-Frank Act is signed, tightening financial regulation."),
            ("2010Q4", "Federal Reserve", "美联储宣布再买 6000 亿美元国债（第二轮量化宽松）。", "The Fed announces $600 billion more of Treasury purchases (the second quantitative easing)."),
        ],
        "epilogue": {
            "zh": "美联储在一年多里把利率从 5.25% 降到接近零，之后用量化宽松继续刺激经济。即便如此，失业率还是升到 10%，用了好几年才降回危机前的水平。这一轮让人看到：利率降到零以后，常规的货币政策就用完了，央行只能靠量化宽松、前瞻指引，经济复苏还离不开财政政策。",
            "en": "The Fed cut rates from 5.25% to almost zero in little over a year, then kept stimulating with quantitative easing. Even so, unemployment reached 10% and took years to return to its pre-crisis level. The episode showed that once rates hit zero, ordinary monetary policy runs out: the central bank has to turn to quantitative easing and forward guidance, and the recovery also depends on fiscal policy.",
        },
    },
]

BY_ID = {s["id"]: s for s in SCENARIOS}
