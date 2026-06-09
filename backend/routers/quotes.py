from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
import json
import pathlib

router = APIRouter()

_DATA_PATH = pathlib.Path(__file__).parent.parent / "data" / "quotes.json"

def _load_quotes():
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)

@router.get("/today")
def get_today_quote():
    """Return today's quote based on Beijing date (rotates daily)."""
    quotes = _load_quotes()
    # Beijing time = UTC+8
    beijing_now = datetime.now(timezone.utc) + timedelta(hours=8)
    # Use days since epoch as index — changes at midnight Beijing time
    days_since_epoch = beijing_now.toordinal()
    idx = days_since_epoch % len(quotes)
    return quotes[idx]

@router.get("/all")
def get_all_quotes():
    return _load_quotes()
