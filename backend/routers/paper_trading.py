"""
Paper Trading — /api/paper/*

Supports both CN (A-share) and US markets in one account file.

CN rules:
  Buy:  0.03% commission (min ¥5)
  Sell: 0.13% (commission + stamp duty, min ¥5)
  T+1: shares bought today cannot be sold until next day
  Lot size: 100 shares
  Initial cash: ¥1,000,000

US rules:
  Buy:  $0 commission (zero-commission brokers)
  Sell: SEC fee = $0.000008 per share (negligible, included for realism)
  T+2: shares bought today can be sold after 2 trading days
  Lot size: 1 share
  Initial cash: $100,000
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import json
import glob
import random
import logging

router = APIRouter()
logger = logging.getLogger("paper_trading")

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "paper_trading")
os.makedirs(_DATA_DIR, exist_ok=True)

# CN settings
_INITIAL_CASH   = 1_000_000.0
_BUY_RATE       = 0.0003
_SELL_RATE      = 0.0013
_MIN_COMMISSION = 5.0
_LOT_SIZE       = 100

# US settings
_US_INITIAL_CASH = 100_000.0
_US_SEC_FEE_PER_SHARE = 0.000008   # SEC fee on sell

_BEIJING_TZ = timezone(timedelta(hours=8))


# ── Helpers ──────────────────────────────────────────────────────────────────

def _beijing_today() -> str:
    return datetime.now(_BEIJING_TZ).strftime("%Y-%m-%d")


def _account_path(device_id: str) -> str:
    # Sanitise device_id to prevent path traversal
    safe = "".join(c for c in device_id if c.isalnum() or c in "-_")[:64]
    return os.path.join(_DATA_DIR, f"{safe}.json")


def _load_account(device_id: str) -> dict | None:
    path = _account_path(device_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _save_account(account: dict) -> None:
    path = _account_path(account["device_id"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(account, f, ensure_ascii=False, indent=2)


def _new_account(device_id: str) -> dict:
    suffix = str(random.randint(1000, 9999))
    today = _beijing_today()
    return {
        "device_id": device_id,
        "nickname": f"用户#{suffix}",
        "created_at": today,
        # CN market
        "cash": _INITIAL_CASH,
        "portfolio": {},
        "transactions": [],
        "total_commission_paid": 0.0,
        "total_value_history": [{"date": today, "value": _INITIAL_CASH}],
        # US market
        "us_cash": _US_INITIAL_CASH,
        "us_portfolio": {},
        "us_transactions": [],
        "us_total_commission_paid": 0.0,
        "us_total_value_history": [{"date": today, "value": _US_INITIAL_CASH}],
    }


def _migrate_account(account: dict) -> dict:
    """Add US fields to accounts created before US support."""
    today = _beijing_today()
    if "us_cash" not in account:
        account["us_cash"] = _US_INITIAL_CASH
        account["us_portfolio"] = {}
        account["us_transactions"] = []
        account["us_total_commission_paid"] = 0.0
        account["us_total_value_history"] = [{"date": today, "value": _US_INITIAL_CASH}]
    return account


def _get_realtime_price(symbol: str) -> tuple[float, str]:
    """Return (price, name) or raise HTTPException."""
    try:
        from services.stock_service import get_realtime_quote
        q = get_realtime_quote(symbol)
        if q and q.get("price"):
            return float(q["price"]), q.get("name", symbol)
    except Exception as e:
        logger.warning("realtime price for %s: %s", symbol, e)
    raise HTTPException(status_code=503, detail=f"无法获取 {symbol} 实时价格，请稍后重试")


def _get_us_realtime_price(symbol: str) -> tuple[float, str]:
    """Return (price, name) for a US ticker via yfinance."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )
        if price:
            name = info.get("shortName") or info.get("longName") or symbol.upper()
            return float(price), name
    except Exception as e:
        logger.warning("US realtime price for %s: %s", symbol, e)
    raise HTTPException(status_code=503, detail=f"Cannot fetch price for {symbol}. Try again later.")


def _buy_commission(amount: float) -> float:
    return max(_MIN_COMMISSION, amount * _BUY_RATE)


def _sell_commission(amount: float) -> float:
    return max(_MIN_COMMISSION, amount * _SELL_RATE)


def _us_sell_commission(shares: int) -> float:
    """SEC fee only: $0.000008/share (rounds to ~$0 for small trades)."""
    return round(shares * _US_SEC_FEE_PER_SHARE, 6)


