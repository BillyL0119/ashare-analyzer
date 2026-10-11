"""
Economic calendar — /api/macro/calendar

Macro releases (CPI, jobs, Fed decisions, GDP, ...) from Nasdaq's public economic calendar, one
request per day, cached per day. Each event gets an importance level (3 = moves the whole market,
2 = worth watching, 1 = minor), an actual-vs-consensus surprise flag, and for the main event
families a short plain-language explanation in the reader's language, because the site is for
students learning what these numbers mean.
"""

import html
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Query

router = APIRouter()
logger = logging.getLogger("macro")

_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/126 Safari/537.36", "Accept": "application/json"}
_pool = ThreadPoolExecutor(max_workers=6)
from zoneinfo import ZoneInfo
_ET = ZoneInfo("America/New_York")
_cache: dict = {}          # date iso -> (ts, rows)
_lock = threading.Lock()

COUNTRIES = {
    "us": "United States", "cn": "China", "eu": "Euro Zone", "jp": "Japan", "uk": "United Kingdom",
}

# (key, pattern, importance, explanation per language). First match wins, so specific before generic.
_FAMILIES = [
    ("fomc", r"Fed Interest Rate Decision|FOMC Statement|FOMC Press Conference|FOMC Economic Projections|Interest Rate Decision", 3, {
        "zh": "央行利率决议。加息让借钱更贵、压低股票估值；降息通常利好股市。市场最关心的往往是声明里对未来利率路径的暗示。",
        "en": "The central bank's rate decision. Higher rates make borrowing dearer and weigh on stock valuations; cuts usually help stocks. Markets often care most about hints on future rates.",
        "ja": "中央銀行の政策金利決定。利上げは借り入れコストを上げ株価の評価を押し下げ、利下げは通常株式に追い風です。市場は今後の金利の見通しに最も注目します。",
        "ko": "중앙은행의 기준금리 결정입니다. 금리 인상은 차입 비용을 높여 주가 밸류에이션을 압박하고, 인하는 대체로 주식에 우호적입니다. 시장은 향후 금리 경로에 대한 힌트에 가장 주목합니다.",
        "fr": "Décision de taux de la banque centrale. Une hausse renchérit le crédit et pèse sur la valorisation des actions ; une baisse les soutient en général. Le marché scrute surtout les indices sur les taux futurs.",
    }),
    ("fomc_minutes", r"FOMC Meeting Minutes|Beige Book", 2, {
        "zh": "美联储会议纪要或经济褐皮书，透露官员们的讨论细节和对经济的判断，可能改变市场对加息或降息的预期。",
        "en": "Fed minutes or the Beige Book: details of officials' discussion and their view of the economy, which can shift expectations for hikes or cuts.",
        "ja": "FOMC議事録やベージュブック。当局者の議論の詳細や景気判断が分かり、利上げ・利下げの予想を変えることがあります。",
        "ko": "연준 의사록이나 베이지북으로, 위원들의 논의 내용과 경기 판단을 보여 줘 금리 인상·인하 기대를 바꿀 수 있습니다.",
        "fr": "Compte rendu de la Fed ou Livre beige : le détail des discussions et du diagnostic économique, qui peut modifier les anticipations de hausse ou de baisse des taux.",
    }),
    ("core_cpi", r"^Core CPI\b|^CPI\b|Consumer Price Index", 3, {
        "zh": "消费者物价指数（CPI），衡量通胀。高于预期意味着美联储可能维持高利率甚至加息，通常对股票和债券不利；低于预期则相反。核心CPI剔除了波动大的食品和能源。",
        "en": "Consumer Price Index, the main inflation gauge. A hotter-than-expected print means the Fed may keep rates high, usually bad for stocks and bonds; a cooler one helps. Core CPI strips out volatile food and energy.",
        "ja": "消費者物価指数（CPI）、インフレの主要指標。予想を上回るとFRBが高金利を維持する可能性があり株や債券に逆風、下回れば追い風です。コアCPIは変動の大きい食品とエネルギーを除きます。",
        "ko": "소비자물가지수(CPI)로 대표적인 인플레이션 지표입니다. 예상보다 높으면 연준이 고금리를 유지할 수 있어 주식·채권에 부정적이고, 낮으면 긍정적입니다. 근원 CPI는 변동성이 큰 식품·에너지를 제외합니다.",
        "fr": "Indice des prix à la consommation, principale mesure de l'inflation. Un chiffre supérieur aux attentes laisse penser que la Fed gardera des taux élevés, ce qui pèse sur actions et obligations ; un chiffre plus faible les soutient. Le CPI sous-jacent exclut alimentation et énergie.",
    }),
    ("pce", r"\bPCE\b", 3, {
        "zh": "个人消费支出物价指数（PCE），美联储最看重的通胀指标。解读方式和CPI一样：越高，降息越难。",
        "en": "PCE price index, the Fed's preferred inflation measure. Read it like CPI: the higher it is, the harder it is for the Fed to cut.",
        "ja": "個人消費支出（PCE）物価指数、FRBが最も重視するインフレ指標。読み方はCPIと同じで、高いほど利下げが難しくなります。",
        "ko": "개인소비지출(PCE) 물가지수로 연준이 가장 중시하는 인플레이션 지표입니다. CPI와 같이 해석하며, 높을수록 금리 인하가 어려워집니다.",
        "fr": "Indice des prix PCE, la mesure d'inflation préférée de la Fed. Il se lit comme le CPI : plus il est élevé, plus une baisse des taux est difficile.",
    }),
    ("ppi", r"\bPPI\b|Producer Price", 2, {
        "zh": "生产者物价指数（PPI），衡量企业出厂价格，是CPI的先行信号：工厂成本上涨，往往会在几个月后传导到消费者。",
        "en": "Producer Price Index: prices businesses receive. It often leads CPI, because higher factory costs tend to reach consumers a few months later.",
        "ja": "生産者物価指数（PPI）。企業の出荷価格を示し、CPIの先行指標とされます。工場のコスト上昇は数か月後に消費者価格へ波及しがちです。",
        "ko": "생산자물가지수(PPI)로 기업의 출하 가격을 보여 주며 CPI의 선행 신호입니다. 생산 비용 상승은 몇 달 뒤 소비자 가격으로 전가되는 경향이 있습니다.",
        "fr": "Indice des prix à la production : les prix perçus par les entreprises. Il annonce souvent le CPI, car la hausse des coûts de production se répercute sur les consommateurs quelques mois plus tard.",
    }),
    ("nfp", r"Nonfarm Payrolls|Non-Farm Payrolls", 3, {
        "zh": "非农就业人数，每月第一个周五公布，是最受关注的就业数据。就业强说明经济好，但太强又可能让美联储担心通胀而推迟降息。",
        "en": "Nonfarm payrolls, released on the first Friday of the month and the most watched jobs number. Strong hiring means a healthy economy, but too strong can make the Fed worry about inflation and delay cuts.",
        "ja": "非農業部門雇用者数。毎月第1金曜日に発表される最注目の雇用統計です。雇用が強いのは景気が良い証拠ですが、強すぎるとFRBがインフレを警戒し利下げを遅らせることがあります。",
        "ko": "비농업 고용지수로 매월 첫째 주 금요일에 발표되는 가장 주목받는 고용 지표입니다. 고용이 강하면 경기가 좋다는 뜻이지만, 너무 강하면 연준이 인플레이션을 우려해 금리 인하를 미룰 수 있습니다.",
        "fr": "Créations d'emplois non agricoles, publiées le premier vendredi du mois et les plus suivies. Des embauches solides signalent une économie saine, mais trop fortes elles peuvent inquiéter la Fed et retarder les baisses de taux.",
    }),
    ("unemployment", r"Unemployment Rate", 3, {
        "zh": "失业率。上升说明经济降温，市场会押注降息；但升得太快会引发衰退担忧。",
        "en": "Unemployment rate. A rise signals a cooling economy and raises bets on rate cuts, but a fast rise sparks recession fears.",
        "ja": "失業率。上昇は景気の減速を示し利下げ期待を高めますが、急上昇すると景気後退懸念が強まります。",
        "ko": "실업률입니다. 상승하면 경기 둔화 신호로 금리 인하 기대가 커지지만, 너무 빠르게 오르면 경기 침체 우려가 커집니다.",
        "fr": "Taux de chômage. Une hausse signale un ralentissement et renforce les paris sur des baisses de taux, mais une hausse rapide fait craindre une récession.",
    }),
    ("claims", r"Jobless Claims", 2, {
        "zh": "首次申领失业救济人数，每周四公布，是最及时的就业市场信号。持续上升说明裁员在增加。",
        "en": "Weekly jobless claims, out every Thursday: the most timely read on the job market. A steady rise means layoffs are picking up.",
        "ja": "新規失業保険申請件数。毎週木曜日に発表され、雇用市場を最も早く映す指標です。増加が続けば解雇が増えていることを示します。",
        "ko": "주간 신규 실업수당 청구 건수로 매주 목요일 발표되며 고용 시장을 가장 빠르게 보여 줍니다. 꾸준히 늘면 해고가 늘고 있다는 뜻입니다.",
        "fr": "Inscriptions hebdomadaires au chômage, publiées chaque jeudi : l'indicateur le plus rapide du marché du travail. Une hausse continue signale davantage de licenciements.",
    }),
    ("jolts", r"JOLT", 2, {
        "zh": "职位空缺数（JOLTS），反映企业招人的意愿。空缺减少说明劳动力市场在降温。",
        "en": "Job openings (JOLTS) show how eager companies are to hire. Fewer openings mean the labour market is cooling.",
        "ja": "求人件数（JOLTS）。企業の採用意欲を示し、減少すれば労働市場の冷え込みを示します。",
        "ko": "구인 건수(JOLTS)로 기업의 채용 의지를 보여 줍니다. 줄어들면 노동시장이 식고 있다는 뜻입니다.",
        "fr": "Offres d'emploi (JOLTS) : l'appétit des entreprises pour l'embauche. Moins d'offres signifie un marché du travail qui refroidit.",
    }),
    ("gdp", r"^GDP\b|Gross Domestic Product", 3, {
        "zh": "国内生产总值（GDP）增速，衡量整体经济规模的变化。连续两个季度负增长通常被视为经济衰退。",
        "en": "GDP growth: how fast the whole economy is expanding. Two quarters of contraction in a row are commonly called a recession.",
        "ja": "国内総生産（GDP）成長率。経済全体の拡大ペースを示し、2四半期連続のマイナス成長は一般に景気後退とされます。",
        "ko": "국내총생산(GDP) 성장률로 경제 전체가 얼마나 빠르게 커지는지를 보여 줍니다. 두 분기 연속 역성장은 흔히 경기 침체로 봅니다.",
        "fr": "Croissance du PIB : le rythme d'expansion de toute l'économie. Deux trimestres consécutifs de contraction sont communément appelés récession.",
    }),
    ("retail", r"Retail Sales|Retail Control", 3, {
        "zh": "零售销售，衡量消费者花了多少钱。消费占美国经济约七成，所以这个数字很能说明经济冷暖。",
        "en": "Retail sales: how much consumers spent. Consumption is about 70% of the US economy, so this says a lot about its health.",
        "ja": "小売売上高。消費者の支出額を示し、消費は米国経済の約7割を占めるため景気の強さをよく表します。",
        "ko": "소매판매로 소비자가 얼마나 지출했는지 보여 줍니다. 소비가 미국 경제의 약 70%를 차지해 경기를 잘 보여 줍니다.",
        "fr": "Ventes au détail : ce que les consommateurs ont dépensé. La consommation pèse environ 70 % de l'économie américaine, c'est donc un bon thermomètre.",
    }),
    ("pmi", r"ISM .*PMI|ISM Manufacturing|ISM Non-Manufacturing PMI|ISM Services PMI|S&P Global .*PMI|Manufacturing PMI|Services PMI|Caixin", 2, {
        "zh": "采购经理人指数（PMI）。50 是分水岭：高于 50 表示行业在扩张，低于 50 表示在收缩，是观察经济拐点的领先指标。",
        "en": "Purchasing managers' index. 50 is the line: above means the sector is expanding, below means contracting. A leading sign of turning points.",
        "ja": "購買担当者景気指数（PMI）。50が分岐点で、上回れば拡大、下回れば縮小を示し、景気の転換点を探る先行指標です。",
        "ko": "구매관리자지수(PMI)입니다. 50이 기준선으로 이를 넘으면 확장, 밑돌면 위축을 뜻하며 경기 전환점을 보여 주는 선행 지표입니다.",
        "fr": "Indice des directeurs d'achat. 50 est le seuil : au-dessus le secteur se développe, en dessous il se contracte. Un indicateur avancé des retournements.",
    }),
    ("sentiment", r"Michigan Consumer Sentiment|Consumer Confidence|Michigan Inflation Expectations", 2, {
        "zh": "消费者信心指数，反映普通人对经济和自己收入的感受。信心下降，往往预示消费会放缓。",
        "en": "Consumer confidence: how ordinary people feel about the economy and their income. Falling confidence often comes before slower spending.",
        "ja": "消費者信頼感指数。人々が景気や自分の収入をどう感じているかを示し、低下は消費の減速の前触れになりがちです。",
        "ko": "소비자신뢰지수로 일반인이 경제와 자신의 소득을 어떻게 느끼는지 보여 줍니다. 신뢰가 떨어지면 소비 둔화가 뒤따르는 경우가 많습니다.",
        "fr": "Confiance des consommateurs : comment les ménages perçoivent l'économie et leurs revenus. Une baisse précède souvent un ralentissement des dépenses.",
    }),
    ("fed_speak", r"Fed .*Speaks|FOMC Member .*Speaks|Powell|Fed Chair", 2, {
        "zh": "美联储官员讲话。他们的措辞会被逐字解读，任何关于利率走向的暗示都可能让市场波动。",
        "en": "A Fed official speaks. Every word is parsed, and any hint about where rates are heading can move markets.",
        "ja": "FRB高官の発言。言葉は一語一語分析され、金利の方向性を示唆すると市場が動くことがあります。",
        "ko": "연준 인사의 발언입니다. 한 마디 한 마디가 해석되며, 금리 방향에 대한 힌트만으로도 시장이 움직일 수 있습니다.",
        "fr": "Intervention d'un responsable de la Fed. Chaque mot est décortiqué et tout indice sur l'orientation des taux peut faire bouger les marchés.",
    }),
    ("oil", r"Crude Oil Inventories|Crude Oil Stock", 1, {
        "zh": "原油库存变化。库存意外减少通常推高油价，影响能源股和通胀预期。",
        "en": "Change in crude oil stockpiles. An unexpected drawdown usually lifts oil prices, moving energy stocks and inflation expectations.",
        "ja": "原油在庫の増減。予想外の減少は通常原油価格を押し上げ、エネルギー株やインフレ予想に影響します。",
        "ko": "원유 재고 변화입니다. 예상치 못한 감소는 보통 유가를 끌어올려 에너지주와 인플레이션 기대에 영향을 줍니다.",
        "fr": "Variation des stocks de pétrole brut. Une baisse inattendue fait généralement monter le pétrole, ce qui touche les valeurs énergétiques et les anticipations d'inflation.",
    }),
    ("housing", r"Housing Starts|Building Permits|Existing Home Sales|New Home Sales|Pending Home Sales", 1, {
        "zh": "房地产数据。住房对利率非常敏感，常被用来观察高利率对经济的冲击有多大。",
        "en": "Housing data. Housing is very sensitive to interest rates, so it shows how much high rates are biting.",
        "ja": "住宅関連指標。住宅は金利に非常に敏感で、高金利が経済にどれだけ効いているかを示します。",
        "ko": "주택 지표입니다. 주택은 금리에 매우 민감해 고금리가 경제에 얼마나 영향을 주는지 보여 줍니다.",
        "fr": "Données immobilières. Le logement est très sensible aux taux, il montre donc à quel point des taux élevés freinent l'économie.",
    }),
]
_COMPILED = [(k, re.compile(p, re.I), imp, ex) for k, p, imp, ex in _FAMILIES]
_MINOR = re.compile(r"Bill Auction|Note Auction|Bond Auction|Redbook|MBA |Mortgage|Natural Gas Storage|Baker Hughes|"
                    r"Balance Sheet|Reserve Balances|EIA |Gasoline|Distillate|Heating Oil|Cushing|Refinery|GDPNow|"
                    r"Car Sales|Truck Sales|Weekly", re.I)


