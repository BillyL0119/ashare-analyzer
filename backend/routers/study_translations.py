# AP Macro translations: ja / ko / fr
# Structure: topic_id → { "title": {lang: str}, "sections": [ {field: {lang: str}} ] }
# key_terms intentionally omitted — kept in English per international academic standard

AP_MACRO_TRANSLATIONS = {
    "ap_1": {
        "title": {
            "ja": "基本的な経済概念",
            "ko": "기본 경제 개념",
            "fr": "Concepts économiques fondamentaux",
        },
        "sections": [
            # Section 1: Scarcity, Trade-offs and the PPC
            {
                "heading": {
                    "ja": "希少性・トレードオフと生産可能性曲線",
                    "ko": "희소성, 상충관계, 생산가능곡선",
                    "fr": "La rareté, les arbitrages et la courbe des possibilités de production",
                },
                "body": {
                    "ja": "希少性とは、資源は有限であるのに対し人間の欲求は無限であるという経済の根本的な現実を指す。このため、すべての経済は何を生産するかを選択しなければならない。生産可能性曲線（PPC）は、すべての資源が完全かつ効率的に使用された場合に生産できる2財の最大の組み合わせを示すことで、こうしたトレードオフを表す。PPCの曲線上の点は生産効率性を達成している。曲線の内側の点は未使用資源または非効率性を意味する。曲線の外側の点は現時点では達成不可能だが、経済成長によって到達できる。PPCが外側に向かって凹型（外に膨らんだ形）をしているのは、機会費用逓増の法則によるもので、資源はすべての用途に完全に適応できるわけではないため、ある財の生産を増やすにつれてコストは増加する。",
                    "ko": "희소성은 인간의 욕구는 무한하지만 자원은 유한하기 때문에 모든 경제가 선택을 해야 한다는 근본적 현실을 의미한다. 생산가능곡선(PPC)은 모든 자원이 완전하고 효율적으로 사용될 때 생산할 수 있는 두 재화의 최대 조합을 보여줌으로써 이러한 상충관계를 나타낸다. PPC 위의 점은 생산 효율적이다. 내부의 점은 유휴 자원이나 비효율성을 의미한다. 외부의 점은 현재 달성 불가능하지만 경제 성장을 통해 도달할 수 있다. PPC가 오목한(원점에서 볼록한) 형태인 것은 기회비용 체증의 법칙 때문이다. 자원은 모든 용도에 완전히 적응하지 못하므로, 한 재화의 생산을 늘릴수록 포기해야 하는 비용이 증가한다.",
                    "fr": "La rareté désigne la réalité fondamentale selon laquelle les ressources sont limitées alors que les besoins humains sont illimités, ce qui oblige chaque économie à faire des choix. La courbe des possibilités de production (CPP) illustre ces arbitrages en montrant les combinaisons maximales de deux biens qu'une économie peut produire lorsque toutes ses ressources sont pleinement et efficacement utilisées. Les points SUR la CPP sont productifs efficaces. Les points À L'INTÉRIEUR représentent des ressources inutilisées ou une inefficacité. Les points À L'EXTÉRIEUR sont actuellement inaccessibles mais peuvent être atteints par la croissance économique. La CPP est concave (bombée vers l'extérieur) en raison de la loi des coûts d'opportunité croissants : les ressources ne sont pas parfaitement adaptables, si bien que déplacer la production vers un autre bien devient de plus en plus coûteux.",
                },
                "real_world": {
                    "ja": "2020年のCOVID-19禍において、米国経済は工場閉鎖や失業率の急上昇（14.7%）によってPPCの内側で稼働していた。2.2兆ドルのCARES法による景気刺激策は、経済をPPCに押し戻すことを目的としていた。技術や人的資本への投資により長期的にPPCは外側にシフトする。1950年代以降、生産性向上によって米国のPPCは劇的に右にシフトしてきた。",
                    "ko": "2020년 코로나19 당시 미국 경제는 공장 폐쇄와 실업률 급등(14.7%)으로 PPC 내부에서 운영되었다. 2.2조 달러 규모의 CARES법 경기부양책은 경제를 PPC로 되돌리기 위한 것이었다. 기술과 인적 자본에 대한 투자는 장기적으로 PPC를 외부로 이동시킨다. 1950년대 이후 생산성 향상으로 미국의 PPC는 극적으로 오른쪽으로 이동해왔다.",
                    "fr": "Pendant la COVID-19 en 2020, l'économie américaine fonctionnait en dessous de sa CPP à cause des fermetures d'usines et d'un chômage grimpant à 14,7 %. Le plan de relance CARES de 2 200 milliards de dollars visait à ramener l'économie vers sa CPP. À long terme, l'investissement dans la technologie et le capital humain fait se déplacer la CPP vers l'extérieur — la CPP américaine s'est considérablement élargie depuis 1950 grâce aux gains de productivité.",
                },
                "exam_tip": {
                    "ja": "APの自由記述では必ず正確にラベルを付けたグラフが求められる。PPCでは、軸を具体的な財名（XやYではなく）でラベルし、効率的な点を曲線上に示し、内側・外側の点も明示すること。技術進歩によるPPCの外側へのシフトが特定の産業のみで起きる場合、曲線は平行移動ではなく回転（一方の端点のみシフト）する。",
                    "ko": "AP 자유 서술 문제에서는 항상 정확하게 레이블이 붙은 그래프가 요구된다. PPC의 경우 축에 구체적인 재화 이름(X, Y가 아닌)을 표시하고, 효율적인 점을 곡선 위에, 내부와 외부의 점도 표시해야 한다. 기술이 한 분야에서만 개선되면 PPC는 평행 이동이 아니라 회전(한쪽 끝점만 이동)한다.",
                    "fr": "Les questions à réponse libre de l'AP exigent toujours des graphiques correctement étiquetés. Pour la CPP : étiquetez les axes avec des biens spécifiques (pas X et Y), marquez les points efficaces SUR la courbe, montrez les points à l'intérieur et à l'extérieur. Si une amélioration technologique ne profite qu'à un seul secteur, la CPP pivote (un seul point terminal se déplace) plutôt que de se déplacer parallèlement.",
                },
            },
            # Section 2: Opportunity Cost and Economic Decision-Making
            {
                "heading": {
                    "ja": "機会費用と経済的意思決定",
                    "ko": "기회비용과 경제적 의사결정",
                    "fr": "Le coût d'opportunité et la prise de décision économique",
                },
                "body": {
                    "ja": "機会費用とは、選択をした際に失われる次善の代替案の価値である。それはあらゆる決定の真のコストを表す。経済学者は限界的に考える。限界分析は、行動の追加的便益と追加的費用を比較する。合理的な意思決定者は、限界便益（MB）が限界費用（MC）を上回る限り活動を続け、MB＝MCになったところで止める。この限界思考は消費者・企業・政府すべてに適用される。埋没費用（すでに発生し回収不能なコスト）は、それを変えることができないため、将来の意思決定においては無視すべきである。",
                    "ko": "기회비용은 선택을 했을 때 포기하는 차선의 대안의 가치다. 이는 어떤 결정의 진정한 비용을 나타낸다. 경제학자들은 한계적으로 생각한다. 한계분석은 행동의 추가적 편익과 추가적 비용을 비교한다. 합리적 의사결정자는 한계편익(MB)이 한계비용(MC)을 초과하는 한 활동을 계속하고 MB=MC가 되면 멈춘다. 이 한계적 사고는 소비자, 기업, 정부 모두에게 적용된다. 매몰비용(이미 발생하여 회수 불가능한 비용)은 바꿀 수 없으므로 미래 의사결정에서 무시해야 한다.",
                    "fr": "Le coût d'opportunité est la valeur de la meilleure alternative abandonnée lors d'un choix. Il représente le véritable coût de toute décision, car il capture ce à quoi on doit renoncer. Les économistes raisonnent à la marge : l'analyse marginale compare le bénéfice supplémentaire d'une action à son coût supplémentaire. Les décideurs rationnels poursuivent une activité tant que le bénéfice marginal dépasse le coût marginal, et s'arrêtent quand Bm = Cm. Cette réflexion marginale s'applique aux consommateurs, aux entreprises et aux gouvernements. Les coûts irrécupérables — coûts déjà engagés et non récupérables — doivent être ignorés dans les décisions futures car ils ne peuvent pas être modifiés.",
                },
                "real_world": {
                    "ja": "米国政府が国防に1兆ドルを支出する場合、その機会費用は、そのお金で賄えたはずのインフラ・医療・教育である。大学生は毎日機会費用に直面している。4年制大学の真のコストには授業料だけでなく、フルタイムで働いていたなら得られたはずの賃金も含まれる。アマゾンは、低生産性の役割に従業員を留めることの機会費用を計算した結果、離職を希望する従業員に5,000ドルを支払うことが正当化されると判断した。",
                    "ko": "미국 정부가 국방에 1조 달러를 지출하면, 기회비용은 그 돈으로 건설할 수 있었던 인프라, 의료, 교육이다. 대학생들은 매일 기회비용에 직면한다. 4년제 학위의 진정한 비용에는 등록금뿐 아니라 풀타임으로 일했더라면 얻었을 임금도 포함된다. 아마존은 저생산성 직무에 직원을 유지하는 기회비용을 계산한 결과, 퇴직을 원하는 직원에게 5,000달러를 지불하는 것이 정당화된다고 판단했다.",
                    "fr": "Quand le gouvernement américain dépense 1 000 milliards de dollars pour la défense, le coût d'opportunité est constitué des infrastructures, des soins de santé ou de l'éducation qui auraient pu être financés avec cet argent. Les étudiants font face au coût d'opportunité chaque jour : le vrai coût d'une licence de quatre ans inclut non seulement les frais de scolarité, mais aussi les salaires auxquels on renonce en ne travaillant pas à temps plein. Amazon a calculé que le coût d'opportunité de maintenir des employés dans des postes peu productifs justifiait de payer 5 000 dollars aux travailleurs souhaitant partir.",
                },
                "exam_tip": {
                    "ja": "APのマルティプルチョイスでは、生産量の表が示され機会費用を問う問題が頻出する。機会費用は常に比率で表すこと。財Aをもう1単位生産するには財Bを何単位犠牲にするか？機会費用が低い国がその財に比較優位を持つ。失われたすべての代替案を合計しないこと。機会費用はあくまで「次善の代替案」だけである。",
                    "ko": "AP 객관식에서는 생산량 표를 주고 기회비용을 묻는 문제가 자주 출제된다. 기회비용은 항상 비율로 표현할 것. 재화 A를 1단위 더 생산하려면 재화 B를 몇 단위 포기해야 하는가? 기회비용이 낮은 국가가 그 재화에서 비교우위를 갖는다. 포기한 모든 대안을 합산하지 말 것. 기회비용은 오직 '차선의 대안'만이다.",
                    "fr": "Les QCM de l'AP présentent fréquemment un tableau de production et demandent le coût d'opportunité. Exprimez toujours le coût d'opportunité sous forme de ratio : pour produire une unité supplémentaire du bien A, combien d'unités du bien B faut-il abandonner ? Le pays dont le coût d'opportunité est le plus bas possède l'avantage comparatif dans ce bien. Ne jamais additionner toutes les alternatives abandonnées — le coût d'opportunité est uniquement la PROCHAINE MEILLEURE alternative.",
                },
            },
            # Section 3: Comparative Advantage and Specialisation
            {
                "heading": {
                    "ja": "比較優位と特化",
                    "ko": "비교우위와 특화",
                    "fr": "L'avantage comparatif et la spécialisation",
                },
                "body": {
                    "ja": "絶対優位とは、同じ資源でより多くの産出量を生産できることを指す。比較優位とは、より低い機会費用で生産できることを指す。一方の国がすべての財において絶対的に優れていても、それぞれが機会費用が最も低い財に特化すれば、両国は貿易から利益を得られる。これがデービッド・リカードの洞察であり、経済学で最も強力な結論のひとつである。貿易が成立する交易条件（価格比）は、両国の機会費用の比率の間に収まらなければ、両者ともに利益を得られない。貿易の利益は特化と、それによる消費可能性の国内PPCを超えた拡大から生まれる。",
                    "ko": "절대우위란 동일한 자원으로 더 많은 산출량을 생산할 수 있다는 것을 의미한다. 비교우위란 더 낮은 기회비용으로 생산할 수 있다는 것을 의미한다. 한 국가가 모든 재화에서 절대적으로 우월하더라도, 각국이 기회비용이 가장 낮은 재화에 특화하면 양국 모두 무역으로 이익을 얻을 수 있다. 이것이 데이비드 리카도의 통찰이며 경제학에서 가장 강력한 결론 중 하나다. 무역이 이루어지는 교역조건(가격 비율)은 양국의 기회비용 비율 사이에 있어야 양측 모두 이익을 얻을 수 있다. 무역의 이익은 특화와 그로 인한 소비가능성의 국내 PPC 이상으로의 확대에서 비롯된다.",
                    "fr": "L'avantage absolu signifie produire davantage avec les mêmes ressources. L'avantage comparatif signifie produire à un coût d'opportunité moindre. Même si un pays est absolument meilleur dans la production de tout, les deux pays gagnent à l'échange si chacun se spécialise dans le bien où son coût d'opportunité est le plus bas. C'est l'intuition de David Ricardo et l'un des résultats les plus puissants de l'économie. Les termes de l'échange — le ratio de prix auquel le commerce s'effectue — doivent se situer entre les ratios de coûts d'opportunité des deux pays pour que les deux parties en bénéficient. Les gains à l'échange découlent de la spécialisation et de l'expansion des possibilités de consommation au-delà de la CPP nationale.",
                },
                "real_world": {
                    "ja": "米国は多くの途上国と比べてソフトウェアと農産物の両方において絶対優位を持っているが、それでも両方を大量に輸入している。バングラデシュは衣料品製造において比較優位を持つ。なぜならその機会費用（他の生産を諦めるという意味で）が非常に低いからだ。これが年間70億ドル超の米国・バングラデシュ間の繊維貿易を説明する。中国の比較優位は賃金上昇とともに低熟練製造業から高技術生産へとシフトした。比較優位は時代とともに変化することが示されている。",
                    "ko": "미국은 많은 개발도상국에 비해 소프트웨어와 농산물 모두에서 절대우위를 갖고 있지만, 그럼에도 두 제품 모두 대량 수입한다. 방글라데시는 의류 제조에서 비교우위를 갖는다. 그 기회비용(대안적 생산을 포기한다는 의미에서)이 매우 낮기 때문이다. 이것이 연간 70억 달러 이상의 미국-방글라데시 섬유 무역을 설명한다. 중국의 비교우위는 임금 상승과 함께 저숙련 제조업에서 고기술 생산으로 이동했다. 비교우위는 시간이 지남에 따라 변한다는 것을 보여준다.",
                    "fr": "Les États-Unis possèdent un avantage absolu dans les logiciels et les produits agricoles par rapport à de nombreux pays en développement, et pourtant ils en importent des quantités considérables. Le Bangladesh possède un avantage comparatif dans la fabrication de vêtements car son coût d'opportunité est très faible. Cela explique plus de 7 milliards de dollars d'échanges textiles annuels USA-Bangladesh. L'avantage comparatif de la Chine s'est déplacé de la fabrication peu qualifiée vers une production plus technique à mesure que les salaires augmentaient — illustrant que l'avantage comparatif évolue dans le temps.",
                },
                "exam_tip": {
                    "ja": "比較優位を見つけるには：各国の各財における機会費用を計算する（財Aを1単位生産するために財Bを何単位諦めるか）。財Aの機会費用が低い国が財Aに比較優位を持つ。許容できる交易条件は両国の機会費用の比率の間に収まらなければならない。APの自由記述では許容できる交易条件の範囲を問われることが多い。それは両国にとって国内機会費用より有利でなければならない。",
                    "ko": "비교우위를 찾으려면: 각국의 각 재화에 대한 기회비용(재화 A 1단위 생산을 위해 재화 B를 몇 단위 포기하는지)을 계산한다. 재화 A의 기회비용이 낮은 국가가 재화 A에서 비교우위를 갖는다. 허용 가능한 교역조건은 두 나라의 기회비용 비율 사이에 있어야 한다. AP 자유 서술에서는 종종 허용 가능한 교역조건의 범위를 묻는다. 이는 양국 모두에게 국내 기회비용보다 유리해야 한다.",
                    "fr": "Pour trouver l'avantage comparatif : calculez le coût d'opportunité de chaque bien pour chaque pays (combien d'unités du bien B sont abandonnées par unité du bien A). Le pays dont le coût d'opportunité du bien A est le plus faible a l'avantage comparatif dans A. Les termes de l'échange acceptables doivent se situer entre les deux ratios de coûts d'opportunité. Les questions à réponse libre de l'AP demandent souvent d'identifier la plage des termes de l'échange acceptables — elle doit être plus avantageuse pour les deux pays que leurs coûts d'opportunité nationaux.",
                },
            },
            # Section 4: Economic Systems and the Role of Markets
            {
                "heading": {
                    "ja": "経済システムと市場の役割",
                    "ko": "경제 시스템과 시장의 역할",
                    "fr": "Les systèmes économiques et le rôle des marchés",
                },
                "body": {
                    "ja": "すべての経済システムは、何を生産するか・どのように生産するか・誰のために生産するかという3つの根本的な問いに答えなければならない。市場経済はこれらを価格シグナルによって解決する。計画経済は中央計画を用いる。混合経済は両者を組み合わせる。市場システムでは、価格がシグナルと誘因として機能する。高い価格は希少性を知らせ資源を引き寄せ、低い価格は豊富さを知らせ資源を別の方向へ向ける。循環流モデルは、家計と企業が生産物市場（家計が財を購入）と生産要素市場（家計が労働・資本を提供）でどのようにやり取りするかを示す。政府は財・サービスの購入者かつ公共サービスの提供者としてこのモデルに登場する。",
                    "ko": "모든 경제 시스템은 무엇을 생산할지, 어떻게 생산할지, 누구를 위해 생산할지라는 세 가지 근본적인 질문에 답해야 한다. 시장경제는 이를 가격 신호로 해결한다. 계획경제는 중앙계획을 사용한다. 혼합경제는 두 가지를 결합한다. 시장 시스템에서 가격은 신호와 유인으로 기능한다. 높은 가격은 희소성을 알리고 자원을 끌어들이며, 낮은 가격은 풍요를 알리고 자원을 다른 곳으로 유도한다. 순환흐름 모델은 가계와 기업이 생산물 시장(가계가 재화 구입)과 생산요소 시장(가계가 노동·자본 제공)에서 어떻게 상호작용하는지 보여준다. 정부는 구매자이자 공공서비스 제공자로서 이 모델에 등장한다.",
                    "fr": "Tous les systèmes économiques doivent répondre à trois questions fondamentales : quoi produire, comment le produire, et pour qui. Les économies de marché y répondent par les signaux de prix. Les économies planifiées utilisent la planification centrale. Les économies mixtes combinent les deux. Dans les systèmes de marché, les prix servent de signaux et d'incitations : les prix élevés signalent la rareté et attirent les ressources ; les prix bas signalent l'abondance et redirigent les ressources. Le modèle du circuit économique montre comment les ménages et les entreprises interagissent sur les marchés des biens (les ménages achètent des biens) et les marchés des facteurs (les ménages vendent leur travail et leur capital). Le gouvernement entre dans le modèle à la fois comme acheteur et comme fournisseur de services publics.",
                },
                "real_world": {
                    "ja": "2013年以降にベネズエラが計画経済へとシフトしたことで、食料・医薬品の価格統制が深刻な不足を引き起こした。生産者は統制価格でコストをカバーできなかったからだ。対照的に、1978年以降の中国は計画経済に市場メカニズムを徐々に導入し、著しい成長を達成した。これら対照的な事例は、効率的な資源配分に価格シグナルがいかに不可欠かを示している。",
                    "ko": "2013년 이후 베네수엘라가 계획경제로 이동하면서 식품과 의약품에 대한 가격 통제가 심각한 부족을 야기했다. 생산자들이 통제 가격으로는 비용을 충당할 수 없었기 때문이다. 반면, 1978년 이후 중국은 계획경제에 시장 메커니즘을 점진적으로 도입해 놀라운 성장을 달성했다. 이 대조적인 사례들은 효율적인 자원 배분을 위한 가격 신호의 중요성을 보여준다.",
                    "fr": "Le glissement du Venezuela vers une économie planifiée après 2013 — les contrôles des prix sur la nourriture et les médicaments ont créé de graves pénuries car les producteurs ne pouvaient pas couvrir leurs coûts aux prix contrôlés. En revanche, la Chine a progressivement introduit des mécanismes de marché dans une économie planifiée après 1978, réalisant une croissance remarquable. Ces exemples contrastés illustrent l'importance essentielle des signaux de prix pour une allocation efficace des ressources.",
                },
                "exam_tip": {
                    "ja": "循環流図はAPの試験に登場する。家計と企業のシンプルな2部門モデルと、政府（G支出と税収）および海外部門（輸出と輸入）を含む完全版の両方を理解しておくこと。均衡では、注入（I + G + X）は漏れ（S + T + M）と等しくなければならない。注入または漏れの変化は総需要をシフトさせる。",
                    "ko": "순환흐름 다이어그램은 AP 시험에 등장한다. 가계와 기업만의 단순 2부문 모델과 정부(G 지출과 세금) 및 해외 부문(수출과 수입)을 포함한 완전한 버전 모두를 알아야 한다. 균형에서는 주입(I + G + X)이 누출(S + T + M)과 같아야 한다. 주입이나 누출의 변화는 총수요를 이동시킨다.",
                    "fr": "Le diagramme du circuit économique apparaît dans les examens AP. Maîtrisez la version simplifiée à deux secteurs (ménages et entreprises) et la version complète incluant le gouvernement (dépenses G et taxes) ainsi que le secteur étranger (exportations et importations). À l'équilibre, les injections (I + G + X) doivent égaler les fuites (S + T + M). Les changements dans les injections ou les fuites déplacent la demande agrégée.",
                },
            },
        ],
    },

    "ap_2": {
        "title": {
            "ja": "経済指標と景気循環",
            "ko": "경제 지표와 경기순환",
            "fr": "Les indicateurs économiques et le cycle économique",
        },
        "sections": [
            # Section 1: Measuring GDP
            {
                "heading": {
                    "ja": "GDPの測定：アプローチと調整",
                    "ko": "GDP 측정: 접근법과 조정",
                    "fr": "La mesure du PIB : approches et ajustements",
                },
                "body": {
                    "ja": "GDP（国内総生産）は、一定期間内に国内で生産されたすべての最終財・サービスの市場価値の合計である。支出アプローチ：GDP = C + I + G + NX。ここで、Cは消費、Iは投資（在庫変動を含む）、Gは政府支出、NXは純輸出（輸出－輸入）。所得アプローチはすべての生産要素所得（賃金・地代・利子・利潤）を合計する。名目GDPは現在価格を用いるため、インフレだけで上昇することがある。実質GDPはGDPデフレーターを用いて物価変動を調整する。実質GDP = （名目GDP ÷ GDPデフレーター）× 100。1人当たりGDPは人口で割ることで平均的な生活水準を測る。",
                    "ko": "GDP(국내총생산)는 일정 기간 동안 국내에서 생산된 모든 최종 재화와 서비스의 시장 가치 합계다. 지출 접근법: GDP = C + I + G + NX. 여기서 C는 소비, I는 투자(재고 변동 포함), G는 정부 지출, NX는 순수출(수출-수입)이다. 소득 접근법은 모든 생산요소 소득(임금, 지대, 이자, 이윤)을 합산한다. 명목 GDP는 현재 가격을 사용하므로 인플레이션만으로도 상승할 수 있다. 실질 GDP는 GDP 디플레이터를 사용해 물가 변동을 조정한다. 실질 GDP = (명목 GDP ÷ GDP 디플레이터) × 100. 1인당 GDP는 인구로 나누어 평균 생활 수준을 측정한다.",
                    "fr": "Le PIB (Produit Intérieur Brut) mesure la valeur marchande totale de tous les biens et services finaux produits dans un pays au cours d'une période donnée. Approche par les dépenses : PIB = C + I + G + NX, où C est la consommation, I l'investissement (y compris les variations de stocks), G les dépenses publiques, et NX les exportations nettes (exportations moins importations). L'approche par les revenus additionne tous les revenus des facteurs (salaires, loyers, intérêts, profits). Le PIB nominal utilise les prix courants et peut augmenter simplement à cause de l'inflation. Le PIB réel se corrige des variations de prix à l'aide du déflateur du PIB : PIB réel = (PIB nominal / Déflateur du PIB) × 100. Le PIB par habitant divise par la population pour mesurer le niveau de vie moyen.",
                },
                "real_world": {
                    "ja": "2022年の米国名目GDPは約25.5兆ドルだったが、実質GDP（2017年連鎖価格）は約20.0兆ドルで、その差は累積インフレを反映している。2023年の中国名目GDPは約18兆ドルに達し、世界第2位の経済大国となった。購買力平価（PPP）ベースでは、非貿易財の価格が低いため中国のGDPは米国を上回る。これはなぜPPPが福祉比較にとって重要かを示している。",
                    "ko": "2022년 미국 명목 GDP는 약 25.5조 달러였지만, 실질 GDP(2017년 연쇄 달러 기준)는 약 20.0조 달러로 그 차이는 누적 인플레이션을 반영한다. 2023년 중국 명목 GDP는 약 18조 달러에 달해 세계 2위 경제 대국이 되었다. 구매력 평가(PPP) 기준으로는 비교역재 가격이 낮아 중국 GDP가 미국을 초과한다. 이것이 PPP가 복지 비교에 왜 중요한지를 보여준다.",
                    "fr": "Le PIB nominal américain en 2022 était d'environ 25 500 milliards de dollars ; le PIB réel (en dollars chaînés de 2017) était d'environ 20 000 milliards — la différence reflète l'inflation cumulée. Le PIB nominal de la Chine a atteint environ 18 000 milliards de dollars en 2023, faisant d'elle la deuxième économie mondiale. En parité de pouvoir d'achat, le PIB de la Chine dépasse celui des États-Unis car les prix des biens non échangeables sont plus bas — illustrant pourquoi la PPA est importante pour les comparaisons de bien-être.",
                },
                "exam_tip": {
                    "ja": "GDPに含まれないものを把握しておくこと：中間財（二重計上回避）、非市場生産（家庭料理・無償育児）、中古品（新品時にカウント済み）、純粋な金融取引（株取引）。APマルティプルチョイスではこれらの除外項目が頻出。公式：実質GDP =（名目GDP ÷ GDPデフレーター）× 100。デフレーターが100から125に上昇した場合、物価は25%上昇しており、名目GDPを1.25で割る必要がある。",
                    "ko": "GDP에 포함되지 않는 것들을 파악해야 한다: 중간재(이중 계산 방지), 비시장 생산(집에서 요리, 무급 육아), 중고품(신품 시 이미 계산됨), 순수 금융 거래(주식 거래). AP 객관식에서 이러한 제외 항목이 자주 출제된다. 공식: 실질 GDP = (명목 GDP ÷ GDP 디플레이터) × 100. 디플레이터가 100에서 125로 상승하면 물가가 25% 오른 것이므로 명목 GDP를 1.25로 나누어야 한다.",
                    "fr": "Sachez ce qui N'EST PAS inclus dans le PIB : les biens intermédiaires (pour éviter les doubles comptages), la production non marchande (cuisine maison, garde d'enfants non rémunérée), les biens d'occasion (déjà comptés à l'état neuf), et les transactions purement financières (échanges boursiers). Ces exclusions sont fréquemment testées dans les QCM de l'AP. Formule : PIB réel = (PIB nominal / Déflateur du PIB) × 100 — si le déflateur passe de 100 à 125, les prix ont augmenté de 25 % et il faut diviser le nominal par 1,25.",
                },
            },
            # Section 2: Unemployment
            {
                "heading": {
                    "ja": "失業：種類・コストと測定",
                    "ko": "실업: 유형, 비용, 측정",
                    "fr": "Le chômage : types, coûts et mesure",
                },
                "body": {
                    "ja": "失業率 =（失業者数 ÷ 労働力人口）× 100。労働力人口には就業者と積極的に職を探している失業者が含まれる。求職をあきらめた失業意欲喪失労働者、フルタイムを希望しながらパートタイムで働く者、労働力人口外の者は含まれない。主要な3種類の失業：摩擦的失業（転職中・新規参入者。正常かつ不可避）、構造的失業（技術変化・産業転換による技能のミスマッチ。再訓練が必要）、循環的失業（景気後退時の総需要不足。安定化政策の対象）。自然失業率（NRU）＝摩擦的失業＋構造的失業。完全雇用は循環的失業がゼロを意味し、総失業がゼロではない。",
                    "ko": "실업률 = (실업자 수 ÷ 노동력 인구) × 100. 노동력 인구에는 취업자와 적극적으로 일자리를 구하는 실업자가 포함된다. 구직을 포기한 실망 실업자, 풀타임을 원하지만 파트타임으로 일하는 자, 노동력 인구 밖의 사람은 포함되지 않는다. 주요 실업의 세 가지 유형: 마찰적 실업(이직 중·신규 진입자. 정상적이고 불가피), 구조적 실업(기술 변화·산업 전환으로 인한 기술 불일치. 재훈련 필요), 경기적 실업(경기침체 시 총수요 부족. 안정화 정책의 대상). 자연실업률(NRU) = 마찰적 실업 + 구조적 실업. 완전고용은 경기적 실업이 0임을 의미하며 총실업이 0이 아니다.",
                    "fr": "Taux de chômage = (chômeurs / population active) × 100. La population active comprend les actifs occupés et les chômeurs qui cherchent activement du travail. Elle exclut les travailleurs découragés (qui ont abandonné leur recherche), les travailleurs à temps partiel souhaitant travailler à plein temps, et les personnes hors de la population active. Trois types principaux : chômage frictionnel (entre deux emplois ou entrant sur le marché — normal et inévitable), chômage structurel (inadéquation des compétences due aux changements technologiques ou sectoriels — nécessite une reconversion), et chômage conjoncturel (causé par une demande globale insuffisante lors des récessions — cible des politiques de stabilisation). Taux de chômage naturel (NAIRU) = frictionnel + structurel. Le plein emploi signifie un chômage conjoncturel nul, pas un chômage total nul.",
                },
                "real_world": {
                    "ja": "2020年4月の米国失業率は14.7%に達し、そのほとんどはCOVID-19のロックダウンによる総需要崩壊が引き起こした循環的失業だった。2022年には3.5%まで低下し、自然失業率に近づいた。2008年以降、製造業の自動化や海外移転により構造的失業が増加し、再訓練プログラムが必要となった。ドイツの2020年「Kurzarbeit（短時間労働）」制度は、政府が短縮勤務時間を補助することで失業率を6%以下に抑えた。",
                    "ko": "2020년 4월 미국 실업률은 14.7%에 달했으며, 대부분은 코로나19 봉쇄로 인한 총수요 붕괴로 야기된 경기적 실업이었다. 2022년에는 3.5%로 하락해 자연실업률에 가까워졌다. 2008년 이후 제조업의 자동화와 해외 이전으로 구조적 실업이 증가해 재훈련 프로그램이 필요해졌다. 독일의 2020년 '쿠르츠아르바이트(단시간 근로)' 제도는 정부가 단축 근무시간을 보조함으로써 실업률을 6% 미만으로 유지했다.",
                    "fr": "Le chômage américain a atteint 14,7 % en avril 2020 — presque entièrement conjoncturel, provoqué par l'effondrement de la demande globale dû aux confinements COVID-19. Il est tombé à 3,5 % en 2022, proche du taux naturel. Le chômage structurel a augmenté après 2008 avec l'automatisation et la délocalisation des emplois manufacturiers, nécessitant des programmes de reconversion. Le dispositif allemand Kurzarbeit (travail à temps partiel) en 2020 a maintenu le chômage sous 6 % en subventionnant la réduction du temps de travail plutôt que les licenciements.",
                },
                "exam_tip": {
                    "ja": "APでは失業の種類を識別できるかが問われる。循環的失業＝景気後退が原因。構造的失業＝技術・産業変化。摩擦的失業＝自発的な離職・転職。政策は異なる：財政・金融政策は循環的失業に対処し、教育・再訓練は構造的失業に、職業情報（マッチング改善）は摩擦的失業を減らす。自然失業率は摩擦的・構造的失業のみを含む。NRUにある完全雇用でも、ある程度の失業は存在する。",
                    "ko": "AP에서는 실업의 유형을 식별할 수 있는지를 묻는다. 경기적 실업 = 경기침체 원인. 구조적 실업 = 기술·산업 변화. 마찰적 실업 = 자발적 이직·전직. 정책은 서로 다르다: 재정·통화 정책은 경기적 실업에, 교육·재훈련은 구조적 실업에, 직업 정보 개선(매칭)은 마찰적 실업을 줄인다. 자연실업률에는 마찰적·구조적 실업만 포함된다. NRU에서의 완전고용에도 어느 정도의 실업이 존재한다.",
                    "fr": "L'AP vérifie votre capacité à identifier les types de chômage. Conjoncturel = causé par la récession. Structurel = changement technologique/industriel. Frictionnel = volontaire entre deux emplois. Les politiques diffèrent : les politiques budgétaires et monétaires traitent le chômage conjoncturel ; l'éducation et la reconversion traitent le structurel ; le meilleur appariement (information) réduit le frictionnel. Le taux naturel inclut uniquement le frictionnel et le structurel — le plein emploi au NAIRU implique encore un certain niveau de chômage.",
                },
            },
            # Section 3: Inflation
            {
                "heading": {
                    "ja": "インフレーション：測定・原因とコスト",
                    "ko": "인플레이션: 측정, 원인, 비용",
                    "fr": "L'inflation : mesure, causes et coûts",
                },
                "body": {
                    "ja": "インフレーションとは一般物価水準の継続的な上昇である。消費者物価指数（CPI）は、典型的な都市部消費者が購入する固定バスケットのコストを追跡することでインフレを測定する。CPI（t年）=（t年のバスケットコスト ÷ 基準年のバスケットコスト）× 100。インフレ率 =（今年のCPI－昨年のCPI）÷ 昨年のCPI × 100。需要牽引型インフレ：過剰な総需要が価格を引き上げる（マネーが財を追いかける状態）。費用プッシュ型インフレ：原材料・賃金等の投入コストが上昇し、物価を押し上げSRASを左にシフトさせる。インフレは購買力を侵食し、不確実性を生み、債権者（固定名目支払いの受取人）を害し、予想外のインフレでは貸し手から借り手へ富を再分配する。",
                    "ko": "인플레이션은 일반 물가 수준의 지속적인 상승이다. 소비자물가지수(CPI)는 전형적인 도시 소비자가 구입하는 고정 바스켓의 비용을 추적해 인플레이션을 측정한다. CPI(t년) = (t년 바스켓 비용 ÷ 기준년 바스켓 비용) × 100. 인플레이션율 = (올해 CPI - 작년 CPI) ÷ 작년 CPI × 100. 수요 견인 인플레이션: 과도한 총수요가 가격을 끌어올린다(돈이 재화를 쫓는 상태). 비용 인상 인플레이션: 원자재·임금 등 투입 비용 상승이 물가를 밀어올리고 SRAS를 왼쪽으로 이동시킨다. 인플레이션은 구매력을 침식하고 불확실성을 야기하며 채권자(고정 명목 지급 수취인)에게 피해를 주고, 예상치 못한 인플레이션의 경우 대출자에서 차입자로 부를 재분배한다.",
                    "fr": "L'inflation est une hausse durable du niveau général des prix. L'Indice des prix à la consommation (IPC) mesure l'inflation en suivant le coût d'un panier fixe de biens achetés par un consommateur urbain typique. IPC en t = (Coût du panier en t / Coût du panier en année de base) × 100. Taux d'inflation = (IPC cette année - IPC l'an dernier) / IPC l'an dernier × 100. Inflation par la demande : l'excès de demande globale tire les prix vers le haut (trop d'argent chassant trop peu de biens). Inflation par les coûts : la hausse des coûts des intrants (pétrole, salaires) pousse les prix à la hausse et déplace l'OAS vers la gauche. L'inflation érode le pouvoir d'achat, crée de l'incertitude, nuit aux créanciers (paiements nominaux fixes), et redistribue la richesse des prêteurs vers les emprunteurs en cas d'inflation inattendue.",
                },
                "real_world": {
                    "ja": "米国CPIは2022年6月に9.1%のピークに達し、1981年以来最高となった。これはサプライチェーンの混乱（費用プッシュ型）とCOVID期間中の大規模財政刺激（需要牽引型）が重なった結果だ。FRBは40年ぶりに最速の利上げサイクルで対応し、2024年にはインフレが約3%まで低下した。ジンバブエ（2008年、年率89.7垓%）とベネズエラ（2018年、100万%）のハイパーインフレは、制御不能なインフレがもたらす経済破壊を示す。",
                    "ko": "미국 CPI는 2022년 6월 9.1%의 정점에 달해 1981년 이후 최고치를 기록했다. 공급망 붕괴(비용 인상형)와 코로나 기간 대규모 재정 부양(수요 견인형)이 겹친 결과다. FRB는 40년 만에 가장 빠른 금리 인상 사이클로 대응했으며 2024년에는 인플레이션이 약 3%로 하락했다. 짐바브웨(2008년, 연 89.7해%)와 베네수엘라(2018년, 100만%)의 초인플레이션은 통제 불능 인플레이션이 가져오는 경제적 파괴를 보여준다.",
                    "fr": "L'IPC américain a culminé à 9,1 % en juin 2022 — le plus haut depuis 1981 — alimenté par les perturbations des chaînes d'approvisionnement (inflation par les coûts) et les massifs plans de relance budgétaires pendant le COVID (inflation par la demande). La Fed a répondu par le cycle de hausse des taux le plus rapide en 40 ans. En 2024, l'inflation est retombée à environ 3 %. L'hyperinflation au Zimbabwe (2008, 89,7 sextillions % par an) et au Venezuela (2018, 1 million %) illustre la destruction économique d'une inflation incontrôlée.",
                },
                "exam_tip": {
                    "ja": "CPIとGDPデフレーターの比較：CPIは固定バスケット（ラスパイレス指数）を用いて消費者価格を反映する。GDPデフレーターは国内生産のすべての財を対象とし、産出構成に合わせて変化する。APでは両方を問う。実質値 = 名目値 ÷（価格指数 ÷ 100）。名目賃金が5%上昇してもインフレが7%であれば、実質賃金は2%低下している。名目上昇しても労働者の実質的な状況は悪化している。",
                    "ko": "CPI vs GDP 디플레이터: CPI는 고정 바스켓(라스파이레스 지수)을 사용해 소비자 가격을 반영한다. GDP 디플레이터는 국내 생산의 모든 재화를 포괄하며 산출 구성에 따라 변한다. AP에서 두 가지 모두 출제된다. 실질 값 = 명목 값 ÷ (물가 지수 ÷ 100). 명목 임금이 5% 오르더라도 인플레이션이 7%이면 실질 임금은 2% 하락한다. 명목 인상에도 불구하고 노동자의 실질 상황은 악화된 것이다.",
                    "fr": "IPC vs déflateur du PIB : l'IPC utilise un panier fixe (indice de Laspeyres) et reflète les prix à la consommation ; le déflateur du PIB couvre tous les biens produits nationalement et évolue avec la composition de la production. L'AP teste les deux. Valeur réelle = Valeur nominale / (Indice des prix / 100). Si le salaire nominal augmente de 5 % mais que l'inflation est de 7 %, le salaire réel a baissé de 2 % — les travailleurs sont plus pauvres malgré une hausse nominale.",
                },
            },
            # Section 4: Business Cycle
            {
                "heading": {
                    "ja": "景気循環：局面と指標",
                    "ko": "경기순환: 국면과 지표",
                    "fr": "Le cycle économique : phases et indicateurs",
                },
                "body": {
                    "ja": "景気循環は実質GDPが長期的なトレンド成長率の周りで繰り返し変動することを表す。4つの局面：拡張（実質GDP上昇・失業低下・投資活発）、ピーク（産出量最大・労働市場逼迫・インフレ上昇）、収縮・後退（実質GDPが2四半期連続低下・失業上昇・投資減少）、底（回復前の最低産出量）。先行指標は将来の経済活動を予測する：株価・建設許可・消費者信頼感・イールドカーブ。一致指標は経済と同時に動く：雇用・個人所得。遅行指標はトレンドが生じてから確認する：失業率・インフレ・企業向け融資。",
                    "ko": "경기순환은 실질 GDP가 장기 추세 성장률 주변에서 반복적으로 변동하는 것을 나타낸다. 4가지 국면: 확장(실질 GDP 상승·실업 하락·투자 활발), 정점(산출량 최대·노동시장 과열·인플레이션 상승), 수축·후퇴(실질 GDP 2분기 연속 하락·실업 상승·투자 감소), 저점(회복 전 최저 산출량). 선행지표는 미래 경제활동을 예측한다: 주가·건축허가·소비자 신뢰도·수익률 곡선. 동행지표는 경제와 함께 움직인다: 고용·개인 소득. 후행지표는 추세가 발생한 후 확인한다: 실업률·인플레이션·기업 대출.",
                    "fr": "Le cycle économique décrit les fluctuations récurrentes du PIB réel autour de son taux de croissance tendanciel à long terme. Les quatre phases : expansion (PIB réel en hausse, chômage en baisse, investissement dynamique), pic (production maximale, marché du travail tendu, inflation en hausse), contraction/récession (PIB réel en baisse deux trimestres consécutifs, chômage en hausse, investissement en déclin), et creux (production minimale avant la reprise). Les indicateurs avancés anticipent l'activité économique future : cours boursiers, permis de construire, confiance des consommateurs, courbe des taux. Les indicateurs coïncidents évoluent avec l'économie : emploi, revenus personnels. Les indicateurs retardés confirment les tendances après coup : taux de chômage, inflation, prêts aux entreprises.",
                },
                "real_world": {
                    "ja": "米国は第二次世界大戦後12回の景気後退を経験した。2008-09年の大不況（GDP4.3%低下・失業率10%）は1930年代以降で最も深刻だった。2020年の景気後退は記録上最短（2ヶ月）だったが最も急激で（2020年Q2に年率-10%）COVID-19のロックダウンによるものだった。2022年のイールドカーブの逆転は先行指標として2023年の経済減速を正確に予測した。これは1955年以降すべての米国景気後退を予測してきた指標だ。",
                    "ko": "미국은 2차 세계대전 이후 12번의 경기침체를 경험했다. 2008-09년 대침체(GDP 4.3% 하락·실업률 10%)는 1930년대 이후 가장 심각했다. 2020년 경기침체는 기록상 가장 짧았지만(2개월) 가장 급격했으며(-연율 10%, 2020년 2분기) 코로나19 봉쇄로 인한 것이었다. 2022년 수익률 곡선 역전은 선행지표로서 2023년 경제 둔화를 정확히 예측했다. 이는 1955년 이후 모든 미국 경기침체를 예측해온 지표다.",
                    "fr": "Les États-Unis ont connu 12 récessions depuis la Seconde Guerre mondiale. La Grande Récession de 2008-09 (PIB en baisse de 4,3 %, chômage à 10 %) a été la plus profonde depuis les années 1930. La récession de 2020 a été la plus courte jamais enregistrée (deux mois) mais la plus brutale (-10 % de PIB annualisé au T2 2020) en raison des confinements COVID. La courbe des taux s'est inversée en 2022 — indicateur avancé qui a correctement prédit le ralentissement économique de 2023, comme il a prédit chaque récession américaine depuis 1955.",
                },
                "exam_tip": {
                    "ja": "産出ギャップ = 実際のGDP - 潜在GDP。マイナスの産出ギャップ（後退ギャップ）：実際＜潜在、失業率が自然率超過。プラスの産出ギャップ（インフレギャップ）：実際＞潜在、経済が過熱しインフレ上昇。APではギャップの種類を識別し、それを示すAD-ASダイアグラムを描き、正しい政策対応を処方することが求められる。短期と長期の均衡を必ず示すこと。",
                    "ko": "산출 갭 = 실제 GDP - 잠재 GDP. 마이너스 산출 갭(경기침체 갭): 실제 < 잠재, 실업률이 자연율 초과. 플러스 산출 갭(인플레이션 갭): 실제 > 잠재, 경제 과열 및 인플레이션 상승. AP에서는 갭의 유형을 식별하고 이를 나타내는 AD-AS 다이어그램을 그리고 올바른 정책 대응을 제시하는 것이 요구된다. 단기와 장기 균형을 반드시 표시할 것.",
                    "fr": "Écart de production = PIB effectif moins PIB potentiel. Écart négatif (écart récessif) : effectif < potentiel, chômage au-dessus du taux naturel. Écart positif (écart inflationniste) : effectif > potentiel, économie en surchauffe, inflation en hausse. L'AP demande d'identifier le type d'écart, de tracer le diagramme OA-DA le montrant, et de prescrire la bonne réponse politique. Montrez toujours l'équilibre à court terme ET à long terme.",
                },
            },
        ],
    },

    "ap_3": {
        "title": {
            "ja": "国民所得と物価の決定",
            "ko": "국민소득과 물가 결정",
            "fr": "Le revenu national et la détermination des prix",
        },
        "sections": [
            # Section 1: Aggregate Demand
            {
                "heading": {
                    "ja": "総需要：構成要素と決定要因",
                    "ko": "총수요: 구성요소와 결정요인",
                    "fr": "La demande globale : composantes et déterminants",
                },
                "body": {
                    "ja": "総需要（AD）とは、あらゆる物価水準において経済で需要される財・サービスの総量である。AD = C + I + G + NX。AD曲線が右下がりになる3つの理由：富効果（物価上昇は金融資産の実質価値を低下させ消費を減らす）、利子率効果（物価上昇はマネー需要を高め利子率を上昇させ投資を減らす）、純輸出効果（国内物価の上昇は輸出の競争力を落としNXを減らす）。非価格水準の決定要因が変わるとADはシフトする：消費者信頼感・投資期待・政府支出・税制変更・外国の所得・為替レートなど。ADの右シフトは実質産出量と物価水準の両方を引き上げる。",
                    "ko": "총수요(AD)는 모든 물가 수준에서 경제에서 수요되는 재화와 서비스의 총량이다. AD = C + I + G + NX. AD 곡선이 우하향하는 3가지 이유: 부의 효과(물가 상승은 금융자산의 실질 가치를 감소시켜 소비를 줄인다), 이자율 효과(물가 상승은 화폐 수요를 높여 이자율을 올리고 투자를 줄인다), 순수출 효과(국내 물가 상승은 수출 경쟁력을 떨어뜨려 NX를 줄인다). 비물가 수준 결정요인이 변하면 AD가 이동한다: 소비자 신뢰도·투자 기대·정부 지출·세제 변경·외국 소득·환율 등. AD의 오른쪽 이동은 실질 산출량과 물가 수준을 모두 높인다.",
                    "fr": "La demande globale (DG) est la quantité totale de biens et services demandée dans l'économie à chaque niveau de prix. DG = C + I + G + XN. La courbe DG est décroissante pour trois raisons : l'effet richesse (une hausse des prix réduit la valeur réelle des actifs financiers, diminuant la consommation), l'effet taux d'intérêt (une hausse des prix accroît la demande de monnaie, faisant monter les taux d'intérêt et réduisant l'investissement), et l'effet exportations nettes (une hausse des prix domestiques rend les exportations moins compétitives, réduisant XN). La DG se déplace lorsqu'un déterminant non lié au niveau des prix change : confiance des consommateurs, anticipations d'investissement, dépenses publiques, modifications fiscales, revenus étrangers, ou taux de change. Un déplacement à droite de la DG élève à la fois la production réelle et le niveau des prix.",
                },
                "real_world": {
                    "ja": "COVID-19期間中、ADの4つの構成要素がすべて同時に崩壊した：ロックダウンが消費を抑制し、不確実性が設備投資を急落させ、政府支出は急増し（景気刺激）、世界貿易の凍結で純輸出が減少した。正味の結果はADの急激な左シフトだった。2024年の中国の景気刺激策（金利引き下げ・住宅ローン要件緩和）はCとIを押し上げてADを右にシフトさせ、デフレ圧力を克服することを目指した。",
                    "ko": "코로나19 기간 동안 AD의 4가지 구성요소가 모두 동시에 붕괴했다: 봉쇄로 소비가 억제되고, 불확실성으로 설비투자가 급락했으며, 정부 지출은 급증하고(경기부양), 세계 무역 동결로 순수출이 감소했다. 순효과는 AD의 급격한 왼쪽 이동이었다. 2024년 중국의 경기부양책(금리 인하·대출 요건 완화)은 C와 I를 올려 AD를 오른쪽으로 이동시켜 디플레이션 압력을 극복하는 것을 목표로 했다.",
                    "fr": "Pendant la COVID-19, les quatre composantes de la DG se sont effondrées simultanément : les dépenses de consommation ont chuté avec les confinements, l'investissement des entreprises a plongé en raison de l'incertitude, les dépenses publiques ont explosé (relance), et les exportations nettes ont baissé avec le gel du commerce mondial. L'effet net a été un déplacement brutal de la DG vers la gauche. Le plan de relance chinois de 2024 — baisse des taux d'intérêt et assouplissement des conditions hypothécaires — visait à stimuler C et I, déplaçant la DG vers la droite pour surmonter la pression déflationniste.",
                },
                "exam_tip": {
                    "ja": "ADのシフトとADに沿った動きの区別：物価水準の変化はADに沿った動き（シフトではない）を引き起こす。それ以外はADをシフトさせる。よくあるAPの落とし穴：ADのシフトにより物価水準が変わった場合、それに応じて再度ADをシフトさせる必要はない。元の均衡（E1）と新均衡（E2）を明確にラベルし、シフトの方向を矢印で示すこと。",
                    "ko": "AD의 이동 vs AD를 따른 움직임의 구별: 물가 수준의 변화는 AD를 따른 움직임(이동이 아님)을 야기한다. 그 외의 모든 것은 AD를 이동시킨다. 흔한 AP 함정: AD 이동으로 물가 수준이 변한 경우, 그에 반응해 다시 AD를 이동시키지 말 것. 원래 균형(E1)과 새 균형(E2)을 명확히 레이블하고 이동 방향을 화살표로 표시할 것.",
                    "fr": "Distinguer un déplacement de la DG d'un mouvement le long de la DG : un changement du niveau des prix provoque un mouvement LE LONG de la DG (pas un déplacement). Tout le reste déplace la DG. Piège fréquent à l'AP : si le niveau des prix change à la suite d'un déplacement de la DG, vous ne déplacez pas à nouveau la DG en réponse à la variation de prix qui en résulte. Tracez des flèches indiquant la direction du déplacement et étiquetez clairement l'équilibre initial (E1) et le nouvel équilibre (E2).",
                },
            },
            # Section 2: Aggregate Supply
            {
                "heading": {
                    "ja": "総供給：SRAS・LRASとシフト",
                    "ko": "총공급: SRAS, LRAS와 이동",
                    "fr": "L'offre globale : OAS, OAL et déplacements",
                },
                "body": {
                    "ja": "短期総供給（SRAS）は右上がりだ。なぜなら短期的には投入価格（特に賃金）が粘着性を持つからである。物価水準が上昇すると、企業は既存のコスト構造で収益が増加し、産出量を拡大する。長期総供給（LRAS）は完全雇用（潜在）産出水準において垂直である。長期的にはすべての価格・賃金が完全に調整されるからだ。SRASは投入コスト（原油価格・賃金）の変化、生産性（技術）の変化、法人税・規制の変化によってシフトする。LRASは生産要素の量・質の変化とともにシフトする。資本投資の増加・技術向上・労働増加・人的資本の改善はいずれもLRASを右にシフトさせ、長期的な経済成長を表す。",
                    "ko": "단기 총공급(SRAS)은 우상향한다. 단기적으로는 투입 가격(특히 임금)이 경직적이기 때문이다. 물가 수준이 상승하면 기업은 기존 비용 구조에서 수익이 증가해 산출량을 확대한다. 장기 총공급(LRAS)은 완전고용(잠재) 산출 수준에서 수직이다. 장기적으로는 모든 가격·임금이 완전히 조정되기 때문이다. SRAS는 투입 비용(원유 가격·임금) 변화, 생산성(기술) 변화, 법인세·규제 변화에 의해 이동한다. LRAS는 생산요소의 양·질 변화와 함께 이동한다. 자본 투자 증가·기술 향상·노동 증가·인적 자본 개선은 모두 LRAS를 오른쪽으로 이동시키며 장기적인 경제 성장을 나타낸다.",
                    "fr": "L'offre agrégée à court terme (OAS) est croissante car les prix des intrants (notamment les salaires) sont rigides à court terme. Lorsque le niveau des prix augmente, les entreprises voient leurs revenus augmenter avec des structures de coûts fixes et développent leur production. L'offre agrégée à long terme (OAL) est verticale au niveau de la production de plein emploi (potentielle), car à long terme tous les prix et salaires s'ajustent complètement. L'OAS se déplace lorsque les coûts des intrants changent (prix du pétrole, salaires), lorsque la productivité change (technologie), ou lorsque les taxes/réglementations sur les entreprises changent. L'OAL se déplace avec des changements dans la quantité ou la qualité des facteurs de production : davantage d'investissement en capital, meilleure technologie, plus de main-d'œuvre, ou amélioration du capital humain déplacent tous l'OAL vers la droite, représentant la croissance économique à long terme.",
                },
                "real_world": {
                    "ja": "1973年のOPEC石油禁輸は米国経済のSRASを劇的に左にシフトさせた。石油価格が4倍になり、ほぼすべての産業でコストが上昇した。結果はスタグフレーション：物価上昇と産出量の低下が同時に発生。2022年のロシアによるウクライナ侵攻後の世界的なエネルギー危機でも同様の現象が起きた。エネルギー価格の急騰がヨーロッパ全域でSRASを左にシフトさせ、インフレと景気後退（スタグフレーション）を引き起こした。これらの供給ショックは需要サイドの政策だけでは解決できない。",
                    "ko": "1973년 OPEC 석유 금수는 미국 경제의 SRAS를 극적으로 왼쪽으로 이동시켰다. 석유 가격이 4배가 되어 거의 모든 산업에서 비용이 상승했다. 결과는 스태그플레이션: 물가 상승과 산출량 감소가 동시에 발생. 2022년 러시아의 우크라이나 침공 이후 전 세계 에너지 위기에서도 같은 현상이 발생했다. 에너지 가격 급등이 유럽 전역에서 SRAS를 왼쪽으로 이동시켜 인플레이션과 경기침체(스태그플레이션)를 야기했다. 이러한 공급 충격은 수요 측 정책만으로는 해결할 수 없다.",
                    "fr": "L'embargo pétrolier de l'OPEP en 1973 a provoqué un déplacement dramatique vers la gauche de l'OAS de l'économie américaine — les prix du pétrole ont quadruplé, augmentant les coûts de pratiquement tous les secteurs. Le résultat a été la stagflation : hausse des prix ET baisse de la production simultanément. La crise énergétique mondiale de 2022 après l'invasion de l'Ukraine par la Russie a reproduit cela : les hausses des prix de l'énergie ont déplacé l'OAS vers la gauche dans toute l'Europe, causant à la fois inflation et récession (stagflation). Ces chocs d'offre ne peuvent être résolus par les seules politiques de la demande.",
                },
                "exam_tip": {
                    "ja": "スタグフレーションはAPのAD-ASシナリオで最も難しい。SRASの左シフトは物価水準を上昇させ実質産出量を低下させる。FRBが拡張的金融政策（ADを右にシフト）で対応すれば産出量は回復するがインフレが悪化する。インフレ抑制のために引き締め政策を使えば産出量がさらに低下する。スタグフレーションの図を注意深く描くこと：SRASが左にシフト、新均衡でPが高くYが低い状態を示し、2つの可能な政策対応を描く。",
                    "ko": "스태그플레이션은 AP에서 AD-AS 시나리오 중 가장 어렵다. SRAS의 왼쪽 이동은 물가 수준을 높이고 실질 산출량을 감소시킨다. 연준이 확장적 통화 정책(AD를 오른쪽으로 이동)으로 대응하면 산출량은 회복되지만 인플레이션이 악화된다. 인플레이션 억제를 위해 긴축 정책을 쓰면 산출량이 더 하락한다. 스태그플레이션 그림을 주의 깊게 그릴 것: SRAS가 왼쪽으로 이동하고 새 균형에서 P가 높고 Y가 낮은 상태를 보이며 두 가지 가능한 정책 대응을 표시한다.",
                    "fr": "La stagflation est le scénario OA-DA le plus difficile pour l'AP. Un déplacement de l'OAS vers la gauche élève le niveau des prix ET réduit la production réelle. Si la Fed répond par une politique monétaire expansionniste (déplacement de DA vers la droite), elle rétablit la production mais aggrave l'inflation. Si on utilise une politique contractionniste pour lutter contre l'inflation, la production chute encore davantage. Tracez soigneusement le scénario de stagflation : l'OAS se déplace vers la gauche, le nouvel équilibre a P plus élevé et Y plus faible, avec deux réponses politiques possibles.",
                },
            },
            # Section 3: AD-AS Equilibrium
            {
                "heading": {
                    "ja": "AD-AS均衡：産出ギャップと自己修正",
                    "ko": "AD-AS 균형: 산출 갭과 자기 조정",
                    "fr": "L'équilibre OA-DA : écarts de production et autocorrection",
                },
                "body": {
                    "ja": "短期マクロ経済均衡はADとSRASが交差する点で成立する。この均衡は潜在産出量の上または下になることがある。後退ギャップ：短期均衡が潜在GDPを下回る（実際の産出量＜潜在産出量）。ADがシフトした、またはSRASが左にシフトした。失業率が自然率を超える。長期的には賃金が低下し（労働余剰による）、SRASが右にシフトして低い物価水準で完全雇用が回復する（自己修正）。インフレギャップ：短期均衡が潜在GDPを上回る。失業率が自然率を下回る。長期的には賃金が上昇してSRASが左にシフトし、高い物価水準で均衡が回復する。重要な議論：ギャップを積極的に閉じるべきか、それとも経済の自己修正を待つべきか？",
                    "ko": "단기 거시경제 균형은 AD와 SRAS가 교차하는 점에서 형성된다. 이 균형은 잠재 산출량의 위나 아래가 될 수 있다. 경기침체 갭: 단기 균형이 잠재 GDP 이하(실제 산출량 < 잠재 산출량). AD가 왼쪽으로 이동하거나 SRAS가 왼쪽으로 이동했다. 실업률이 자연율을 초과한다. 장기적으로는 임금이 하락하고(노동 초과 공급으로) SRAS가 오른쪽으로 이동해 낮은 물가 수준에서 완전고용이 회복된다(자기 조정). 인플레이션 갭: 단기 균형이 잠재 GDP 이상. 실업률이 자연율 이하. 장기적으로는 임금이 상승해 SRAS가 왼쪽으로 이동하고 높은 물가 수준에서 균형이 회복된다. 핵심 논쟁: 갭을 적극적으로 좁혀야 하는가, 아니면 경제의 자기 조정을 기다려야 하는가?",
                    "fr": "L'équilibre macroéconomique à court terme se produit là où la DA rencontre l'OAS. Il peut se situer au-dessus ou en dessous de la production potentielle. Écart récessif : l'équilibre à court terme est inférieur au PIB potentiel (production effective < potentielle). La DA ou l'OAS s'est déplacée vers la gauche. Le chômage dépasse le taux naturel. À long terme, les salaires baissent (excès d'offre de travail), l'OAS se déplace vers la droite, rétablissant le plein emploi à un niveau de prix plus bas — autocorrection. Écart inflationniste : l'équilibre à court terme dépasse le PIB potentiel. Chômage sous le taux naturel. À long terme, les salaires augmentent, l'OAS se déplace vers la gauche, rétablissant l'équilibre à un niveau de prix plus élevé. Le débat central : faut-il fermer activement l'écart ou laisser l'économie s'autocorriger ?",
                },
                "real_world": {
                    "ja": "2020年の米国CARES法（2.2兆ドルの景気刺激策）はADを右にシフトさせ後退ギャップを閉じた。GDPは2020年Q4に回復したが、批評家は刺激策が大きすぎ長すぎたと主張した。2021年には経済がインフレギャップに入り、2022年のインフレ9.1%の一因となった。この現実の連鎖はAD-ASモデルを完璧に示す：後退（後退ギャップ）→財政刺激（AD右シフト）→回復→オーバーシュート（インフレギャップ）→インフレ。",
                    "ko": "2020년 미국 CARES법(2.2조 달러 경기부양)은 AD를 오른쪽으로 이동시켜 경기침체 갭을 닫았다. GDP는 2020년 4분기에 회복되었지만 비평가들은 부양책이 너무 크고 너무 오래 지속되었다고 주장했다. 2021년에는 경제가 인플레이션 갭에 진입해 2022년 인플레이션 9.1%의 한 원인이 되었다. 이 실제 연쇄는 AD-AS 모델을 완벽하게 보여준다: 경기침체(경기침체 갭) → 재정 부양(AD 오른쪽 이동) → 회복 → 과잉(인플레이션 갭) → 인플레이션.",
                    "fr": "Le CARES Act américain de 2020 — relance de 2 200 milliards de dollars — a déplacé la DA vers la droite pour combler l'écart récessif. Le PIB s'est redressé au T4 2020, mais les critiques ont soutenu que la relance était trop importante et trop prolongée : en 2021, l'économie présentait un écart inflationniste, contribuant à une inflation de 9,1 % en 2022. Cette séquence réelle illustre parfaitement le modèle OA-DA : récession (écart récessif) → relance budgétaire (DA se déplace vers la droite) → reprise → dépassement (écart inflationniste) → inflation.",
                },
                "exam_tip": {
                    "ja": "APの自由記述は必ず以下を求める：現在のAD-AS状況を描く、ギャップの種類を識別する、政策対応を示す、長期の自己修正を説明する。この5ステップのシーケンスを練習すること：(1)潜在産出量での初期均衡を描く、(2)ADまたはSRASをシフトするショックを示す、(3)ギャップを識別する、(4)政策対応を示す、(5)長期の自己修正を示す。各ステップが個別に採点される。",
                    "ko": "AP 자유 서술은 항상 다음을 요구한다: 현재의 AD-AS 상황을 그리고, 갭의 유형을 식별하고, 정책 대응을 보여주고, 장기 자기 조정을 설명한다. 다음 5단계 순서를 연습할 것: (1) 잠재 산출량에서의 초기 균형 그리기, (2) AD 또는 SRAS를 이동시키는 충격 표시, (3) 갭 식별, (4) 정책 대응 표시, (5) 장기 자기 조정 표시. 각 단계가 개별적으로 채점된다.",
                    "fr": "Les questions à réponse libre de l'AP demandent toujours : tracer la situation OA-DA actuelle, identifier le type d'écart, montrer la réponse politique, et expliquer l'autocorrection à long terme. Entraînez-vous à cette séquence en cinq étapes : (1) tracer l'équilibre initial à la production potentielle, (2) montrer le choc déplaçant DA ou OAS, (3) identifier l'écart, (4) montrer la réponse politique, (5) montrer l'autocorrection à long terme. Chaque étape rapporte des points séparément.",
                },
            },
            # Section 4: Multiplier Effect
            {
                "heading": {
                    "ja": "乗数効果と財政政策",
                    "ko": "승수 효과와 재정 정책",
                    "fr": "L'effet multiplicateur et la politique budgétaire",
                },
                "body": {
                    "ja": "支出乗数は、支出の初期増加が最終的にGDPをより大きく増加させることを示す。政府が1,000億ドル支出すると、受取人は所得を得てその一部（MPC）を消費し、その支出を受けた人がまた所得を得て消費するというチェーンが続く。支出乗数 = 1 ÷（1 - MPC）= 1 ÷ MPS。MPC = 0.8の場合、乗数 = 5。1,000億ドルのG増加はGDPを5,000億ドル引き上げる。税乗数の絶対値は小さい：税乗数 = -MPC ÷ MPS。減税は可処分所得を増やすが、その一部は貯蓄されるため、最初の支出ラウンドが直接政府支出より小さい。均衡予算乗数 = 1：GとTの等しい増加はその増加分だけGDPを引き上げる。",
                    "ko": "지출 승수는 지출의 초기 증가가 GDP를 더 크게 최종적으로 증가시킨다는 것을 보여준다. 정부가 1,000억 달러를 지출하면 수령인은 소득을 얻어 그 일부(MPC)를 소비하고, 그 지출을 받은 사람이 다시 소득을 얻어 소비하는 연쇄가 계속된다. 지출 승수 = 1 ÷ (1 - MPC) = 1 ÷ MPS. MPC = 0.8이면 승수 = 5. 1,000억 달러의 G 증가는 GDP를 5,000억 달러 높인다. 세금 승수의 절대값은 더 작다: 세금 승수 = -MPC ÷ MPS. 감세는 가처분 소득을 늘리지만 일부는 저축되어 첫 번째 지출 라운드가 직접 정부 지출보다 작다. 균형 예산 승수 = 1: G와 T의 동일한 증가는 그 증가분만큼 GDP를 올린다.",
                    "fr": "Le multiplicateur de dépenses montre qu'une augmentation initiale des dépenses génère une augmentation totale du PIB plus importante. Quand le gouvernement dépense 100 milliards de dollars, les bénéficiaires gagnent un revenu, en dépensent une fraction (PMC), les bénéficiaires de ces dépenses gagnent un revenu et dépensent à nouveau — la chaîne continue. Multiplicateur de dépenses = 1 / (1 - PMC) = 1 / PMS. Si PMC = 0,8, multiplicateur = 5. Une augmentation de 100 milliards de dollars de G augmente le PIB de 500 milliards. Le multiplicateur fiscal est plus petit en valeur absolue : multiplicateur fiscal = -PMC / PMS. Parce qu'une réduction d'impôts augmente le revenu disponible qui est partiellement épargné, le premier cycle de dépenses est plus petit qu'une dépense publique directe. Multiplicateur du budget équilibré = 1 : des augmentations égales de G et T augmentent le PIB du montant de l'augmentation.",
                },
                "real_world": {
                    "ja": "IMFは2009年金融危機時の財政乗数を先進国において1.5-1.7と推定した。これは金融政策がゼロ下限に制約されていたため、従来の想定より高かった。これにより大規模な財政刺激策が正当化された。対照的に、2012年の欧州緊縮プログラムは乗数を0.5と想定したが実際には1.5以上で、予想以上に深い景気後退を引き起こした。自動安定化装置（失業保険・累進税）は立法なしに組み込まれた財政安定化の役割を果たす。",
                    "ko": "IMF는 2009년 금융위기 당시 선진국의 재정 승수를 1.5~1.7로 추정했다. 통화 정책이 제로 하한에 묶여 있어 기존 추정보다 높았다. 이로써 대규모 재정 부양이 정당화되었다. 반면, 2012년 유럽 긴축 프로그램은 승수를 0.5로 가정했지만 실제로는 1.5 이상이어서 예상보다 깊은 경기침체를 초래했다. 자동 안정화 장치(실업보험·누진세)는 별도의 입법 없이 내장된 재정 안정화 역할을 한다.",
                    "fr": "Le FMI a estimé le multiplicateur budgétaire pendant la crise financière de 2009 à 1,5-1,7 pour les économies développées — plus élevé que prévu, car la politique monétaire était contrainte par la borne zéro. Cela a justifié de vastes programmes de relance budgétaire. En revanche, les programmes d'austérité européens de 2012 avec des multiplicateurs de 1,5+ ont conduit à des récessions plus profondes que prévu, parce que les décideurs avaient supposé des multiplicateurs de seulement 0,5. Les stabilisateurs automatiques (allocations chômage, impôts progressifs) agissent comme des stabilisateurs budgétaires intégrés sans nécessiter de nouvelle législation.",
                },
                "exam_tip": {
                    "ja": "APの公式：支出乗数 = 1/MPS。税乗数 = -MPC/MPS。MPC = 0.75、MPS = 0.25の場合：支出乗数 = 4、税乗数 = -3。2,000億ドルの後退ギャップを閉じるには、G増加500億ドル（200/4）または減税670億ドル（200/3）が必要。税乗数の絶対値は常に支出乗数より1小さい。AP自由記述ではよく、ギャップを閉じるためにどちらの政策が効果的かを問う。政府支出は同額の減税より常に効果的だ。",
                    "ko": "AP 공식: 지출 승수 = 1/MPS. 세금 승수 = -MPC/MPS. MPC = 0.75, MPS = 0.25인 경우: 지출 승수 = 4, 세금 승수 = -3. 2,000억 달러의 경기침체 갭을 닫으려면 G 증가 500억 달러(200/4) 또는 감세 670억 달러(200/3)가 필요하다. 세금 승수의 절대값은 항상 지출 승수보다 1 작다. AP 자유 서술에서는 종종 갭을 닫는 데 어느 정책이 더 효과적인지를 묻는다. 정부 지출은 동일한 금액의 감세보다 항상 더 강력하다.",
                    "fr": "Formule AP : Multiplicateur de dépenses = 1/PMS. Multiplicateur fiscal = -PMC/PMS. Si PMC = 0,75 et PMS = 0,25 : multiplicateur de dépenses = 4, multiplicateur fiscal = -3. Pour combler un écart récessif de 200 milliards, il faut une augmentation de G de 50 milliards (200/4) ou une réduction d'impôts de 67 milliards (200/3). Le multiplicateur fiscal est toujours inférieur d'une unité au multiplicateur de dépenses en valeur absolue. Les questions à réponse libre demandent souvent quelle politique est la plus efficace — les dépenses publiques sont toujours plus puissantes à la dépense près qu'une réduction d'impôts équivalente.",
                },
            },
        ],
    },

    "ap_4": {
        "title": {
            "ja": "金融セクター",
            "ko": "금융 부문",
            "fr": "Le secteur financier",
        },
        "sections": [
            {
                "heading": {
                    "ja": "貨幣：機能・供給と貨幣乗数",
                    "ko": "화폐: 기능, 공급, 화폐 승수",
                    "fr": "La monnaie : fonctions, offre et multiplicateur monétaire",
                },
                "body": {
                    "ja": "貨幣は3つの機能を持つ：交換媒体（物々交換を不要にする）、価値の保存手段（時間を越えて購買力を保つ）、計算単位（価格付けの標準的尺度）。M1は最も流動性が高い資産：流通通貨と要求払い預金（当座預金）。M2 = M1 + 普通預金・少額定期預金・マネーマーケット投資信託。銀行は部分準備銀行制度を通じて貨幣を創造する。法定準備率（RRR）は銀行が準備として保持しなければならない割合。貨幣乗数 = 1 ÷ RRR。RRR = 10%の場合、1,000ドルの預金は繰り返す貸出によって総計10,000ドルの預金を支えられる。超過準備は有効な貨幣乗数を低下させる。",
                    "ko": "화폐는 세 가지 기능을 한다: 교환 매개(물물교환을 불필요하게 만든다), 가치 저장 수단(시간을 넘어 구매력을 유지한다), 계산 단위(가격 책정의 표준적 척도). M1은 가장 유동성이 높은 자산: 유통 통화와 요구불 예금(당좌예금). M2 = M1 + 보통예금·소액 정기예금·머니마켓 뮤추얼 펀드. 은행은 부분 지급준비 은행 제도를 통해 화폐를 창조한다. 법정 지급준비율(RRR)은 은행이 준비금으로 보유해야 하는 비율. 화폐 승수 = 1 ÷ RRR. RRR = 10%이면 1,000달러 예금은 반복 대출로 총 10,000달러의 예금을 지원할 수 있다. 초과 지급준비금은 유효 화폐 승수를 낮춘다.",
                    "fr": "La monnaie remplit trois fonctions : intermédiaire des échanges (élimine le troc), réserve de valeur (préserve le pouvoir d'achat dans le temps), et unité de compte (mesure standard pour la fixation des prix). M1 comprend les actifs les plus liquides : la monnaie en circulation et les dépôts à vue (comptes courants). M2 = M1 plus les comptes d'épargne, les dépôts à terme de faible montant, et les fonds communs monétaires. Les banques créent de la monnaie via la réserve fractionnaire. Le coefficient de réserves obligatoires (CRO) est la fraction que les banques doivent conserver en réserve. Multiplicateur monétaire = 1 / CRO. Si CRO = 10 %, un dépôt de 1 000 dollars peut soutenir 10 000 dollars de dépôts totaux grâce aux prêts répétés. Les réserves excédentaires réduisent le multiplicateur monétaire effectif.",
                },
                "real_world": {
                    "ja": "2008年金融危機後、米銀は貸出を行う代わりに大量の超過準備を保有し、貨幣乗数は理論値から崩壊した。FRBは2008年から超過準備に利子を支払い始め、銀行が貸出よりも準備を保有するよう誘導した。これが量的緩和がハイパーインフレを引き起こさなかった理由を説明する：貨幣は創造されたが流通しなかった。中国の法定準備率は歴史的に米国より高く、2023年は7-8%で、引き下げによる刺激余地を持つ。",
                    "ko": "2008년 금융위기 이후 미국 은행들은 대출 대신 대규모 초과 지급준비금을 보유해 화폐 승수가 이론값에서 붕괴했다. FRB는 2008년부터 초과 지급준비금에 이자를 지불하기 시작해 은행이 대출보다 준비금을 보유하도록 유인했다. 이것이 양적 완화가 초인플레이션을 야기하지 않은 이유를 설명한다: 화폐는 창조되었지만 유통되지 않았다. 중국의 법정 지급준비율은 역사적으로 미국보다 높아 2023년 7~8%로, 인하를 통한 부양 여지를 남겨둔다.",
                    "fr": "Après la crise financière de 2008, les banques américaines ont conservé d'immenses réserves excédentaires plutôt que de prêter — le multiplicateur monétaire s'est effondré par rapport à sa valeur théorique. La Fed a commencé à rémunérer les réserves excédentaires à partir de 2008, incitant les banques à les conserver. Cela explique pourquoi l'assouplissement quantitatif n'a pas causé l'hyperinflation : la monnaie était créée mais pas mise en circulation. La Chine fixe son CRO plus élevé — à 7-8 % en 2023, laissant à la PBOC une marge de stimulation.",
                },
                "exam_tip": {
                    "ja": "貨幣乗数 = 1/RRR。FRBが100億ドルの債券を購入しRRR = 0.1の場合、マネーサプライの最大増加可能額 = 100億 × 10 = 1,000億ドル。実際の増加は超過準備・現金保有のためそれより少ない。APは常に最大可能な変化を計算するよう求める。公式を使い、自由記述では計算過程を示すこと。",
                    "ko": "화폐 승수 = 1/RRR. FRB가 100억 달러의 채권을 매입하고 RRR = 0.1이면, 통화 공급의 최대 잠재적 증가 = 100억 × 10 = 1,000억 달러. 실제 증가는 초과 지급준비금·현금 보유 때문에 더 작다. AP는 항상 최대 가능한 변화를 계산하도록 요구한다. 공식을 사용하고 자유 서술에서 계산 과정을 보여줄 것.",
                    "fr": "Multiplicateur monétaire = 1/CRO. Si la Fed achète 10 milliards d'obligations et CRO = 0,1, l'augmentation maximale = 10 milliards × 10 = 100 milliards. L'augmentation réelle est moindre car les banques conservent des réserves excédentaires et les gens détiennent des liquidités. L'AP demande toujours le maximum possible. Utilisez la formule et montrez votre démarche.",
                },
            },
            {
                "heading": {
                    "ja": "貨幣市場：需要・供給と均衡",
                    "ko": "화폐 시장: 수요, 공급, 균형",
                    "fr": "Le marché monétaire : demande, offre et équilibre",
                },
                "body": {
                    "ja": "貨幣市場は貨幣の需給を示す（流動性選好理論）。貨幣需要（Md）は右下がりだ：利子率が低いほど人々は利付き資産より多くの貨幣を保有しようとする。貨幣保有の3つの動機：取引的動機（日常的な購買のニーズ）、予備的動機（予期せぬ出費へのバッファー）、投機的動機（債券価格下落を予想する場合、利子率と逆相関）。貨幣供給（Ms）は垂直で中央銀行によって管理され利子率には反応しない。均衡利子率はMd = Msの点。FRBがMsを増加させると供給曲線が右シフトして利子率が低下する。",
                    "ko": "화폐 시장은 화폐의 수요와 공급을 보여준다(유동성 선호 이론). 화폐 수요(Md)는 우하향한다: 이자율이 낮을수록 사람들은 이자부 자산보다 화폐를 더 많이 보유하려 한다. 화폐 보유의 3가지 동기: 거래적 동기(일상적 구매 필요), 예비적 동기(예상치 못한 지출에 대한 완충), 투기적 동기(채권 가격 하락 예상 시, 이자율과 역상관). 화폐 공급(Ms)은 수직으로 중앙은행이 통제하며 이자율에 반응하지 않는다. 균형 이자율은 Md = Ms인 점. FRB가 Ms를 늘리면 공급 곡선이 오른쪽 이동해 이자율이 하락한다.",
                    "fr": "Le marché monétaire montre l'offre et la demande de monnaie (théorie de la préférence pour la liquidité). La demande de monnaie (Dm) est décroissante : quand le taux d'intérêt est plus bas, les gens souhaitent détenir plus de monnaie. Trois motifs : transaction (achats quotidiens), précaution (dépenses imprévues), et spéculation (anticipation de baisse des obligations, lié inversement aux taux). L'offre de monnaie (Om) est verticale — contrôlée par la banque centrale, non sensible aux taux. Taux d'équilibre : là où Dm = Om. Si la Fed augmente Om, la courbe d'offre se déplace vers la droite, le taux baisse.",
                },
                "real_world": {
                    "ja": "FRBは2022年3月から2023年7月にかけてフェデラルファンド金利を0.25%から5.5%に引き上げた。これは公開市場での債券売却によって達成された。貨幣市場ダイアグラムで言えばMsが左シフトして利子率が上昇。高い借入コストが住宅市場（住宅ローン金利7-8%）を冷やし企業投資を減らし、最終的にインフレを9.1%から約3%に引き下げた。",
                    "ko": "FRB는 2022년 3월부터 2023년 7월까지 연방기금 금리를 0.25%에서 5.5%로 인상했다. 이는 공개시장에서의 채권 매각을 통해 달성되었다. 화폐 시장 다이어그램으로는 Ms가 왼쪽 이동해 이자율 상승. 높은 차입 비용이 주택 시장(주택담보대출 7~8%)을 냉각시키고 기업 투자를 줄여 최종적으로 인플레이션을 9.1%에서 약 3%로 낮췄다.",
                    "fr": "La Fed a relevé le taux des fonds fédéraux de 0,25 % à 5,5 % entre mars 2022 et juillet 2023, via des ventes d'obligations. Sur le diagramme : Om se déplace vers la gauche, taux monte. Des coûts d'emprunt plus élevés ont ralenti l'immobilier (taux hypothécaires 7-8 %), réduit l'investissement, et ramené l'inflation de 9,1 % à environ 3 %.",
                },
                "exam_tip": {
                    "ja": "貨幣市場ダイアグラム：縦のMsと右下がりのMd。縦軸に利子率、横軸に貨幣量。公開市場購入：Ms右シフト・利子率低下。公開市場売却：Ms左シフト・利子率上昇。AP重要：貨幣市場→利子率→投資→ADシフトという完全な伝達経路を常に追うこと。",
                    "ko": "화폐 시장 다이어그램: 수직의 Ms와 우하향하는 Md. 세로축에 이자율, 가로축에 화폐량. 공개시장 매입: Ms 오른쪽 이동·이자율 하락. 공개시장 매각: Ms 왼쪽 이동·이자율 상승. AP 중요: 화폐 시장→이자율→투자→AD 이동이라는 완전한 전달 경로를 항상 추적할 것.",
                    "fr": "Diagramme du marché monétaire : Om verticale et Dm décroissante. Taux d'intérêt en ordonnée, quantité de monnaie en abscisse. Achat en open market : Om droite, taux baisse. Vente : Om gauche, taux monte. Clé AP : tracez toujours la chaîne complète marché monétaire → taux d'intérêt → investissement → déplacement de la DA.",
                },
            },
            {
                "heading": {
                    "ja": "貸付資金市場",
                    "ko": "대출 가능 자금 시장",
                    "fr": "Le marché des fonds prêtables",
                },
                "body": {
                    "ja": "貸付資金市場は実質利子率が貯蓄（供給）と借入（需要）をどのように均衡させるかを示す。貸付資金の供給 = 家計貯蓄 + 政府貯蓄（財政黒字）+ 外国貯蓄（資本流入）。需要 = 民間投資 + 政府借入（財政赤字）。政府赤字の増加は需要を右シフトして実質利子率を上昇させ、民間投資をクラウドアウトする。家計貯蓄増加は供給を右シフトして実質利子率を下げ投資を刺激する。貸付資金市場は実質利子率、貨幣市場は名目利子率を用いる点で異なる。",
                    "ko": "대출 가능 자금 시장은 실질 이자율이 저축(공급)과 차입(수요)을 어떻게 균형시키는지를 보여준다. 공급 = 가계 저축 + 정부 저축(재정 흑자) + 외국 저축(자본 유입). 수요 = 민간 투자 + 정부 차입(재정 적자). 정부 적자 증가는 수요를 오른쪽으로 이동시켜 실질 이자율을 높이고 민간 투자를 구축한다. 가계 저축 증가는 공급을 오른쪽으로 이동시켜 실질 이자율을 낮추고 투자를 촉진한다. 대출 가능 자금 시장은 실질 이자율, 화폐 시장은 명목 이자율을 사용한다.",
                    "fr": "Le marché des fonds prêtables montre comment le taux d'intérêt réel équilibre l'épargne (offre) et l'emprunt (demande). Offre = épargne des ménages + épargne publique (excédent) + épargne étrangère (entrées de capitaux). Demande = investissement privé + emprunts publics (déficit). Un déficit public accru déplace la demande vers la droite, augmentant le taux réel et évincant l'investissement privé. Une épargne des ménages accrue déplace l'offre vers la droite, abaissant le taux et stimulant l'investissement. Différence clé : fonds prêtables = taux réel ; marché monétaire = taux nominal.",
                },
                "real_world": {
                    "ja": "米国は2023年度に1.7兆ドルの財政赤字を計上し利用可能な貸付資金の大半を吸収した。このクラウディングアウト効果が長期利子率の上昇（10年物米国債利回りが2021年1.5%から2023年末5%超）に寄与した。一方、日本はGDPの250%を超える政府債務にもかかわらず、高い家計貯蓄率が貸付資金供給を豊富に保ったためゼロ金利近辺を維持した。",
                    "ko": "미국은 2023 회계연도에 1.7조 달러의 재정 적자를 기록해 이용 가능한 대출 자금 대부분을 흡수했다. 이 구축 효과가 장기 이자율 상승(10년 만기 국채 수익률이 2021년 1.5%에서 2023년 말 5% 이상)에 기여했다. 반면 일본은 정부 부채가 GDP의 250%를 초과하지만, 높은 가계 저축률이 대출 가능 자금 공급을 풍부하게 유지해 저금리를 유지했다.",
                    "fr": "Le gouvernement américain a enregistré un déficit de 1 700 milliards en 2023, absorbant une part massive des fonds prêtables. Cet effet d'éviction a contribué à la hausse des taux longs — le taux à 10 ans passant de 1,5 % en 2021 à plus de 5 % fin 2023. Le Japon, malgré une dette à 250 % du PIB, maintient des taux proches de zéro grâce au taux d'épargne élevé des ménages qui maintient l'offre de fonds abondante.",
                },
                "exam_tip": {
                    "ja": "APでは貸付資金市場と貨幣市場が同じ問題で問われることが多い。覚えておくこと：貸付資金市場 = 実質金利（貯蓄・投資フロー）、貨幣市場 = 名目金利（FRB政策・貨幣需要）。フィッシャー方程式：実質 = 名目 - 期待インフレ。FRBが期待インフレより速く名目金利を上げると実質金利が上昇し民間投資のクラウドアウトが強まる。",
                    "ko": "AP에서는 대출 가능 자금 시장과 화폐 시장이 같은 문제에서 자주 함께 출제된다. 기억: 대출 가능 자금 시장 = 실질 금리(저축·투자 흐름), 화폐 시장 = 명목 금리(FRB 정책·화폐 수요). 피셔 방정식: 실질 = 명목 - 기대 인플레이션. FRB가 기대 인플레이션보다 빠르게 명목 금리를 올리면 실질 금리가 상승해 민간 투자 구축이 강해진다.",
                    "fr": "L'AP teste souvent les fonds prêtables et le marché monétaire ensemble. Rappel : fonds prêtables = taux réel (flux d'épargne/investissement) ; marché monétaire = taux nominal (politique Fed, demande de monnaie). Équation de Fisher : réel = nominal moins inflation anticipée. Si la Fed relève les taux nominaux plus vite que les anticipations, les taux réels augmentent, évincant davantage l'investissement privé.",
                },
            },
            {
                "heading": {
                    "ja": "FRBの政策手段と金融政策",
                    "ko": "연방준비제도 수단과 통화 정책",
                    "fr": "Les instruments de la Fed et la politique monétaire",
                },
                "body": {
                    "ja": "FRBの3つの主要な手段：(1)公開市場操作（最重要）。銀行から国債を購入すると準備が増えマネーサプライが拡大し利子率が低下（拡張的）。債券売却で準備を引き出しマネーサプライが縮小し利子率が上昇（引き締め的）。(2)公定歩合（FRBから直接借り入れる銀行への貸出金利）。引き下げると銀行借入が増えマネーサプライが拡大。(3)法定準備率（引き上げると貨幣乗数が低下しマネーサプライが縮小。現在はほとんど使用されない）。量的緩和（QE）：フェデラルファンド金利がゼロ下限に達した場合に使用する通常のOMOを超えた大規模な債券購入。",
                    "ko": "FRB의 3가지 주요 수단: (1) 공개시장 조작(가장 중요). 은행으로부터 국채 매입 시 지급준비금 증가·통화 공급 확대·이자율 하락(확장적). 채권 매각 시 지급준비금 회수·통화 공급 축소·이자율 상승(긴축적). (2) 재할인율(FRB에서 직접 차입하는 은행에 부과하는 금리). 인하 시 은행 차입 증가·통화 공급 확대. (3) 법정 지급준비율(인상 시 화폐 승수 감소·통화 공급 축소. 현재 거의 사용 안 됨). 양적 완화(QE): 연방기금 금리가 제로 하한에 도달할 때 사용하는 일반 OMO를 넘어선 대규모 채권 매입.",
                    "fr": "Les trois principaux instruments de la Fed : (1) Opérations d'open market (le plus important). Acheter des obligations aux banques augmente les réserves, élargit la masse monétaire, abaisse les taux (expansionniste). Vendre des obligations retire des réserves, contracte la masse monétaire, augmente les taux (contractionniste). (2) Taux d'escompte (taux facturé aux banques empruntant directement auprès de la Fed). Le baisser encourage les banques à emprunter davantage. (3) Réserves obligatoires (augmenter le CRO réduit le multiplicateur ; rarement utilisé). Assouplissement quantitatif (QE) : achats d'obligations à grande échelle quand le taux des fonds fédéraux atteint la borne zéro.",
                },
                "real_world": {
                    "ja": "FRBは4回のQE（2008-2022年）でバランスシートを9,000億から9兆ドルに拡大した。住宅ローン担保証券や国債の購入によって長期金利を1%以下に押し下げ、住宅市場・株価を支援した。その後の量的引き締め（2022年以降）がバランスシートを縮小し長期金利の上昇に寄与した。PBOCはFRBより幅広い手段を持ち、法定準備率・貸出金利を調整しMLF・PSLなど目標型融資プログラムで特定セクターへの信用を誘導する。",
                    "ko": "FRB는 4차례 QE(2008~2022년)로 대차대조표를 9,000억 달러에서 9조 달러로 확대했다. 주택담보부증권과 국채 매입으로 장기 금리를 1% 미만으로 낮춰 주택 시장·주가를 지지했다. 이후 양적 긴축(2022년 이후)이 대차대조표를 줄이고 장기 금리 상승에 기여했다. 중국 인민은행은 더 광범위한 수단을 보유해 법정 지급준비율·대출 금리를 조정하고 MLF·PSL 등으로 특정 부문에 신용을 유도한다.",
                    "fr": "La Fed a conduit quatre rounds de QE (2008-2022), élargissant son bilan de 900 milliards à 9 000 milliards. En achetant MBS et Treasuries, elle a poussé les taux longs sous 1 %, soutenant l'immobilier et les marchés boursiers. Le resserrement quantitatif (2022-présent) a réduit le bilan. La PBOC dispose d'une boîte à outils plus large : elle ajuste le CRO, les taux de prêt, et utilise des programmes ciblés (MLF, PSL) pour orienter le crédit.",
                },
                "exam_tip": {
                    "ja": "金融政策の完全な波及経路：FRBが債券購入（OMO）→銀行準備増加→マネーサプライ増加→利子率低下（貨幣市場）→投資・消費増加→ADが右シフト→産出量上昇・物価水準上昇。引き締め的の場合はすべての矢印を逆にする。APの自由記述ではこの完全なチェーンが要求される。部分的なチェーンは失点になる。また拡張的金融政策はゼロ下限では制限される（特別な手段なしには金利をゼロ以下にできない）。",
                    "ko": "통화 정책의 완전한 파급 경로: FRB가 채권 매입(OMO) → 은행 지급준비금 증가 → 통화 공급 증가 → 이자율 하락(화폐 시장) → 투자·소비 증가 → AD가 오른쪽 이동 → 산출량 상승·물가 수준 상승. 긴축적이면 모든 화살표를 역방향으로. AP 자유 서술에서는 이 완전한 연쇄가 요구되며 부분적 연쇄는 감점된다. 또한 확장적 통화 정책은 제로 하한에서 제한된다.",
                    "fr": "Chaîne de transmission complète : la Fed achète des obligations (OMO) → réserves bancaires augmentent → masse monétaire augmente → taux d'intérêt baissent (marché monétaire) → investissement et consommation augmentent → DA se déplace vers la droite → production et niveau des prix augmentent. Pour une politique contractionniste : inversez toutes les flèches. L'AP exige cette chaîne complète — les chaînes partielles font perdre des points. La politique expansionniste est aussi limitée à la borne zéro.",
                },
            },
        ],
    },

    "ap_5": {
        "title": {
            "ja": "安定化政策の長期的影響",
            "ko": "안정화 정책의 장기적 결과",
            "fr": "Les conséquences à long terme des politiques de stabilisation",
        },
        "sections": [
            {
                "heading": {
                    "ja": "短期フィリップス曲線",
                    "ko": "단기 필립스 곡선",
                    "fr": "La courbe de Phillips à court terme",
                },
                "body": {
                    "ja": "フィリップス曲線はインフレ率と失業率の経験的な逆相関を示す。短期的に政策立案者はトレードオフに直面する：失業を減らす政策（拡張的AD政策）はインフレを高める傾向があり、逆もまた然り。短期フィリップス曲線（SRPC）はSRAS曲線と等価だ。SRPCに沿った動きはAD-ASモデルのSRASに沿った動きに対応する。SRASに沿ったADの右シフトはSRPCを左上（失業低下・インフレ上昇）に動くことに対応する。ADの左シフトは右下（失業上昇・インフレ低下）への動きに対応する。SRPCの傾きは失業変化に対するインフレの反応速度を反映する。",
                    "ko": "필립스 곡선은 인플레이션율과 실업률 사이의 경험적 역상관 관계를 보여준다. 단기적으로 정책 입안자는 상충관계에 직면한다: 실업을 줄이는 정책(확장적 AD 정책)은 인플레이션을 높이는 경향이 있고 그 반대도 마찬가지다. 단기 필립스 곡선(SRPC)은 SRAS 곡선과 동등하다. SRPC를 따른 움직임은 AD-AS 모델의 SRAS를 따른 움직임에 대응한다. SRAS를 따라 AD가 오른쪽으로 이동하면 SRPC는 왼쪽 위(실업 하락·인플레이션 상승)로 이동하는 것에 대응한다. AD가 왼쪽으로 이동하면 오른쪽 아래(실업 상승·인플레이션 하락)로의 이동에 대응한다. SRPC의 기울기는 실업 변화에 대한 인플레이션의 반응 속도를 반영한다.",
                    "fr": "La courbe de Phillips montre une relation inverse empirique entre inflation et chômage. À court terme, les décideurs font face à un arbitrage : les politiques réduisant le chômage (politique de DA expansionniste) ont tendance à augmenter l'inflation, et vice versa. La CPCT est équivalente à la courbe OAS — un mouvement le long de la CPCT correspond à un mouvement le long de l'OAS. Un déplacement de la DA vers la droite le long de l'OAS correspond à un mouvement vers le haut et la gauche sur la CPCT (chômage plus bas, inflation plus élevée). Un déplacement de la DA vers la gauche correspond à un mouvement vers le bas et la droite (chômage plus élevé, inflation plus faible). La pente de la CPCT reflète la vitesse de réponse de l'inflation aux variations du chômage.",
                },
                "real_world": {
                    "ja": "フィリップス曲線の関係は1950-60年代によく機能した。1970年代のスタグフレーションはこれを打ち砕いた：OPECの石油ショック後にインフレと失業率が同時に上昇した。これは安定したSRPCでは起こりえない。SRPCのシフトが必要だ。2022年のFRBの引き締めサイクルはトレードオフを改めて示した：金利引き上げがインフレを9.1%から3%に引き下げたが、失業増加と成長鈍化というコストが伴った。",
                    "ko": "필립스 곡선 관계는 1950~60년대에 잘 작동했다. 1970년대 스태그플레이션이 이를 무너뜨렸다: OPEC 석유 충격 후 인플레이션과 실업률이 동시에 상승. 안정적인 SRPC에서는 불가능하며 SRPC의 이동이 필요하다. 2022년 FRB 긴축 사이클은 상충관계를 다시 보여주었다: 금리 인상으로 인플레이션을 9.1%에서 3%로 낮추었지만, 실업 증가와 성장 둔화라는 비용이 따랐다.",
                    "fr": "La courbe de Phillips a bien fonctionné dans les années 1950-1960. La stagflation des années 1970 l'a brisée : après les chocs pétroliers de l'OPEP, inflation ET chômage ont augmenté simultanément. Cela nécessite un déplacement de la CPCT. Le cycle de resserrement de la Fed en 2022 a de nouveau illustré l'arbitrage : la hausse des taux a réduit l'inflation de 9,1 % à 3 % au prix d'un chômage plus élevé et d'une croissance plus lente.",
                },
                "exam_tip": {
                    "ja": "SRPCとAD-ASは異なる座標系で表した同じモデルだ。SRASに沿った動き = SRPCに沿った動き。SRASのシフト = SRPCのシフト。スタグフレーションには両方のダイアグラムを描くこと：AD-ASではSRASが左シフト（P高・Y低）。SRPCでは等価の状況でSRPCが右シフト（すべての失業率でインフレ上昇）として示される。APはスタグフレーション論述で常に両ダイアグラムを求める。",
                    "ko": "SRPC와 AD-AS는 다른 좌표계로 표현한 같은 모델이다. SRAS를 따른 움직임 = SRPC를 따른 움직임. SRAS의 이동 = SRPC의 이동. 스태그플레이션에 대해서는 두 다이어그램 모두 그릴 것: AD-AS에서 SRAS가 왼쪽 이동(P 높음·Y 낮음). SRPC에서 SRPC가 오른쪽 이동(모든 실업률에서 인플레이션 상승). AP는 스태그플레이션 논의 시 항상 두 다이어그램을 요구한다.",
                    "fr": "La CPCT et le modèle OA-DA sont le même modèle dans des coordonnées différentes. Mouvement le long de l'OAS = mouvement le long de la CPCT. Déplacement de l'OAS = déplacement de la CPCT. Tracez les deux diagrammes pour la stagflation : OA-DA montre l'OAS vers la gauche (P plus élevé, Y plus faible) ; sur la CPCT, la CPCT se déplace vers la droite. L'AP veut toujours les deux.",
                },
            },
            {
                "heading": {
                    "ja": "長期フィリップス曲線・NAIRUと期待",
                    "ko": "장기 필립스 곡선, NAIRU, 기대",
                    "fr": "La courbe de Phillips à long terme, le NAIRU et les anticipations",
                },
                "body": {
                    "ja": "長期フィリップス曲線（LRPC）は自然失業率（NAIRU）において垂直だ。長期的にはインフレと失業のトレードオフは存在しない。失業をNAIRUより恒常的に低く維持しようとすれば加速インフレを招く。適応的期待：労働者は将来のインフレが過去のインフレと同じと予想する。実際インフレが期待を上回ると、労働者は一時的に騙され失業がNAIRUを一時的に下回る。労働者が期待を更新すると高賃金を要求しSRASが左シフトして、より高いインフレ率でNAIRUに戻る。スタグフレーション（SRPCの右シフト）はインフレ期待の上昇や供給ショックによるコスト増加時に発生する。",
                    "ko": "장기 필립스 곡선(LRPC)은 자연실업률(NAIRU)에서 수직이다. 장기적으로는 인플레이션과 실업 사이에 상충관계가 없다. 실업을 NAIRU 아래로 영구적으로 유지하려는 모든 시도는 인플레이션 가속을 초래한다. 적응적 기대: 노동자들은 미래 인플레이션이 과거와 같을 것이라고 기대한다. 실제 인플레이션이 기대를 초과하면 노동자들은 일시적으로 속아 실업이 NAIRU 아래로 떨어진다. 노동자들이 기대를 업데이트하면 더 높은 임금을 요구하고 SRAS가 왼쪽으로 이동해 더 높은 인플레이션율에서 NAIRU로 돌아간다. 스태그플레이션(SRPC 오른쪽 이동)은 인플레이션 기대 상승이나 공급 충격으로 인한 비용 증가 시 발생한다.",
                    "fr": "La CPLT est verticale au NAIRU. À long terme, il n'y a pas d'arbitrage inflation-chômage : maintenir le chômage sous le taux naturel provoque une inflation accélérée. Anticipations adaptatives : les travailleurs anticipent que l'inflation future égale l'inflation passée. Si l'inflation réelle dépasse l'anticipée, les travailleurs sont temporairement trompés et le chômage tombe sous le NAIRU. Une fois les anticipations révisées, ils exigent des salaires plus élevés, l'OAS se déplace à gauche, et le chômage revient au NAIRU avec une inflation plus élevée. La stagflation (CPCT vers la droite) survient quand les anticipations d'inflation augmentent ou que les chocs d'offre augmentent les coûts.",
                },
                "real_world": {
                    "ja": "ボルカーのデフレ（1979-1983年）はLRPCを実際に示す。FRB議長ボルカーはインフレ期待を断ち切るためフェデラルファンド金利を20%に引き上げた。失業率はSRPCに沿って10.8%に急上昇した。インフレ期待が低下するとSRPCが左シフトし、より低いインフレで低い失業が実現した。短期のコストは深刻な景気後退だったが、長期成果は1980-90年代の強い成長を可能にした物価安定だった。",
                    "ko": "볼커의 디스인플레이션(1979~1983년)은 LRPC를 실제로 보여준다. FRB 의장 볼커는 인플레이션 기대를 꺾기 위해 연방기금 금리를 20%로 인상했다. 실업률이 SRPC를 따라 10.8%로 급등했다. 인플레이션 기대가 하락하자 SRPC가 왼쪽으로 이동해 더 낮은 인플레이션에서 낮은 실업이 실현되었다. 단기 비용은 심각한 경기침체였지만 장기 성과는 1980~90년대의 강한 성장을 가능하게 한 물가 안정이었다.",
                    "fr": "La désinflation Volcker (1979-1983) illustre la CPLT. Le président de la Fed a relevé le taux à 20 % pour briser les anticipations d'inflation. Le chômage a grimpé à 10,8 % le long de la CPCT. Une fois les anticipations réduites, la CPCT s'est déplacée vers la gauche, permettant une inflation plus faible avec un chômage plus faible. Le coût à court terme était une récession sévère ; le gain à long terme était la stabilité des prix qui a permis la forte croissance des années 1980-1990.",
                },
                "exam_tip": {
                    "ja": "APの典型問題：経済はNAIRUで2%インフレにある。政府が拡張的財政政策を実施する。AD-ASとフィリップス曲線の両ダイアグラムを使って短期・長期の影響を追跡せよ。短期：ADが右シフト・産出量が潜在を超え・失業がNAIRUを下回り・インフレが2%超に上昇。長期：インフレ期待が調整されSRASが左シフト・SRPCが右シフト・経済がより高いインフレでNAIRUに戻る。満点には4つすべてのダイアグラムが必要。",
                    "ko": "AP 전형적 문제: 경제가 NAIRU에서 2% 인플레이션 상태. 정부가 확장적 재정 정책 시행. AD-AS와 필립스 곡선 두 다이어그램을 사용해 단기와 장기 효과를 추적하라. 단기: AD 오른쪽 이동·산출량이 잠재 초과·실업이 NAIRU 아래·인플레이션이 2% 초과. 장기: 인플레이션 기대 조정→SRAS 왼쪽 이동·SRPC 오른쪽 이동·더 높은 인플레이션에서 NAIRU로 복귀. 만점에는 4개 다이어그램 모두 필요.",
                    "fr": "Question type AP : l'économie est au NAIRU avec 2 % d'inflation. Le gouvernement mène une politique expansionniste. Tracez les effets CT et LT avec les deux diagrammes. CT : DA droite, production > potentiel, chômage < NAIRU, inflation > 2 %. LT : anticipations s'ajustent, OAS gauche, CPCT droite, économie revient au NAIRU avec inflation plus élevée. Quatre diagrammes pour les points complets.",
                },
            },
            {
                "heading": {
                    "ja": "インフレーション・債務と財政持続可能性",
                    "ko": "인플레이션, 부채, 재정 지속 가능성",
                    "fr": "Inflation, dette et soutenabilité budgétaire",
                },
                "body": {
                    "ja": "継続的な財政赤字は国家債務を積み上げる。GDP比債務残高は財政持続可能性を測り、基礎的財政赤字が経済が維持可能な利払いを超えるとき、またはGDP成長率が債務利子率より低いときに上昇する。高い債務水準は民間投資のクラウドアウト、将来の景気後退における政策柔軟性の喪失、債務危機のリスクをもたらす。しかし景気後退時の赤字は乗数効果を通じて自己資金を賄う場合がある（GDP上昇が債務比率を下げる）。債務のマネタイゼーション（中央銀行が国債を購入）はインフレを引き起こしうる。リカードの等価定理：将来の増税を予想した納税者が今日の貯蓄を増やすなら、財政政策の刺激効果は相殺される。",
                    "ko": "지속적인 재정 적자는 국가 부채를 축적시킨다. GDP 대비 부채 비율은 재정 지속 가능성을 측정하며, 기초 재정 적자가 경제의 지속 가능한 이자 지불을 초과하거나 GDP 성장률이 채무 이자율보다 낮을 때 상승한다. 높은 부채 수준은 민간 투자 구축, 미래 경기침체 시 정책 유연성 손실, 채무 위기 위험을 초래한다. 그러나 경기침체 시 적자는 승수 효과를 통해 자기 자금을 조달할 수도 있다. 채무의 화폐화(중앙은행이 국채 매입)는 인플레이션을 야기할 수 있다. 리카도의 등가 정리: 미래 증세를 예상한 납세자가 오늘 더 저축한다면 재정 정책의 부양 효과는 상쇄된다.",
                    "fr": "Des déficits persistants accumulent la dette nationale. Le ratio dette/PIB mesure la soutenabilité : il augmente quand le déficit primaire dépasse les paiements d'intérêts soutenables, ou quand la croissance du PIB est inférieure au taux d'intérêt sur la dette. Une dette élevée peut évincer l'investissement privé, réduire la marge budgétaire future, et potentiellement déclencher des crises. Les déficits lors des récessions peuvent toutefois être autofinancés par l'effet multiplicateur. Monétiser la dette peut provoquer de l'inflation. Équivalence ricardienne : si les contribuables anticipent de futures hausses d'impôts et épargnent davantage aujourd'hui, l'effet de relance est annulé.",
                },
                "real_world": {
                    "ja": "2023年に米国国家債務は33兆ドルを超え、GDP比債務残高は120%以上。年間利払い費は1兆ドルを突破して連邦予算最大の支出項目となった。日本はGDPの250%を超える政府債務にもかかわらず、高い家計貯蓄率のおかげで低金利を維持している。ギリシャの2010-2012年の債務危機は、債券市場の信頼喪失が利子率急騰・景気後退を深める緊縮・債務スパイラルを招くリスクを示している。",
                    "ko": "2023년 미국 국가 부채는 33조 달러를 초과해 GDP 대비 120% 이상. 연간 이자 지급이 1조 달러를 돌파해 연방 예산 최대 지출 항목이 되었다. 일본은 정부 부채가 GDP의 250%를 초과하지만 높은 가계 저축률 덕분에 저금리를 유지한다. 그리스의 2010~2012년 채무 위기는 채권 시장 신뢰 상실이 금리 급등·긴축·채무 나선을 초래하는 위험을 보여준다.",
                    "fr": "La dette nationale américaine a dépassé 33 000 milliards en 2023, ratio dette/PIB supérieur à 120 %. Les paiements d'intérêts annuels dépassent 1 000 milliards — le plus gros poste budgétaire. Le Japon maintient des taux proches de zéro malgré 250 % du PIB de dette, grâce à l'épargne élevée des ménages. La crise grecque de 2010-2012 illustre les risques : perte de confiance des marchés → taux explosent → austérité qui approfondit la récession — une spirale de la dette.",
                },
                "exam_tip": {
                    "ja": "APは赤字の長期的結果を問う：実質利子率の上昇（貸付資金市場で需要が右シフト）、民間投資のクラウドアウト、債務マネタイゼーション時の潜在的インフレ、将来の財政スペース縮小。貸付資金市場ダイアグラムと結びつけること：政府赤字→貸付資金需要増加→需要右シフト→実質利子率上昇→民間投資減少。これがクラウディングアウトのメカニズムだ。",
                    "ko": "AP는 적자의 장기적 결과를 묻는다: 실질 이자율 상승(대출 가능 자금 시장에서 수요 오른쪽 이동), 민간 투자 구축, 채무 화폐화 시 잠재적 인플레이션, 미래 재정 여지 축소. 대출 가능 자금 시장 다이어그램과 연결: 정부 적자→대출 가능 자금 수요 증가→수요 오른쪽 이동→실질 이자율 상승→민간 투자 감소. 이것이 구축 메커니즘이다.",
                    "fr": "L'AP interroge sur les conséquences à long terme des déficits : hausse des taux réels (demande de fonds prêtables vers la droite), éviction de l'investissement privé, inflation potentielle si monétisation, réduction de la marge budgétaire future. Reliez au diagramme des fonds prêtables : déficit public → demande accrue → demande vers la droite → taux réel en hausse → investissement privé en baisse. C'est le mécanisme d'éviction.",
                },
            },
            {
                "heading": {
                    "ja": "長期経済成長：源泉と政策",
                    "ko": "장기 경제 성장: 원천과 정책",
                    "fr": "La croissance économique à long terme : sources et politiques",
                },
                "body": {
                    "ja": "長期的な経済成長はLRASの右シフト（またはPPCの外側へのシフト）で表される。成長の源泉：(1)物的資本の増加（機械・インフラへの投資）、(2)人的資本の改善（教育・健康・訓練）、(3)技術進歩（最も重要な長期的原動力）、(4)制度の質（財産権・法の支配・金融市場）。サプライサイド政策は潜在産出量を高める：投資税額控除・R&D補助金・教育資金・移民改革・規制緩和。1人当たり実質GDPの長期的成長率の差が生活水準を決定する。成長率のわずかな差は複利で長期にわたって劇的に拡大する。",
                    "ko": "장기 경제 성장은 LRAS의 오른쪽 이동(또는 PPC의 외부 이동)으로 나타낸다. 성장의 원천: (1) 물적 자본 증가(기계·인프라 투자), (2) 인적 자본 개선(교육·보건·훈련), (3) 기술 진보(가장 중요한 장기 동력), (4) 제도의 질(재산권·법의 지배·금융 시장). 공급측 정책은 잠재 산출량을 높인다: 투자 세액 공제·R&D 보조금·교육 자금·이민 개혁·규제 완화. 1인당 실질 GDP의 장기 성장률 차이가 생활 수준을 결정한다. 성장률의 작은 차이는 복리로 수십 년에 걸쳐 극적으로 확대된다.",
                    "fr": "La croissance à long terme se représente par un déplacement de l'OAL vers la droite. Sources : (1) plus de capital physique (investissement en machines, infrastructures), (2) amélioration du capital humain (éducation, santé, formation), (3) progrès technologique (le moteur le plus important), et (4) qualité institutionnelle (droits de propriété, état de droit, marchés financiers). Les politiques d'offre visent à accroître la production potentielle : crédits d'impôt à l'investissement, subventions à la R&D, financement de l'éducation, réforme de l'immigration, déréglementation. De petites différences de taux de croissance se composent de façon spectaculaire sur des décennies.",
                },
                "real_world": {
                    "ja": "韓国の1人当たりGDPは1960年の100ドルから現在の33,000ドル以上に上昇した。教育への大規模投資・輸出志向型工業化・インフラ整備によって330倍の増加を達成した。米国は20世紀の大半で年平均2%の1人当たり実質GDP成長率を維持した。70の法則：2%成長では35年で生活水準が倍増、1%では70年かかる。この複利効果がなぜわずかな成長率差が長期的繁栄に著しく影響するかを説明する。",
                    "ko": "한국의 1인당 GDP는 1960년 100달러에서 현재 33,000달러 이상으로 상승했다. 교육 대규모 투자·수출 지향 산업화·인프라 정비를 통해 330배 증가를 달성했다. 미국은 20세기 대부분 연평균 2%의 1인당 실질 GDP 성장률을 유지했다. 70의 법칙: 2% 성장에서는 35년마다 생활 수준이 두 배, 1%에서는 70년이 걸린다. 이 복리 효과가 왜 작은 성장률 차이가 장기적 번영에 현저히 영향을 미치는지 설명한다.",
                    "fr": "Le PIB par habitant de la Corée du Sud est passé de 100 dollars en 1960 à plus de 33 000 dollars aujourd'hui — une multiplication par 330. Les États-Unis ont réalisé 2 % de croissance annuelle du PIB réel par habitant pendant la majeure partie du XXe siècle. La règle des 70 : à 2 % de croissance, le niveau de vie double tous les 35 ans ; à 1 %, il faut 70 ans. Cet effet de capitalisation explique pourquoi de petites différences de taux importent énormément à long terme.",
                },
                "exam_tip": {
                    "ja": "サプライサイド政策はインフレを引き起こさずにLRASを右にシフトさせる（需要サイド政策とは異なる）。APはこの区別を問う：投資を刺激する減税はLRASを右シフト（サプライサイド効果）するが、ADも右シフトさせる（需要サイド効果）。正味の結果はどちらが支配するかによる。長期的にはサプライサイドの改善のみが潜在産出量を高められる。LRASが右シフトし物価水準が変わらない純粋なサプライサイド成長を描くこと。",
                    "ko": "공급측 정책은 인플레이션을 야기하지 않고 LRAS를 오른쪽으로 이동시킨다(수요 측 정책과 다름). AP는 이 구별을 묻는다: 투자를 촉진하는 감세는 LRAS를 오른쪽 이동(공급측 효과)시키지만 AD도 오른쪽으로 이동(수요측 효과)시킨다. 순효과는 어느 효과가 지배하느냐에 달려 있다. 장기적으로는 공급측 개선만이 잠재 산출량을 높일 수 있다. LRAS가 오른쪽으로 이동하고 물가 수준은 변하지 않는 순수 공급측 성장을 그릴 것.",
                    "fr": "Les politiques d'offre déplacent l'OAL vers la droite sans provoquer d'inflation. L'AP teste cette distinction : une réduction d'impôts stimulant l'investissement déplace l'OAL vers la droite (effet offre) mais aussi la DA (effet demande). Le résultat net dépend de l'effet dominant. À long terme, seules les améliorations de l'offre peuvent augmenter la production potentielle. Tracez l'OAL vers la droite avec un niveau de prix inchangé pour la croissance par l'offre pure.",
                },
            },
        ],
    },

    "ap_6": {
        "title": {
            "ja": "開放経済：国際貿易と国際金融",
            "ko": "개방 경제: 국제무역과 국제금융",
            "fr": "L'économie ouverte : commerce international et finance internationale",
        },
        "sections": [
            {
                "heading": {
                    "ja": "国際収支：勘定と恒等式",
                    "ko": "국제수지: 계정과 항등식",
                    "fr": "La balance des paiements : comptes et identité",
                },
                "body": {
                    "ja": "国際収支（BoP）は、一定期間における一国と世界の間のすべての経済取引を記録する。経常勘定：財の貿易（商品貿易収支）・サービス・第一次所得（賃金・投資収益）・第二次所得（送金・対外援助）。資本・金融勘定：外国直接投資・証券投資・準備資産。基本的な恒等式：経常勘定 + 資本・金融勘定 = 0。経常収支赤字は同額の資本勘定黒字（純資本流入）によって賄われなければならない。経常収支黒字は資本流出と見合う。BoP全体の赤字という概念は存在しない。不均衡はその下位勘定にのみ存在する。",
                    "ko": "국제수지(BoP)는 일정 기간 동안 한 국가와 세계 사이의 모든 경제 거래를 기록한다. 경상 계정: 재화 무역(상품 무역 수지)·서비스·제1차 소득(임금·투자 수익)·제2차 소득(송금·대외 원조). 자본·금융 계정: 외국인 직접 투자·증권 투자·준비 자산. 기본 항등식: 경상 계정 + 자본·금융 계정 = 0. 경상수지 적자는 동일한 금액의 자본 계정 흑자(순자본 유입)로 충당되어야 한다. 경상수지 흑자는 자본 유출과 대응한다. BoP 전체의 적자라는 개념은 존재하지 않는다.",
                    "fr": "La balance des paiements (BdP) enregistre toutes les transactions économiques entre un pays et le reste du monde. Compte courant : commerce de biens (balance commerciale), services, revenus primaires (salaires, revenus d'investissement), et revenus secondaires (remises, aide étrangère). Compte de capital et financier : IDE, investissements de portefeuille, réserves. Identité fondamentale : compte courant + compte de capital = 0. Un déficit courant doit être financé par un surplus équivalent du compte de capital. Il n'existe pas de déficit global de la BdP.",
                },
                "real_world": {
                    "ja": "米国は2023年に約9,000億ドル（GDP比約3.3%）の経常収支赤字を記録した。これは資本流入によって賄われた：外国人（特に中国・日本・産油国）が米国債などの資産を購入した。中国は一貫して経常収支黒字を計上し資本勘定の流出と見合う。BoP恒等式は定義上成立する：米国が海外から借りるもの（資本流入）は海外で稼ぐより多く支出するもの（経常赤字）と厳密に一致する。",
                    "ko": "미국은 2023년 약 9,000억 달러(GDP 대비 약 3.3%)의 경상수지 적자를 기록했다. 이는 자본 유입(외국인이 미국 국채 등 자산 매입)으로 충당되었다. 중국은 일관되게 경상수지 흑자를 기록하며 자본 계정 유출과 대응한다. BoP 항등식은 정의상 성립한다: 미국이 해외에서 차입하는 것(자본 유입)은 경상 적자와 정확히 일치한다.",
                    "fr": "Les États-Unis ont enregistré un déficit courant d'environ 900 milliards en 2023 (environ 3,3 % du PIB), financé par des entrées de capitaux : des étrangers ont acheté des bons du Trésor américains. La Chine enregistre systématiquement un excédent courant compensé par des sorties de capitaux. L'identité de la BdP est vraie par définition : ce que les États-Unis empruntent à l'étranger correspond exactement à leur déficit courant.",
                },
                "exam_tip": {
                    "ja": "APは常にBoP恒等式を問う。経常収支がX億ドルの赤字なら、資本勘定はX億ドルの黒字でなければならない。重要な政策的含意：構造的な経常収支赤字は貯蓄・投資バランスを変えなければ縮小できない。財政緊縮（国内貯蓄増加）または外国資本流入を減らす政策が経常赤字を解消する。関税だけでは構造的経常赤字を解消できない可能性が高い。",
                    "ko": "AP는 항상 BoP 항등식을 시험한다. 경상 계정이 X억 달러 적자면 자본 계정은 X억 달러 흑자여야 한다. 중요한 정책적 함의: 구조적 경상수지 적자는 저축·투자 균형을 바꾸지 않고는 줄일 수 없다. 재정 긴축(국내 저축 증가) 또는 외국 자본 유입을 줄이는 정책이 경상 적자를 해소한다. 관세만으로는 구조적 경상수지 적자를 해소하기 어렵다.",
                    "fr": "L'AP teste toujours l'identité de la BdP. Si le compte courant est déficitaire de X milliards, le compte de capital doit être excédentaire de X milliards. Implication clé : un pays ne peut pas réduire son déficit courant sans modifier l'équilibre épargne-investissement. Les seuls tarifs douaniers sont peu susceptibles de corriger un déficit structurel.",
                },
            },
            {
                "heading": {
                    "ja": "外国為替市場",
                    "ko": "외환 시장",
                    "fr": "Le marché des changes",
                },
                "body": {
                    "ja": "外国為替（外為）市場は通貨の需要と供給を通じて為替レートを決定する。ある通貨（例：ドル）への需要は米国の財・サービス・資産を購入したい外国人から来る。ドルの供給は外国の財・サービス・資産を購入したい米国人から来る。為替レートはある通貨の別通貨建て価格。通貨高（増価）：その通貨が多くの外貨を買える（需要増加）。通貨安（減価）：少ししか買えない（供給増または需要減）。通貨増価の要因：国内金利の上昇・経済成長強化・海外インフレ上昇・輸出需要増加・投機。実質為替レートは名目レートを相対的な物価水準で調整する。",
                    "ko": "외환 시장은 통화의 수요와 공급을 통해 환율을 결정한다. 어떤 통화(예: 달러)에 대한 수요는 미국 재화·서비스·자산을 구입하려는 외국인에게서 나온다. 달러 공급은 외국 재화·서비스·자산을 구입하려는 미국인에게서 나온다. 환율은 한 통화의 다른 통화 기준 가격. 통화 강세(절상): 더 많은 외화를 살 수 있다(수요 증가). 통화 약세(절하): 더 적게 살 수 있다(공급 증가 또는 수요 감소). 통화 절상의 요인: 국내 금리 상승·경제 성장 강화·해외 인플레이션 상승·수출 수요 증가·투기. 실질 환율은 명목 환율을 상대적 물가 수준으로 조정한다.",
                    "fr": "Le marché des changes détermine les taux de change par l'offre et la demande de devises. La demande d'une devise (ex. : dollars) vient des étrangers qui veulent acheter des biens, services et actifs américains. L'offre de dollars vient des Américains qui veulent acheter des biens, services et actifs étrangers. Taux de change : le prix d'une devise en termes d'une autre. Appréciation : la devise achète plus de devises étrangères (demande en hausse). Dépréciation : elle achète moins (offre en hausse ou demande en baisse). Facteurs d'appréciation : taux d'intérêt plus élevés, croissance économique plus forte, inflation plus élevée à l'étranger, demande d'exportations accrue, spéculation. Le taux de change réel ajuste le taux nominal pour les niveaux de prix relatifs.",
                },
                "real_world": {
                    "ja": "FRBが2022-23年に積極的に金利を引き上げると、米ドルはほとんどの通貨に対して急上昇し、DXYドル指数が20年ぶりの高値をつけた。より高い米国金利が資本流入を引き付けた（ドル需要増加）。これは新興市場国に打撃を与えた：ドル建て債務の返済負担が増し、資本が途上国から米国に流出した。人民元はドルに対して6.3から7.3に減価した。金利格差が資本をドル資産に向かわせたためだ。",
                    "ko": "FRB가 2022~2023년 공격적으로 금리를 인상하자 미국 달러는 대부분의 통화에 대해 급등해 DXY 달러 지수가 20년 만의 최고치를 기록했다. 더 높은 미국 금리가 자본 유입을 유인(달러 수요 증가)했다. 이는 신흥 시장국에 타격을 주었다: 달러 표시 부채 상환 부담이 늘고 자본이 개발도상국에서 미국으로 유출되었다. 위안화는 달러 대비 6.3에서 7.3으로 절하되었다.",
                    "fr": "Quand la Fed a relevé ses taux en 2022-2023, le dollar s'est fortement apprécié — l'indice DXY a atteint son plus haut niveau en 20 ans. Des taux américains plus élevés ont attiré des entrées de capitaux. Cela a nui aux économies émergentes : la dette en dollars est devenue plus coûteuse et les capitaux ont fui vers les États-Unis. Le RMB s'est déprécié de 6,3 à 7,3 contre le dollar.",
                },
                "exam_tip": {
                    "ja": "APの外為市場問題：特定通貨（例：USD）の需給を描く。FRBが金利を引き上げる場合：ドル需要増加（外国人が米国資産を欲しがる）かつドル供給減少（米国人が国内リターンが高いため外国資産を少ししか買わない）。両効果がドル増価をもたらす。両曲線のシフトを描き、より高い均衡為替レートの新均衡を示す。縦軸に示す通貨を必ず指定すること。",
                    "ko": "AP 외환 시장 문제: 특정 통화(예: USD)의 수요와 공급을 그린다. FRB가 금리를 인상할 경우: 달러 수요 증가(외국인이 미국 자산을 원함) 및 달러 공급 감소(미국인이 국내 수익이 높아 외국 자산을 덜 구입). 두 효과 모두 달러 절상을 야기한다. 두 곡선 이동 모두 그리고 더 높은 균형 환율의 새 균형을 보여준다. 세로축에 표시할 통화를 반드시 지정할 것.",
                    "fr": "Question AP : tracez l'offre et la demande d'une devise spécifique (ex. : USD). Quand la Fed relève les taux : demande de USD en hausse (étrangers veulent des actifs américains) ET offre de USD en baisse (Américains achètent moins d'actifs étrangers). Les deux effets provoquent une appréciation. Tracez les deux courbes se déplaçant et montrez le nouvel équilibre. Précisez toujours quelle devise est sur l'axe des ordonnées.",
                },
            },
            {
                "heading": {
                    "ja": "為替レートとマクロ経済",
                    "ko": "환율과 거시경제",
                    "fr": "Les taux de change et la macroéconomie",
                },
                "body": {
                    "ja": "為替レートの変化は純輸出チャンネルを通じてマクロ経済に影響する。通貨安（減価）：輸出が外国人にとって安くなり（輸出量増加）、輸入が国内で高くなり（輸入量減少）、純輸出増加、ADが右シフトする。通貨高は逆の効果：NX減少、AD左シフト。貿易収支への影響は価格弾力性に依存する。マーシャル・ラーナー条件：輸出・輸入の需要価格弾力性の合計が1を超える場合のみ通貨安は貿易収支を改善する。短期的には弾力性が低いため（既存契約）、通貨安は短期的に貿易収支を悪化させてから改善するかもしれない。これをJカーブ効果という。",
                    "ko": "환율 변화는 순수출 경로를 통해 거시경제에 영향을 미친다. 통화 약세(절하): 수출이 외국인에게 저렴해지고(수출량 증가), 수입이 국내에서 비싸지고(수입량 감소), 순수출이 증가해 AD가 오른쪽으로 이동한다. 통화 강세(절상)는 반대: NX 감소, AD 왼쪽 이동. 무역 수지에 대한 효과는 가격 탄력성에 달려 있다. 마샬-러너 조건: 수출·수입 수요의 가격 탄력성 합이 1을 초과할 때만 통화 절하가 무역 수지를 개선한다. 단기적으로는 탄력성이 낮아(기존 계약) 통화 절하가 단기에 무역 수지를 악화시킨 후 개선할 수 있다. 이를 J커브 효과라 한다.",
                    "fr": "Les variations du taux de change affectent la macroéconomie via les exportations nettes. Dépréciation : les exportations deviennent moins chères pour les étrangers (volume en hausse), les importations plus chères en interne (volume en baisse), les XN augmentent, la DA se déplace vers la droite. L'appréciation a l'effet inverse : XN diminuent, DA vers la gauche. La condition Marshall-Lerner : la dépréciation améliore la balance commerciale seulement si la somme des élasticités-prix dépasse un. À court terme les élasticités sont faibles (contrats existants), donc la dépréciation peut d'abord détériorer la balance avant de l'améliorer — l'effet courbe en J.",
                },
                "real_world": {
                    "ja": "中国の管理された為替レート政策は何十年もRMBを過小評価に維持し、輸出競争力を支援した。米国は中国の為替操作を非難した。2013年の日本の積極的金融緩和（アベノミクス）で円が30%下落すると、日本の輸出が急増し約12-18ヶ月後に貿易収支が改善した。これは1-2年のラグを持つJカーブ効果の典型例だ。",
                    "ko": "중국의 관리 환율 정책은 수십 년 동안 위안화를 저평가 상태로 유지해 수출 경쟁력을 지원했다. 미국은 중국의 환율 조작을 비난했다. 2013년 일본의 공격적인 통화 완화(아베노믹스)로 엔화가 30% 하락하자 일본 수출이 급증했고 약 12~18개월 후 무역 수지가 개선되었다. 이는 1~2년의 시차를 가진 J커브 효과의 전형적인 예다.",
                    "fr": "La politique de taux de change géré de la Chine a maintenu le RMB sous-évalué pendant des décennies. Les États-Unis ont accusé la Chine de manipulation monétaire. Quand le Japon a mené l'Abenomics en 2013, le yen s'est déprécié de 30 % — les exportations japonaises ont explosé et la balance commerciale s'est améliorée après 12-18 mois, illustrant la courbe en J avec un décalage d'un à deux ans.",
                },
                "exam_tip": {
                    "ja": "外為市場をAD-ASモデルに結びつける：通貨安→NX増加→AD右シフト→産出量上昇・物価水準上昇。APの自由記述では、あるシナリオ（例：国が金利を引き上げる）が与えられ外為市場・AD-AS・フィリップス曲線の3つのダイアグラムを描いて波及効果を追跡するよう求めることがある。この複数ダイアグラムの連鎖はAPマクロで最も複雑な問題タイプだ。各リンクを追う練習をすること。",
                    "ko": "외환 시장을 AD-AS 모델과 연결: 통화 절하 → NX 증가 → AD 오른쪽 이동 → 산출량 상승·물가 수준 상승. AP 자유 서술에서는 어떤 시나리오(예: 국가가 금리 인상)를 제시하고 외환 시장·AD-AS·필립스 곡선 세 가지 다이어그램을 그려 파급 효과를 추적하도록 요구할 수 있다. 이 다중 다이어그램 연쇄는 AP 거시경제에서 가장 복잡한 문제 유형이다. 각 연결을 추적하는 연습을 할 것.",
                    "fr": "Reliez le marché des changes au modèle OA-DA : dépréciation → XN augmentent → DA vers la droite → production et niveau des prix en hausse. Les questions à réponse libre de l'AP peuvent donner un scénario et demander de tracer les trois diagrammes (marché des changes, OA-DA, courbe de Phillips). Cette chaîne multi-diagrammes est le type le plus complexe. Entraînez-vous à tracer chaque lien.",
                },
            },
            {
                "heading": {
                    "ja": "国際的連関と政策のスピルオーバー",
                    "ko": "국제적 연관과 정책 파급 효과",
                    "fr": "Les liens internationaux et les retombées des politiques",
                },
                "body": {
                    "ja": "開放経済では国内政策は他国に波及し、外国の政策が国内経済に影響を与える。米国が金利を引き上げると：より高いリターンが他国から資本を引き付け他国通貨が減価し、米国の輸入が相対的に安くなり、米国向け輸出業者は恩恵を受けるが米国の輸出業者は逆風に直面する。大国（米国・中国）の拡張的財政政策は世界のADを増加させ他国の輸出需要を高める。通貨戦争：複数の国が輸出優位を得るために同時に通貨を減価させると、全員が高インフレに直面するが相対的な競争優位は得られない場合がある。G20やIMFによる国際的なマクロ経済政策協調はそのような囚人のジレンマ的な結果を防ぐことを目指す。",
                    "ko": "개방 경제에서 국내 정책은 다른 나라로 파급되고 외국의 정책이 국내 경제에 영향을 준다. 미국이 금리를 인상하면: 더 높은 수익률이 다른 나라에서 자본을 끌어들이고 다른 나라 통화가 절하되며, 미국 수입이 상대적으로 저렴해지고, 미국향 수출 업체는 혜택을 받지만 미국 수출 업체는 역풍에 직면한다. 대국(미국·중국)의 확장적 재정 정책은 세계 AD를 증가시켜 다른 나라의 수출 수요를 높인다. 통화 전쟁: 여러 나라가 수출 우위를 위해 동시에 통화를 절하시키면 결국 모두 높은 인플레이션에 직면하지만 상대적 경쟁 우위는 얻지 못할 수 있다. G20이나 IMF를 통한 국제적 정책 협조는 이러한 죄수의 딜레마 결과를 방지하는 것을 목표로 한다.",
                    "fr": "Dans une économie ouverte, les politiques nationales se répercutent sur d'autres pays. Si les États-Unis relèvent leurs taux : des rendements plus élevés attirent des capitaux d'autres pays, les autres devises se déprécient, les importations américaines deviennent moins chères. Une politique expansionniste dans une grande économie augmente la DA mondiale et stimule les exportations d'autres pays. Guerres de change : si plusieurs pays déprécient simultanément, tous peuvent finir avec une inflation plus élevée sans gain relatif de compétitivité. La coordination internationale (G20, FMI) vise à prévenir ces résultats de type dilemme du prisonnier.",
                },
                "real_world": {
                    "ja": "2013年のテーパー・タントラムは国際的スピルオーバーを示す。FRBがQE縮小を示唆すると米国リターン上昇を見込んだ投資家が新興市場（ブラジル・インド・トルコ・南アフリカ）から資本を大量に引き上げた。新興市場国の通貨が急落しインフレが上昇して、自国経済が引き締めを必要としないにもかかわらず各国中央銀行は防衛的に利上げを余儀なくされた。1つの中央銀行（FRB）の政策が何十もの他国での引き締めを強制した。グローバル金融市場の相互依存を示す。",
                    "ko": "2013년 긴축 발작(테이퍼 탠트럼)은 국제적 파급 효과를 보여준다. FRB가 QE 축소를 시사하자 투자자들이 신흥 시장(브라질·인도·터키·남아프리카)에서 자본을 대거 회수했다. 신흥 시장국 통화가 급락하고 인플레이션이 상승해, 자국 경제가 긴축을 필요로 하지 않음에도 각국 중앙은행이 방어적으로 금리를 올릴 수밖에 없었다. 하나의 중앙은행(FRB)의 정책이 수십 개국에서 긴축을 강요했다. 글로벌 금융 시장의 상호 의존을 보여준다.",
                    "fr": "Le « taper tantrum » de 2013 illustre les retombées. Quand la Fed a laissé entendre qu'elle réduirait son QE, les capitaux ont fui les marchés émergents (Brésil, Inde, Turquie, Afrique du Sud). Les devises émergentes se sont effondrées, provoquant de l'inflation et forçant leurs banques centrales à relever leurs taux — même si leurs économies n'en avaient pas besoin. La politique d'une banque centrale (la Fed) a forcé un resserrement dans des dizaines d'autres pays.",
                },
                "exam_tip": {
                    "ja": "トリレンマ（不可能な三位一体）：国は同時に(1)固定為替レート、(2)自由な資本移動、(3)独立した金融政策を持つことができない。3つのうち2つしか選べない。中国は資本移動を制限して(1)と(3)を選んだ。香港は金融政策の独立性を放棄して(1)と(2)を選んだ。米国は変動為替レートで(2)と(3)を選んだ。APではどの政策が両立可能かを問われることがある。トリレンマを理解することで異なる国が異なる金融政策フレームワークを持つ理由を説明できる。",
                    "ko": "트릴레마(불가능한 삼각형): 한 나라는 (1) 고정 환율, (2) 자유로운 자본 이동, (3) 독립적인 통화 정책을 동시에 가질 수 없다. 셋 중 두 가지만 선택 가능. 중국은 자본 이동을 제한해 (1)과 (3)을 선택했다. 홍콩은 통화 정책 독립성을 포기하고 (1)과 (2)를 선택했다. 미국은 변동 환율로 (2)와 (3)을 선택했다. AP에서는 어떤 정책이 양립 가능한지를 묻기도 한다. 트릴레마를 이해하면 서로 다른 나라가 왜 다른 통화 정책 체계를 갖는지 설명할 수 있다.",
                    "fr": "Le trilemme : un pays ne peut pas avoir simultanément (1) un taux de change fixe, (2) des flux de capitaux libres, et (3) une politique monétaire indépendante. Choisissez seulement deux. La Chine a choisi (1) et (3) en restreignant les capitaux. Hong Kong a choisi (1) et (2) en abandonnant l'indépendance monétaire. Les États-Unis ont choisi (2) et (3) avec un taux flottant. L'AP peut tester quelles politiques sont compatibles — comprendre le trilemme explique pourquoi différents pays ont différents cadres monétaires.",
                },
            },
        ],
    },
}
