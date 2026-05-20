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


# ── All curricula registry ────────────────────────────────────────────────────

ALL_CURRICULA = {
    "alevel": ALEVEL_CURRICULUM,
    "igcse":  IGCSE_CURRICULUM,
    "ap":     AP_CURRICULUM,
    "ib":     IB_CURRICULUM,
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
