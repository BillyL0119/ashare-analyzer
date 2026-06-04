"""
Multi-Exam Economics Study Center — /api/study/*
Supports: A-Level (Cambridge 9708), IGCSE (Cambridge 0455), AP Macroeconomics, AP Microeconomics, IB Economics SL/HL
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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

AP_MACRO_CURRICULUM = {
    "exam": "AP Macroeconomics",
    "board": "College Board",
    "papers": [
        {
            "id": "ap_macro_units",
            "title": "AP Macroeconomics Units",
            "title_en": "AP Macroeconomics Units",
            "topics": [
                {
                    "id": "ap_1",
                    "title": "Basic Economic Concepts",
                    "title_en": "Basic Economic Concepts",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Scarcity, Trade-offs and the PPC",
                            "body": "Scarcity forces every economy to make choices because resources are limited while human wants are unlimited. The Production Possibilities Curve (PPC) illustrates these trade-offs by showing the maximum combinations of two goods an economy can produce when all resources are fully and efficiently employed. Points ON the PPC are productively efficient. Points INSIDE represent unemployed resources or inefficiency. Points OUTSIDE are currently unattainable but can be reached through economic growth. The PPC is concave (bowed out) because of the law of increasing opportunity costs: resources are not perfectly adaptable, so shifting production from one good to another becomes increasingly costly.",
                            "key_terms": ["scarcity", "trade-off", "PPC", "opportunity cost", "productive efficiency", "economic growth", "law of increasing opportunity costs"],
                            "real_world": "During COVID-19 in 2020, the US economy operated inside its PPC as factories shut down and unemployment surged to 14.7%. The $2.2 trillion CARES Act stimulus aimed to push the economy back toward its PPC. Long-run PPC shifts outward through investment in technology and human capital — the US PPC has shifted dramatically rightward since 1950 due to productivity gains.",
                            "exam_tip": "AP free-response always requires correctly labelled graphs. For PPC: label axes with specific goods (not just X and Y), mark efficient points ON the curve, show points inside and outside. Outward PPC shift from technology affects only one end if only one sector benefits — the curve rotates rather than shifts parallel.",
                        },
                        {
                            "heading": "Opportunity Cost and Economic Decision-Making",
                            "body": "Opportunity cost is the value of the next best alternative foregone when a choice is made. It is the true cost of any decision because it captures what must be given up. Economists think at the margin: marginal analysis compares the additional benefit of an action with its additional cost. Rational decision-makers continue an activity as long as marginal benefit exceeds marginal cost and stop when MB = MC. This marginal thinking applies to consumers, firms, and governments alike. Sunk costs — costs already incurred and unrecoverable — should be ignored in future decisions because they cannot be changed.",
                            "key_terms": ["opportunity cost", "marginal analysis", "marginal benefit", "marginal cost", "sunk cost", "rational decision-making", "ceteris paribus"],
                            "real_world": "When the US government spends $1 trillion on defence, the opportunity cost is the infrastructure, healthcare, or education that money could have funded. College students face opportunity cost every day: the true cost of a four-year degree includes not just tuition but the wages foregone by not working full-time. Amazon calculated that the opportunity cost of keeping employees in low-productivity roles justified paying $5,000 to workers who wanted to leave.",
                            "exam_tip": "AP multiple choice frequently presents a table of output and asks for opportunity cost. Always express opportunity cost as a ratio: to produce one more unit of Good A, how many units of Good B must be given up? The country with the lower opportunity cost has comparative advantage in that good. Never sum all foregone alternatives — opportunity cost is only the NEXT BEST alternative.",
                        },
                        {
                            "heading": "Comparative Advantage and Specialisation",
                            "body": "Absolute advantage means producing more output with the same resources. Comparative advantage means producing at a lower opportunity cost. Even if one country is absolutely better at producing everything, both countries gain from trade if each specialises in the good where its opportunity cost is lowest. This is David Ricardo's insight and one of the most powerful results in economics. The terms of trade — the price ratio at which trade occurs — must fall between the two countries' opportunity cost ratios for both parties to gain. Gains from trade arise from specialisation and the resulting expansion of consumption possibilities beyond the domestic PPC.",
                            "key_terms": ["absolute advantage", "comparative advantage", "terms of trade", "specialisation", "gains from trade", "consumption possibilities"],
                            "real_world": "The US has absolute advantage in both software and agricultural products compared to many developing nations, yet it imports vast quantities of both. Bangladesh has comparative advantage in garment manufacturing because its opportunity cost (in terms of foregone alternative production) is very low. This explains over $7 billion in annual US-Bangladesh textile trade. China's comparative advantage shifted from low-skill manufacturing toward higher-tech production as wages rose — illustrating that comparative advantage changes over time.",
                            "exam_tip": "To find comparative advantage: calculate each country's opportunity cost for each good (how much of Good B is given up per unit of Good A). The country with lower opportunity cost for Good A has comparative advantage in A. Acceptable terms of trade must lie between the two opportunity cost ratios. AP free-response commonly asks you to identify the range of acceptable terms of trade — it must be better for both countries than their domestic opportunity costs.",
                        },
                        {
                            "heading": "Economic Systems and the Role of Markets",
                            "body": "All economic systems must answer three fundamental questions: what to produce, how to produce it, and for whom. Market economies answer these through price signals. Command economies use central planning. Mixed economies combine both. In market systems, prices serve as signals and incentives: high prices signal scarcity and attract resources; low prices signal abundance and redirect resources elsewhere. The circular flow model shows how households and firms interact in product markets (households buy goods) and factor markets (households sell labour and capital). Government enters the model as both a buyer and a provider of public services.",
                            "key_terms": ["market economy", "command economy", "mixed economy", "circular flow", "price mechanism", "product market", "factor market", "incentives"],
                            "real_world": "Venezuela's shift toward a command economy after 2013 — price controls on food and medicine created severe shortages as producers could not cover costs at controlled prices. In contrast, post-1978 China gradually introduced market mechanisms into a command economy, achieving remarkable growth. These contrasting examples show how price signals are essential for efficient resource allocation.",
                            "exam_tip": "The circular flow diagram appears on AP exams. Know both the simple two-sector version (households and firms) and the full version including government (G spending and taxes) and the foreign sector (exports and imports). Injections (I + G + X) must equal leakages (S + T + M) in equilibrium. Changes in injections or leakages shift aggregate demand.",
                        },
                    ],
                },
                {
                    "id": "ap_2",
                    "title": "Economic Indicators and Business Cycle",
                    "title_en": "Economic Indicators and Business Cycle",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "Measuring GDP: Approaches and Adjustments",
                            "body": "GDP (Gross Domestic Product) measures the total market value of all final goods and services produced within a country in a given period. The expenditure approach: GDP = C + I + G + NX, where C is consumption, I is investment (including changes in inventories), G is government purchases, and NX is net exports (exports minus imports). The income approach sums all factor incomes (wages, rent, interest, profit). Nominal GDP uses current prices and can rise simply due to inflation. Real GDP adjusts for price changes using the GDP deflator: Real GDP = (Nominal GDP / GDP Deflator) x 100. GDP per capita divides by population to measure average living standards.",
                            "key_terms": ["GDP", "nominal GDP", "real GDP", "GDP deflator", "consumption", "investment", "government purchases", "net exports", "GDP per capita"],
                            "real_world": "US nominal GDP in 2022 was about $25.5 trillion; real GDP (in chained 2017 dollars) was about $20.0 trillion — the difference reflects cumulative inflation. China's nominal GDP reached approximately $18 trillion in 2023, making it the world's second-largest economy. On a purchasing power parity basis, China's GDP exceeds the US because prices of non-traded goods are lower — illustrating why PPP matters for welfare comparisons.",
                            "exam_tip": "Know what is NOT included in GDP: intermediate goods (avoid double-counting), non-market production (home cooking, unpaid childcare), used goods (already counted when new), and purely financial transactions (stock trades). AP multiple choice frequently tests these exclusions. Formula: Real GDP = (Nominal GDP / GDP Deflator) x 100 — if GDP deflator rises from 100 to 125, prices rose 25% and you must divide nominal by 1.25.",
                        },
                        {
                            "heading": "Unemployment: Types, Costs and Measurement",
                            "body": "The unemployment rate = (unemployed / labour force) x 100. The labour force includes employed plus unemployed workers actively seeking work. It excludes discouraged workers (gave up searching), part-time workers who want full-time work, and those not in the labour force. Three main types: frictional unemployment (between jobs or entering the workforce — normal and unavoidable), structural unemployment (skills mismatch due to technological change or industry shifts — requires retraining), and cyclical unemployment (caused by insufficient aggregate demand during recessions — the target of stabilisation policy). The natural rate of unemployment (NRU) = frictional + structural. Full employment means cyclical unemployment is zero, not total unemployment is zero.",
                            "key_terms": ["unemployment rate", "labour force", "frictional unemployment", "structural unemployment", "cyclical unemployment", "natural rate of unemployment", "discouraged workers", "full employment", "underemployment"],
                            "real_world": "US unemployment hit 14.7% in April 2020 — almost entirely cyclical, caused by COVID-19 lockdowns collapsing aggregate demand. By 2022, it fell to 3.5%, near the natural rate. Structural unemployment rose after 2008 as manufacturing jobs were automated or offshored, requiring retraining programmes. Germany's Kurzarbeit (short-time work) scheme in 2020 kept unemployment below 6% by having government subsidise reduced hours rather than layoffs.",
                            "exam_tip": "AP tests whether you can identify types of unemployment. Cyclical = recession caused. Structural = technology/industry change. Frictional = voluntary between jobs. Policies differ: fiscal and monetary policy address cyclical; education and retraining address structural; better job matching (information) reduces frictional. The natural rate includes only frictional and structural — full employment at NRU still has some unemployment.",
                        },
                        {
                            "heading": "Inflation: Measurement, Causes and Costs",
                            "body": "Inflation is a sustained rise in the general price level. The Consumer Price Index (CPI) measures inflation by tracking the cost of a fixed basket of goods bought by a typical urban consumer. CPI in year t = (Cost of basket in year t / Cost of basket in base year) x 100. Inflation rate = (CPI this year - CPI last year) / CPI last year x 100. Demand-pull inflation: excess aggregate demand pulls up prices (too much money chasing too few goods). Cost-push inflation: rising input costs (oil, wages) push up prices and shift SRAS left. Inflation erodes purchasing power, creates uncertainty, harms creditors (fixed nominal payments), and redistributes wealth from lenders to borrowers in unexpected inflation.",
                            "key_terms": ["CPI", "inflation rate", "demand-pull inflation", "cost-push inflation", "purchasing power", "real vs nominal", "deflation", "hyperinflation", "GDP deflator"],
                            "real_world": "US CPI peaked at 9.1% in June 2022 — the highest since 1981 — driven by supply chain disruptions (cost-push) and massive fiscal stimulus during COVID (demand-pull). The Federal Reserve responded with the fastest rate-hiking cycle in 40 years. By 2024, inflation fell back to around 3%. Hyperinflation in Zimbabwe (2008, 89.7 sextillion percent annually) and Venezuela (2018, 1 million percent) illustrate the economic destruction of uncontrolled inflation.",
                            "exam_tip": "CPI vs GDP Deflator: CPI uses a fixed basket (Laspeyres index) and reflects consumer prices; GDP Deflator covers all goods produced domestically and changes with the composition of output. AP tests both. Real value = Nominal value / (Price Index / 100). If nominal wage grows 5% but inflation is 7%, real wage fell 2% — workers are worse off despite a nominal raise.",
                        },
                        {
                            "heading": "The Business Cycle: Phases and Indicators",
                            "body": "The business cycle describes recurring fluctuations in real GDP around its long-run trend growth rate. The four phases are: expansion (real GDP rising, unemployment falling, investment strong), peak (maximum output, tight labour market, inflation rising), contraction/recession (real GDP falling for two consecutive quarters, unemployment rising, investment declining), and trough (minimum output before recovery begins). Leading indicators predict future economic activity: stock prices, building permits, consumer confidence, and the yield curve. Coincident indicators move with the economy: employment, personal income. Lagging indicators confirm trends after they occur: unemployment rate, inflation, business loans.",
                            "key_terms": ["business cycle", "expansion", "peak", "recession", "trough", "leading indicators", "lagging indicators", "coincident indicators", "output gap", "potential GDP"],
                            "real_world": "The US has experienced 12 recessions since WWII. The 2008-09 Great Recession (GDP fell 4.3%, unemployment reached 10%) was the deepest since the 1930s. The 2020 recession was the shortest on record (two months) but sharpest (-10% GDP annualised in Q2 2020) due to COVID lockdowns. The yield curve inverted in 2022 — a leading indicator that correctly predicted the 2023 economic slowdown, as it has predicted every US recession since 1955.",
                            "exam_tip": "Output gap = actual GDP minus potential GDP. Negative output gap (recessionary gap): actual < potential, unemployment above natural rate. Positive output gap (inflationary gap): actual > potential, economy overheating, inflation rising. AP asks you to identify the gap type, draw the AD-AS diagram showing it, and prescribe the correct policy response. Always show both the short-run and long-run equilibrium.",
                        },
                    ],
                },
                {
                    "id": "ap_3",
                    "title": "National Income and Price Determination",
                    "title_en": "National Income and Price Determination",
                    "estimated_time": "40 min",
                    "sections": [
                        {
                            "heading": "Aggregate Demand: Components and Determinants",
                            "body": "Aggregate demand (AD) is the total quantity of goods and services demanded in the economy at every price level. AD = C + I + G + NX. The AD curve slopes downward for three reasons: the wealth effect (higher prices reduce real value of financial assets, reducing consumption), the interest rate effect (higher prices increase money demand, raising interest rates and reducing investment), and the net exports effect (higher domestic prices make exports less competitive, reducing NX). AD shifts when any non-price level determinant changes: consumer confidence, investment expectations, government spending, tax changes, foreign income, or exchange rates. A rightward AD shift raises both real output and the price level.",
                            "key_terms": ["aggregate demand", "wealth effect", "interest rate effect", "net exports effect", "AD determinants", "consumption", "investment", "government spending", "net exports"],
                            "real_world": "During COVID-19, all four components of AD collapsed simultaneously: consumer spending fell as lockdowns prevented shopping, business investment plummeted due to uncertainty, government spending surged (stimulus), and net exports fell as global trade froze. The net effect was a sharp leftward AD shift. China's 2024 stimulus package — cutting interest rates and mortgage requirements — aimed to boost C and I, shifting AD right to overcome deflationary pressure.",
                            "exam_tip": "A shift in AD vs a movement along AD: price level change causes movement along AD (not a shift). Everything else shifts AD. Common AP trap: if the price level changes due to an AD shift, you follow the new equilibrium — you do not shift AD again in response to the resulting price change. Draw arrows showing the direction of the shift and clearly label the original equilibrium (E1) and new equilibrium (E2).",
                        },
                        {
                            "heading": "Aggregate Supply: SRAS, LRAS and Shifts",
                            "body": "Short-run aggregate supply (SRAS) slopes upward because input prices (especially wages) are sticky in the short run. When the price level rises, firms earn higher revenues on existing cost structures and expand output. LRAS is vertical at the full employment (potential) output level because in the long run, all prices and wages adjust fully. SRAS shifts when input costs change (oil prices, wages), when productivity changes (technology), or when business taxes/regulations change. LRAS shifts with changes in the quantity or quality of factors of production: more capital investment, better technology, more labour, or improved human capital all shift LRAS rightward, representing long-run economic growth.",
                            "key_terms": ["SRAS", "LRAS", "sticky wages", "potential output", "full employment output", "supply shock", "SRAS shifters", "LRAS shifters", "stagflation"],
                            "real_world": "The 1973 OPEC oil embargo caused a dramatic leftward shift in SRAS for the US economy — oil prices quadrupled, raising costs for virtually every industry. The result was stagflation: higher prices AND lower output simultaneously. The 2022 global energy crisis after Russia invaded Ukraine replicated this: energy price spikes shifted SRAS left across Europe, causing both inflation and recession (stagflation). These supply shocks cannot be fixed by demand-side policy alone.",
                            "exam_tip": "Stagflation is the hardest AD-AS scenario for AP. A leftward SRAS shift raises the price level AND reduces real output. If the Fed responds with expansionary monetary policy (shift AD right), it restores output but worsens inflation. If contractionary policy is used to fight inflation, output falls further. Draw the stagflation scenario carefully: SRAS shifts left, new equilibrium has higher P and lower Y, with two possible policy responses shown.",
                        },
                        {
                            "heading": "AD-AS Equilibrium: Output Gaps and Self-Correction",
                            "body": "Short-run macroeconomic equilibrium occurs where AD intersects SRAS. This may be above or below potential output. A recessionary gap: short-run equilibrium is below potential GDP (actual output < potential). AD shifted left or SRAS shifted left. Unemployment is above the natural rate. In the long run, wages fall (due to excess labour supply), SRAS shifts right, restoring full employment at a lower price level — self-correction. An inflationary gap: short-run equilibrium above potential GDP. Unemployment below natural rate. In the long run, wages rise, SRAS shifts left, restoring equilibrium at a higher price level. The key debate: should policy actively close the gap, or let the economy self-correct?",
                            "key_terms": ["short-run equilibrium", "long-run equilibrium", "recessionary gap", "inflationary gap", "self-correction", "potential output", "output gap", "crowding out", "Keynesian", "classical"],
                            "real_world": "US CARES Act 2020 — $2.2 trillion stimulus shifted AD right to close the recessionary gap. GDP recovered by Q4 2020, but critics argued the stimulus was too large and too prolonged: by 2021, the economy was in an inflationary gap, contributing to 9.1% inflation in 2022. This real-world sequence perfectly illustrates the AD-AS model: recession (recessionary gap) → fiscal stimulus (AD shifts right) → recovery → overshoot (inflationary gap) → inflation.",
                            "exam_tip": "AP free-response always asks: draw the current AD-AS situation, identify the gap type, show the policy response, and explain the long-run self-correction. Practice this five-step sequence: (1) draw initial equilibrium at potential output, (2) show the shock shifting AD or SRAS, (3) identify the gap, (4) show the policy response, (5) show the long-run self-correction. Each step earns separate marks.",
                        },
                        {
                            "heading": "The Multiplier Effect and Fiscal Policy",
                            "body": "The spending multiplier shows that an initial increase in spending generates a larger total increase in GDP. When government spends $100 billion, recipients earn income, spend a fraction (MPC), recipients of that spending earn income and spend again — the chain continues. Spending multiplier = 1 / (1 - MPC) = 1 / MPS. If MPC = 0.8, multiplier = 5. A $100 billion increase in G raises GDP by $500 billion. The tax multiplier is smaller in magnitude: tax multiplier = -MPC / MPS = -MPC / (1 - MPC). Because a tax cut raises disposable income which is partly saved, the first round of spending is smaller than a direct government expenditure. Balanced budget multiplier = 1: equal increases in G and T raise GDP by the amount of the increase.",
                            "key_terms": ["spending multiplier", "tax multiplier", "MPC", "MPS", "balanced budget multiplier", "fiscal policy", "expansionary fiscal policy", "contractionary fiscal policy", "automatic stabilisers"],
                            "real_world": "The IMF estimated the fiscal multiplier during the 2009 financial crisis at 1.5-1.7 for developed economies — higher than previously thought, because monetary policy was constrained at the zero lower bound. This justified large fiscal stimulus programmes. In contrast, the 2012 European austerity programmes with multipliers of 1.5+ led to deeper recessions than forecast, because policymakers assumed multipliers of only 0.5. Automatic stabilisers (unemployment insurance, progressive taxes) act as built-in fiscal stabilisers without requiring new legislation.",
                            "exam_tip": "AP formula: Spending multiplier = 1/MPS. Tax multiplier = -MPC/MPS. If MPC = 0.75 and MPS = 0.25: spending multiplier = 4, tax multiplier = -3. To close a $200 billion recessionary gap, need G increase of $50 billion (200/4) or tax cut of $67 billion (200/3). Note the tax multiplier is always one less than the spending multiplier in absolute value. AP free-response often asks which policy is more effective at closing a gap — government spending is always more powerful per dollar than an equivalent tax cut.",
                        },
                    ],
                },
                {
                    "id": "ap_4",
                    "title": "Financial Sector",
                    "title_en": "Financial Sector",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "Money: Functions, Supply and the Money Multiplier",
                            "body": "Money serves three functions: medium of exchange (eliminates barter), store of value (preserves purchasing power over time), and unit of account (standard measure for pricing). M1 includes the most liquid assets: currency in circulation plus demand deposits (checking accounts). M2 = M1 plus savings accounts, small-denomination time deposits, and money market mutual funds. Banks create money through fractional reserve banking. Required reserve ratio (RRR) is the fraction banks must keep on reserve. Money multiplier = 1 / RRR. If RRR = 10%, a $1,000 deposit can support $10,000 in total deposits through repeated lending. Excess reserves reduce the effective money multiplier.",
                            "key_terms": ["M1", "M2", "medium of exchange", "store of value", "unit of account", "fractional reserve banking", "required reserve ratio", "money multiplier", "excess reserves"],
                            "real_world": "Following the 2008 financial crisis, US banks held massive excess reserves rather than lending — the money multiplier collapsed from its theoretical value. The Fed paid interest on excess reserves starting in 2008, incentivising banks to hold rather than lend. This explains why quantitative easing (buying trillions in bonds) did not cause the hyperinflation some predicted: money was created but not circulated. China sets its RRR higher than the US historically — at 7-8% in 2023, giving the PBOC room to stimulate by cutting it.",
                            "exam_tip": "Money multiplier = 1/RRR. If the Fed buys $10 billion in bonds and RRR = 0.1, potential maximum increase in money supply = $10 billion x 10 = $100 billion. But actual increase is less because banks hold excess reserves and people hold cash. AP always asks you to calculate the maximum possible change in money supply. Always use the formula and show your work in free-response.",
                        },
                        {
                            "heading": "The Money Market: Demand, Supply and Equilibrium",
                            "body": "The money market shows the supply and demand for money (liquidity preference theory). Money demand (Md) slopes downward: when the interest rate (price of holding money) is lower, people want to hold more money rather than interest-bearing assets. Three motives for holding money: transactions demand (needs for daily purchases, increases with income), precautionary demand (buffer against unexpected expenses), and speculative demand (hold money when expecting bond prices to fall, inversely related to interest rates). Money supply (Ms) is vertical — controlled by the central bank, not responsive to the interest rate. Equilibrium interest rate: where Md = Ms. If the Fed increases Ms, the supply curve shifts right, the interest rate falls.",
                            "key_terms": ["money demand", "money supply", "interest rate", "transactions demand", "precautionary demand", "speculative demand", "liquidity preference", "nominal interest rate", "real interest rate"],
                            "real_world": "The Federal Reserve raised the federal funds rate from 0.25% to 5.5% between March 2022 and July 2023 — the fastest tightening cycle since the 1980s. This was achieved by selling bonds (open market sales), reducing the money supply. The money market diagram shows: Ms shifts left, interest rate rises. Effect: higher borrowing costs slowed the housing market (mortgage rates hit 7-8%), reduced business investment, and eventually brought inflation from 9.1% to near 3%.",
                            "exam_tip": "Money market diagram: draw vertical Ms and downward-sloping Md. Interest rate on y-axis, quantity of money on x-axis. Open market purchase: Ms shifts right, interest rate falls. Open market sale: Ms shifts left, interest rate rises. A key AP connection: the money market determines the interest rate, which then affects investment, which shifts AD. Always trace the full chain: money supply change → interest rate change → investment change → AD shift → output and price level change.",
                        },
                        {
                            "heading": "The Loanable Funds Market",
                            "body": "The loanable funds market shows how the real interest rate equilibrates saving (supply of loanable funds) and borrowing (demand for loanable funds). Supply of loanable funds = household saving + government saving (budget surplus) + foreign saving (capital inflows). Demand for loanable funds = private investment + government borrowing (budget deficit). The real interest rate adjusts to clear the market. An increase in the government deficit shifts demand right, raising the real interest rate and crowding out private investment. An increase in household saving shifts supply right, lowering the real interest rate and stimulating investment. Loanable funds market differs from the money market: loanable funds uses the real interest rate; money market uses the nominal interest rate.",
                            "key_terms": ["loanable funds", "real interest rate", "nominal interest rate", "supply of loanable funds", "demand for loanable funds", "crowding out", "budget deficit", "private saving", "Fisher equation"],
                            "real_world": "The US government ran a $1.7 trillion deficit in FY2023, absorbing a massive share of available loanable funds. This crowding out effect contributed to the rise in long-term interest rates — the 10-year Treasury yield rose from 1.5% in 2021 to over 5% in late 2023. Each dollar of government borrowing displaced some private investment. Japan illustrates the opposite: despite massive government debt (250% of GDP), interest rates stayed near zero because Japan's high household saving rate kept loanable funds supply abundant.",
                            "exam_tip": "AP often tests the loanable funds market alongside the money market in the same question. Remember: loanable funds shows real interest rates determined by saving and investment flows. Money market shows nominal interest rates determined by Fed policy and money demand. The Fisher equation connects them: real interest rate = nominal interest rate minus expected inflation. If the Fed raises nominal rates faster than inflation expectations, real rates rise, crowding out investment more.",
                        },
                        {
                            "heading": "Federal Reserve Tools and Monetary Policy",
                            "body": "The Federal Reserve uses three main tools: (1) Open market operations — the most important tool. Buying government bonds from banks increases reserves and expands the money supply, lowering interest rates (expansionary). Selling bonds withdraws reserves and contracts the money supply, raising rates (contractionary). (2) Discount rate — the rate charged to banks borrowing directly from the Fed. Lowering it encourages banks to borrow more, expanding money supply. (3) Reserve requirements — raising RRR reduces the money multiplier and contracts money supply; rarely used now. Quantitative easing (QE): large-scale bond purchases beyond normal OMO, used when the federal funds rate hits zero (the zero lower bound).",
                            "key_terms": ["open market operations", "discount rate", "reserve requirement", "federal funds rate", "quantitative easing", "expansionary monetary policy", "contractionary monetary policy", "zero lower bound", "forward guidance"],
                            "real_world": "The Fed conducted four rounds of QE (2008-2022), expanding its balance sheet from $900 billion to $9 trillion. By buying mortgage-backed securities and Treasury bonds, it pushed long-term rates below 1%, supporting the housing market and stock prices. The subsequent unwinding (quantitative tightening, 2022-present) shrank the balance sheet and contributed to rising long-term rates. The PBOC uses a broader toolkit than the Fed: it adjusts RRR, lending rates, and uses targeted lending programmes (MLF, PSL) to direct credit to specific sectors.",
                            "exam_tip": "The full monetary policy transmission chain: Fed buys bonds (OMO) → bank reserves increase → money supply increases → interest rates fall (money market) → investment and consumption increase (interest rate sensitive) → AD shifts right → output rises and price level rises. For contractionary: reverse all arrows. AP free-response asks you to trace this complete chain — partial chains lose marks. Also know: expansionary monetary policy is limited at the zero lower bound (cannot cut rates below zero without special tools).",
                        },
                    ],
                },
                {
                    "id": "ap_5",
                    "title": "Long-Run Consequences of Stabilisation Policies",
                    "title_en": "Long-Run Consequences of Stabilisation Policies",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "The Short-Run Phillips Curve",
                            "body": "The Phillips curve shows an empirical inverse relationship between the inflation rate and the unemployment rate. In the short run, policymakers face a trade-off: policies that reduce unemployment (expansionary AD policy) tend to raise inflation, and vice versa. The short-run Phillips curve (SRPC) is equivalent to the SRAS curve — a movement along the SRPC corresponds to a movement along SRAS in the AD-AS model. A rightward shift of AD along SRAS corresponds to moving up and left along the SRPC (lower unemployment, higher inflation). A leftward shift of AD corresponds to moving down and right (higher unemployment, lower inflation). The slope of the SRPC reflects how quickly inflation responds to changes in unemployment.",
                            "key_terms": ["Phillips curve", "SRPC", "inflation-unemployment trade-off", "demand-pull inflation", "cyclical unemployment", "stagflation", "supply shock"],
                            "real_world": "The original Phillips curve relationship held well in the 1950s and 1960s. The 1970s stagflation shattered it: both inflation AND unemployment rose simultaneously after OPEC oil shocks. This cannot happen along a stable SRPC — it requires the SRPC to shift. The 2022 Fed tightening cycle demonstrated the trade-off again: raising rates moved the economy up and right along the SRPC toward lower inflation (from 9.1% to 3%) at the cost of higher unemployment and slower growth.",
                            "exam_tip": "SRPC and AD-AS are the same model in different coordinates. Movement along SRAS = movement along SRPC. Shift in SRAS = shift of SRPC. Draw both diagrams for stagflation: AD-AS shows SRAS shifting left (higher P, lower Y). The equivalent on SRPC shows SRPC shifting right (higher inflation at every unemployment rate). AP always wants both diagrams when discussing stagflation.",
                        },
                        {
                            "heading": "Long-Run Phillips Curve, NAIRU and Expectations",
                            "body": "The long-run Phillips curve (LRPC) is vertical at the natural rate of unemployment (NAIRU). In the long run, there is no trade-off between inflation and unemployment: any attempt to keep unemployment permanently below the natural rate causes accelerating inflation. Adaptive expectations: workers expect future inflation to equal past inflation. If actual inflation exceeds expected inflation, workers are temporarily fooled (work harder for higher nominal wages), unemployment temporarily falls below NAIRU. Once workers update their expectations, they demand higher wages, SRAS shifts left, and unemployment returns to NAIRU at a higher inflation rate. Stagflation (SRPC shifts right) occurs when inflation expectations rise or supply shocks increase costs.",
                            "key_terms": ["LRPC", "NAIRU", "natural rate of unemployment", "adaptive expectations", "rational expectations", "inflation expectations", "accelerationist Phillips curve", "non-accelerating inflation rate"],
                            "real_world": "The Volcker disinflation (1979-1983) shows the LRPC in action. Fed Chairman Volcker raised the federal funds rate to 20% to break inflation expectations. Unemployment soared to 10.8% as the economy was pushed far right of NAIRU along the SRPC. Once inflation expectations fell, the SRPC shifted left, allowing lower inflation with lower unemployment. The short-term cost was severe recession; the long-term gain was price stability that allowed strong 1980s-1990s growth.",
                            "exam_tip": "AP test question: an economy is at NAIRU with 2% inflation. The government runs expansionary fiscal policy. Trace the short-run and long-run effects using both AD-AS and Phillips curve diagrams. Short run: AD shifts right, output rises above potential, unemployment falls below NAIRU, inflation rises above 2%. Long run: inflation expectations adjust, SRAS shifts left, SRPC shifts right, economy returns to NAIRU with higher inflation. Draw four diagrams total for full marks.",
                        },
                        {
                            "heading": "Inflation, Debt and Fiscal Sustainability",
                            "body": "Sustained budget deficits add to the national debt. Debt-to-GDP ratio measures fiscal sustainability: it rises when the primary deficit exceeds the interest payments the economy can sustain, or when GDP growth is slower than the interest rate on debt. High debt levels can crowd out private investment (government borrowing raises real interest rates), reduce policy flexibility in future recessions, and potentially trigger debt crises. However, deficits during recessions may be necessary and self-financing through the multiplier effect (higher GDP reduces the debt ratio). Monetising the debt (central bank buys government bonds) can cause inflation. Ricardian equivalence: if taxpayers anticipate future tax increases to service debt, they save more today, offsetting the stimulative effect of fiscal policy.",
                            "key_terms": ["budget deficit", "national debt", "debt-to-GDP ratio", "crowding out", "monetising debt", "Ricardian equivalence", "primary deficit", "debt sustainability", "fiscal multiplier"],
                            "real_world": "US national debt exceeded $33 trillion in 2023, with debt-to-GDP above 120%. Annual interest payments surpassed $1 trillion — the largest single item in the federal budget. Japan has debt-to-GDP above 250% yet maintains low interest rates due to high domestic saving. Greece's 2010-2012 debt crisis illustrates the risks: when debt markets lose confidence, interest rates spike, forcing austerity that deepens recession — a debt spiral.",
                            "exam_tip": "AP asks about the long-run consequences of persistent deficits: higher real interest rates (loanable funds market shifts demand right), crowding out of private investment, potential inflation if debt is monetised, and reduced future fiscal space. Connect to the loanable funds market diagram: government deficit increases demand for loanable funds, shifting demand right, raising real interest rate, reducing private investment. This is the crowding out mechanism.",
                        },
                        {
                            "heading": "Long-Run Economic Growth: Sources and Policy",
                            "body": "Long-run economic growth is represented by a rightward shift of LRAS (or an outward shift of the PPC). The sources of growth: (1) increases in physical capital (investment in machinery, infrastructure), (2) improvements in human capital (education, health, training), (3) technological progress (the most important long-run driver), and (4) institutional quality (property rights, rule of law, financial markets). Supply-side policies aim to increase potential output: investment tax credits, R&D subsidies, education funding, immigration reform, and deregulation. The growth rate of real GDP per capita over long periods determines living standards — small differences in growth rates compound dramatically over decades.",
                            "key_terms": ["LRAS", "long-run growth", "physical capital", "human capital", "technology", "total factor productivity", "supply-side policy", "rule of 70", "productivity"],
                            "real_world": "South Korea's GDP per capita rose from $100 in 1960 to over $33,000 today — a 330-fold increase driven by massive investment in education (human capital), export-oriented industrialisation (technology transfer), and infrastructure. The US achieved 2% average annual growth in real GDP per capita for most of the 20th century. The rule of 70: at 2% growth, living standards double every 35 years; at 1% growth, it takes 70 years. This compounding explains why small differences in growth rates matter enormously for long-run prosperity.",
                            "exam_tip": "Supply-side policies shift LRAS right without causing inflation (unlike AD-side policies). AP tests this distinction: a tax cut that stimulates investment shifts LRAS right (supply-side effect) but also shifts AD right (demand-side effect). The net result depends on which effect dominates. In the long run, only supply-side improvements can raise the economy's potential output. Draw LRAS shifting right with unchanged price level to show pure supply-side growth.",
                        },
                    ],
                },
                {
                    "id": "ap_6",
                    "title": "Open Economy: International Trade and Finance",
                    "title_en": "Open Economy: International Trade and Finance",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "Balance of Payments: Accounts and Identity",
                            "body": "The balance of payments (BoP) records all economic transactions between a country and the rest of the world over a period. Current account: trade in goods (merchandise trade balance), services, primary income (wages, investment income), and secondary income (remittances, foreign aid). Capital and financial account: foreign direct investment, portfolio investment, reserve assets. The fundamental identity: current account + capital and financial account = 0. A current account deficit must be financed by an equal capital account surplus (net capital inflows). A current account surplus is matched by capital outflows. There is no such thing as a BoP deficit overall — only imbalances within its sub-accounts.",
                            "key_terms": ["current account", "capital account", "financial account", "balance of payments", "trade balance", "trade deficit", "capital inflows", "reserve assets", "net exports"],
                            "real_world": "The US ran a current account deficit of approximately $900 billion in 2023 — about 3.3% of GDP. This was financed by capital inflows: foreigners (especially China, Japan, and oil exporters) bought US Treasury bonds and other assets. China consistently runs a current account surplus, matching outflows in the capital account. The BoP identity holds by definition: what the US borrows from abroad (capital inflow) exactly equals what it spends more than it earns abroad (current deficit).",
                            "exam_tip": "AP always tests the BoP identity. If current account is in deficit by $X, capital account must be in surplus by $X — foreign investment is financing the deficit. Key policy implication: a country cannot reduce its current account deficit without changing the saving-investment balance. Fiscal austerity (raising national saving) or policies to attract less foreign capital will close the current account deficit. Tariffs alone are unlikely to fix a structural current account deficit.",
                        },
                        {
                            "heading": "The Foreign Exchange Market",
                            "body": "The foreign exchange (forex) market determines exchange rates through supply and demand for currencies. The demand for a currency (e.g. dollars) comes from foreigners who want to buy US goods, services, and assets. Supply of dollars comes from Americans who want to buy foreign goods, services, and assets. Exchange rate: the price of one currency in terms of another. Appreciation: the currency buys more foreign currency (demand for it rises). Depreciation: it buys less (supply of it rises or demand falls). Factors causing currency appreciation: higher domestic interest rates (attract capital inflows), stronger economic growth, higher inflation abroad, increased demand for exports, speculation. Real exchange rate adjusts the nominal rate for relative price levels.",
                            "key_terms": ["exchange rate", "appreciation", "depreciation", "foreign exchange market", "currency demand", "currency supply", "real exchange rate", "nominal exchange rate", "purchasing power parity"],
                            "real_world": "When the Fed raised rates aggressively in 2022-2023, the US dollar appreciated sharply against most currencies — the DXY dollar index hit a 20-year high. Higher US rates attracted capital inflows (demand for dollars rose). This hurt emerging market economies: dollar-denominated debt became more expensive to service, and capital flowed out of developing countries to the US. The RMB depreciated from 6.3 to 7.3 per dollar as the interest rate differential shifted capital toward dollar assets.",
                            "exam_tip": "AP forex market question: draw supply and demand for a specific currency (e.g. USD). When the Fed raises interest rates: demand for USD rises (foreigners want US assets) AND supply of USD falls (Americans buy fewer foreign assets since domestic returns are higher). Both effects cause USD to appreciate. For AP, draw both curves shifting and show the new higher equilibrium exchange rate. Always specify which currency is on the y-axis.",
                        },
                        {
                            "heading": "Exchange Rates and the Macro Economy",
                            "body": "Exchange rate changes affect the macroeconomy through the net export channel. When a country's currency depreciates: exports become cheaper for foreigners (export volume rises), imports become more expensive domestically (import volume falls), net exports increase, AD shifts right. Appreciation has the opposite effect: NX falls, AD shifts left. The effect on trade balance depends on price elasticity: the Marshall-Lerner condition states that depreciation improves the trade balance only if the sum of the price elasticities of demand for exports and imports exceeds one. In the short run, elasticities are low (existing contracts), so depreciation may initially worsen the trade balance before improving it — the J-curve effect.",
                            "key_terms": ["net exports", "NX", "depreciation", "appreciation", "Marshall-Lerner condition", "J-curve", "trade balance", "price elasticity", "export competitiveness", "import substitution"],
                            "real_world": "China's managed exchange rate policy maintained an undervalued RMB for decades, supporting export competitiveness. The US accused China of currency manipulation, arguing the cheap RMB gave Chinese exporters an unfair advantage. When Japan pursued aggressive monetary easing (Abenomics, 2013), the yen depreciated 30% — Japanese exports surged and the trade balance improved after about 12-18 months, illustrating the J-curve with a lag of one to two years.",
                            "exam_tip": "Connect the forex market to the AD-AS model: currency depreciation → NX increases → AD shifts right → output rises and price level rises. AP free-response may give you a scenario (e.g. a country raises interest rates) and ask you to trace effects through the forex market, AD-AS, and the Phillips curve — drawing all three diagrams. This multi-diagram chain is the most complex AP Macro question type. Practice tracing each link.",
                        },
                        {
                            "heading": "International Linkages and Policy Spillovers",
                            "body": "In an open economy, domestic policies spill over to other countries and foreign policies affect the domestic economy. If the US raises interest rates: higher returns attract capital from other countries, other currencies depreciate (dollar appreciates), US imports become relatively cheaper (US trade deficit widens), foreign exporters to the US benefit while US exporters face headwinds. Expansionary fiscal policy in a large economy (US, China) increases global AD and raises demand for other countries' exports. Currency wars: if multiple countries simultaneously depreciate their currencies to gain export advantage, all may end up with higher inflation but no relative competitive gain. International coordination of macroeconomic policy (G20, IMF) aims to prevent such prisoner dilemma outcomes.",
                            "key_terms": ["international spillovers", "capital flows", "currency war", "beggar-thy-neighbour", "G20", "IMF", "fixed exchange rate", "floating exchange rate", "managed float", "trilemma"],
                            "real_world": "The 2013 taper tantrum illustrates international spillovers. When the Fed hinted at reducing QE, capital flooded out of emerging markets (Brazil, India, Turkey, South Africa) as investors anticipated higher US returns. Emerging market currencies depreciated sharply, causing inflation and forcing their central banks to raise rates defensively — even though their own economies did not need tightening. One central bank's policy (the Fed) forced tightening across dozens of other countries, illustrating how interconnected global financial markets have become.",
                            "exam_tip": "The trilemma (impossible trinity): a country cannot simultaneously have (1) fixed exchange rate, (2) free capital flows, and (3) independent monetary policy. Choose only two. China chose (1) and (3) by restricting capital flows. Hong Kong chose (1) and (2) by giving up monetary independence. The US chose (2) and (3) with a floating exchange rate. AP may test which policies are compatible — understanding the trilemma helps explain why different countries have different monetary frameworks.",
                        },
                    ],
                },
            ],
        },
    ],
}


# ── AP Microeconomics Curriculum ──────────────────────────────────────────────

AP_MICRO_CURRICULUM = {
    "exam": "AP Microeconomics",
    "board": "College Board",
    "papers": [
        {
            "id": "ap_micro_units",
            "title": "AP Microeconomics Units",
            "title_en": "AP Microeconomics Units",
            "topics": [
                {
                    "id": "ap_micro_1",
                    "title": "Basic Economic Concepts",
                    "title_en": "Basic Economic Concepts",
                    "estimated_time": "30 min",
                    "sections": [
                        {
                            "heading": "Scarcity, Choice and Opportunity Cost",
                            "body_en": "Economics begins with one unavoidable reality: resources are scarce but human wants are unlimited. Every economic decision involves a trade-off. Opportunity cost is the value of the next best alternative foregone when a choice is made. It is not just monetary cost but includes time, effort, and other non-monetary sacrifices. Economists always think in terms of opportunity cost because it represents the true cost of any decision. Marginal thinking means comparing the additional benefit and additional cost of one more unit of an action. Rational agents make decisions at the margin: continue an activity if marginal benefit exceeds marginal cost; stop when MB equals MC. The ceteris paribus assumption ('all else equal') isolates the effect of one variable by holding all others constant.",
                            "key_terms_en": ["scarcity", "opportunity cost", "trade-off", "marginal thinking", "ceteris paribus", "marginal benefit", "marginal cost"],
                            "real_world_en": "When the US government spent $2.2 trillion on COVID stimulus in 2020, the opportunity cost included infrastructure improvements, education funding, or debt reduction that could have been prioritised instead. Every dollar spent on one programme cannot be spent on another. At the individual level: a student who spends an extra hour studying economics gives up an hour of sleep, social activity, or studying another subject — that foregone activity is the opportunity cost of the extra economics study.",
                            "exam_tip_en": "AP exam frequently asks to identify opportunity cost from a table. Always choose the NEXT BEST alternative only, not the sum of all alternatives. If you give up options A, B, and C to do D, the opportunity cost of D is only your next best option (whichever of A, B, C you valued most). Also: sunk costs are NOT opportunity costs — they are already spent and cannot be recovered, so they should not influence future decisions.",
                        },
                        {
                            "heading": "Production Possibilities Curve",
                            "body_en": "The PPC shows the maximum combinations of two goods an economy can produce when all resources are fully and efficiently employed. Points ON the curve are productively efficient. Points INSIDE represent unemployed resources or inefficiency. Points OUTSIDE are currently unattainable. The PPC is concave (bowed out from the origin) because resources are not perfectly adaptable between uses. As you shift production toward more of one good, you must give up increasing amounts of the other — the law of increasing opportunity costs. This is because resources best suited for Good A are shifted first, and as more is produced, resources less suited for Good A (higher opportunity cost) must be used.",
                            "key_terms_en": ["PPC", "productive efficiency", "allocative efficiency", "opportunity cost", "economic growth", "underemployment", "law of increasing opportunity costs"],
                            "real_world_en": "During WWII, the US rapidly shifted its PPC allocation. Factories that made cars converted to making tanks within months. The economy moved to a different point on its existing PPC (more military goods, fewer consumer goods). Post-war investment in technology and education shifted the entire PPC outward, allowing more of both guns and butter over time. China's PPC has shifted dramatically rightward since 1978, as investment in physical capital and education expanded productive capacity.",
                            "exam_tip_en": "Know four PPC scenarios for AP: (1) Movement along PPC = reallocation of resources, no change in total capacity. (2) Point inside PPC = recession, unemployment, or inefficiency. (3) Outward shift of entire PPC = economic growth from more resources or better technology. (4) Inward shift = destruction of resources. A key AP trap: if technology improves in ONLY ONE industry, the PPC rotates (one endpoint shifts, not both). It does not shift parallel. Practice drawing all four scenarios.",
                        },
                        {
                            "heading": "Comparative Advantage and Trade",
                            "body_en": "Absolute advantage means producing more output with the same resources, or producing the same output with fewer resources. Comparative advantage means producing at a lower opportunity cost. Even if one country is absolutely better at producing everything, both countries gain from trade if they specialise according to comparative advantage. This is one of the most powerful and counterintuitive results in economics. The key insight: comparative advantage is about relative, not absolute, productivity. As long as opportunity costs differ between countries, specialisation and trade create gains. The terms of trade must fall between the two countries' opportunity cost ratios for both parties to benefit from trade.",
                            "key_terms_en": ["absolute advantage", "comparative advantage", "specialisation", "terms of trade", "gains from trade", "opportunity cost ratio"],
                            "real_world_en": "The US has absolute advantage in both software and textiles compared to Bangladesh. But the US opportunity cost of producing textiles is very high (giving up high-value software engineering). Bangladesh's opportunity cost of producing textiles is low (giving up less valuable alternative production). So the US specialises in software, Bangladesh in textiles, and both trade. Both end up consuming more than they could produce alone. This principle underpins over $25 trillion of annual global trade.",
                            "exam_tip_en": "To find comparative advantage: calculate the opportunity cost for each good for each country. The country with LOWER opportunity cost has comparative advantage in that good. Common AP question: given a table of output per worker, find who should specialise and identify the acceptable terms of trade range (must be between both countries' opportunity costs). Example: if US makes 4 cars OR 8 computers per worker, and Mexico makes 1 car OR 1 computer, US has comparative advantage in computers (OC = 0.5 cars) and Mexico in cars (OC = 1 computer).",
                        },
                        {
                            "heading": "Economic Systems and the Role of Government",
                            "body_en": "Market economies allocate resources through price signals — prices rise to signal scarcity and attract resources; prices fall to signal surplus and redirect resources. Command economies use central planning. Mixed economies combine both. In market economies, three fundamental questions are answered by markets: what to produce (consumer demand determines output mix), how to produce (firms choose least-cost methods), and for whom (those who can pay). Government intervenes to correct market failures: externalities, public goods, imperfect information, and market power. Without government intervention, markets may produce the wrong quantities (too much of goods with negative externalities, too little of goods with positive externalities).",
                            "key_terms_en": ["market economy", "command economy", "mixed economy", "market failure", "public goods", "externalities", "imperfect information", "market power", "price mechanism"],
                            "real_world_en": "China operates a socialist market economy — heavy state direction in strategic sectors (semiconductors, energy, banking) combined with market competition in consumer goods and services. This hybrid model achieved roughly 10% average annual growth for 30 years, lifting 800 million people out of poverty. The US is also a mixed economy: markets allocate most resources, but government provides national defence, regulates pollution, funds basic research, and operates Medicare and Social Security.",
                            "exam_tip_en": "AP Micro focuses on market failures as justification for government intervention. Remember four types: public goods (non-rival and non-excludable, causing free-rider problem), externalities (costs or benefits spill over to third parties), imperfect information (asymmetric information between buyers and sellers), and market power (monopoly or oligopoly exploiting pricing power). Each type requires a different policy response — memorise the problem and the matching solution for each.",
                        },
                    ],
                },
                {
                    "id": "ap_micro_2",
                    "title": "Supply, Demand and Market Equilibrium",
                    "title_en": "Supply, Demand and Market Equilibrium",
                    "estimated_time": "45 min",
                    "sections": [
                        {
                            "heading": "Demand and Its Determinants",
                            "body_en": "The law of demand states that as price rises, quantity demanded falls, ceteris paribus. The demand curve slopes downward due to the substitution effect (higher price makes alternatives more attractive) and the income effect (higher price reduces real purchasing power, reducing consumption). Demand SHIFTS when any non-price determinant changes: income (for normal goods, higher income shifts demand right; for inferior goods, left), prices of related goods (substitute's price rises = demand for this good rises; complement's price rises = demand falls), tastes and preferences, future price expectations, and number of buyers. A shift in demand is different from a movement along the demand curve.",
                            "key_terms_en": ["law of demand", "substitution effect", "income effect", "normal good", "inferior good", "substitute", "complement", "demand shifters", "change in demand vs quantity demanded"],
                            "real_world_en": "Netflix subscriber demand perfectly illustrates demand shifters. When Disney+ launched in 2019, it was a substitute — Netflix demand fell (competition shifted demand left). When COVID hit in 2020, incomes fell but Netflix subscriptions surged because streaming became an inferior good substitute for expensive out-of-home entertainment. Rising prices of streaming devices (a complement) would shift Netflix demand left. Each factor is a separate demand shifter, and none requires a price change to occur.",
                            "exam_tip_en": "The most tested AP skill: correctly identifying shifts versus movements along the demand curve. PRICE CHANGE = movement along curve (change in quantity demanded). ANY OTHER CHANGE = shift of entire curve (change in demand). On diagrams: clearly label original curve D1 and new curve D2 with an arrow showing direction of shift. State which determinant changed and why it shifts demand in that direction. Half-marks are often lost by drawing the right shift in the wrong direction.",
                        },
                        {
                            "heading": "Supply and Its Determinants",
                            "body_en": "The law of supply states that as price rises, quantity supplied increases, ceteris paribus. Producers are willing to supply more at higher prices because higher prices allow them to cover higher marginal costs of production. Supply SHIFTS when: input costs change (wages, raw materials — higher costs shift supply left), technology improves (shifts supply right, more output at every price), government excise taxes (shifts supply left) or subsidies (shifts supply right), expectations of future prices (if price expected to rise, supply today falls), and number of sellers changes (more firms shift supply right). A rightward supply shift means lower prices and higher quantities at equilibrium.",
                            "key_terms_en": ["law of supply", "marginal cost", "supply shifters", "input costs", "technology", "subsidy", "excise tax", "change in supply vs quantity supplied"],
                            "real_world_en": "The US shale oil revolution (2008-2015) massively shifted oil supply right through fracking technology that dramatically reduced extraction costs. Oil prices fell from over $100 per barrel to below $30. This illustrates technology shifting supply independently of price. Contrast with OPEC deliberately cutting production (supply shifts left) to raise prices. The 2022 Russian invasion of Ukraine disrupted global wheat and energy supply (supply shifted left for both), raising prices — a real-world supply shock with global consequences.",
                            "exam_tip_en": "Taxes and subsidies are the most tested supply shifters on AP. Excise tax on sellers shifts supply LEFT (raises their costs, less willing to sell at every price). Subsidy to sellers shifts supply RIGHT (lowers their costs). Key distinction: a tax on buyers shifts the demand curve left; a tax on sellers shifts the supply curve left. Different curves shift depending on who is legally required to pay. Always redraw the appropriate curve and do not shift both.",
                        },
                        {
                            "heading": "Equilibrium, Surplus and Shortage",
                            "body_en": "Market equilibrium occurs where quantity demanded equals quantity supplied — the market clears. At prices above equilibrium, a surplus (excess supply) exists: sellers cannot sell all they produce and price falls as they compete for buyers. At prices below equilibrium, a shortage (excess demand) exists: buyers cannot purchase all they want and price rises as they compete for goods. This self-correcting mechanism is the price system at work. When supply or demand shifts, the equilibrium price and quantity change — predict changes by identifying which curve shifts, in which direction, and how the new intersection compares to the old.",
                            "key_terms_en": ["equilibrium price", "equilibrium quantity", "surplus", "shortage", "market clearing", "price mechanism", "excess supply", "excess demand"],
                            "real_world_en": "Used car prices during COVID (2021-2022) perfectly illustrated shortage dynamics. New car production halted (chip shortage shifted supply left sharply). Demand surged simultaneously (people avoiding public transport shifted demand right). The result: used car prices rose 30-50% above normal as the market eliminated the shortage through price increases. When the chip shortage eventually resolved in 2023, supply returned and prices normalised, illustrating the self-correcting market mechanism.",
                            "exam_tip_en": "For simultaneous shifts of both supply and demand curves, one effect on either price or quantity is ambiguous. Practice all four cases: (1) D right + S right: Q definitely rises, P is ambiguous. (2) D left + S left: Q definitely falls, P is ambiguous. (3) D right + S left: P definitely rises, Q is ambiguous. (4) D left + S right: P definitely falls, Q is ambiguous. On AP, when the answer is ambiguous, say 'indeterminate' or 'cannot be determined without knowing the magnitude of the shifts' and explain why.",
                        },
                        {
                            "heading": "Price Elasticity of Demand and Supply",
                            "body_en": "Price elasticity of demand (PED) = % change in quantity demanded / % change in price. If |PED| > 1, demand is elastic (quantity very responsive to price changes). If |PED| < 1, demand is inelastic (quantity not very responsive). If |PED| = 1, unit elastic. Determinants of PED: availability of substitutes (more substitutes = more elastic), necessity versus luxury (necessities more inelastic), time horizon (consumers become more elastic in the long run as they find alternatives), and proportion of budget spent (larger share = more elastic). Price elasticity of supply (PES) depends on production flexibility and time horizon — long run is more elastic as firms can adjust capacity.",
                            "key_terms_en": ["PED", "PES", "elastic", "inelastic", "unit elastic", "total revenue test", "determinants of elasticity", "cross-price elasticity", "income elasticity"],
                            "real_world_en": "Insulin has extremely inelastic demand — diabetics must have it regardless of price. US insulin prices rose over 1,000% from 1996 to 2019 while quantities demanded barely changed, illustrating how inelasticity enables price gouging. This contrasts with luxury electric vehicles: when Tesla raised prices 20% in 2022, demand fell significantly as buyers delayed purchases or considered alternatives — more elastic demand because it is a luxury item with imperfect substitutes. Gasoline shows medium inelasticity short-run (PED about -0.25) but more elastic long-run (PED about -0.6) as consumers switch to more fuel-efficient cars.",
                            "exam_tip_en": "Total revenue test: if price rises and total revenue (TR = P x Q) rises, demand is inelastic (price effect dominates). If price rises and TR falls, demand is elastic (quantity effect dominates). If TR is unchanged, unit elastic. AP also tests cross-price elasticity of demand: positive XED = substitutes (price of one rises, demand for the other rises); negative XED = complements (price of one rises, demand for the other falls). Income elasticity: positive = normal good; negative = inferior good; YED > 1 = luxury good.",
                        },
                    ],
                },
                {
                    "id": "ap_micro_3",
                    "title": "Production, Cost and Perfect Competition",
                    "title_en": "Production, Cost and Perfect Competition",
                    "estimated_time": "50 min",
                    "sections": [
                        {
                            "heading": "Production in the Short Run",
                            "body_en": "In the short run, at least one factor of production is fixed (typically capital/plant size). The law of diminishing marginal returns states that as more variable inputs (labour) are added to fixed inputs, the marginal product of the variable input eventually falls. Total product (TP) rises but at a decreasing rate. Marginal product (MP) = change in TP / change in labour input. Average product (AP) = TP / labour. The relationship: when MP > AP, AP is rising; when MP < AP, AP is falling; when MP = AP, AP is at its maximum. This identical relationship holds between any marginal and average measure.",
                            "key_terms_en": ["short run", "long run", "fixed input", "variable input", "total product", "marginal product", "average product", "diminishing marginal returns", "law of variable proportions"],
                            "real_world_en": "A restaurant kitchen perfectly illustrates diminishing marginal returns. With one chef, adding a second dramatically increases meals produced (specialisation gains). Adding a third chef still helps. But adding a tenth chef to the same kitchen creates congestion — chefs get in each other's way, share limited equipment, and the marginal product of the tenth chef may even be negative. The fixed factor (kitchen size and equipment) creates diminishing returns to the variable factor (labour). This is why most restaurants have a limited number of kitchen staff despite high demand.",
                            "exam_tip_en": "The mathematical relationship between MP and AP is identical to the relationship between any marginal and average measure. Think of it like test grades: if your latest test score (marginal) is above your course average, your average rises. If your latest score is below your average, your average falls. When your latest score equals your average, the average stays constant. This logic explains both the inverse-U shape of the MP and AP curves, and why the MC curve intersects the ATC and AVC curves at their minimum points.",
                        },
                        {
                            "heading": "Costs of Production",
                            "body_en": "Fixed costs (FC) do not change with output: rent, loan payments, insurance, salaried managers. Variable costs (VC) change with output: hourly labour, raw materials, energy. Total cost (TC) = FC + VC. Marginal cost (MC) = change in TC / change in output = change in VC / change in output (since FC does not change). Average fixed cost (AFC) = FC / Q — always declining as output rises. Average variable cost (AVC) = VC / Q — U-shaped. Average total cost (ATC) = TC / Q = AFC + AVC — U-shaped but lies above AVC by the amount of AFC. The MC curve intersects both AVC and ATC at their minimum points. In the long run, all costs are variable because all factors can be adjusted.",
                            "key_terms_en": ["fixed cost", "variable cost", "total cost", "marginal cost", "ATC", "AVC", "AFC", "sunk cost", "long run", "short run", "U-shaped cost curves"],
                            "real_world_en": "Airlines demonstrate fixed versus variable costs dramatically. A Boeing 737 costs $100 million (massive fixed cost — same whether flying 0 or 150 passengers per flight). Jet fuel and crew costs are variable. This explains why airlines sell last-minute seats cheaply: at full capacity, each additional passenger has near-zero marginal cost. Filling an otherwise empty seat at $50 covers variable cost and contributes to fixed costs — better than flying with an empty seat. This logic also explains why airlines never fully fill planes: at maximum load, marginal passengers create congestion (baggage handling, boarding delays) that raises costs.",
                            "exam_tip_en": "The U-shape of ATC: ATC initially falls because AFC falls rapidly (spreading fixed costs over more units) and MC is still below ATC. Eventually ATC rises because MC rises above ATC (diminishing returns dominate). The minimum of ATC equals MC at that output — this is the lowest possible average cost of production. In perfect competition, the long-run equilibrium price equals minimum ATC. AP always asks: at what output does a firm minimise cost? Answer: where MC = ATC (bottom of the ATC curve). Draw the cost curves and label this point explicitly.",
                        },
                        {
                            "heading": "Perfect Competition: Short-Run Analysis",
                            "body_en": "Perfect competition requires: many buyers and sellers (none large enough to influence price), identical homogeneous products (no differentiation), perfect information (all parties know all prices and qualities), free entry and exit in the long run, and no externalities. Each firm is a price taker: it faces a perfectly horizontal (perfectly elastic) demand curve at the market price. This means P = MR (price equals marginal revenue) for a competitive firm. Profit maximisation occurs where MR = MC. Since P = MR in perfect competition, firms produce where P = MC. In the short run, firms can earn economic profit (P > ATC), normal profit (P = ATC), or losses (P < ATC). The shutdown decision: produce if P is at least equal to AVC; shut down if P < AVC.",
                            "key_terms_en": ["perfect competition", "price taker", "homogeneous product", "economic profit", "normal profit", "break-even", "shutdown point", "MR = MC rule", "P = MR for competitive firm"],
                            "real_world_en": "Agricultural commodity markets (wheat, corn, soybeans) best approximate perfect competition. Thousands of farmers sell identical products on exchanges where the world price is set by global supply and demand. No individual Kansas wheat farmer can influence the world wheat price — they are pure price takers. In profitable years, new farmers plant more wheat and existing farmers expand, driving the market price down. In loss years, some farmers switch to other crops or exit, supply falls, price recovers. This self-correcting mechanism is the competitive model in action.",
                            "exam_tip_en": "Three key decision rules for a competitive firm: (1) Produce at MR = MC to maximise profit (or minimise loss). (2) Shut down in short run if P is less than AVC — cannot cover variable costs, better to produce nothing. (3) Exit in long run if P is less than ATC — cannot cover all costs. In long-run equilibrium: P = MR = MC = minimum ATC. These four equalities at the bottom of the ATC curve represent both productive efficiency (minimum ATC) and allocative efficiency (P = MC). Practice drawing this long-run equilibrium diagram.",
                        },
                        {
                            "heading": "Long Run in Perfect Competition",
                            "body_en": "If competitive firms earn economic profit in the short run, new firms enter the industry (free entry assumption). Industry supply increases, the market price falls, individual firm demand curves shift down, and economic profits fall toward zero. If firms make economic losses, firms exit the industry. Industry supply decreases, price rises, losses disappear. Long-run competitive equilibrium: zero economic profit, meaning P = minimum ATC. Consumers get goods at the lowest possible sustainable cost. The perfectly competitive market achieves productive efficiency (firms produce at minimum ATC) and allocative efficiency (P = MC, meaning the value consumers place on the last unit equals the cost of producing it — resources are optimally allocated).",
                            "key_terms_en": ["long-run equilibrium", "zero economic profit", "normal profit", "productive efficiency", "allocative efficiency", "free entry", "free exit", "constant cost industry", "increasing cost industry"],
                            "real_world_en": "The smartphone app market illustrates long-run competitive dynamics. When mobile games earned enormous profits in 2010-2012, thousands of developers entered. The market became flooded with competing games. Prices fell to zero (ad-supported models). Most developers today earn normal profit or losses — textbook long-run competitive equilibrium. Only differentiated apps with strong network effects or loyal user bases escape this zero-profit fate, which explains why app developers seek to differentiate and build loyalty rather than compete on price.",
                            "exam_tip_en": "Zero economic profit does NOT mean the firm is breaking even in the accounting sense. Economic profit includes the opportunity cost of the entrepreneur's time and capital. Zero economic profit means the firm earns exactly what it could earn in its next best alternative use of resources — a normal return on investment. Owners are content to remain in the industry at zero economic profit because they are earning as much as they could elsewhere. This is one of the most commonly misunderstood concepts in AP Micro.",
                        },
                    ],
                },
                {
                    "id": "ap_micro_4",
                    "title": "Monopoly, Oligopoly and Monopolistic Competition",
                    "title_en": "Monopoly, Oligopoly and Monopolistic Competition",
                    "estimated_time": "50 min",
                    "sections": [
                        {
                            "heading": "Monopoly: Pricing, Output and Welfare Costs",
                            "body_en": "A monopoly is the sole producer in a market with no close substitutes and significant barriers to entry. Unlike a competitive firm, a monopolist faces the downward-sloping market demand curve. To sell one more unit, the monopolist must lower the price on ALL units sold (not just the additional unit). Therefore marginal revenue (MR) is less than price (MR < P) and the MR curve lies below the demand curve. For a linear demand curve, MR has the same intercept but twice the slope of demand. Profit maximisation: produce where MR = MC, then charge the price from the demand curve at that output. Result: price exceeds marginal cost (P > MC), creating allocative inefficiency and deadweight loss. Monopoly produces less and charges more than a competitive market would.",
                            "key_terms_en": ["monopoly", "barriers to entry", "price maker", "MR less than P", "deadweight loss", "allocative inefficiency", "natural monopoly", "consumer surplus", "producer surplus"],
                            "real_world_en": "Pfizer's COVID vaccine patent gave it temporary monopoly power over its mRNA vaccine technology. Charging $20-$30 per dose (some government contracts were much higher), Pfizer earned extraordinary profits while governments — especially in developing countries — faced high prices and access barriers. This illustrates both the innovation incentive argument for patents (monopoly profits reward the massive R&D investment) and the efficiency and equity costs of monopoly pricing. When patents expire, generic competitors enter and prices typically fall 80-90%.",
                            "exam_tip_en": "The monopoly diagram is the most tested in AP Micro. Must show: downward-sloping demand curve labelled D (= AR), MR curve below D with same vertical intercept (twice as steep for linear demand), MC curve intersecting MR, profit-maximising output Q_m at MR = MC, price P_m found on demand curve above Q_m, profit rectangle (P_m minus ATC) times Q_m shaded, and deadweight loss triangle between Q_m and the competitive output (where D = MC). Practice drawing this entire diagram from memory in two minutes.",
                        },
                        {
                            "heading": "Price Discrimination",
                            "body_en": "Price discrimination occurs when a monopolist charges different prices to different consumers for the same product, not based on cost differences. First-degree (perfect) price discrimination: charge each consumer their exact maximum willingness to pay — captures all consumer surplus as producer surplus, eliminates deadweight loss, but requires perfect information about every buyer. Second-degree discrimination: quantity discounts (bulk buyers pay less per unit). Third-degree discrimination: different prices to different market segments based on demand elasticity — charge higher prices to segments with more inelastic demand (business travellers, domestic consumers) and lower prices to elastic segments (leisure travellers, international markets). For price discrimination to work: the firm must have market power, be able to identify and separate markets, and prevent arbitrage (resale between markets).",
                            "key_terms_en": ["price discrimination", "first-degree price discrimination", "third-degree price discrimination", "consumer surplus", "willingness to pay", "market segmentation", "arbitrage", "elastic vs inelastic segments"],
                            "real_world_en": "Airlines master third-degree price discrimination. Business travellers (inelastic demand — employers pay, travel is urgent and non-discretionary) pay $2,000 for the same seat that a leisure traveller booked two months in advance pays $300 for (elastic demand — flexible timing, paying out of pocket). Airlines separate markets using restrictions: advance purchase requirements, Saturday-night stay rules, change fees, and non-refundable tickets. The same physical seat, the same service — radically different prices based solely on measured demand elasticity of each customer segment.",
                            "exam_tip_en": "AP tests price discrimination effects on efficiency and equity. Effect on efficiency: if a monopolist price discriminates and thereby increases total output toward the competitive level, price discrimination can REDUCE deadweight loss compared to single-price monopoly (more efficient). Effect on equity: consumers with inelastic demand pay more, consumers with elastic demand pay less — redistribution from one group to another. Key insight: a perfectly price-discriminating monopolist produces the same quantity as perfect competition (zero deadweight loss) but captures ALL consumer surplus as producer profit.",
                        },
                        {
                            "heading": "Oligopoly and Game Theory",
                            "body_en": "Oligopoly has few large firms with significant mutual interdependence — each firm's pricing and output decisions affect rivals who respond strategically. The kinked demand curve model explains price rigidity: if one firm raises price, others do not follow (demand is elastic above the kink), but if it lowers price, others match it (demand is inelastic below the kink). This creates a discontinuous MR curve and explains why oligopolists change prices rarely. Game theory analyses strategic interactions. A Nash equilibrium is a set of strategies where no player can improve their outcome by unilaterally changing their strategy, given what others are doing. Dominant strategy: an action that is best regardless of what rivals do.",
                            "key_terms_en": ["oligopoly", "interdependence", "game theory", "Nash equilibrium", "dominant strategy", "prisoners dilemma", "collusion", "cartel", "kinked demand curve", "strategic behaviour"],
                            "real_world_en": "Amazon and Walmart illustrate oligopolistic interdependence. Both firms use dynamic pricing algorithms that respond to each other's prices within hours. When Walmart lowers a price, Amazon's algorithm detects and matches it — strategic interdependence in real time. OPEC is the classic cartel: member nations agree to restrict output collectively to raise the global oil price. But each member has a private incentive to cheat (produce more at the high price) — the prisoners dilemma explains why cartels are inherently unstable and why OPEC has repeatedly failed to maintain agreed quotas.",
                            "exam_tip_en": "AP prisoners dilemma question: set up the two-by-two payoff matrix, identify each player's dominant strategy if one exists, and find the Nash equilibrium (where both players play their best responses simultaneously). The key insight is that individual rationality leads to a collectively inferior outcome. Both firms could earn more by colluding (cooperative outcome), but each has an individual incentive to defect. The Nash equilibrium has both defecting and earning less than the cooperative outcome — illustrating the social cost of strategic competition.",
                        },
                        {
                            "heading": "Monopolistic Competition",
                            "body_en": "Monopolistic competition combines elements of both monopoly and perfect competition. Many firms (like perfect competition), differentiated products (like monopoly), and free entry and exit. Each firm has slight market power due to product differentiation (brand, quality, location, style). Short run: can earn economic profit or losses (like a monopolist). Long run: entry and exit drive economic profit to zero (like perfect competition). Long-run equilibrium: P = ATC (zero economic profit) but P > MC (allocative inefficiency). Firms do NOT produce at minimum ATC — they operate with excess capacity. The excess capacity theorem: monopolistically competitive firms produce less than the output at minimum ATC, meaning society pays slightly more than necessary for the variety it enjoys.",
                            "key_terms_en": ["monopolistic competition", "product differentiation", "excess capacity", "brand loyalty", "short-run profit", "long-run normal profit", "downward-sloping demand", "allocative inefficiency", "productive inefficiency"],
                            "real_world_en": "The restaurant industry is monopolistically competitive. Thousands of restaurants, each slightly different — different cuisine, atmosphere, location, service style. Short run: a trendy new restaurant earns high profits as early adopters fill seats every night. Long run: competing restaurants open in the neighbourhood, customers split among more options, the original restaurant's demand curve shifts left, and profits return to normal. This entry and demand-shifting process continues until zero economic profit — explaining why most restaurants operate on thin margins despite appearing popular and busy.",
                            "exam_tip_en": "Monopolistic competition versus perfect competition comparison: both reach zero economic profit in the long run, both have free entry and exit. Key differences: the monopolistically competitive firm has a downward-sloping demand curve, produces with excess capacity (P > minimum ATC), and has allocative inefficiency (P > MC). Perfect competition: P = minimum ATC = MC — no excess capacity, fully efficient. The trade-off is between variety and efficiency. AP evaluation point: the slightly higher price and excess capacity in monopolistic competition is the cost society pays for product variety.",
                        },
                    ],
                },
                {
                    "id": "ap_micro_5",
                    "title": "Factor Markets and Income Distribution",
                    "title_en": "Factor Markets and Income Distribution",
                    "estimated_time": "35 min",
                    "sections": [
                        {
                            "heading": "Derived Demand and Marginal Revenue Product",
                            "body_en": "Factor markets determine the prices of labour (wages), capital (interest), land (rent), and entrepreneurship (profit). Demand for factors is called derived demand because it stems from consumer demand for the final goods that factors help produce. Marginal Revenue Product (MRP) = change in total revenue from hiring one more unit of a factor = Marginal Product times Marginal Revenue (MP x MR). For a firm selling in a competitive output market, MR = P, so MRP = MP x P. A profit-maximising firm hires factors up to the point where MRP equals the factor price. For labour: hire workers until MRP = wage. The MRP curve IS the firm's demand curve for labour — it slopes downward because of diminishing marginal returns (MP falls as more workers are hired).",
                            "key_terms_en": ["derived demand", "MRP", "marginal revenue product", "marginal factor cost", "MRP = MFC rule", "labour demand", "wage determination", "factor market"],
                            "real_world_en": "NBA player salaries illustrate MRP theory. LeBron James earns over $45 million per year because his marginal revenue product (additional revenue he generates through ticket sales, merchandise, TV ratings, jersey sales, and sponsorship deals) exceeds this amount. The replacement-level player earns the minimum salary (approximately $1 million) because their MRP is just above this threshold. Professional sports is one of the purest labour markets: firms directly measure player MRP through advanced analytics, and salaries track MRP closely. Moneyball — the approach of finding undervalued players whose MRP exceeds their market wage — exploited inefficiencies in this market.",
                            "exam_tip_en": "AP factor market question always involves: (1) calculating MRP (MP times Price for competitive output markets), (2) comparing MRP to wage to find profit-maximising employment level (hire until MRP = wage), (3) showing the effect of a wage change or output price change on employment. If output price rises, MRP rises at every employment level, shifting labour demand right and raising both wages and employment. If output price falls, the reverse occurs. The MRP curve slopes downward due to diminishing marginal returns — this is why labour demand curves slope downward.",
                        },
                        {
                            "heading": "Labour Market and Wage Determination",
                            "body_en": "In competitive labour markets, the wage rate is determined by the intersection of labour supply and labour demand (MRP curve). Labour supply depends on: wages in alternative occupations, non-monetary benefits, education and training costs, and demographic factors. A minimum wage set above the competitive equilibrium creates unemployment by raising the quantity of labour supplied while reducing the quantity demanded. A monopsony (single buyer of labour) pays below the competitive wage and employs fewer workers than competitive equilibrium, because it faces an upward-sloping labour supply curve and internalises the cost of raising wages for all workers. A minimum wage in a monopsonistic labour market can actually increase both wages AND employment up to the competitive level.",
                            "key_terms_en": ["labour supply", "minimum wage", "unemployment from minimum wage", "monopsony", "wage discrimination", "compensating differentials", "human capital", "labour market equilibrium"],
                            "real_world_en": "Seattle's minimum wage increase to $15 per hour beginning in 2015 provided a natural experiment. Initial University of Washington studies found significant reductions in hours worked for low-wage workers. Other researchers found minimal employment effects in the restaurant sector. The mixed results reflect different local labour market conditions: in more monopsonistic markets (where employers have wage-setting power), minimum wages increase employment; in competitive markets, they reduce employment. The empirical debate continues but has shifted the economics profession toward accepting higher minimum wages as less damaging than the textbook competitive model implies.",
                            "exam_tip_en": "The monopsony diagram is the hardest factor market graph in AP Micro. Draw step by step: (1) upward-sloping labour supply S (which equals the Average Factor Cost curve, AFC_L). (2) MFC_L curve above S — for a linear S, MFC is twice as steep. (3) Downward-sloping MRP_L (labour demand). (4) Monopsony equilibrium: hire where MRP = MFC, pay the wage from the supply curve (lower than competitive). (5) Competitive equilibrium: where MRP = S. Show the employment gap (monopsony employs less) and wage gap (monopsony pays less). Label all curves and both equilibria clearly.",
                        },
                        {
                            "heading": "Capital and Land Markets",
                            "body_en": "Capital markets: the interest rate equilibrates the demand for loanable funds (firms investing in capital equipment) and the supply (household saving). Firms invest in physical capital when the expected rate of return on investment exceeds the interest rate. Higher interest rates reduce investment demand. The supply of land is perfectly inelastic — the total quantity of land is fixed regardless of price. Therefore the price of land (rent) is determined entirely by demand. Economic rent is any payment to a factor above its opportunity cost. Because land supply is perfectly inelastic, a rise in demand raises rent with no increase in supply — all the price increase goes to landowners as economic rent. Henry George proposed taxing land value precisely because such a tax does not reduce the supply of land.",
                            "key_terms_en": ["loanable funds market", "interest rate", "investment demand", "time preference", "economic rent", "perfectly inelastic supply", "land", "Henry George", "rent-seeking"],
                            "real_world_en": "San Francisco land prices illustrate perfectly inelastic supply. The city cannot create more land within its geographic boundaries. As technology industry demand for office and residential space surged from 2010 to 2020, land prices quadrupled while the quantity of land remained constant. All the price increase is pure economic rent — payments above the opportunity cost of land (which is essentially zero, since land has no production cost). This contrasts with markets where supply is elastic: if widget prices double, widget production can expand, limiting the price increase. With land, price increases face no supply response.",
                            "exam_tip_en": "Economic rent concept applies beyond land: any factor earning above its opportunity cost earns economic rent. A star entertainer earning $100 million who would perform for $500,000 (their next best option) earns $99.5 million in economic rent. Policy implication: taxing economic rent does not reduce the quantity of the factor supplied, because supply is perfectly inelastic — there is no efficiency loss. This is why land value taxes are considered among the most efficient taxes in economics. Contrast with taxing wages: this reduces labour supply (efficiency loss) but also reduces economic rent earned by high-skilled workers.",
                        },
                        {
                            "heading": "Income Distribution and Inequality",
                            "body_en": "The Lorenz curve shows the cumulative distribution of income across the population. On a perfectly equal Lorenz curve, the bottom 20% earn 20% of income, the bottom 40% earn 40%, and so on — a straight 45-degree line. In reality, the Lorenz curve bows below this diagonal. The Gini coefficient measures the area between the actual Lorenz curve and the perfect equality line, divided by the total area under the diagonal. Ranges from 0 (perfect equality) to 1 (one person has all income). Causes of inequality include differences in human capital, discrimination, inheritance, market power, and luck. Policies to reduce inequality: progressive taxation, transfer payments, minimum wage, publicly funded education, and healthcare.",
                            "key_terms_en": ["Lorenz curve", "Gini coefficient", "income inequality", "wealth inequality", "progressive tax", "transfer payments", "human capital", "marginal tax rate", "redistribution"],
                            "real_world_en": "The US Gini coefficient is approximately 0.49 before taxes and transfers — one of the highest among developed nations. The top 1% earn about 21% of pre-tax income while the bottom 50% earn about 13%. After taxes and transfers (Social Security, Medicare, food stamps, Medicaid), the post-tax Gini falls to approximately 0.39, showing fiscal policy's redistributive impact. Scandinavian countries achieve post-tax Gini coefficients of 0.27-0.28, despite having similar pre-tax inequality to the US, through much higher taxes and more generous transfers.",
                            "exam_tip_en": "AP tests on Lorenz curve: can you draw a more unequal distribution (more bowed out curve further from the diagonal) and a more equal distribution (closer to the 45-degree line)? Key evaluation: the equality-efficiency trade-off. Progressive taxes reduce inequality but may reduce work incentives at the margin. Transfer payments help lower-income households but can create welfare traps (high effective marginal tax rates as benefits are withdrawn). Universal basic income, earned income tax credits, and other designs try to balance redistribution with work incentives.",
                        },
                    ],
                },
                {
                    "id": "ap_micro_6",
                    "title": "Market Failure and the Role of Government",
                    "title_en": "Market Failure and the Role of Government",
                    "estimated_time": "40 min",
                    "sections": [
                        {
                            "heading": "Externalities: Negative and Positive",
                            "body_en": "An externality occurs when the production or consumption of a good affects third parties not involved in the market transaction, and these effects are not reflected in market prices. Negative production externalities: a factory emits pollution that harms nearby residents — the social cost (MSC) exceeds the private cost (MPC). The market overproduces relative to the social optimum because producers only consider private costs. Negative consumption externalities: drunk driving imposes costs on others. Positive externalities: education benefits society beyond the individual student (better-informed voters, lower crime, innovation spillovers) — MSB exceeds MPB, causing underproduction. Positive consumption externalities: vaccination creates herd immunity, benefiting those not vaccinated.",
                            "key_terms_en": ["negative externality", "positive externality", "MSC", "MPC", "MSB", "MPB", "Pigouvian tax", "Pigouvian subsidy", "Coase theorem", "internalise externality", "social optimum"],
                            "real_world_en": "Carbon emissions represent the world's largest negative externality. The US government estimates the social cost of carbon at approximately $51 per metric ton of CO2 — the present value of damages from climate change caused by one ton of emissions. Yet emitters in most markets pay nothing. This causes massive overproduction of fossil-fuel-based goods relative to the social optimum. Carbon taxes (used in Canada, the EU Emissions Trading System, and others) and cap-and-trade programmes attempt to internalise this externality by making emitters pay the social cost, shifting private costs toward social costs.",
                            "exam_tip_en": "Externality graph for AP: draw MPC and MSC curves for a negative externality. MSC lies above MPC, with the vertical gap equal to the marginal external cost (MEC). Market equilibrium: where demand (MPB = MSB for no consumption externality) intersects MPC. Socially optimal output: where demand intersects MSC. The market overproduces. Deadweight loss is the triangle between Q_market and Q_optimal. Corrective (Pigouvian) tax = MEC at Q_optimal, which shifts MPC up to MSC and restores efficient output. Label all these precisely for full AP free-response credit.",
                        },
                        {
                            "heading": "Public Goods and Common Resources",
                            "body_en": "Public goods have two defining characteristics: non-rivalry (one person's consumption does not reduce the amount available to others) and non-excludability (it is impossible or prohibitively costly to prevent anyone from consuming the good). These properties cause the free-rider problem: rational individuals let others pay for the public good and consume for free, so no one has an incentive to pay voluntarily. Markets either underprovide or completely fail to provide public goods. Government provision funded by taxes solves this. Common resources are rival (one person's use depletes availability) but non-excludable, leading to the tragedy of the commons — individual users have incentive to overexploit the resource, leading to collective depletion.",
                            "key_terms_en": ["public good", "non-rival", "non-excludable", "free rider problem", "private good", "common resource", "tragedy of the commons", "club good", "excludable", "rival"],
                            "real_world_en": "National defence is the classic public good: one additional citizen being defended does not reduce protection for others (non-rival), and it is impossible to protect some citizens while leaving others unprotected within the same territory (non-excludable). The Atlantic cod fishery collapse in 1992 illustrates the tragedy of the commons: each fishing boat had individual incentive to catch as many cod as possible before others did. Individual rationality led to collective catastrophe — the fishery collapsed, eliminating the very resource everyone depended on. Solutions include fishing quotas, privatisation of fishing rights, or international cooperative management.",
                            "exam_tip_en": "AP provides a four-cell matrix for classifying goods. Private goods (rival and excludable): most market goods like food and clothing. Public goods (non-rival and non-excludable): national defence, broadcast television, basic research. Club goods (non-rival but excludable): Netflix streaming, cable TV, toll roads with unlimited capacity. Common resources (rival but non-excludable): fish in the open ocean, clean air, public grazing land. Know at least two real examples for each category. The exam tests whether you can correctly identify which type of market failure each category creates.",
                        },
                        {
                            "heading": "Asymmetric Information",
                            "body_en": "Asymmetric information occurs when one party in a transaction has more relevant information than the other, distorting market outcomes. Adverse selection occurs BEFORE a transaction: individuals with hidden information about their type self-select into markets in ways that drive out desirable participants. In health insurance, the sick are more likely to buy coverage — if insurers cannot distinguish healthy from sick, they raise premiums, driving out healthy people, causing only the sick to remain (adverse selection death spiral). Moral hazard occurs AFTER a transaction: once a party is insured or protected from consequences, they change their behaviour in costly ways. People with comprehensive car insurance may drive less carefully because they bear fewer consequences of accidents.",
                            "key_terms_en": ["asymmetric information", "adverse selection", "moral hazard", "signalling", "screening", "principal-agent problem", "lemons problem", "information asymmetry"],
                            "real_world_en": "George Akerlof's lemons model (1970, Nobel Prize) applied to used cars: sellers know whether their car is a lemon (defective) but buyers do not. Buyers offer the average price for a car of unknown quality. Owners of good cars (worth more than average) withdraw from the market since the offered price undervalues their car. Only lemons remain. The market either breaks down or produces fewer high-quality transactions than socially optimal. Solutions include warranties (sellers credibly signal quality), independent inspections (reduce information asymmetry), and reputation systems like Carfax vehicle history reports.",
                            "exam_tip_en": "AP tests whether you can identify adverse selection (before transaction, hidden information about type — 'I know I am sick; the insurer does not') versus moral hazard (after transaction, hidden action — 'now that I am insured, I will be less careful'). Policy solutions differ: adverse selection is addressed by screening (the uninformed party investigates), signalling (the informed party credibly reveals information), or mandates (requiring everyone to participate, as with the ACA individual mandate). Moral hazard is addressed by monitoring, aligning incentives (deductibles, co-pays, performance-based pay).",
                        },
                        {
                            "heading": "Government Failure and Policy Evaluation",
                            "body_en": "Government intervention to correct market failure can itself cause inefficiency — government failure. Causes include: imperfect information (government does not know true social costs and benefits and may set taxes or subsidies incorrectly), regulatory capture (the regulated industry gains influence over its regulator and uses it to limit competition), political incentives (policies reflect electoral considerations rather than economic efficiency — policies favour concentrated, well-organised interests over diffuse public benefits), and unintended consequences (well-intentioned interventions produce unexpected outcomes that worsen welfare). Cost-benefit analysis is the standard tool for evaluating government programmes: implement if total social benefits exceed total social costs.",
                            "key_terms_en": ["government failure", "regulatory capture", "unintended consequences", "cost-benefit analysis", "deadweight loss of taxation", "public choice theory", "rent-seeking", "Laffer curve"],
                            "real_world_en": "The US corn ethanol mandate is a textbook example of government failure. The policy required blending corn-based ethanol into gasoline to reduce oil dependence and carbon emissions. Unintended consequences multiplied: corn prices rose sharply, causing food price increases that disproportionately harmed poor countries dependent on corn imports. Land was converted from forests and prairies to corn (increasing emissions and reducing biodiversity). Ethanol production itself is energy-intensive and the net carbon reduction is minimal or negative. Economists broadly concluded the mandate causes more harm than good — a well-intentioned policy with perverse outcomes driven by politically powerful corn farming interests.",
                            "exam_tip_en": "AP evaluation questions on government intervention require presenting both sides. Benefits of intervention: corrects allocative inefficiency, addresses equity, provides public goods. Costs: government failure, unintended consequences, crowding out private solutions, information problems, regulatory capture. The strongest AP free-response essays acknowledge that government intervention is not automatically welfare-improving: it depends on whether government failure is smaller than the market failure being corrected. The appropriate conclusion is conditional: 'Government should intervene IF its informational capacity and incentive structures allow it to improve upon the market outcome.'",
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
            "title_en": "Stock Fundamentals",
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
                            "key_terms_en": ["stock", "shareholder", "shares", "market cap", "listed company", "IPO"],
                            "real_world": "贵州茅台（600519）总股本约12.56亿股，股价约1500元，总市值约1.9万亿。买1股就拥有茅台约十三亿分之一的所有权。宁德时代2018年上市，IPO募资54亿元，用于扩大动力电池产能，今天市值超过1万亿——这就是上市融资的力量。",
                            "real_world_en": "Kweichow Moutai (600519) has approximately 1.256 billion shares outstanding. At a share price of around 1,500 yuan, its total market capitalisation is approximately 1.9 trillion yuan — buying just 1 share gives you roughly a 1-in-1.26-billion ownership stake. CATL (300750) listed in 2018, raising 5.4 billion yuan in its IPO to expand battery production capacity. Today its market cap exceeds 1 trillion yuan — a massive return for early investors.",
                        },
                        {
                            "heading": "股东的权利",
                            "heading_en": "Shareholder Rights",
                            "body": "作为股东，你拥有三项核心权利：(1) 分红权——公司盈利时可按持股比例获得现金分红；(2) 投票权——在股东大会上对公司重大决策投票，持股越多话语权越大；(3) 剩余财产分配权——公司清算时，债务偿清后剩余资产按持股比例分配。",
                            "body_en": "As a shareholder, you have three key rights: the right to receive dividends (a share of profits distributed in cash), the right to vote at shareholder meetings on important company decisions (more shares = more votes), and the right to receive remaining assets proportionally if the company is ever liquidated.",
                            "key_terms": ["分红", "股东大会", "投票权", "债券", "股权"],
                            "key_terms_en": ["dividend", "shareholder meeting", "voting right", "bond", "equity"],
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
                            "key_terms_en": ["A-shares", "SSE", "SZSE", "STAR Market", "ChiNext", "Main Board", "stock code"],
                            "real_world": "600519 = 贵州茅台（沪市主板）；000858 = 五粮液（深市主板）；300750 = 宁德时代（创业板）；688981 = 中芯国际（科创板）。看到代码前缀就知道在哪个市场上市。",
                            "real_world_en": "600519 = Kweichow Moutai (Shanghai Main Board), 000858 = Wuliangye (Shenzhen Main Board), 300750 = CATL (ChiNext Board), 688981 = SMIC (STAR Market). Once you know the code structure, you can instantly identify which exchange and board a stock belongs to.",
                        },
                        {
                            "heading": "交易时间与规则",
                            "heading_en": "Trading Hours & Rules",
                            "body": "A股交易时间：周一至周五，上午 9:30-11:30，下午 13:00-15:00，法定节假日休市。不同于加密货币的7×24小时交易，A股有严格的交易时间窗口。集合竞价：开盘前9:15-9:25和收盘前15分钟，用于确定开盘/收盘价格。",
                            "body_en": "A-shares trade Monday to Friday in two sessions: morning 9:30am–11:30am and afternoon 1:00pm–3:00pm (Beijing time). Markets close on Chinese public holidays. Unlike cryptocurrency, A-shares are NOT 24-hour markets. The opening call auction (9:15–9:25am) determines the opening price through a matching process.",
                            "key_terms": ["交易时间", "集合竞价", "连续竞价", "休市"],
                            "key_terms_en": ["trading hours", "call auction", "continuous auction", "market closed"],
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
                            "key_terms_en": ["candlestick", "bullish candle", "bearish candle", "open price", "close price", "high", "low", "wick", "price change %"],
                            "real_world": "以贵州茅台某天K线为例：开盘1480，收盘1520，最高1535，最低1475。红色实体代表上涨，上影线（1520→1535）代表尾盘回落，下影线（1475→1480）代表开盘短暂走低后反弹。涨幅计算：假设昨日收盘1500，今日1520，涨幅 = (1520-1500)/1500 × 100% = +1.33%。",
                            "real_world_en": "Moutai on a typical day: opens at 1,480, hits a high of 1,535, falls to a low of 1,475, closes at 1,520. This forms a red bullish candle with a long upper shadow (resistance at the top) and short lower shadow. Price change: if yesterday's close was 1,500 and today's is 1,530, the change = (1,530 − 1,500) / 1,500 × 100% = +2.0%.",
                        },
                        {
                            "heading": "涨跌停板制度",
                            "heading_en": "A-Share Price Limits (Limit Up / Limit Down)",
                            "body": "A股独有的涨跌停板制度：主板每天最多涨10%或跌10%；创业板、科创板是±20%；ST（风险警示）股是±5%。涨停时买盘大量堆积，流动性极差，很难买入。跌停时卖盘堆积，可能卖不出去——这是A股特有的流动性风险。",
                            "body_en": "A-shares have daily price movement limits unique to this market: Main Board stocks can only move ±10% per day. ChiNext and STAR Market stocks can move ±20%. ST (Special Treatment) stocks — companies with financial problems — are limited to ±5%. When a stock hits limit up, a large queue of buyers forms and it becomes nearly impossible to buy. When it hits limit down, sellers cannot exit — a major liquidity risk unique to A-shares.",
                            "key_terms": ["涨停", "跌停", "涨跌停板", "ST股", "流动性"],
                            "key_terms_en": ["limit up", "limit down", "price limit", "ST stock", "liquidity"],
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
                            "key_terms_en": ["P/E ratio", "EPS", "earnings per share", "P/B ratio", "book value", "trading below book"],
                            "real_world": "贵州茅台PE约30倍，银行股PE约5-6倍。白酒PE高因为增长预期高、护城河深；银行PE低因为增长慢、不良资产风险存在。2023年多家银行股P/B跌破1（如工商银行601398的P/B约0.5），反映市场对银行资产质量的担忧。不同行业PE不能直接比较。",
                            "real_world_en": "Kweichow Moutai trades at ~30x P/E while major banks trade at 5–6x P/E. Moutai commands a premium because of high expected growth and a deep competitive moat. In 2023, ICBC (601398) traded at P/B of ~0.5x — meaning the market valued it at half its accounting net assets, reflecting concerns about loan quality. Never compare P/E ratios across different industries.",
                        },
                        {
                            "heading": "股息率",
                            "heading_en": "Dividend Yield",
                            "body": "股息率 = 每股年分红 ÷ 当前股价 × 100%。反映持有股票的现金回报率，类似债券的票息率。股息率高的股票（通常>3%）吸引追求稳定现金流的价值投资者，在低利率环境下尤其受欢迎。",
                            "body_en": "Dividend yield = Annual Dividend Per Share ÷ Stock Price × 100%. It measures the cash return you receive relative to the share price — similar to an interest rate on your investment. Stocks with high dividend yields (typically >3%) attract income-focused investors, especially appealing when bank deposit rates are low.",
                            "key_terms": ["股息率", "分红", "现金流", "价值投资"],
                            "key_terms_en": ["dividend yield", "dividend", "cash flow", "value investing"],
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
            "title_en": "Investment Thinking",
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
                            "key_terms_en": ["fundamentals", "earnings expectations", "revenue", "net profit", "interest rate", "monetary policy", "industrial policy"],
                            "real_world": "2023年贵州茅台发布业绩报告，营收同比增长18%，净利润同比增长19%，超出市场预期，股价当日上涨3%。2024年9月中国央行降准降息，叠加一系列楼市和股市刺激政策，上证指数单周暴涨超10%——宏观政策可以在短期内主导市场走向。",
                            "real_world_en": "When Moutai released its 2023 results showing 18% revenue growth and 19% net profit growth — both beating expectations — the stock rose 3% on the day. In September 2024, China's PBOC cut rates and announced a broad stimulus package: the Shanghai Composite surged over 10% in a single week, showing how powerful macro policy can be in the short term.",
                        },
                        {
                            "heading": "市场情绪因素",
                            "heading_en": "Market Sentiment",
                            "body": "短期股价受市场情绪显著影响：新闻舆情（正面→买入情绪，负面→卖出情绪）、北向资金流向（外资买入通常被视为利好信号）、散户情绪（群体非理性行为）、技术面信号（均线、量能等）。情绪驱动的行情往往与基本面无关，持续时间短但波动大。",
                            "body_en": "In the short term, stock prices are heavily driven by investor sentiment: news flow (positive → buy pressure, negative → sell pressure), northbound capital flows (foreign money entering A-shares via Stock Connect, viewed as a bullish signal), retail investor herding behaviour, and technical signals. Sentiment-driven rallies are often disconnected from business fundamentals and tend to reverse sharply.",
                            "key_terms": ["市场情绪", "北向资金", "技术面", "舆情", "羊群效应"],
                            "key_terms_en": ["market sentiment", "northbound capital", "technical analysis", "news sentiment", "herding behavior"],
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
                            "key_terms_en": ["value investing", "growth investing", "intrinsic value", "margin of safety", "competitive moat", "long-term holding"],
                            "real_world": "巴菲特1988年买入可口可乐，持有36年，收益超过20倍。A股案例：2012年买入格力电器（000651）长期持有，10年约10倍收益。成长投资案例：2019年买入宁德时代（300750），当时PE超过100倍，3年内股价上涨超10倍，验证了新能源爆发式增长逻辑。",
                            "real_world_en": "Warren Buffett bought Coca-Cola in 1988 and still holds it 36 years later — a return of over 20x. In A-shares, investors who bought Gree Electric (000651) in 2012 and held 10 years saw ~10x returns driven by consistent earnings growth and dividends. CATL (300750) at 100x P/E in 2019 seemed expensive — but EV adoption exploded and the stock rose 10x in 3 years, validating the growth thesis.",
                        },
                        {
                            "heading": "投机与A股散户现实",
                            "heading_en": "Speculation and the Retail Investor Reality",
                            "body": "投机是短期博弈，利用价格波动获利，本质是零和游戏（你赚的是别人亏的）。A股散户（个人投资者）约占交易量的80%，但在与机构的博弈中长期处于劣势：信息不对称、资金量小、情绪化决策。",
                            "body_en": "Speculation involves short-term trading based on price movements rather than business fundamentals — it is essentially a zero-sum game (every gain comes from someone else's loss). Retail investors account for about 80% of A-share trading volume but consistently lose money against institutions due to information asymmetry, smaller capital, and emotional decision-making.",
                            "key_terms": ["投机", "零和游戏", "机构投资者", "散户", "信息不对称"],
                            "key_terms_en": ["speculation", "zero-sum game", "institutional investor", "retail investor", "information asymmetry"],
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
                            "key_terms_en": ["diversification", "systematic risk", "unsystematic risk", "correlation", "portfolio"],
                            "real_world": "2021年教育行业（新东方、好未来）因「双减」政策打压，股价跌幅超80%。如果只持有教育股，损失惨重。同期持有白酒+新能源+银行混合组合的投资者，整体影响有限——这是行业分散的价值。",
                            "real_world_en": "In 2021, Chinese education stocks (New Oriental, TAL Education) fell over 80% due to the government's 'double reduction' policy banning for-profit tutoring. Investors concentrated in education suffered catastrophic losses. Those holding a mix of baijiu + new energy + banks were largely protected — demonstrating the power of sector diversification.",
                        },
                        {
                            "heading": "时间分散（定期定额）",
                            "heading_en": "Time Diversification (Dollar Cost Averaging)",
                            "body": "定期定额投资（DCA，Dollar-Cost Averaging）：每隔固定时间（如每月）投入固定金额，无论市场涨跌都坚持执行。涨时买得少，跌时买得多，长期下来平均成本低于市场平均价格，避免一次性买在高点的风险。",
                            "body_en": "Dollar Cost Averaging (DCA) means investing a fixed amount at regular intervals (e.g. monthly), regardless of market conditions. When prices are high you buy fewer shares; when prices fall you buy more — naturally averaging your cost below the market average. This eliminates the risk of investing a lump sum at a market peak.",
                            "key_terms": ["定期定额", "DCA", "平均成本", "指数基金", "长期投资"],
                            "key_terms_en": ["DCA", "dollar cost averaging", "average cost", "index fund", "long-term investing"],
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
                            "key_terms_en": ["similar trends", "correlation", "sector move", "stock-specific move", "news analysis", "sentiment analysis"],
                            "real_world": "搜索贵州茅台（600519），相似走势通常显示五粮液（000858）、泸州老窖（000568）同步上涨——说明是白酒行业整体性行情，而非茅台个股利好。搜索某科技股时，若相似股票不跟涨，而该股票有正面AI新闻，则个股逻辑更清晰。",
                            "real_world_en": "Search for Moutai (600519) — if Similar Trends shows Wuliangye, Luzhou Laojiao, and Jiannanchun all rising together, it signals a sector-wide baijiu rally rather than a Moutai-specific catalyst. If a tech stock rises while its peers don't, and News Sentiment shows positive AI-related coverage, the individual stock thesis is much clearer and more actionable.",
                        },
                        {
                            "heading": "模拟炒股功能",
                            "heading_en": "Paper Trading Feature",
                            "body": "模拟炒股提供100万虚拟资金，严格执行A股规则：T+1（今天买的股票明天才能卖）、买入手续费0.03%（最低5元）、卖出手续费0.13%（含印花税，最低5元）、每次必须以100股为整数倍买卖。通过模拟交易，在不承担真实亏损风险的情况下，体验A股交易的完整流程和成本结构。",
                            "body_en": "Paper trading gives you 1,000,000 yuan of virtual money under real A-share rules: T+1 settlement (stocks bought today can only be sold tomorrow), buy commission 0.03% (min ¥5), sell commission 0.13% including stamp duty (min ¥5), and trades must be in multiples of 100 shares. Experience the full A-share trading process and cost structure without any real financial risk.",
                            "key_terms": ["T+1", "手续费", "印花税", "模拟交易", "仓位管理"],
                            "key_terms_en": ["T+1 settlement", "commission", "stamp duty", "paper trading", "position sizing"],
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
    "alevel":   ALEVEL_CURRICULUM,
    "igcse":    IGCSE_CURRICULUM,
    "ap_macro": AP_MACRO_CURRICULUM,
    "ap_micro": AP_MICRO_CURRICULUM,
    "ib":       IB_CURRICULUM,
    "stocks":   STOCKS_CURRICULUM,
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
            "id":       paper["id"],
            "title":    paper["title"],
            "title_en": paper.get("title_en", paper["title"]),
            "topics":   slim_topics,
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
            raise HTTPException(status_code=404, detail=f"Exam '{exam}' not found. Valid: alevel, igcse, ap_macro, ap_micro, ib, stocks")
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
        raise HTTPException(status_code=404, detail=f"Exam '{exam}' not found. Valid: alevel, igcse, ap_macro, ap_micro, ib, stocks")
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


# ── AI Tutor ──────────────────────────────────────────────────────────────────

_EXAM_DISPLAY = {
    "ap_micro": "AP Microeconomics",
    "ap_macro": "AP Macroeconomics",
    "alevel":   "A-Level Economics",
    "igcse":    "IGCSE Economics",
    "ib":       "IB Economics",
    "stocks":   "Stock Market",
}


class AskBody(BaseModel):
    question: str
    topic_id: str = ""
    exam: str = "ap_micro"
    lang: str = "en"


@router.post("/ask")
def ask_ai_tutor(body: AskBody):
    exam_key = body.exam.lower()
    exam_name = _EXAM_DISPLAY.get(exam_key, "Economics")

    topic_title = "Economics"
    if exam_key in _TOPIC_MAPS and body.topic_id:
        topic = _TOPIC_MAPS[exam_key].get(body.topic_id)
        if topic:
            topic_title = topic.get("title_en") or topic.get("title", "Economics")

    system_prompt = (
        f"You are an expert economics tutor specialising in {exam_name}. "
        f"The student is currently studying: {topic_title}. "
        "Answer their question clearly and concisely. "
        "Always: (1) define key terms precisely, (2) use a real-world example with actual data, "
        f"(3) include an exam tip specific to {exam_name} format, (4) keep answer under 300 words. "
        "If the question is in Chinese, answer in Chinese. If in English, answer in English."
    )

    try:
        import anthropic
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            system=system_prompt,
            messages=[{"role": "user", "content": body.question}],
        )
        answer = msg.content[0].text.strip()
        return {"answer": answer, "topic": topic_title, "exam": exam_name}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI tutor unavailable: {exc}")


# ── Economic Events Timeline ──────────────────────────────────────────────────

ECONOMIC_EVENTS = [
    {
        "id": "asian_crisis_1997",
        "title": "亚洲金融危机",
        "title_en": "Asian Financial Crisis",
        "date_range": "1997-07 ~ 1998-12",
        "year": 1997,
        "description": "1997年7月，泰铢遭受投机性攻击并崩溃，危机迅速蔓延至东南亚和东亚各国。泰国、印尼、韩国、马来西亚货币和股市暴跌，多国被迫向IMF寻求紧急救援。香港恒生指数在危机期间累计下跌约50%，上证指数由于资本管制受到较大保护。",
        "description_en": "Beginning with the collapse of the Thai baht in July 1997 after speculative attacks, the crisis spread rapidly across Southeast and East Asia. Thailand, Indonesia, South Korea and Malaysia saw their currencies and stock markets collapse. The Hang Seng fell ~50%; mainland China was largely shielded by capital controls.",
        "exam_points": [
            {"exam": "A-Level", "point": "Fixed vs floating exchange rates; speculative attack mechanism; IMF conditionality and moral hazard; contagion via trade and financial linkages."},
            {"exam": "AP Macro", "point": "Balance of payments crisis; current account deficits; role of IMF; currency crisis and capital flight."},
            {"exam": "IB", "point": "Exchange rate systems (HL); financial account; international financial institutions (IMF); J-curve effect."},
        ],
        "exam_points_zh": [
            {"exam": "A-Level", "point": "固定汇率与浮动汇率；投机性攻击机制；IMF援助条件与道德风险；贸易和金融渠道的传染效应。"},
            {"exam": "AP宏观", "point": "国际收支危机；经常账户赤字；IMF角色；货币危机与资本外逃。"},
            {"exam": "IB", "point": "汇率制度（HL）；金融账户；国际金融机构（IMF）；J曲线效应。"},
        ],
        "tickers": [
            {"symbol": "^GSPC", "label": "S&P 500", "color": "#6366f1"},
            {"symbol": "000001.SS", "label": "上证指数", "color": "#f59e0b"},
        ],
        "price_start": "1997-01-01",
        "price_end": "1999-06-30",
    },
    {
        "id": "dotcom_2000",
        "title": "科技网络泡沫",
        "title_en": "Dot-com Bubble",
        "date_range": "2000-03 ~ 2002-10",
        "year": 2000,
        "description": "1990年代末，互联网公司股价在投机热潮中大幅攀升，纳斯达克指数于2000年3月达到历史峰值5048点。随后估值崩溃，至2002年10月纳斯达克已较峰值下跌约78%，数千家互联网公司倒闭，美国经济陷入短暂衰退。",
        "description_en": "Soaring internet company valuations driven by speculative mania pushed the NASDAQ to a peak of 5,048 in March 2000. The subsequent collapse wiped out ~78% of NASDAQ's value by October 2002. Thousands of dot-com firms went bankrupt and the US entered a brief recession.",
        "exam_points": [
            {"exam": "A-Level", "point": "Speculative bubbles and irrational exuberance; asset price inflation; wealth effect on consumption; recession and the output gap."},
            {"exam": "AP Macro", "point": "Business cycle; aggregate demand shifts; recessionary gap; role of monetary policy (Fed rate cuts post-crash)."},
            {"exam": "IB", "point": "Market failure (speculation); business cycles; Keynesian vs monetarist policy responses."},
        ],
        "exam_points_zh": [
            {"exam": "A-Level", "point": "投机泡沫与非理性繁荣；资产价格通胀；财富效应对消费的影响；衰退与产出缺口。"},
            {"exam": "AP宏观", "point": "商业周期；总需求转移；衰退性缺口；货币政策角色（崩溃后联储降息）。"},
            {"exam": "IB", "point": "市场失灵（投机）；商业周期；凯恩斯主义与货币主义的政策回应。"},
        ],
        "tickers": [
            {"symbol": "^GSPC", "label": "S&P 500", "color": "#6366f1"},
            {"symbol": "^IXIC", "label": "纳斯达克", "color": "#10b981"},
        ],
        "price_start": "1999-09-01",
        "price_end": "2003-03-31",
    },
    {
        "id": "financial_crisis_2008",
        "title": "全球金融危机",
        "title_en": "Global Financial Crisis",
        "date_range": "2008-09 ~ 2009-03",
        "year": 2008,
        "description": "美国次级房贷市场崩溃引发全球金融危机。2008年9月，雷曼兄弟申请破产保护，全球金融体系几乎陷入瘫痪。标普500从峰值累计跌幅逾56%。中国推出4万亿元人民币刺激计划，上证指数2008年全年跌幅超65%，随后随刺激计划回升。",
        "description_en": "The collapse of the US subprime mortgage market triggered a global financial crisis. Lehman Brothers filed for bankruptcy in September 2008, nearly freezing the global financial system. S&P 500 fell over 56% peak-to-trough. China launched a ¥4 trillion stimulus; the SSE Composite fell 65% in 2008 before recovering sharply.",
        "exam_points": [
            {"exam": "A-Level", "point": "Systemic risk and moral hazard; credit crunch; asymmetric information (sub-prime lending); fiscal multiplier; quantitative easing."},
            {"exam": "AP Macro", "point": "Recession and output gap; fiscal stimulus (multiplier); Fed's unconventional monetary policy (QE, ZIRP); Keynesian response."},
            {"exam": "IB", "point": "Financial market failure; government intervention (bailouts, stimulus); Keynesian vs supply-side policies; debt sustainability (HL)."},
        ],
        "exam_points_zh": [
            {"exam": "A-Level", "point": "系统性风险与道德风险；信贷紧缩；信息不对称（次级贷款）；财政乘数；量化宽松。"},
            {"exam": "AP宏观", "point": "衰退与产出缺口；财政刺激（乘数效应）；美联储非常规货币政策（QE、零利率）；凯恩斯主义回应。"},
            {"exam": "IB", "point": "金融市场失灵；政府干预（救助、刺激）；凯恩斯主义与供给侧政策；债务可持续性（HL）。"},
        ],
        "tickers": [
            {"symbol": "^GSPC", "label": "S&P 500", "color": "#6366f1"},
            {"symbol": "000001.SS", "label": "上证指数", "color": "#f59e0b"},
        ],
        "price_start": "2007-06-01",
        "price_end": "2010-06-30",
    },
    {
        "id": "ashare_crash_2015",
        "title": "A股股灾",
        "title_en": "China A-Share Market Crash",
        "date_range": "2015-06 ~ 2015-09",
        "year": 2015,
        "description": "在杠杆资金（场内外配资）和散户情绪推动下，上证指数从2014年7月的约2000点急升至2015年6月的峰值5178点。随后在短短三个月内暴跌约45%，中国证监会紧急推出\"国家队\"救市措施，包括暂停新股发行、禁止大股东减持等。",
        "description_en": "Driven by leveraged retail investors (margin financing and shadow lending), the SSE Composite surged from ~2,000 in mid-2014 to a peak of 5,178 in June 2015. It then crashed ~45% in three months. The CSRC launched emergency 'national team' interventions: halting IPOs, banning large-shareholder selling, and deploying state funds to buy shares.",
        "exam_points": [
            {"exam": "A-Level", "point": "Speculative bubbles; leverage and amplification; government intervention in asset markets; moral hazard from bailouts."},
            {"exam": "AP Macro", "point": "Asset market volatility; wealth effect; government stabilisation policy; international spillovers (CNY devaluation)."},
            {"exam": "IB", "point": "Market failure (speculation, information asymmetry); government intervention; exchange rate policy (CNY devaluation Aug 2015)."},
        ],
        "exam_points_zh": [
            {"exam": "A-Level", "point": "投机泡沫；杠杆与放大效应；政府干预资产市场；救助带来的道德风险。"},
            {"exam": "AP宏观", "point": "资产市场波动；财富效应；政府稳定政策；国际溢出效应（人民币贬值）。"},
            {"exam": "IB", "point": "市场失灵（投机、信息不对称）；政府干预；汇率政策（2015年8月人民币贬值）。"},
        ],
        "tickers": [
            {"symbol": "000001.SS", "label": "上证指数", "color": "#f59e0b"},
            {"symbol": "^GSPC", "label": "S&P 500", "color": "#6366f1"},
        ],
        "price_start": "2014-12-01",
        "price_end": "2016-03-31",
    },
    {
        "id": "covid_2020",
        "title": "新冠疫情冲击",
        "title_en": "COVID-19 Pandemic Shock",
        "date_range": "2020-02 ~ 2020-04",
        "year": 2020,
        "description": "新冠疫情在全球蔓延引发历史上速度最快的熊市之一。标普500从历史高点到2020年3月23日跌幅达34%，仅用33天。各国央行和政府随即出台史无前例的刺激措施：美联储将利率降至零并重启QE，美国国会通过超2万亿美元CARES法案，市场在刺激政策驱动下V型反弹。",
        "description_en": "The global spread of COVID-19 triggered one of the fastest bear markets in history. The S&P 500 fell 34% in 33 days to its low on 23 March 2020. Governments and central banks responded with unprecedented stimulus: the Fed cut rates to zero and restarted QE; the US passed the $2.2 trillion CARES Act. Markets staged a V-shaped recovery driven by stimulus expectations.",
        "exam_points": [
            {"exam": "A-Level", "point": "Supply-side shock vs demand shock; fiscal multiplier (large-scale stimulus); central bank tools (QE, forward guidance); debt sustainability trade-off."},
            {"exam": "AP Macro", "point": "Aggregate supply shock; recessionary gap; fiscal policy (CARES Act multiplier); Fed's toolkit (rate cuts, QE); inflation risk post-stimulus."},
            {"exam": "IB", "point": "Supply-side and demand-side shocks; Keynesian vs monetarist response; long-run vs short-run trade-offs; developing vs developed country impacts."},
        ],
        "exam_points_zh": [
            {"exam": "A-Level", "point": "供给侧冲击与需求冲击；财政乘数（大规模刺激）；央行工具（QE、前瞻性指引）；债务可持续性权衡。"},
            {"exam": "AP宏观", "point": "总供给冲击；衰退性缺口；财政政策（CARES法案乘数）；美联储工具箱（降息、QE）；刺激后的通胀风险。"},
            {"exam": "IB", "point": "供给侧与需求侧冲击；凯恩斯主义与货币主义回应；长短期权衡；发展中国家与发达国家的差异化影响。"},
        ],
        "tickers": [
            {"symbol": "^GSPC", "label": "S&P 500", "color": "#6366f1"},
            {"symbol": "000001.SS", "label": "上证指数", "color": "#f59e0b"},
        ],
        "price_start": "2019-08-01",
        "price_end": "2021-03-31",
    },
    {
        "id": "fed_hikes_2022",
        "title": "美联储激进加息",
        "title_en": "Fed Rate Hike Cycle",
        "date_range": "2022-03 ~ 2023-07",
        "year": 2022,
        "description": "疫情后大规模财政刺激与供应链中断推动美国通胀飙升至40年高点（CPI峰值9.1%，2022年6月）。美联储随即展开史上最快加息周期之一，在16个月内累计加息525个基点，联邦基金利率从0.25%升至5.5%。标普500 2022年全年跌幅超19%，10年期美债收益率攀升至逾15年高位，A股亦受美元走强和外资撤出影响承压。",
        "description_en": "Post-pandemic fiscal stimulus and supply chain disruptions drove US inflation to a 40-year high (CPI peak 9.1%, June 2022). The Fed launched one of its fastest hiking cycles in history, raising rates 525bps in 16 months to 5.5%. The S&P 500 fell 19%+ in 2022; 10-year Treasury yields hit 15-year highs. A-shares also came under pressure from USD strength and foreign capital outflows.",
        "exam_points": [
            {"exam": "A-Level", "point": "Phillips curve trade-off; cost-push vs demand-pull inflation; monetary transmission mechanism; interest rate effect on investment (crowding out); exchange rate channel."},
            {"exam": "AP Macro", "point": "Inflation targeting; Taylor Rule; monetary policy transmission; stagflation risk; impact on bond prices (inverse yield-price relationship)."},
            {"exam": "IB", "point": "Monetary policy effectiveness; inflation types; exchange rate impact on trade (HL); debt service burden for developing economies."},
        ],
        "exam_points_zh": [
            {"exam": "A-Level", "point": "菲利普斯曲线权衡；成本推动型与需求拉动型通胀；货币政策传导机制；利率对投资的挤出效应；汇率渠道。"},
            {"exam": "AP宏观", "point": "通胀目标制；泰勒规则；货币政策传导；滞胀风险；债券价格与收益率的反向关系。"},
            {"exam": "IB", "point": "货币政策有效性；通胀类型；汇率对贸易的影响（HL）；发展中国家的债务偿还压力。"},
        ],
        "tickers": [
            {"symbol": "^GSPC", "label": "S&P 500", "color": "#6366f1"},
            {"symbol": "000001.SS", "label": "上证指数", "color": "#f59e0b"},
        ],
        "price_start": "2021-09-01",
        "price_end": "2023-09-30",
    },
]

# Simple in-memory price cache: { event_id: { ticker: [(date_str, close), ...] } }
_events_price_cache: dict = {}


def _fetch_event_prices(event: dict) -> dict:
    """Fetch and normalise price data for an event's tickers using yfinance."""
    import yfinance as yf
    prices = {}
    for t in event["tickers"]:
        sym = t["symbol"]
        try:
            df = yf.download(sym, start=event["price_start"], end=event["price_end"],
                             auto_adjust=True, progress=False)
            if df.empty:
                prices[sym] = []
                continue
            close_col = "Close"
            series = df[close_col].dropna()
            # Normalise to 100 at start so both indices are comparable
            base = float(series.iloc[0])
            prices[sym] = [
                {"date": str(idx.date()), "value": round(float(v) / base * 100, 2)}
                for idx, v in series.items()
            ]
        except Exception:
            prices[sym] = []
    return prices


@router.get("/events")
def get_events():
    """Return list of major economic events (metadata only, no price data)."""
    slim = []
    for ev in ECONOMIC_EVENTS:
        slim.append({
            "id":           ev["id"],
            "title":        ev["title"],
            "title_en":     ev["title_en"],
            "date_range":   ev["date_range"],
            "year":         ev["year"],
            "description":  ev["description"],
            "description_en": ev["description_en"],
            "exam_points":  ev["exam_points"],
            "exam_points_zh": ev["exam_points_zh"],
            "tickers":      ev["tickers"],
        })
    return {"events": slim}


@router.get("/events/{event_id}/prices")
def get_event_prices(event_id: str):
    """Return normalised price series for the given event (cached)."""
    event = next((e for e in ECONOMIC_EVENTS if e["id"] == event_id), None)
    if event is None:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found")
    if event_id not in _events_price_cache:
        _events_price_cache[event_id] = _fetch_event_prices(event)
    return {"event_id": event_id, "prices": _events_price_cache[event_id], "tickers": event["tickers"]}
