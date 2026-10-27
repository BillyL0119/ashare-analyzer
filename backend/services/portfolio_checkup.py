"""
Portfolio check-up: where the money sits (by sector and position) and a few plain findings a
student can learn from, e.g. one stock carrying most of the account, or a losing position without
a stop. Rules only, nothing generated, in five languages.

Sectors come from data the site already uses: US the GICS sector of the screener universe,
A-shares the followed-industry map, Hong Kong the Hang Seng industry from HKEX quote data (largest
300 companies), Japan the TSE 33 sectors from the JPX list. Unknown ones show as "Other".
"""

import json
import os

_LANGS = ("zh", "en", "ja", "ko", "fr")
_US_ZH = {
    "Technology": "科技", "Health Care": "医疗保健", "Financials": "金融", "Consumer Discretionary": "非必需消费",
    "Industrials": "工业", "Real Estate": "房地产", "Energy": "能源", "Utilities": "公用事业",
    "Materials": "原材料", "Consumer Staples": "必需消费", "Communication Services": "通信服务",
}
_OTHER = {"zh": "其他", "en": "Other", "ja": "その他", "ko": "기타", "fr": "Autres"}
_CASH = {"zh": "现金", "en": "Cash", "ja": "現金", "ko": "현금", "fr": "Liquidités"}

