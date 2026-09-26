# A-Level Economics translations: ja / ko / fr
# Structure: topic_id → { "title": {lang: str}, "sections": [ {field: {lang: str}} ] }

ALEVEL_TRANSLATIONS = {
    "micro_1": {
        "title": {
            "ja": "基本的な経済問題",
            "ko": "기본 경제 문제",
            "fr": "Le problème économique fondamental",
        },
        "sections": [
            # Section 1: Scarcity and Choice
            {
                "heading": {
                    "ja": "希少性と選択",
                    "ko": "희소성과 선택",
                    "fr": "La rareté et le choix",
                },
                "body": {
                    "ja": "経済学が存在するのは一つの根本的な問題によるものである。それが希少性である。資源（土地・労働・資本・企業者）は有限であるが、人間の欲求は無限である。したがってすべての社会は、何を生産するか、どのように生産するか、誰のために生産するかという選択を迫られる。",
                    "ko": "경제학은 하나의 근본적인 문제 때문에 존재한다. 바로 희소성이다. 자원(토지, 노동, 자본, 기업가 정신)은 유한하지만 인간의 욕구는 무한하다. 따라서 모든 사회는 무엇을 생산할지, 어떻게 생산할지, 누구를 위해 생산할지를 선택해야 한다.",
                    "fr": "L'économie existe à cause d'un problème fondamental : la rareté. Les ressources — terre, travail, capital et esprit d'entreprise — sont limitées, mais les besoins humains sont infinis. Toute société doit donc faire des choix sur ce qu'elle produit, comment elle le produit, et pour qui.",
                },
                "exam_tip": {
                    "ja": "論述問題では希少性を正確に定義すること。「欲求は無限だが資源は有限」。採点者は専門的な定義に点数を与える。",
                    "ko": "논술 문제에서 희소성을 정확히 정의할 것. '욕구는 무한하지만 자원은 유한하다'. 채점자는 전문적인 정의에 점수를 준다.",
                    "fr": "Définir précisément la rareté dans les dissertations : « des besoins illimités face à des ressources limitées ». Les examinateurs récompensent les définitions techniques.",
                },
            },
            # Section 2: Opportunity Cost and PPC
            {
                "heading": {
                    "ja": "機会費用と生産可能性曲線",
                    "ko": "기회비용과 생산가능곡선",
                    "fr": "Le coût d'opportunité et la CPP",
                },
                "body": {
                    "ja": "機会費用とは、意思決定をした際に失われる次善の代替案の価値である。生産可能性曲線（PPC）は、すべての資源が完全かつ効率的に使用されたときに生産できる2財の最大の組み合わせを示す。曲線の内側の点は不完全雇用を、外側の点は現時点では達成不可能であることを示す。",
                    "ko": "기회비용은 의사결정 시 포기하는 차선의 대안 가치다. 생산가능곡선(PPC)은 모든 자원이 완전하고 효율적으로 사용될 때 생산 가능한 두 재화의 최대 조합을 보여준다. 곡선 안쪽의 점은 불완전 고용을, 바깥쪽은 현재 달성 불가능함을 나타낸다.",
                    "fr": "Le coût d'opportunité est la valeur de la meilleure alternative abandonnée lors d'une décision. La CPP montre les combinaisons maximales de deux biens qu'une économie peut produire lorsque toutes ses ressources sont pleinement et efficacement employées. Les points à l'intérieur représentent le sous-emploi ; les points à l'extérieur sont actuellement inaccessibles.",
                },
                "real_world": {
                    "ja": "中国が再生可能エネルギー（太陽光・風力）に多額投資するという決定は、伝統的なインフラに使える資源が減ることを意味する。2023年に中国はクリーンエネルギーに7,500億ドル以上を費やしたが、その機会費用は建設できたはずの病院・学校・道路であった。中国のPPCは1990年から2020年にかけて大きく外側にシフトし、一人当たりGDPは約350ドルから1万ドル超へと上昇した。",
                    "ko": "중국이 재생에너지(태양광, 풍력)에 대규모 투자하기로 한 결정은 전통적 인프라에 쓸 자원이 줄어든다는 의미다. 2023년 중국은 청정에너지에 7,500억 달러 이상을 지출했으며, 기회비용은 그 돈으로 건설할 수 있었던 병원·학교·도로였다. 중국의 PPC는 1990~2020년 사이 크게 바깥으로 이동하며 1인당 GDP가 약 350달러에서 1만 달러 이상으로 상승했다.",
                    "fr": "La décision de la Chine d'investir massivement dans les énergies renouvelables (solaire, éolien) implique moins de ressources pour les infrastructures traditionnelles. En 2023, la Chine a dépensé plus de 750 milliards de dollars dans les énergies propres — le coût d'opportunité correspondait à l'équivalent en hôpitaux, écoles ou routes qui auraient pu être construits. La CPP de la Chine a connu un déplacement spectaculaire vers l'extérieur de 1990 à 2020, le PIB par habitant passant d'environ 350 à plus de 10 000 dollars.",
                },
                "exam_tip": {
                    "ja": "機会費用と具体的な失われた代替案を必ず結びつけること。PPCに関する8点問題では、定義・作図・曲線上の移動対曲線のシフトの説明・実例提示の順で答えること。",
                    "ko": "기회비용과 구체적으로 포기한 대안을 반드시 연결할 것. PPC 8점 문제에서는 정의, 그래프 그리기, 곡선 위 이동 대 곡선 이동 설명, 실제 사례 제시 순으로 답할 것.",
                    "fr": "Toujours relier le coût d'opportunité à une alternative spécifique abandonnée. Pour les questions de 8 points sur la CPP : la définir, la tracer, expliquer les mouvements le long de la courbe par rapport aux déplacements, et donner un exemple réel.",
                },
            },
        ],
    },
    "micro_2": {
        "title": {
            "ja": "需要と供給",
            "ko": "수요와 공급",
            "fr": "L'offre et la demande",
        },
        "sections": [
            # Section 1: Demand
            {
                "heading": {
                    "ja": "需要",
                    "ko": "수요",
                    "fr": "La demande",
                },
                "body": {
                    "ja": "需要とは、他の条件が等しいとき、各価格水準で消費者が購入しようとする意思と能力のある財の量を指す。需要の法則は、価格が上昇すると需要量が減少するというものであり、右下がりの需要曲線を生む。",
                    "ko": "수요란 다른 조건이 동일할 때, 각 가격 수준에서 소비자가 구매하려는 의지와 능력이 있는 재화의 양을 의미한다. 수요의 법칙은 가격이 상승하면 수요량이 감소한다는 것으로, 우하향하는 수요곡선을 도출한다.",
                    "fr": "La demande désigne la quantité d'un bien que les consommateurs sont disposés et capables d'acheter à chaque niveau de prix, toutes choses égales par ailleurs. La loi de la demande stipule qu'à mesure que le prix augmente, la quantité demandée diminue, ce qui donne une courbe de demande à pente descendante.",
                },
                "real_world": {
                    "ja": "中国経済が2023年に減速する中、茅台酒（600519）を含む贅沢品への消費者需要は、所得期待の低下に伴い弱まった。これは実質所得低下を主因とした需要曲線の左シフトという教科書的な例である。",
                    "ko": "2023년 중국 경제 둔화 과정에서 마오타이(600519) 등 명품에 대한 소비자 수요가 소득 기대 하락으로 약해졌다. 이는 실질 소득 하락이 주요 원인이 된 수요곡선의 좌측 이동이라는 교과서적 사례다.",
                    "fr": "Durant le ralentissement économique de la Chine en 2023, la demande des consommateurs pour les produits de luxe, dont le Moutai (600519), s'est affaiblie en raison de la baisse des anticipations de revenus — un déplacement à gauche de la courbe de demande causé par la chute des revenus réels, digne d'un manuel scolaire.",
                },
                "exam_tip": {
                    "ja": "需要曲線上の移動（価格変化）と需要曲線のシフト（非価格要因）を区別すること。この区別は、すべての図表問題で点数を獲得するための鍵である。",
                    "ko": "수요곡선 위의 이동(가격 변화)과 수요곡선 자체의 이동(비가격 요인)을 구별할 것. 이 구분이 모든 그래프 문제에서 점수를 얻는 핵심이다.",
                    "fr": "Distinguer entre mouvement le long de la courbe (variation de prix) et déplacement de la courbe (facteur non lié au prix). Cette distinction rapporte des points dans chaque question sur les diagrammes.",
                },
            },
            # Section 2: Supply
            {
                "heading": {
                    "ja": "供給",
                    "ko": "공급",
                    "fr": "L'offre",
                },
                "body": {
                    "ja": "供給とは、生産者が各価格水準で提供しようとする意思と能力のある財の量である。供給の法則は、価格が上昇すると供給量が増加するというものである。供給のシフトは、生産コスト・技術・税金および補助金・企業数の変化によって引き起こされる。",
                    "ko": "공급은 생산자가 각 가격 수준에서 제공하려는 의지와 능력이 있는 재화의 양이다. 공급의 법칙은 가격이 상승하면 공급량이 증가한다는 것이다. 공급 곡선의 이동은 생산 비용, 기술, 세금 및 보조금, 기업 수의 변화에 의해 발생한다.",
                    "fr": "L'offre est la quantité que les producteurs sont disposés et capables de proposer à chaque niveau de prix. La loi de l'offre stipule qu'à mesure que le prix augmente, la quantité offerte augmente. Les déplacements de l'offre sont provoqués par des changements dans les coûts de production, la technologie, les taxes et subventions, et le nombre d'entreprises.",
                },
                "real_world": {
                    "ja": "中国の太陽光パネル産業（代表的企業：ロンジー・グリーンエネルギー601012）は、規模の経済による生産コストの低下から2015年から2024年にかけて供給を大幅に拡大した。太陽光パネルの世界価格は90%以上下落し、供給曲線の右シフトという典型例となっている。",
                    "ko": "중국 태양광 패널 산업(대표 기업: 롱지 그린에너지 601012)은 규모의 경제로 인한 생산 비용 하락으로 2015~2024년 사이 공급을 대폭 확대했다. 태양광 패널 세계 가격은 90% 이상 하락하며 공급곡선 우측 이동의 전형적인 사례가 됐다.",
                    "fr": "L'industrie chinoise des panneaux solaires (entreprise phare : LONGi Green Energy 601012) a considérablement augmenté son offre entre 2015 et 2024 grâce à la baisse des coûts de production liée aux économies d'échelle. Le prix mondial des panneaux solaires a chuté de plus de 90 % — un déplacement classique de l'offre vers la droite.",
                },
                "exam_tip": {
                    "ja": "補助金と税金による供給シフトを描く際：補助金は供給を右にシフト（コスト低下）、税金は供給を左にシフト（コスト上昇）。",
                    "ko": "보조금과 세금에 의한 공급 이동을 그릴 때: 보조금은 공급을 우측으로 이동(비용 감소), 세금은 공급을 좌측으로 이동(비용 증가).",
                    "fr": "Pour les déplacements de l'offre dus à une subvention ou une taxe : la subvention déplace l'offre vers la droite (coûts réduits), la taxe déplace l'offre vers la gauche (coûts augmentés).",
                },
            },
            # Section 3: Elasticity
            {
                "heading": {
                    "ja": "弾力性",
                    "ko": "탄력성",
                    "fr": "L'élasticité",
                },
                "body": {
                    "ja": "需要の価格弾力性（PED）は、価格変化に対する需要量の反応度を測る。PED＝需要量の変化率÷価格の変化率。|PED|＞1なら弾力的、|PED|＜1なら非弾力的である。",
                    "ko": "수요의 가격탄력성(PED)은 가격 변화에 대한 수요량의 반응 정도를 측정한다. PED = 수요량 변화율 ÷ 가격 변화율. |PED| > 1이면 탄력적, |PED| < 1이면 비탄력적이다.",
                    "fr": "L'élasticité-prix de la demande (EPD) mesure la sensibilité de la quantité demandée à une variation de prix. EPD = % de variation de Qd / % de variation de P. Si |EPD| > 1, la demande est élastique ; si |EPD| < 1, elle est inélastique.",
                },
                "real_world": {
                    "ja": "白酒（茅台のような中国白酒）は、忠実な中国人消費者の間で需要の価格弾力性が非常に低い。2022年から2023年にかけて20%の値上げがあったにもかかわらず、強いブランドロイヤルティと代替品の少なさを反映して、販売量はほとんど減少しなかった。",
                    "ko": "백주(마오타이 같은 중국 백주)는 충성 고객들 사이에서 수요의 가격탄력성이 매우 낮다. 2022~2023년 20%의 가격 인상에도 강한 브랜드 충성도와 대체재 부족으로 판매량이 거의 줄지 않았다.",
                    "fr": "Le baijiu (spiritueux blancs comme le Moutai) présente une demande très inélastique parmi les consommateurs chinois fidèles — des hausses de prix de 20 % en 2022-2023 ont à peine réduit le volume des ventes, reflétant une forte fidélité à la marque et peu de substituts.",
                },
                "exam_tip": {
                    "ja": "PEDの決定要因はSLANT（代替品・贅沢品か必需品か・依存性・用途の数・期間）で覚える。計算問題では必ず公式と数値を明記すること。",
                    "ko": "PED의 결정요인은 SLANT(대체재, 사치재 대 필수재, 중독성, 용도 수, 기간)로 암기할 것. 계산 문제에서는 반드시 공식과 수치를 명기할 것.",
                    "fr": "Déterminants de l'EPD : mémorisez SLANT (Substituts, Luxe vs nécessité, Addiction, Nombre d'usages, Temps). Toujours indiquer la formule et une valeur numérique dans les calculs.",
                },
            },
        ],
    },
    "micro_3": {
        "title": {
            "ja": "市場の失敗",
            "ko": "시장 실패",
            "fr": "Les défaillances du marché",
        },
        "sections": [
            # Section 1: Externalities
            {
                "heading": {
                    "ja": "外部性",
                    "ko": "외부효과",
                    "fr": "Les externalités",
                },
                "body": {
                    "ja": "外部性とは、財の生産または消費が取引に関与していない第三者に影響を与える場合に生じる。負の外部性（例：汚染）は社会的費用が私的費用を上回るため、過剰生産を引き起こす。正の外部性は過少生産を引き起こす。",
                    "ko": "외부효과는 재화의 생산이나 소비가 거래에 관여하지 않은 제3자에게 영향을 미칠 때 발생한다. 부정적 외부효과(예: 오염)는 사회적 비용이 사적 비용을 초과하여 과잉 생산을 유발한다. 긍정적 외부효과는 과소 생산을 유발한다.",
                    "fr": "Une externalité se produit lorsque la production ou la consommation d'un bien affecte des tiers non impliqués dans la transaction. Les externalités négatives (p. ex. la pollution) font que le coût social dépasse le coût privé, entraînant une surproduction. Les externalités positives causent une sous-production.",
                },
                "real_world": {
                    "ja": "中国の石炭発電産業は巨大な負の外部性を生み出している。大気汚染により中国は毎年GDPの6〜7%相当の健康被害・環境被害を被っている。これが中国が2021年に外部コストを内部化するために炭素排出権取引（ETS）を導入した背景である。",
                    "ko": "중국의 석탄 발전 산업은 막대한 부정적 외부효과를 발생시킨다. 대기 오염으로 인해 중국은 매년 GDP의 6~7%에 해당하는 건강 및 환경 피해를 입는다. 이것이 중국이 2021년 이러한 외부 비용을 내부화하기 위해 탄소 배출권 거래제(ETS)를 도입한 이유다.",
                    "fr": "L'industrie charbonnière chinoise génère d'immenses externalités négatives — la pollution atmosphérique coûte à la Chine environ 6 à 7 % de son PIB annuellement en dommages sanitaires et environnementaux. Cela explique pourquoi la Chine a introduit un système d'échange de quotas d'émissions (ETS) en 2021 pour internaliser ces coûts externes.",
                },
                "exam_tip": {
                    "ja": "負の外部性については、MSC曲線とMPC曲線の両方を描くこと。市場産出量と社会的最適産出量の間の死荷重三角形は頻出の試験問題である。",
                    "ko": "부정적 외부효과에 대해서는 MSC 곡선과 MPC 곡선 모두를 그릴 것. 시장 산출량과 사회적 최적 산출량 사이의 자중손실 삼각형은 자주 출제된다.",
                    "fr": "Tracer à la fois les courbes CSM et CPM pour les externalités négatives. Le triangle de perte sèche entre la production de marché et la production socialement optimale est fréquemment testé.",
                },
            },
            # Section 2: Public Goods and Government Intervention
            {
                "heading": {
                    "ja": "公共財と政府介入",
                    "ko": "공공재와 정부 개입",
                    "fr": "Les biens publics et l'intervention de l'État",
                },
                "body": {
                    "ja": "公共財には「非競合性」と「非排除性」という2つの特徴がある。これらの特性は、フリーライダー問題と市場の失敗をもたらす。政府は税金・補助金・規制・価格規制・直接供給を通じて介入する。",
                    "ko": "공공재는 비경합성과 비배제성이라는 두 가지 특성을 가진다. 이 특성들은 무임승차 문제와 시장 실패를 초래한다. 정부는 세금, 보조금, 규제, 가격 통제, 직접 공급을 통해 개입한다.",
                    "fr": "Les biens publics ont deux caractéristiques distinctives : la non-rivalité et la non-exclusion. Ces propriétés conduisent au problème du passager clandestin et à la défaillance du marché. Les gouvernements interviennent par des taxes, des subventions, des réglementations, des contrôles des prix et la fourniture directe.",
                },
                "real_world": {
                    "ja": "中国のEV補助金プログラム（2010〜2023年）は、排出削減による正の外部性を補正するため、1台当たり最大6万元の補助金を提供した。BYD（002594）は一部この補助金のおかげで世界最大のEVメーカーになった。",
                    "ko": "중국의 전기차 보조금 프로그램(2010~2023년)은 배출 감소로 인한 긍정적 외부효과를 교정하기 위해 차량당 최대 6만 위안을 지원했다. BYD(002594)는 이 보조금 덕분에 부분적으로 세계 최대 전기차 제조사가 됐다.",
                    "fr": "Le programme de subventions pour les véhicules électriques en Chine (2010-2023) a fourni jusqu'à 60 000 yuans par véhicule pour encourager l'adoption des voitures électriques, corrigeant l'externalité positive des réductions d'émissions. BYD (002594) est devenu le plus grand fabricant mondial de véhicules électriques en partie grâce à ces subventions.",
                },
                "exam_tip": {
                    "ja": "公共財と準公共財（メリット財）を混同しないこと。公共財は非競合性＋非排除性で定義され、供給主体とは無関係である。評価ポイント：政府介入は政府の失敗につながりうる。",
                    "ko": "공공재와 가치재(merit goods)를 혼동하지 말 것. 공공재는 비경합성 + 비배제성으로 정의되며, 누가 공급하느냐와 무관하다. 평가 포인트: 정부 개입은 정부 실패로 이어질 수 있다.",
                    "fr": "Ne pas confondre biens publics et biens de mérite. Les biens publics se définissent par la non-rivalité + la non-exclusion, indépendamment de leur mode de fourniture. Point d'évaluation : l'intervention de l'État peut entraîner une défaillance de l'État.",
                },
            },
        ],
    },
    "micro_4": {
        "title": {
            "ja": "政府のミクロ経済的介入",
            "ko": "정부의 미시적 개입",
            "fr": "L'intervention microéconomique de l'État",
        },
        "sections": [
            # Section 1: Price Controls
            {
                "heading": {
                    "ja": "価格規制",
                    "ko": "가격 통제",
                    "fr": "Le contrôle des prix",
                },
                "body": {
                    "ja": "最高価格（価格上限）は均衡価格を下回るように設定され、財をより手頃な価格にする。これにより超過需要（不足）が生じる。最低価格（価格下限）は均衡価格を上回るように設定され、生産者を支援する。これにより超過供給（余剰）が生じる。",
                    "ko": "최고가격(가격 상한)은 균형 가격보다 낮게 설정되어 재화를 저렴하게 만든다. 이로 인해 초과 수요(부족)가 발생한다. 최저가격(가격 하한)은 균형 가격보다 높게 설정되어 생산자를 지원한다. 이로 인해 초과 공급(잉여)이 발생한다.",
                    "fr": "Un prix maximum (plafond des prix) est fixé en dessous de l'équilibre pour rendre les biens abordables — il crée un excès de demande (pénurie). Un prix minimum (plancher des prix) est fixé au-dessus de l'équilibre pour soutenir les producteurs — il crée un excès d'offre (surplus).",
                },
                "real_world": {
                    "ja": "中国は供給ショック時に豚肉に対して最高価格規制を複数回実施している。2019〜2020年のアフリカ豚熱の発生時、豚肉価格は3倍に跳ね上がった。政府は消費者を守るために戦略備蓄を放出し、価格上限の検討も行った。",
                    "ko": "중국은 공급 충격 시 돼지고기에 여러 차례 최고가격 규제를 시행했다. 2019~2020년 아프리카돼지열병 발생 시 돼지고기 가격이 3배나 치솟았다. 정부는 소비자를 보호하기 위해 전략 비축분을 방출하고 가격 상한 검토도 진행했다.",
                    "fr": "La Chine a mis en œuvre des contrôles des prix maximum sur le porc à plusieurs reprises lors de chocs d'offre. Pendant l'épidémie de fièvre porcine africaine en 2019-2020, les prix du porc ont triplé — le gouvernement a libéré des réserves stratégiques et envisagé des plafonds de prix pour protéger les consommateurs.",
                },
                "exam_tip": {
                    "ja": "価格規制には必ず図を描くこと。不足＝統制価格での需要＞供給。余剰＝統制価格での供給＞需要。",
                    "ko": "가격 통제에는 반드시 그래프를 그릴 것. 부족 = 통제 가격에서 수요 > 공급. 잉여 = 통제 가격에서 공급 > 수요.",
                    "fr": "Toujours tracer le diagramme pour les contrôles des prix. Pénurie = demande > offre au prix contrôlé. Surplus = offre > demande au prix contrôlé.",
                },
            },
            # Section 2: Taxes and Subsidies
            {
                "heading": {
                    "ja": "税金と補助金",
                    "ko": "세금과 보조금",
                    "fr": "Les taxes et les subventions",
                },
                "body": {
                    "ja": "間接税は供給を左にシフトさせ、均衡価格を引き上げ、数量を減少させる。補助金は供給を右にシフトさせ、価格を下げ、数量を増加させる。税の帰着（誰が税負担を負うか）は、需要と供給の相対的な弾力性に依存する。",
                    "ko": "간접세는 공급을 좌측으로 이동시켜 균형 가격을 올리고 수량을 줄인다. 보조금은 공급을 우측으로 이동시켜 가격을 낮추고 수량을 늘린다. 조세 귀착(누가 세금 부담을 지는가)은 수요와 공급의 상대적 탄력성에 따라 결정된다.",
                    "fr": "Une taxe indirecte déplace l'offre vers la gauche, faisant monter le prix d'équilibre et réduisant la quantité. Une subvention déplace l'offre vers la droite, faisant baisser le prix et augmentant la quantité. L'incidence fiscale (qui supporte la charge de la taxe) dépend de l'élasticité relative de la demande et de l'offre.",
                },
                "real_world": {
                    "ja": "中国のタバコ税（現在小売価格の約56%）は、有害財の消費を減らすために設計されている。高税率にもかかわらず、需要は比較的非弾力的なままであり、経済理論が予測するように税負担の大部分は消費者に転嫁される。",
                    "ko": "중국의 담배세(현재 소매가격의 약 56%)는 유해 재화의 소비를 줄이기 위해 설계됐다. 높은 세율에도 수요는 비교적 비탄력적이다. 경제 이론의 예측대로 수요가 비탄력적이면 세금 부담의 대부분이 소비자에게 전가된다.",
                    "fr": "La taxe sur les cigarettes en Chine (actuellement environ 56 % du prix de détail) est conçue pour réduire la consommation d'un bien nuisible. Malgré les taxes élevées, la demande reste relativement inélastique — la majeure partie de la charge fiscale pèse sur les consommateurs, comme le prédit la théorie économique quand la demande est inélastique.",
                },
                "exam_tip": {
                    "ja": "税の帰着：需要が供給より非弾力的である場合、消費者が税負担の大部分を負う。急な需要曲線と緩やかな供給曲線で描くこと。",
                    "ko": "조세 귀착: 수요가 공급보다 비탄력적이면 소비자가 더 많은 세금 부담을 진다. 가파른 수요 곡선과 완만한 공급 곡선으로 그릴 것.",
                    "fr": "Incidence fiscale : lorsque la demande est plus inélastique que l'offre, les consommateurs supportent la majeure partie de la charge fiscale. Représenter avec une courbe de demande raide et une courbe d'offre plus plate.",
                },
            },
        ],
    },
    "macro_1": {
        "title": {
            "ja": "マクロ経済目標",
            "ko": "거시경제 목표",
            "fr": "Les objectifs macroéconomiques",
        },
        "sections": [
            # Section 1: The Four Main Objectives
            {
                "heading": {
                    "ja": "4つの主要目標",
                    "ko": "네 가지 주요 목표",
                    "fr": "Les quatre objectifs principaux",
                },
                "body": {
                    "ja": "政府は4つの主要なマクロ経済目標を追求する。①実質GDPで測る経済成長、②通常2%程度の低インフレを目標とする物価安定、③失業を最小化する完全雇用、④持続的な経常収支赤字を避ける国際収支均衡。",
                    "ko": "정부는 네 가지 주요 거시경제 목표를 추구한다. ①실질 GDP로 측정하는 경제 성장, ②보통 2% 정도를 목표로 하는 물가 안정, ③실업을 최소화하는 완전 고용, ④지속적인 경상수지 적자를 피하는 국제수지 균형.",
                    "fr": "Les gouvernements poursuivent quatre objectifs macroéconomiques clés : (1) la croissance économique, mesurée par le PIB réel ; (2) la stabilité des prix, visant généralement une faible inflation d'environ 2 % ; (3) le plein emploi, minimisant le chômage ; (4) l'équilibre de la balance des paiements, évitant des déficits persistants du compte courant.",
                },
                "real_world": {
                    "ja": "中国政府は毎年GDP成長率目標を設定している。2024年の目標は「5%前後」であった。中国のCPIは2020〜2024年にかけて-0.3%から3.5%の範囲で推移し、成長と物価安定を両立させることの難しさを示した。",
                    "ko": "중국 정부는 매년 GDP 성장률 목표를 설정한다. 2024년 목표는 '약 5%'였다. 중국의 CPI는 2020~2024년 사이 -0.3%에서 3.5% 사이를 오가며 성장과 물가 안정 유지의 어려움을 보여줬다.",
                    "fr": "Le gouvernement chinois fixe des objectifs annuels de croissance du PIB — en 2024, l'objectif était « environ 5 % ». L'IPC chinois a fluctué entre -0,3 % et 3,5 % entre 2020 et 2024, illustrant les difficultés à maintenir la stabilité des prix tout en préservant la croissance.",
                },
                "exam_tip": {
                    "ja": "目標間の対立を把握すること。成長対インフレ、失業対インフレ（フィリップス曲線）。これらの対立は12点論述問題の頻出テーマである。",
                    "ko": "목표 간의 갈등을 파악할 것. 성장 대 인플레이션, 실업 대 인플레이션(필립스 곡선). 이 갈등들은 12점 논술 문제의 단골 주제다.",
                    "fr": "Connaître les conflits entre objectifs : croissance vs inflation, chômage vs inflation (courbe de Phillips). Ces conflits sont des sujets fréquents pour les questions de dissertations de 12 points.",
                },
            },
            # Section 2: Measuring GDP
            {
                "heading": {
                    "ja": "GDPの測定",
                    "ko": "GDP 측정",
                    "fr": "La mesure du PIB",
                },
                "body": {
                    "ja": "GDPは3つの方法で測定できる。支出法（C＋I＋G＋X－M）、所得法（すべての所得の合計）、付加価値法（付加価値の合計）。実質GDPはインフレを調整したもの、名目GDPは調整していない。",
                    "ko": "GDP는 세 가지 방법으로 측정할 수 있다. 지출법(C+I+G+X-M), 소득법(모든 소득의 합계), 산출법(부가가치의 합계). 실질 GDP는 인플레이션을 조정한 것이고, 명목 GDP는 조정하지 않은 것이다.",
                    "fr": "Le PIB peut être mesuré par trois méthodes : la dépense (C+I+G+X-M), le revenu (somme de tous les revenus) et la production (somme des valeurs ajoutées). Le PIB réel est corrigé de l'inflation ; le PIB nominal ne l'est pas.",
                },
                "real_world": {
                    "ja": "中国の名目GDPは2024年に約18兆ドルに達した。購買力平価（PPP）ベースでは、中国の生活コストが低いため中国のGDPは米国を上回る。これが国際比較においてPPPが重要である理由を示している。",
                    "ko": "중국의 명목 GDP는 2024년 약 18조 달러에 달했다. 구매력평가(PPP) 기준으로는 중국의 생활비가 낮기 때문에 중국의 GDP가 미국을 초과한다. 이는 국제 비교에서 PPP가 왜 중요한지를 보여준다.",
                    "fr": "Le PIB nominal de la Chine a atteint environ 18 000 milliards de dollars en 2024. Sur la base de la parité de pouvoir d'achat (PPA), le PIB de la Chine dépasse celui des États-Unis, car le coût de la vie est plus bas en Chine — ce qui illustre pourquoi la PPA est importante pour les comparaisons internationales.",
                },
                "exam_tip": {
                    "ja": "実質GDPと名目GDPを必ず区別すること。論述では、GDPは不完全な福祉指標であることを指摘すること。所得分配・環境費用・非市場生産を無視している。",
                    "ko": "항상 실질 GDP와 명목 GDP를 구분할 것. 논술에서는 GDP가 불완전한 복지 지표임을 언급할 것. 소득 분배, 환경 비용, 비시장 생산을 무시한다.",
                    "fr": "Toujours préciser PIB réel vs PIB nominal. Dans les dissertations, noter que le PIB est une mesure imparfaite du bien-être — il ignore la distribution des revenus, les coûts environnementaux et la production non marchande.",
                },
            },
        ],
    },
    "macro_2": {
        "title": {
            "ja": "総需要と総供給",
            "ko": "총수요와 총공급",
            "fr": "La demande et l'offre agrégées",
        },
        "sections": [
            # Section 1: Aggregate Demand
            {
                "heading": {
                    "ja": "総需要",
                    "ko": "총수요",
                    "fr": "La demande agrégée",
                },
                "body": {
                    "ja": "総需要（AD）は、ある価格水準における経済全体の財・サービスの総需要である。AD＝C＋I＋G＋（X－M）。AD曲線は、富効果・利子率効果・国際代替効果により右下がりとなる。",
                    "ko": "총수요(AD)는 주어진 가격 수준에서 경제 전체의 재화와 서비스에 대한 총수요다. AD = C + I + G + (X - M). AD 곡선은 자산 효과, 이자율 효과, 국제 대체 효과로 인해 우하향한다.",
                    "fr": "La demande agrégée (DA) est la demande totale de biens et services dans une économie à un niveau de prix donné. DA = C + I + G + (X - M). La courbe DA est descendante en raison de l'effet de richesse, de l'effet taux d'intérêt et de l'effet de substitution internationale.",
                },
                "real_world": {
                    "ja": "2020年のCOVID-19で中国のADは急激に落ち込んだ。消費と投資が崩壊したのである。政府は3.6兆元の財政刺激策で対応し、Gを直接押し上げると同時に乗数効果を引き起こした。中国は2020年に主要国で唯一プラス成長（2.3%）を達成した。",
                    "ko": "2020년 코로나19로 중국의 AD가 급감했다. 소비와 투자가 무너진 것이다. 정부는 3조 6천억 위안의 재정 부양책으로 대응해 G를 직접 끌어올리고 승수 효과를 유발했다. 중국은 2020년 주요국 중 유일하게 플러스 성장(2.3%)을 달성했다.",
                    "fr": "Durant la COVID-19 en 2020, la DA de la Chine a chuté brutalement avec l'effondrement de la consommation et de l'investissement. Le gouvernement a répondu par un plan de relance budgétaire de 3 600 milliards de yuans, stimulant directement G et déclenchant un effet multiplicateur. La Chine a été la seule grande économie à atteindre une croissance positive (2,3 %) en 2020.",
                },
                "exam_tip": {
                    "ja": "乗数＝1÷(1－MPC)、または1÷MPS。乗数が大きいほどMPCが大きい。乗数の大きさに影響する要因を把握すること：税率・輸入性向。",
                    "ko": "승수 = 1 ÷ (1 - MPC) 또는 1 ÷ MPS. 승수가 클수록 MPC가 크다. 승수 크기에 영향을 미치는 요인(세율, 수입 성향)을 파악할 것.",
                    "fr": "Le multiplicateur = 1 / (1 - PMC) ou 1 / PMS. Plus le multiplicateur est grand, plus la PMC est élevée. Connaître les facteurs influençant sa taille : taux d'imposition, propension à importer.",
                },
            },
            # Section 2: Aggregate Supply
            {
                "heading": {
                    "ja": "総供給",
                    "ko": "총공급",
                    "fr": "L'offre agrégée",
                },
                "body": {
                    "ja": "短期総供給（SRAS）は右上がりであり、価格水準が上昇すると名目賃金が固定されたままで企業の収益が増加するため生産が拡大する。長期総供給（LRAS）は完全雇用アウトプット水準において垂直であり、生産要素の量と質によって決まる。",
                    "ko": "단기 총공급(SRAS)은 우상향 곡선이다. 가격 수준이 상승하면 명목임금이 고정된 상태에서 기업 수익이 늘어 생산을 확대하기 때문이다. 장기 총공급(LRAS)은 완전 고용 산출 수준에서 수직으로, 생산 요소의 양과 질에 의해 결정된다.",
                    "fr": "L'offre agrégée à court terme (OACT) a une pente positive — lorsque le niveau des prix augmente, les entreprises augmentent leur production car les revenus augmentent sur des structures de coûts fixes. L'offre agrégée à long terme (OALT) est verticale au niveau de production de plein emploi, déterminée par la quantité et la qualité des facteurs de production.",
                },
                "real_world": {
                    "ja": "30年間にわたる中国の急速なLRAS成長は、物的資本（インフラ）への大規模投資、人的資本（大学進学率の5%から55%への向上）、技術（GDPの2.5%に達するR＆D支出）によるものである。",
                    "ko": "30년간의 중국의 빠른 LRAS 성장은 물적 자본(인프라)에 대한 대규모 투자, 인적 자본(대학 진학률 5%에서 55%로 향상), 기술(GDP 대비 2.5%에 달하는 R&D 지출) 덕분이다.",
                    "fr": "La croissance rapide du LRAS de la Chine sur 30 ans résulte d'investissements massifs dans le capital physique (infrastructures), le capital humain (taux d'inscription universitaire passant de 5 % à 55 %), et la technologie (dépenses de R&D atteignant 2,5 % du PIB).",
                },
                "exam_tip": {
                    "ja": "スタグフレーションはSRASが左にシフトした場合に起こる。価格上昇と産出量の減少が同時に起きる。これは需要サイド政策だけでは解決できない。",
                    "ko": "스태그플레이션은 SRAS가 좌측으로 이동할 때 발생한다. 가격 상승과 산출량 감소가 동시에 일어난다. 이는 수요 측면 정책만으로는 해결할 수 없다.",
                    "fr": "La stagflation survient quand le SRAS se déplace vers la gauche — hausse des prix et baisse de la production simultanément. Cela ne peut être résolu par la seule politique de demande.",
                },
            },
        ],
    },
    "macro_3": {
        "title": {
            "ja": "経済政策",
            "ko": "경제 정책",
            "fr": "La politique économique",
        },
        "sections": [
            # Section 1: Monetary Policy
            {
                "heading": {
                    "ja": "金融政策",
                    "ko": "통화 정책",
                    "fr": "La politique monétaire",
                },
                "body": {
                    "ja": "金融政策は、金利または通貨供給量の変化を通じて経済活動に影響を与える。低金利は借入コストを低下させ、消費と投資を刺激し、為替レートを下落させる。中央銀行はこれを使ってインフレを目標にする。",
                    "ko": "통화 정책은 이자율이나 통화량 변화를 통해 경제 활동에 영향을 준다. 낮은 이자율은 차입 비용을 낮추고 소비와 투자를 자극하며 환율을 하락시킨다. 중앙은행은 이를 통해 인플레이션을 목표치로 관리한다.",
                    "fr": "La politique monétaire consiste à modifier les taux d'intérêt ou la masse monétaire pour influencer l'activité économique. Des taux d'intérêt bas réduisent le coût des emprunts, stimulent la consommation et l'investissement, et déprécient le taux de change. Les banques centrales l'utilisent pour cibler l'inflation.",
                },
                "real_world": {
                    "ja": "中国人民銀行（PBOC）は2023〜2024年に経済減速を刺激するため最優遇貸出金利（LPR）を複数回引き下げた。対照的に、米国連邦準備制度は9%のインフレ対策として2022〜2023年に積極的に利上げを行い、対照的な金融政策スタンスを示した。",
                    "ko": "중국인민은행(PBOC)은 경제 둔화를 자극하기 위해 2023~2024년 기준 대출금리(LPR)를 여러 차례 인하했다. 반면 미국 연방준비제도는 9%의 인플레이션에 대응해 2022~2023년 공격적으로 금리를 인상했다. 두 나라의 대조적인 통화 정책 기조를 보여주는 사례다.",
                    "fr": "La Banque populaire de Chine (PBOC) a abaissé son taux préférentiel de prêt (LPR) à plusieurs reprises en 2023-2024 pour stimuler une économie en ralentissement. En revanche, la Réserve fédérale américaine a relevé ses taux de façon agressive en 2022-2023 pour lutter contre une inflation à 9 % — illustrant des politiques monétaires diamétralement opposées.",
                },
                "exam_tip": {
                    "ja": "金融政策の波及メカニズム：金利変化→借入コスト→消費・投資→AD→実質GDPおよびインフレ率。論述問題ではこのチェーンを明確に示すこと。",
                    "ko": "통화 정책 파급 메커니즘: 금리 변화 → 차입 비용 → 소비와 투자 → AD → 실질 GDP와 인플레이션. 논술 문제에서 이 전달 경로를 명확히 제시할 것.",
                    "fr": "Le mécanisme de transmission monétaire : variation du taux d'intérêt → coûts d'emprunt → consommation et investissement → DA → PIB réel et inflation. Exposer clairement cette chaîne dans les dissertations.",
                },
            },
            # Section 2: Fiscal and Supply-Side Policy
            {
                "heading": {
                    "ja": "財政政策と供給サイド政策",
                    "ko": "재정 정책과 공급 측면 정책",
                    "fr": "La politique budgétaire et la politique de l'offre",
                },
                "body": {
                    "ja": "財政政策は政府支出と税収の変化を含む。供給サイド政策は、教育・民営化・規制緩和・インフラ投資を通じて経済の生産能力を高め（LRASを右にシフトさせ）ることを目指す。",
                    "ko": "재정 정책은 정부 지출과 세금의 변화를 포함한다. 공급 측면 정책은 교육, 민영화, 규제 완화, 인프라 투자를 통해 경제의 생산 잠재력을 높이는 것(LRAS를 우측으로 이동)을 목표로 한다.",
                    "fr": "La politique budgétaire comprend les modifications des dépenses publiques et de la fiscalité. Les politiques de l'offre visent à accroître la capacité productive de l'économie (déplacer le LRAS vers la droite) par l'éducation, la privatisation, la déréglementation et l'investissement dans les infrastructures.",
                },
                "real_world": {
                    "ja": "中国の2024年財政赤字目標はGDPの3%で、インフラ向けに1兆元の特別債が追加された。中国の「双循環」戦略（2020年〜）は国内イノベーションとR＆Dを重視しており、LRASを右にシフトさせるための供給サイドアプローチである。",
                    "ko": "중국의 2024년 재정 적자 목표는 GDP 대비 3%이며, 인프라를 위한 1조 위안의 특수채가 추가됐다. 중국의 '쌍순환' 전략(2020년~)은 국내 혁신과 R&D를 강조하며, LRAS를 우측으로 이동시키기 위한 공급 측면 접근법이다.",
                    "fr": "L'objectif de déficit budgétaire de la Chine pour 2024 était de 3 % du PIB avec 1 000 milliards de yuans supplémentaires en obligations spéciales pour les infrastructures. La stratégie de « double circulation » de la Chine (depuis 2020) met l'accent sur l'innovation intérieure et la R&D — une approche par l'offre visant à déplacer le LRAS vers la droite.",
                },
                "exam_tip": {
                    "ja": "クラウディングアウト：政府の借入が利子率を引き上げ、民間投資を減少させる。供給サイド政策には長い時間的遅れがある。教育改革が労働市場に影響するまでに一世代かかる。",
                    "ko": "구축 효과: 정부 차입이 이자율을 높여 민간 투자를 줄인다. 공급 측면 정책은 시간 지연이 길다. 교육 개혁이 노동 시장에 영향을 미치기까지 한 세대가 걸린다.",
                    "fr": "L'effet d'éviction : les emprunts de l'État font monter les taux d'intérêt, réduisant l'investissement privé. Les politiques de l'offre ont de longs délais de mise en œuvre — les réformes éducatives mettent une génération à impacter le marché du travail.",
                },
            },
        ],
    },
    "macro_4": {
        "title": {
            "ja": "国際経済",
            "ko": "국제 경제",
            "fr": "L'économie internationale",
        },
        "sections": [
            # Section 1: Comparative Advantage and Trade
            {
                "heading": {
                    "ja": "比較優位と貿易",
                    "ko": "비교우위와 무역",
                    "fr": "L'avantage comparatif et le commerce",
                },
                "body": {
                    "ja": "比較優位とは、他国がすべての生産において絶対的に優れていても、機会費用が最も低い財の生産に特化すべきであるという考え方である。比較優位に基づく自由貿易は世界全体の産出量を増加させる。",
                    "ko": "비교우위는 다른 나라가 모든 생산에서 절대적으로 우월하더라도, 기회비용이 가장 낮은 재화의 생산에 특화해야 한다는 개념이다. 비교우위에 기반한 자유 무역은 세계 전체 산출량을 증가시킨다.",
                    "fr": "L'avantage comparatif stipule qu'un pays devrait se spécialiser dans la production des biens où son coût d'opportunité est le plus bas, même si un autre pays est absolument plus efficace dans tout. Le libre-échange fondé sur l'avantage comparatif accroît la production mondiale.",
                },
                "real_world": {
                    "ja": "中国は製造業に比較優位を持つ。豊富な低コスト労働力と大規模生産（電子機器・太陽光パネル）である。米国は技術と金融サービスに比較優位を持つ。これが政治的緊張にもかかわらず、毎年6,000億ドル超の二国間貿易を支えている。",
                    "ko": "중국은 제조업에서 비교우위를 갖는다. 풍부한 저비용 노동력과 대규모 생산(전자 제품, 태양광 패널)이다. 미국은 기술과 금융 서비스에서 비교우위를 갖는다. 이것이 정치적 긴장에도 불구하고 매년 6,000억 달러 이상의 양자 무역을 유지시키는 기반이다.",
                    "fr": "La Chine possède un avantage comparatif dans la fabrication — abondance de main-d'œuvre bon marché et production à grande échelle (électronique, panneaux solaires). Les États-Unis ont un avantage comparatif dans la technologie et les services financiers. Cela sous-tend plus de 600 milliards de dollars d'échanges bilatéraux annuels malgré les tensions politiques.",
                },
                "exam_tip": {
                    "ja": "比較優位は機会費用を比較することで求める（絶対的産出量ではない）。計算を明確に示すこと：財Yを1単位生産するために財Xを何単位放棄するか？",
                    "ko": "비교우위는 기회비용을 비교하여 계산한다(절대적 산출량이 아님). 계산을 명확히 제시할 것: 재화 Y 1단위를 생산하기 위해 재화 X를 몇 단위 포기해야 하는가?",
                    "fr": "Calculer l'avantage comparatif en comparant les coûts d'opportunité, pas les productions absolues. Montrer le calcul clairement : combien d'unités de X sont abandonnées pour produire une unité de Y ?",
                },
            },
            # Section 2: Exchange Rates
            {
                "heading": {
                    "ja": "為替レート",
                    "ko": "환율",
                    "fr": "Les taux de change",
                },
                "body": {
                    "ja": "為替レートはある通貨の他通貨に対する価格である。通貨安（減価）は輸出を安く、輸入を高くする。マーシャル＝ラーナー条件は、輸出と輸入のPEDの合計が1を超える場合にのみ、通貨安が経常収支を改善するというものである。",
                    "ko": "환율은 한 통화의 다른 통화 대비 가격이다. 통화 절하는 수출을 저렴하게, 수입을 비싸게 만든다. 마샬-러너 조건은 수출과 수입의 PED 합계가 1을 초과하는 경우에만 절하가 경상수지를 개선한다는 것이다.",
                    "fr": "Un taux de change est le prix d'une monnaie en termes d'une autre. Une dépréciation rend les exportations moins chères et les importations plus coûteuses. La condition de Marshall-Lerner stipule que la dépréciation améliore le compte courant uniquement si la somme des EPD pour les exportations et les importations dépasse 1.",
                },
                "real_world": {
                    "ja": "2022〜2023年に米国が利上げを行うにつれてRMBは1ドル＝6.3元から7.3元へと下落した。これは中国からのホットマネー流出をもたらした。この通貨安は中国の輸出業者を助けたが、輸入コストを引き上げた。A株企業に影響を与えた現実の事例である。",
                    "ko": "2022~2023년 미국의 금리 인상에 따라 위안화가 달러당 6.3위안에서 7.3위안으로 하락했다. 이는 중국에서 핫머니 유출을 초래했다. 이 통화 절하는 중국 수출업자에게는 유리했지만 수입 비용을 끌어올렸다. A주 기업에 영향을 미친 실제 사례다.",
                    "fr": "Le RMB s'est déprécié de 6,3 à 7,3 pour un dollar en 2022-2023 alors que les États-Unis relevaient leurs taux d'intérêt, provoquant des sorties de capitaux spéculatifs de Chine. Cette dépréciation a aidé les exportateurs chinois mais a augmenté les coûts des importations — une illustration réelle affectant les entreprises cotées en A-shares.",
                },
                "exam_tip": {
                    "ja": "J曲線は、通貨安後に短期的に経常収支が悪化してから長期的に改善することを示す。必ず横軸に「時間」とラベルを付けたJ字型の図を書くこと。",
                    "ko": "J 곡선은 통화 절하 후 단기적으로 경상수지가 악화된 후 장기적으로 개선됨을 보여준다. 항상 x축에 '시간'을 표시한 J 형태의 그래프를 그릴 것.",
                    "fr": "La courbe en J montre la détérioration à court terme du compte courant avant une amélioration à long terme après la dépréciation. Toujours étiqueter le diagramme en forme de J avec le temps sur l'axe des x.",
                },
            },
        ],
    },
}
