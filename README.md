# Best Friend Ashare 最佳股友

A China A-share stock analysis platform featuring K-line charts, technical indicators, Monte Carlo simulation, and watchlist management.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, lightweight-charts, recharts
- **Backend**: FastAPI + AkShare (Python)
- **Database**: Supabase (watchlist persistence)

## Project Structure

```
ashare-analyzer/
├── backend/          # FastAPI app (shared backend)
├── frontend/         # Original Vite+React app (legacy)
├── frontend-next/    # Next.js 14 app (current)
└── README.md
```

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend (Next.js)

```bash
cd frontend-next
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Supabase Setup

Run the SQL in `backend/supabase_schema.sql` in your Supabase project to create the watchlist table:

```sql
create table if not exists watchlist (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  name text not null,
  added_at timestamp with time zone default now()
);
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stocks/search?q=` | Search stocks by code or name |
| GET | `/api/stocks/{code}/history` | OHLCV + indicators |
| GET | `/api/stocks/{code}/realtime` | Latest quote |
| GET | `/api/indicators/{code}` | MA, MACD, RSI, Bollinger Bands |
| POST | `/api/simulation/{code}` | Monte Carlo simulation |
| GET | `/api/watchlist` | Get watchlist |
| POST | `/api/watchlist` | Add to watchlist |
| DELETE | `/api/watchlist/{code}` | Remove from watchlist |

## Features

- **K-Line Chart**: Professional candlestick chart with volume bars using lightweight-charts. Chinese convention (green=up, red=down). Supports daily/weekly/monthly periods.
- **Technical Indicators**: MA5/10/20/60, MACD (12,26,9), RSI(14), Bollinger Bands (20,2)
- **Monte Carlo Simulation**: Historical return-based random path simulation with percentile bands (P10-P90) and risk statistics (VaR, probability of gain, annualized volatility)
- **Stock Comparison**: Normalized price chart for up to 5 stocks with performance stats (return, volatility, max drawdown)
- **Watchlist**: Persistent watchlist via Supabase, accessible across sessions

## Environment Variables

**frontend-next/.env.local**:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://nadhlozvalgizccmnpay.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

## Disclaimer

本网站仅供学习和研究目的，不构成任何投资建议。股市有风险，投资需谨慎。

For educational purposes only. Not financial advice. Invest at your own risk.
