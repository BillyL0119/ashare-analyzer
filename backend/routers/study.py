"""
A-Level Economics Study Center — /api/study/*
Cambridge 9708 curriculum with real A-share market data examples.
"""

from fastapi import APIRouter, HTTPException

router = APIRouter()

# ── Curriculum data ───────────────────────────────────────────────────────────

CURRICULUM = {
    "exam": "A-Level Economics",
    "board": "Cambridge 9708",
    "papers": [
        {
            "id": "micro",
            "title": "Paper 1 — Microeconomics",
            "topics": [
                {
                    "id": "micro_1",
                    "title": "The Basic Economic Problem",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Scarcity and Choice",
                            "body": "Economics exists because of one fundamental problem: scarcity. Resources — land, labour, capital and enterprise — are finite, but human wants are infinite. Every society must therefore make choices about what to produce, how to produce it, and for whom.",
                            "key_terms": ["scarcity", "factors of production", "opportunity cost"],
                            "exam_tip": "Define scarcity precisely in essays: 'unlimited wants but limited resources'. Examiners reward technical definitions.",
                        },
                        {
                            "heading": "Opportunity Cost",
                            "body": "Opportunity cost is the next best alternative foregone when a decision is made. It is not the monetary cost, but the real cost in terms of what is sacrificed.",
                            "key_terms": ["opportunity cost", "trade-off"],
                            "real_world": "China's decision to invest heavily in renewable energy (solar, wind) means fewer resources for traditional infrastructure. In 2023, China spent over $750 billion on clean energy — the opportunity cost was equivalent hospital beds, schools, or roads that could have been built.",
                            "exam_tip": "Always link opportunity cost to a specific foregone alternative. 'The opportunity cost of X is Y' is the correct structure.",
                        },
                        {
                            "heading": "Production Possibility Curves",
                            "body": "A PPC shows the maximum combinations of two goods an economy can produce with all resources fully and efficiently employed. Points inside the curve represent underemployment; points outside are currently unattainable.",
                            "key_terms": ["PPC", "productive efficiency", "allocative efficiency", "economic growth"],
                            "real_world": "China's PPC shifted outward dramatically from 1990 to 2020 due to rapid capital accumulation and technology improvements. GDP per capita rose from around $350 to over $10,000, illustrating an outward shift driven by investment in human and physical capital.",
                            "exam_tip": "For 8-mark questions on PPC: define it, draw it, explain movements along vs shifts of the curve, and give a real example.",
                        },
                    ],
                },
                {
                    "id": "micro_2",
                    "title": "Supply and Demand",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "Demand",
                            "body": "Demand refers to the quantity of a good consumers are willing and able to purchase at each price level, ceteris paribus. The law of demand states that as price rises, quantity demanded falls, giving a downward-sloping demand curve.",
                            "key_terms": ["demand", "ceteris paribus", "law of demand", "normal good", "inferior good"],
                            "real_world": "During China's 2023 economic slowdown, consumer demand for luxury goods including Moutai (600519) weakened as income expectations fell — a textbook shift left in the demand curve driven by falling real incomes.",
                            "exam_tip": "Distinguish between movement along (price change) and shift of (non-price factor) the demand curve. This distinction earns marks in every diagram question.",
                        },
                        {
                            "heading": "Supply",
                            "body": "Supply is the quantity producers are willing and able to offer at each price level. The law of supply states that as price rises, quantity supplied increases. Shifts in supply are caused by changes in costs of production, technology, taxes and subsidies, and number of firms.",
                            "key_terms": ["supply", "law of supply", "subsidy", "indirect tax"],
                            "real_world": "China's solar panel industry (leading firms: LONGi Green Energy 601012) massively expanded supply between 2015 and 2024 due to falling production costs from economies of scale. The global price of solar panels fell over 90%, a classic rightward shift in supply.",
                            "exam_tip": "When drawing supply shifts from a subsidy vs tax: subsidy shifts supply right (lower costs), tax shifts supply left (higher costs).",
                        },
                        {
                            "heading": "Elasticity",
                            "body": "Price Elasticity of Demand (PED) measures the responsiveness of quantity demanded to a change in price. PED = % change in Qd / % change in P. If |PED| > 1, demand is elastic; if |PED| < 1, demand is inelastic.",
                            "key_terms": ["PED", "PES", "YED", "XED", "elastic", "inelastic"],
                            "real_world": "Baijiu (white spirits like Moutai) has highly inelastic demand among loyal Chinese consumers — price increases of 20% in 2022-2023 barely reduced sales volume, reflecting strong brand loyalty and few substitutes. Compare this to budget smartphones which have elastic demand as alternatives are plentiful.",
                            "exam_tip": "Determinants of PED: SLANT — Substitutes, Luxury vs necessity, Addiction, Number of uses, Time period. Always quote the formula and a numerical value in calculations.",
                        },
                    ],
                },
                {
                    "id": "micro_3",
                    "title": "Market Failure",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Externalities",
                            "body": "An externality occurs when the production or consumption of a good affects third parties who are not involved in the transaction. Negative externalities (e.g. pollution) cause the social cost to exceed the private cost, leading to overproduction. Positive externalities cause underproduction.",
                            "key_terms": ["externality", "social cost", "private cost", "MSC", "MPB", "deadweight loss"],
                            "real_world": "China's coal power industry generates massive negative externalities — air pollution costs China an estimated 6-7% of GDP annually in health and environmental damage. This explains why China introduced carbon trading (ETS) in 2021 to internalise these external costs.",
                            "exam_tip": "Draw both MSC and MPC curves for negative externalities. The deadweight loss triangle between the market output and socially optimal output is frequently tested.",
                        },
                        {
                            "heading": "Public Goods",
                            "body": "Public goods have two defining characteristics: non-rivalry (one person's consumption does not reduce availability to others) and non-excludability (impossible to prevent people from consuming the good). These properties lead to the free-rider problem and market failure.",
                            "key_terms": ["public good", "non-rivalry", "non-excludability", "free-rider problem"],
                            "real_world": "National defence in China is a classic public good — the PLA protects all 1.4 billion citizens simultaneously (non-rival) and it is impossible to exclude any citizen from this protection (non-excludable). Private firms would underprovide this, justifying government provision.",
                            "exam_tip": "Do not confuse public goods with merit goods. Public goods are defined by non-rivalry + non-excludability, not by who provides them.",
                        },
                        {
                            "heading": "Government Intervention",
                            "body": "Governments intervene to correct market failure through taxes (to internalise negative externalities), subsidies (to encourage positive externalities), regulation, price controls, and direct provision.",
                            "key_terms": ["carbon tax", "Pigouvian tax", "regulation", "government failure"],
                            "real_world": "China's EV subsidy programme (2010-2023) provided up to 60,000 yuan per vehicle to encourage adoption of electric cars, correcting the positive externality from reduced emissions. BYD (002594) became the world's largest EV maker partly thanks to these subsidies — a textbook example of government correcting market failure.",
                            "exam_tip": "Evaluation point: government intervention can lead to government failure. Always consider unintended consequences — e.g. EV subsidies led to fraud and overproduction.",
                        },
                    ],
                },
                {
                    "id": "micro_4",
                    "title": "Government Microeconomic Intervention",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Price Controls",
                            "body": "A maximum price (price ceiling) is set below equilibrium to make goods affordable — it creates excess demand (shortage). A minimum price (price floor) is set above equilibrium to support producers — it creates excess supply (surplus).",
                            "key_terms": ["maximum price", "minimum price", "price ceiling", "price floor", "shortage", "surplus"],
                            "real_world": "China has implemented maximum prices on pork multiple times during supply shocks. During the 2019-2020 African swine fever outbreak, pork prices tripled — the government released strategic reserves and considered price caps to protect consumers, a classic maximum price intervention scenario.",
                            "exam_tip": "Always draw the diagram for price controls. Shortage = demand > supply at controlled price. Surplus = supply > demand at controlled price.",
                        },
                        {
                            "heading": "Taxes and Subsidies",
                            "body": "An indirect tax shifts supply left, raising the equilibrium price and reducing quantity. A subsidy shifts supply right, lowering price and raising quantity. The incidence of tax (who bears the burden) depends on relative elasticity of demand and supply.",
                            "key_terms": ["indirect tax", "subsidy", "tax incidence", "producer surplus", "consumer surplus"],
                            "real_world": "China's cigarette tax (currently around 56% of retail price) is designed to reduce consumption of a demerit good. Despite high taxes, demand remains relatively inelastic — most of the tax burden falls on consumers, as predicted by economic theory when demand is inelastic.",
                            "exam_tip": "Tax incidence: when demand is more inelastic than supply, consumers bear more of the tax burden. Draw this with a steep demand curve and flatter supply curve.",
                        },
                    ],
                },
            ],
        },
        {
            "id": "macro",
            "title": "Paper 2 — Macroeconomics",
            "topics": [
                {
                    "id": "macro_1",
                    "title": "Macroeconomic Objectives",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "The Four Main Objectives",
                            "body": "Governments pursue four key macroeconomic objectives: (1) economic growth, measured by real GDP; (2) price stability, typically targeting low inflation around 2%; (3) full employment, minimising unemployment; (4) balance of payments equilibrium, avoiding persistent current account deficits.",
                            "key_terms": ["GDP", "real GDP", "CPI", "unemployment rate", "current account", "balance of payments"],
                            "real_world": "China's government sets annual GDP growth targets — in 2024 the target was 'around 5%'. This illustrates the objective of economic growth. However, rapidly growing economies often face inflation trade-offs, as seen in China's CPI fluctuations between -0.3% and 3.5% over 2020-2024.",
                            "exam_tip": "Know the conflicts between objectives: growth vs inflation, unemployment vs inflation (Phillips curve). These conflicts are frequent 12-mark essay topics.",
                        },
                        {
                            "heading": "Measuring GDP",
                            "body": "GDP can be measured by three methods: expenditure (C+I+G+X-M), income (sum of all incomes), and output (sum of value added). All three should give the same result. Real GDP adjusts for inflation; nominal GDP does not.",
                            "key_terms": ["nominal GDP", "real GDP", "GDP deflator", "purchasing power parity"],
                            "real_world": "China's nominal GDP reached approximately $18 trillion in 2024, making it the world's second largest economy. However, on a purchasing power parity (PPP) basis, China's GDP exceeds the US, as the cost of living is lower in China — illustrating why PPP matters for international comparisons.",
                            "exam_tip": "Always specify real vs nominal GDP. In essays, note that GDP is an imperfect welfare measure — it ignores income distribution, environmental costs, and non-market production.",
                        },
                    ],
                },
                {
                    "id": "macro_2",
                    "title": "Aggregate Demand and Supply",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "Aggregate Demand",
                            "body": "Aggregate demand (AD) is the total demand for goods and services in an economy at a given price level. AD = C + I + G + (X - M). The AD curve slopes downward due to the wealth effect, interest rate effect, and international substitution effect.",
                            "key_terms": ["aggregate demand", "consumption", "investment", "government spending", "net exports", "multiplier"],
                            "real_world": "During COVID-19 in 2020, China's AD fell sharply as consumption and investment collapsed. The government responded with a 3.6 trillion yuan fiscal stimulus, boosting G directly and triggering a multiplier effect. China was the only major economy to achieve positive growth (2.3%) in 2020.",
                            "exam_tip": "The multiplier = 1 / (1 - MPC) or 1 / MPS. Larger multiplier = larger MPC. Know factors that affect multiplier size: tax rate, import propensity.",
                        },
                        {
                            "heading": "Aggregate Supply",
                            "body": "Short-run aggregate supply (SRAS) slopes upward — higher price levels incentivise more production as nominal wages are fixed. Long-run aggregate supply (LRAS) is vertical at the full employment level of output, determined by the quantity and quality of factors of production.",
                            "key_terms": ["SRAS", "LRAS", "potential output", "supply-side policies", "stagflation"],
                            "real_world": "China's rapid LRAS growth over 30 years resulted from massive investment in physical capital (infrastructure), human capital (education expansion from 5% to 55% university enrollment), and technology (R&D spending reaching 2.5% of GDP). This is a textbook example of long-run economic growth.",
                            "exam_tip": "Stagflation occurs when SRAS shifts left — rising prices and falling output simultaneously. This cannot be solved by demand-side policy alone.",
                        },
                    ],
                },
                {
                    "id": "macro_3",
                    "title": "Economic Policy",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "Monetary Policy",
                            "body": "Monetary policy involves changing interest rates or money supply to influence economic activity. Lower interest rates reduce the cost of borrowing, stimulate consumption and investment, and depreciate the exchange rate. Central banks use this to target inflation.",
                            "key_terms": ["interest rate", "money supply", "quantitative easing", "inflation targeting", "transmission mechanism"],
                            "real_world": "The People's Bank of China (PBOC) cut its benchmark Loan Prime Rate (LPR) multiple times in 2023-2024 to stimulate a slowing economy. In contrast, the US Federal Reserve raised rates aggressively in 2022-2023 to combat 9% inflation — demonstrating opposite monetary policy stances and their divergent effects on the RMB/USD exchange rate.",
                            "exam_tip": "The monetary transmission mechanism: interest rate change -> borrowing costs -> consumption and investment -> AD -> real GDP and inflation. Draw this chain clearly in essays.",
                        },
                        {
                            "heading": "Fiscal Policy",
                            "body": "Fiscal policy involves changes in government spending and taxation. Expansionary fiscal policy (increase G or cut taxes) raises AD through the multiplier. Contractionary fiscal policy reduces inflation by lowering AD. The government budget deficit = G - T.",
                            "key_terms": ["fiscal policy", "government budget", "budget deficit", "national debt", "automatic stabilisers", "crowding out"],
                            "real_world": "China's 2024 fiscal deficit target was 3% of GDP, with an additional 1 trillion yuan in special government bonds for infrastructure — a moderately expansionary stance. Compare this to the UK where fiscal austerity in 2010-2015 reduced the deficit but critics argue it slowed recovery, illustrating the ongoing debate between Keynesian and classical economists.",
                            "exam_tip": "Crowding out: government borrowing raises interest rates, reducing private investment. This is a key evaluation point against expansionary fiscal policy.",
                        },
                        {
                            "heading": "Supply-Side Policy",
                            "body": "Supply-side policies aim to increase the productive capacity of the economy (shift LRAS right) rather than manage demand. They include education and training, privatisation, deregulation, tax cuts to incentivise work, and infrastructure investment.",
                            "key_terms": ["supply-side policy", "privatisation", "deregulation", "human capital", "labour market flexibility"],
                            "real_world": "China's 'dual circulation' strategy (2020-present) is partly a supply-side policy — emphasising domestic innovation, R&D investment, and reducing dependence on foreign technology. The semiconductor push (investing in SMIC 688981 and others) aims to shift China's LRAS rightward through technology development.",
                            "exam_tip": "Supply-side policies have long time lags — education reforms take a generation to impact the labour market. This is a key weakness vs demand-side policies.",
                        },
                    ],
                },
                {
                    "id": "macro_4",
                    "title": "International Economics",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Comparative Advantage and Trade",
                            "body": "Comparative advantage states that a country should specialise in producing goods where it has the lowest opportunity cost, even if another country is absolutely better at producing everything. Free trade based on comparative advantage increases global output.",
                            "key_terms": ["comparative advantage", "absolute advantage", "terms of trade", "specialisation", "free trade"],
                            "real_world": "China has comparative advantage in manufacturing — abundant low-cost labour and large-scale production (e.g. electronics, textiles, solar panels). The US has comparative advantage in technology and financial services. This underpins over $600 billion in annual bilateral trade despite political tensions.",
                            "exam_tip": "Calculate comparative advantage by comparing opportunity costs, not absolute output. Show the calculation clearly: who gives up less X to produce one unit of Y?",
                        },
                        {
                            "heading": "Exchange Rates",
                            "body": "An exchange rate is the price of one currency in terms of another. Demand for RMB comes from foreigners wanting Chinese exports and assets. Supply of RMB comes from Chinese demand for foreign goods and assets. A depreciation makes exports cheaper and imports more expensive.",
                            "key_terms": ["exchange rate", "appreciation", "depreciation", "current account", "capital account", "hot money"],
                            "real_world": "The RMB depreciated from 6.3 to 7.3 per USD in 2022-2023 as the US raised interest rates, attracting capital flows to dollar assets (hot money outflow from China). This depreciation helped Chinese exporters (cheaper exports) but raised import costs and pressured the current account — a real-world illustration of exchange rate mechanisms affecting A-share companies.",
                            "exam_tip": "Marshall-Lerner condition: depreciation improves current account only if sum of PED for exports + PED for imports > 1. J-curve shows short-run worsening before long-run improvement.",
                        },
                    ],
                },
            ],
        },
    ],
}

# ── Build a flat topic lookup ─────────────────────────────────────────────────

_TOPIC_MAP: dict = {}
for _paper in CURRICULUM["papers"]:
    for _topic in _paper["topics"]:
        _TOPIC_MAP[_topic["id"]] = _topic


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/curriculum")
def get_curriculum():
    """Return full curriculum structure (without section bodies to keep payload small)."""
    slim_papers = []
    for paper in CURRICULUM["papers"]:
        slim_topics = []
        for topic in paper["topics"]:
            slim_topics.append({
                "id":             topic["id"],
                "title":          topic["title"],
                "estimated_time": topic["estimated_time"],
                "section_count":  len(topic["sections"]),
            })
        slim_papers.append({
            "id":     paper["id"],
            "title":  paper["title"],
            "topics": slim_topics,
        })
    return {
        "exam":   CURRICULUM["exam"],
        "board":  CURRICULUM["board"],
        "papers": slim_papers,
    }


@router.get("/topic/{topic_id}")
def get_topic(topic_id: str):
    topic = _TOPIC_MAP.get(topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")
    return topic
