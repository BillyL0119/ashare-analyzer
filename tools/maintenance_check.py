#!/usr/bin/env python3
"""
Daily check of the things that go stale on a schedule (.github/workflows/maintenance-check.yml). Standard library only.

  python3 tools/maintenance_check.py            # prints a report, exit 1 when something needs doing
  python3 tools/maintenance_check.py --json     # the same as JSON

Checks
  holidays   the NYSE holiday table (backend/services/us_calendar.py) must cover next year before the year ends:
             reminded from 1 November; the quant desk's check days and reminders depend on it
  membership the S&P 500 membership list (backend/data/sp500_membership.json, tools/build_sp500_history.py) is
             older than 330 days: the factor lab's point-in-time universe stops at its last update
  desk       the admin quant desk file on the server is older than 12 days (https://bestfriendstock.com/api/health/
             quant-freshness): the weekly Mac update stopped (Mac off or asleep, Sharadar subscription ended or its key
             rejected, a failing run: see ~/Library/Logs/bestfriendstock/quant-weekly-*.log)
"""
import importlib.util
import json
import os
import sys
import urllib.request
from datetime import date, datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
URL = os.environ.get("BFS_BASE_URL", "https://bestfriendstock.com") + "/api/health/quant-freshness"
DESK_MAX_DAYS = 12
MEMBERSHIP_MAX_DAYS = 330


def check_holidays(today: date, known_years: set) -> list:
    last = max(known_years)
    if today.year > last:
        return [f"The NYSE holiday table ends in {last} and it is already {today.year}: add the holidays in backend/services/us_calendar.py"]
    if today.year == last and today.month >= 11:
        return [f"The NYSE holiday table ends in {last}: add {last + 1}'s holidays to backend/services/us_calendar.py "
                f"(nyse.com publishes them; also extend KNOWN_YEARS)"]
    return []


def check_membership(today: date, built: str) -> list:
    days = (today - date.fromisoformat(built)).days
    if days > MEMBERSHIP_MAX_DAYS:
        return [f"The S&P 500 membership list is {days} days old (built {built}): run backend/tools/build_sp500_history.py and "
                "deploy; the factor lab's historical universe stops at the list's last update"]
    return []


def check_desk(age_days) -> list:
    if age_days is None:
        return ["The admin quant desk has never been published on the server"]
    if age_days > DESK_MAX_DAYS:
        return [f"The quant desk file on the server is {age_days:.0f} days old: the weekly Mac update has stopped. Check that the Mac "
                "is on, the Sharadar subscription is active and the key works (~/Library/Logs/bestfriendstock/quant-weekly-*.log)"]
    return []


def load_holiday_years():
    spec = importlib.util.spec_from_file_location("us_calendar", os.path.join(ROOT, "backend", "services", "us_calendar.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.KNOWN_YEARS


def main() -> int:
    today = date.today()
    problems = {}
    problems["holidays"] = check_holidays(today, load_holiday_years())
    with open(os.path.join(ROOT, "backend", "data", "sp500_membership.json"), encoding="utf-8") as fh:
        built = json.load(fh)["built"]
    problems["membership"] = check_membership(today, built)
    try:
        with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "bestfriendstock-maintenance/1.0"}), timeout=20) as r:
            age = json.load(r).get("desk_age_days")
        problems["desk"] = check_desk(age)
    except Exception as e:                     # the uptime check reports an outage; this one only reports stale things
        problems["desk"] = []
        print("desk check skipped:", str(e)[:100], file=sys.stderr)
    found = [m for v in problems.values() for m in v]
    if "--json" in sys.argv:
        print(json.dumps(problems, indent=1))
    else:
        stamp = datetime.now().strftime("%Y-%m-%d")
        print(f"Maintenance check {stamp}: " + ("nothing to do" if not found else f"{len(found)} thing(s) to do"))
        for m in found:
            print("-", m)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
