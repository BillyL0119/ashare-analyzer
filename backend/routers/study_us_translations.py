# ja / ko / fr translations for study_us.US_PAPER.
# Structure: topic_id -> {"title": {lang: str}, "sections": [{field: {lang: str}}]}

US_PAPER_TITLE = {"ja": "米国株", "ko": "미국 주식", "fr": "Actions américaines"}

US_TRANSLATIONS = {
    "us_1": {
        "title": {"ja": "米国市場のしくみ", "ko": "미국 시장의 작동 방식", "fr": "Le fonctionnement du marché américain"},
        "sections": [
            {
                "heading": {"ja": "取引所・ティッカー・取引時間", "ko": "거래소, 티커, 거래 시간", "fr": "Bourses, tickers et horaires de négociation"},
                "body": {
                    "ja": "米国株は主にニューヨーク証券取引所（NYSE）とナスダックで取引されます。各社には1〜5文字のティッカーがあり、アップルはAAPL、エヌビディアはNVDAです。通常取引は米東部時間の月〜金 9:30〜16:00。これに加えてプレマーケット（約4:00〜9:30）とアフターアワーズ（16:00〜20:00）があり、出来高が少なく売買価格差が広く、価格が大きく動きやすいのが特徴です。祝日は休場で、感謝祭の翌日など一部の日は13:00に早めに終了します。",
                    "ko": "미국 주식은 주로 뉴욕증권거래소(NYSE)와 나스닥에서 거래됩니다. 각 회사에는 1~5글자의 티커가 있으며, 애플은 AAPL, 엔비디아는 NVDA입니다. 정규장은 미 동부 시간 월~금 9:30~16:00입니다. 이외에 프리마켓(약 4:00~9:30)과 애프터마켓(16:00~20:00)이 있는데, 거래량이 적고 호가 차이가 크며 가격이 급변할 수 있습니다. 공휴일에는 휴장하고, 추수감사절 다음 날 등 일부 날에는 13:00에 일찍 마감합니다.",
                    "fr": "Les actions américaines se négocient principalement sur le New York Stock Exchange (NYSE) et le Nasdaq. Chaque entreprise possède un ticker de une à cinq lettres, par exemple AAPL pour Apple ou NVDA pour Nvidia. La séance régulière se déroule de 9h30 à 16h00, heure de l'Est, du lundi au vendredi. Il existe aussi une séance pré-ouverture (environ 4h00–9h30) et après-clôture (16h00–20h00), où les volumes sont faibles, les écarts acheteur-vendeur larges et les prix très volatils. La Bourse ferme les jours fériés, et certains jours, comme le lendemain de Thanksgiving, elle ferme plus tôt, à 13h00.",
                },
                "real_world": {
                    "ja": "決算は通常、引け後に発表されるため、株価はアフターアワーズで大きく動き、翌日の寄り付きでさらに調整されることがよくあります。",
                    "ko": "실적은 보통 장 마감 후에 발표되므로, 주가는 시간외 거래에서 크게 움직이고 다음 날 시가에서 다시 조정되는 경우가 많습니다.",
                    "fr": "Les résultats sont généralement publiés après la clôture ; le cours bouge donc souvent fortement après la séance, puis continue de s'ajuster à l'ouverture suivante.",
                },
                "exam_tip": {
                    "ja": "通常時間と時間外を区別しましょう。時間外は流動性が低いため、成行注文より指値注文の方が安全です。",
                    "ko": "정규 시간과 시간외를 구분하세요. 시간외에는 유동성이 낮아 시장가 주문보다 지정가 주문이 더 안전합니다.",
                    "fr": "Distinguez les heures régulières des heures étendues. La liquidité est faible hors séance régulière : un ordre à cours limité est plus sûr qu'un ordre au marché.",
                },
            },
            {
                "heading": {"ja": "A株との主な違い", "ko": "A주와의 주요 차이점", "fr": "Principales différences avec les actions A"},
                "body": {
                    "ja": "米国株には1日の値幅制限がなく、個別株が1日で20%以上動くこともあります。ただし市場全体にはサーキットブレーカーがあり、S&P 500が1日で7%・13%下落すると取引が一時停止され、20%下落するとその日は取引終了となります。決済は2024年5月からT+1で、買った当日に売ることもできます（A株のように翌日まで売れない制限はありません）。端株（フラクショナル）取引ができる証券会社も多く、空売りも可能です。色の慣習はA株と逆で、米国では通常、緑が上昇、赤が下落です。",
                    "ko": "미국 주식에는 일일 가격 제한폭이 없어서 개별 종목이 하루에 20% 이상 오르내릴 수 있습니다. 다만 시장 전체에는 서킷브레이커가 있어, S&P 500이 하루에 7%, 13% 하락하면 거래가 일시 중단되고 20% 하락하면 그날 거래가 종료됩니다. 결제는 2024년 5월부터 T+1이며, 산 당일에 팔 수도 있습니다(A주처럼 다음 날에야 팔 수 있는 제한이 없습니다). 소수점 거래를 지원하는 증권사도 많고 공매도도 가능합니다. 색 관례는 A주와 반대로, 미국에서는 보통 초록이 상승, 빨강이 하락입니다.",
                    "fr": "Les actions américaines n'ont pas de limite de variation quotidienne : un titre peut gagner ou perdre plus de 20 % en une journée. Le marché dans son ensemble dispose en revanche de coupe-circuits : la cotation est suspendue lorsque le S&P 500 recule de 7 % puis de 13 % dans la journée, et arrêtée pour la journée à 20 %. Le règlement-livraison se fait en T+1 (depuis mai 2024) et l'on peut revendre le jour même, contrairement à la règle des actions A où les titres achetés aujourd'hui ne peuvent être vendus que demain. De nombreux courtiers proposent des fractions d'actions, et la vente à découvert est possible. La convention de couleurs est inverse de celle des actions A : en général, vert = hausse et rouge = baisse.",
                },
                "real_world": {
                    "ja": "2020年3月、米国株は10日間で4回サーキットブレーカーが発動し、極端な相場では制度が直接介入することを示しました。",
                    "ko": "2020년 3월, 미국 증시는 열흘 동안 네 차례 서킷브레이커가 발동되어, 극단적인 장세에서는 제도가 직접 개입함을 보여 주었습니다.",
                    "fr": "En mars 2020, les marchés américains ont déclenché quatre fois les coupe-circuits en dix jours, ce qui montre comment les règles interviennent lors de mouvements extrêmes.",
                },
                "exam_tip": {
                    "ja": "市場を比較するときは、値幅制限・決済サイクル・空売りの可否・取引時間の4つの観点で答えましょう。",
                    "ko": "시장을 비교할 때는 가격 제한폭, 결제 주기, 공매도 여부, 거래 시간의 네 가지 관점에서 답하세요.",
                    "fr": "Pour comparer des marchés, répondez selon quatre axes : limites de variation, cycle de règlement, vente à découvert et horaires de négociation.",
                },
            },
        ],
    },
    "us_2": {
        "title": {"ja": "株価指数とETF", "ko": "주가지수와 ETF", "fr": "Indices et ETF"},
        "sections": [
            {
                "heading": {"ja": "4大指数の読み方", "ko": "4대 지수 읽는 법", "fr": "Lire les quatre grands indices"},
                "body": {
                    "ja": "S&P 500は米国の大型株500社で構成され、時価総額加重で、「米国株全体」を示す最も一般的な指標です。ナスダック総合指数はテクノロジー株の比率が高いのが特徴です。ダウ平均は30銘柄のみで株価加重、歴史は最も古いものの代表性は劣ります。ラッセル2000は小型株を表し、景気や金利に敏感です。指数を見るときは騰落率と値上がり銘柄数の両方を確認しましょう。指数が上昇していても下落銘柄の方が多ければ、上昇は少数の大型株に集中しています。",
                    "ko": "S&P 500은 미국 대형주 500개로 구성되며 시가총액 가중 방식으로, '미국 증시 전체'를 나타내는 가장 일반적인 지표입니다. 나스닥 종합지수는 기술주 비중이 높습니다. 다우존스 산업평균지수는 30개 종목뿐이고 주가 가중 방식이며, 역사는 가장 오래되었지만 대표성은 떨어집니다. 러셀 2000은 소형주를 대표하며 경기와 금리에 더 민감합니다. 지수를 볼 때는 등락률과 상승 종목 수를 함께 보세요. 지수는 올랐는데 하락 종목이 더 많다면, 상승이 소수의 대형주에 집중된 것입니다.",
                    "fr": "Le S&P 500 regroupe 500 grandes entreprises américaines, pondérées par leur capitalisation, et constitue la mesure la plus courante du marché américain. Le Nasdaq Composite est orienté vers la technologie. Le Dow Jones Industrial Average ne compte que 30 valeurs, pondérées par le cours ; c'est le plus ancien mais le moins représentatif. Le Russell 2000 suit les petites entreprises et réagit davantage à la conjoncture et aux taux. Regardez à la fois la variation de l'indice et la largeur du marché : si l'indice monte mais que plus de titres baissent, la hausse est concentrée sur quelques grandes sociétés.",
                },
                "real_world": {
                    "ja": "近年はアップル、マイクロソフト、エヌビディアなど「マグニフィセント7」のS&P 500に占める比率が高く、その値動きが指数全体を大きく動かします。",
                    "ko": "최근에는 애플, 마이크로소프트, 엔비디아 등 '매그니피센트 7'이 S&P 500에서 차지하는 비중이 커서, 이들의 등락이 지수 전체를 좌우합니다.",
                    "fr": "Ces dernières années, les « Magnificent 7 » (Apple, Microsoft, Nvidia, etc.) pèsent lourd dans le S&P 500 ; leurs mouvements tirent donc l'ensemble de l'indice.",
                },
                "exam_tip": {
                    "ja": "時価総額加重と株価加重の違いを説明し、それぞれ指数の例を1つ挙げられるようにしましょう。",
                    "ko": "시가총액 가중과 주가 가중의 차이를 설명하고, 각각 지수 예를 하나씩 들 수 있어야 합니다.",
                    "fr": "Sachez expliquer la différence entre pondération par la capitalisation et par le cours, avec un exemple d'indice pour chacune.",
                },
            },
            {
                "heading": {"ja": "ETF：1回の取引でバスケットを買う", "ko": "ETF: 한 번의 거래로 바구니째 사기", "fr": "Les ETF : un panier de titres en un seul ordre"},
                "body": {
                    "ja": "ETF（上場投資信託）は株式のように取引所で売買できますが、中身は複数の資産のバスケットです。SPYやVOOはS&P 500に、QQQはナスダック100に連動し、XLKやXLFなどのセクターETFはテクノロジーや金融などの業種に対応します。ETFの利点は、分散効果、低コスト（年間の信託報酬は通常1%未満）、売買のしやすさです。個別株を調べる時間がない学生には、広く分散した指数ETFを定期的に積み立てる方法が一般的な入門です。",
                    "ko": "ETF(상장지수펀드)는 주식처럼 거래소에서 사고팔 수 있지만, 안에는 여러 자산이 바구니처럼 담겨 있습니다. SPY와 VOO는 S&P 500을, QQQ는 나스닥 100을 추종하고, XLK·XLF 같은 섹터 ETF는 기술·금융 등 업종에 해당합니다. ETF의 장점은 분산 투자, 낮은 비용(연간 보수는 보통 1% 미만), 쉬운 매매입니다. 개별 종목을 조사할 시간이 없는 학생에게는 폭넓은 지수 ETF를 정기적으로 적립식으로 사는 것이 일반적인 시작 방법입니다.",
                    "fr": "Un ETF (fonds indiciel coté) s'achète et se vend en Bourse comme une action, mais détient un panier d'actifs. SPY et VOO suivent le S&P 500, QQQ suit le Nasdaq-100, et les ETF sectoriels comme XLK et XLF couvrent la technologie ou la finance. Les ETF offrent de la diversification, des frais faibles (les frais annuels sont souvent inférieurs à 1 %) et une grande facilité de négociation. Pour un étudiant qui n'a pas le temps d'étudier des titres individuels, acheter régulièrement un ETF sur un indice large est un point de départ courant.",
                },
                "real_world": {
                    "ja": "本サイトの「セクター」の11個のタイルは、11本のセクターETF（XLK、XLF、XLEなど）の当日の騰落を表しています。",
                    "ko": "이 사이트의 '업종' 11개 타일은 11개 섹터 ETF(XLK, XLF, XLE 등)의 당일 등락을 나타냅니다.",
                    "fr": "Les 11 tuiles « Secteurs » de ce site correspondent à la variation du jour de 11 ETF sectoriels (XLK, XLF, XLE, etc.).",
                },
                "exam_tip": {
                    "ja": "ETFは利益を保証しません。個別株のリスクは分散できますが、市場全体が下がれば下落します。",
                    "ko": "ETF가 수익을 보장하는 것은 아닙니다. 개별 종목 위험은 분산되지만, 시장 전체가 하락하면 함께 하락합니다.",
                    "fr": "Un ETF ne garantit aucun gain : il supprime le risque d'un titre isolé, mais baisse quand tout le marché baisse.",
                },
            },
        ],
    },
    "us_3": {
        "title": {"ja": "決算シーズンとバリュエーション", "ko": "실적 시즌과 밸류에이션", "fr": "Saison des résultats et valorisation"},
        "sections": [
            {
                "heading": {"ja": "決算シーズンの見方", "ko": "실적 시즌 읽는 법", "fr": "Comment lire la saison des résultats"},
                "body": {
                    "ja": "米国の上場企業は四半期ごとに決算（10-Q）を、年1回は年次報告（10-K）を提出します。多くの企業は1・4・7・10月の後の数週間に集中して発表し、この期間を決算シーズンと呼びます。市場が注目するのは、1株利益（EPS）と売上高がアナリスト予想を上回ったか、そして次の四半期に向けた会社のガイダンスです。株価の反応は絶対的な良し悪しではなく「予想との比較」で決まります。増益でも予想に届かなければ、株価は下がることがあります。",
                    "ko": "미국 상장사는 분기마다 실적(10-Q)을, 연 1회 연간 보고서(10-K)를 제출합니다. 대부분의 기업은 1·4·7·10월 이후 몇 주 안에 발표하며, 이 기간을 실적 시즌이라고 합니다. 시장이 주목하는 것은 주당순이익(EPS)과 매출이 애널리스트 예상을 넘었는지, 그리고 다음 분기에 대한 회사의 가이던스입니다. 주가 반응은 절대적인 좋고 나쁨이 아니라 '예상 대비'로 결정됩니다. 이익이 늘어도 예상에 못 미치면 주가가 떨어질 수 있습니다.",
                    "fr": "Les sociétés cotées aux États-Unis publient leurs résultats chaque trimestre (formulaire 10-Q) et une fois par an (10-K). La plupart le font dans les semaines qui suivent janvier, avril, juillet et octobre : c'est la saison des résultats. Le marché regarde si le bénéfice par action (BPA) et le chiffre d'affaires dépassent les attentes des analystes, ainsi que les prévisions (guidance) de l'entreprise pour le trimestre suivant. Le cours réagit aux résultats par rapport aux attentes, et non à leur qualité absolue : les bénéfices peuvent progresser et l'action baisser si les attentes ne sont pas atteintes.",
                },
                "real_world": {
                    "ja": "利益が20%伸びても、市場の予想が30%なら、決算発表後に株価が大きく下がることがあります。",
                    "ko": "이익이 20% 늘어도 시장 예상이 30%였다면, 실적 발표 후 주가가 크게 하락할 수 있습니다.",
                    "fr": "Une entreprise peut augmenter son bénéfice de 20 % et chuter fortement si le marché en attendait 30 %.",
                },
                "exam_tip": {
                    "ja": "株価の反応を説明するときは「期待とのギャップ」を使いましょう。結果そのものではなく、市場の織り込みとの差です。",
                    "ko": "주가 반응을 설명할 때는 '기대와의 차이'를 사용하세요. 결과 자체가 아니라, 시장이 이미 반영한 수준과의 차이입니다.",
                    "fr": "Pour expliquer une réaction du cours, utilisez l'écart par rapport aux attentes : la différence entre le résultat et ce que le marché avait déjà intégré.",
                },
            },
            {
                "heading": {"ja": "PERと時価総額", "ko": "PER과 시가총액", "fr": "Le PER et la capitalisation boursière"},
                "body": {
                    "ja": "時価総額＝株価×発行済み株式数で、市場が会社をどれだけの価値と見ているかを示します。株価収益率（PER）＝株価÷1株利益で、現在の利益水準で何年分に相当するかの目安です。PERが高いのは、市場が将来の高成長を期待している（テック株など）ことが多く、低いのは成長が緩やかな成熟業種に多く見られます。PERは似た企業同士でしか比較できず、過去12か月の利益（TTM）なのか、予想（フォワードPER）なのかも確認が必要です。",
                    "ko": "시가총액 = 주가 × 발행 주식 수로, 시장이 회사를 얼마의 가치로 보는지를 나타냅니다. 주가수익비율(PER) = 주가 ÷ 주당순이익으로, 현재 이익 수준으로 몇 년 치에 해당하는지를 보여 줍니다. PER이 높으면 시장이 미래의 빠른 성장을 기대한다는 뜻인 경우가 많고(기술주 등), 낮으면 성장이 느린 성숙 업종에서 흔합니다. PER은 비슷한 기업끼리만 비교할 수 있으며, 최근 12개월 이익(TTM)인지 예상치(선행 PER)인지도 확인해야 합니다.",
                    "fr": "Capitalisation boursière = cours × nombre d'actions en circulation ; elle indique la valeur que le marché accorde à l'entreprise. Le ratio cours/bénéfice (PER) = cours ÷ bénéfice par action, soit le nombre d'années de bénéfices actuels que représente le cours. Un PER élevé signifie souvent que le marché attend une forte croissance (typique de la technologie), tandis qu'un PER bas est courant dans les secteurs matures à faible croissance. Le PER ne se compare qu'entre entreprises similaires, et il faut vérifier s'il repose sur les 12 derniers mois (TTM) ou sur des prévisions (PER prévisionnel).",
                },
                "real_world": {
                    "ja": "本サイトの個別株ページではPERと時価総額を確認でき、アップルとマイクロソフトを並べて比較できます。",
                    "ko": "이 사이트의 종목 상세 페이지에서 PER과 시가총액을 바로 볼 수 있어, 애플과 마이크로소프트를 나란히 비교할 수 있습니다.",
                    "fr": "La page détail d'une action sur ce site affiche le PER et la capitalisation ; vous pouvez ainsi comparer Apple et Microsoft.",
                },
                "exam_tip": {
                    "ja": "異なる業種のPERを比べないこと、そして高いPERをそのまま「割高」と決めつけないことが大切です。",
                    "ko": "서로 다른 업종의 PER을 비교하지 말고, 높은 PER을 곧바로 '비싸다'고 단정하지 마세요.",
                    "fr": "Ne comparez pas les PER de secteurs différents, et ne considérez pas un PER élevé comme automatiquement cher.",
                },
            },
        ],
    },
    "us_4": {
        "title": {"ja": "空売り・レバレッジ・リスク", "ko": "공매도, 레버리지, 위험", "fr": "Vente à découvert, effet de levier et risque"},
        "sections": [
            {
                "heading": {"ja": "空売りとは", "ko": "공매도란", "fr": "Qu'est-ce que la vente à découvert ?"},
                "body": {
                    "ja": "空売りとは、証券会社から株を借りて売り、価格が下がってから買い戻して返却し、差額を得る取引です。価格が上がれば、より高い価格で買い戻すことになり損失になります。買い持ちの最大損失は投資額（株価がゼロ）ですが、空売りの理論上の損失には上限がありません。株価はいくらでも上がり得るからです。株を借りる際には金利もかかり、貸株が少ないと空売り側が一斉に買い戻しを迫られ、ショートスクイーズが起きることがあります。",
                    "ko": "공매도는 증권사에서 주식을 빌려 먼저 팔고, 가격이 내려간 뒤 다시 사서 갚아 차익을 얻는 거래입니다. 가격이 오르면 더 비싸게 되사야 하므로 손실이 납니다. 매수 포지션의 최대 손실은 투자 원금(주가가 0이 되는 경우)이지만, 공매도의 이론상 손실에는 한도가 없습니다. 주가는 끝없이 오를 수 있기 때문입니다. 주식을 빌릴 때는 이자도 내야 하고, 많은 공매도 세력이 한꺼번에 되사야 하면 숏 스퀴즈가 일어날 수 있습니다.",
                    "fr": "La vente à découvert consiste à emprunter des actions à un courtier et à les vendre, puis à les racheter plus tard à un prix plus bas pour les rendre, en empochant la différence. Si le cours monte, il faut racheter plus cher et l'on perd de l'argent. Une position acheteuse perd au maximum sa mise (le cours tombe à zéro), alors que la perte d'une position vendeuse n'a, en théorie, aucune limite, car un cours peut monter indéfiniment. L'emprunt de titres coûte aussi des intérêts, et lorsque de nombreux vendeurs à découvert doivent racheter en même temps, cela peut provoquer un short squeeze.",
                },
                "real_world": {
                    "ja": "2021年1月、個人投資家がゲームストップ（GME）を大量に買い、株価は2週間で十数倍に。多くの空売り勢が高値で買い戻しを迫られ、大きな損失を出しました。",
                    "ko": "2021년 1월, 개인 투자자들이 게임스톱(GME)을 대거 매수해 주가가 2주 만에 십수 배로 올랐고, 많은 공매도 세력이 높은 가격에 되사야 해서 큰 손실을 입었습니다.",
                    "fr": "En janvier 2021, des investisseurs particuliers ont acheté massivement GameStop (GME) : le cours a été multiplié en deux semaines, obligeant les vendeurs à découvert à racheter à prix élevé et à subir de lourdes pertes.",
                },
                "exam_tip": {
                    "ja": "「なぜ空売りの方がリスクが高いか」には、損失が無限・貸株金利がかかる・踏み上げ（スクイーズ）の可能性、の3点で答えましょう。",
                    "ko": "'공매도가 왜 더 위험한가'에는 손실 무한대, 대차 이자 부담, 숏 스퀴즈 가능성의 세 가지로 답하세요.",
                    "fr": "À la question « pourquoi la vente à découvert est-elle plus risquée ? », répondez : pertes illimitées, coût d'emprunt des titres et risque de squeeze.",
                },
            },
            {
                "heading": {"ja": "レバレッジと学生投資家の基本ルール", "ko": "레버리지와 학생 투자자의 기본 원칙", "fr": "Effet de levier et règles de base pour un étudiant"},
                "body": {
                    "ja": "レバレッジ（信用取引）は、借りたお金でポジションを大きくする仕組みです。利益も大きくなりますが損失も大きくなり、損失が一定割合を超えると証券会社に強制決済されます。オプションやレバレッジETFも値動きを増幅するため、初心者がいきなり使うのには向きません。堅実な原則は次のとおりです。失っても生活に影響しない余裕資金だけを使う。模擬取引で少なくとも1〜3か月練習する。複数の業種に分散する。事前に損切りラインを決める。SNSの話題に飛びついて高値を追わない。本サイトの内容は学習目的であり、投資助言ではありません。",
                    "ko": "레버리지(증거금 거래)는 빌린 돈으로 포지션을 키우는 방식입니다. 수익도 커지지만 손실도 커지며, 손실이 일정 비율을 넘으면 증권사가 강제로 청산합니다. 옵션과 레버리지 ETF도 변동을 증폭시키므로 초보자가 바로 쓰기에는 적합하지 않습니다. 비교적 안전한 원칙은 다음과 같습니다. 잃어도 생활에 지장이 없는 여유 자금만 사용하기, 모의투자로 최소 1~3개월 연습하기, 여러 업종에 분산하기, 미리 손절 기준 정하기, SNS의 인기 소문을 쫓아 고점에 사지 않기. 이 사이트의 내용은 학습용이며 투자 조언이 아닙니다.",
                    "fr": "L'effet de levier (marge) permet de prendre une position plus grande avec de l'argent emprunté : les gains sont plus importants, mais les pertes aussi, et un courtier liquide votre position de force si les pertes dépassent un seuil. Les options et les ETF à effet de levier amplifient aussi les variations et ne conviennent pas aux débutants. Quelques règles de bon sens : n'utiliser que de l'argent que l'on peut se permettre de perdre ; s'entraîner au moins 1 à 3 mois en simulation ; se diversifier entre secteurs ; fixer un stop-loss à l'avance ; ne pas courir après les tuyaux des réseaux sociaux. Tout le contenu de ce site est destiné à l'apprentissage et ne constitue pas un conseil en investissement.",
                },
                "real_world": {
                    "ja": "本サイトの模擬取引は米国株が初期設定で、仮想資金を使って売買・損益・手数料を、実際のリスクなしで体験できます。",
                    "ko": "이 사이트의 모의투자는 기본값이 미국 주식이며, 가상 자금으로 매매, 손익, 수수료를 실제 위험 없이 체험할 수 있습니다.",
                    "fr": "L'onglet de simulation de ce site utilise par défaut les actions américaines et vous donne des fonds virtuels pour vous exercer à acheter, vendre et mesurer les coûts, sans risque réel.",
                },
                "exam_tip": {
                    "ja": "レバレッジがリスクを大きくする仕組みを説明できるようにしましょう。損益の拡大、追証、強制決済です。",
                    "ko": "레버리지가 위험을 키우는 구조를 설명할 수 있어야 합니다. 손익 확대, 추가 증거금 요구, 강제 청산입니다.",
                    "fr": "Soyez capable de décrire comment l'effet de levier amplifie le risque : gains et pertes amplifiés, appel de marge et liquidation forcée.",
                },
            },
        ],
    },
}
