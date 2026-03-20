from pydantic import BaseModel
from typing import List, Optional


class StockInfo(BaseModel):
    code: str
    name: str


class Candle(BaseModel):
    date: str
    open: float
    close: float
    high: float
    low: float
    volume: float
    amount: float
    pct_change: float
    turnover: float


class MAIndicator(BaseModel):
    date: str
    ma5: Optional[float] = None
    ma10: Optional[float] = None
    ma20: Optional[float] = None
    ma60: Optional[float] = None


class MACDData(BaseModel):
    date: str
    dif: Optional[float] = None
    dea: Optional[float] = None
    macd: Optional[float] = None


class RSIData(BaseModel):
    date: str
    rsi6: Optional[float] = None
    rsi12: Optional[float] = None
    rsi24: Optional[float] = None


class StockHistoryResponse(BaseModel):
    symbol: str
    name: str
    candles: List[Candle]
    ma: List[MAIndicator]
    macd: List[MACDData]
    rsi: List[RSIData]


class RealtimeQuote(BaseModel):
    code: str
    name: str
    price: float
    change: float
    pct_change: float
    volume: float
    amount: float
    high: float
    low: float
    open: float
    prev_close: float
