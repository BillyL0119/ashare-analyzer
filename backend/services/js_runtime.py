"""akshare signs or decodes some feeds (cninfo, 10jqka, Sina history) in an embedded V8 (py_mini_racer), which is not
thread safe: two threads inside it at once can take the whole process down (it did, for cninfo).
Every call into these feeds, from the background jobs (calendar, CN sector boards) and from
request handlers (Sina daily/index history), holds this one lock, one call at a time.

Many of those akshare calls also download inside the lock, with no timeout of their own: a feed that
stalls kept the lock (and every A-share chart behind it) for 10+ minutes on production. So the HTTP
requests a thread makes while holding the lock share one time budget (_HOLD_BUDGET): past it they
fail at once and the call gives the lock up."""
import logging
import sys
import threading
import time

import requests
import requests.adapters

logger = logging.getLogger("v8")

_HOLD_BUDGET = 20.0       # seconds of network a single hold of the lock may spend
_FIRST_WAIT = 30.0        # how long v8_call_first waits for the lock before giving up
_local = threading.local()


class _V8Lock:
    """One holder at a time, like threading.Lock, but waiters are served in arrival order and a caller
    a user is waiting on (v8_call_first) goes before queued background callers: background jobs
    (cninfo dividends, 10jqka sector boards) take it call after call from several threads, and a
    plain Lock let a stock page's 50ms Sina decode wait behind them for 9s."""

    def __init__(self):
        self._cond = threading.Condition(threading.Lock())
        self._held = False
        self._queue: list = []          # waiting tickets, first-class ones ahead of the rest
        self._first = set()             # tickets of first-class waiters
        self._tickets = 0
        self._since = 0.0
        self._holder = ""

    def acquire(self, blocking: bool = True, first: bool = False, timeout: float = None, holder: str = "") -> bool:
        with self._cond:
            if not self._held and not self._queue:
                return self._take(holder)
            if not blocking:
                return False
            self._tickets += 1
            ticket = self._tickets
            if first:
                pos = next((i for i, t in enumerate(self._queue) if t not in self._first), len(self._queue))
                self._queue.insert(pos, ticket)
                self._first.add(ticket)
            else:
                self._queue.append(ticket)
            end = None if timeout is None else time.monotonic() + timeout
            try:
                while self._held or self._queue[0] != ticket:
                    left = None if end is None else end - time.monotonic()
                    if left is not None and left <= 0:
                        self._drop(ticket)
                        return False
                    self._cond.wait(left)
            except BaseException:               # never leave a dead ticket at the head of the queue
                self._drop(ticket)
                raise
            self._queue.pop(0)
            self._first.discard(ticket)
            return self._take(holder)

    def _take(self, holder: str) -> bool:
        self._held = True
        self._since = time.monotonic()
        self._holder = holder
        _local.deadline = self._since + _HOLD_BUDGET
        return True

    def _drop(self, ticket: int) -> None:
        self._queue.remove(ticket)
        self._first.discard(ticket)
        self._cond.notify_all()

    def release(self) -> None:
        _local.deadline = None
        held = time.monotonic() - self._since
        if held > 10:
            logger.warning("V8 lock held %.0fs by %s", held, self._holder or "?")
        with self._cond:
            self._held = False
            self._cond.notify_all()

    def locked(self) -> bool:
        return self._held

    def __enter__(self):
        f = sys._getframe(1)
        self.acquire(holder=f"{f.f_code.co_name} ({f.f_code.co_filename.rsplit('/', 1)[-1]}:{f.f_lineno})")
        return self

    def __exit__(self, *exc):
        self.release()


V8_LOCK = _V8Lock()


_send = requests.adapters.HTTPAdapter.send


def _send_within_hold(self, request, *args, **kwargs):
    """requests' transport, bounded by the hold's budget when this thread holds V8_LOCK."""
    deadline = getattr(_local, "deadline", None)
    if deadline is not None:
        left = deadline - time.monotonic()
        if left <= 0:
            raise requests.exceptions.Timeout(f"V8 lock held over {_HOLD_BUDGET:.0f}s, not fetching {request.url}")
        t = kwargs.get("timeout")
        if t is None or isinstance(t, (int, float, tuple)):
            connect, read = t if isinstance(t, tuple) else (t, t)
            kwargs["timeout"] = (left if connect is None else min(connect, left),
                                 left if read is None else min(read, left))
    return _send(self, request, *args, **kwargs)


requests.adapters.HTTPAdapter.send = _send_within_hold


def _name(fn) -> str:
    return getattr(fn, "__name__", None) or repr(fn)


def v8_call(fn, *args, **kwargs):
    """Run one akshare call that goes through V8 (Sina daily/index history, 10jqka, cninfo)
    while holding the lock. Hold it per call, not per batch, so a request never waits long."""
    V8_LOCK.acquire(holder=_name(fn))
    try:
        return fn(*args, **kwargs)
    finally:
        V8_LOCK.release()


def v8_call_first(fn, *args, **kwargs):
    """v8_call for a short call a request waits on (a Sina history decode, ~50ms): it takes the lock
    as soon as the current holder lets go, ahead of queued background jobs. Raises TimeoutError
    rather than wait more than _FIRST_WAIT for it."""
    if not V8_LOCK.acquire(first=True, timeout=_FIRST_WAIT, holder=_name(fn)):
        raise TimeoutError(f"V8 lock busy for {_FIRST_WAIT:.0f}s (held by {V8_LOCK._holder or '?'})")
    try:
        return fn(*args, **kwargs)
    finally:
        V8_LOCK.release()