def _compute_portfolio(account: dict) -> dict:
    """Enrich CN portfolio positions with current price, market value, P&L."""
    today = _beijing_today()
    enriched = {}
    for symbol, pos in account["portfolio"].items():
        shares = pos["shares"]
        avg_cost = pos["avg_cost"]
        buy_date = pos.get("buy_date", "")
        available = shares if buy_date < today else 0

        try:
            price, _ = _get_realtime_price(symbol)
        except Exception:
            price = avg_cost

        market_value = round(price * shares, 2)
        cost_basis   = round(avg_cost * shares, 2)
        profit_loss  = round(market_value - cost_basis, 2)
        pl_pct       = round((profit_loss / cost_basis * 100) if cost_basis else 0, 2)

        enriched[symbol] = {
            "shares":          shares,
            "avg_cost":        avg_cost,
            "current_price":   price,
            "market_value":    market_value,
            "profit_loss":     profit_loss,
            "profit_loss_pct": pl_pct,
            "available_shares":available,
            "buy_date":        buy_date,
        }
    return enriched


def _compute_us_portfolio(account: dict) -> dict:
    """Enrich US portfolio positions with current price, market value, P&L."""
    today = _beijing_today()
    enriched = {}
    for symbol, pos in account.get("us_portfolio", {}).items():
        shares = pos["shares"]
        avg_cost = pos["avg_cost"]
        buy_date = pos.get("buy_date", "")
        # T+2: available 2 days after buy_date
        avail_date = pos.get("available_date", "")
        available = shares if (not avail_date or avail_date <= today) else 0

        try:
            price, _ = _get_us_realtime_price(symbol)
        except Exception:
            price = avg_cost

        market_value = round(price * shares, 4)
        cost_basis   = round(avg_cost * shares, 4)
        profit_loss  = round(market_value - cost_basis, 4)
        pl_pct       = round((profit_loss / cost_basis * 100) if cost_basis else 0, 2)

        enriched[symbol] = {
            "shares":          shares,
            "avg_cost":        avg_cost,
            "current_price":   price,
            "market_value":    market_value,
            "profit_loss":     profit_loss,
            "profit_loss_pct": pl_pct,
            "available_shares":available,
            "buy_date":        buy_date,
            "available_date":  avail_date,
        }
    return enriched


def _total_value(account: dict, enriched_portfolio: dict) -> float:
    portfolio_value = sum(p["market_value"] for p in enriched_portfolio.values())
    return round(account["cash"] + portfolio_value, 2)


def _us_total_value(account: dict, enriched_portfolio: dict) -> float:
    portfolio_value = sum(p["market_value"] for p in enriched_portfolio.values())
    return round(account.get("us_cash", _US_INITIAL_CASH) + portfolio_value, 4)


def _return_pct(total: float) -> float:
    return round((total - _INITIAL_CASH) / _INITIAL_CASH * 100, 4)


def _us_return_pct(total: float) -> float:
    return round((total - _US_INITIAL_CASH) / _US_INITIAL_CASH * 100, 4)


def _all_accounts() -> list[dict]:
    accounts = []
    for path in glob.glob(os.path.join(_DATA_DIR, "*.json")):
        try:
            with open(path, "r", encoding="utf-8") as f:
                accounts.append(json.load(f))
        except Exception:
            continue
    return accounts


def _rank_of(device_id: str, sorted_accounts: list[dict]) -> int:
    for i, a in enumerate(sorted_accounts, 1):
        if a["device_id"] == device_id:
            return i
    return -1


# ── Pydantic models ──────────────────────────────────────────────────────────

class DeviceBody(BaseModel):
    device_id: str

class BuyBody(BaseModel):
    device_id: str
    symbol: str
    shares: int
    market: Optional[str] = "cn"   # "cn" or "us"

class SellBody(BaseModel):
    device_id: str
    symbol: str
    shares: int
    market: Optional[str] = "cn"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/account")
