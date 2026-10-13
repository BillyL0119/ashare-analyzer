"""
Paper Trading — /api/paper/*

Four accounts per device (US $100K, A-shares ¥1M, Hong Kong HK$1M, Japan ¥10M) plus any number of
competitions (a private group with its own starting cash, market, end date and leaderboard).
Trading rules, order types and fees live in services/paper_engine.py.

Compatibility: /buy and /sell keep their original contract (an immediate fill at the last price,
the shape older app builds decode). New clients place everything through /order, which honours
trading hours, order types and durations; a background matcher fills open orders.
"""
from __future__ import annotations

import glob
import hashlib
import json
import logging
import os
import random
import re
import secrets
import threading
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import paper_engine as E
from services.paper_engine import Book, CURRENCY, INITIAL, MARKETS, PREFIX, SHORT_MARKETS

router = APIRouter()
logger = logging.getLogger("paper_trading")

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "paper_trading")
_GAMES_DIR = os.path.join(_DATA_DIR, "games")
os.makedirs(_GAMES_DIR, exist_ok=True)

# Kept for older imports
_INITIAL_CASH = INITIAL["cn"]
_US_INITIAL_CASH = INITIAL["us"]
_beijing_today = E.beijing_today


# ── Storage ──────────────────────────────────────────────────────────────────

_locks: dict = defaultdict(threading.RLock)


def _safe_id(device_id: str) -> str:
    return "".join(c for c in (device_id or "") if c.isalnum() or c in "-_")[:64]


def _lock(device_id: str) -> threading.RLock:
    return _locks[_safe_id(device_id)]


def _account_path(device_id: str) -> str:
    return os.path.join(_DATA_DIR, f"{_safe_id(device_id)}.json")


