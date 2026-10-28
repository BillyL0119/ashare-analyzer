"""
The economy in "Be the Fed chair": real history, plus the effect of the student's different rates.

Every quarter keeps everything that really hit the economy (oil shocks, the pandemic, bank
failures...) because the model only works on the difference between the student's rate and the
real Fed's. Copy the Fed and you get exactly what happened. The difference moves through three
textbook relationships, each with a lag:

  demand (IS):     Δu[t+1] = ρ·Δu[t] + φ·(Δi[t] − Δπᵉ[t])
                   a higher real interest rate cools spending, so unemployment rises next quarter
                   and keeps building while the gap lasts
  Phillips curve:  Δq[t]   = Δπᵉ[t] − κ·(g(u'−u*) − g(u−u*))
                   inflation this quarter follows expectations, minus slack in the labour market;
                   g bends so that pushing unemployment below its natural rate adds inflation
                   faster than the same amount of slack takes it away
  expectations:    Δπᵉ[t+1] = λ·Δπᵉ[t] + (1−λ)·Δπ4[t]
                   people expect inflation to stay near what they have just lived through

Δ is "student minus history"; u unemployment, u* the Fed staff's natural rate, i the policy rate,
q inflation over the quarter (annual rate), π4 inflation over four quarters, πᵉ expected inflation.
The parameters are round numbers in the range of textbook estimates, chosen so the effects are
visible within a few years, not a forecast.
"""
from statistics import mean

RHO = 0.85          # how long a change in unemployment persists
PHI = 0.10          # unemployment points per quarter for each point of higher real rate
KAPPA = 0.50        # Phillips-curve slope
BEND = 0.30         # extra inflation from a labour market tighter than the natural rate
LAM = 0.80          # expectations adjust slowly
U_FLOOR = 2.5       # unemployment cannot fall below this
TARGET = 2.0        # inflation target (PCE), official at the Fed since 2012
TAYLOR_R = 2.0      # Taylor (1993): neutral real rate 2%, target 2%


def _g(x: float) -> float:
    return x - BEND * x * x if x < 0 else x


def simulate(rows: list, start: int, rates: list) -> list:
    """Quarters from `start` on, as far as the decisions reach (the quarter after the last one
    included). rates[j] is the student's rate for quarter start+j. Each quarter: the student's
    u, pce4, pceq, exp and gap, plus the real ones for comparison."""
    out = []
    du = dexp = 0.0
    dqs = []
    last = min(len(rows) - 1, start + len(rates))
    for t in range(start, last + 1):
        j = t - start
        a = rows[t]
        if j > 0:
            di = rates[j - 1] - rows[t - 1]["ff"]
            du = RHO * du + PHI * (di - dexp_prev)
        u = max(U_FLOOR, a["u"] + du)
        du = u - a["u"]
        dq = dexp - KAPPA * (_g(u - a["un"]) - _g(a["u"] - a["un"]))
        dqs.append(dq)
        dpi4 = sum(dqs[-4:]) / 4                  # before the start, no difference
        out.append({
            "q": a["q"],
            "rate": rates[j] if j < len(rates) else None,
            "u": round(u, 2), "pce4": round(a["pce4"] + dpi4, 2), "pceq": round(a["pceq"] + dq, 2),
            "exp": round(a["exp"] + dexp, 2), "gap": round(a["gap"] - 2 * du, 2), "un": a["un"],
        })
        dexp_prev = dexp
        dexp = LAM * dexp + (1 - LAM) * dpi4
    return out


def taylor(pce4: float, gap: float) -> float:
    """Taylor (1993): i = r* + π + 0.5·(π − 2) + 0.5·output gap."""
    return TAYLOR_R + pce4 + 0.5 * (pce4 - TARGET) + 0.5 * gap


def miss(path: list) -> float:
    """Root-mean-square distance from the Fed's two goals: 2% inflation and full employment."""
    if not path:
        return 0.0
    return mean((p["pce4"] - TARGET) ** 2 + (p["u"] - p["un"]) ** 2 for p in path) ** 0.5