def create_or_get_account(body: DeviceBody):
    account = _load_account(body.device_id)
    if account is None:
        account = _new_account(body.device_id)
    else:
        account = _migrate_account(account)
    _save_account(account)

    # CN
    enriched    = _compute_portfolio(account)
    total       = _total_value(account, enriched)
    # US
    us_enriched = _compute_us_portfolio(account)
    us_total    = _us_total_value(account, us_enriched)

    today = _beijing_today()
    history = account.get("total_value_history", [])
    if not history or history[-1]["date"] != today:
        history.append({"date": today, "value": total})
        account["total_value_history"] = history[-90:]
    us_history = account.get("us_total_value_history", [])
    if not us_history or us_history[-1]["date"] != today:
        us_history.append({"date": today, "value": us_total})
        account["us_total_value_history"] = us_history[-90:]
    _save_account(account)

    all_accs    = _all_accounts()
    sorted_accs = sorted(all_accs, key=lambda a: a.get("cash", 0), reverse=True)
    rank        = _rank_of(body.device_id, sorted_accs)

    return {
        **account,
        "portfolio":        enriched,
        "total_value":      total,
        "return_pct":       _return_pct(total),
        "rank":             rank,
        "transactions":     account.get("transactions", [])[-20:],
        "us_portfolio":     us_enriched,
        "us_total_value":   us_total,
        "us_return_pct":    _us_return_pct(us_total),
        "us_transactions":  account.get("us_transactions", [])[-20:],
    }


@router.get("/account/{device_id}")
def get_account(device_id: str):
    account = _load_account(device_id)
    if account is None:
        raise HTTPException(status_code=404, detail="账户不存在")

    enriched = _compute_portfolio(account)
    total    = _total_value(account, enriched)

    # Compute leaderboard rank properly
    all_accs = _all_accounts()

    def _approx_total(a: dict) -> float:
        # Use raw cash + portfolio cost as rough proxy (avoids repeated price calls)
        pv = sum(pos["avg_cost"] * pos["shares"] for pos in a.get("portfolio", {}).values())
        return a.get("cash", 0) + pv

    sorted_accs = sorted(all_accs, key=_approx_total, reverse=True)
    rank = _rank_of(device_id, sorted_accs)

    return {
        "cash":                 account["cash"],
        "portfolio":            enriched,
        "total_value":          total,
        "return_pct":           _return_pct(total),
        "total_commission_paid":account.get("total_commission_paid", 0),
        "transactions":         account.get("transactions", [])[-20:],
        "rank":                 rank,
        "nickname":             account.get("nickname", ""),
    }


@router.post("/buy")
def buy_stock(body: BuyBody):
    account = _load_account(body.device_id)
    if account is None:
        raise HTTPException(status_code=404, detail="账户不存在，请先创建")
    account = _migrate_account(account)

    today  = _beijing_today()
    market = (body.market or "cn").lower()

    if market == "us":
        # ── US buy ──────────────────────────────────────────────────────────
        symbol = body.symbol.upper()
        shares = body.shares
        if shares <= 0:
            raise HTTPException(status_code=400, detail="Shares must be a positive integer")

        price, name = _get_us_realtime_price(symbol)
        trade_amount = round(price * shares, 4)
        commission   = 0.0   # zero commission
        total_cost   = round(trade_amount + commission, 4)

        if account["us_cash"] < total_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds. Need ${total_cost:,.2f}, available ${account['us_cash']:,.2f}"
            )

        account["us_cash"] = round(account["us_cash"] - total_cost, 4)
        account["us_total_commission_paid"] = round(
            account.get("us_total_commission_paid", 0) + commission, 6
        )

        us_portfolio = account.setdefault("us_portfolio", {})
        avail_date   = _t2_available_date(today)
        if symbol in us_portfolio:
            old = us_portfolio[symbol]
            old_cost_basis = old["avg_cost"] * old["shares"]
            new_shares     = old["shares"] + shares
            new_avg        = round((old_cost_basis + trade_amount) / new_shares, 4)
            us_portfolio[symbol] = {
                "shares":         new_shares,
                "avg_cost":       new_avg,
                "buy_date":       old["buy_date"],
                "available_date": old["available_date"],
            }
        else:
            us_portfolio[symbol] = {
                "shares":         shares,
                "avg_cost":       round(price, 4),
                "buy_date":       today,
                "available_date": avail_date,
            }

        tx = {
            "date":           today,
            "type":           "buy",
            "symbol":         symbol,
            "name":           name,
            "shares":         shares,
            "price":          price,
            "amount":         trade_amount,
            "commission":     commission,
            "available_date": avail_date,
            "market":         "us",
        }
        account.setdefault("us_transactions", []).append(tx)
        _save_account(account)

        return {
            "success":        True,
            "message":        f"Bought {shares} shares of {name}",
            "price":          price,
            "commission":     commission,
            "total_cost":     total_cost,
            "cash_remaining": account["us_cash"],
            "available_date": avail_date,
        }

    # ── CN buy ───────────────────────────────────────────────────────────────
    symbol = body.symbol.zfill(6)
    shares = body.shares

    if shares <= 0 or shares % _LOT_SIZE != 0:
        raise HTTPException(status_code=400, detail=f"买入股数必须是 {_LOT_SIZE} 的整数倍")

    price, name = _get_realtime_price(symbol)
    trade_amount = round(price * shares, 2)
    commission   = round(_buy_commission(trade_amount), 2)
    total_cost   = round(trade_amount + commission, 2)

    if account["cash"] < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"现金不足。需要 ¥{total_cost:,.2f}，当前余额 ¥{account['cash']:,.2f}"
        )

    account["cash"] = round(account["cash"] - total_cost, 2)
    account["total_commission_paid"] = round(
        account.get("total_commission_paid", 0) + commission, 2
    )

    portfolio = account.setdefault("portfolio", {})
    if symbol in portfolio:
        old = portfolio[symbol]
        old_cost_basis = old["avg_cost"] * old["shares"]
        new_shares     = old["shares"] + shares
        new_avg        = round((old_cost_basis + trade_amount) / new_shares, 4)
        portfolio[symbol] = {
            "shares":   new_shares,
            "avg_cost": new_avg,
            "buy_date": old["buy_date"],
        }
    else:
        portfolio[symbol] = {
            "shares":   shares,
            "avg_cost": round(price, 4),
            "buy_date": today,
        }

    tx = {
        "date":           today,
        "type":           "buy",
        "symbol":         symbol,
        "name":           name,
        "shares":         shares,
        "price":          price,
        "amount":         trade_amount,
        "commission":     commission,
        "available_date": _next_trading_day(today),
        "market":         "cn",
    }
    account.setdefault("transactions", []).append(tx)
    _save_account(account)

    return {
        "success":        True,
        "message":        f"成功买入 {name} {shares} 股",
        "price":          price,
        "commission":     commission,
        "total_cost":     total_cost,
        "cash_remaining": account["cash"],
    }