def _write_json(path: str, data: dict) -> None:
    tmp = f"{path}.{os.getpid()}.{threading.get_ident()}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def _load_account(device_id: str) -> dict | None:
    if not _safe_id(device_id):
        return None
    try:
        with open(_account_path(device_id), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _save_account(account: dict) -> None:
    _write_json(_account_path(account["device_id"]), account)


def _market_book(account: dict, market: str) -> Book:
    return Book(account, PREFIX[market], market, INITIAL[market], market in SHORT_MARKETS)


def _new_account(device_id: str) -> dict:
    # Deterministic per device: an account is only saved on its first trade, so the preview
    # shown before that must not change name between requests.
    suffix = str(int(hashlib.sha1(device_id.encode()).hexdigest(), 16) % 9000 + 1000)
    today = E.beijing_today()
    acc = {"device_id": device_id, "nickname": f"用户#{suffix}", "created_at": today,
           "total_value_history": [{"date": today, "value": INITIAL["cn"]}],
           "us_total_value_history": [{"date": today, "value": INITIAL["us"]}], "games": {}}
    for m in MARKETS:
        _market_book(acc, m)
    return acc


def _migrate_account(account: dict) -> dict:
    for m in MARKETS:
        _market_book(account, m)          # adds any missing fields
    account.setdefault("games", {})
    return account


def _all_accounts() -> list[dict]:
    accounts = []
    for path in glob.glob(os.path.join(_DATA_DIR, "*.json")):
        try:
            with open(path, "r", encoding="utf-8") as f:
                accounts.append(json.load(f))
        except Exception:
            continue
    return accounts


# ── Messages ─────────────────────────────────────────────────────────────────

_MSG = {
    "buy": {"zh": "成功买入 {name} {shares} 股", "en": "Bought {shares} shares of {name}", "ja": "{name} を {shares} 株購入しました",
            "ko": "{name} {shares}주 매수 완료", "fr": "Achat de {shares} actions {name} effectué"},
    "sell": {"zh": "成功卖出 {name} {shares} 股", "en": "Sold {shares} shares of {name}", "ja": "{name} を {shares} 株売却しました",
             "ko": "{name} {shares}주 매도 완료", "fr": "Vente de {shares} actions {name} effectuée"},
    "short": {"zh": "成功卖空 {name} {shares} 股", "en": "Sold short {shares} shares of {name}", "ja": "{name} を {shares} 株空売りしました",
              "ko": "{name} {shares}주 공매도 완료", "fr": "Vente à découvert de {shares} actions {name} effectuée"},
    "cover": {"zh": "成功买入平仓 {name} {shares} 股", "en": "Bought to cover {shares} shares of {name}", "ja": "{name} を {shares} 株買い戻しました",
              "ko": "{name} {shares}주 숏 커버 완료", "fr": "Rachat de {shares} actions {name} effectué"},
    "placed": {"zh": "委托已提交：{what}", "en": "Order placed: {what}", "ja": "注文を受け付けました：{what}",
               "ko": "주문 접수: {what}", "fr": "Ordre enregistré : {what}"},
    "queued": {"zh": "市场休市，委托将在开盘后按开盘价附近成交：{what}", "en": "The market is closed; this order will fill near the opening price: {what}",
               "ja": "市場は閉場中です。寄り付き付近の価格で約定します：{what}", "ko": "장 마감 중입니다. 개장 후 시가 부근에서 체결됩니다: {what}",
               "fr": "Marché fermé ; l'ordre sera exécuté près du cours d'ouverture : {what}"},
    "cancelled": {"zh": "委托已撤销", "en": "Order cancelled", "ja": "注文を取り消しました", "ko": "주문이 취소되었습니다", "fr": "Ordre annulé"},
}
_SIDE_WORD = {"zh": {"buy": "买入", "sell": "卖出", "short": "卖空", "cover": "买入平仓"},
              "en": {"buy": "Buy", "sell": "Sell", "short": "Short", "cover": "Cover"}}
_TYPE_WORD = {"zh": {"market": "市价单", "limit": "限价单", "stop": "止损单", "stop_limit": "止损限价单", "trailing_stop": "追踪止损"},
              "en": {"market": "market", "limit": "limit order", "stop": "stop order", "stop_limit": "stop-limit", "trailing_stop": "trailing stop"}}


def _lang(lang: Optional[str], market: str) -> str:
    return lang if lang in ("zh", "en", "ja", "ko", "fr") else ("en" if market == "us" else "zh")


def _msg(kind: str, lang: Optional[str], market: str, **kw) -> str:
    return _MSG[kind][_lang(lang, market)].format(**kw)


def _describe(o: dict, lang: str) -> str:
    l = "zh" if lang == "zh" else "en"
    cur = CURRENCY[o["market"]]
    parts = [_SIDE_WORD[l][o["side"]], f'{o["symbol"]} × {o["shares"]}', _TYPE_WORD[l][o["type"]]]
    if o.get("limit_price"):
        parts.append(f'{"限价" if l == "zh" else "limit"} {cur}{o["limit_price"]:,.2f}')
    if o.get("stop_price") and o["type"] != "trailing_stop":
        parts.append(f'{"触发价" if l == "zh" else "stop"} {cur}{o["stop_price"]:,.2f}')
    if o.get("trail_pct"):
        parts.append(f'{o["trail_pct"]}%')
    return " · ".join(parts)


# Engine errors are English; Chinese readers get them in Chinese
_ERR_ZH = [
    (r"^Insufficient funds\. Need (.+), available (.+)$", r"资金不足：需要 \1，可用 \2"),
    (r"^Insufficient buying power\. Need (.+), available (.+)$", r"购买力不足：需要 \1，可用 \2"),
    (r"^You don't hold any (.+)$", r"未持有 \1"),
    (r"^Insufficient shares\. Hold (\d+), tried to sell (\d+)$", r"持仓不足：持有 \1 股，尝试卖出 \2 股"),
    (r"^T\+1: shares bought today can be sold tomorrow$", "T+1 限制：今日买入的股票明日才可卖出"),
    (r"^Shares must be a multiple of the board lot \((\d+)\)$", r"股数必须是每手 \1 股的整数倍"),
    (r"^Shares must be a positive integer$", "股数必须是正整数"),
    (r"^Cannot fetch a price for (.+)\. Try again later\.$", r"无法获取 \1 的实时价格，请稍后重试"),
    (r"^Short selling is not available for this portfolio$", "这个账户不支持卖空"),
    (r"^You are not short (\d+) shares of (.+)$", r"没有足够的 \2 空头仓位（\1 股）可平仓"),
    (r"^Shares under (.+) cannot be sold short$", r"股价低于 \1 的股票不能卖空"),
    (r"^(\d+) shares are already in open sell orders$", r"已有 \1 股在未成交的卖出委托中"),
    (r"^This competition has ended$", "比赛已结束"),
    (r"^This competition has not started yet$", "比赛尚未开始"),
    (r"^Unknown symbol (.+)$", r"找不到股票 \1"),
    (r"^Invalid symbol$", "股票代码格式不对"),
    (r"^Enter a limit price$", "请填写限价"),
    (r"^Enter a stop price$", "请填写止损触发价"),
    (r"^Trail percentage must be between 0\.5% and 50%$", "追踪幅度需在 0.5% 到 50% 之间"),
    (r"^Trailing stops are for selling or covering$", "追踪止损只能用于卖出或平仓"),
]


def _localize(detail, lang: Optional[str], market: str):
    if _lang(lang, market) != "zh" or not isinstance(detail, str):
        return detail
    for pat, rep in _ERR_ZH:
        if re.match(pat, detail):
            return re.sub(pat, rep, detail)
    return detail


class _Localized:
    """`with _Localized(lang, market):` re-raises engine errors in the reader's language."""
    def __init__(self, lang, market):
        self.lang, self.market = lang, market

    def __enter__(self):
        return self

    def __exit__(self, et, ev, tb):
        if isinstance(ev, HTTPException):
            raise HTTPException(ev.status_code, _localize(ev.detail, self.lang, self.market))
        return False


# ── Rankings ─────────────────────────────────────────────────────────────────

def _has_traded(a: dict, market: str) -> bool:
    return bool(a.get(PREFIX[market] + "transactions"))


_rank_cache: dict = {}        # market -> (ts, [(device_id, account, value)])


def _ranked_values(market: str) -> list:
    """(device_id, account, value) for accounts that have traded in `market`, best first, valued at
    market prices (shorts included). Cached for a minute: it is read on every account load."""
    hit = _rank_cache.get(market)
    if hit and time.time() - hit[0] < 60:
        return hit[1]
    accs = [a for a in _all_accounts() if _has_traded(a, market)]
    books = [(a, _market_book(a, market)) for a in accs]
    syms = set().union(*[b.symbols() for _, b in books]) if books else set()
    prices = {s: v["price"] for s, v in E.quotes(market, sorted(syms)).items()}
    rows = sorted(((a["device_id"], a, b.value(prices)) for a, b in books), key=lambda x: x[2], reverse=True)
    _rank_cache[market] = (time.time(), rows)
    return rows


def _ranked(market: str) -> list[dict]:
    return [a for _, a, _ in _ranked_values(market)]


def _rank_of(device_id: str, market: str) -> int:
    for i, (d, _, _) in enumerate(_ranked_values(market), 1):
        if d == device_id:
            return i
    return -1


# ── Models ───────────────────────────────────────────────────────────────────

class DeviceBody(BaseModel):
    device_id: str


class BuyBody(BaseModel):
    device_id: str
    symbol: str
    shares: int
    market: Optional[str] = "cn"   # "cn" | "us" | "hk" | "jp"
    lang: Optional[str] = None


class SellBody(BuyBody):
    pass


class OrderBody(BaseModel):
    device_id: str
    market: Optional[str] = "us"
    symbol: str
    shares: int
    side: str = "buy"                    # buy | sell | short | cover
    type: str = "market"                 # market | limit | stop | stop_limit | trailing_stop
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    trail_pct: Optional[float] = None
    tif: str = "day"                     # day | gtc
    game_id: Optional[str] = None
    lang: Optional[str] = None


class CancelBody(BaseModel):
    device_id: str
    order_id: str
    game_id: Optional[str] = None
    lang: Optional[str] = None


class NicknameBody(BaseModel):
    device_id: str
    nickname: str


class GameCreateBody(BaseModel):
    device_id: str
    name: str
    market: str = "us"
    start_cash: float = 100_000
    end_date: str                        # YYYY-MM-DD
    allow_short: bool = False
    nickname: Optional[str] = None


class GameJoinBody(BaseModel):
    device_id: str
    code: str
    nickname: Optional[str] = None


class GameIdBody(BaseModel):
    device_id: str
    game_id: str


def _norm_market(m: Optional[str], default: str = "cn") -> str:
    m = (m or default).lower()
    return m if m in MARKETS else default


# ── Competitions ─────────────────────────────────────────────────────────────

_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_START_CASH = {"us": (10_000, 1_000_000), "cn": (100_000, 10_000_000), "hk": (100_000, 10_000_000), "jp": (1_000_000, 100_000_000)}
_games_lock = threading.RLock()


def _game_path(gid: str) -> str:
    return os.path.join(_GAMES_DIR, f"{_safe_id(gid)}.json")


def _load_game(gid: Optional[str]) -> dict | None:
    if not gid:
        return None
    try:
        with open(_game_path(gid), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _all_games() -> list[dict]:
    out = []
    for path in glob.glob(os.path.join(_GAMES_DIR, "*.json")):
        try:
            with open(path, "r", encoding="utf-8") as f:
                out.append(json.load(f))
        except Exception:
            continue
    return out


def _game_by_code(code: str) -> dict | None:
    code = (code or "").strip().upper()
    return next((g for g in _all_games() if g.get("code") == code), None)


def _game_status(g: dict) -> str:
    today = E.beijing_today()
    if today < g["start_date"]:
        return "upcoming"
    if today > g["end_date"]:
        return "ended"
    return "active"


def _game_book(account: dict, g: dict) -> Book:
    store = account.setdefault("games", {}).setdefault(g["id"], {"joined": E.beijing_today()})
    return Book(store, "", g["market"], float(g["start_cash"]), bool(g.get("allow_short")) and g["market"] in SHORT_MARKETS, "game")


def _game_public(g: dict, device_id: str = "") -> dict:
    return {
        "id": g["id"], "code": g["code"], "name": g["name"], "market": g["market"], "currency": CURRENCY[g["market"]],
        "start_cash": g["start_cash"], "start_date": g["start_date"], "end_date": g["end_date"],
        "allow_short": g.get("allow_short", False), "members": len(g.get("members", {})),
        "owner_nickname": g.get("owner_nickname", ""), "status": _game_status(g),
        "is_owner": bool(device_id) and g.get("owner") == device_id, "joined": device_id in g.get("members", {}),
    }


def _game_leaderboard(g: dict, device_id: str = "") -> list[dict]:
    rows = []
    for d, meta in g.get("members", {}).items():
        a = _load_account(d)
        if not a or g["id"] not in a.get("games", {}):
            continue
        rows.append((d, meta, _game_book(a, g)))
    syms = set().union(*[b.symbols() for _, _, b in rows]) if rows else set()
    prices = {s: v["price"] for s, v in E.quotes(g["market"], sorted(syms)).items()}
    out = []
    for d, meta, b in rows:
        v = b.value(prices)
        out.append({"nickname": meta.get("nickname") or "?", "total_value": round(v, 2),
                    "return_pct": round((v - b.initial) / b.initial * 100, 2), "trades": len(b.transactions),
                    "is_me": d == device_id})
    out.sort(key=lambda r: r["total_value"], reverse=True)
    for i, r in enumerate(out, 1):
        r["rank"] = i
    return out


def _clean_nick(n: Optional[str]) -> Optional[str]:
    n = re.sub(r"\s+", " ", (n or "")).strip()
    if not n:
        return None
    if not (2 <= len(n) <= 16) or not re.fullmatch(r"[\w぀-ヿ一-鿿가-힯 .\-#]+", n):
        raise HTTPException(400, "Nickname: 2–16 letters, numbers, spaces or - _ . #")
    return n


# ── Endpoints: account ───────────────────────────────────────────────────────

def _views(account: dict) -> dict:
    today = E.beijing_today()
    out = {}
    for m in MARKETS:
        b = _market_book(account, m)
        v = E.book_view(b, E.quotes(m, sorted(b.symbols())), today)
        v["rank"] = _rank_of(account["device_id"], m)
        out[m] = v
    return out


@router.post("/account")
def create_or_get_account(body: DeviceBody):
    with _lock(body.device_id):
        account = _load_account(body.device_id)
        is_new = account is None
        # A visit alone does not create an account: new devices get an unsaved preview; the first trade saves it.
        account = _new_account(body.device_id) if is_new else _migrate_account(account)
        views = _views(account)
        today = E.beijing_today()
        for key, m in (("total_value_history", "cn"), ("us_total_value_history", "us")):
            hist = account.setdefault(key, [])
            if not hist or hist[-1]["date"] != today:
                hist.append({"date": today, "value": views[m]["total_value"]})
                account[key] = hist[-90:]
        if not is_new:
            _save_account(account)

    games = [_game_public(g, body.device_id) for g in (_load_game(gid) for gid in list(account.get("games", {}))) if g]
    cn, us = views["cn"], views["us"]
    return {
        **{k: v for k, v in account.items() if k != "games"},
        "markets": views,
        "games": games,
        # Original fields, for older app builds
        "portfolio": cn["portfolio"], "total_value": cn["total_value"], "return_pct": cn["return_pct"], "rank": cn["rank"],
        "transactions": account.get("transactions", [])[-20:],
        "us_portfolio": us["portfolio"], "us_total_value": us["total_value"], "us_return_pct": us["return_pct"],
        "us_rank": us["rank"], "us_transactions": account.get("us_transactions", [])[-20:],
    }


@router.get("/account/{device_id}")
def get_account(device_id: str):
    account = _load_account(device_id)
    if account is None:
        raise HTTPException(status_code=404, detail="账户不存在")
    account = _migrate_account(account)
    b = _market_book(account, "cn")
    v = E.book_view(b, E.quotes("cn", sorted(b.symbols())), E.beijing_today())
    return {"cash": account["cash"], "portfolio": v["portfolio"], "total_value": v["total_value"],
            "return_pct": v["return_pct"], "total_commission_paid": account.get("total_commission_paid", 0),
            "transactions": account.get("transactions", [])[-20:], "rank": _rank_of(device_id, "cn"),
            "nickname": account.get("nickname", "")}


@router.post("/nickname")
def set_nickname(body: NicknameBody):
    nick = _clean_nick(body.nickname)
    if not nick:
        raise HTTPException(400, "Nickname required")
    with _lock(body.device_id):
        account = _migrate_account(_load_account(body.device_id) or _new_account(body.device_id))
        account["nickname"] = nick
        _save_account(account)
    with _games_lock:         # keep competition leaderboards in step
        for gid in account.get("games", {}):
            g = _load_game(gid)
            if g and body.device_id in g.get("members", {}):
                g["members"][body.device_id]["nickname"] = nick
                if g.get("owner") == body.device_id:
                    g["owner_nickname"] = nick
                _write_json(_game_path(gid), g)
    for m in MARKETS:
        _rank_cache.pop(m, None)
    return {"success": True, "nickname": nick}


@router.get("/session")
def sessions():
    return {m: E.session(m) for m in MARKETS}


# ── Endpoints: immediate trades (original contract) ──────────────────────────

def _check_lot(market: str, side: str, shares: int, lot: int, held: int = 0):
    if shares <= 0:
        raise HTTPException(400, "Shares must be a positive integer")
    if market != "us" and shares % lot and not (side in ("sell", "cover") and shares == held):
        raise HTTPException(400, f"Shares must be a multiple of the board lot ({lot})")


def _need_bp(market: str, bp: float, need: float):
    if bp + 1e-9 < need:
        cur = CURRENCY[market]
        raise HTTPException(400, f"Insufficient buying power. Need {cur}{need:,.2f}, available {cur}{max(bp, 0):,.2f}")


@router.post("/buy")
def buy_stock(body: BuyBody):
    market = _norm_market(body.market)
    with _Localized(body.lang, market), _lock(body.device_id):
        account = _load_account(body.device_id)
        account = _new_account(body.device_id) if account is None else _migrate_account(account)
        book = _market_book(account, market)
        sym = E.norm_symbol(market, body.symbol)
        q = E.quote_one(market, sym)
        _check_lot(market, "buy", body.shares, q["lot"])
        prices = {s: v["price"] for s, v in E.quotes(market, sorted(book.symbols())).items()}
        amount = q["price"] * body.shares
        _need_bp(market, book.buying_power(prices), amount + E.fee(market, "buy", amount, body.shares))
        res = E.execute(book, "buy", sym, body.shares, q["price"], q["name"], q["lot"], E.beijing_today())
        _save_account(account)
    _rank_cache.pop(market, None)
    return {"success": True, "message": _msg("buy", body.lang, market, name=q["name"], shares=body.shares), **res,
            "available_date": book.transactions[-1].get("available_date")}


@router.post("/sell")
def sell_stock(body: SellBody):
    market = _norm_market(body.market)
    with _Localized(body.lang, market), _lock(body.device_id):
        account = _load_account(body.device_id)
        if account is None:
            raise HTTPException(status_code=404, detail="账户不存在，请先创建")
        account = _migrate_account(account)
        book = _market_book(account, market)
        sym = E.norm_symbol(market, body.symbol)
        pos = book.portfolio.get(sym)
        if not pos:
            raise HTTPException(400, f"You don't hold any {sym}")
        q = E.quote_one(market, sym)
        _check_lot(market, "sell", body.shares, int(pos.get("lot") or q["lot"]), int(pos["shares"]))
        pend = book.pending("sell", sym)
        if pend and body.shares > book.available(sym, E.beijing_today()) - pend:
            raise HTTPException(400, f"{pend} shares are already in open sell orders")
        res = E.execute(book, "sell", sym, body.shares, q["price"], q["name"], q["lot"], E.beijing_today())
        _save_account(account)
    _rank_cache.pop(market, None)
    return {"success": True, "message": _msg("sell", body.lang, market, name=q["name"], shares=body.shares), **res}


# ── Endpoints: orders ────────────────────────────────────────────────────────

_order_rate: dict = defaultdict(list)


def _rate_ok(device_id: str, limit: int = 40) -> bool:
    now = time.time()
    ts = _order_rate[device_id]
    ts[:] = [t for t in ts if now - t < 60]
    if len(ts) >= limit:
        return False
    ts.append(now)
    return True


def _resolve_book(account: dict, market: str, game_id: Optional[str]) -> tuple:
    if not game_id:
        return _market_book(account, market), None
    g = _load_game(game_id)
    if not g or account["device_id"] not in g.get("members", {}):
        raise HTTPException(404, "Competition not found")
    st = _game_status(g)
    if st == "ended":
        raise HTTPException(400, "This competition has ended")
    if st == "upcoming":
        raise HTTPException(400, "This competition has not started yet")
    return _game_book(account, g), g


@router.post("/order")
def place_order(body: OrderBody):
    if not _rate_ok(body.device_id):
        raise HTTPException(429, "Too many orders; wait a minute")
    side, otype, tif = body.side.lower(), body.type.lower(), body.tif.lower()
    g0 = _load_game(body.game_id) if body.game_id else None
    market = g0["market"] if g0 else _norm_market(body.market, "us")
    lang = body.lang
    with _Localized(lang, market), _lock(body.device_id):
        if side not in E.SIDES or otype not in E.ORDER_TYPES or tif not in ("day", "gtc"):
            raise HTTPException(400, "Invalid order")
        if otype == "trailing_stop" and side not in ("sell", "cover"):
            raise HTTPException(400, "Trailing stops are for selling or covering")
        account = _load_account(body.device_id)
        account = _new_account(body.device_id) if account is None else _migrate_account(account)
        book, game = _resolve_book(account, market, body.game_id)
        if side in ("short", "cover") and not book.short_ok:
            raise HTTPException(400, "Short selling is not available for this portfolio")
        sym = E.norm_symbol(market, body.symbol)
        q = E.quote_one(market, sym)
        today = E.beijing_today()
        held = int((book.portfolio.get(sym) or {}).get("shares", 0)) if side == "sell" else \
            int((book.shorts.get(sym) or {}).get("shares", 0)) if side == "cover" else 0
        lot = int((book.portfolio.get(sym) or {}).get("lot") or q["lot"])
        _check_lot(market, side, body.shares, lot, held)

        now = datetime.now(timezone.utc)
        o = {"id": E.new_order_id(), "market": market, "side": side, "type": otype, "symbol": sym, "name": q["name"],
             "lot": lot, "shares": int(body.shares), "tif": tif, "status": "open",
             "created_at": now.isoformat(), "created_date": today, "ref_price": q["price"]}
        if otype in ("limit", "stop_limit"):
            if not body.limit_price or body.limit_price <= 0:
                raise HTTPException(400, "Enter a limit price")
            o["limit_price"] = round(float(body.limit_price), 4)
        if otype in ("stop", "stop_limit"):
            if not body.stop_price or body.stop_price <= 0:
                raise HTTPException(400, "Enter a stop price")
            o["stop_price"] = round(float(body.stop_price), 4)
        if otype == "trailing_stop":
            if not body.trail_pct or not (0.5 <= body.trail_pct <= 50):
                raise HTTPException(400, "Trail percentage must be between 0.5% and 50%")
            o["trail_pct"] = round(float(body.trail_pct), 2)
            o["watermark"] = q["price"]
            pct = o["trail_pct"] / 100
            o["stop_price"] = round(q["price"] * (1 - pct if side == "sell" else 1 + pct), 4)
        expires = E.day_close(market) if tif == "day" else now + timedelta(days=E.GTC_DAYS)
        if game:
            expires = min(expires, datetime.fromisoformat(game["end_date"] + "T23:59:00+08:00"))
        o["expires_at"] = expires.isoformat()

        prices = {s: v["price"] for s, v in E.quotes(market, sorted(book.symbols() | {sym})).items()}
        bp = book.buying_power(prices)
        if side == "sell":
            if not held:
                raise HTTPException(400, f"You don't hold any {sym}")
            free = book.available(sym, today) - book.pending("sell", sym)
            if body.shares > free:
                if market == "cn" and book.available(sym, today) < held:
                    raise HTTPException(400, "T+1: shares bought today can be sold tomorrow")
                if book.pending("sell", sym):
                    raise HTTPException(400, f"{book.pending('sell', sym)} shares are already in open sell orders")
                raise HTTPException(400, f"Insufficient shares. Hold {held}, tried to sell {body.shares}")
        if side == "cover" and body.shares > held - book.pending("cover", sym):
            raise HTTPException(400, f"You are not short {body.shares} shares of {sym}")
        if side == "short" and q["price"] < E.MIN_SHORT_PRICE:
            raise HTTPException(400, f"Shares under {CURRENCY[market]}{E.MIN_SHORT_PRICE:.0f} cannot be sold short")

        # A market order while the exchange is open fills now
        if otype == "market" and E.is_open(market):
            amount = q["price"] * body.shares
            if side == "buy":
                _need_bp(market, bp, amount + E.fee(market, "buy", amount, body.shares))
            if side == "short":
                _need_bp(market, bp, (E.SHORT_RESERVE - 1) * amount)
            res = E.execute(book, side, sym, body.shares, q["price"], q["name"], lot, today, o["id"])
            o.update(status="filled", filled_price=q["price"], filled_at=o["created_at"])
            if game:
                o["game_id"] = game["id"]
            book.orders.append(o)
            _save_account(account)
            _rank_cache.pop(market, None)
            return {"success": True, "filled": True, "order": o,
                    "message": _msg(side, lang, market, name=q["name"], shares=body.shares), **res}

        o["reserve"] = E.reserve_for(market, side, body.shares, q["price"], o)
        if o["reserve"]:
            _need_bp(market, bp, o["reserve"])
        if game:
            o["game_id"] = game["id"]
        book.orders.append(o)
        book.s[book.k("orders")] = book.orders[-200:]
        _save_account(account)
    what = _describe(o, _lang(lang, market))
    return {"success": True, "pending": True, "order": o,
            "message": _msg("queued" if otype == "market" else "placed", lang, market, what=what)}


@router.post("/order/cancel")
def cancel_order(body: CancelBody):
    with _lock(body.device_id):
        account = _load_account(body.device_id)
        if not account:
            raise HTTPException(404, "Order not found")
        account = _migrate_account(account)
        if body.game_id:
            g = _load_game(body.game_id)
            books = [_game_book(account, g)] if g and body.game_id in account.get("games", {}) else []
        else:
            books = [_market_book(account, m) for m in MARKETS]
        for b in books:
            for o in b.orders:
                if o["id"] == body.order_id and o["status"] == "open":
                    o.update(status="cancelled", closed_at=datetime.now(timezone.utc).isoformat())
                    _save_account(account)
                    return {"success": True, "order": o, "message": _msg("cancelled", body.lang, b.market)}
    raise HTTPException(404, "Order not found")


# ── Endpoints: competitions ──────────────────────────────────────────────────

@router.post("/games/create")
def create_game(body: GameCreateBody):
    market = _norm_market(body.market, "us")
    name = re.sub(r"\s+", " ", body.name or "").strip()
    if not (2 <= len(name) <= 40):
        raise HTTPException(400, "Name: 2–40 characters")
    lo, hi = _START_CASH[market]
    if not (lo <= body.start_cash <= hi):
        raise HTTPException(400, f"Starting cash must be between {CURRENCY[market]}{lo:,} and {CURRENCY[market]}{hi:,}")
    today = E.beijing_today()
    try:
        end = datetime.strptime(body.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "End date must be YYYY-MM-DD")
    start = datetime.strptime(today, "%Y-%m-%d").date()
    if not (start + timedelta(days=1) <= end <= start + timedelta(days=366)):
        raise HTTPException(400, "The competition must last between 1 day and 1 year")
    nick = _clean_nick(body.nickname)
    with _games_lock:
        if sum(1 for g in _all_games() if g.get("owner") == body.device_id) >= 20:
            raise HTTPException(400, "You can run up to 20 competitions")
        codes = {g.get("code") for g in _all_games()}
        code = next(c for c in ("".join(random.choice(_CODE_CHARS) for _ in range(6)) for _ in range(100)) if c not in codes)
        gid = "g" + secrets.token_hex(6)
        with _lock(body.device_id):
            account = _migrate_account(_load_account(body.device_id) or _new_account(body.device_id))
            if nick:
                account["nickname"] = nick
            g = {"id": gid, "code": code, "name": name, "market": market, "start_cash": float(body.start_cash),
                 "start_date": today, "end_date": end.isoformat(),
                 "allow_short": bool(body.allow_short) and market in SHORT_MARKETS,
                 "owner": body.device_id, "owner_nickname": account["nickname"],
                 "created_at": datetime.now(timezone.utc).isoformat(),
                 "members": {body.device_id: {"nickname": account["nickname"], "joined": today}}}
            _write_json(_game_path(gid), g)
            _game_book(account, g)
            _save_account(account)
    return {"success": True, "game": _game_public(g, body.device_id)}


@router.post("/games/join")
def join_game(body: GameJoinBody):
    nick = _clean_nick(body.nickname)
    with _games_lock:
        g = _game_by_code(body.code)
        if not g:
            raise HTTPException(404, "No competition with that code")
        if _game_status(g) == "ended":
            raise HTTPException(400, "This competition has ended")
        if body.device_id not in g["members"] and len(g["members"]) >= 300:
            raise HTTPException(400, "This competition is full")
        with _lock(body.device_id):
            account = _migrate_account(_load_account(body.device_id) or _new_account(body.device_id))
            if nick:
                account["nickname"] = nick
            g["members"].setdefault(body.device_id, {"nickname": account["nickname"], "joined": E.beijing_today()})
            _write_json(_game_path(g["id"]), g)
            _game_book(account, g)
            _save_account(account)
    return {"success": True, "game": _game_public(g, body.device_id)}


@router.post("/games/leave")
def leave_game(body: GameIdBody):
    with _games_lock:
        g = _load_game(body.game_id)
        if not g or body.device_id not in g.get("members", {}):
            raise HTTPException(404, "Competition not found")
        if g.get("owner") == body.device_id:
            raise HTTPException(400, "The organiser cannot leave; delete the competition instead")
        g["members"].pop(body.device_id, None)
        _write_json(_game_path(g["id"]), g)
    with _lock(body.device_id):
        account = _load_account(body.device_id)
        if account:
            account.get("games", {}).pop(body.game_id, None)
            _save_account(account)
    return {"success": True}


@router.post("/games/delete")
def delete_game(body: GameIdBody):
    with _games_lock:
        g = _load_game(body.game_id)
        if not g or g.get("owner") != body.device_id:
            raise HTTPException(404, "Competition not found")
        os.remove(_game_path(g["id"]))
    for d in g.get("members", {}):
        with _lock(d):
            a = _load_account(d)
            if a and g["id"] in a.get("games", {}):
                a["games"].pop(g["id"])
                _save_account(a)
    return {"success": True}


@router.post("/games/account")
def game_account(body: GameIdBody):
    g = _load_game(body.game_id)
    if not g or body.device_id not in g.get("members", {}):
        raise HTTPException(404, "Competition not found")
    with _lock(body.device_id):
        account = _load_account(body.device_id)
        if not account:
            raise HTTPException(404, "Competition not found")
        book = _game_book(account, g)
        v = E.book_view(book, E.quotes(g["market"], sorted(book.symbols())), E.beijing_today())
    board = _game_leaderboard(g, body.device_id)
    me = next((r for r in board if r["is_me"]), None)
    v["rank"] = me["rank"] if me else -1
    return {**v, "game": _game_public(g, body.device_id), "leaderboard": board[:100]}


@router.get("/games/info/{code}")
def game_info(code: str, device_id: str = ""):
    g = _game_by_code(code) or _load_game(code)
    if not g:
        raise HTTPException(404, "No competition with that code")
    return {"game": _game_public(g, device_id), "leaderboard": _game_leaderboard(g, device_id)[:100]}


# ── Leaderboard, reset ───────────────────────────────────────────────────────

@router.get("/leaderboard")
def leaderboard(device_id: str = "", market: str = "cn"):
    """Top 20 for one market (holdings at market price), only accounts that have traded there.
    `market` defaults to cn so older app builds keep their previous behaviour."""
    market = _norm_market(market)
    initial = INITIAL[market]
    out = []
    for i, (d, a, total) in enumerate(_ranked_values(market)[:20], 1):
        out.append({"rank": i, "nickname": a.get("nickname", "用户#????"),
                    "return_pct": round((total - initial) / initial * 100, 2), "total_value": round(total, 2),
                    "is_me": device_id != "" and d == device_id})
    return out


@router.post("/reset")
def reset_account(body: DeviceBody):
    """Fresh start for the four market accounts; nickname and competitions are kept."""
    with _lock(body.device_id):
        account = _load_account(body.device_id)
        if account is not None:
            fresh = _new_account(body.device_id)
            fresh["nickname"] = account.get("nickname", fresh["nickname"])
            fresh["games"] = account.get("games", {})
            _save_account(fresh)
    for m in MARKETS:
        _rank_cache.pop(m, None)
    return {"success": True, "message": "账户已重置：美股 $10万、A股 100万元、港股 HK$100万、日股 ¥1000万"}


# ── Order matcher ────────────────────────────────────────────────────────────

def _match_book(book: Book, q: dict, now: datetime, today: str, game: Optional[dict]) -> bool:
    """Expire or fill this book's open orders. Returns True when anything changed."""
    changed = False
    open_now = E.is_open(book.market, now)
    for o in book.orders:
        if o.get("status") != "open":
            continue
        if game and _game_status(game) == "ended":
            o.update(status="expired", closed_at=now.isoformat(), reason="competition ended")
            changed = True
            continue
        if o.get("expires_at") and now >= datetime.fromisoformat(o["expires_at"]):
            o.update(status="expired", closed_at=now.isoformat())
            changed = True
            continue
        quote = q.get(o["symbol"])
        if not open_now or not quote:
            continue
        before = (o.get("watermark"), o.get("triggered"), o.get("stop_price"))
        if E.should_fill(o, quote["price"]):
            try:
                E.execute(book, o["side"], o["symbol"], int(o["shares"]), quote["price"], o.get("name") or quote["name"],
                          int(o.get("lot") or quote["lot"]), today, o["id"])
                o.update(status="filled", filled_price=quote["price"], filled_at=now.isoformat())
            except HTTPException as e:
                o.update(status="rejected", closed_at=now.isoformat(), reason=str(e.detail))
            changed = True
        elif (o.get("watermark"), o.get("triggered"), o.get("stop_price")) != before:
            changed = True
    return changed


def _match_once(now: Optional[datetime] = None, quotes_override: Optional[dict] = None):
    now = now or datetime.now(timezone.utc)
    today = E.beijing_today()
    games: dict = {}
    pending: list = []
    wanted: dict = defaultdict(set)
    for path in glob.glob(os.path.join(_DATA_DIR, "*.json")):
        try:
            with open(path, "r", encoding="utf-8") as f:
                a = json.load(f)
        except Exception:
            continue
        hits = []
        for m in MARKETS:
            for o in a.get(PREFIX[m] + "orders", []):
                if o.get("status") == "open":
                    hits.append(("m", m, m))
                    wanted[m].add(o["symbol"])
        for gid, store in (a.get("games") or {}).items():
            for o in store.get("orders", []):
                if o.get("status") == "open":
                    g = games.get(gid) or _load_game(gid)
                    if not g:
                        continue
                    games[gid] = g
                    hits.append(("g", gid, g["market"]))
                    wanted[g["market"]].add(o["symbol"])
        if hits:
            pending.append((a["device_id"], hits))
    if not pending:
        return
    q = quotes_override if quotes_override is not None else \
        {m: (E.quotes(m, sorted(s)) if E.is_open(m, now) else {}) for m, s in wanted.items()}
    for device_id, hits in pending:
        with _lock(device_id):
            a = _load_account(device_id)
            if not a:
                continue
            a = _migrate_account(a)
            changed = False
            for kind, key, m in dict.fromkeys(hits):
                book = _market_book(a, key) if kind == "m" else _game_book(a, games[key])
                changed |= _match_book(book, q.get(m, {}), now, today, games.get(key) if kind == "g" else None)
            if changed:
                _save_account(a)
                for m in MARKETS:
                    _rank_cache.pop(m, None)


def _matcher_loop():
    while True:
        try:
            _match_once()
        except Exception as e:
            logger.warning("order matcher: %s", e)
        time.sleep(20)


threading.Thread(target=_matcher_loop, daemon=True, name="paper-orders").start()


# ── Performance curve vs the market ──────────────────────────────────────────
#
# The account only snapshots its value on days someone opens it, so the curve is rebuilt from the
# trade list instead: cash and holdings replayed day by day and valued at each day's close. The
# benchmark (SPY, CSI 300, Tracker Fund 02800, Nikkei ETF 1321) is scaled to the same starting money.

_perf_cache: dict = {}
_PERF_TTL = 600
_BENCH = {"us": ("SPY", "S&P 500"), "cn": ("sh000300", "CSI 300"), "hk": ("02800", "Hang Seng"), "jp": ("1321", "Nikkei 225")}


def _daily_closes(symbol: str, market: str, days: int) -> dict:
    """{YYYY-MM-DD: close} from Tencent's kline feed (A-shares unadjusted, the account trades at real prices)."""
    import requests
    try:
        if market == "us":
            from routers.us_stocks import _tencent_history
            return {c["date"]: c["close"] for c in _tencent_history(symbol, days)}
        if market in ("hk", "jp"):
            from routers.global_stocks import history
            return {c["date"]: c["close"] for c in history(market, symbol)}
        code = symbol if symbol.startswith(("sh", "sz", "bj")) else (
            ("sh" if symbol.startswith(("6", "5", "9")) else "bj" if symbol.startswith(("4", "8")) else "sz") + symbol)
        n = max(min(int(days * 0.72) + 20, 1000), 30)
        r = requests.get("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get", params={"param": f"{code},day,,,{n},"}, timeout=8)
        node = (r.json().get("data") or {}).get(code) or {}
        rows = node.get("day") or node.get("qfqday") or []
        return {row[0]: float(row[2]) for row in rows}
    except Exception as e:
        logger.warning("daily closes %s/%s failed: %s", market, symbol, e)
        return {}


def _performance(book: Book) -> dict:
    market = book.market
    txs = sorted(book.transactions, key=lambda t: (t.get("date", ""), t.get("time", "")))
    initial = book.initial
    bench_sym, bench_name = _BENCH[market]
    if not txs:
        return {"points": [], "benchmark": bench_name, "initial": initial}
    first = txs[0]["date"]
    span = (datetime.now(E.BEIJING).date() - datetime.strptime(first, "%Y-%m-%d").date()).days + 20
    bench = _daily_closes(bench_sym, market, span)
    days = sorted(d for d in bench if d >= first)
    before = [d for d in sorted(bench) if d < first]
    if not days or not before:
        # Traded after the last session (weekend, overnight): the first point comes with the next close
        return {"points": [], "benchmark": bench_name, "initial": initial, "pending": True}
    base_day = before[-1]
    base_bench = bench[base_day]
    closes = {s: _daily_closes(s, market, span) for s in sorted({t["symbol"] for t in txs})}

    sign = {"buy": 1, "sell": -1, "short": -1, "cover": 1}
    cash, holdings, i, last = initial, {}, 0, {}
    points = [{"date": base_day, "value": round(initial, 2), "bench": round(initial, 2)}]
    for d in days:
        while i < len(txs) and txs[i]["date"] <= d:
            t = txs[i]
            amt, fee = float(t.get("amount") or 0), float(t.get("commission") or 0)
            s = sign.get(t["type"], 0)
            cash += -(amt + fee) if s > 0 else (amt - fee)
            holdings[t["symbol"]] = holdings.get(t["symbol"], 0) + s * int(t["shares"])
            last.setdefault(t["symbol"], float(t["price"]))
            i += 1
        value = cash
        for sym, n in holdings.items():
            if n == 0:
                continue
            px = closes.get(sym, {}).get(d)
            if px:
                last[sym] = px
            value += n * last.get(sym, 0)
        points.append({"date": d, "value": round(value, 2), "bench": round(initial * bench[d] / base_bench, 2)})

    peak, mdd = points[0]["value"], 0.0
    for p in points:
        peak = max(peak, p["value"])
        mdd = min(mdd, (p["value"] - peak) / peak * 100 if peak else 0)
    ret = (points[-1]["value"] / initial - 1) * 100
    bret = (points[-1]["bench"] / initial - 1) * 100
    return {"points": points, "benchmark": bench_name, "initial": initial,
            "return_pct": round(ret, 2), "bench_return_pct": round(bret, 2),
            "excess_pct": round(ret - bret, 2), "max_drawdown_pct": round(mdd, 2), "since": base_day}


class PerformanceBody(BaseModel):
    device_id: str
    market: Optional[str] = "us"
    game_id: Optional[str] = None


@router.post("/performance")
def performance(body: PerformanceBody):
    market = _norm_market(body.market, "us")
    account = _load_account(body.device_id)
    g = _load_game(body.game_id) if body.game_id else None
    if account is None or (body.game_id and (not g or body.game_id not in account.get("games", {}))):
        m = g["market"] if g else market
        return {"points": [], "benchmark": _BENCH[m][1], "initial": float(g["start_cash"]) if g else INITIAL[m]}
    book = _game_book(account, g) if g else _market_book(account, market)
    key = (body.device_id, body.game_id or market)
    n = len(book.transactions)
    hit = _perf_cache.get(key)
    if hit and hit[1] == n and time.time() - hit[0] < _PERF_TTL:
        return hit[2]
    result = _performance(book)
    if len(_perf_cache) > 2000:
        _perf_cache.clear()
    _perf_cache[key] = (time.time(), n, result)
    return result
