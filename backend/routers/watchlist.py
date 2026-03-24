from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nadhlozvalgizccmnpay.supabase.co")
SUPABASE_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZGhsb3p2YWxnaXpjY21ucGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNTk2NjUsImV4cCI6MjA4OTczNTY2NX0.X5EGW-TYm5_TezaVnt_m_yua-eidGMGW3gmY2psP7Z4",
)


def get_supabase_client():
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except ImportError:
        return None


class WatchlistItem(BaseModel):
    code: str
    name: str


@router.get("")
def get_watchlist():
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Supabase client not available")
    try:
        result = client.table("watchlist").select("*").order("added_at", desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def add_to_watchlist(item: WatchlistItem):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Supabase client not available")
    try:
        result = client.table("watchlist").upsert(
            {"code": item.code, "name": item.name},
            on_conflict="code"
        ).execute()
        return result.data[0] if result.data else {"code": item.code, "name": item.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{code}")
def remove_from_watchlist(code: str):
    client = get_supabase_client()
    if not client:
        raise HTTPException(status_code=503, detail="Supabase client not available")
    try:
        result = client.table("watchlist").delete().eq("code", code).execute()
        return {"success": True, "code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
