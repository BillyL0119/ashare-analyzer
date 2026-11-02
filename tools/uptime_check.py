#!/usr/bin/env python3
"""Uptime check for bestfriendstock.com, run every 15 minutes by .github/workflows/uptime.yml.

Read-only GETs against the public site. A check fails when the answer is not HTTP 200, takes longer
than --timeout seconds, or is empty: an empty body, or no data in it (no candles, no rows, only a
feed's neutral defaults). Each failed check is tried once more after --retry-delay seconds, so one
slow call or a restart does not raise an alarm.

    python3 tools/uptime_check.py                   # check the live site, print a report
    python3 tools/uptime_check.py --base-url http://localhost:8001
    python3 tools/uptime_check.py --github-issue    # in Actions: open, comment on or close the issue
                                                    # labelled "uptime" (GitHub emails the owner)

Exit status 1 when a check fails; with --github-issue, only when the issue could not be updated.
Standard library only. Never add a POST or anything else that writes (paper orders, time-machine or
governor runs, classes, comments): this runs against production 96 times a day.
"""
import argparse
import http.client
import json
import os
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Callable
from datetime import date, datetime, timezone

BASE_URL = "https://bestfriendstock.com"
UA = "bestfriendstock-uptime/1.0 (+https://github.com/BillyL0119/ashare-analyzer)"
LABEL = "uptime"
MARK = re.compile(r"<!-- uptime-failing: (.*?) -->")     # which checks an issue text reports
ASSET = re.compile(r'<(?:script|link)\b[^>]*?\b(?:src|href)="(/assets/[^"]+\.(?:js|css))"')


class Bad(Exception):
    """The site answered, but not with what a student needs."""


def need(ok, problem):
    if not ok:
        raise Bad(problem)


class Site:
    def __init__(self, base_url: str, timeout: float):
        self.base = base_url.rstrip("/")
        self.timeout = timeout
        parts = urllib.parse.urlsplit(self.base)
        self.https, self.host = parts.scheme == "https", parts.hostname

    def get(self, path: str):
        """(body, content type) of a GET that answered 200 with a body in time; Bad otherwise."""
        req = urllib.request.Request(self.base + path, headers={"User-Agent": UA})
        t0 = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                body, ctype = r.read(), r.headers.get("Content-Type", "")
        except urllib.error.HTTPError as e:
            raise Bad(f"HTTP {e.code}") from None
        took = time.monotonic() - t0
        need(took <= self.timeout, f"took {took:.1f}s")
        need(body.strip(), "empty body")
        return body, ctype


# ── What a good answer looks like ─────────────────────────────────────────────
# Each takes (body, site) and returns a short detail for the report, or raises Bad.

def _obj(body) -> dict:
    try:
        d = json.loads(body)
    except ValueError:
        raise Bad("not JSON") from None
    need(isinstance(d, dict), "unexpected JSON")
    return d


def page(body, _site):
    html = body.decode("utf-8", "replace")
    need('id="root"' in html and ASSET.search(html), "not the app's page (no root or script)")
    return f"{len(body) // 1024} KB"


def app_files(body, site):
    """The scripts and styles the home page loads: a broken build leaves a blank page."""
    paths = ASSET.findall(body.decode("utf-8", "replace"))
    need(any(p.endswith(".js") for p in paths), "no app script in the home page")
    for p in paths:
        try:
            ctype = site.get(p)[1]
        except Bad as e:
            raise Bad(f"{p}: {e}") from None
        kind = "javascript" if p.endswith(".js") else "css"
        need(kind in ctype, f"{p} came back as {ctype or 'no type'}")
    return f"{len(paths)} files"


def candles(key: str, max_age_days: int):
    """At least 20 daily candles, the newest at most max_age_days old (long holidays included)."""
    def check(body, _site):
        rows = _obj(body).get(key) or []
        need(len(rows) >= 20, f"{len(rows)} candles")
        last = str(rows[-1].get("date", ""))[:10]
        try:
            age = (datetime.now(timezone.utc).date() - date.fromisoformat(last)).days
        except ValueError:
            raise Bad(f"bad candle date {last!r}") from None
        need(age <= max_age_days, f"newest candle {last} is {age} days old")
        return f"{len(rows)} candles, newest {last}"
    return check