def _clean(v) -> str:
    v = html.unescape(str(v or "")).replace("\xa0", " ").strip()
    return v


def _num(v: str):
    m = re.match(r"^\s*(-?[\d,]*\.?\d+)\s*([KMBT%]?)", v or "")
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except ValueError:
        return None


def _fetch_day(d: date) -> list:
    iso = d.isoformat()
    today = datetime.now(timezone.utc).date()
    ttl = 12 * 3600 if d < today - timedelta(days=1) else 600 if d <= today else 3600
    with _lock:
        hit = _cache.get(iso)
        if hit and time.time() - hit[0] < ttl:
            return hit[1]
        if hit and iso not in _refreshing:
            # Stale: answer with the last copy now and refresh in the background
            _refreshing.add(iso)
            threading.Thread(target=_refresh_day, args=(d,), daemon=True).start()
            return hit[1]
        if hit:
            return hit[1]
    return _load_day(d)


_refreshing: set = set()


def _refresh_day(d: date) -> None:
    try:
        _load_day(d)
    finally:
        _refreshing.discard(d.isoformat())


def _load_day(d: date) -> list:
    iso = d.isoformat()
    hit = _cache.get(iso)
    try:
        r = requests.get("https://api.nasdaq.com/api/calendar/economicevents", params={"date": iso},
                         headers=_HEADERS, timeout=10)
        rows = ((r.json() or {}).get("data") or {}).get("rows") or []
    except Exception as exc:
        logger.warning("economic calendar %s failed: %s", iso, exc)
        return hit[1] if hit else []
    out = []
    for row in rows:
        name = _clean(row.get("eventName"))
        if not name:
            continue
        # The feed labels this column "GMT" but the times are US Eastern (CPI shows 08:30)
        t = _clean(row.get("gmt"))
        try:
            hh, mm = (int(x) for x in t.split(":"))
            at = datetime(d.year, d.month, d.day, hh, mm, tzinfo=_ET).astimezone(timezone.utc).isoformat()
        except Exception:
            at = None
        out.append({"date": iso, "time_utc": at, "country": _clean(row.get("country")), "name": name,
                    "actual": _clean(row.get("actual")), "consensus": _clean(row.get("consensus")),
                    "previous": _clean(row.get("previous"))})
    with _lock:
        _cache[iso] = (time.time(), out)
        if len(_cache) > 120:
            for k in sorted(_cache)[:-90]:
                _cache.pop(k, None)
    return out


