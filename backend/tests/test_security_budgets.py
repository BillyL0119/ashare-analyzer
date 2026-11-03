"""Site-wide budgets in security.py (GLOBAL_RULES): past a limit every caller waits, whatever their
address, while other paths and methods are unaffected. No network, no app import."""
import types

import security


def _rules(monkeypatch, rules, now=1000.0):
    clock = types.SimpleNamespace(t=now)
    monkeypatch.setattr(security, "GLOBAL_RULES", rules)
    monkeypatch.setattr(security, "time", types.SimpleNamespace(time=lambda: clock.t))
    security._global_hits.clear()
    return clock


def test_budget_blocks_after_limit(monkeypatch):
    _rules(monkeypatch, [("/api/ai/chat", "POST", 3, 60)])
    assert [security.check_global("/api/ai/chat", "POST") for _ in range(3)] == [0, 0, 0]
    assert security.check_global("/api/ai/chat", "POST") > 0
    assert security.check_global("/api/ai/chat", "GET") == 0          # other method
    assert security.check_global("/api/stocks/AAPL/history", "POST") == 0   # other path


def test_every_matching_rule_needs_room(monkeypatch):
    _rules(monkeypatch, [("/api/x", "POST", 10, 60), ("/api/x", "POST", 2, 86400)])
    assert security.check_global("/api/x", "POST") == 0
    assert security.check_global("/api/x", "POST") == 0
    assert security.check_global("/api/x", "POST") > 3600            # the daily rule is full


def test_room_returns_when_the_window_passes(monkeypatch):
    clock = _rules(monkeypatch, [("/api/export", "*", 2, 60)])
    assert security.check_global("/api/export/pdf", "GET") == 0
    assert security.check_global("/api/export/pdf", "POST") == 0
    assert security.check_global("/api/export/pdf", "GET") > 0
    clock.t += 61
    assert security.check_global("/api/export/pdf", "GET") == 0


def test_refused_calls_do_not_use_up_the_budget(monkeypatch):
    clock = _rules(monkeypatch, [("/api/ai/chat", "POST", 1, 60)])
    assert security.check_global("/api/ai/chat", "POST") == 0
    for _ in range(5):
        assert security.check_global("/api/ai/chat", "POST") > 0
    clock.t += 61
    assert security.check_global("/api/ai/chat", "POST") == 0