def listing(key: str, what: str):
    def check(body, _site):
        items = _obj(body).get(key) or []
        need(items, f"no {what}")
        return f"{len(items)} {what}"
    return check


def us_quote(body, _site):
    price = _obj(body).get("price")
    need(isinstance(price, (int, float)) and price > 0, f"no price ({price!r})")
    return f"price {price}"


def score(body, _site):
    d = _obj(body)
    need(isinstance(d.get("total"), (int, float)) and d.get("dimensions"), "no score")
    return f"score {d['total']}"


def financial(body, _site):
    ratios = _obj(body).get("profitability") or {}
    need(ratios, "no profitability ratios")
    return f"{len(ratios)} ratios"


def radar(body, _site):
    scores = _obj(body).get("scores") or {}
    need(scores, "no scores")
    need(any(v != 50 for v in scores.values()), "every score is the neutral 50: no data behind them")
    return f"{len(scores)} scores"


def heatmap(body, _site):
    d = _obj(body)
    need(d.get("count") and d.get("sectors"), "no tiles")
    return f"{d['count']} stocks in {len(d['sectors'])} sectors"


def screener(body, _site):
    d = _obj(body)
    need(d.get("rows"), "no rows")
    return f"{len(d['rows'])} of {d.get('total')} stocks"


def sitemap(body, _site):
    n = body.count(b"<loc>")
    need(b"<urlset" in body and n >= 5, f"{n} URLs")
    return f"{n} URLs"


def certificate(_body, site):
    """An expired HTTPS certificate locks every visitor out; Let's Encrypt renews at 30 days left."""
    if not site.https:
        return "not HTTPS, skipped"
    ctx = ssl.create_default_context()
    with socket.create_connection((site.host, 443), timeout=site.timeout) as sock:
        with ctx.wrap_socket(sock, server_hostname=site.host) as tls:
            not_after = tls.getpeercert()["notAfter"]
    days = (ssl.cert_time_to_seconds(not_after) - time.time()) / 86400
    need(days >= 14, f"certificate expires in {days:.0f} days ({not_after}): renewal is failing")
    return f"expires in {days:.0f} days"


@dataclass
class Check:
    name: str
    path: str | None          # None: the check makes its own connection
    validate: Callable


CHECKS = [
    # Pages: the app's HTML (nginx serves a copy per page with its own title)
    Check("Home page", "/", page),
    Check("Paper trading page", "/paper", page),
    Check("Time machine page", "/time-machine", page),
    Check("Fed chair page", "/governor", page),
    Check("Diagram lab page", "/diagrams", page),
    Check("Case library page", "/cases", page),
    Check("US stock page AAPL", "/stock/us/AAPL", page),
    Check("App scripts and styles", "/", app_files),
    Check("HTTPS certificate", None, certificate),
    # A-shares (Sina, Tencent, AkShare)
    Check("A-share K-line 600519", "/api/stocks/600519/history?count=60", candles("candles", 16)),
    Check("A-share score 600519", "/api/stock/score/600519", score),
    Check("A-share financials 600519", "/api/financial/600519", financial),
    Check("A-share radar 600519", "/api/radar/600519", radar),
    # US stocks
    Check("US quote AAPL", "/api/us/stock/AAPL/realtime", us_quote),
    Check("US K-line AAPL", "/api/us/stock/AAPL/history?count=60", candles("data", 10)),
    Check("Heatmap (US)", "/api/heatmap?market=us&limit=100", heatmap),
    Check("Screener (US)", "/api/us/screener?sort=market_cap&order=desc&limit=50&offset=0", screener),
    # Learning
    Check("Case library API", "/api/cases?lang=en&limit=3", listing("cases", "cases")),
    Check("Fed chair scenarios", "/api/governor/scenarios?lang=en", listing("scenarios", "scenarios")),
    Check("Time machine scenarios", "/api/time-machine/scenarios?lang=en", listing("scenarios", "scenarios")),
    Check("Sitemap", "/sitemap.xml", sitemap),
]


