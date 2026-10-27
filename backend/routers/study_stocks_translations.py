# ja / ko / fr translations for the Stock Basics course (STOCKS_CURRICULUM in study.py:
# the stocks_foundation and stocks_advanced papers; the US paper has its own file).
# Structure: topic_id -> {"title": {lang: str}, "sections": [{field: {lang: str}}]}

STOCKS_PAPER_TITLES = {
    "stocks_foundation": {"ja": "株式の基礎", "ko": "주식 기초", "fr": "Les bases des actions"},
    "stocks_advanced": {"ja": "投資の考え方", "ko": "투자적 사고", "fr": "Penser en investisseur"},
}

STOCKS_TRANSLATIONS = {
    "stocks_1": {
        "title": {"ja": "株式とは", "ko": "주식이란 무엇인가", "fr": "Qu'est-ce qu'une action ?"},
        "sections": [
            {
                "heading": {"ja": "株式とは何か、企業が上場する理由", "ko": "주식이란 무엇이며 기업은 왜 상장하는가",
                            "fr": "Qu'est-ce qu'une action et pourquoi les entreprises entrent en Bourse"},
                "body": {
                    "ja": "株式は会社の所有権の一部を表します。会社が所有権を小さな単位に分けて一般に売り出すとき、その一単位を「株」と呼びます。株を買えば株主となり、会社のごく一部を所有することになります。企業が上場（IPO）する主な理由は三つあります。事業拡大のための資金調達、知名度と信用の向上、そして初期の投資家や創業者が投資を現金化する機会をつくることです。",
                    "ko": "주식은 회사 소유권의 일부를 나타냅니다. 회사가 소유권을 작은 단위로 나누어 일반에 팔 때, 그 한 단위를 '주'라고 합니다. 주식을 사면 주주가 되어 회사의 작은 일부를 소유하게 됩니다. 기업이 상장(IPO)하는 주된 이유는 세 가지입니다. 사업 확장을 위한 자금 조달, 브랜드 인지도와 신뢰도 향상, 그리고 초기 투자자와 창업자가 투자금을 회수할 기회를 마련하는 것입니다.",
                    "fr": "Une action représente une part de la propriété d'une entreprise. Lorsqu'une société divise son capital en petites unités et les vend au public, chaque unité s'appelle une action. En achetant des actions, vous devenez actionnaire : vous possédez une petite partie de l'entreprise. Les sociétés entrent en Bourse (introduction en Bourse, ou IPO) pour trois raisons principales : lever des capitaux pour se développer, gagner en visibilité et en crédibilité, et permettre aux premiers investisseurs et aux fondateurs de récupérer leur mise.",
                },
                "real_world": {
                    "ja": "貴州茅台（600519）の発行済株式数は約12.56億株です。株価を約1,500元とすると時価総額は約1.9兆元となり、1株買えばおよそ12.6億分の1の持ち分を持つことになります。CATL（寧徳時代、300750）は2018年に上場し、電池の生産能力拡大のためにIPOで54億元を調達しました。現在の時価総額は1兆元を超え、初期の投資家に大きなリターンをもたらしています。",
                    "ko": "구이저우마오타이(600519)의 발행 주식 수는 약 12억 5,600만 주입니다. 주가를 약 1,500위안으로 보면 시가총액은 약 1조 9,000억 위안이며, 1주만 사도 약 12억 6,000만분의 1의 지분을 갖게 됩니다. CATL(닝더스다이, 300750)은 2018년에 상장하면서 배터리 생산 능력 확대를 위해 IPO로 54억 위안을 조달했습니다. 현재 시가총액은 1조 위안을 넘어 초기 투자자들에게 막대한 수익을 안겨 주었습니다.",
                    "fr": "Kweichow Moutai (600519) compte environ 1,256 milliard d'actions. À un cours d'environ 1 500 yuans, sa capitalisation boursière atteint environ 1 900 milliards de yuans : acheter une seule action revient à détenir environ un 1,26 milliardième de l'entreprise. CATL (300750) est entré en Bourse en 2018 et a levé 5,4 milliards de yuans pour augmenter sa production de batteries. Sa capitalisation dépasse aujourd'hui 1 000 milliards de yuans, un gain énorme pour les premiers investisseurs.",
                },
            },
            {
                "heading": {"ja": "株主の権利", "ko": "주주의 권리", "fr": "Les droits de l'actionnaire"},
                "body": {
                    "ja": "株主には三つの主な権利があります。配当を受け取る権利（利益の一部が現金で分配されます）、株主総会で会社の重要な決定に投票する権利（持ち株が多いほど議決権も多くなります）、そして会社が清算される場合に残った財産を持ち分に応じて受け取る権利です。",
                    "ko": "주주에게는 세 가지 핵심 권리가 있습니다. 배당을 받을 권리(이익의 일부를 현금으로 분배받음), 주주총회에서 회사의 중요한 결정에 투표할 권리(보유 주식이 많을수록 의결권도 많음), 그리고 회사가 청산될 경우 남은 자산을 지분에 비례해 받을 권리입니다.",
                    "fr": "En tant qu'actionnaire, vous disposez de trois droits essentiels : le droit de percevoir des dividendes (une part des bénéfices versée en espèces), le droit de voter en assemblée générale sur les décisions importantes (plus vous avez d'actions, plus vous avez de voix), et le droit de recevoir une part proportionnelle des actifs restants si l'entreprise est liquidée.",
                },
                "exam_tip": {
                    "ja": "覚えておきましょう。株を買うことは、会社の所有権の一部を買うことです。会社にお金を貸す債券とは根本的に異なります。株主はより高いリスクを負いますが、会社の成長による利益をすべて享受できます。",
                    "ko": "기억하세요. 주식을 산다는 것은 회사 소유권의 일부를 사는 것입니다. 회사에 돈을 빌려주는 채권과는 근본적으로 다릅니다. 주주는 더 큰 위험을 지지만, 회사가 성장할 때의 이익을 온전히 누립니다.",
                    "fr": "À retenir : acheter une action, c'est acheter une part de propriété de l'entreprise. C'est fondamentalement différent d'une obligation, par laquelle vous prêtez de l'argent à l'entreprise. L'actionnaire prend plus de risques, mais profite pleinement de la croissance de la société.",
                },
            },
        ],
    },
    "stocks_2": {
        "title": {"ja": "A株市場の基礎", "ko": "A주 시장 기초", "fr": "Les bases du marché des actions A"},
        "sections": [
            {
                "heading": {"ja": "A株とは何か、銘柄コードの読み方", "ko": "A주란 무엇이며 종목 코드는 어떻게 읽는가",
                            "fr": "Que sont les actions A et comment lire les codes boursiers"},
                "body": {
                    "ja": "A株とは、中国本土の証券取引所（上海と深圳）に上場し、人民元建てで取引される株式です。銘柄コードは6桁で、先頭の2桁で市場がわかります。60xxxx は上海メインボード、00xxxx は深圳メインボード、30xxxx は創業板（ChiNext、成長企業向け）、688xxx は科創板（STARマーケット、ハイテク企業向け）です。",
                    "ko": "A주는 중국 본토 증권거래소(상하이, 선전)에 상장되어 위안화로 거래되는 주식입니다. 종목 코드는 6자리이며, 앞의 두 자리로 시장을 알 수 있습니다. 60xxxx는 상하이 메인보드, 00xxxx는 선전 메인보드, 30xxxx는 창업판(ChiNext, 성장 기업), 688xxx는 과창판(STAR 마켓, 첨단 기술 기업)입니다.",
                    "fr": "Les actions A sont les titres cotés sur les Bourses de Chine continentale (Shanghai et Shenzhen), libellés en yuans (RMB). Les codes boursiers chinois comportent six chiffres, et les deux premiers indiquent le marché : 60xxxx = marché principal de Shanghai, 00xxxx = marché principal de Shenzhen, 30xxxx = ChiNext (entreprises de croissance), 688xxx = STAR Market (entreprises de haute technologie).",
                },
                "real_world": {
                    "ja": "600519 は貴州茅台（上海メインボード）、000858 は五糧液（深圳メインボード）、300750 は CATL（創業板）、688981 は SMIC（中芯国際、科創板）です。コードの仕組みを知れば、その銘柄がどの取引所・どの市場区分に属するかがすぐにわかります。",
                    "ko": "600519는 구이저우마오타이(상하이 메인보드), 000858은 우량예(선전 메인보드), 300750은 CATL(창업판), 688981은 SMIC(중신궈지, 과창판)입니다. 코드 구조만 알면 어떤 거래소, 어떤 시장에 속한 종목인지 바로 알 수 있습니다.",
                    "fr": "600519 = Kweichow Moutai (marché principal de Shanghai), 000858 = Wuliangye (marché principal de Shenzhen), 300750 = CATL (ChiNext), 688981 = SMIC (STAR Market). Une fois la structure des codes connue, on identifie immédiatement la Bourse et le compartiment d'un titre.",
                },
            },
            {
                "heading": {"ja": "取引時間とルール", "ko": "거래 시간과 규칙", "fr": "Horaires et règles de négociation"},
                "body": {
                    "ja": "A株の取引は月曜から金曜で、前場 9:30〜11:30 と後場 13:00〜15:00（北京時間）の二つの時間帯に分かれています。中国の祝日は休場です。暗号資産とは異なり、A株は24時間取引ではありません。寄り付き前の板寄せ（9:15〜9:25）で、注文の突き合わせによって始値が決まります。",
                    "ko": "A주는 월요일부터 금요일까지 오전 9:30~11:30, 오후 13:00~15:00(베이징 시간) 두 차례 거래됩니다. 중국 공휴일에는 휴장합니다. 암호화폐와 달리 A주는 24시간 시장이 아닙니다. 개장 전 동시호가(9:15~9:25)에서 주문을 맞춰 시가가 결정됩니다.",
                    "fr": "Les actions A se négocient du lundi au vendredi en deux séances : le matin de 9h30 à 11h30 et l'après-midi de 13h00 à 15h00 (heure de Pékin). Le marché est fermé les jours fériés chinois. Contrairement aux cryptomonnaies, les actions A ne se négocient pas 24 h/24. L'enchère d'ouverture (9h15–9h25) fixe le cours d'ouverture en confrontant les ordres.",
                },
                "exam_tip": {
                    "ja": "A株は暗号資産のような24時間市場ではありません。注文の前に、市場が開いているかを必ず確認しましょう。寄り付き前の注文は板寄せの時間（9:15〜9:25）に出します。なお、香港株は香港時間16時に取引が終わり、米国株は米東部時間 9:30〜16:00 に取引されます。",
                    "ko": "A주는 암호화폐처럼 24시간 열리는 시장이 아닙니다. 주문하기 전에 시장이 열려 있는지 꼭 확인하세요. 장 시작 전 주문은 동시호가 시간(9:15~9:25)에 냅니다. 참고로 홍콩 주식은 홍콩 시간 16시에 마감하고, 미국 주식은 미 동부 시간 9:30~16:00에 거래됩니다.",
                    "fr": "Les actions A ne sont pas un marché ouvert 24 h/24 comme les cryptomonnaies. Vérifiez toujours que le marché est ouvert avant de passer un ordre. Les ordres avant l'ouverture se placent pendant l'enchère d'ouverture (9h15–9h25). À noter : Hong Kong ferme à 16h00 (heure locale) et les actions américaines se négocient de 9h30 à 16h00, heure de l'Est.",
                },
            },
        ],
    },
    "stocks_3": {
        "title": {"ja": "株価の読み方", "ko": "주가 읽는 법", "fr": "Comprendre le cours d'une action"},
        "sections": [
            {
                "heading": {"ja": "ローソク足と騰落率の計算", "ko": "캔들 차트와 등락률 계산",
                            "fr": "Les chandeliers et le calcul de la variation"},
                "body": {
                    "ja": "ローソク足（K線）チャートは、一定期間ごとに始値・終値・高値・安値の四つの価格を示します。A株では、赤（陽線）は終値が始値より高い、つまり上昇したことを、緑（陰線）は下落したことを意味します。実体の上下に伸びる細いヒゲは、その期間の値幅全体を表します。前日比の騰落率＝（当日終値−前日終値）÷前日終値×100%。",
                    "ko": "캔들(K선) 차트는 기간마다 시가, 종가, 고가, 저가의 네 가지 가격을 보여 줍니다. A주에서는 빨간색(양봉)이 종가가 시가보다 높은 것, 즉 상승을 뜻하고 초록색(음봉)이 하락을 뜻합니다. 몸통 위아래의 가는 꼬리는 그 기간의 전체 가격 범위를 보여 줍니다. 일간 등락률 = (오늘 종가 − 어제 종가) ÷ 어제 종가 × 100%.",
                    "fr": "Un graphique en chandeliers (K-line) indique quatre prix par période : ouverture, clôture, plus haut et plus bas. Sur les actions A, une bougie rouge (haussière) signifie que la clôture est supérieure à l'ouverture : le titre a monté ; une bougie verte (baissière) signifie qu'il a baissé. Les fines mèches au-dessus et au-dessous du corps montrent toute l'amplitude du prix. Variation quotidienne en % = (clôture du jour − clôture de la veille) ÷ clôture de la veille × 100 %.",
                },
                "real_world": {
                    "ja": "茅台のある一日の例：1,480元で寄り付き、高値1,535元、安値1,475元、終値1,520元。これは上ヒゲの長い（上値に抵抗がある）、下ヒゲの短い赤い陽線になります。騰落率：前日終値が1,500元で当日終値が1,530元なら、（1,530−1,500）÷1,500×100%＝＋2.0%です。",
                    "ko": "마오타이의 어느 하루를 예로 들면, 1,480위안에 시작해 고가 1,535위안, 저가 1,475위안을 거쳐 1,520위안에 마감했습니다. 이는 윗꼬리가 길고(위쪽 저항) 아랫꼬리가 짧은 빨간 양봉이 됩니다. 등락률: 어제 종가가 1,500위안이고 오늘 종가가 1,530위안이면 (1,530 − 1,500) ÷ 1,500 × 100% = +2.0%입니다.",
                    "fr": "Une journée type pour Moutai : ouverture à 1 480, plus haut à 1 535, plus bas à 1 475, clôture à 1 520. Cela forme une bougie rouge haussière avec une longue mèche haute (une résistance au sommet) et une courte mèche basse. Variation : si la clôture de la veille était de 1 500 et celle du jour de 1 530, la variation = (1 530 − 1 500) / 1 500 × 100 % = +2,0 %.",
                },
            },
            {
                "heading": {"ja": "A株の値幅制限（ストップ高・ストップ安）", "ko": "A주의 가격 제한폭(상한가·하한가)",
                            "fr": "Les limites de variation des actions A (plafond et plancher)"},
                "body": {
                    "ja": "A株には、この市場特有の1日の値幅制限があります。メインボード銘柄は1日±10%まで、創業板と科創板の銘柄は±20%まで動けます。財務に問題を抱えるST（特別処理）銘柄は±5%に制限されます。ストップ高になると大量の買い注文が並び、ほぼ買えなくなります。ストップ安になると売り手は逃げられず、これはA株特有の大きな流動性リスクです。",
                    "ko": "A주에는 이 시장 특유의 일일 가격 제한폭이 있습니다. 메인보드 종목은 하루 ±10%, 창업판과 과창판 종목은 ±20%까지 움직일 수 있습니다. 재무 문제가 있는 ST(특별 처리) 종목은 ±5%로 제한됩니다. 상한가에 도달하면 매수 대기 물량이 길게 쌓여 사실상 살 수 없고, 하한가에 도달하면 팔고 싶어도 팔 수 없습니다. 이는 A주 특유의 큰 유동성 위험입니다.",
                    "fr": "Les actions A ont des limites de variation quotidienne propres à ce marché : les titres du marché principal ne peuvent varier que de ±10 % par jour, ceux du ChiNext et du STAR Market de ±20 %. Les titres ST (« traitement spécial »), des entreprises en difficulté financière, sont limités à ±5 %. Quand un titre atteint son plafond, une longue file d'acheteurs se forme et il devient presque impossible d'acheter ; quand il touche son plancher, les vendeurs ne peuvent plus sortir : un risque de liquidité majeur, propre aux actions A.",
                },
                "real_world": {
                    "ja": "2023年、ChatGPTブームを受けて、いくつかのAI関連銘柄が何日も連続でストップ高になり、個人投資家は買えませんでした。ようやく値幅制限から「解放」されると大量の売りが殺到し、多くの銘柄が同じ日にストップ安となりました。ストップ高がその後の上昇を保証しないことを示す例です。",
                    "ko": "2023년, ChatGPT 열풍 이후 여러 AI 테마주가 며칠 연속 상한가를 기록해 개인 투자자는 살 수 없었습니다. 마침내 상한가가 풀리자 대량의 매도 주문이 쏟아져 많은 종목이 같은 날 하한가로 떨어졌습니다. 상한가가 이후의 상승을 보장하지 않는다는 것을 보여 주는 사례입니다.",
                    "fr": "En 2023, dans l'euphorie autour de ChatGPT, plusieurs valeurs liées à l'IA ont atteint leur plafond plusieurs jours de suite ; les particuliers ne pouvaient pas acheter. Quand les titres se sont enfin « débloqués », des ordres de vente massifs ont inondé le marché et beaucoup ont touché leur plancher le jour même : atteindre le plafond ne garantit pas la poursuite de la hausse.",
                },
                "exam_tip": {
                    "ja": "ストップ高になったからといって、翌日も上がるとは限りません。大口の機関投資家が、ストップ高で個人の買いを呼び込んでから自分の持ち株を売ることもあります。異常な値動きを見たら、行動する前にその根本的な理由を必ず調べましょう。",
                    "ko": "상한가를 쳤다고 해서 내일도 오른다는 뜻은 아닙니다. 대형 기관 투자자가 상한가로 개인 매수세를 끌어들인 뒤 자신의 물량을 파는 경우도 있습니다. 이상한 가격 움직임을 보면 행동하기 전에 그 근본적인 이유를 반드시 살펴보세요.",
                    "fr": "Un titre qui atteint son plafond ne continuera pas forcément à monter le lendemain. De grands investisseurs institutionnels s'en servent parfois pour attirer les particuliers avant de vendre leurs propres positions. Avant d'agir, cherchez toujours la raison fondamentale d'un mouvement de prix inhabituel.",
                },
            },
        ],
    },
    "stocks_4": {
        "title": {"ja": "財務指標を読む", "ko": "핵심 재무 지표", "fr": "Les indicateurs financiers clés"},
        "sections": [
            {
                "heading": {"ja": "PER（株価収益率）と PBR（株価純資産倍率）", "ko": "PER(주가수익비율)과 PBR(주가순자산비율)",
                            "fr": "Le PER et le ratio cours / valeur comptable"},
                "body": {
                    "ja": "PER（株価収益率）＝株価÷1株当たり利益（EPS）。年間利益1元に対していくら払っているかを示します。PER 20倍なら、利益1元に20元を払っていることになり、今の収益力のままなら投資の回収に20年かかります。PBR（株価純資産倍率）＝株価÷1株当たり純資産。PBRが1倍を下回る（「解散価値割れ」）とは、株価が会計上の純資産を下回っていることを意味し、市場が将来の収益力を疑っていることを示唆します。",
                    "ko": "PER(주가수익비율) = 주가 ÷ 주당순이익(EPS). 연간 이익 1위안에 얼마를 지불하는지 보여 줍니다. PER이 20배라면 이익 1위안에 20위안을 내는 셈이며, 지금 수익성이 그대로라면 투자금을 회수하는 데 20년이 걸립니다. PBR(주가순자산비율) = 주가 ÷ 주당순자산. PBR이 1배 미만('장부가 이하 거래')이면 주가가 회계상 순자산보다 낮게 평가된 것으로, 시장이 미래 수익성을 의심한다는 신호입니다.",
                    "fr": "Le PER (Price Earnings Ratio) = cours de l'action ÷ bénéfice par action (BPA). Il indique combien vous payez pour chaque yuan de bénéfice annuel. Un PER de 20 signifie que vous payez 20 yuans pour 1 yuan de bénéfice : à rentabilité constante, il faudrait 20 ans pour récupérer votre mise. Le ratio cours / valeur comptable (P/B) = cours ÷ actif net par action. Un P/B inférieur à 1 (« sous la valeur comptable ») signifie que l'action vaut moins que son actif net comptable, signe que le marché doute de la rentabilité future.",
                },
                "real_world": {
                    "ja": "貴州茅台のPERは約30倍、大手銀行は5〜6倍程度です。茅台が割高に評価されるのは、高い成長期待と強固な競争優位（モート）があるからです。2023年、中国工商銀行（601398）のPBRは約0.5倍で、市場が会計上の純資産の半分しか評価しておらず、融資の質への懸念を反映していました。異なる業種のPERを比べてはいけません。",
                    "ko": "구이저우마오타이는 PER 약 30배, 대형 은행은 5~6배 수준에서 거래됩니다. 마오타이가 프리미엄을 받는 것은 높은 성장 기대와 깊은 경쟁 해자 때문입니다. 2023년 중국공상은행(601398)의 PBR은 약 0.5배로, 시장이 회계상 순자산의 절반만 인정한 셈이었으며 이는 대출 건전성에 대한 우려를 반영했습니다. 서로 다른 업종끼리 PER을 비교해서는 안 됩니다.",
                    "fr": "Kweichow Moutai se négocie à environ 30 fois ses bénéfices, contre 5 à 6 fois pour les grandes banques. Moutai bénéficie d'une prime grâce à une forte croissance attendue et à un avantage concurrentiel durable. En 2023, ICBC (601398) se négociait à un P/B d'environ 0,5 : le marché ne lui accordait que la moitié de son actif net comptable, par crainte sur la qualité de ses prêts. Ne comparez jamais les PER de secteurs différents.",
                },
            },
            {
                "heading": {"ja": "配当利回り", "ko": "배당수익률", "fr": "Le rendement du dividende"},
                "body": {
                    "ja": "配当利回り＝1株当たり年間配当÷株価×100%。株価に対してどれだけ現金のリターンを受け取れるかを示し、投資に対する利率のようなものです。配当利回りの高い銘柄（一般に3%超）は安定収入を重視する投資家に好まれ、預金金利が低いときに特に魅力が増します。",
                    "ko": "배당수익률 = 주당 연간 배당금 ÷ 주가 × 100%. 주가 대비 받는 현금 수익을 나타내며, 투자에 대한 이자율과 비슷합니다. 배당수익률이 높은 종목(보통 3% 이상)은 꾸준한 수입을 중시하는 투자자에게 인기가 있으며, 특히 예금 금리가 낮을 때 매력이 커집니다.",
                    "fr": "Rendement du dividende = dividende annuel par action ÷ cours × 100 %. Il mesure le revenu en espèces que vous touchez par rapport au prix de l'action, un peu comme le taux d'intérêt de votre placement. Les titres à fort rendement (en général plus de 3 %) attirent les investisseurs en quête de revenus, surtout quand les taux des dépôts bancaires sont bas.",
                },
                "real_world": {
                    "ja": "長江電力（600900）は安定して3〜4%の配当利回りを提供しており、中国の銀行預金金利を上回るため、長期で安定収入を求める投資家を引きつけています。中国神華（601088）は時に7%を超える配当利回りとなり、ハイイールド債に匹敵する水準から「キャッシュカウ」と呼ばれています。",
                    "ko": "창장전력(600900)은 꾸준히 3~4%의 배당수익률을 제공해 중국 은행 예금 금리보다 높아, 장기 수입형 투자자를 끌어들입니다. 중국선화에너지(601088)는 한때 배당수익률이 7%를 넘어 하이일드 채권에 버금가는 수준으로 '캐시카우'라는 별명을 얻었습니다.",
                    "fr": "Yangtze Power (600900) offre régulièrement un rendement de 3 à 4 %, supérieur aux taux des dépôts bancaires chinois, ce qui attire les investisseurs de long terme en quête de revenus. China Shenhua Energy (601088) a parfois versé plus de 7 %, un niveau comparable aux obligations à haut rendement, d'où son surnom de « vache à lait ».",
                },
                "exam_tip": {
                    "ja": "PERが高いからといって割高とは限らず、低いからといって割安とも限りません。成長見通し、業界の動向、ビジネスモデルの質を必ず考えましょう。急成長企業の高いPERは正当化されることがあり、利益がピークにある景気循環株の低いPERは「バリュートラップ」になりえます。",
                    "ko": "PER이 높다고 항상 비싼 것도, 낮다고 항상 싼 것도 아닙니다. 성장 전망, 업종 상황, 비즈니스 모델의 질을 반드시 함께 보세요. 빠르게 성장하는 기업의 높은 PER은 정당할 수 있고, 이익이 정점에 있는 경기순환주의 낮은 PER은 '가치 함정'일 수 있습니다.",
                    "fr": "Un PER élevé n'est pas toujours cher, ni un PER bas toujours bon marché. Tenez toujours compte des perspectives de croissance, de la dynamique du secteur et de la qualité du modèle économique. Un PER élevé peut se justifier pour une entreprise en forte croissance ; un PER bas pour une entreprise cyclique au sommet de ses bénéfices peut être un piège à valeur.",
                },
            },
        ],
    },
    "stocks_5": {
        "title": {"ja": "株価を動かすもの", "ko": "주가를 움직이는 요인", "fr": "Ce qui fait bouger les cours"},
        "sections": [
            {
                "heading": {"ja": "ファンダメンタルズとマクロ経済の要因", "ko": "펀더멘털과 거시경제 요인",
                            "fr": "Facteurs fondamentaux et macroéconomiques"},
                "body": {
                    "ja": "株価は最終的に企業の業績、つまり売上の伸び、利益率、1株当たり利益によって決まります。決算が予想を上回れば株価は上がり、下回れば下がります。マクロの面では、金利、インフレ、GDP成長率、政府の政策が株式の評価に影響します。金利が下がると借入コストが下がり、将来の利益の現在価値が高まるため、株価を押し上げます。",
                    "ko": "주가는 결국 기업의 실적, 즉 매출 성장률, 이익률, 주당순이익에 의해 결정됩니다. 실적이 예상을 크게 웃돌면 주가가 오르고, 밑돌면 내립니다. 거시적으로는 금리, 인플레이션, GDP 성장률, 정부 정책이 모두 주식 가치에 영향을 줍니다. 금리가 내려가면 차입 비용이 낮아지고 미래 이익의 현재가치가 커져 주가를 끌어올립니다.",
                    "fr": "Le cours d'une action dépend en fin de compte des performances de l'entreprise : croissance du chiffre d'affaires, marges et bénéfice par action. Des résultats supérieurs aux attentes font monter le cours ; des résultats décevants le font baisser. Au niveau macroéconomique, les taux d'intérêt, l'inflation, la croissance du PIB et la politique publique influencent tous la valorisation des actions. Des taux plus bas réduisent le coût de l'emprunt et augmentent la valeur actuelle des bénéfices futurs, ce qui pousse les cours à la hausse.",
                },
                "real_world": {
                    "ja": "茅台が2023年の決算で売上18%増、純利益19%増と、いずれも予想を上回る結果を発表すると、株価はその日に3%上昇しました。2024年9月には中国人民銀行が利下げと大規模な景気刺激策を打ち出し、上海総合指数は1週間で10%以上急騰しました。マクロ政策が短期的にいかに強い力を持つかを示す例です。",
                    "ko": "마오타이가 2023년 실적에서 매출 18%, 순이익 19% 증가로 모두 예상을 웃돌자 주가는 당일 3% 올랐습니다. 2024년 9월 중국인민은행이 금리를 내리고 대규모 부양책을 발표하자 상하이종합지수는 한 주 만에 10% 넘게 급등했습니다. 거시 정책이 단기적으로 얼마나 강력한지 보여 주는 사례입니다.",
                    "fr": "Lorsque Moutai a publié ses résultats 2023, avec une hausse de 18 % du chiffre d'affaires et de 19 % du bénéfice net, toutes deux supérieures aux attentes, le titre a gagné 3 % dans la journée. En septembre 2024, la banque centrale chinoise (PBOC) a baissé ses taux et annoncé un vaste plan de relance : l'indice composite de Shanghai a bondi de plus de 10 % en une seule semaine, preuve de la puissance de la politique macroéconomique à court terme.",
                },
            },
            {
                "heading": {"ja": "市場心理（センチメント）", "ko": "시장 심리", "fr": "Le sentiment de marché"},
                "body": {
                    "ja": "短期的には、株価は投資家心理に大きく左右されます。ニュースの流れ（良いニュースは買い圧力、悪いニュースは売り圧力）、北向き資金（ストックコネクト経由でA株に入る海外マネー。強気のサインとみなされます）、個人投資家の群集行動、テクニカルなシグナルなどです。心理で動いた上昇は業績と切り離されていることが多く、急反落しやすい傾向があります。",
                    "ko": "단기적으로 주가는 투자 심리에 크게 좌우됩니다. 뉴스 흐름(호재는 매수 압력, 악재는 매도 압력), 북향자금(후강퉁·선강퉁을 통해 A주로 들어오는 외국인 자금, 강세 신호로 여겨짐), 개인 투자자의 쏠림 현상, 기술적 신호 등이 그 예입니다. 심리로 움직인 상승은 실적과 동떨어진 경우가 많아 급격히 되돌려지기 쉽습니다.",
                    "fr": "À court terme, les cours dépendent fortement du sentiment des investisseurs : le flux d'actualités (bonne nouvelle → pression acheteuse, mauvaise nouvelle → pression vendeuse), les flux « northbound » (capitaux étrangers entrant sur les actions A via Stock Connect, perçus comme un signal haussier), le comportement moutonnier des particuliers et les signaux techniques. Les hausses portées par le sentiment sont souvent déconnectées des fondamentaux et se retournent brutalement.",
                },
                "real_world": {
                    "ja": "2022年末にChatGPTが登場すると、A株のAI関連銘柄が急騰しました。実際のAI事業の売上は何も変わらないまま、3か月で300%以上上がった銘柄もあり、純粋に心理による投機でした。2023年末までに、心理が冷めて業績が再び重視されるにつれ、多くのAI関連銘柄は高値から50〜70%下落しました。",
                    "ko": "2022년 말 ChatGPT가 등장하자 A주의 AI 테마주가 폭등했습니다. 실제 AI 사업 매출은 그대로인데 석 달 만에 300% 넘게 오른 종목도 있었는데, 순전히 심리에 의한 투기였습니다. 2023년 말이 되자 심리가 식고 펀더멘털이 다시 부각되면서 대부분의 AI 테마주는 고점 대비 50~70% 하락했습니다.",
                    "fr": "Au lancement de ChatGPT fin 2022, les valeurs « IA » des actions A ont flambé. Certaines ont gagné plus de 300 % en trois mois sans aucun changement de leur chiffre d'affaires réel dans l'IA : de la pure spéculation. Fin 2023, la plupart avaient chuté de 50 à 70 % par rapport à leur sommet, l'enthousiasme retombant et les fondamentaux reprenant le dessus.",
                },
                "exam_tip": {
                    "ja": "短期の株価＝ファンダメンタルズ＋心理。長期の株価≒ファンダメンタルズ。バリュー投資家は長期に、トレーダーは短期の心理に注目します。どちらの戦略にも厳しい規律が必要で、二つの間を気まぐれに行き来することは、個人投資家が損をする最も一般的な原因の一つです。",
                    "ko": "단기 주가 = 펀더멘털 + 심리. 장기 주가 ≈ 펀더멘털. 가치 투자자는 장기에, 트레이더는 단기 심리에 집중합니다. 두 전략 모두 엄격한 규율이 필요하며, 둘 사이를 무작정 오가는 것은 개인 투자자가 손실을 보는 가장 흔한 원인 중 하나입니다.",
                    "fr": "Cours à court terme = fondamentaux + sentiment. Cours à long terme ≈ fondamentaux. Les investisseurs « value » se concentrent sur le long terme, les traders sur le sentiment à court terme. Les deux stratégies exigent une discipline stricte : passer de l'une à l'autre au hasard est l'une des causes de pertes les plus fréquentes chez les particuliers.",
                },
            },
        ],
    },
    "stocks_6": {
        "title": {"ja": "投資と投機", "ko": "투자 vs 투기", "fr": "Investir ou spéculer"},
        "sections": [
            {
                "heading": {"ja": "バリュー投資とグロース投資", "ko": "가치 투자와 성장 투자",
                            "fr": "Investissement « value » et investissement de croissance"},
                "body": {
                    "ja": "バリュー投資とは、市場で過小評価されているように見える優良企業を買い、市場がその真の価値に気づくまで長期で保有することです。代表的な人物はウォーレン・バフェットとチャーリー・マンガーです。グロース投資とは、平均を大きく上回る成長が期待される企業を買うことで、将来の利益の可能性のために高い評価（高PER）も受け入れ、現在の株価よりも市場機会と競争優位を重視します。",
                    "ko": "가치 투자는 시장에서 저평가된 것으로 보이는 우량 기업을 사서, 시장이 진정한 가치를 알아볼 때까지 장기 보유하는 것입니다. 대표 인물은 워런 버핏과 찰리 멍거입니다. 성장 투자는 평균보다 훨씬 빠르게 성장할 것으로 기대되는 기업을 사는 것으로, 미래 이익 잠재력을 위해 높은 밸류에이션(높은 PER)도 기꺼이 지불하며 현재 주가보다 시장 기회와 경쟁 해자를 중시합니다.",
                    "fr": "L'investissement « value » consiste à acheter des entreprises de qualité qui semblent sous-évaluées par le marché, puis à les conserver longtemps, jusqu'à ce que le marché reconnaisse leur vraie valeur. Figures emblématiques : Warren Buffett et Charlie Munger. L'investissement de croissance consiste à acheter des entreprises censées croître bien plus vite que la moyenne, en acceptant de payer cher (PER élevé) pour leur potentiel de bénéfices futurs, en privilégiant le marché visé et l'avantage concurrentiel plutôt que le cours actuel.",
                },
                "real_world": {
                    "ja": "ウォーレン・バフェットは1988年にコカ・コーラを買い、36年後の今も保有しています。リターンは20倍を超えます。A株では、2012年に格力電器（000651）を買って10年保有した投資家は、安定した利益成長と配当によって約10倍のリターンを得ました。2019年にPER 100倍だったCATL（300750）は割高に見えましたが、EVの普及が爆発的に進み、株価は3年で10倍になり、成長シナリオが正しかったことを証明しました。",
                    "ko": "워런 버핏은 1988년 코카콜라를 사서 36년이 지난 지금도 보유하고 있으며, 수익은 20배를 넘습니다. A주에서는 2012년에 거리전기(000651)를 사서 10년 보유한 투자자가 꾸준한 이익 성장과 배당 덕분에 약 10배의 수익을 거두었습니다. 2019년 PER 100배였던 CATL(300750)은 비싸 보였지만, 전기차 보급이 폭발적으로 늘며 주가가 3년 만에 10배가 되어 성장 논리가 옳았음을 입증했습니다.",
                    "fr": "Warren Buffett a acheté Coca-Cola en 1988 et le détient toujours 36 ans plus tard, avec un gain de plus de 20 fois la mise. Sur les actions A, ceux qui ont acheté Gree Electric (000651) en 2012 et l'ont gardé dix ans ont gagné environ 10 fois leur mise, grâce à une croissance régulière des bénéfices et aux dividendes. CATL (300750) semblait cher à 100 fois ses bénéfices en 2019, mais l'essor des véhicules électriques a multiplié le cours par 10 en trois ans, validant la thèse de croissance.",
                },
            },
            {
                "heading": {"ja": "投機と個人投資家の現実", "ko": "투기와 개인 투자자의 현실",
                            "fr": "La spéculation et la réalité des investisseurs particuliers"},
                "body": {
                    "ja": "投機とは、事業のファンダメンタルズではなく値動きに基づいて短期売買することで、本質的にはゼロサムゲーム（誰かの利益は誰かの損失から生まれる）です。個人投資家はA株の売買代金の約8割を占めますが、情報の非対称性、資金規模の小ささ、感情的な判断のために、機関投資家に対して一貫して負けています。",
                    "ko": "투기는 사업의 펀더멘털이 아니라 가격 움직임에 따라 단기 매매하는 것으로, 본질적으로 제로섬 게임(누군가의 이익은 다른 누군가의 손실에서 나옴)입니다. 개인 투자자는 A주 거래대금의 약 80%를 차지하지만, 정보 비대칭, 작은 자금 규모, 감정적인 판단 때문에 기관에 꾸준히 지고 있습니다.",
                    "fr": "La spéculation consiste à acheter et vendre à court terme en fonction des mouvements de prix plutôt que des fondamentaux de l'entreprise : c'est essentiellement un jeu à somme nulle (chaque gain provient de la perte de quelqu'un d'autre). Les particuliers représentent environ 80 % des volumes échangés sur les actions A, mais perdent régulièrement face aux institutions, à cause de l'asymétrie d'information, de capitaux plus modestes et de décisions guidées par les émotions.",
                },
                "real_world": {
                    "ja": "過去のデータでは、どの3年間をとってもA株の個人投資家の約8割が損失を出す一方、機関投資家（ファンドや証券会社）は安定して利益を上げています。この構造的な差は、情報の非対称性、規模の優位性、専門知識によって生まれます。だからこそ私たちは Best Friend Stock をつくりました。学生が本物のお金を投資する前に、より良い道具と知識を手にできるようにするためです。",
                    "ko": "과거 데이터를 보면 어느 3년 기간을 잡아도 A주 개인 투자자의 약 80%가 손실을 보는 반면, 기관 투자자(펀드, 증권사)는 꾸준히 이익을 냅니다. 이 구조적 격차는 정보 비대칭, 규모의 이점, 전문성에서 비롯됩니다. 바로 그래서 저희는 Best Friend Stock을 만들었습니다. 학생들이 실제 돈을 투자하기 전에 더 나은 도구와 지식을 갖추도록 돕기 위해서입니다.",
                    "fr": "Les données historiques montrent qu'environ 80 % des particuliers sur les actions A perdent de l'argent sur toute période de trois ans, tandis que les investisseurs institutionnels (fonds, maisons de courtage) gagnent régulièrement. Cet écart structurel vient de l'asymétrie d'information, des économies d'échelle et de l'expertise professionnelle. C'est précisément pour cela que nous avons créé Best Friend Stock : donner aux étudiants de meilleurs outils et de meilleures connaissances avant qu'ils n'investissent de l'argent réel.",
                },
                "exam_tip": {
                    "ja": "ウォーレン・バフェットの言葉：「10年間持ち続ける気がない株なら、10分間でも持とうと考えるべきではない」。短期の値動きを一貫して正確に予測できる人はいません。長期の視点を身につけることが、損失を繰り返さないための最も効果的な方法です。",
                    "ko": "워런 버핏: '10년 동안 보유할 생각이 없는 주식이라면 10분도 보유할 생각을 하지 마라.' 단기 가격 움직임을 꾸준히 정확하게 예측할 수 있는 사람은 없습니다. 장기적인 관점을 기르는 것이 반복되는 손실을 피하는 가장 효과적인 방법입니다.",
                    "fr": "Warren Buffett : « Si vous n'êtes pas prêt à détenir une action pendant dix ans, n'envisagez même pas de la détenir dix minutes. » Personne ne peut prévoir de façon régulière et précise les mouvements de prix à court terme. Adopter une perspective de long terme est le moyen le plus efficace d'éviter des pertes répétées.",
                },
            },
        ],
    },
    "stocks_7": {
        "title": {"ja": "分散投資", "ko": "분산 투자", "fr": "La diversification"},
        "sections": [
            {
                "heading": {"ja": "分散投資の原則", "ko": "분산 투자의 원칙", "fr": "Le principe de la diversification"},
                "body": {
                    "ja": "「卵を一つのカゴに盛るな」。相関の低い複数の資産を持つことで、期待リターンを必ずしも下げずに、非システマティック・リスク（個別企業や業種に固有のリスク）を減らせます。景気後退や地政学的な出来事で市場全体が下がるシステマティック・リスクは、分散では取り除けません。非システマティック・リスクは、異なる業種・企業の株を持つことで大きく減らせます。",
                    "ko": "'달걀을 한 바구니에 담지 마라.' 상관관계가 낮은 여러 자산을 보유하면 기대수익을 꼭 낮추지 않고도 비체계적 위험(개별 기업이나 업종 고유의 위험)을 줄일 수 있습니다. 경기 침체나 지정학적 사건으로 시장 전체가 하락하는 체계적 위험은 분산으로 없앨 수 없습니다. 비체계적 위험은 여러 업종과 기업의 주식을 보유함으로써 크게 줄일 수 있습니다.",
                    "fr": "« Ne mettez pas tous vos œufs dans le même panier » : détenir plusieurs actifs peu corrélés réduit le risque spécifique (propre à une entreprise ou à un secteur) sans forcément diminuer le rendement espéré. Le risque systématique (la baisse de tout le marché lors d'une récession ou d'une crise géopolitique) ne peut pas être éliminé par la diversification. Le risque spécifique, lui, se réduit fortement en détenant des actions de secteurs et d'entreprises différents.",
                },
                "real_world": {
                    "ja": "2021年、営利目的の学習塾を禁じた政府の「双減」政策により、中国の教育関連株（新東方、TALエデュケーション）は80%以上下落しました。教育株に集中していた投資家は壊滅的な損失を被りましたが、白酒・新エネルギー・銀行などに分散していた投資家は大きな被害を免れました。業種分散の力を示す例です。",
                    "ko": "2021년, 영리 목적의 사교육을 금지한 정부의 '쌍감(双减)' 정책으로 중국 교육주(신동방, TAL 에듀케이션)는 80% 넘게 폭락했습니다. 교육주에 집중 투자한 투자자는 막대한 손실을 입었지만, 바이주·신에너지·은행 등에 나누어 투자한 사람들은 대부분 피해를 피했습니다. 업종 분산의 힘을 보여 주는 사례입니다.",
                    "fr": "En 2021, les valeurs chinoises de l'éducation (New Oriental, TAL Education) ont chuté de plus de 80 % après la politique de « double réduction » interdisant le soutien scolaire à but lucratif. Les investisseurs concentrés sur ce secteur ont subi des pertes catastrophiques, tandis que ceux qui détenaient un mélange de baijiu, d'énergies nouvelles et de banques ont été largement protégés : la preuve de l'efficacité de la diversification sectorielle.",
                },
            },
            {
                "heading": {"ja": "時間の分散（ドル・コスト平均法）", "ko": "시간 분산(적립식 투자)",
                            "fr": "La diversification dans le temps (investissement programmé)"},
                "body": {
                    "ja": "ドル・コスト平均法（DCA）とは、相場に関係なく一定額を定期的に（例えば毎月）投資する方法です。価格が高いときは少なく、下がったときは多く買えるため、平均取得単価は自然と市場の平均より低くなります。相場の天井で一括投資してしまうリスクをなくせます。",
                    "ko": "적립식 투자(DCA)는 시장 상황과 관계없이 일정 금액을 정기적으로(예: 매달) 투자하는 방법입니다. 가격이 높을 때는 적게, 떨어졌을 때는 많이 사게 되므로 평균 매입 단가가 자연스럽게 시장 평균보다 낮아집니다. 고점에서 목돈을 한꺼번에 투자하는 위험을 없애 줍니다.",
                    "fr": "L'investissement programmé (DCA, « dollar cost averaging ») consiste à investir un montant fixe à intervalles réguliers (par exemple chaque mois), quelles que soient les conditions de marché. Quand les prix sont élevés, vous achetez moins de parts ; quand ils baissent, vous en achetez plus : votre coût moyen se retrouve naturellement sous la moyenne du marché. Cela supprime le risque d'investir une grosse somme au sommet.",
                },
                "real_world": {
                    "ja": "2018年から2023年まで、相場に関係なく毎月1,000元をCSI300指数ファンドに投資すると、年率約8〜10%のリターンが得られました。タイミングを計ろうとした大半の個人投資家を大きく上回る結果です。インデックスファンド＋積立は、学術研究とウォーレン・バフェットの両方が個人投資家に勧める方法です。",
                    "ko": "2018년부터 2023년까지 시장 상황과 관계없이 매달 1,000위안을 CSI 300 인덱스 펀드에 투자했다면 연 8~10% 정도의 수익을 얻었을 것입니다. 시장 타이밍을 노린 대부분의 개인 투자자보다 훨씬 나은 결과입니다. 인덱스 펀드 + 적립식 투자는 학계 연구와 워런 버핏 모두가 개인 투자자에게 권하는 방법입니다.",
                    "fr": "Investir 1 000 yuans par mois dans un fonds indiciel CSI 300 de 2018 à 2023, quelles que soient les conditions de marché, a rapporté environ 8 à 10 % par an, bien mieux que la plupart des particuliers qui ont tenté d'anticiper le marché. Fonds indiciels + investissement programmé : c'est l'approche que recommandent à la fois la recherche académique et Warren Buffett aux investisseurs individuels.",
                },
                "exam_tip": {
                    "ja": "分散はリスクを減らしますが、市場を上回る超過リターンの可能性も抑えます。十分に分散したポートフォリオのリターンは、ほぼ市場平均になります。個別株の研究に多くの時間を割けない学生にとっては、インデックスファンド＋積立が最も適した出発点です。",
                    "ko": "분산은 위험을 줄이지만 초과 수익의 가능성도 제한합니다. 충분히 분산된 포트폴리오는 대체로 시장 평균 수익을 냅니다. 개별 종목을 연구할 시간이 많지 않은 학생에게는 인덱스 펀드 + 적립식 투자가 가장 알맞은 출발점입니다.",
                    "fr": "La diversification réduit le risque mais limite aussi les rendements supérieurs au marché. Un portefeuille bien diversifié rapporte à peu près la moyenne du marché. Pour les étudiants qui n'ont pas beaucoup de temps pour étudier les titres un par un, fonds indiciels + investissement programmé est le point de départ le plus adapté.",
                },
            },
        ],
    },
    "stocks_8": {
        "title": {"ja": "Best Friend Stock で分析する", "ko": "Best Friend Stock으로 분석하기",
                  "fr": "Analyser avec Best Friend Stock"},
        "sections": [
            {
                "heading": {"ja": "類似トレンドとニュースセンチメント", "ko": "유사 추세와 뉴스 감성 분석",
                            "fr": "Tendances similaires et sentiment des actualités"},
                "body": {
                    "ja": "「類似トレンド」機能は、対象銘柄と値動きの相関が高い銘柄を探します。対象銘柄と類似銘柄が一緒に上下していれば、業界全体の動き（マクロや業界要因によるもの）を示します。類似銘柄が横ばいなのに対象銘柄だけが上がっていれば、その企業固有の好材料を示唆し、より強く明確なシグナルになります。「ニュースセンチメント」機能は、銘柄に関する中国語と英語のニュースを集め、AIで各記事をポジティブ・中立・ネガティブに分類して、市場の受け止め方をすばやく把握できるようにします。",
                    "ko": "'유사 추세' 기능은 대상 종목과 가격 움직임의 상관관계가 높은 종목을 찾아 줍니다. 대상 종목과 유사 종목이 함께 오르내리면 업종 전체의 움직임(거시나 산업 요인)을 뜻합니다. 유사 종목은 제자리인데 대상 종목만 오르면 회사 고유의 호재를 시사하며, 더 강하고 분명한 신호입니다. '뉴스 감성' 기능은 종목에 관한 중국어·영어 뉴스를 모아 AI로 각 기사를 긍정·중립·부정으로 평가해, 시장의 인식을 빠르게 파악하게 해 줍니다.",
                    "fr": "L'outil Tendances similaires trouve les actions dont les mouvements de prix sont fortement corrélés à ceux du titre étudié. Si le titre et ses pairs montent et baissent ensemble, c'est un mouvement de tout le secteur (lié à des facteurs macroéconomiques ou sectoriels). Si le titre monte seul alors que ses pairs stagnent, cela suggère une bonne nouvelle propre à l'entreprise, un signal plus fort et plus net. L'outil Sentiment des actualités rassemble les articles en chinois et en anglais sur un titre et utilise l'IA pour classer chacun comme positif, neutre ou négatif, ce qui donne un aperçu rapide de la perception du marché.",
                },
                "real_world": {
                    "ja": "茅台（600519）を検索して、類似トレンドに五糧液・瀘州老窖・剣南春がそろって上昇していると表示されれば、茅台固有の材料ではなく白酒業界全体の上昇を示します。あるテック株が類似銘柄を置いて独自に上昇し、ニュースセンチメントにAI関連の好意的な報道が表示されていれば、その銘柄固有の投資シナリオはずっと明確で、行動に移しやすくなります。",
                    "ko": "마오타이(600519)를 검색했을 때 유사 추세에서 우량예, 루저우라오자오, 젠난춘이 함께 오르고 있다면, 마오타이만의 재료가 아니라 바이주 업종 전체의 상승을 뜻합니다. 어떤 기술주가 유사 종목과 달리 혼자 오르고 뉴스 감성에서 AI 관련 긍정 보도가 보인다면, 그 종목만의 투자 논리가 훨씬 분명하고 실행하기 쉬워집니다.",
                    "fr": "Recherchez Moutai (600519) : si les Tendances similaires montrent Wuliangye, Luzhou Laojiao et Jiannanchun en hausse ensemble, c'est un rallye de tout le secteur du baijiu plutôt qu'un catalyseur propre à Moutai. Si une valeur technologique monte alors que ses pairs ne bougent pas, et que le Sentiment des actualités montre une couverture positive liée à l'IA, la thèse sur ce titre précis est bien plus claire et exploitable.",
                },
            },
            {
                "heading": {"ja": "模擬トレード機能", "ko": "모의 투자 기능", "fr": "Le simulateur de trading"},
                "body": {
                    "ja": "模擬トレードでは、実際のA株ルールのもとで100万元の仮想資金を運用できます。T+1決済（当日買った株は翌日にならないと売れません）、買い手数料0.03%（最低5元）、印紙税込みの売り手数料0.13%（最低5元）、売買は100株単位です。実際のお金のリスクを負わずに、A株の売買の流れとコスト構造をひととおり体験できます。",
                    "ko": "모의 투자에서는 실제 A주 규칙에 따라 100만 위안의 가상 자금을 운용합니다. T+1 결제(오늘 산 주식은 내일부터 팔 수 있음), 매수 수수료 0.03%(최소 5위안), 인지세 포함 매도 수수료 0.13%(최소 5위안), 100주 단위 거래가 적용됩니다. 실제 금전적 위험 없이 A주 거래의 전 과정과 비용 구조를 경험할 수 있습니다.",
                    "fr": "Le simulateur vous donne 1 000 000 de yuans virtuels avec les vraies règles des actions A : règlement en T+1 (une action achetée aujourd'hui ne peut être vendue que demain), commission à l'achat de 0,03 % (minimum 5 ¥), commission à la vente de 0,13 % droit de timbre compris (minimum 5 ¥), et des ordres par multiples de 100 actions. Vous découvrez tout le processus de négociation et la structure des coûts sans aucun risque financier réel.",
                },
                "real_world": {
                    "ja": "A株の手数料の例：10万元分の株を買うと買い手数料は30元、売り手数料（印紙税込み）は130元で、往復のコストは160元です。株価が0.1%（100元）しか上がらなければ、実際には60元の損になります。頻繁な売買が個人投資家の損失の大きな原因の一つである理由です。取引コストは静かにリターンを削っていきます。",
                    "ko": "A주 수수료 예: 10만 위안어치 주식을 사면 매수 수수료는 30위안, 매도 수수료(인지세 포함)는 130위안으로 왕복 비용은 160위안입니다. 주가가 0.1%(100위안)만 올랐다면 실제로는 60위안 손해입니다. 잦은 매매가 개인 투자자 손실의 큰 원인 중 하나인 이유입니다. 거래 비용은 소리 없이 수익을 갉아먹습니다.",
                    "fr": "Exemple de frais sur les actions A : pour 100 000 yuans d'actions achetées, la commission d'achat est de 30 yuans et la commission de vente de 130 yuans (droit de timbre compris), soit 160 yuans pour l'aller-retour. Si le titre ne monte que de 0,1 % (100 yuans), vous perdez en réalité 60 yuans. C'est pourquoi les transactions trop fréquentes comptent parmi les principales causes de pertes des particuliers : les frais rongent silencieusement vos gains.",
                },
                "exam_tip": {
                    "ja": "初心者の方には、本物のお金を投資する前に少なくとも1〜3か月は模擬トレードをすることをおすすめします。この期間に、銘柄選びの考え方、ポジションの大きさ、損切りのルールといった自分の投資の枠組みをつくりましょう。リターンだけでなく、一つひとつの取引の理由も記録してください。自分の判断を振り返ることこそ、本物の投資家が上達する方法です。",
                    "ko": "초보자라면 실제 돈을 투자하기 전에 최소 1~3개월은 모의 투자를 해 보길 권합니다. 이 기간에 종목 선택 논리, 투자 비중, 손절 규칙 같은 자신만의 투자 틀을 만드세요. 수익률뿐 아니라 매매마다의 이유도 기록하세요. 자신의 결정을 되돌아보는 것이 진짜 투자자가 성장하는 방법입니다.",
                    "fr": "Nous recommandons à tous les débutants de s'entraîner au moins un à trois mois sur le simulateur avant d'investir de l'argent réel. Profitez-en pour construire votre cadre d'investissement : logique de sélection des titres, taille des positions et règles de stop-loss. Notez non seulement vos résultats mais aussi la raison de chaque transaction : c'est en réfléchissant à leurs décisions que les vrais investisseurs progressent.",
                },
            },
        ],
    },
}
