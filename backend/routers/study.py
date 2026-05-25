"""
Multi-Exam Economics Study Center — /api/study/*
Supports: A-Level (Cambridge 9708), IGCSE (Cambridge 0455), AP Macroeconomics, IB Economics SL/HL
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter()

# ── A-Level Curriculum ────────────────────────────────────────────────────────

ALEVEL_CURRICULUM = {
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
                            "heading": "Opportunity Cost and PPC",
                            "body": "Opportunity cost is the next best alternative foregone when a decision is made. A PPC shows the maximum combinations of two goods an economy can produce with all resources fully and efficiently employed. Points inside the curve represent underemployment; points outside are currently unattainable.",
                            "key_terms": ["opportunity cost", "trade-off", "PPC", "productive efficiency", "economic growth"],
                            "real_world": "China's decision to invest heavily in renewable energy (solar, wind) means fewer resources for traditional infrastructure. In 2023, China spent over $750 billion on clean energy — the opportunity cost was equivalent hospital beds, schools, or roads that could have been built. China's PPC shifted outward dramatically from 1990 to 2020 as GDP per capita rose from ~$350 to over $10,000.",
                            "exam_tip": "Always link opportunity cost to a specific foregone alternative. For 8-mark questions on PPC: define it, draw it, explain movements along vs shifts of the curve, and give a real example.",
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
                            "real_world": "Baijiu (white spirits like Moutai) has highly inelastic demand among loyal Chinese consumers — price increases of 20% in 2022-2023 barely reduced sales volume, reflecting strong brand loyalty and few substitutes.",
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
                            "heading": "Public Goods and Government Intervention",
                            "body": "Public goods have two defining characteristics: non-rivalry and non-excludability. These properties lead to the free-rider problem and market failure. Governments intervene through taxes, subsidies, regulation, price controls, and direct provision.",
                            "key_terms": ["public good", "non-rivalry", "non-excludability", "free-rider problem", "carbon tax", "Pigouvian tax", "government failure"],
                            "real_world": "China's EV subsidy programme (2010-2023) provided up to 60,000 yuan per vehicle to encourage adoption of electric cars, correcting the positive externality from reduced emissions. BYD (002594) became the world's largest EV maker partly thanks to these subsidies.",
                            "exam_tip": "Do not confuse public goods with merit goods. Public goods are defined by non-rivalry + non-excludability, not by who provides them. Evaluation point: government intervention can lead to government failure.",
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
                            "real_world": "China has implemented maximum prices on pork multiple times during supply shocks. During the 2019-2020 African swine fever outbreak, pork prices tripled — the government released strategic reserves and considered price caps to protect consumers.",
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
                            "real_world": "China's government sets annual GDP growth targets — in 2024 the target was 'around 5%'. China's CPI fluctuated between -0.3% and 3.5% over 2020-2024, illustrating the challenge of maintaining price stability alongside growth.",
                            "exam_tip": "Know the conflicts between objectives: growth vs inflation, unemployment vs inflation (Phillips curve). These conflicts are frequent 12-mark essay topics.",
                        },
                        {
                            "heading": "Measuring GDP",
                            "body": "GDP can be measured by three methods: expenditure (C+I+G+X-M), income (sum of all incomes), and output (sum of value added). Real GDP adjusts for inflation; nominal GDP does not.",
                            "key_terms": ["nominal GDP", "real GDP", "GDP deflator", "purchasing power parity"],
                            "real_world": "China's nominal GDP reached approximately $18 trillion in 2024. On a purchasing power parity (PPP) basis, China's GDP exceeds the US, as the cost of living is lower in China — illustrating why PPP matters for international comparisons.",
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
                            "real_world": "China's rapid LRAS growth over 30 years resulted from massive investment in physical capital (infrastructure), human capital (education expansion from 5% to 55% university enrollment), and technology (R&D spending reaching 2.5% of GDP).",
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
                            "real_world": "The People's Bank of China (PBOC) cut its benchmark Loan Prime Rate (LPR) multiple times in 2023-2024 to stimulate a slowing economy. In contrast, the US Federal Reserve raised rates aggressively in 2022-2023 to combat 9% inflation — demonstrating opposite monetary policy stances.",
                            "exam_tip": "The monetary transmission mechanism: interest rate change → borrowing costs → consumption and investment → AD → real GDP and inflation. Draw this chain clearly in essays.",
                        },
                        {
                            "heading": "Fiscal and Supply-Side Policy",
                            "body": "Fiscal policy involves changes in government spending and taxation. Supply-side policies aim to increase the productive capacity of the economy (shift LRAS right) through education, privatisation, deregulation, and infrastructure investment.",
                            "key_terms": ["fiscal policy", "government budget", "budget deficit", "crowding out", "supply-side policy", "privatisation", "deregulation"],
                            "real_world": "China's 2024 fiscal deficit target was 3% of GDP with an additional 1 trillion yuan in special bonds for infrastructure. China's 'dual circulation' strategy (2020-present) emphasises domestic innovation and R&D — a supply-side approach to shift LRAS rightward.",
                            "exam_tip": "Crowding out: government borrowing raises interest rates, reducing private investment. Supply-side policies have long time lags — education reforms take a generation to impact the labour market.",
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
                            "real_world": "China has comparative advantage in manufacturing — abundant low-cost labour and large-scale production (electronics, solar panels). The US has comparative advantage in technology and financial services. This underpins over $600 billion in annual bilateral trade despite political tensions.",
                            "exam_tip": "Calculate comparative advantage by comparing opportunity costs, not absolute output. Show the calculation clearly: who gives up less X to produce one unit of Y?",
                        },
                        {
                            "heading": "Exchange Rates",
                            "body": "An exchange rate is the price of one currency in terms of another. A depreciation makes exports cheaper and imports more expensive. The Marshall-Lerner condition states that depreciation improves the current account only if the sum of PED for exports and imports exceeds 1.",
                            "key_terms": ["exchange rate", "appreciation", "depreciation", "current account", "capital account", "Marshall-Lerner condition", "J-curve"],
                            "real_world": "The RMB depreciated from 6.3 to 7.3 per USD in 2022-2023 as the US raised interest rates, attracting hot money outflows from China. This depreciation helped Chinese exporters but raised import costs — a real-world illustration affecting A-share companies.",
                            "exam_tip": "J-curve shows short-run current account worsening before long-run improvement after depreciation. Always label the J-shape diagram with time on the x-axis.",
                        },
                    ],
                },
            ],
        },
    ],
}


# ── IGCSE Curriculum ──────────────────────────────────────────────────────────

IGCSE_CURRICULUM = {
    "exam": "IGCSE Economics",
    "board": "Cambridge 0455",
    "papers": [
        {
            "id": "igcse_core",
            "title": "Core Topics",
            "topics": [
                {
                    "id": "igcse_1",
                    "title": "The Basic Economic Problem",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Scarcity, Choice and Opportunity Cost",
                            "body": "Scarcity is the fundamental economic problem: unlimited human wants face limited resources. Because of scarcity, every choice involves an opportunity cost — the next best alternative given up. The four factors of production are land (natural resources), labour (human effort), capital (man-made resources), and enterprise (risk-taking and organisation).",
                            "key_terms": ["scarcity", "opportunity cost", "factors of production", "land", "labour", "capital", "enterprise"],
                            "real_world": "China's coal vs renewable energy trade-off — in 2023 China invested $750bn in clean energy, the opportunity cost being traditional infrastructure spending that could have built thousands of hospitals or schools.",
                            "exam_tip": "IGCSE questions often ask you to 'identify' and 'explain' — always define the term first, then explain with an example. One mark for definition, one for application.",
                        },
                    ],
                },
                {
                    "id": "igcse_2",
                    "title": "The Allocation of Resources",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Economic Systems",
                            "body": "A market economy allocates resources through the price mechanism — prices rise when demand exceeds supply (signal to produce more) and fall when supply exceeds demand (signal to produce less). A planned economy uses central government decisions. Most real economies are mixed, combining both elements.",
                            "key_terms": ["market economy", "planned economy", "mixed economy", "price mechanism", "resource allocation"],
                            "real_world": "China's transition from planned economy (pre-1978) to socialist market economy — Deng Xiaoping's reforms shifted resource allocation from state to market. Today, private firms generate 60% of GDP while strategic sectors remain state-controlled.",
                            "exam_tip": "Know the advantages and disadvantages of each economic system — these appear as 4-mark and 6-mark questions. Market economy: efficient but unequal. Planned economy: equitable but inefficient.",
                        },
                    ],
                },
                {
                    "id": "igcse_3",
                    "title": "Demand and Supply",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Laws of Demand and Supply",
                            "body": "The law of demand: as price rises, quantity demanded falls (inverse relationship). The law of supply: as price rises, quantity supplied rises (direct relationship). A movement along the curve is caused by a price change; a shift of the curve is caused by a non-price factor. Price Elasticity of Demand (PED) = % change in Qd ÷ % change in P.",
                            "key_terms": ["law of demand", "law of supply", "shift", "movement", "PED", "elastic", "inelastic"],
                            "real_world": "Moutai (600519) price rises — strong brand loyalty means inelastic demand (PED close to zero). Price rises of 20% in 2022-2023 did not significantly reduce sales volume, demonstrating that luxury goods with few substitutes have inelastic demand.",
                            "exam_tip": "Draw clear, labelled diagrams with arrows showing direction of shift. Always label axes P (price) and Q (quantity). Distinguish clearly between shift (change in non-price factor) and movement (change in price).",
                        },
                    ],
                },
                {
                    "id": "igcse_4",
                    "title": "Government Intervention",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Price Controls, Taxes and Subsidies",
                            "body": "A maximum price set below equilibrium creates a shortage (excess demand). A minimum price set above equilibrium creates a surplus (excess supply). An indirect tax shifts supply left, raising price and reducing quantity. A subsidy shifts supply right, lowering price and raising quantity.",
                            "key_terms": ["maximum price", "minimum price", "shortage", "surplus", "indirect tax", "subsidy", "tax incidence"],
                            "real_world": "China's maximum price controls on pork during the 2019 African swine fever outbreak — government released strategic reserves to prevent prices exceeding set maximums, protecting consumers from the 300% price spike caused by the supply shock.",
                            "exam_tip": "For price controls: always draw the diagram, identify shortage or surplus, and explain the consequences. A missing diagram in a price control question typically loses 2-3 marks.",
                        },
                    ],
                },
                {
                    "id": "igcse_5",
                    "title": "Business Economics",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Costs of Production and Economies of Scale",
                            "body": "Fixed costs do not change with output (e.g. rent). Variable costs change with output (e.g. raw materials). Total cost = fixed + variable costs. Average cost = total cost ÷ output. Economies of scale occur as output rises and average cost falls. Diseconomies of scale occur when average costs rise as a firm becomes too large.",
                            "key_terms": ["fixed cost", "variable cost", "average cost", "economies of scale", "diseconomies of scale", "market structure"],
                            "real_world": "BYD (002594) achieved economies of scale in EV battery production — cost per kWh fell from $150 in 2015 to under $60 in 2024 as production scaled up. This cost advantage allowed BYD to undercut competitors and become the world's largest EV maker.",
                            "exam_tip": "Remember: economies of scale lower average costs as output rises; diseconomies of scale raise them. For market structures: know the features of perfect competition, monopoly, and oligopoly.",
                        },
                    ],
                },
            ],
        },
        {
            "id": "igcse_macro",
            "title": "Macroeconomic Topics",
            "topics": [
                {
                    "id": "igcse_6",
                    "title": "Macroeconomic Objectives",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Growth, Inflation, Unemployment and BoP",
                            "body": "Governments aim for: (1) economic growth — rising real GDP; (2) low inflation — stable CPI around 2%; (3) low unemployment — maximising employment; (4) balance of payments equilibrium — avoiding large current account deficits. These objectives often conflict with each other.",
                            "key_terms": ["GDP", "CPI", "unemployment", "balance of payments", "economic growth", "inflation"],
                            "real_world": "China's 5% GDP growth target in 2024 — government balancing growth with inflation control, keeping urban unemployment below 5.5%. The trade-off: faster growth risks higher inflation as AD increases beyond productive capacity.",
                            "exam_tip": "Learn the conflicts between objectives — growth vs inflation is the most commonly tested conflict at IGCSE. A growing economy pulls in imports, worsening the current account — another key conflict.",
                        },
                    ],
                },
                {
                    "id": "igcse_7",
                    "title": "Government Macroeconomic Policy",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Fiscal, Monetary and Supply-Side Policy",
                            "body": "Fiscal policy: changing government spending (G) and taxation (T) to influence AD. Expansionary = increase G or cut T; contractionary = cut G or raise T. Monetary policy: changing interest rates to influence borrowing and spending. Lower rates → more borrowing → higher AD. Supply-side policy: improving the economy's productive capacity through education, infrastructure, and deregulation.",
                            "key_terms": ["fiscal policy", "monetary policy", "supply-side policy", "interest rate", "government spending", "taxation"],
                            "real_world": "PBOC interest rate cuts in 2023-2024 to stimulate the slowing Chinese economy — classic expansionary monetary policy. Lower rates reduced mortgage and business loan costs, aiming to boost consumption and investment.",
                            "exam_tip": "Know the difference between fiscal and monetary policy clearly — confusing them loses easy marks. Fiscal = government budget (spending and tax). Monetary = interest rates and money supply (set by central bank).",
                        },
                    ],
                },
                {
                    "id": "igcse_8",
                    "title": "International Trade and Globalisation",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Comparative Advantage, Free Trade and Exchange Rates",
                            "body": "Comparative advantage: a country should specialise where it has the lowest opportunity cost, not necessarily where it is best absolutely. Free trade increases global output through specialisation. Protectionism (tariffs, quotas, subsidies) restricts trade to protect domestic industries. Exchange rate depreciation makes exports cheaper and imports more expensive.",
                            "key_terms": ["comparative advantage", "free trade", "protectionism", "tariff", "quota", "exchange rate", "depreciation", "appreciation"],
                            "real_world": "China-US trade war tariffs (2018-present) — US tariffs on Chinese goods up to 145% illustrate protectionism. China retaliates with its own tariffs. Despite tensions, over $600bn in annual trade continues, showing interdependence and comparative advantage at work.",
                            "exam_tip": "Comparative advantage: always calculate opportunity costs to determine who has it — do not use absolute advantage. Show the calculation: Country A gives up X units of Y to produce one unit of Z.",
                        },
                    ],
                },
            ],
        },
    ],
}


# ── AP Macroeconomics Curriculum ──────────────────────────────────────────────

AP_CURRICULUM = {
    "exam": "AP Macroeconomics",
    "board": "College Board",
    "papers": [
        {
            "id": "ap_units",
            "title": "AP Macroeconomics Units",
            "topics": [
                {
                    "id": "ap_1",
                    "title": "Basic Economic Concepts",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Scarcity, Trade-offs, PPC and Comparative Advantage",
                            "body": "Scarcity forces trade-offs, represented by the Production Possibilities Curve (PPC). The PPC shows all efficient output combinations of two goods. Points on the curve are efficient; inside = underutilisation; outside = currently unattainable. Absolute advantage: producing more output. Comparative advantage: producing at lower opportunity cost. Countries gain from specialising where they have comparative advantage and trading.",
                            "key_terms": ["scarcity", "trade-off", "PPC", "opportunity cost", "absolute advantage", "comparative advantage", "specialisation"],
                            "real_world": "US-China comparative advantage — US specialises in technology and financial services, China in manufacturing. Over $600bn in bilateral trade despite political tensions demonstrates the gains from comparative advantage, even when political relations are strained.",
                            "exam_tip": "AP free-response questions always require a correctly labelled graph — practice drawing PPC, AD/AS, money market, and loanable funds graphs until automatic. A mislabelled axis costs points on every question.",
                        },
                    ],
                },
                {
                    "id": "ap_2",
                    "title": "Economic Indicators and Business Cycle",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "GDP, Unemployment, Inflation and the Business Cycle",
                            "body": "GDP (expenditure approach) = C + I + G + NX. Nominal GDP uses current prices; real GDP adjusts for inflation using the GDP deflator (Real GDP = Nominal GDP / GDP Deflator × 100). Unemployment types: frictional (between jobs), structural (skills mismatch), cyclical (due to recession). CPI measures inflation from a consumer basket. Business cycle: expansion → peak → contraction → trough.",
                            "key_terms": ["GDP", "nominal GDP", "real GDP", "GDP deflator", "frictional unemployment", "structural unemployment", "cyclical unemployment", "CPI", "business cycle"],
                            "real_world": "US recession in 2020 — GDP fell 3.4%, unemployment hit 14.7% in April 2020, illustrating cyclical unemployment. China avoided recession (GDP +2.3%) due to aggressive fiscal stimulus, providing a valuable comparative case study.",
                            "exam_tip": "Know the difference between nominal and real GDP. AP always asks you to calculate real GDP using the GDP deflator formula: Real GDP = (Nominal GDP ÷ GDP Deflator) × 100. Memorise this formula.",
                        },
                    ],
                },
                {
                    "id": "ap_3",
                    "title": "National Income and Price Determination",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "AD-AS Model, Multiplier and Fiscal Policy",
                            "body": "The AD-AS model shows macroeconomic equilibrium at the intersection of aggregate demand and aggregate supply. Spending multiplier = 1 / (1 - MPC) = 1 / MPS. Expansionary fiscal policy (increase G or cut taxes) shifts AD right, raising output and price level. Contractionary fiscal policy reduces AD. Crowding out: government borrowing increases interest rates, reducing private investment.",
                            "key_terms": ["AD", "SRAS", "LRAS", "multiplier", "MPC", "MPS", "fiscal policy", "recessionary gap", "inflationary gap", "crowding out"],
                            "real_world": "US CARES Act 2020 — $2.2 trillion stimulus, one of the largest fiscal expansions in history. Keynesians argued for a large multiplier effect; critics worried about crowding out and future debt burdens. GDP recovered by Q4 2020, suggesting the multiplier was positive.",
                            "exam_tip": "Recessionary gap: AD shifts left, output below full employment. Draw leftward AD shift, show new equilibrium below potential output. Policy response: shift AD right with fiscal stimulus. Always label the output gap on your diagram.",
                        },
                    ],
                },
                {
                    "id": "ap_4",
                    "title": "Financial Sector",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Money, Banking and Monetary Policy",
                            "body": "M1 = currency + demand deposits (most liquid). M2 = M1 + savings accounts + small time deposits. Banks create money through the money multiplier: 1 / reserve requirement. The Federal Reserve conducts monetary policy through: (1) open market operations — buying bonds increases money supply; (2) discount rate; (3) reserve requirements. The money market diagram shows the demand for money (downward sloping) and supply of money (vertical, controlled by Fed).",
                            "key_terms": ["M1", "M2", "money multiplier", "reserve requirement", "open market operations", "federal funds rate", "discount rate", "money market", "loanable funds"],
                            "real_world": "Fed's 2022-2023 rate hike cycle — raised federal funds rate from 0.25% to 5.5% to combat 9.1% CPI inflation. Impact on A-shares: RMB depreciated against dollar, capital outflows increased, A-share valuations came under pressure as global risk appetite fell.",
                            "exam_tip": "Three monetary policy tools: open market operations (most important for AP exam), discount rate, reserve requirements. Buying bonds → money supply increases → interest rates fall → investment and consumption rise → AD increases.",
                        },
                    ],
                },
                {
                    "id": "ap_5",
                    "title": "Long-Run Consequences of Stabilisation Policies",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Phillips Curve and Inflation Expectations",
                            "body": "The short-run Phillips curve (SRPC) shows an inverse relationship between inflation and unemployment. The long-run Phillips curve (LRPC) is vertical at the natural rate of unemployment (NAIRU) — there is no long-run trade-off. Stagflation (high inflation + high unemployment) shifts SRPC right. Inflation expectations shift the SRPC: higher expected inflation shifts SRPC upward.",
                            "key_terms": ["Phillips curve", "SRPC", "LRPC", "NAIRU", "natural rate of unemployment", "stagflation", "inflation expectations"],
                            "real_world": "US stagflation 1970s vs 2022 — both periods showed the breakdown of the trade-off between unemployment and inflation. In 2022, the Fed chose to prioritise inflation control over employment (contractionary monetary policy), accepting higher short-term unemployment to shift SRPC back left.",
                            "exam_tip": "Long-run Phillips curve is vertical at the natural rate of unemployment. Stagflation shifts SRAS left on the AD-AS diagram AND shifts SRPC right on the Phillips curve diagram — draw both for full credit on essay questions.",
                        },
                    ],
                },
                {
                    "id": "ap_6",
                    "title": "Open Economy: International Trade and Finance",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Balance of Payments and Exchange Rates",
                            "body": "The balance of payments records all transactions between a country and the rest of the world. Current account includes trade in goods and services. Capital/financial account includes investment flows. Current account + capital account = 0 (they must balance). Exchange rates are determined by supply and demand for currencies. Appreciation: currency becomes more valuable. Depreciation: currency becomes less valuable.",
                            "key_terms": ["current account", "capital account", "balance of payments", "exchange rate", "appreciation", "depreciation", "net exports"],
                            "real_world": "US current account deficit — US imports far more than it exports (deficit around $900bn in 2023). China runs the opposite surplus. Capital account flows finance the US deficit through Chinese purchase of US Treasury bonds — demonstrating the current account and capital account balance identity.",
                            "exam_tip": "Current account + capital account = 0. If current account is in deficit, capital account must be in surplus — foreign investment is financing the deficit. Draw both the foreign exchange market and loanable funds market when answering balance of payments questions.",
                        },
                    ],
                },
            ],
        },
    ],
}


# ── IB Economics Curriculum ───────────────────────────────────────────────────

IB_CURRICULUM = {
    "exam": "IB Economics SL/HL",
    "board": "International Baccalaureate",
    "papers": [
        {
            "id": "ib_micro",
            "title": "Microeconomics",
            "topics": [
                {
                    "id": "ib_1",
                    "title": "Introduction to Economics",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "Scarcity, Economic Systems and PPC",
                            "body": "Economics studies how societies allocate scarce resources among unlimited wants. Economic systems: free market (price mechanism allocates resources), planned economy (government central planning), mixed economy (combination). The PPC illustrates scarcity, choice, opportunity cost, and economic growth. Points inside PPC = productive inefficiency; points on PPC = productive efficiency; movement along PPC = opportunity cost; outward shift = economic growth.",
                            "key_terms": ["scarcity", "opportunity cost", "PPC", "free market", "planned economy", "mixed economy", "productive efficiency"],
                            "real_world": "China's mixed economy model — 'socialism with Chinese characteristics' combines state planning (SOEs in strategic sectors like energy and banking) with market mechanisms (private sector generates 60% of GDP). This hybrid approach has delivered 30 years of 8%+ growth.",
                            "exam_tip": "IB Paper 1 requires essay responses with diagrams. Always integrate theory, diagram, and real-world example in every paragraph. The standard IB essay structure: define → explain with diagram → apply real-world example → evaluate.",
                        },
                    ],
                },
                {
                    "id": "ib_2",
                    "title": "Demand, Supply and Elasticity",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Market Equilibrium and Price Elasticities",
                            "body": "Markets reach equilibrium where quantity demanded equals quantity supplied. Consumer surplus = area above price and below demand curve. Producer surplus = area below price and above supply curve. Price elasticity of demand (PED) = % ΔQd / % ΔP. Price elasticity of supply (PES) = % ΔQs / % ΔP. Income elasticity of demand (YED) > 0 for normal goods, < 0 for inferior goods, > 1 for luxury goods. Cross-price elasticity (XED) > 0 for substitutes, < 0 for complements.",
                            "key_terms": ["equilibrium", "consumer surplus", "producer surplus", "PED", "PES", "YED", "XED", "normal good", "inferior good", "luxury good", "substitute", "complement"],
                            "real_world": "China's lithium market — surge in EV demand (YED > 1 for lithium as EV incomes rise) caused lithium prices to spike 10x in 2021-2022, then crash 80% as supply caught up. Ganfeng Lithium (002460) stock followed this cycle precisely, illustrating how elasticity determines market dynamics.",
                            "exam_tip": "IB requires evaluation — after explaining a concept, always assess its limitations or conditions under which it may not hold. For example: 'PED is elastic in the long run as consumers find substitutes, but inelastic in the short run due to habit and limited information.'",
                        },
                    ],
                },
                {
                    "id": "ib_3",
                    "title": "Government Intervention and Market Failure",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Externalities, Public Goods and Government Policies",
                            "body": "Market failure occurs when the free market fails to allocate resources efficiently. Negative externalities: MSC > MPC → overproduction (e.g. pollution). Positive externalities: MSB > MPB → underproduction (e.g. education). Public goods: non-rival and non-excludable → free-rider problem. Government responses: Pigouvian taxes, subsidies, regulation, tradeable permits. Government failure can also occur when intervention makes things worse.",
                            "key_terms": ["market failure", "externality", "MSC", "MSB", "public good", "free-rider", "Pigouvian tax", "tradeable permits", "government failure"],
                            "real_world": "China's ETS (Emissions Trading System) launched 2021 — world's largest carbon market, covering 2,200+ power plants. Designed to internalise negative externalities of CO2 emissions through carbon pricing. Initial carbon price ~55 yuan/tonne, aiming to shift production towards cleaner technology.",
                            "exam_tip": "For market failure questions: identify the type of failure, explain why the market fails (MSC vs MPC divergence), recommend a government policy, then evaluate policy limitations. IB rewards this full chain of analysis.",
                        },
                    ],
                },
            ],
        },
        {
            "id": "ib_macro",
            "title": "Macroeconomics",
            "topics": [
                {
                    "id": "ib_4",
                    "title": "Measuring Economic Activity",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "GDP Measurement and Limitations",
                            "body": "GDP can be measured via expenditure (C+I+G+NX), income, or output methods. Real GDP adjusts for inflation; nominal does not. The business cycle shows GDP fluctuating around trend growth through expansion, peak, contraction, and trough. Limitations of GDP as welfare measure: ignores income distribution (Gini coefficient), environmental degradation, non-market production (household work), quality of life, and HDI dimensions.",
                            "key_terms": ["GDP", "real GDP", "business cycle", "Gini coefficient", "HDI", "Human Development Index", "welfare"],
                            "real_world": "China's GDP growth vs quality of life — nominal GDP grew 100x since 1990, but the Gini coefficient rose from 0.28 to 0.47, showing GDP growth does not automatically improve welfare distribution. China's HDI improved significantly, but inequality means not all citizens benefited equally.",
                            "exam_tip": "IB HL requires knowledge of HDI (Human Development Index) as alternative to GDP. HDI includes life expectancy, education index, and GNI per capita. For Paper 1 evaluation: GDP overstates welfare if growth comes with high inequality.",
                        },
                    ],
                },
                {
                    "id": "ib_5",
                    "title": "Aggregate Demand and Supply",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "AD-AS, Keynesian vs Monetarist and the Multiplier",
                            "body": "AD = C + I + G + NX, slopes downward due to wealth, interest rate, and international substitution effects. SRAS slopes upward (sticky wages short-run). LRAS is vertical at full employment (monetarist) or potentially at any level of output (Keynesian). The Keynesian multiplier: an initial increase in spending generates multiple rounds of income and further spending. Multiplier = 1/(1-MPC).",
                            "key_terms": ["AD", "SRAS", "LRAS", "Keynesian", "monetarist", "multiplier", "MPC", "MPS", "inflationary gap", "deflationary gap"],
                            "real_world": "China's 4 trillion yuan stimulus in 2008-2009 — massive AD boost through government spending on infrastructure. Rapid recovery but also contributed to debt and overcapacity in steel and construction sectors, illustrating the Keynesian debate between multiplier benefits and long-term structural costs.",
                            "exam_tip": "Keynesian view: LRAS is not vertical — economy can be stuck in equilibrium below full employment. Monetarist view: LRAS is vertical, markets self-correct in the long run. Know both views for IB essays — examiners want you to present and evaluate both.",
                        },
                    ],
                },
                {
                    "id": "ib_6",
                    "title": "Fiscal and Monetary Policy",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Policy Tools, Transmission and Conflicts",
                            "body": "Fiscal policy: government adjusts spending (G) and taxes (T) to influence AD. Monetary policy transmission: central bank changes interest rate → borrowing costs change → investment and consumption change → AD shifts → output and price level adjust. Supply-side policies shift LRAS right through improving factor productivity. Policy conflicts: targeting low inflation may require higher unemployment; growth may worsen current account.",
                            "key_terms": ["fiscal policy", "monetary policy", "supply-side policy", "transmission mechanism", "crowding out", "time lag", "policy conflict"],
                            "real_world": "PBOC vs Federal Reserve divergence 2022-2024 — Fed raised rates aggressively (0.25% to 5.5%), PBOC cut rates to stimulate. This divergence caused significant RMB depreciation and capital flows, affecting A-share valuations and raising import costs for Chinese manufacturers.",
                            "exam_tip": "Always evaluate policy with 'however' paragraphs — time lags, political constraints, crowding out, inflation expectations. IB rewards balanced analysis. A policy evaluation without limitations receives a maximum of 7/10 marks.",
                        },
                    ],
                },
            ],
        },
        {
            "id": "ib_international",
            "title": "International Economics",
            "topics": [
                {
                    "id": "ib_7",
                    "title": "International Trade",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Comparative Advantage, Terms of Trade and Trade Protection",
                            "body": "Comparative advantage: specialise where opportunity cost is lowest — even if one country is better at everything, both gain from trade. Terms of trade = (index of export prices / index of import prices) × 100. Trade protection tools: tariffs (tax on imports), quotas (quantity limit), subsidies to domestic producers, administrative barriers. Free trade vs protectionism debate involves efficiency vs equity, growth vs employment.",
                            "key_terms": ["comparative advantage", "terms of trade", "tariff", "quota", "subsidy", "protectionism", "free trade", "infant industry", "RCEP"],
                            "real_world": "RCEP (Regional Comprehensive Economic Partnership) signed 2020 — world's largest free trade agreement, covering 15 Asia-Pacific nations. China, Japan, South Korea, and ASEAN nations reduce tariffs, promoting trade based on comparative advantage within the region.",
                            "exam_tip": "IB requires evaluation of free trade — benefits (efficiency, lower prices, growth, consumer surplus) vs costs (structural unemployment, income inequality, loss of infant industries, environmental concerns). Present both sides before reaching a nuanced conclusion.",
                        },
                    ],
                },
                {
                    "id": "ib_8",
                    "title": "Exchange Rates and Balance of Payments",
                    "estimated_time": "25 min",
                    "sections": [
                        {
                            "heading": "Exchange Rate Systems, BoP and J-Curve",
                            "body": "Floating exchange rate: determined by market forces (supply and demand for currency). Fixed exchange rate: government pegs currency to another. Managed float: central bank intervenes occasionally. Balance of payments: current account (goods, services, income, transfers) + capital and financial account = 0. Marshall-Lerner condition: depreciation improves current account if |PED exports| + |PED imports| > 1. J-curve: current account worsens before improving after depreciation.",
                            "key_terms": ["floating exchange rate", "fixed exchange rate", "managed float", "current account", "capital account", "Marshall-Lerner condition", "J-curve", "depreciation"],
                            "real_world": "China's managed float system — RMB is not freely floating; PBOC sets a daily midpoint rate with 2% trading band. This managed system gives China control over export competitiveness while gradually internationalising the RMB. The RMB depreciated 12% vs USD in 2022-2023 as US rates rose.",
                            "exam_tip": "J-curve: after depreciation, current account worsens short-term (existing contracts at old prices) then improves long-term (export volume increases as buyers adjust). Draw the J-shape clearly with 'time' on x-axis and 'current account balance' on y-axis.",
                        },
                    ],
                },
                {
                    "id": "ib_9",
                    "title": "Development Economics",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Measuring Development and Strategies for Growth",
                            "body": "Development goes beyond GDP: HDI (Human Development Index) captures life expectancy, education, and income. Gini coefficient measures inequality (0 = perfect equality, 1 = perfect inequality). Development strategies: export-led growth (East Asian model), import substitution industrialisation, foreign aid, FDI attraction, microfinance. Each has advantages and limitations depending on the country's context.",
                            "key_terms": ["HDI", "Gini coefficient", "export-led growth", "import substitution", "foreign aid", "FDI", "microfinance", "development"],
                            "real_world": "China's Belt and Road Initiative — $1 trillion infrastructure investment across 140+ countries. Debate: development aid and connectivity vs debt trap diplomacy. BRI illustrates all development strategies simultaneously: FDI flows, infrastructure investment, trade promotion, and geopolitical influence.",
                            "exam_tip": "IB HL requires depth on development — know at least 3 development strategies with real country examples and evaluation. China's model (state-led export-led growth) is different from the Washington Consensus (free market, privatisation) — discuss both and evaluate which is more appropriate for different contexts.",
                        },
                    ],
                },
            ],
        },
    ],
}


# ── Stock Market Basics Curriculum ───────────────────────────────────────────

STOCKS_CURRICULUM = {
    "exam": "股票知识入门 / Stock Market Basics",
    "board": "零基础入门",
    "papers": [
        {
            "id": "stocks_foundation",
            "title": "股票基础 / Stock Fundamentals",
            "topics": [
                {
                    "id": "stocks_1",
                    "title": "什么是股票 / What is a Stock?",
                    "title_en": "What is a Stock?",
                    "estimated_time": "15 min",
                    "sections": [
                        {
                            "heading": "股票的定义与上市原因",
                            "heading_en": "What is a Stock & Why Companies Go Public",
                            "body": "股票是公司所有权的凭证。公司把所有权分成若干等份出售，每一份就是一股。买了股票就成为公司的股东，拥有公司的一部分。公司上市（IPO）的主要目的是：融资（向公众募集资金用于扩张）、提升知名度和公信力、给早期投资者提供退出机会（变现）。",
                            "body_en": "A stock represents a share of ownership in a company. When a company divides its ownership into small units and sells them to the public, each unit is called a share. Buying shares makes you a shareholder — you own a small piece of the company. Companies go public (IPO) for three main reasons: to raise capital for expansion, to increase brand visibility and credibility, and to give early investors and founders a way to cash out their investments.",
                            "key_terms": ["股票", "股东", "股份", "市值", "上市公司", "IPO"],
                            "real_world": "贵州茅台（600519）总股本约12.56亿股，股价约1500元，总市值约1.9万亿。买1股就拥有茅台约十三亿分之一的所有权。宁德时代2018年上市，IPO募资54亿元，用于扩大动力电池产能，今天市值超过1万亿——这就是上市融资的力量。",
                            "real_world_en": "Kweichow Moutai (600519) has approximately 1.256 billion shares outstanding. At a share price of around 1,500 yuan, its total market capitalisation is approximately 1.9 trillion yuan — buying just 1 share gives you roughly a 1-in-1.26-billion ownership stake. CATL (300750) listed in 2018, raising 5.4 billion yuan in its IPO to expand battery production capacity. Today its market cap exceeds 1 trillion yuan — a massive return for early investors.",
                        },
                        {
                            "heading": "股东的权利",
                            "heading_en": "Shareholder Rights",
                            "body": "作为股东，你拥有三项核心权利：(1) 分红权——公司盈利时可按持股比例获得现金分红；(2) 投票权——在股东大会上对公司重大决策投票，持股越多话语权越大；(3) 剩余财产分配权——公司清算时，债务偿清后剩余资产按持股比例分配。",
                            "body_en": "As a shareholder, you have three key rights: the right to receive dividends (a share of profits distributed in cash), the right to vote at shareholder meetings on important company decisions (more shares = more votes), and the right to receive remaining assets proportionally if the company is ever liquidated.",
                            "key_terms": ["分红", "股东大会", "投票权", "债券", "股权"],
                            "exam_tip": "记住：买股票 = 买公司所有权的一部分，不是借钱给公司（借钱给公司是买债券）。股东承担更高风险，但也享有公司增长的全部收益。",
                            "exam_tip_en": "Remember: buying stock = buying partial ownership of a company. This is fundamentally different from a bond, where you are lending money to the company. Shareholders bear higher risk but also enjoy the full upside of the company's growth.",
                        },
                    ],
                },
                {
                    "id": "stocks_2",
                    "title": "A股市场基础 / A-Share Market Basics",
                    "title_en": "A-Share Market Basics",
                    "estimated_time": "15 min",
                    "sections": [
                        {
                            "heading": "A股是什么 + 股票代码怎么看",
                            "heading_en": "What are A-Shares & How to Read Stock Codes",
                            "body": "A股是指在中国大陆（上海、深圳交易所）上市、以人民币计价交易的股票。股票代码为6位数字，前两位区分市场：60xxxx = 沪市主板；00xxxx = 深市主板；30xxxx = 创业板（成长型企业）；688xxx = 科创板（科技创新企业）；北交所代码以8开头。",
                            "body_en": "A-shares are stocks listed on mainland China's stock exchanges (Shanghai and Shenzhen), denominated in Chinese yuan (RMB). Chinese stock codes are 6 digits — the first two tell you which market: 60xxxx = Shanghai Main Board, 00xxxx = Shenzhen Main Board, 30xxxx = ChiNext Board (growth companies), 688xxx = STAR Market (high-tech companies).",
                            "key_terms": ["A股", "上交所", "深交所", "科创板", "创业板", "主板", "股票代码"],
                            "real_world": "600519 = 贵州茅台（沪市主板）；000858 = 五粮液（深市主板）；300750 = 宁德时代（创业板）；688981 = 中芯国际（科创板）。看到代码前缀就知道在哪个市场上市。",
                            "real_world_en": "600519 = Kweichow Moutai (Shanghai Main Board), 000858 = Wuliangye (Shenzhen Main Board), 300750 = CATL (ChiNext Board), 688981 = SMIC (STAR Market). Once you know the code structure, you can instantly identify which exchange and board a stock belongs to.",
                        },
                        {
                            "heading": "交易时间与规则",
                            "heading_en": "Trading Hours & Rules",
                            "body": "A股交易时间：周一至周五，上午 9:30-11:30，下午 13:00-15:00，法定节假日休市。不同于加密货币的7×24小时交易，A股有严格的交易时间窗口。集合竞价：开盘前9:15-9:25和收盘前15分钟，用于确定开盘/收盘价格。",
                            "body_en": "A-shares trade Monday to Friday in two sessions: morning 9:30am–11:30am and afternoon 1:00pm–3:00pm (Beijing time). Markets close on Chinese public holidays. Unlike cryptocurrency, A-shares are NOT 24-hour markets. The opening call auction (9:15–9:25am) determines the opening price through a matching process.",
                            "key_terms": ["交易时间", "集合竞价", "连续竞价", "休市"],
                            "exam_tip": "A股不是24小时交易的——这和加密货币完全不同。记住两个时间段：上午9:30-11:30，下午13:00-15:00。港股（18:00）和美股（美东时间9:30-16:00）时间不同，注意区分。",
                            "exam_tip_en": "A-shares are NOT 24-hour markets like cryptocurrency. Always check if the market is open before placing orders. Pre-market orders are placed during the opening call auction (9:15–9:25am). Also note: Hong Kong stocks close at 4pm HKT, US stocks trade 9:30am–4:00pm Eastern Time.",
                        },
                    ],
                },
                {
                    "id": "stocks_3",
                    "title": "如何看懂股价 / Understanding Stock Prices",
                    "title_en": "Understanding Stock Prices",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "K线图基础与涨跌幅计算",
                            "heading_en": "Candlestick Charts & How to Calculate Price Change",
                            "body": "K线图（蜡烛图）是分析股价最常用的工具。每根K线代表一段时间内的四个价格：开盘价、收盘价、最高价、最低价。阳线（红色/白色实体）= 收盘价高于开盘价，当天上涨。阴线（绿色/黑色实体）= 收盘价低于开盘价，当天下跌。影线（细线）代表最高价和最低价的范围。涨跌幅公式：(今日收盘价 - 昨日收盘价) ÷ 昨日收盘价 × 100%。",
                            "body_en": "A candlestick (K-line) chart shows four prices per time period: opening price, closing price, highest price, and lowest price. A red (bullish) candle means closing price > opening price — the stock rose. A green (bearish) candle means it fell. The thin wicks above and below the body show the full price range. Daily change % = (Today's close − Yesterday's close) ÷ Yesterday's close × 100%.",
                            "key_terms": ["K线", "阳线", "阴线", "开盘价", "收盘价", "最高价", "最低价", "影线", "涨跌幅"],
                            "real_world": "以贵州茅台某天K线为例：开盘1480，收盘1520，最高1535，最低1475。红色实体代表上涨，上影线（1520→1535）代表尾盘回落，下影线（1475→1480）代表开盘短暂走低后反弹。涨幅计算：假设昨日收盘1500，今日1520，涨幅 = (1520-1500)/1500 × 100% = +1.33%。",
                            "real_world_en": "Moutai on a typical day: opens at 1,480, hits a high of 1,535, falls to a low of 1,475, closes at 1,520. This forms a red bullish candle with a long upper shadow (resistance at the top) and short lower shadow. Price change: if yesterday's close was 1,500 and today's is 1,530, the change = (1,530 − 1,500) / 1,500 × 100% = +2.0%.",
                        },
                        {
                            "heading": "涨跌停板制度",
                            "heading_en": "A-Share Price Limits (Limit Up / Limit Down)",
                            "body": "A股独有的涨跌停板制度：主板每天最多涨10%或跌10%；创业板、科创板是±20%；ST（风险警示）股是±5%。涨停时买盘大量堆积，流动性极差，很难买入。跌停时卖盘堆积，可能卖不出去——这是A股特有的流动性风险。",
                            "body_en": "A-shares have daily price movement limits unique to this market: Main Board stocks can only move ±10% per day. ChiNext and STAR Market stocks can move ±20%. ST (Special Treatment) stocks — companies with financial problems — are limited to ±5%. When a stock hits limit up, a large queue of buyers forms and it becomes nearly impossible to buy. When it hits limit down, sellers cannot exit — a major liquidity risk unique to A-shares.",
                            "key_terms": ["涨停", "跌停", "涨跌停板", "ST股", "流动性"],
                            "real_world": "2023年某科技概念股因AI利好消息连续多日涨停，普通投资者根本买不进去。等到开板那天大量卖盘涌出，当天跌停——这说明涨停不代表第二天继续涨，主力可能在涨停时已经挂出卖单（假涨停）。",
                            "real_world_en": "In 2023, several AI concept stocks hit the limit up for multiple consecutive days following the ChatGPT buzz. Retail investors could not buy in. When the stocks finally 'opened' (unlocked), massive sell orders flooded the market and many hit limit down the same day — illustrating that limit up does not guarantee continued gains.",
                            "exam_tip": "涨停不代表第二天继续涨。观察涨停时的封单（买单）大小和资金来源，才能判断是真实强势还是主力出货。",
                            "exam_tip_en": "A stock hitting limit up does NOT mean it will keep rising tomorrow. Large institutional investors sometimes use limit up to attract retail buyers before selling their own positions. Always investigate the fundamental reason behind unusual price moves before acting.",
                        },
                    ],
                },
                {
                    "id": "stocks_4",
                    "title": "看懂财务指标 / Key Financial Metrics",
                    "title_en": "Key Financial Metrics",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "市盈率 P/E 与市净率 P/B",
                            "heading_en": "P/E Ratio and P/B Ratio",
                            "body": "市盈率 P/E = 股价 ÷ 每股收益（EPS）。衡量你为每1元利润支付了多少钱。PE=20意味着按当前盈利需要20年回本。市净率 P/B = 股价 ÷ 每股净资产。P/B<1称为「破净」，意味着股价低于账面价值，市场认为资产质量有问题或未来盈利不足。",
                            "body_en": "P/E (Price-to-Earnings) ratio = Stock Price ÷ Earnings Per Share (EPS). It tells you how much you pay for each yuan of annual profit. A P/E of 20 means you pay 20 yuan per 1 yuan of earnings — at current profitability, 20 years to recoup the investment. P/B (Price-to-Book) ratio = Stock Price ÷ Book Value Per Share. A P/B below 1 ('trading below book') means the stock is valued below its net accounting assets, suggesting the market doubts future profitability.",
                            "key_terms": ["PE", "市盈率", "EPS", "每股收益", "PB", "市净率", "净资产", "破净"],
                            "real_world": "贵州茅台PE约30倍，银行股PE约5-6倍。白酒PE高因为增长预期高、护城河深；银行PE低因为增长慢、不良资产风险存在。2023年多家银行股P/B跌破1（如工商银行601398的P/B约0.5），反映市场对银行资产质量的担忧。不同行业PE不能直接比较。",
                            "real_world_en": "Kweichow Moutai trades at ~30x P/E while major banks trade at 5–6x P/E. Moutai commands a premium because of high expected growth and a deep competitive moat. In 2023, ICBC (601398) traded at P/B of ~0.5x — meaning the market valued it at half its accounting net assets, reflecting concerns about loan quality. Never compare P/E ratios across different industries.",
                        },
                        {
                            "heading": "股息率",
                            "heading_en": "Dividend Yield",
                            "body": "股息率 = 每股年分红 ÷ 当前股价 × 100%。反映持有股票的现金回报率，类似债券的票息率。股息率高的股票（通常>3%）吸引追求稳定现金流的价值投资者，在低利率环境下尤其受欢迎。",
                            "body_en": "Dividend yield = Annual Dividend Per Share ÷ Stock Price × 100%. It measures the cash return you receive relative to the share price — similar to an interest rate on your investment. Stocks with high dividend yields (typically >3%) attract income-focused investors, especially appealing when bank deposit rates are low.",
                            "key_terms": ["股息率", "分红", "现金流", "价值投资"],
                            "real_world": "长江电力（600900）股息率约3-4%，高于国内银行存款利率，吸引大量长期价值投资者持有。中国神华（601088）股息率有时超过7%，接近高收益债券水平，被称为「现金奶牛」。",
                            "real_world_en": "Yangtze Power (600900) consistently offers a dividend yield of 3–4%, higher than Chinese bank deposit rates, attracting long-term income investors. China Shenhua Energy (601088) has at times paid dividend yields above 7%, comparable to high-yield bonds, earning it the nickname 'cash cow'.",
                            "exam_tip": "高PE不一定贵，低PE不一定便宜。要结合行业属性、增长速度、商业模式护城河综合判断。成长股高PE可能合理，周期股低PE可能在景气高点反而是陷阱（周期性盈利虚高）。",
                            "exam_tip_en": "High P/E is not always expensive; low P/E is not always cheap. Always consider growth prospects, industry dynamics, and the quality of the business model. A high P/E for a fast-growing company may be justified; a low P/E for a cyclical company at its earnings peak can be a value trap.",
                        },
                    ],
                },
            ],
        },
        {
            "id": "stocks_advanced",
            "title": "投资思维 / Investment Thinking",
            "topics": [
                {
                    "id": "stocks_5",
                    "title": "什么影响股价 / What Moves Stock Prices",
                    "title_en": "What Moves Stock Prices",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "基本面与宏观经济因素",
                            "heading_en": "Fundamental & Macroeconomic Factors",
                            "body": "基本面因素：公司业绩（营收增长、净利润）是股价最根本的长期驱动力。业绩超预期→股价上涨；业绩不及预期→股价下跌。宏观经济因素：利率（央行降息→资金成本降低→股市受益）、通胀、GDP增速、产业政策（补贴、监管）等都直接影响上市公司盈利预期。",
                            "body_en": "A company's stock price is ultimately driven by its business performance: revenue growth, profit margins, and earnings per share. Strong earnings beats push prices up; misses push them down. At the macro level, interest rates, inflation, GDP growth, and government policy all affect stock valuations. Lower interest rates reduce borrowing costs and increase the present value of future earnings, pushing stock prices up.",
                            "key_terms": ["基本面", "业绩预期", "营收", "净利润", "利率", "货币政策", "产业政策"],
                            "real_world": "2023年贵州茅台发布业绩报告，营收同比增长18%，净利润同比增长19%，超出市场预期，股价当日上涨3%。2024年9月中国央行降准降息，叠加一系列楼市和股市刺激政策，上证指数单周暴涨超10%——宏观政策可以在短期内主导市场走向。",
                            "real_world_en": "When Moutai released its 2023 results showing 18% revenue growth and 19% net profit growth — both beating expectations — the stock rose 3% on the day. In September 2024, China's PBOC cut rates and announced a broad stimulus package: the Shanghai Composite surged over 10% in a single week, showing how powerful macro policy can be in the short term.",
                        },
                        {
                            "heading": "市场情绪因素",
                            "heading_en": "Market Sentiment",
                            "body": "短期股价受市场情绪显著影响：新闻舆情（正面→买入情绪，负面→卖出情绪）、北向资金流向（外资买入通常被视为利好信号）、散户情绪（群体非理性行为）、技术面信号（均线、量能等）。情绪驱动的行情往往与基本面无关，持续时间短但波动大。",
                            "body_en": "In the short term, stock prices are heavily driven by investor sentiment: news flow (positive → buy pressure, negative → sell pressure), northbound capital flows (foreign money entering A-shares via Stock Connect, viewed as a bullish signal), retail investor herding behaviour, and technical signals. Sentiment-driven rallies are often disconnected from business fundamentals and tend to reverse sharply.",
                            "key_terms": ["市场情绪", "北向资金", "技术面", "舆情", "羊群效应"],
                            "real_world": "2023年ChatGPT爆火，A股AI概念股集体涨停，部分股票3个月涨幅超300%——这与公司实际AI业务贡献无关，纯属情绪驱动。同年AI概念股整体回调50-70%，情绪退潮后回归基本面。",
                            "real_world_en": "When ChatGPT launched in late 2022, A-share AI concept stocks surged dramatically. Some stocks rose over 300% in three months with no change in actual AI business revenue — pure sentiment-driven speculation. By year-end 2023, most AI concept stocks had fallen 50–70% from their peaks as sentiment faded and fundamentals reasserted themselves.",
                            "exam_tip": "短期股价 = 基本面 + 情绪；长期股价 ≈ 基本面。价值投资者关注长期基本面，短线交易者关注短期情绪。两种策略都需要严格纪律，随意切换是亏损的主要原因。",
                            "exam_tip_en": "Short-term price = Fundamentals + Sentiment. Long-term price ≈ Fundamentals. Value investors focus on the long term; traders focus on short-term sentiment. Both strategies require strict discipline — randomly switching between the two is one of the most common causes of retail investor losses.",
                        },
                    ],
                },
                {
                    "id": "stocks_6",
                    "title": "投资 vs 投机 / Investing vs Speculation",
                    "title_en": "Investing vs Speculation",
                    "estimated_time": "20 min",
                    "sections": [
                        {
                            "heading": "价值投资与成长投资",
                            "heading_en": "Value Investing and Growth Investing",
                            "body": "价值投资：寻找被市场低估的优质公司，以低于内在价值的价格买入，长期持有，等待市场发现其真实价值。代表人物：巴菲特、查理·芒格。成长投资：买入高速增长的公司，愿意为未来增长支付高溢价（高PE），重视市场空间和竞争壁垒，而非当前估值。",
                            "body_en": "Value investing means buying high-quality companies that appear undervalued by the market, then holding long-term as the market recognises their true worth. Key figures: Warren Buffett, Charlie Munger. Growth investing means buying companies expected to grow much faster than average, willing to pay premium valuations (high P/E) for future earnings potential, prioritising market opportunity and competitive moat over current price.",
                            "key_terms": ["价值投资", "成长投资", "内在价值", "安全边际", "护城河", "长期持有"],
                            "real_world": "巴菲特1988年买入可口可乐，持有36年，收益超过20倍。A股案例：2012年买入格力电器（000651）长期持有，10年约10倍收益。成长投资案例：2019年买入宁德时代（300750），当时PE超过100倍，3年内股价上涨超10倍，验证了新能源爆发式增长逻辑。",
                            "real_world_en": "Warren Buffett bought Coca-Cola in 1988 and still holds it 36 years later — a return of over 20x. In A-shares, investors who bought Gree Electric (000651) in 2012 and held 10 years saw ~10x returns driven by consistent earnings growth and dividends. CATL (300750) at 100x P/E in 2019 seemed expensive — but EV adoption exploded and the stock rose 10x in 3 years, validating the growth thesis.",
                        },
                        {
                            "heading": "投机与A股散户现实",
                            "heading_en": "Speculation and the Retail Investor Reality",
                            "body": "投机是短期博弈，利用价格波动获利，本质是零和游戏（你赚的是别人亏的）。A股散户（个人投资者）约占交易量的80%，但在与机构的博弈中长期处于劣势：信息不对称、资金量小、情绪化决策。",
                            "body_en": "Speculation involves short-term trading based on price movements rather than business fundamentals — it is essentially a zero-sum game (every gain comes from someone else's loss). Retail investors account for about 80% of A-share trading volume but consistently lose money against institutions due to information asymmetry, smaller capital, and emotional decision-making.",
                            "key_terms": ["投机", "零和游戏", "机构投资者", "散户", "信息不对称"],
                            "real_world": "历史数据显示A股散户约80%在3年内亏损，机构投资者（基金、券商自营等）长期盈利。这是信息不对称、资金规模和专业能力共同造成的结构性差距。这也是为什么建议先充分学习再用真实资金投资。",
                            "real_world_en": "Historical data shows that approximately 80% of A-share retail investors lose money over any 3-year period, while institutional investors (funds, brokerages) consistently profit. This structural gap is caused by information asymmetry, scale advantages, and professional expertise — which is exactly why we built Best Friend Stock: to give students better tools and knowledge before they invest real money.",
                            "exam_tip": "巴菲特名言：「如果你不愿意持有一只股票10年，就不要持有它10分钟。」没有人能持续准确预测短期股价走势。建立长期视角是避免频繁损失的最有效方法。",
                            "exam_tip_en": "Warren Buffett: 'If you are not willing to own a stock for 10 years, do not even think about owning it for 10 minutes.' Nobody can consistently and accurately predict short-term price movements. Building a long-term perspective is the most effective way to avoid repeated losses.",
                        },
                    ],
                },
                {
                    "id": "stocks_7",
                    "title": "如何分散投资 / Diversification",
                    "title_en": "Diversification",
                    "estimated_time": "15 min",
                    "sections": [
                        {
                            "heading": "分散投资原理",
                            "heading_en": "The Principle of Diversification",
                            "body": "「不要把鸡蛋放在一个篮子里」——持有多种不相关资产，可以降低非系统性风险（个别公司或行业的特有风险）。系统性风险（整个市场下跌，如经济衰退、战争）无法通过分散来消除。非系统性风险可以通过分散持有不同行业、不同公司的股票来大幅降低。",
                            "body_en": "'Do not put all your eggs in one basket' — holding multiple uncorrelated assets reduces unsystematic risk (company or sector-specific risk) without necessarily reducing expected returns. Systematic risk (whole market falling due to recession, geopolitical events) cannot be eliminated through diversification. Unsystematic risk can be greatly reduced by holding stocks across different industries and companies.",
                            "key_terms": ["分散投资", "系统性风险", "非系统性风险", "相关性", "投资组合"],
                            "real_world": "2021年教育行业（新东方、好未来）因「双减」政策打压，股价跌幅超80%。如果只持有教育股，损失惨重。同期持有白酒+新能源+银行混合组合的投资者，整体影响有限——这是行业分散的价值。",
                            "real_world_en": "In 2021, Chinese education stocks (New Oriental, TAL Education) fell over 80% due to the government's 'double reduction' policy banning for-profit tutoring. Investors concentrated in education suffered catastrophic losses. Those holding a mix of baijiu + new energy + banks were largely protected — demonstrating the power of sector diversification.",
                        },
                        {
                            "heading": "时间分散（定期定额）",
                            "heading_en": "Time Diversification (Dollar Cost Averaging)",
                            "body": "定期定额投资（DCA，Dollar-Cost Averaging）：每隔固定时间（如每月）投入固定金额，无论市场涨跌都坚持执行。涨时买得少，跌时买得多，长期下来平均成本低于市场平均价格，避免一次性买在高点的风险。",
                            "body_en": "Dollar Cost Averaging (DCA) means investing a fixed amount at regular intervals (e.g. monthly), regardless of market conditions. When prices are high you buy fewer shares; when prices fall you buy more — naturally averaging your cost below the market average. This eliminates the risk of investing a lump sum at a market peak.",
                            "key_terms": ["定期定额", "DCA", "平均成本", "指数基金", "长期投资"],
                            "real_world": "每月固定买入沪深300指数基金1000元，无论涨跌坚持执行。2018-2023年坚持定投的投资者，平均年化收益约8-10%，明显优于大多数择时操作的散户。指数基金+定投是学术界和巴菲特都推荐的个人投资方式。",
                            "real_world_en": "Investing 1,000 yuan per month into a CSI 300 index fund from 2018 to 2023, regardless of market conditions, generated approximately 8–10% annualised returns — significantly better than most retail investors who tried to time the market. Index funds + DCA is the approach recommended by both academic research and Warren Buffett for individual investors.",
                            "exam_tip": "分散投资降低风险，但也降低潜在超额收益。完全分散 ≈ 持有市场平均收益。对于不能投入大量时间研究个股的学生，指数基金+定期定额是最适合的起点。",
                            "exam_tip_en": "Diversification reduces risk but also limits potential excess returns. A fully diversified portfolio earns approximately the market average return. For students who cannot spend significant time researching individual stocks, index funds + DCA is the most appropriate starting point.",
                        },
                    ],
                },
                {
                    "id": "stocks_8",
                    "title": "使用 BFS 分析股票 / Using BFS for Analysis",
                    "title_en": "Using Best Friend Stock for Analysis",
                    "estimated_time": "15 min",
                    "sections": [
                        {
                            "heading": "相似走势 + 新闻舆情功能",
                            "heading_en": "Similar Trends & News Sentiment Features",
                            "body": "相似走势功能：输入一只股票代码，系统自动计算与其历史价格走势最相关的同行股票。如果目标股票和同行同涨同跌，说明是行业性行情（宏观或行业因素驱动）。如果目标股票独立上涨而同行不动，说明是个股独有利好，信号更强。新闻舆情功能：AI自动抓取并分析中英文新闻的情感倾向，快速了解市场对某只股票的整体看法。",
                            "body_en": "The Similar Trends tool finds stocks with highly correlated price movements to your target stock. If the target and its peers rise and fall together, it signals a sector-wide move (driven by macro or industry factors). If the target rises independently while peers stay flat, it suggests company-specific good news — a stronger and cleaner signal. The News Sentiment tool aggregates Chinese and English news about any stock and uses AI to score each article as positive, neutral, or negative, giving you a quick read on market perception.",
                            "key_terms": ["相似走势", "相关性", "行业行情", "个股行情", "舆情分析", "情感分析"],
                            "real_world": "搜索贵州茅台（600519），相似走势通常显示五粮液（000858）、泸州老窖（000568）同步上涨——说明是白酒行业整体性行情，而非茅台个股利好。搜索某科技股时，若相似股票不跟涨，而该股票有正面AI新闻，则个股逻辑更清晰。",
                            "real_world_en": "Search for Moutai (600519) — if Similar Trends shows Wuliangye, Luzhou Laojiao, and Jiannanchun all rising together, it signals a sector-wide baijiu rally rather than a Moutai-specific catalyst. If a tech stock rises while its peers don't, and News Sentiment shows positive AI-related coverage, the individual stock thesis is much clearer and more actionable.",
                        },
                        {
                            "heading": "模拟炒股功能",
                            "heading_en": "Paper Trading Feature",
                            "body": "模拟炒股提供100万虚拟资金，严格执行A股规则：T+1（今天买的股票明天才能卖）、买入手续费0.03%（最低5元）、卖出手续费0.13%（含印花税，最低5元）、每次必须以100股为整数倍买卖。通过模拟交易，在不承担真实亏损风险的情况下，体验A股交易的完整流程和成本结构。",
                            "body_en": "Paper trading gives you 1,000,000 yuan of virtual money under real A-share rules: T+1 settlement (stocks bought today can only be sold tomorrow), buy commission 0.03% (min ¥5), sell commission 0.13% including stamp duty (min ¥5), and trades must be in multiples of 100 shares. Experience the full A-share trading process and cost structure without any real financial risk.",
                            "key_terms": ["T+1", "手续费", "印花税", "模拟交易", "仓位管理"],
                            "real_world": "真实A股手续费示例：买入10万元股票，手续费 = 100,000 × 0.03% = 30元；卖出时手续费 = 100,000 × 0.13% = 130元。来回一次手续费共160元，如果股票只涨了0.1%（100元），反而亏损60元。这说明频繁交易是A股散户亏损的重要原因之一。",
                            "real_world_en": "Real A-share commission example: buy 100,000 yuan of stock, buy commission = 30 yuan. Sell commission = 130 yuan (including stamp duty). Total round-trip cost = 160 yuan. If the stock only rises 0.1% (100 yuan), you actually lose 60 yuan. This is why frequent trading is one of the biggest contributors to retail investor losses — the transaction costs silently drain your returns.",
                            "exam_tip": "建议新手先用模拟炒股至少1-3个月，建立自己的交易框架（选股逻辑、仓位管理、止损原则）和观察市场规律，形成稳定的投资纪律后，再考虑使用真实资金。",
                            "exam_tip_en": "We recommend all beginners spend at least 1–3 months paper trading before investing real money. Use this time to build your investment framework: stock selection logic, position sizing, and stop-loss rules. Track not just your returns but your reasoning for each trade — reflecting on your decisions is how real investors improve.",
                        },
                    ],
                },
            ],
        },
    ],
}


# ── All curricula registry ────────────────────────────────────────────────────

ALL_CURRICULA = {
    "alevel": ALEVEL_CURRICULUM,
    "igcse":  IGCSE_CURRICULUM,
    "ap":     AP_CURRICULUM,
    "ib":     IB_CURRICULUM,
    "stocks": STOCKS_CURRICULUM,
}

# Build per-exam flat topic lookup maps
_TOPIC_MAPS: dict = {key: {} for key in ALL_CURRICULA}
for _exam_key, _curriculum in ALL_CURRICULA.items():
    for _paper in _curriculum["papers"]:
        for _topic in _paper["topics"]:
            _TOPIC_MAPS[_exam_key][_topic["id"]] = _topic


def _slim_curriculum(curriculum: dict) -> dict:
    slim_papers = []
    for paper in curriculum["papers"]:
        slim_topics = []
        for topic in paper["topics"]:
            slim_topics.append({
                "id":             topic["id"],
                "title":          topic["title"],
                "title_en":       topic.get("title_en", topic["title"]),
                "estimated_time": topic["estimated_time"],
                "section_count":  len(topic["sections"]),
            })
        slim_papers.append({
            "id":     paper["id"],
            "title":  paper["title"],
            "topics": slim_topics,
        })
    return {
        "exam":   curriculum["exam"],
        "board":  curriculum["board"],
        "papers": slim_papers,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/curriculum")
def get_curriculum(exam: Optional[str] = None):
    """Return slim curriculum. Pass ?exam=alevel|igcse|ap|ib or omit for all."""
    if exam:
        exam = exam.lower()
        if exam not in ALL_CURRICULA:
            raise HTTPException(status_code=404, detail=f"Exam '{exam}' not found. Valid: alevel, igcse, ap, ib")
        return _slim_curriculum(ALL_CURRICULA[exam])
    # Return all curricula as a list
    return {
        "curricula": [
            {"key": key, **_slim_curriculum(curriculum)}
            for key, curriculum in ALL_CURRICULA.items()
        ]
    }


@router.get("/topic/{exam}/{topic_id}")
def get_topic(exam: str, topic_id: str):
    exam = exam.lower()
    if exam not in _TOPIC_MAPS:
        raise HTTPException(status_code=404, detail=f"Exam '{exam}' not found. Valid: alevel, igcse, ap, ib")
    topic = _TOPIC_MAPS[exam].get(topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found in exam '{exam}'")
    return topic


# Legacy endpoint for backward compatibility
@router.get("/topic/{topic_id}")
def get_topic_legacy(topic_id: str):
    topic = _TOPIC_MAPS["alevel"].get(topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")
    return topic
