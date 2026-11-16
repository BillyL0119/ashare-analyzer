"""requests' transport hook in services/js_runtime: a request with no timeout gets (10, 30) so a stalled
feed cannot block its thread for ever; an explicit timeout stays; inside a V8_LOCK hold the budget
still bounds it. A fake inner _send records what it is given: no network."""
import types

import pytest

import stubs
stubs.stub()
import requests  # noqa: E402  (the real one, or the stand-in)

from services import js_runtime  # noqa: E402


@pytest.fixture
def sent(monkeypatch):
    seen = []
    monkeypatch.setattr(js_runtime, "_send", lambda self, request, *a, **kw: seen.append(kw.get("timeout")))
    return seen


REQ = types.SimpleNamespace(url="http://example.test/x")


def test_no_timeout_gets_the_default(sent):
    js_runtime._send_within_hold(None, REQ, stream=False)
    js_runtime._send_within_hold(None, REQ, timeout=None)
    assert sent == [(10, 30), (10, 30)]


def test_explicit_timeout_is_left_alone(sent):
    js_runtime._send_within_hold(None, REQ, timeout=5)
    js_runtime._send_within_hold(None, REQ, timeout=(2, 7))
    assert sent == [5, (2, 7)]


def test_inside_a_hold_the_budget_bounds_it(sent):
    with js_runtime.V8_LOCK:
        js_runtime._send_within_hold(None, REQ, timeout=None)
        js_runtime._send_within_hold(None, REQ, timeout=1)
    connect, read = sent[0]
    assert 19 < connect <= 20 and 19 < read <= 20       # whatever is left of _HOLD_BUDGET, not (10, 30)
    assert sent[1] == (1, 1)


def test_hold_past_its_budget_fails_at_once(sent):
    with js_runtime.V8_LOCK:
        js_runtime._local.deadline = 0.0
        with pytest.raises(requests.exceptions.Timeout):
            js_runtime._send_within_hold(None, REQ, timeout=None)
    assert sent == []
