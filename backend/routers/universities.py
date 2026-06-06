"""
University Guide API — /api/universities/*
Global business school directory with QS ranking data.
"""

import json
import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'universities.json')

def load_universities():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


@router.get('')
def list_universities(
    region:    Optional[str] = Query(None, description='north_america / uk / europe / asia / oceania'),
    specialty: Optional[str] = Query(None, description='Finance / Accounting / Economics / Consulting / Tech'),
    language:  Optional[str] = Query(None, description='english / bilingual'),
    search:    Optional[str] = Query(None, description='Search in name / university / city'),
):
    unis = load_universities()

    if region:
        unis = [u for u in unis if u.get('region') == region.lower()]

    if language:
        unis = [u for u in unis if u.get('language') == language.lower()]

    if specialty:
        kw = specialty.lower()
        unis = [
            u for u in unis
            if any(kw in s.lower() for s in u.get('specialties', []))
            or any(kw in t.lower() for t in u.get('tags', []))
        ]

    if search:
        kw = search.lower()
        unis = [
            u for u in unis
            if kw in u.get('name', '').lower()
            or kw in u.get('university', '').lower()
            or kw in u.get('city', '').lower()
            or kw in u.get('country', '').lower()
        ]

    return unis


@router.get('/stats')
def get_stats():
    unis = load_universities()
    countries = list({u['country'] for u in unis})
    languages = list({u.get('language', 'english') for u in unis})
    return {
        'total': len(unis),
        'countries': len(countries),
        'languages': len(languages),
        'country_list': sorted(countries),
    }


@router.get('/{uni_id}')
def get_university(uni_id: str):
    unis = load_universities()
    match = next((u for u in unis if u['id'] == uni_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f'University {uni_id!r} not found')
    return match