def _next_trading_day(date_str: str) -> str:
    """Return next calendar day (simplified; does not skip holidays)."""
    d = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def _t2_available_date(date_str: str) -> str:
    """Return date + 2 calendar days (T+2 settlement for US)."""
    d = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=2)
    return d.strftime("%Y-%m-%d")


@router.post("/sell")
def sell_stock(body: SellBody):
    account = _load_account(body.device_id)
    if account is None:
        raise HTTPException(status_code=404, detail="账户不存在，请先创建")
    account = _migrate_account(account)

    today  = _beijing_today()
    market = (body.market or "cn").lower()

    if market == "us":
        # ── US sell ──────────────────────────────────────────────────────────
        symbol = body.symbol.upper()
        shares = body.shares

        if shares <= 0:
            raise HTTPException(status_code=400, detail="Shares must be a positive integer")

        us_portfolio = account.get("us_portfolio", {})
        if symbol not in us_portfolio:
            raise HTTPException(status_code=400, detail=f"You don't hold any {symbol}")

        pos = us_portfolio[symbol]
        avail_date = pos.get("available_date", "")
        if avail_date and avail_date > today:
            raise HTTPException(
                status_code=400,
                detail=f"T+2 Settlement: {symbol} can be sold from {avail_date}"
            )

        if pos["shares"] < shares:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient shares. Hold {pos['shares']}, tried to sell {shares}"
            )

        price, name  = _get_us_realtime_price(symbol)
        trade_amount = round(price * shares, 4)
        commission   = _us_sell_commission(shares)
        net_proceeds = round(trade_amount - commission, 4)
        cost_basis   = round(pos["avg_cost"] * shares, 4)
        profit_loss  = round(net_proceeds - cost_basis, 4)
        pl_pct       = round((profit_loss / cost_basis * 100) if cost_basis else 0, 2)

        remaining = pos["shares"] - shares
        if remaining == 0:
            del us_portfolio[symbol]
        else:
            us_portfolio[symbol] = {
                "shares":         remaining,
                "avg_cost":       pos["avg_cost"],
                "buy_date":       pos["buy_date"],
                "available_date": avail_date,
            }

        account["us_cash"] = round(account.get("us_cash", 0) + net_proceeds, 4)
        account["us_total_commission_paid"] = round(
            account.get("us_total_commission_paid", 0) + commission, 6
        )

        tx = {
            "date":        today,
            "type":        "sell",
            "symbol":      symbol,
            "name":        name,
            "shares":      shares,
            "price":       price,
            "amount":      trade_amount,
            "commission":  commission,
            "profit_loss": profit_loss,
            "market":      "us",
        }
        account.setdefault("us_transactions", []).append(tx)
        _save_account(account)

        return {
            "success":         True,
            "message":         f"Sold {shares} shares of {name}",
            "price":           price,
            "commission":      commission,
            "net_proceeds":    net_proceeds,
            "profit_loss":     profit_loss,
            "profit_loss_pct": pl_pct,
        }

    # ── CN sell ───────────────────────────────────────────────────────────────
    symbol = body.symbol.zfill(6)
    shares = body.shares

    if shares <= 0 or shares % _LOT_SIZE != 0:
        raise HTTPException(status_code=400, detail=f"卖出股数必须是 {_LOT_SIZE} 的整数倍")

    portfolio = account.get("portfolio", {})
    if symbol not in portfolio:
        raise HTTPException(status_code=400, detail="未持有该股票")

    pos = portfolio[symbol]

    if pos.get("buy_date", "") >= today:
        raise HTTPException(status_code=400, detail="T+1 限制：今日买入的股票明日才可卖出")

    if pos["shares"] < shares:
        raise HTTPException(
            status_code=400,
            detail=f"持仓不足。持有 {pos['shares']} 股，尝试卖出 {shares} 股"
        )

    price, name  = _get_realtime_price(symbol)
    trade_amount = round(price * shares, 2)
    commission   = round(_sell_commission(trade_amount), 2)
    net_proceeds = round(trade_amount - commission, 2)
    cost_basis   = round(pos["avg_cost"] * shares, 2)
    profit_loss  = round(net_proceeds - cost_basis, 2)
    pl_pct       = round((profit_loss / cost_basis * 100) if cost_basis else 0, 2)

    remaining = pos["shares"] - shares
    if remaining == 0:
        del portfolio[symbol]
    else:
        portfolio[symbol] = {
            "shares":   remaining,
            "avg_cost": pos["avg_cost"],
            "buy_date": pos["buy_date"],
        }

    account["cash"] = round(account["cash"] + net_proceeds, 2)
    account["total_commission_paid"] = round(
        account.get("total_commission_paid", 0) + commission, 2
    )

    tx = {
        "date":        today,
        "type":        "sell",
        "symbol":      symbol,
        "name":        name,
        "shares":      shares,
        "price":       price,
        "amount":      trade_amount,
        "commission":  commission,
        "profit_loss": profit_loss,
        "market":      "cn",
    }
    account.setdefault("transactions", []).append(tx)
    _save_account(account)

    return {
        "success":         True,
        "message":         f"成功卖出 {name} {shares} 股",
        "price":           price,
        "commission":      commission,
        "net_proceeds":    net_proceeds,
        "profit_loss":     profit_loss,
        "profit_loss_pct": pl_pct,
    }


