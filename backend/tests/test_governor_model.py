"""The economy behind "Be the Fed chair" (services/governor_model.py): pure arithmetic on the
scenario files in data/governor/, no network."""
import json
import pathlib

import pytest

from services import governor_model as gm

DATA = pathlib.Path(__file__).resolve().parent.parent / "data" / "governor"
SCENARIOS = sorted(DATA.glob("*.json"))


def _load(path):
    """The quarters, the first decision quarter, and the real Fed's rate for every decision
    (one per quarter up to the one before the end, as routers/governor.py counts them)."""
    d = json.loads(path.read_text(encoding="utf-8"))
    rows, start = d["quarters"], d["lead"]
    n = len(rows) - start - 1
    return rows, start, [r["ff"] for r in rows[start:start + n]]


def test_scenarios_exist():
    assert len(SCENARIOS) >= 3, f"scenario files missing in {DATA}"


@pytest.mark.parametrize("path", SCENARIOS, ids=lambda p: p.stem)
def test_copying_the_fed_reproduces_history_exactly(path):
    rows, start, fed = _load(path)
    sim = gm.simulate(rows, start, fed)
    assert len(sim) == len(fed) + 1          # the quarter after the last decision shows its effect
    for j, (got, real) in enumerate(zip(sim, rows[start:])):
        assert got["q"] == real["q"]
        assert got["rate"] == (fed[j] if j < len(fed) else None)
        for k in ("u", "pce4", "pceq", "exp", "gap", "un"):
            assert got[k] == round(real[k], 2), f"{real['q']} {k}"


@pytest.mark.parametrize("path", SCENARIOS, ids=lambda p: p.stem)
def test_tighter_policy_cools_the_economy(path):
    rows, start, fed = _load(path)
    end = rows[start + len(fed)]
    tight = gm.simulate(rows, start, [r + 2 for r in fed])[-1]
    loose = gm.simulate(rows, start, [max(0.0, r - 2) for r in fed])[-1]
    assert tight["u"] > end["u"] and tight["pce4"] < end["pce4"] and tight["exp"] < end["exp"]
    assert loose["u"] < end["u"] and loose["pce4"] > end["pce4"]


def test_partial_run_stops_after_the_last_decision():
    rows, start, fed = _load(SCENARIOS[0])
    assert len(gm.simulate(rows, start, fed[:3])) == 4
    assert len(gm.simulate(rows, start, [])) == 1


def test_unemployment_never_falls_below_the_floor():
    for path in SCENARIOS:
        rows, start, fed = _load(path)
        assert min(p["u"] for p in gm.simulate(rows, start, [r - 10 for r in fed])) >= gm.U_FLOOR


def test_taylor_rule():
    assert gm.taylor(2.0, 0.0) == 4.0                      # on target, no gap: neutral 2% real rate
    assert gm.taylor(5.0, -2.0) == 2 + 5 + 1.5 - 1         # 3 points over target, 2% below potential


def test_miss():
    assert gm.miss([]) == 0.0
    assert gm.miss([{"pce4": 2.0, "u": 4.5, "un": 4.5}]) == 0.0
    assert gm.miss([{"pce4": 5.0, "u": 8.0, "un": 4.0}]) == 5.0   # sqrt(3² + 4²)