# Regional Fed gauges and index-level / unadjusted variants of headline numbers: shown, but minor
_VARIANT = re.compile(r"Dallas Fed|Cleveland|Atlanta Fed|Philly Fed|Richmond|Kansas|Chicago Fed|n\.s\.a|Index, s\.a|CPI Index|"
                      r"Continuing|4-Week Avg|Retail Control|Ex Gas|PPI ex\.|GDP Price Index|GDP Sales|PCE Prices", re.I)


_GENERIC = {"fomc", "gdp", "pmi", "sentiment", "housing", "oil", "ppi"}


def _classify(ev: dict, lang: str) -> dict:
    name = ev["name"]
    fam, imp, explain = None, 1, None
    if _MINOR.search(name):
        imp = 0                                      # auctions, mortgage indices, weekly fuel data
    elif not _VARIANT.search(name):
        for key, rx, level, ex in _COMPILED:
            if rx.search(name):
                fam, imp = key, level
                # Most explanations talk about the Fed and the US economy; only the generic ones
                # are shown for other countries.
                if ev["country"] == "United States" or key in _GENERIC:
                    explain = ex.get(lang) or ex["en"]
                break
    surprise = None
    a, c = _num(ev["actual"]), _num(ev["consensus"])
    if a is not None and c is not None and a != c:
        surprise = "above" if a > c else "below"
    return {**ev, "family": fam, "importance": imp, "explain": explain, "surprise": surprise,
            "released": bool(ev["actual"])}