# ── Running ───────────────────────────────────────────────────────────────────

@dataclass
class Result:
    check: Check
    ok: bool
    detail: str               # what was found, or the problem
    seconds: float
    first: str = ""           # the first try's problem when the retry was needed


def _network_problem(e: Exception, timeout: float) -> str:
    reason = e.reason if isinstance(e, urllib.error.URLError) else e
    if isinstance(reason, TimeoutError):
        return f"no answer within {timeout:.0f}s"
    if isinstance(reason, ssl.SSLError):
        return f"HTTPS failed: {getattr(reason, 'verify_message', None) or reason}"
    if isinstance(reason, ConnectionRefusedError):
        return "connection refused"
    if isinstance(reason, (ConnectionError, http.client.HTTPException)):
        return "connection dropped"
    return f"cannot connect: {reason}"


def attempt(check: Check, site: Site) -> Result:
    t0 = time.monotonic()
    try:
        body = site.get(check.path)[0] if check.path else None
        detail = check.validate(body, site)
        return Result(check, True, detail, time.monotonic() - t0)
    except Bad as e:
        problem = str(e)
    except (OSError, http.client.HTTPException) as e:
        problem = _network_problem(e, site.timeout)
    except Exception as e:                       # a surprise answer must not stop the other checks
        problem = f"{type(e).__name__}: {e}"
    return Result(check, False, problem, time.monotonic() - t0)


def run(checks, site: Site, retry_delay: float, workers: int = 4) -> list:
    with ThreadPoolExecutor(workers) as pool:
        results = list(pool.map(lambda c: attempt(c, site), checks))
    failed = [i for i, r in enumerate(results) if not r.ok]
    if failed:
        time.sleep(retry_delay)
        with ThreadPoolExecutor(workers) as pool:
            again = list(pool.map(lambda i: attempt(results[i].check, site), failed))
        for i, r in zip(failed, again):
            r.first = results[i].detail
            results[i] = r
    return results


# ── Reports ───────────────────────────────────────────────────────────────────

def _where(r: Result) -> str:
    return r.check.path or "(TLS handshake)"


def _note(r: Result) -> str:
    if not r.first:
        return ""
    return " (both tries)" if r.first == r.detail else f" (first try: {r.first})"


def text_report(results, site: Site, when: str) -> str:
    bad = [r for r in results if not r.ok]
    lines = [f"{site.base} at {when}: {len(results) - len(bad)} of {len(results)} checks OK"]
    for r in sorted(results, key=lambda r: r.ok):
        lines.append(f"  {'ok  ' if r.ok else 'FAIL'} {r.seconds:5.1f}s  {r.check.name:<26} {_where(r)}  {r.detail}{_note(r)}")
    return "\n".join(lines)


def markdown_report(results, site: Site, when: str, retry_delay: float) -> str:
    bad = [r for r in results if not r.ok]
    head = (f"**{len(bad)} of {len(results)} checks failing** on {site.base} at {when} "
            f"(each failure was tried again {retry_delay:.0f} s later)." if bad else
            f"**All {len(results)} checks pass** on {site.base} at {when}.")
    rows = ["| | Check | Result | Time |", "|---|---|---|---|"]
    for r in sorted(results, key=lambda r: r.ok):
        detail = f"{r.detail}{_note(r)}".replace("|", "\\|")
        rows.append(f"| {'✅' if r.ok else '❌'} | {r.check.name} `{_where(r)}` | {detail} | {r.seconds:.1f} s |")
    return head + "\n\n" + "\n".join(rows)


# ── The GitHub issue that carries the alarm ───────────────────────────────────