@router.get("/leaderboard")
def leaderboard(device_id: str = ""):
    all_accs = _all_accounts()

    def _approx_total(a: dict) -> float:
        pv = sum(pos["avg_cost"] * pos["shares"] for pos in a.get("portfolio", {}).values())
        return a.get("cash", 0) + pv

    sorted_accs = sorted(all_accs, key=_approx_total, reverse=True)

    result = []
    for i, a in enumerate(sorted_accs[:20], 1):
        total  = _approx_total(a)
        ret    = round((total - _INITIAL_CASH) / _INITIAL_CASH * 100, 2)
        result.append({
            "rank":        i,
            "nickname":    a.get("nickname", "用户#????"),
            "return_pct":  ret,
            "total_value": round(total, 2),
            "is_me":       device_id != "" and a["device_id"] == device_id,
        })

    return result


@router.post("/reset")
def reset_account(body: DeviceBody):
    account = _load_account(body.device_id)
    if account is None:
        raise HTTPException(status_code=404, detail="账户不存在")

    nickname = account.get("nickname", f"用户#{random.randint(1000,9999)}")
    fresh = _new_account(body.device_id)
    fresh["nickname"] = nickname
    _save_account(fresh)

    return {"success": True, "message": "账户已重置，初始资金 100万元"}