# finding id -> {lang: (title with {placeholders}, why it matters)}
_TEXT = {
    "one_stock": {
        "zh": ("{name} 占了账户的 {pct}%", "一只股票占比太高，它一跌整个账户就跟着跌。专业投资者通常把单只股票控制在一成到两成以内。"),
        "en": ("{name} is {pct}% of the account", "When one stock carries this much, its bad day is your bad day. Professionals often keep a single stock to 10-20%."),
        "ja": ("{name} が口座の {pct}% を占めています", "1銘柄の比率が高いと、その下落がそのまま口座全体に響きます。プロは1銘柄を1〜2割に抑えることが多いです。"),
        "ko": ("{name} 비중이 계좌의 {pct}%입니다", "한 종목 비중이 크면 그 종목이 떨어질 때 계좌 전체가 흔들립니다. 전문가들은 보통 한 종목을 10~20%로 제한합니다."),
        "fr": ("{name} représente {pct} % du compte", "Quand une action pèse autant, sa mauvaise journée devient la vôtre. Les professionnels limitent souvent une ligne à 10-20 %."),
    },
    "one_sector": {
        "zh": ("{pct}% 的持仓都在「{name}」", "同一行业的股票往往一起涨跌，行业遇到坏消息时分散到多只股票也帮不上忙。可以看看别的行业。"),
        "en": ("{pct}% of your holdings are in {name}", "Stocks in one sector tend to move together, so bad news for the sector hits them all. Look at other sectors too."),
        "ja": ("保有の {pct}% が「{name}」です", "同じ業種の株は一緒に動きやすく、業界に悪いニュースが出ると全部が下がります。他の業種も見てみましょう。"),
        "ko": ("보유 종목의 {pct}%가 「{name}」입니다", "같은 업종 주식은 함께 움직이는 경향이 있어 업종 악재에 모두 떨어집니다. 다른 업종도 살펴보세요."),
        "fr": ("{pct} % de vos positions sont dans « {name} »", "Les actions d'un même secteur bougent ensemble : une mauvaise nouvelle les touche toutes. Regardez d'autres secteurs."),
    },
    "few_holdings": {
        "zh": ("只持有 {n} 只股票", "持股太少，结果很依赖个别公司的运气。多持有几只不同行业的股票，账户会更稳。"),
        "en": ("Only {n} stock{s} held", "With so few holdings the result depends on a company or two. A few more, in different sectors, steady the account."),
        "ja": ("保有銘柄は {n} 銘柄だけです", "銘柄が少ないと結果が一部の会社次第になります。業種の違う銘柄を少し増やすと口座が安定します。"),
        "ko": ("보유 종목이 {n}개뿐입니다", "종목이 적으면 결과가 한두 회사에 좌우됩니다. 업종이 다른 종목을 몇 개 더 담으면 계좌가 안정됩니다."),
        "fr": ("Seulement {n} action{s} détenue{s}", "Avec si peu de lignes, le résultat dépend d'une ou deux sociétés. Quelques-unes de plus, dans d'autres secteurs, stabilisent le compte."),
    },
    "spread_well": {
        "zh": ("持仓分散在 {n} 只股票、{k} 个行业", "分散得不错：任何一只股票出问题，对整个账户的影响都有限。"),
        "en": ("Spread across {n} stocks in {k} sectors", "Nicely spread: trouble at any one company has a limited effect on the whole account."),
        "ja": ("{n} 銘柄・{k} 業種に分散しています", "よく分散できています。どれか1社が不調でも口座全体への影響は限られます。"),
        "ko": ("{n}개 종목, {k}개 업종에 분산되어 있습니다", "잘 분산되어 있습니다. 한 회사에 문제가 생겨도 계좌 전체에 미치는 영향이 제한적입니다."),
        "fr": ("Réparti sur {n} actions et {k} secteurs", "Belle répartition : un problème sur une société a un effet limité sur l'ensemble."),
    },
    "mostly_cash": {
        "zh": ("{pct}% 的资金还是现金", "现金不会亏，但也不会涨。模拟盘正适合练习：先拿一小部分资金试着投资，看看市场怎么波动。"),
        "en": ("{pct}% of the money is still cash", "Cash cannot fall, but it cannot grow either. Paper trading is the place to practise: invest a small part and watch how prices move."),
        "ja": ("資金の {pct}% がまだ現金です", "現金は減りませんが増えもしません。模擬取引は練習の場です。一部だけ投資して値動きを見てみましょう。"),
        "ko": ("자금의 {pct}%가 아직 현금입니다", "현금은 줄지 않지만 늘지도 않습니다. 모의투자는 연습하는 곳이니 일부만 투자해 가격 변화를 지켜보세요."),
        "fr": ("{pct} % de l'argent est encore en liquidités", "Les liquidités ne baissent pas, mais ne progressent pas non plus. Investissez une petite partie pour voir les cours bouger."),
    },
    "no_cash": {
        "zh": ("几乎满仓，现金只剩 {pct}%", "满仓时遇到好机会没钱买，市场大跌时也没有缓冲。很多投资者会留一点现金。"),
        "en": ("Almost fully invested: {pct}% cash left", "With no cash you cannot act on a new idea or cushion a fall. Many investors keep a little aside."),
        "ja": ("ほぼ全額投資済み（現金 {pct}%）", "現金がないと良い機会に買えず、下落時のクッションもありません。少し現金を残す投資家も多いです。"),
        "ko": ("거의 전액 투자 상태 (현금 {pct}%)", "현금이 없으면 좋은 기회에 살 수 없고 하락 때 완충도 없습니다. 많은 투자자가 현금을 조금 남겨 둡니다."),
        "fr": ("Presque tout est investi : {pct} % de liquidités", "Sans liquidités, impossible de saisir une occasion ou d'amortir une baisse. Beaucoup gardent une petite réserve."),
    },
    "big_short": {
        "zh": ("卖空仓位占账户的 {pct}%", "卖空的亏损没有上限：股价涨得越多亏得越多。卖空比例大时要特别注意设好止损。"),
        "en": ("Short positions are {pct}% of the account", "A short has no limit on its loss: the higher the price goes, the more you lose. Keep stops on large shorts."),
        "ja": ("空売りが口座の {pct}% を占めています", "空売りの損失に上限はなく、株価が上がるほど損が膨らみます。大きな空売りには逆指値を置きましょう。"),
        "ko": ("공매도 포지션이 계좌의 {pct}%입니다", "공매도 손실에는 상한이 없어 가격이 오를수록 손실이 커집니다. 큰 공매도에는 스톱을 걸어 두세요."),
        "fr": ("Les ventes à découvert font {pct} % du compte", "Une vente à découvert n'a pas de perte maximale : plus le cours monte, plus vous perdez. Placez des stops."),
    },
    "loss_no_stop": {
        "zh": ("{name} 已经亏了 {pct}%，还没有止损单", "亏损的仓位最容易被一直拖着。提前想好最多能接受亏多少，用止损单让它自动执行。"),
        "en": ("{name} is down {pct}% with no stop order", "Losing positions are the easiest to leave alone too long. Decide the most you will lose and let a stop order act on it."),
        "ja": ("{name} は {pct}% の含み損で、逆指値がありません", "損失の出た銘柄はつい放置しがちです。許容できる損失を決め、逆指値で自動的に実行しましょう。"),
        "ko": ("{name}이(가) {pct}% 손실인데 스톱 주문이 없습니다", "손실 종목은 계속 방치하기 쉽습니다. 감당할 최대 손실을 정하고 스톱 주문이 실행하게 하세요."),
        "fr": ("{name} perd {pct} % sans ordre stop", "Une position perdante est facile à laisser traîner. Fixez la perte maximale acceptée et laissez un stop agir."),
    },
    "empty": {
        "zh": ("还没有持仓", "买入第一只股票后，这里会告诉你资金分布在哪些行业、有没有过于集中。"),
        "en": ("No holdings yet", "After your first purchase this shows where your money sits and whether it is too concentrated."),
        "ja": ("まだ保有銘柄がありません", "最初の株を買うと、資金がどの業種にあるか、偏りがないかをここで確認できます。"),
        "ko": ("아직 보유 종목이 없습니다", "첫 주식을 사면 자금이 어느 업종에 있는지, 너무 몰려 있지 않은지 여기서 알려 드립니다."),
        "fr": ("Aucune position pour l'instant", "Après votre premier achat, vous verrez ici où se trouve votre argent et s'il est trop concentré."),
    },
}