def github(method: str, path: str, payload=None):
    token = os.environ.get("GH_TOKEN") or os.environ["GITHUB_TOKEN"]
    req = urllib.request.Request(
        os.environ.get("GITHUB_API_URL", "https://api.github.com") + path, method=method,
        data=None if payload is None else json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28", "User-Agent": UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
    return json.loads(raw) if raw else None


def _last_reported(repo: str, issue: dict):
    """The failing set the issue last reported: from its newest marked comment, else its text."""
    texts = [issue.get("body") or ""]
    if issue.get("comments"):
        page = (issue["comments"] - 1) // 100 + 1
        texts += [c.get("body") or "" for c in
                  github("GET", f"/repos/{repo}/issues/{issue['number']}/comments?per_page=100&page={page}")]
    for t in reversed(texts):
        m = MARK.search(t)
        if m:
            return m.group(1)
    return None


def sync_issue(results, report: str, when: str) -> str:
    """One open issue while anything fails: opened on the first failure, a comment when the set of
    failing checks changes (the same failures again post nothing), closed when all pass."""
    repo = os.environ["GITHUB_REPOSITORY"]
    run_id = os.environ.get("GITHUB_RUN_ID")
    run_link = (f"\n\n[Run log]({os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{repo}/actions/runs/{run_id})"
                if run_id else "")
    bad = sorted(r.check.name for r in results if not r.ok)
    found = github("GET", f"/repos/{repo}/issues?labels={LABEL}&state=open&per_page=20")
    issue = next((i for i in found if "pull_request" not in i), None)
    if not bad:
        if not issue:
            return "all checks pass, no open issue"
        n = issue["number"]
        github("POST", f"/repos/{repo}/issues/{n}/comments",
               {"body": f"✅ All {len(results)} checks pass again ({when}). Closing.{run_link}"})
        github("PATCH", f"/repos/{repo}/issues/{n}", {"state": "closed", "state_reason": "completed"})
        return f"all checks pass, closed issue #{n}"
    sig = " | ".join(bad)
    text = f"{report}{run_link}\n\n<!-- uptime-failing: {sig} -->"
    if not issue:
        try:
            github("POST", f"/repos/{repo}/labels", {"name": LABEL, "color": "d73a4a",
                                                     "description": "Opened by the uptime check (.github/workflows/uptime.yml)"})
        except urllib.error.HTTPError as e:
            if e.code != 422:                    # 422: the label exists already
                raise
        owner = os.environ.get("GITHUB_REPOSITORY_OWNER")
        title = f"Site check failing: {bad[0]}" + (f" and {len(bad) - 1} more" if len(bad) > 1 else "")
        body = ((f"@{owner} " if owner else "") + "the site is failing its uptime checks. This "
                "issue gets a comment when the failing checks change and closes itself once all pass.\n\n" + text)
        new = github("POST", f"/repos/{repo}/issues", {"title": title, "body": body, "labels": [LABEL]})
        return f"opened issue #{new['number']}"
    n = issue["number"]
    if _last_reported(repo, issue) == sig:
        return f"issue #{n} already reports these failures, nothing posted"
    github("POST", f"/repos/{repo}/issues/{n}/comments", {"body": "The failing checks changed.\n\n" + text})
    return f"commented on issue #{n}"


def main() -> int:
    ap = argparse.ArgumentParser(description="Read-only uptime check of bestfriendstock.com.")
    ap.add_argument("--base-url", default=BASE_URL)
    ap.add_argument("--timeout", type=float, default=15, help="seconds before an answer counts as failed")
    ap.add_argument("--retry-delay", type=float, default=30, help="seconds before a failed check is tried again")
    ap.add_argument("--github-issue", action="store_true", help="open/comment/close the 'uptime' issue")
    args = ap.parse_args()

    site = Site(args.base_url, args.timeout)
    when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    results = run(CHECKS, site, args.retry_delay)
    print(text_report(results, site, when))
    report = markdown_report(results, site, when, args.retry_delay)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(report + "\n")
    bad = [r.check.name for r in results if not r.ok]
    if not args.github_issue:
        return 1 if bad else 0
    print(sync_issue(results, report, when))
    if bad:
        # The issue is the alarm. Failing the run as well would email again every 15 minutes.
        print(f"::error title=Site check failing::{', '.join(bad)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