@router.get("/calendar")
def calendar(
    country: str = Query("us", description="comma list of us,cn,eu,jp,uk"),
    days_back: int = Query(3, ge=0, le=14),
    days_ahead: int = Query(10, ge=1, le=21),
    min_importance: int = Query(1, ge=0, le=3),
    lang: str = Query("en"),
):
    want = {COUNTRIES[c] for c in country.split(",") if c in COUNTRIES} or {COUNTRIES["us"]}
    lang = lang if lang in ("zh", "en", "ja", "ko", "fr") else "en"
    today = datetime.now(timezone.utc).date()
    days = [today + timedelta(days=i) for i in range(-days_back, days_ahead + 1)]
    results = list(_pool.map(_fetch_day, days))
    events = []
    for rows in results:
        for ev in rows:
            if ev["country"] not in want:
                continue
            e = _classify(ev, lang)
            if e["importance"] >= min_importance:
                events.append(e)
    # Headline numbers often come as a same-name pair at the same time: month-on-month and
    # year-on-year. The smaller of the two previous readings is the monthly change.
    groups: dict = {}
    for e in events:
        if "%" in (e["previous"] + e["consensus"]):
            groups.setdefault((e["date"], e["time_utc"], e["country"], e["name"].lower()), []).append(e)
    for pair in groups.values():
        if len(pair) == 2:
            ref = [abs(_num(x["previous"]) if _num(x["previous"]) is not None else (_num(x["consensus"]) or 0)) for x in pair]
            mom, yoy = (pair[0], pair[1]) if ref[0] <= ref[1] else (pair[1], pair[0])
            mom["period"], yoy["period"] = "mom", "yoy"
    events.sort(key=lambda e: (e["time_utc"] or e["date"], -e["importance"], e.get("period") or ""))
    return {"events": events, "countries": sorted(want), "today": today.isoformat(),
            "source": "Nasdaq economic calendar"}


def warmup():
    try:
        calendar(country="us", days_back=3, days_ahead=21, min_importance=1, lang="en")
    except Exception:
        pass
