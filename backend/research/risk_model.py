"""
A fundamental factor risk model in the style of the commercial ones (Barra-like), monthly, large caps.

Each month every stock's return is split into
    sector factors (one per sector, they carry the market) + style factors + the stock's own part:
    styles  size     log market cap
            value    average of earnings yield and book-to-market
            momentum 12-1 month return
            volatility  12-month volatility of daily returns
            beta     36-month beta to the cap-weighted large-cap index
Style exposures are winsorised at +-3 and standardised to cap-weighted mean 0, standard deviation 1.
Factor returns come from a cross-sectional regression of the next month's returns on these exposures, weighted by
the square root of market cap. The factor covariance is an exponentially weighted estimate over the last 60 months
(half-life 36), each stock's own variance an exponentially weighted mean of its squared residuals (half-life 24,
at least 12 months, else the universe median). Only months before the decision month are used.

Covariance of stock returns:  Sigma = X F X' + diag(D)
"""
import numpy as np

STYLES = ("size", "value", "momentum", "volatility", "beta")


def _wz(x, w):
    """Winsorise at +-3 standard deviations, then standardise to weighted mean 0 and standard deviation 1."""
    x = np.asarray(x, dtype=float)
    ok = np.isfinite(x)
    if ok.sum() < 10:
        return np.zeros_like(x)
    m, s = np.average(x[ok], weights=w[ok]), np.std(x[ok])
    x = np.clip(np.where(ok, x, m), m - 3 * s, m + 3 * s)
    m = np.average(x, weights=w)
    s = np.sqrt(np.average((x - m) ** 2, weights=w))
    return (x - m) / s if s > 0 else np.zeros_like(x)


def beta_matrix(later_hist, mkt_hist, min_obs=24):
    """36-month beta of every stock from its monthly returns (rows = months) against the market."""
    X = np.asarray(later_hist, dtype=float)
    M = np.where(np.isfinite(X), np.asarray(mkt_hist, dtype=float)[:, None], np.nan)
    mx, mm = np.nanmean(X, 0), np.nanmean(M, 0)
    cov = np.nanmean((X - mx) * (M - mm), 0)
    var = np.nanmean((M - mm) ** 2, 0)
    b = cov / np.where(var > 0, var, np.nan)
    return np.where(np.isfinite(X).sum(0) >= min_obs, b, np.nan)


class RiskModel:
    def __init__(self, sector_codes, n_sectors, horizon=60):
        self.sector_codes = sector_codes
        self.n_sectors = n_sectors
        self.K = n_sectors + len(STYLES)
        self.horizon = horizon
        self.f = []                     # factor returns, one row per month
        self.resid = {}                 # stock column -> list of (month index, residual)

    def exposures(self, idx, signed, beta, mc):
        """Exposure matrix (len(idx) x K) for the stocks at columns idx."""
        w = mc[idx]
        X = np.zeros((len(idx), self.K))
        X[np.arange(len(idx)), self.sector_codes[idx]] = 1.0
        value = np.nanmean(np.vstack([_wz(signed["earnings_yield"][idx], w), _wz(signed["book_to_market"][idx], w)]), 0)
        raw = {"size": np.log(mc[idx]), "value": value, "momentum": signed["momentum"][idx],
               "volatility": -signed["low_vol"][idx], "beta": beta[idx]}
        for s, name in enumerate(STYLES):
            X[:, self.n_sectors + s] = _wz(raw[name], w)
        return X

    def learn(self, t, idx, X, ret, mc):
        """Regress the realised returns of month t on exposures; keep the factor returns and residuals."""
        ok = np.isfinite(ret)
        if ok.sum() < 100:
            self.f.append(np.full(self.K, np.nan))
            return
        sw = np.sqrt(mc[idx][ok])
        A, y = X[ok] * sw[:, None], np.clip(ret[ok], -0.9, 3.0) * sw
        f, *_ = np.linalg.lstsq(A, y, rcond=None)
        self.f.append(f)
        e = np.clip(ret[ok], -0.9, 3.0) - X[ok] @ f
        for j, r in zip(np.asarray(idx)[ok], e):
            h = self.resid.setdefault(int(j), [])
            h.append((t, float(r)))
            if len(h) > 40:
                del h[0]

    def factor_cov(self, half_life=36):
        if len(self.f) < 24:
            return None
        F = np.array(self.f[-self.horizon:])
        F = F[np.isfinite(F).all(1)]
        if len(F) < 24:
            return None
        w = 0.5 ** (np.arange(len(F))[::-1] / half_life)
        w /= w.sum()
        m = w @ F
        C = (F - m).T @ ((F - m) * w[:, None])
        return C + np.eye(self.K) * 1e-6

    def specific_var(self, idx, t, half_life=24):
        out = np.full(len(idx), np.nan)
        for n, j in enumerate(idx):
            h = [(s, r) for s, r in self.resid.get(int(j), []) if t - 36 <= s < t]
            if len(h) >= 12:
                ages = np.array([t - s for s, _ in h], dtype=float)
                w = 0.5 ** (ages / half_life)
                out[n] = float(np.sum(w * np.array([r for _, r in h]) ** 2) / w.sum())
        med = np.nanmedian(out) if np.isfinite(out).any() else 0.01
        return np.where(np.isfinite(out), out, med)
