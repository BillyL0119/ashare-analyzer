"""
Builds data/us_gics_sectors.json: the GICS sector of the largest US-listed companies, for the US
screener and heatmap.

Nasdaq's own sector field puts Visa and Walmart under Consumer Discretionary, Tesla and Thermo Fisher
under Industrials and BHP under Energy, so the screener (and the heatmap built on it) uses GICS instead:
  - every S&P 500 member, from the daily holdings of the eleven Select Sector SPDR ETFs (one per sector);
  - the large foreign and non-index listings in MANUAL below (the ADRs among the 300 biggest tiles).
Anything else falls back to Nasdaq's sector, renamed to the GICS word (routers/screener.py us_sector).

Run from backend/ every few months, or after a GICS reshuffle:  python3 tools/build_us_gics.py
Needs openpyxl (local only; the server just reads the JSON).
"""

import datetime
import io
import json
import os

import openpyxl
import requests

ETFS = {
    "XLB": "Materials", "XLC": "Communication Services", "XLE": "Energy", "XLF": "Financials",
    "XLI": "Industrials", "XLK": "Information Technology", "XLP": "Consumer Staples", "XLRE": "Real Estate",
    "XLU": "Utilities", "XLV": "Health Care", "XLY": "Consumer Discretionary",
}
URL = "https://www.ssga.com/us/en/intermediary/library-content/products/fund-data/etfs/us/holdings-daily-us-en-{}.xlsx"

MANUAL = {
    # Information Technology
    "TSM": "Information Technology", "ASML": "Information Technology", "SKHY": "Information Technology",
    "SAP": "Information Technology", "SHOP": "Information Technology", "SNOW": "Information Technology",
    "NET": "Information Technology", "ASX": "Information Technology", "MSTR": "Information Technology",
    "NOK": "Information Technology", "UMC": "Information Technology", "ARM": "Information Technology",
    "MRVL": "Information Technology", "TEAM": "Information Technology", "MDB": "Information Technology",
    "INFY": "Information Technology",
    # Financials
    "BRK.A": "Financials", "RY": "Financials", "TD": "Financials", "MUFG": "Financials", "SAN": "Financials",
    "UBS": "Financials", "BBVA": "Financials", "HSBC": "Financials", "BMO": "Financials", "BNS": "Financials",
    "HDB": "Financials", "CM": "Financials", "SMFG": "Financials", "MFG": "Financials", "ING": "Financials",
    "LYG": "Financials", "MFC": "Financials", "NWG": "Financials", "BN": "Financials", "DB": "Financials",
    "IBN": "Financials", "NU": "Financials", "BCS": "Financials", "SLF": "Financials", "ITUB": "Financials",
    # Health Care
    "NVS": "Health Care", "AZN": "Health Care", "NVO": "Health Care", "GSK": "Health Care", "SNY": "Health Care",
    "TAK": "Health Care", "NTRA": "Health Care", "ARGX": "Health Care", "TEVA": "Health Care",
    # Consumer Discretionary
    "BABA": "Consumer Discretionary", "TM": "Consumer Discretionary", "MELI": "Consumer Discretionary",
    "PDD": "Consumer Discretionary", "RACE": "Consumer Discretionary", "HMC": "Consumer Discretionary",
    "JD": "Consumer Discretionary", "SE": "Consumer Discretionary", "STLA": "Consumer Discretionary",
    "SONY": "Consumer Discretionary",
    # Consumer Staples
    "BTI": "Consumer Staples", "BUD": "Consumer Staples", "DEO": "Consumer Staples", "HLN": "Consumer Staples",
    "UL": "Consumer Staples",
    # Communication Services
    "CCZ": "Communication Services", "SPOT": "Communication Services", "TCEHY": "Communication Services",
    "NTES": "Communication Services", "BIDU": "Communication Services",
    # Energy
    "TTE": "Energy", "SHEL": "Energy", "BP": "Energy", "CNQ": "Energy", "ENB": "Energy", "SU": "Energy",
    "TRP": "Energy", "LNG": "Energy", "E": "Energy", "CVE": "Energy", "EQNR": "Energy", "PBR": "Energy",
    # Materials
    "BHP": "Materials", "RIO": "Materials", "AEM": "Materials", "B": "Materials", "WPM": "Materials",
    "VALE": "Materials",
    # Industrials
    "CP": "Industrials", "CNI": "Industrials", "RELX": "Industrials",
    # Utilities
    "NGG": "Utilities",
}


def main():
    out = {}
    for etf, sector in ETFS.items():
        r = requests.get(URL.format(etf.lower()), headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        r.raise_for_status()
        rows = list(openpyxl.load_workbook(io.BytesIO(r.content), read_only=True).active.iter_rows(values_only=True))
        head = next(i for i, row in enumerate(rows) if row and "Ticker" in row)
        col = rows[head].index("Ticker")
        n = 0
        for row in rows[head + 1:]:
            t = row[col] if row and len(row) > col else None
            if isinstance(t, str) and 0 < len(t.strip()) <= 6 and t.strip() not in ("CASH", "-"):
                out[t.strip().replace("/", ".")] = sector
                n += 1
        print(f"{etf}: {n} holdings")
    for t, sector in MANUAL.items():
        out.setdefault(t, sector)
    path = os.path.join(os.path.dirname(__file__), "..", "data", "us_gics_sectors.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"as_of": datetime.date.today().isoformat(),
                   "source": "Select Sector SPDR holdings (S&P 500) + manual ADR list",
                   "sectors": dict(sorted(out.items()))}, f, indent=0, ensure_ascii=False)
    print(f"{len(out)} tickers -> {os.path.normpath(path)}")


if __name__ == "__main__":
    main()
