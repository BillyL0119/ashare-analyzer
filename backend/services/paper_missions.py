"""
Learning missions for paper trading: small steps that walk a new student from a first trade to
risk control and competitions. Progress is worked out from the account itself (nothing extra
is stored), so it is always in step with what the student actually did.

Each mission has an `action` the clients map to a button: "buy" (order ticket), "limit" (ticket
on a limit order), "protect" (ticket on a stop order for a holding), "market" (switch market),
"nickname", "game", "short" (ticket on sell short) or None (just keep going).
"""

from datetime import datetime, timedelta

SIDES = ("buy", "sell", "short", "cover")
PREFIX = {"cn": "", "us": "us_", "hk": "hk_", "jp": "jp_"}

# id, action, {lang: (title, what you learn)}
MISSIONS = [
    ("first_trade", "buy", {
        "zh": ("完成第一笔交易", "用虚拟资金买入任意一只股票，看看下单、成交和持仓是怎么回事。"),
        "en": ("Make your first trade", "Buy any stock with virtual money and see how an order becomes a holding."),
        "ja": ("初めての取引", "仮想資金で好きな株を買い、注文が約定して保有になる流れを体験しましょう。"),
        "ko": ("첫 거래하기", "가상 자금으로 아무 주식이나 사서 주문이 체결되어 보유 종목이 되는 과정을 경험해 보세요."),
        "fr": ("Passez votre premier ordre", "Achetez une action avec de l'argent virtuel et voyez un ordre devenir une position."),
    }),
    ("limit_order", "limit", {
        "zh": ("下一个限价单", "限价单只在你设定的价格或更好时成交，学会控制买入价格。"),
        "en": ("Place a limit order", "A limit order only fills at your price or better: you control what you pay."),
        "ja": ("指値注文を出す", "指値注文は指定価格かそれより有利な価格でしか約定しません。買値を自分で決める練習です。"),
        "ko": ("지정가 주문 넣기", "지정가 주문은 정한 가격이나 더 유리한 가격에서만 체결됩니다. 매수 가격을 직접 정해 보세요."),
        "fr": ("Passez un ordre à cours limité", "Il ne s'exécute qu'à votre prix ou mieux : vous maîtrisez le prix payé."),
    }),
    ("diversify", "buy", {
        "zh": ("同时持有 3 只股票", "把资金分散到不同公司，单只股票大跌时账户不会受伤太重。"),
        "en": ("Hold 3 different stocks", "Spreading money across companies means one bad day for a stock hurts less."),
        "ja": ("3銘柄を同時に保有", "資金を複数の会社に分けると、1銘柄の急落による影響が小さくなります。"),
        "ko": ("3개 종목 동시 보유", "여러 회사에 나눠 투자하면 한 종목이 급락해도 계좌 피해가 줄어듭니다."),
        "fr": ("Détenez 3 actions différentes", "Répartir son argent limite l'impact d'une mauvaise journée sur une seule action."),
    }),
    ("protect", "protect", {
        "zh": ("给持仓设一个止损单", "提前设好止损或追踪止损，价格跌到你能接受的底线时自动卖出。"),
        "en": ("Protect a holding with a stop", "A stop or trailing stop sells automatically if the price falls to the level you chose."),
        "ja": ("逆指値で保有株を守る", "逆指値やトレーリングストップを置くと、決めた水準まで下がったとき自動で売れます。"),
        "ko": ("스톱 주문으로 보유 종목 지키기", "스톱이나 트레일링 스톱을 걸어 두면 정한 가격까지 떨어질 때 자동으로 팝니다."),
        "fr": ("Protégez une position avec un stop", "Un stop vend automatiquement si le cours tombe au niveau choisi."),
    }),
    ("profit_sell", None, {
        "zh": ("卖出一笔盈利的交易", "低买高卖并真正卖出，浮盈才会变成已实现收益。"),
        "en": ("Close a trade at a profit", "A gain only becomes real when you sell: buy low, sell higher."),
        "ja": ("利益の出た取引を決済", "含み益は売って初めて実現益になります。安く買って高く売りましょう。"),
        "ko": ("수익 난 거래 정리하기", "평가 이익은 팔아야 실현 이익이 됩니다. 싸게 사서 비싸게 팔아 보세요."),
        "fr": ("Clôturez une position en gain", "Un gain n'est réel qu'une fois vendu : acheter bas, vendre plus haut."),
    }),
    ("two_markets", "market", {
        "zh": ("在两个市场交易", "试试美股、A 股、港股或日股中的另一个市场，感受不同的交易规则。"),
        "en": ("Trade in two markets", "Try another of the US, China A-share, Hong Kong and Japan markets and compare their rules."),
        "ja": ("2つの市場で取引", "米国・中国A株・香港・日本のうち別の市場でも取引し、ルールの違いを比べましょう。"),
        "ko": ("두 시장에서 거래하기", "미국, 중국 A주, 홍콩, 일본 중 다른 시장에서도 거래해 규칙 차이를 비교해 보세요."),
        "fr": ("Investissez sur deux marchés", "Essayez un autre marché (US, actions A, Hong Kong, Japon) et comparez les règles."),
    }),
    ("hold_week", None, {
        "zh": ("持有一只股票满一周", "短期涨跌很难预测，耐心持有是长期投资的基本功。"),
        "en": ("Hold a stock for a week", "Short swings are hard to call; patience is the basic skill of long-term investing."),
        "ja": ("1銘柄を1週間保有", "短期の値動きは読みにくいもの。じっくり持つことが長期投資の基本です。"),
        "ko": ("한 종목 일주일 보유하기", "단기 등락은 예측하기 어렵습니다. 꾸준히 보유하는 것이 장기 투자의 기본입니다."),
        "fr": ("Gardez une action une semaine", "Les variations courtes sont imprévisibles ; la patience est la base de l'investissement."),
    }),
    ("nickname", "nickname", {
        "zh": ("设置昵称，登上排行榜", "起一个昵称，看看自己的收益在所有同学里排第几。"),
        "en": ("Pick a nickname for the leaderboard", "Choose a name and see where your return ranks among everyone."),
        "ja": ("ニックネームを設定", "名前を決めて、自分の収益が全体の何位かを確かめましょう。"),
        "ko": ("닉네임 정하기", "이름을 정하고 내 수익률이 전체에서 몇 위인지 확인해 보세요."),
        "fr": ("Choisissez un pseudo", "Donnez-vous un nom et voyez votre rang au classement."),
    }),
    ("game", "game", {
        "zh": ("加入或创建一场比赛", "和同学用同样的本金比赛，看谁的策略更稳。"),
        "en": ("Join or start a competition", "Compete with classmates on the same starting cash and see whose strategy holds up."),
        "ja": ("大会に参加または作成", "同じ元手でクラスメートと競い、どの戦略が強いか比べましょう。"),
        "ko": ("대회 참가 또는 만들기", "같은 원금으로 친구들과 겨뤄 누구의 전략이 더 탄탄한지 확인해 보세요."),
        "fr": ("Rejoignez ou créez une compétition", "Affrontez vos camarades avec le même capital et comparez vos stratégies."),
    }),
    ("short_sell", "short", {
        "zh": ("试一次卖空（美股）", "卖空在股价下跌时赚钱、上涨时亏钱，亏损没有上限，所以要格外小心。"),
        "en": ("Try a short sale (US)", "A short gains when the price falls and loses when it rises, with no cap on the loss."),
        "ja": ("空売りを試す（米国株）", "空売りは値下がりで利益、値上がりで損失。損失に上限がないので注意が必要です。"),
        "ko": ("공매도 해보기 (미국)", "공매도는 가격이 내리면 이익, 오르면 손실이며 손실에 상한이 없어 조심해야 합니다."),
        "fr": ("Essayez une vente à découvert (US)", "Elle gagne quand le cours baisse et perd quand il monte, sans limite de perte."),
    }),
]


