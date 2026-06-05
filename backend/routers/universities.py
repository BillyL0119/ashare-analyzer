"""
University Recommendation API — /api/universities/*
Serves curated business school data with smart matching logic.
"""

import json
import os
from fastapi import APIRouter, Query
from typing import Optional, List

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'universities.json')

def load_universities():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


@router.get('')
def list_universities(
    country: Optional[str] = Query(None, description='Country code: us/uk/ca/hk/cn/au/sg'),
    specialty: Optional[str] = Query(None, description='Specialty keyword'),
    search: Optional[str] = Query(None, description='Search in name / city'),
):
    unis = load_universities()

    if country:
        unis = [u for u in unis if u['country'] == country.lower()]

    if specialty:
        kw = specialty.lower()
        unis = [u for u in unis if any(kw in s.lower() for s in u['specialties']) or any(kw in t.lower() for t in u['tags'])]

    if search:
        kw = search.lower()
        unis = [
            u for u in unis
            if kw in u['name'].lower()
            or kw in u['name_cn']
            or kw in u['city'].lower()
        ]

    return unis


@router.get('/recommend')
def recommend_universities(
    gpa: Optional[float] = Query(None, ge=0.0, le=4.0),
    test_score: Optional[int] = Query(None, description='GMAT score (200-800) or SAT (400-1600)'),
    interests: Optional[str] = Query(None, description='Comma-separated specialties'),
    preferred_countries: Optional[str] = Query(None, description='Comma-separated country codes'),
):
    unis = load_universities()
    interest_list = [i.strip() for i in interests.split(',')] if interests else []
    country_list = [c.strip().lower() for c in preferred_countries.split(',')] if preferred_countries else []

    results = []
    for u in unis:
        score = 0
        reasons = []

        # Country preference (max 25 pts)
        if country_list and u['country'] in country_list:
            score += 25
            reasons.append('Matches your target country')

        # Specialty / interest match (max 30 pts)
        if interest_list:
            matched = [i for i in interest_list if any(i.lower() in s.lower() for s in u['specialties'] + u['tags'])]
            if matched:
                pts = min(30, len(matched) * 12)
                score += pts
                reasons.append(f"Strong in {', '.join(matched)}")

        # GPA fit (max 20 pts)
        req_gpa = u['requirements'].get('gpa', 0)
        if gpa is not None:
            gap = gpa - req_gpa
            if gap >= 0.2:
                score += 20
                reasons.append('GPA well above requirement')
            elif gap >= 0:
                score += 14
                reasons.append('GPA meets requirement')
            elif gap >= -0.2:
                score += 7
                reasons.append('GPA slightly below — strong application needed')

        # Test score fit (max 20 pts)
        req_gmat = u['requirements'].get('gmat', 0)
        if test_score is not None and req_gmat > 0:
            # Treat test_score as GMAT if <= 800, else scale SAT (1600) -> GMAT (800) roughly
            gmat_equiv = test_score if test_score <= 800 else int(test_score / 2)
            gap = gmat_equiv - req_gmat
            if gap >= 20:
                score += 20
                reasons.append('Test score well above average')
            elif gap >= 0:
                score += 13
                reasons.append('Test score meets average')
            elif gap >= -30:
                score += 6
                reasons.append('Test score slightly below average — strong profile needed')

        # Ranking bonus (max 5 pts, top-ranked schools get a small boost)
        rank = u.get('ranking', 99)
        if rank <= 5:
            score += 5
        elif rank <= 15:
            score += 3
        elif rank <= 30:
            score += 1

        match_pct = min(99, int(score * 1.25))  # scale to percentage

        results.append({
            **u,
            'match_score': score,
            'match_pct': match_pct,
            'match_reasons': reasons if reasons else ['Good general fit for your profile'],
        })

    # Sort by match score desc, then ranking asc
    results.sort(key=lambda x: (-x['match_score'], x.get('ranking', 99)))

    # Return top 8 with at least some signal; if everything scores 0 just return top-ranked
    top = [r for r in results if r['match_score'] > 0]
    if not top:
        top = results
    return top[:8]
