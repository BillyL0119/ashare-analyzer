"""
AP Microeconomics — ja / ko / fr translations
Injected at startup into AP_MICRO_CURRICULUM by _inject_ap_micro_translations()
"""

AP_MICRO_TRANSLATIONS = {

    # ── Unit 1: Basic Economic Concepts ──────────────────────────────────
    "ap_micro_1": {
        "title": {
            "ja": "基本的な経済概念",
            "ko": "기본 경제 개념",
            "fr": "Concepts économiques de base",
        },
        "sections": [
            {
                "heading": {
                    "ja": "希少性・選択・機会費用",
                    "ko": "희소성, 선택, 기회비용",
                    "fr": "Rareté, choix et coût d'opportunité",
                },
                "body": {
                    "ja": "希少性とは、無限の欲求に対して資源が有限であることを意味します。したがって、個人・企業・政府はすべて選択を迫られます。何かを選択するときに諦める最善の代替案が機会費用です。経済学の核心は、この選択のトレードオフを分析することです。",
                    "ko": "희소성은 무한한 욕구에 비해 자원이 유한하다는 것을 의미합니다. 따라서 개인, 기업, 정부 모두 선택을 해야 합니다. 무언가를 선택할 때 포기하는 최선의 대안이 기회비용입니다. 경제학의 핵심은 이러한 선택의 트레이드오프를 분석하는 것입니다.",
                    "fr": "La rareté signifie que les ressources sont limitées face à des désirs illimités. Individus, entreprises et gouvernements doivent donc faire des choix. Le coût d'opportunité est la meilleure alternative sacrifiée lors d'un choix. L'essentiel de l'économie consiste à analyser ces arbitrages.",
                },
                "real_world": {
                    "ja": "大学進学を選択した学生は、その間に働いて得られたはずの賃金（機会費用）を諦めています。政府も予算配分において同様のトレードオフに直面します。",
                    "ko": "대학에 진학하기로 한 학생은 그 기간 동안 일해서 벌 수 있었던 임금(기회비용)을 포기합니다. 정부도 예산 배분에서 유사한 트레이드오프에 직면합니다.",
                    "fr": "Un étudiant qui choisit d'aller à l'université renonce au salaire qu'il aurait pu gagner pendant cette période (coût d'opportunité). Les gouvernements font face à des arbitrages similaires dans l'allocation budgétaire.",
                },
                "exam_tip": {
                    "ja": "機会費用は常に「次善の選択肢」であり、諦めたすべての選択肢の合計ではありません。明示的費用と暗黙的費用の区別を整理しておきましょう。",
                    "ko": "기회비용은 항상 '차선의 선택지'이며, 포기한 모든 선택지의 합계가 아닙니다. 명시적 비용과 암묵적 비용의 차이를 정리해 두세요.",
                    "fr": "Le coût d'opportunité est toujours « la meilleure alternative sacrifiée », pas la somme de toutes les alternatives. Distinguez bien coûts explicites et coûts implicites.",
                },
            },
            {
                "heading": {
                    "ja": "生産可能性曲線（PPC）",
                    "ko": "생산가능곡선(PPC)",
                    "fr": "Courbe des possibilités de production (CPP)",
                },
                "body": {
                    "ja": "生産可能性曲線（PPC）は、すべての資源を完全かつ効率的に使用したときに生産できる財の組み合わせを示します。PPCの内側は非効率、外側は現時点では達成不可能です。PPCの傾きは機会費用を表し、凹型（原点に対して外側に湾曲）の形状は逓増する機会費用を示します。",
                    "ko": "생산가능곡선(PPC)은 모든 자원을 완전하고 효율적으로 사용할 때 생산할 수 있는 재화의 조합을 나타냅니다. PPC 안쪽은 비효율, 바깥쪽은 현재로서는 달성 불가능합니다. PPC의 기울기는 기회비용을 나타내며, 오목한(원점에서 바깥쪽으로 휜) 형태는 체증하는 기회비용을 보여줍니다.",
                    "fr": "La courbe des possibilités de production (CPP) représente les combinaisons de biens producibles lorsque toutes les ressources sont utilisées pleinement et efficacement. Un point intérieur indique l'inefficacité ; un point extérieur est inatteignable. La pente de la CPP représente le coût d'opportunité ; sa forme concave illustre des coûts d'opportunité croissants.",
                },
                "real_world": {
                    "ja": "コロナ禍での医療品増産は、他の財の生産を犠牲にするため、PPCの内側から曲線上への移動（効率化）や点の移動として表現できます。",
                    "ko": "코로나 팬데믹 동안 의료품 생산 확대는 다른 재화 생산을 희생시키므로, PPC 안쪽에서 곡선 위로의 이동(효율화)이나 점의 이동으로 표현할 수 있습니다.",
                    "fr": "Pendant la pandémie de Covid, l'augmentation de la production de matériel médical s'est faite au détriment d'autres biens, illustrant le déplacement le long de la CPP.",
                },
                "exam_tip": {
                    "ja": "技術進歩は特定の財についてPPCを外側にシフトさせます。両財の技術が同時に進歩すれば曲線全体が外側にシフトします。",
                    "ko": "기술 진보는 특정 재화에 대해 PPC를 바깥쪽으로 이동시킵니다. 두 재화의 기술이 동시에 진보하면 곡선 전체가 바깥쪽으로 이동합니다.",
                    "fr": "Un progrès technologique dans un secteur déplace la CPP vers l'extérieur pour ce bien. Un progrès dans les deux secteurs simultanément déplace toute la courbe vers l'extérieur.",
                },
            },
            {
                "heading": {
                    "ja": "比較優位と貿易",
                    "ko": "비교우위와 무역",
                    "fr": "Avantage comparatif et commerce",
                },
                "body": {
                    "ja": "比較優位とは、他者よりも低い機会費用で財を生産できる能力のことです。絶対優位（より少ない資源で生産）とは異なります。各国・各人が比較優位を持つ財の生産に特化して貿易を行うことで、相互に利益を得られます。",
                    "ko": "비교우위란 다른 사람보다 낮은 기회비용으로 재화를 생산할 수 있는 능력입니다. 절대우위(더 적은 자원으로 생산)와는 다릅니다. 각 국가·개인이 비교우위를 가진 재화 생산에 특화하고 무역하면 상호 이익을 얻을 수 있습니다.",
                    "fr": "L'avantage comparatif est la capacité à produire un bien à un coût d'opportunité plus faible que les autres. Il diffère de l'avantage absolu (produire avec moins de ressources). La spécialisation selon l'avantage comparatif et l'échange permettent à chacun d'en bénéficier.",
                },
                "real_world": {
                    "ja": "中国が製造業、米国がソフトウェアに特化しているのは、それぞれの比較優位を反映しています。両国間の貿易はその典型例です。",
                    "ko": "중국이 제조업에, 미국이 소프트웨어에 특화하는 것은 각자의 비교우위를 반영합니다. 양국 간 무역이 대표적인 예입니다.",
                    "fr": "La spécialisation de la Chine dans la fabrication et des États-Unis dans les logiciels reflète leurs avantages comparatifs respectifs. Le commerce bilatéral en est l'illustration.",
                },
                "exam_tip": {
                    "ja": "比較優位の計算では、機会費用を必ず比較してください。絶対優位を持つ国でも、比較優位は相対的な機会費用に基づきます。",
                    "ko": "비교우위 계산에서는 반드시 기회비용을 비교하세요. 절대우위를 가진 국가도 비교우위는 상대적 기회비용에 기반합니다.",
                    "fr": "Pour calculer l'avantage comparatif, comparez toujours les coûts d'opportunité. Même un pays avec avantage absolu doit se spécialiser selon son avantage comparatif.",
                },
            },
            {
                "heading": {
                    "ja": "経済システムと政府の役割",
                    "ko": "경제 시스템과 정부의 역할",
                    "fr": "Systèmes économiques et rôle de l'État",
                },
                "body": {
                    "ja": "経済システムには、市場経済・計画経済・混合経済の3種類があります。市場経済では価格メカニズムが資源配分を行います。計画経済では政府が決定します。現代のほとんどの経済は混合経済であり、市場と政府介入が共存します。政府は市場の失敗（外部性・公共財・情報の非対称性）を修正するために介入します。",
                    "ko": "경제 시스템에는 시장경제, 계획경제, 혼합경제의 세 가지가 있습니다. 시장경제에서는 가격 메커니즘이 자원 배분을 담당합니다. 계획경제에서는 정부가 결정합니다. 현대 대부분의 경제는 혼합경제로, 시장과 정부 개입이 공존합니다. 정부는 시장 실패(외부효과·공공재·정보의 비대칭성)를 교정하기 위해 개입합니다.",
                    "fr": "Les systèmes économiques se déclinent en économie de marché, planifiée et mixte. Dans l'économie de marché, le mécanisme des prix alloue les ressources. La plupart des économies modernes sont mixtes. L'État intervient pour corriger les défaillances du marché (externalités, biens publics, asymétries d'information).",
                },
                "real_world": {
                    "ja": "米国は市場経済を基本としながら、医療や教育に政府が介入する混合経済です。中国は計画経済から混合経済へ移行しつつあります。",
                    "ko": "미국은 시장경제를 기본으로 하면서 의료와 교육에 정부가 개입하는 혼합경제입니다. 중국은 계획경제에서 혼합경제로 전환 중입니다.",
                    "fr": "Les États-Unis sont une économie mixte, essentiellement de marché mais avec une intervention étatique dans la santé et l'éducation. La Chine évolue d'une économie planifiée vers une économie mixte.",
                },
                "exam_tip": {
                    "ja": "「3つの基本的な経済問題」（何を・どのように・誰のために生産するか）に対する答えが、経済システムの種類によって異なることを整理しておきましょう。",
                    "ko": "'3가지 기본 경제 문제'(무엇을·어떻게·누구를 위해 생산할 것인가)에 대한 답이 경제 시스템의 종류에 따라 어떻게 다른지 정리해 두세요.",
                    "fr": "Notez comment les réponses aux « trois questions économiques fondamentales » (quoi, comment, pour qui produire) diffèrent selon le système économique.",
                },
            },
        ],
    },

    # ── Unit 2: Supply and Demand ─────────────────────────────────────────
    "ap_micro_2": {
        "title": {
            "ja": "需要と供給",
            "ko": "수요와 공급",
            "fr": "Offre et demande",
        },
        "sections": [
            {
                "heading": {
                    "ja": "需要とその決定要因",
                    "ko": "수요와 그 결정요인",
                    "fr": "La demande et ses déterminants",
                },
                "body": {
                    "ja": "需要の法則：価格が下がると需要量が増加し、価格が上がると需要量が減少します（他の条件が等しければ）。需要曲線のシフト要因には、消費者所得・関連財の価格・嗜好・期待・購買者数があります。価格変化は曲線上の移動、それ以外の要因は曲線自体のシフトを引き起こします。",
                    "ko": "수요의 법칙: 가격이 하락하면 수요량이 증가하고, 가격이 상승하면 수요량이 감소합니다(다른 조건이 동일할 때). 수요곡선을 이동시키는 요인에는 소비자 소득, 관련재 가격, 기호, 기대, 구매자 수가 있습니다. 가격 변화는 곡선 위의 이동, 그 외 요인은 곡선 자체의 이동을 일으킵니다.",
                    "fr": "La loi de la demande : quand le prix baisse, la quantité demandée augmente (toutes choses égales par ailleurs). Les facteurs déplaçant la courbe de demande incluent le revenu des consommateurs, les prix des biens liés, les goûts, les anticipations et le nombre d'acheteurs. Une variation de prix provoque un mouvement le long de la courbe ; les autres facteurs déplacent la courbe.",
                },
                "real_world": {
                    "ja": "ガソリン価格の上昇はハイブリッド車への需要をシフトさせます（代替財効果）。また、消費者の所得増加は外食の需要曲線を右にシフトさせます。",
                    "ko": "휘발유 가격 상승은 하이브리드 차량에 대한 수요를 증가시킵니다(대체재 효과). 또한 소비자 소득 증가는 외식 수요곡선을 오른쪽으로 이동시킵니다.",
                    "fr": "La hausse du prix de l'essence déplace la demande vers les voitures hybrides (effet de substitution). Une hausse du revenu déplace la courbe de demande de restauration vers la droite.",
                },
                "exam_tip": {
                    "ja": "需要量の変化（同一曲線上の移動）と需要の変化（曲線のシフト）を混同しないようにしましょう。価格変化は需要量の変化、それ以外は需要の変化です。",
                    "ko": "수요량의 변화(같은 곡선 위의 이동)와 수요의 변화(곡선의 이동)를 혼동하지 마세요. 가격 변화는 수요량의 변화, 그 외는 수요의 변화입니다.",
                    "fr": "Ne confondez pas variation de la quantité demandée (mouvement le long de la courbe) et variation de la demande (déplacement de la courbe). La variation de prix provoque la première ; les autres facteurs provoquent la seconde.",
                },
            },
            {
                "heading": {
                    "ja": "供給とその決定要因",
                    "ko": "공급과 그 결정요인",
                    "fr": "L'offre et ses déterminants",
                },
                "body": {
                    "ja": "供給の法則：価格が上がると供給量が増加し、価格が下がると供給量が減少します。供給曲線のシフト要因には、生産要素の価格・技術・関連財の価格・期待・生産者数・政府の政策（補助金・税）があります。",
                    "ko": "공급의 법칙: 가격이 상승하면 공급량이 증가하고, 가격이 하락하면 공급량이 감소합니다. 공급곡선의 이동 요인에는 생산요소 가격, 기술, 관련재 가격, 기대, 생산자 수, 정부 정책(보조금·세금)이 있습니다.",
                    "fr": "La loi de l'offre : quand le prix monte, la quantité offerte augmente. Les facteurs déplaçant la courbe d'offre incluent les prix des intrants, la technologie, les prix des biens liés, les anticipations, le nombre de producteurs et les politiques gouvernementales (subventions, taxes).",
                },
                "real_world": {
                    "ja": "農業技術の向上（自動化・品種改良）は農産物の供給曲線を右にシフトさせ、価格下落と供給量増加をもたらします。",
                    "ko": "농업 기술 향상(자동화·품종 개량)은 농산물 공급곡선을 오른쪽으로 이동시켜 가격 하락과 공급량 증가를 가져옵니다.",
                    "fr": "L'amélioration des technologies agricoles (automatisation, sélection variétale) déplace la courbe d'offre vers la droite, entraînant une baisse des prix et une augmentation des quantités.",
                },
                "exam_tip": {
                    "ja": "原材料費の上昇は供給曲線を左にシフトさせます（供給減少）。補助金は右にシフト（供給増加）。この方向を混同しないようにしてください。",
                    "ko": "원자재 비용 상승은 공급곡선을 왼쪽으로 이동시킵니다(공급 감소). 보조금은 오른쪽으로 이동(공급 증가). 이 방향을 혼동하지 마세요.",
                    "fr": "Une hausse des coûts des intrants déplace la courbe d'offre vers la gauche (offre réduite). Une subvention la déplace vers la droite. Ne confondez pas ces directions.",
                },
            },
            {
                "heading": {
                    "ja": "均衡・過剰供給・不足",
                    "ko": "균형·초과공급·부족",
                    "fr": "Équilibre, surplus et pénurie",
                },
                "body": {
                    "ja": "均衡とは、需要量と供給量が一致する価格・数量の組み合わせです。均衡価格より上では過剰供給（余剰）が生じ、価格は下落圧力を受けます。均衡価格より下では不足が生じ、価格は上昇圧力を受けます。需要・供給のシフトにより均衡は変化します。",
                    "ko": "균형이란 수요량과 공급량이 일치하는 가격·수량의 조합입니다. 균형가격보다 높으면 초과공급(잉여)이 발생해 가격이 하락 압력을 받습니다. 균형가격보다 낮으면 부족이 발생해 가격이 상승 압력을 받습니다. 수요·공급의 이동으로 균형이 변합니다.",
                    "fr": "L'équilibre est la combinaison prix-quantité où la quantité demandée égale la quantité offerte. Au-dessus du prix d'équilibre, un surplus apparaît et pousse les prix à la baisse. En dessous, une pénurie pousse les prix à la hausse. Les déplacements de l'offre ou de la demande modifient l'équilibre.",
                },
                "real_world": {
                    "ja": "マスク需要の急増（コロナ禍）は当初不足を生じさせ、価格が急騰しました。その後、供給増加（新規参入・輸入）により均衡が回復しました。",
                    "ko": "마스크 수요 급증(코로나 팬데믹)은 초기에 부족을 일으켜 가격이 급등했습니다. 이후 공급 증가(신규 진입·수입)로 균형이 회복되었습니다.",
                    "fr": "La forte demande de masques pendant la Covid a d'abord créé une pénurie et des hausses de prix. L'augmentation de l'offre (nouveaux entrants, importations) a ensuite rétabli l'équilibre.",
                },
                "exam_tip": {
                    "ja": "需要と供給が同時にシフトする場合、均衡価格または均衡数量の変化が不確定になることがあります。グラフを必ず描いて確認しましょう。",
                    "ko": "수요와 공급이 동시에 이동할 경우, 균형가격 또는 균형수량의 변화가 불확정적일 수 있습니다. 반드시 그래프를 그려서 확인하세요.",
                    "fr": "Quand l'offre et la demande se déplacent simultanément, la variation du prix ou de la quantité d'équilibre peut être indéterminée. Tracez toujours un graphique pour vérifier.",
                },
            },
            {
                "heading": {
                    "ja": "需要・供給の価格弾力性",
                    "ko": "수요·공급의 가격탄력성",
                    "fr": "Élasticité-prix de la demande et de l'offre",
                },
                "body": {
                    "ja": "需要の価格弾力性（PED）は、価格変化に対する需要量の感応度を測ります。PED = %需要量変化 / %価格変化。|PED| > 1は弾力的（価格変化に敏感）、|PED| < 1は非弾力的、|PED| = 1は単位弾力的です。供給の弾力性も同様に計算します。弾力性は税負担の分配にも影響します。",
                    "ko": "수요의 가격탄력성(PED)은 가격 변화에 대한 수요량의 민감도를 측정합니다. PED = %수요량 변화 / %가격 변화. |PED| > 1은 탄력적(가격 변화에 민감), |PED| < 1은 비탄력적, |PED| = 1은 단위탄력적입니다. 공급탄력성도 같은 방식으로 계산합니다. 탄력성은 세금 부담 분배에도 영향을 미칩니다.",
                    "fr": "L'élasticité-prix de la demande (EPD) mesure la sensibilité de la quantité demandée à une variation de prix. EPD = %Δqd / %Δp. |EPD| > 1 = élastique ; |EPD| < 1 = inélastique ; |EPD| = 1 = élasticité unitaire. L'élasticité de l'offre se calcule de même. L'élasticité détermine aussi la répartition de la charge fiscale.",
                },
                "real_world": {
                    "ja": "タバコへの課税は非弾力的な需要（依存性）のため、消費者が税負担の大部分を負います。一方、ブランド品のような弾力的な需要財では生産者が負担します。",
                    "ko": "담배에 대한 과세는 비탄력적인 수요(중독성) 때문에 소비자가 세금 부담의 대부분을 집니다. 반면 브랜드 상품 같은 탄력적인 수요재에서는 생산자가 부담합니다.",
                    "fr": "La taxation du tabac, dont la demande est inélastique (addiction), fait supporter la majeure partie de la taxe aux consommateurs. À l'inverse, pour un bien à demande élastique, c'est le producteur qui supporte l'essentiel de la taxe.",
                },
                "exam_tip": {
                    "ja": "弾力性の決定要因（代替財の有無・必需品か奢侈品か・予算に占める割合・時間）を覚えておきましょう。これらはFRQで頻出です。",
                    "ko": "탄력성의 결정요인(대체재 유무·필수재 vs 사치재·예산 비중·시간)을 기억하세요. FRQ에서 자주 출제됩니다.",
                    "fr": "Mémorisez les déterminants de l'élasticité (disponibilité de substituts, bien de luxe ou de première nécessité, part du budget, délai). Ces facteurs reviennent souvent dans les questions à réponse libre.",
                },
            },
        ],
    },

    # ── Unit 3: Production, Cost, and Perfect Competition ─────────────────
    "ap_micro_3": {
        "title": {
            "ja": "生産・費用・完全競争",
            "ko": "생산, 비용, 완전경쟁",
            "fr": "Production, coûts et concurrence parfaite",
        },
        "sections": [
            {
                "heading": {
                    "ja": "短期の生産",
                    "ko": "단기 생산",
                    "fr": "Production à court terme",
                },
                "body": {
                    "ja": "短期では少なくとも1つの生産要素が固定されています（通常は資本）。可変投入物（労働）を増やすと、最初は収穫逓増が起き、やがて収穫逓減（限界生産物の低下）が生じます。限界生産物（MP）とは、可変投入物を1単位追加したときの産出量の増加分です。",
                    "ko": "단기에는 적어도 하나의 생산요소가 고정되어 있습니다(보통 자본). 가변투입물(노동)을 늘리면 처음에는 수확체증이 발생하고, 이후 수확체감(한계생산물 감소)이 나타납니다. 한계생산물(MP)은 가변투입물을 1단위 추가했을 때 산출량이 증가하는 양입니다.",
                    "fr": "À court terme, au moins un facteur de production est fixe (généralement le capital). L'augmentation du facteur variable (travail) entraîne d'abord des rendements croissants, puis décroissants (baisse du produit marginal). Le produit marginal (Pm) est l'augmentation de production résultant d'une unité supplémentaire de facteur variable.",
                },
                "real_world": {
                    "ja": "レストランで調理師を増やすと、最初は効率が上がります（役割分担）。しかし厨房のスペースが固定なら、やがて一人増やしても生産量の増加が小さくなります（収穫逓減）。",
                    "ko": "레스토랑에서 요리사를 늘리면 처음에는 효율이 높아집니다(역할 분담). 하지만 주방 공간이 고정되어 있다면, 결국 한 명 더 추가해도 생산량 증가가 작아집니다(수확체감).",
                    "fr": "Augmenter le nombre de cuisiniers dans un restaurant améliore d'abord l'efficacité (spécialisation). Mais si la cuisine est fixe, chaque cuisinier supplémentaire apporte de moins en moins (rendements décroissants).",
                },
                "exam_tip": {
                    "ja": "限界生産物が最大になる点を超えると収穫逓減が始まります。AP試験では生産表（投入と産出の表）から限界生産物を計算する問題がよく出ます。",
                    "ko": "한계생산물이 최대가 되는 점을 지나면 수확체감이 시작됩니다. AP 시험에서는 생산표(투입과 산출 표)에서 한계생산물을 계산하는 문제가 자주 나옵니다.",
                    "fr": "Les rendements décroissants commencent au-delà du point de produit marginal maximum. L'examen AP comporte souvent des calculs de produit marginal à partir d'un tableau de production.",
                },
            },
            {
                "heading": {
                    "ja": "生産費用",
                    "ko": "생산 비용",
                    "fr": "Coûts de production",
                },
                "body": {
                    "ja": "固定費用（FC）は産出量に関わらず一定です。可変費用（VC）は産出量とともに変化します。総費用（TC）= FC + VC。限界費用（MC）は1単位追加生産するコストです。平均総費用（ATC）= TC / Q。U字型のATCとMCの関係：MCがATCを下回る間はATCが低下し、上回ると上昇します。",
                    "ko": "고정비용(FC)은 산출량과 무관하게 일정합니다. 가변비용(VC)은 산출량과 함께 변합니다. 총비용(TC) = FC + VC. 한계비용(MC)은 1단위 추가 생산 비용입니다. 평균총비용(ATC) = TC / Q. U자형 ATC와 MC의 관계: MC가 ATC보다 낮으면 ATC가 하락하고, 높으면 상승합니다.",
                    "fr": "Les coûts fixes (CF) sont constants quelle que soit la production. Les coûts variables (CV) varient avec la production. Coût total (CT) = CF + CV. Le coût marginal (Cm) est le coût de production d'une unité supplémentaire. Coût total moyen (CTM) = CT / Q. Relation en U : tant que Cm < CTM, CTM baisse ; quand Cm > CTM, CTM monte.",
                },
                "real_world": {
                    "ja": "航空会社の固定費用（機体・施設）は高く、可変費用（燃料・乗務員）は低いため、空席を埋めるコストは低いです。これが割引運賃の経済的根拠です。",
                    "ko": "항공사의 고정비용(항공기·시설)은 높고, 가변비용(연료·승무원)은 낮으므로, 빈 좌석을 채우는 비용이 낮습니다. 이것이 할인 운임의 경제적 근거입니다.",
                    "fr": "Les compagnies aériennes ont de hauts coûts fixes (avions, infrastructures) et de faibles coûts variables (carburant, équipage), ce qui justifie économiquement les tarifs réduits pour remplir les sièges vides.",
                },
                "exam_tip": {
                    "ja": "MCはVCの傾きであり、ATCの最小点でATCと交差します。FRQではこの関係を使ったグラフ描画問題が頻出です。",
                    "ko": "MC는 VC의 기울기이며, ATC의 최솟점에서 ATC와 교차합니다. FRQ에서 이 관계를 활용한 그래프 그리기 문제가 자주 출제됩니다.",
                    "fr": "Le Cm est la pente du CV et croise le CTM en son minimum. Les questions à réponse libre demandent souvent de tracer ces courbes en utilisant cette relation.",
                },
            },
            {
                "heading": {
                    "ja": "完全競争：短期分析",
                    "ko": "완전경쟁: 단기 분석",
                    "fr": "Concurrence parfaite : analyse à court terme",
                },
                "body": {
                    "ja": "完全競争市場の特徴：多数の買い手・売り手、同質の財、自由な参入・退出、完全情報。各企業は価格受容者（プライステイカー）です。利潤最大化条件：P = MC（限界費用＝市場価格）。短期では経済的利潤・損失・ゼロ利潤のいずれかが可能です。",
                    "ko": "완전경쟁 시장의 특징: 다수의 구매자·판매자, 동질적 재화, 자유로운 진입·퇴출, 완전한 정보. 각 기업은 가격수용자(price taker)입니다. 이윤 극대화 조건: P = MC(한계비용 = 시장가격). 단기에는 경제적 이윤·손실·영이윤이 모두 가능합니다.",
                    "fr": "Caractéristiques de la concurrence parfaite : nombreux acheteurs et vendeurs, produit homogène, libre entrée/sortie, information parfaite. Chaque firme est preneuse de prix. Condition de maximisation du profit : P = Cm. À court terme, profit économique, perte ou profit nul sont tous possibles.",
                },
                "real_world": {
                    "ja": "農産物市場（小麦・コーン）は完全競争に近い市場です。個々の農家は市場価格を受け入れるしかありません。",
                    "ko": "농산물 시장(밀·옥수수)은 완전경쟁에 가까운 시장입니다. 개별 농가는 시장가격을 받아들일 수밖에 없습니다.",
                    "fr": "Les marchés agricoles (blé, maïs) se rapprochent de la concurrence parfaite. Les agriculteurs individuels sont preneurs de prix.",
                },
                "exam_tip": {
                    "ja": "ATC > P なら損失、ATC < P なら利潤、ATC = P ならゼロ利潤です。P > AVC の場合、損失があっても操業を継続すべきです（固定費用をカバーするため）。",
                    "ko": "ATC > P이면 손실, ATC < P이면 이윤, ATC = P이면 영이윤입니다. P > AVC인 경우, 손실이 있어도 조업을 계속해야 합니다(고정비용을 충당하기 위해).",
                    "fr": "Si ATC > P : perte ; ATC < P : profit ; ATC = P : profit nul. Si P > AVC, il faut continuer à produire même à perte (pour couvrir les coûts fixes).",
                },
            },
            {
                "heading": {
                    "ja": "完全競争の長期",
                    "ko": "완전경쟁의 장기",
                    "fr": "Long terme en concurrence parfaite",
                },
                "body": {
                    "ja": "長期では、企業の参入・退出が自由なため、経済的利潤はゼロに向かいます。利潤があれば新規参入が増え、価格が下がります。損失があれば企業が退出し、価格が上がります。長期均衡では P = MC = ATC（最小点）が成立します。これを「ゼロ利潤均衡」と呼びます。",
                    "ko": "장기에는 기업의 진입·퇴출이 자유롭기 때문에 경제적 이윤은 영으로 수렴합니다. 이윤이 있으면 신규 진입이 늘어 가격이 하락합니다. 손실이 있으면 기업이 퇴출해 가격이 상승합니다. 장기 균형에서는 P = MC = ATC(최솟점)가 성립합니다. 이를 '영이윤 균형'이라고 합니다.",
                    "fr": "À long terme, la libre entrée et sortie fait tendre le profit économique vers zéro. Des profits attirent de nouveaux entrants, faisant baisser les prix. Des pertes provoquent des sorties, faisant monter les prix. L'équilibre de long terme satisfait P = Cm = CTM (au minimum). C'est l'équilibre de profit nul.",
                },
                "real_world": {
                    "ja": "スマートフォンアプリ市場では、人気アプリが利益を得ると、類似アプリが次々と参入し、競争が激化して利潤が低下します。",
                    "ko": "스마트폰 앱 시장에서 인기 앱이 이익을 얻으면, 유사한 앱이 잇따라 진입해 경쟁이 심화되고 이윤이 감소합니다.",
                    "fr": "Sur le marché des applications mobiles, les applications populaires attirent des concurrents similaires, intensifiant la concurrence et réduisant les profits.",
                },
                "exam_tip": {
                    "ja": "長期均衡グラフでは、需要曲線（= MR = P）がATCの最小点に接している状態を描いてください。これがゼロ利潤均衡の視覚的表現です。",
                    "ko": "장기 균형 그래프에서는 수요곡선(= MR = P)이 ATC의 최솟점에 접하는 상태를 그리세요. 이것이 영이윤 균형의 시각적 표현입니다.",
                    "fr": "Dans le graphique d'équilibre de long terme, représentez la courbe de demande (= Rm = P) tangente au minimum du CTM. C'est la représentation visuelle de l'équilibre de profit nul.",
                },
            },
        ],
    },

    # ── Unit 4: Imperfect Competition ─────────────────────────────────────
    "ap_micro_4": {
        "title": {
            "ja": "不完全競争",
            "ko": "불완전경쟁",
            "fr": "Concurrence imparfaite",
        },
        "sections": [
            {
                "heading": {
                    "ja": "独占：価格設定・産出量・厚生損失",
                    "ko": "독점: 가격 설정, 산출량, 후생 손실",
                    "fr": "Monopole : prix, production et perte de bien-être",
                },
                "body": {
                    "ja": "独占企業は市場全体の需要曲線に直面する唯一の売り手です。利潤最大化：MR = MC。独占では MR < P となるため、完全競争より高い価格・少ない産出量が設定されます。これにより「死荷重」（厚生損失）が生じます。独占には参入障壁（特許・規模の経済・政府規制）が存在します。",
                    "ko": "독점기업은 시장 전체의 수요곡선에 직면하는 유일한 판매자입니다. 이윤 극대화: MR = MC. 독점에서는 MR < P이므로, 완전경쟁보다 높은 가격·낮은 산출량이 설정됩니다. 이로 인해 '사중손실'(후생 손실)이 발생합니다. 독점에는 진입장벽(특허·규모의 경제·정부 규제)이 존재합니다.",
                    "fr": "Un monopoleur est le seul vendeur sur le marché et fait face à la courbe de demande du marché. Maximisation du profit : Rm = Cm. Comme Rm < P, le monopoleur fixe un prix plus élevé et une production moindre qu'en concurrence parfaite, créant une perte de bien-être sociale (poids mort). Des barrières à l'entrée (brevets, économies d'échelle, réglementation) maintiennent le monopole.",
                },
                "real_world": {
                    "ja": "製薬会社が特許を持つ薬品は独占的な価格設定が可能です。特許切れ後にジェネリック医薬品が参入すると価格が下落します。",
                    "ko": "제약회사가 특허를 보유한 의약품은 독점적인 가격 설정이 가능합니다. 특허 만료 후 제네릭 의약품이 진입하면 가격이 하락합니다.",
                    "fr": "Les médicaments sous brevet permettent une tarification monopolistique. À l'expiration du brevet, l'entrée des génériques fait chuter les prix.",
                },
                "exam_tip": {
                    "ja": "独占グラフでは必ず需要曲線・MR・MC・ATCをすべて描いてください。厚生損失（死荷重）は、完全競争産出量と独占産出量の間の三角形です。",
                    "ko": "독점 그래프에서는 반드시 수요곡선·MR·MC·ATC를 모두 그리세요. 후생 손실(사중손실)은 완전경쟁 산출량과 독점 산출량 사이의 삼각형입니다.",
                    "fr": "Dans le graphique du monopole, tracez toujours la demande, Rm, Cm et CTM. La perte de bien-être est le triangle entre la production concurrentielle et la production monopolistique.",
                },
            },
            {
                "heading": {
                    "ja": "価格差別",
                    "ko": "가격 차별",
                    "fr": "Discrimination par les prix",
                },
                "body": {
                    "ja": "価格差別とは、同一財を異なる消費者に異なる価格で販売することです。第1種（完全）価格差別：各消費者から最大支払意思額を徴収。第2種：購入量に応じて価格が異なる。第3種：市場をセグメント（学生・高齢者など）に分けて価格を変える。価格差別が可能な条件：市場支配力・市場分割可能性・再販不可能性。",
                    "ko": "가격 차별이란 동일한 재화를 다른 소비자에게 다른 가격으로 판매하는 것입니다. 제1급(완전) 가격 차별: 각 소비자로부터 최대 지불의향액을 징수. 제2급: 구매량에 따라 가격이 다름. 제3급: 시장을 세그먼트(학생·노인 등)로 나눠 가격을 다르게 책정. 가격 차별 가능 조건: 시장 지배력·시장 분리 가능성·재판매 불가능성.",
                    "fr": "La discrimination par les prix consiste à vendre le même bien à des prix différents selon les consommateurs. 1er degré (parfaite) : chaque consommateur paie son prix de réservation. 2e degré : tarification par tranches de quantité. 3e degré : segmentation du marché (étudiants, seniors, etc.). Conditions : pouvoir de marché, possibilité de segmenter, impossibilité de revente.",
                },
                "real_world": {
                    "ja": "映画館の学生・シニア割引、航空会社の早期予約割引、ソフトウェアの教育機関向け価格などが第3種価格差別の例です。",
                    "ko": "영화관의 학생·시니어 할인, 항공사의 조기 예약 할인, 소프트웨어의 교육기관 가격 등이 제3급 가격 차별의 예입니다.",
                    "fr": "Les tarifs réduits cinéma pour étudiants et seniors, les réductions de réservation anticipée des compagnies aériennes et les licences logicielles éducatives sont des exemples de discrimination au 3e degré.",
                },
                "exam_tip": {
                    "ja": "第3種価格差別では、弾力性の低い市場で高い価格を設定し、弾力性の高い市場で低い価格を設定します。MR1 = MR2 = MC の条件を使って利潤最大化点を求めます。",
                    "ko": "제3급 가격 차별에서는 탄력성이 낮은 시장에서 높은 가격을, 탄력성이 높은 시장에서 낮은 가격을 책정합니다. MR1 = MR2 = MC 조건을 이용해 이윤 극대화 지점을 구합니다.",
                    "fr": "En discrimination au 3e degré, fixez un prix élevé sur le marché inélastique et bas sur le marché élastique. Utilisez la condition Rm1 = Rm2 = Cm pour trouver le profit maximum.",
                },
            },
            {
                "heading": {
                    "ja": "寡占とゲーム理論",
                    "ko": "과점과 게임이론",
                    "fr": "Oligopole et théorie des jeux",
                },
                "body": {
                    "ja": "寡占は少数の企業が支配する市場構造です。企業間の相互依存性が高く、戦略的行動（ゲーム理論）が重要です。囚人のジレンマ：協調すれば双方にとって最善の結果が得られますが、裏切りのインセンティブがあるため非協調均衡（ナッシュ均衡）に陥りやすいです。カルテルは価格協定を通じて独占利潤を目指しますが、競争法で禁止されています。",
                    "ko": "과점은 소수의 기업이 지배하는 시장 구조입니다. 기업 간 상호의존성이 높고, 전략적 행동(게임이론)이 중요합니다. 죄수의 딜레마: 협조하면 쌍방에게 최선의 결과를 얻지만, 배신 인센티브 때문에 비협조 균형(내시 균형)에 빠지기 쉽습니다. 카르텔은 가격 협정을 통해 독점 이윤을 추구하지만, 경쟁법으로 금지됩니다.",
                    "fr": "L'oligopole est une structure de marché dominée par un petit nombre de firmes fortement interdépendantes. Le comportement stratégique (théorie des jeux) est crucial. Le dilemme du prisonnier : la coopération est optimale, mais l'incitation à trahir mène à l'équilibre de Nash (non-coopératif). Les cartels visent le profit monopolistique par accord de prix, mais sont interdits par la législation antitrust.",
                },
                "real_world": {
                    "ja": "OPEC（石油輸出国機構）はカルテルの典型例です。加盟国が生産量を制限することで価格を高く維持しようとしますが、各国には抜け駆けのインセンティブがあります。",
                    "ko": "OPEC(석유수출국기구)는 카르텔의 대표적인 예입니다. 회원국이 생산량을 제한해 가격을 높게 유지하려 하지만, 각국에는 이탈 인센티브가 있습니다.",
                    "fr": "L'OPEP est l'exemple classique de cartel. Les membres limitent la production pour maintenir des prix élevés, mais chacun a intérêt à tricher, illustrant le dilemme du prisonnier.",
                },
                "exam_tip": {
                    "ja": "利得行列（ペイオフマトリクス）の読み方を練習してください。支配戦略とナッシュ均衡の定義を正確に覚えておきましょう。",
                    "ko": "이득 행렬(페이오프 매트릭스) 읽는 법을 연습하세요. 지배전략과 내시 균형의 정의를 정확히 기억하세요.",
                    "fr": "Entraînez-vous à lire les matrices de gains. Mémorisez précisément les définitions de stratégie dominante et d'équilibre de Nash.",
                },
            },
            {
                "heading": {
                    "ja": "独占的競争",
                    "ko": "독점적 경쟁",
                    "fr": "Concurrence monopolistique",
                },
                "body": {
                    "ja": "独占的競争は、多数の企業が差別化された製品を販売する市場構造です。各企業は右下がりの需要曲線を持ちます（製品差別化による価格支配力）。短期では利潤が可能ですが、長期では新規参入によりゼロ利潤になります（独占と完全競争の中間的性質）。広告・ブランド化による非価格競争が特徴です。",
                    "ko": "독점적 경쟁은 다수의 기업이 차별화된 상품을 판매하는 시장 구조입니다. 각 기업은 우하향하는 수요곡선을 가집니다(제품 차별화에 의한 가격 지배력). 단기에는 이윤이 가능하지만, 장기에는 신규 진입으로 영이윤이 됩니다(독점과 완전경쟁의 중간적 성질). 광고·브랜드화를 통한 비가격 경쟁이 특징입니다.",
                    "fr": "La concurrence monopolistique est une structure où de nombreuses firmes vendent des produits différenciés. Chaque firme fait face à une courbe de demande descendante (pouvoir de prix grâce à la différenciation). Des profits sont possibles à court terme, mais la libre entrée ramène le profit à zéro à long terme. La concurrence non tarifaire (publicité, marque) est caractéristique.",
                },
                "real_world": {
                    "ja": "レストラン・美容院・衣料品ブランドは独占的競争の典型例です。それぞれが独自の特徴（メニュー・立地・スタイル）で差別化を図っています。",
                    "ko": "레스토랑·미용실·의류 브랜드는 독점적 경쟁의 대표적인 예입니다. 각각 고유한 특징(메뉴·입지·스타일)으로 차별화를 꾀합니다.",
                    "fr": "Les restaurants, salons de coiffure et marques de vêtements sont des exemples typiques de concurrence monopolistique. Chacun se différencie par des caractéristiques uniques (menu, emplacement, style).",
                },
                "exam_tip": {
                    "ja": "長期均衡グラフでは、需要曲線がATCに接しています（ゼロ利潤）が、ATCの最小点ではありません（過剰設備）。この点が完全競争との違いです。",
                    "ko": "장기 균형 그래프에서 수요곡선이 ATC에 접하지만(영이윤), ATC의 최솟점은 아닙니다(과잉 설비). 이 점이 완전경쟁과의 차이입니다.",
                    "fr": "Dans le graphique d'équilibre de long terme, la demande est tangente au CTM (profit nul) mais pas en son minimum (excès de capacité). C'est la différence avec la concurrence parfaite.",
                },
            },
        ],
    },

    # ── Unit 5: Factor Markets ─────────────────────────────────────────────
    "ap_micro_5": {
        "title": {
            "ja": "要素市場",
            "ko": "요소 시장",
            "fr": "Marchés des facteurs",
        },
        "sections": [
            {
                "heading": {
                    "ja": "派生需要と限界収入生産物",
                    "ko": "파생 수요와 한계수입생산물",
                    "fr": "Demande dérivée et produit de recette marginale",
                },
                "body": {
                    "ja": "要素（労働・資本・土地）への需要は、その要素が生産する最終財の需要から派生します（派生需要）。企業は利潤最大化のため、MRP = MFC（限界収入生産物＝限界要素費用）となる点まで要素を雇用します。MRP = MP × MR（限界生産物 × 限界収入）。",
                    "ko": "생산요소(노동·자본·토지)에 대한 수요는 그 요소가 생산하는 최종재 수요에서 파생됩니다(파생 수요). 기업은 이윤 극대화를 위해 MRP = MFC(한계수입생산물 = 한계요소비용)가 되는 지점까지 요소를 고용합니다. MRP = MP × MR(한계생산물 × 한계수입).",
                    "fr": "La demande de facteurs (travail, capital, terre) est dérivée de la demande du bien final produit. Les entreprises embauchent jusqu'à ce que PmRm = CmF (produit de recette marginale = coût marginal du facteur). PmRm = Pm × Rm (produit marginal × recette marginale).",
                },
                "real_world": {
                    "ja": "AI技術の普及により、プログラマーへの需要が増加しています。これはソフトウェアの需要増加から派生した労働需要の変化です。",
                    "ko": "AI 기술 보급으로 프로그래머에 대한 수요가 증가하고 있습니다. 이는 소프트웨어 수요 증가에서 파생된 노동 수요의 변화입니다.",
                    "fr": "L'essor de l'IA accroît la demande de programmeurs — un exemple de demande de travail dérivée de la demande croissante de logiciels.",
                },
                "exam_tip": {
                    "ja": "完全競争財市場ではMRP = MP × P。不完全競争財市場ではMRP = MP × MR（MR < P）。この違いを覚えておきましょう。",
                    "ko": "완전경쟁 재화 시장에서는 MRP = MP × P. 불완전경쟁 재화 시장에서는 MRP = MP × MR(MR < P). 이 차이를 기억하세요.",
                    "fr": "En concurrence parfaite sur le marché du bien : PmRm = Pm × P. En concurrence imparfaite : PmRm = Pm × Rm (Rm < P). Retenez cette distinction.",
                },
            },
            {
                "heading": {
                    "ja": "労働市場と賃金決定",
                    "ko": "노동 시장과 임금 결정",
                    "fr": "Marché du travail et détermination des salaires",
                },
                "body": {
                    "ja": "競争的労働市場では、賃金は労働需要（MRP）と労働供給の均衡で決まります。労働需要：MRP曲線（右下がり）。労働供給：労働者の機会費用（余暇）を反映（右上がり）。モノプソニー（買い手独占）では、企業が市場支配力を持ち、均衡賃金より低い賃金を設定します。最低賃金制度はモノプソニー市場では雇用を増加させる可能性があります。",
                    "ko": "경쟁적 노동 시장에서 임금은 노동 수요(MRP)와 노동 공급의 균형으로 결정됩니다. 노동 수요: MRP 곡선(우하향). 노동 공급: 노동자의 기회비용(여가)을 반영(우상향). 수요독점(모노프소니)에서는 기업이 시장 지배력을 가져 균형임금보다 낮은 임금을 설정합니다. 최저임금제는 수요독점 시장에서 고용을 증가시킬 수 있습니다.",
                    "fr": "Dans un marché du travail concurrentiel, le salaire est déterminé par l'équilibre entre la demande de travail (PmRm, décroissante) et l'offre de travail (croissante, reflétant le coût d'opportunité des loisirs). En monopsone, l'entreprise fixe un salaire inférieur à l'équilibre. Un salaire minimum peut augmenter l'emploi en situation de monopsone.",
                },
                "real_world": {
                    "ja": "アマゾンのような大企業が地域の主要雇用主である場合、モノプソニー的な力を持ちます。最低賃金の引き上げはこのような市場で雇用を増やす可能性があります。",
                    "ko": "아마존 같은 대기업이 지역의 주요 고용주인 경우, 수요독점적 힘을 가집니다. 최저임금 인상은 이러한 시장에서 고용을 늘릴 수 있습니다.",
                    "fr": "Quand une grande entreprise comme Amazon est le principal employeur local, elle détient un pouvoir de monopsone. Une hausse du salaire minimum peut y augmenter l'emploi.",
                },
                "exam_tip": {
                    "ja": "最低賃金の効果はモノプソニー市場と競争的市場で逆になります。競争的市場では雇用減少、モノプソニーでは雇用増加の可能性があります。",
                    "ko": "최저임금의 효과는 수요독점 시장과 경쟁적 시장에서 반대로 나타납니다. 경쟁적 시장에서는 고용 감소, 수요독점에서는 고용 증가 가능성이 있습니다.",
                    "fr": "L'effet d'un salaire minimum est inversé selon qu'on est en marché concurrentiel (baisse de l'emploi) ou en monopsone (hausse possible de l'emploi).",
                },
            },
            {
                "heading": {
                    "ja": "資本市場と土地市場",
                    "ko": "자본 시장과 토지 시장",
                    "fr": "Marchés du capital et de la terre",
                },
                "body": {
                    "ja": "資本（機械・設備）の需要はMRP、供給は生産された財です。利子率が資本の価格となります。土地は供給が固定（完全非弾力的）なため、地代はすべて経済的地代（レント）となります。経済的地代とは、要素の供給者が最低限受け入れる金額（転換収益）を超えて受け取る額です。",
                    "ko": "자본(기계·설비)의 수요는 MRP, 공급은 생산된 재화입니다. 이자율이 자본의 가격이 됩니다. 토지는 공급이 고정(완전 비탄력적)이므로 지대는 모두 경제적 지대(렌트)가 됩니다. 경제적 지대란 요소 공급자가 최소한 받아야 하는 금액(이전 수입)을 초과해 받는 액수입니다.",
                    "fr": "La demande de capital (machines, équipements) est le PmRm, l'offre est le capital produit. Le taux d'intérêt est le prix du capital. La terre a une offre fixe (parfaitement inélastique), donc la rente foncière est entièrement une rente économique. La rente économique est ce qu'un facteur reçoit au-delà de son coût de transfert (revenu minimum nécessaire).",
                },
                "real_world": {
                    "ja": "東京や上海の一等地の地価は、土地供給が固定されているため、需要増加がすべて地代上昇に転換されます。これが経済的地代の典型例です。",
                    "ko": "도쿄나 상하이의 핵심 지역 지가는 토지 공급이 고정되어 있어 수요 증가가 모두 지대 상승으로 전환됩니다. 이것이 경제적 지대의 전형적인 예입니다.",
                    "fr": "Dans les centres de Tokyo ou Shanghai, l'offre foncière étant fixe, toute hausse de la demande se traduit intégralement par une hausse de la rente — exemple classique de rente économique.",
                },
                "exam_tip": {
                    "ja": "経済的地代と転換収益の区別を整理しましょう。供給が完全非弾力的な場合、すべての収入が経済的地代となります。",
                    "ko": "경제적 지대와 이전 수입의 구분을 정리하세요. 공급이 완전 비탄력적인 경우 모든 수입이 경제적 지대가 됩니다.",
                    "fr": "Distinguez rente économique et coût de transfert. Quand l'offre est parfaitement inélastique, la totalité du revenu est une rente économique.",
                },
            },
            {
                "heading": {
                    "ja": "所得分配と不平等",
                    "ko": "소득 분배와 불평등",
                    "fr": "Répartition des revenus et inégalités",
                },
                "body": {
                    "ja": "所得分配の不平等はローレンツ曲線とジニ係数で測定します。ジニ係数が0に近いほど平等、1に近いほど不平等です。所得不平等の原因：教育・スキル格差、資本所有の集中、差別、技術変化（高スキル労働者への需要増）。政府の再分配政策：累進課税・社会保障・最低賃金。",
                    "ko": "소득 분배 불평등은 로렌츠 곡선과 지니 계수로 측정합니다. 지니 계수가 0에 가까울수록 평등, 1에 가까울수록 불평등합니다. 소득 불평등의 원인: 교육·기술 격차, 자본 소유 집중, 차별, 기술 변화(고숙련 노동자 수요 증가). 정부의 재분배 정책: 누진세·사회보장·최저임금.",
                    "fr": "L'inégalité de revenus est mesurée par la courbe de Lorenz et le coefficient de Gini. Plus le Gini est proche de 0, plus c'est égalitaire ; proche de 1 signifie très inégalitaire. Causes : inégalités d'éducation/compétences, concentration du capital, discrimination, changements technologiques (hausse de la demande de compétences). Politiques de redistribution : impôt progressif, protection sociale, salaire minimum.",
                },
                "real_world": {
                    "ja": "米国のジニ係数は先進国の中で比較的高く（約0.4）、北欧諸国（約0.25）と比べると所得格差が大きいです。累進所得税と社会保障制度が格差を縮小させています。",
                    "ko": "미국의 지니 계수는 선진국 중 비교적 높고(약 0.4), 북유럽 국가(약 0.25)에 비해 소득 격차가 큽니다. 누진 소득세와 사회보장 제도가 격차를 축소시킵니다.",
                    "fr": "Le coefficient de Gini des États-Unis (~0,4) est relativement élevé parmi les pays développés, comparé aux pays nordiques (~0,25). L'impôt progressif et les transferts sociaux réduisent les inégalités.",
                },
                "exam_tip": {
                    "ja": "ローレンツ曲線が対角線（完全平等線）から遠いほどジニ係数が大きくなります。FRQでローレンツ曲線を描いて政策効果を説明する問題が出ます。",
                    "ko": "로렌츠 곡선이 대각선(완전 평등선)에서 멀수록 지니 계수가 커집니다. FRQ에서 로렌츠 곡선을 그려 정책 효과를 설명하는 문제가 출제됩니다.",
                    "fr": "Plus la courbe de Lorenz s'éloigne de la diagonale (égalité parfaite), plus le Gini est grand. Les questions à réponse libre demandent souvent de tracer la courbe de Lorenz pour illustrer l'effet d'une politique.",
                },
            },
        ],
    },

    # ── Unit 6: Market Failure and the Role of Government ─────────────────
    "ap_micro_6": {
        "title": {
            "ja": "市場の失敗と政府の役割",
            "ko": "시장 실패와 정부의 역할",
            "fr": "Défaillances du marché et rôle de l'État",
        },
        "sections": [
            {
                "heading": {
                    "ja": "外部性：負の外部性と正の外部性",
                    "ko": "외부효과: 부정적 외부효과와 긍정적 외부효과",
                    "fr": "Externalités : négatives et positives",
                },
                "body": {
                    "ja": "外部性とは、経済取引が第三者に与えるコストまたは便益のことです。負の外部性（例：工場の大気汚染）では社会的費用 > 私的費用となり、過剰生産が起きます。正の外部性（例：教育・予防接種）では社会的便益 > 私的便益となり、過少消費が起きます。解決策：ピグー税（負）・補助金（正）・コースの定理。",
                    "ko": "외부효과란 경제 거래가 제3자에게 미치는 비용 또는 편익입니다. 부정적 외부효과(예: 공장 대기 오염)에서는 사회적 비용 > 사적 비용이 되어 과잉 생산이 발생합니다. 긍정적 외부효과(예: 교육·예방접종)에서는 사회적 편익 > 사적 편익이 되어 과소 소비가 발생합니다. 해결책: 피구세(부정적)·보조금(긍정적)·코스 정리.",
                    "fr": "Une externalité est un coût ou avantage imposé à des tiers par une transaction économique. Externalité négative (ex. pollution industrielle) : coût social > coût privé → surproduction. Externalité positive (ex. éducation, vaccination) : bénéfice social > bénéfice privé → sous-consommation. Corrections : taxe pigouvienne (négative), subvention (positive), théorème de Coase.",
                },
                "real_world": {
                    "ja": "炭素税は温室効果ガス排出という負の外部性を内部化するピグー税の典型例です。一方、ワクチン接種への補助金は正の外部性（集団免疫）を促進します。",
                    "ko": "탄소세는 온실가스 배출이라는 부정적 외부효과를 내부화하는 피구세의 전형적인 예입니다. 반면, 백신 접종 보조금은 긍정적 외부효과(집단 면역)를 촉진합니다.",
                    "fr": "La taxe carbone est l'exemple classique de taxe pigouvienne pour internaliser l'externalité négative des émissions de CO₂. Les subventions à la vaccination favorisent l'externalité positive de l'immunité collective.",
                },
                "exam_tip": {
                    "ja": "外部性グラフでは「社会的費用曲線」または「社会的便益曲線」をMC・MB曲線と区別して描いてください。死荷重（過剰・過少生産による厚生損失）の三角形の位置を正確に示しましょう。",
                    "ko": "외부효과 그래프에서는 '사회적 비용 곡선' 또는 '사회적 편익 곡선'을 MC·MB 곡선과 구별해 그리세요. 사중손실(과잉·과소 생산에 의한 후생 손실) 삼각형의 위치를 정확하게 표시하세요.",
                    "fr": "Dans les graphiques d'externalité, tracez distinctement la courbe de coût social ou de bénéfice social par rapport aux courbes Cm/Bm privés. Indiquez précisément le triangle de perte de bien-être (production excessive ou insuffisante).",
                },
            },
            {
                "heading": {
                    "ja": "公共財とコモンズ",
                    "ko": "공공재와 공유자원",
                    "fr": "Biens publics et biens communs",
                },
                "body": {
                    "ja": "財の分類：非排除性（利用を妨げられない）と非競合性（一人が消費しても他者の消費が減らない）で4種類に分類します。公共財（非排除・非競合）：国防・街灯。フリーライダー問題のため市場では過少供給されます。コモンズ（排除不可・競合的）：漁業資源・共有牧草地。過剰使用（コモンズの悲劇）が起きやすいです。",
                    "ko": "재화의 분류: 비배제성(이용을 막을 수 없음)과 비경합성(한 사람이 소비해도 다른 사람의 소비가 줄지 않음)으로 4종류로 분류합니다. 공공재(비배제·비경합): 국방·가로등. 무임승차 문제 때문에 시장에서는 과소 공급됩니다. 공유자원(배제 불가·경합적): 어업 자원·공유 목초지. 과잉 사용(공유지의 비극)이 발생하기 쉽습니다.",
                    "fr": "Classification des biens selon l'excluabilité (peut-on en exclure les non-payants ?) et la rivalité (la consommation d'un individu réduit-elle celle des autres ?). Biens publics (non excluables, non rivaux) : défense nationale, éclairage public. Le problème du passager clandestin entraîne une sous-offre marchande. Biens communs (non excluables, rivaux) : ressources halieutiques, pâturages communaux. Surutilisation (tragédie des communs) probable.",
                },
                "real_world": {
                    "ja": "北極の漁業資源はコモンズの典型例です。各国が過剰漁獲するインセンティブを持つため、国際協定（クォータ制度）が必要です。",
                    "ko": "북극의 어업 자원은 공유자원의 전형적인 예입니다. 각국이 과잉 어획 인센티브를 가지므로 국제 협정(쿼터 제도)이 필요합니다.",
                    "fr": "Les ressources halieutiques arctiques sont un exemple classique de bien commun. Chaque pays a intérêt à surpêcher, d'où la nécessité d'accords internationaux (quotas).",
                },
                "exam_tip": {
                    "ja": "4種類の財（公共財・私的財・クラブ財・コモンズ）を非排除性と非競合性の2軸で整理しましょう。試験では具体例から財の種類を判断する問題が出ます。",
                    "ko": "4종류의 재화(공공재·사적재·클럽재·공유자원)를 비배제성과 비경합성의 2축으로 정리하세요. 시험에서는 구체적인 예로부터 재화의 종류를 판단하는 문제가 출제됩니다.",
                    "fr": "Classifiez les quatre types de biens (publics, privés, de club, communs) selon les deux axes excluabilité/rivalité. L'examen demande souvent d'identifier le type de bien à partir d'un exemple concret.",
                },
            },
            {
                "heading": {
                    "ja": "情報の非対称性",
                    "ko": "정보의 비대칭성",
                    "fr": "Asymétries d'information",
                },
                "body": {
                    "ja": "情報の非対称性とは、取引の一方が他方より多くの情報を持つ状況です。逆選択：契約前の情報格差（例：中古車市場・保険市場）。モラルハザード：契約後の行動変化（例：保険加入後のリスク増大）。解決策：シグナリング（高学歴・証明書）、スクリーニング（審査）、保証・評判システム。",
                    "ko": "정보의 비대칭성이란 거래의 한쪽이 다른 쪽보다 더 많은 정보를 가진 상황입니다. 역선택: 계약 전 정보 격차(예: 중고차 시장·보험 시장). 도덕적 해이: 계약 후 행동 변화(예: 보험 가입 후 위험 증가). 해결책: 신호 발송(고학력·증명서), 심사(스크리닝), 보증·평판 시스템.",
                    "fr": "L'asymétrie d'information désigne une situation où l'une des parties à une transaction dispose de plus d'informations que l'autre. Sélection adverse : asymétrie avant contrat (ex. marché des voitures d'occasion, assurance). Aléa moral : changement de comportement après contrat (ex. prise de risque accrue après assurance). Solutions : signalisation (diplômes, certifications), tri (screening), garanties, réputation.",
                },
                "real_world": {
                    "ja": "中古車市場（レモン問題）では、売り手が車の品質を知っているが買い手は知らないため、良質な車が市場から退出してしまう逆選択が起きます。",
                    "ko": "중고차 시장(레몬 문제)에서는 판매자가 차량 품질을 알지만 구매자는 모르기 때문에, 양질의 차가 시장에서 빠져나가는 역선택이 발생합니다.",
                    "fr": "Sur le marché des voitures d'occasion (problème des « lemons »), le vendeur connaît la qualité du véhicule mais pas l'acheteur. Les bonnes voitures quittent le marché — exemple classique de sélection adverse.",
                },
                "exam_tip": {
                    "ja": "逆選択は事前の問題、モラルハザードは事後の問題です。この区別を明確にしましょう。シグナリングとスクリーニングの違いも整理しておいてください（誰が情報を提供するか）。",
                    "ko": "역선택은 사전 문제, 도덕적 해이는 사후 문제입니다. 이 구분을 명확히 하세요. 신호 발송과 스크리닝의 차이(누가 정보를 제공하는가)도 정리해 두세요.",
                    "fr": "La sélection adverse est un problème ex ante, l'aléa moral est ex post. Faites bien cette distinction. Distinguez aussi signalisation (l'agent informé envoie le signal) et tri (le principal non-informé sélectionne).",
                },
            },
            {
                "heading": {
                    "ja": "政府の失敗と政策評価",
                    "ko": "정부 실패와 정책 평가",
                    "fr": "Défaillances de l'État et évaluation des politiques",
                },
                "body": {
                    "ja": "政府介入は市場の失敗を修正しますが、政府自身も失敗することがあります。政府の失敗の原因：情報不足・政治的インセンティブ（票の獲得）・規制の虜（被規制業界が規制機関を支配）・意図せぬ結果。費用便益分析は政策の社会的純便益を評価するツールです。",
                    "ko": "정부 개입은 시장 실패를 교정하지만, 정부 자체도 실패할 수 있습니다. 정부 실패의 원인: 정보 부족·정치적 인센티브(표 획득)·규제 포획(피규제 산업이 규제 기관을 지배)·의도치 않은 결과. 비용편익 분석은 정책의 사회적 순편익을 평가하는 도구입니다.",
                    "fr": "L'intervention publique corrige les défaillances du marché, mais l'État peut lui-même échouer. Causes de la défaillance de l'État : manque d'information, incitations politiques (recherche de votes), capture réglementaire (l'industrie contrôle le régulateur), conséquences non intentionnelles. L'analyse coûts-avantages évalue le bénéfice social net d'une politique.",
                },
                "real_world": {
                    "ja": "価格規制（家賃統制）は住宅不足を引き起こし、農業補助金は過剰生産と財政負担をもたらします。これらは政府介入の意図せぬ結果の典型例です。",
                    "ko": "가격 규제(임대료 통제)는 주택 부족을 일으키고, 농업 보조금은 과잉 생산과 재정 부담을 초래합니다. 이는 정부 개입의 의도치 않은 결과의 전형적인 예입니다.",
                    "fr": "Le contrôle des loyers crée des pénuries de logements ; les subventions agricoles entraînent surproduction et charge budgétaire. Ce sont des exemples typiques de conséquences non intentionnelles de l'intervention étatique.",
                },
                "exam_tip": {
                    "ja": "「市場の失敗があれば政府が介入すべき」という論理は、政府の失敗の可能性を考慮すると必ずしも正しくありません。FRQでは政策の費用と便益を両方論じることが求められます。",
                    "ko": "'시장 실패가 있으면 정부가 개입해야 한다'는 논리는 정부 실패 가능성을 고려하면 반드시 옳지 않습니다. FRQ에서는 정책의 비용과 편익을 모두 논해야 합니다.",
                    "fr": "La logique « défaillance du marché → intervention étatique » n'est pas automatiquement valide si l'État peut aussi échouer. Les questions à réponse libre exigent de discuter à la fois les coûts et les avantages d'une politique.",
                },
            },
        ],
    },
}