def _sectors(market: str, symbols: list) -> dict:
    """{symbol: (english name, chinese/local name)}"""
    out = {}
    try:
        if market == "us":
            from routers.screener import _universe
            idx = {r["symbol"]: r.get("sector") for r in _universe() if r.get("symbol") in symbols}
            for s in symbols:
                sec = idx.get(s)
                if sec and sec != "Other":
                    out[s] = (sec, _US_ZH.get(sec, sec))
        elif market == "cn":
            from routers.heatmap import _CN_SECTOR_EN
            path = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
            with open(path, encoding="utf-8") as f:
                for name, codes in (json.load(f).get("industries") or {}).items():
                    for c in codes:
                        if c in symbols and c not in out:
                            out[c] = (_CN_SECTOR_EN.get(name, name), name)
        elif market == "hk":
            from routers.heatmap import _load_hsics
            h = _load_hsics()
            for s in symbols:
                if h.get(s):
                    out[s] = (h[s]["en"].split(" - ")[0], (h[s].get("zh") or h[s]["en"]).split(" - ")[0])
        elif market == "jp":
            from routers.global_stocks import _universe
            idx = {r["code"]: r for r in (_universe.get("jp") or [])}
            for s in symbols:
                r = idx.get(s) or {}
                if r.get("sector"):
                    out[s] = (r["sector"], r.get("sector_local") or r["sector"])
    except Exception:
        pass
    return out


def _f(fid: str, level: str, lang: str, **kw) -> dict:
    title, body = _TEXT[fid][lang]
    return {"id": fid, "level": level, "title": title.format(**kw), "body": body}


def checkup(view: dict, market: str, lang: str | None) -> dict:
    """`view` is a paper_engine.book_view result."""
    lang = lang if lang in _LANGS else "zh"
    cjk = lang in ("zh", "ja")
    total = float(view.get("total_value") or 0) or 1.0
    longs = view.get("portfolio") or {}
    shorts = view.get("shorts") or {}
    open_orders = [o for o in (view.get("orders") or []) if o.get("status") == "open"]
    sectors = _sectors(market, list(longs))
    long_value = sum(float(p.get("market_value") or 0) for p in longs.values())

    by_sector: dict = {}
    for sym, p in longs.items():
        en, local = sectors.get(sym, (None, None))
        key = en or "Other"
        e = by_sector.setdefault(key, {"name": (local if cjk else en) or _OTHER[lang], "value": 0.0})
        e["value"] += float(p.get("market_value") or 0)
    allocation = sorted(({"name": v["name"], "pct": round(v["value"] / total * 100, 1)} for v in by_sector.values()),
                        key=lambda x: -x["pct"])
    cash_pct = round(max(float(view.get("cash") or 0), 0) / total * 100, 1)
    if longs:
        allocation.append({"name": _CASH[lang], "pct": cash_pct, "cash": True})

    findings = []
    if not longs and not shorts:
        return {"allocation": [], "findings": [_f("empty", "info", lang)]}
    if longs:
        top_sym, top = max(longs.items(), key=lambda kv: kv[1].get("market_value") or 0)
        top_pct = (top.get("market_value") or 0) / total * 100
        name = top.get("name") or top_sym
        if top_pct >= 40 and len(longs) > 1 or top_pct >= 60:
            findings.append(_f("one_stock", "warn", lang, name=name, pct=round(top_pct)))
        known = {k: v for k, v in by_sector.items() if k != "Other"}
        if long_value and len(longs) >= 2 and known:
            k, v = max(known.items(), key=lambda kv: kv[1]["value"])
            share = v["value"] / long_value * 100
            if share >= 60:
                findings.append(_f("one_sector", "warn", lang, name=v["name"], pct=round(share)))
        n = len(longs)
        if n <= 2:
            findings.append(_f("few_holdings", "info", lang, n=n, s="" if n == 1 else "s"))
        elif n >= 5 and len(known) >= 3 and not any(f["level"] == "warn" for f in findings):
            findings.append(_f("spread_well", "good", lang, n=n, k=len(known)))
        protected = {o["symbol"] for o in open_orders if o.get("type") in ("stop", "stop_limit", "trailing_stop") and o.get("side") == "sell"}
        losers = sorted(((s, p) for s, p in longs.items() if (p.get("profit_loss_pct") or 0) <= -15 and s not in protected),
                        key=lambda kv: kv[1].get("profit_loss_pct") or 0)
        if losers:
            s, p = losers[0]
            findings.append(_f("loss_no_stop", "warn", lang, name=p.get("name") or s, pct=round(abs(p.get("profit_loss_pct") or 0))))
    short_value = sum(abs(float(p.get("market_value") or 0)) for p in shorts.values())
    if short_value / total * 100 >= 30:
        findings.append(_f("big_short", "warn", lang, pct=round(short_value / total * 100)))
    if cash_pct >= 80:
        findings.append(_f("mostly_cash", "info", lang, pct=round(cash_pct)))
    elif cash_pct < 5 and longs:
        findings.append(_f("no_cash", "info", lang, pct=round(cash_pct, 1)))
    order = {"warn": 0, "info": 1, "good": 2}
    findings.sort(key=lambda f: order[f["level"]])
    return {"allocation": allocation, "findings": findings}