def _books(account: dict):
    for m, p in PREFIX.items():
        yield m, {k: account.get(p + k) or ({} if k in ("portfolio", "shorts") else [])
                  for k in ("portfolio", "shorts", "transactions", "orders")}
    for store in (account.get("games") or {}).values():
        yield None, {k: store.get(k) or ({} if k in ("portfolio", "shorts") else [])
                     for k in ("portfolio", "shorts", "transactions", "orders")}


def progress(account: dict) -> dict:
    books = list(_books(account))
    txs = [t for _, b in books for t in b["transactions"] if t.get("type") in SIDES]
    orders = [o for _, b in books for o in b["orders"]]
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    return {
        "first_trade": bool(txs),
        "limit_order": any(o.get("type") in ("limit", "stop_limit") for o in orders),
        "diversify": any(len(b["portfolio"]) >= 3 for _, b in books),
        "protect": any(o.get("type") in ("stop", "stop_limit", "trailing_stop") and o.get("side") in ("sell", "cover")
                       for o in orders),
        "profit_sell": any(t.get("type") in ("sell", "cover") and (t.get("profit_loss") or 0) > 0 for t in txs),
        "two_markets": len({m for m, b in books if m and any(t.get("type") in SIDES for t in b["transactions"])}) >= 2,
        "hold_week": any((p.get("buy_date") or "9999") <= week_ago for _, b in books for p in b["portfolio"].values()),
        "nickname": not str(account.get("nickname") or "").startswith("用户#"),
        "game": bool(account.get("games")),
        "short_sell": any(t.get("type") == "short" for t in txs),
    }


def missions(account: dict, lang: str | None) -> list:
    lang = lang if lang in ("zh", "en", "ja", "ko", "fr") else "zh"
    done = progress(account)
    return [{"id": mid, "action": action, "title": text[lang][0], "body": text[lang][1], "done": done.get(mid, False)}
            for mid, action, text in MISSIONS]
