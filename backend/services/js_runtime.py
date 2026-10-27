"""akshare signs or decodes some feeds (cninfo, 10jqka, Sina history) in an embedded V8 (py_mini_racer), which is not
thread safe: two threads inside it at once can take the whole process down (it did, for cninfo).
Every call into these feeds, from the background jobs (calendar, CN sector boards) and from
request handlers (Sina daily/index history), holds this one lock, one call at a time."""
import threading


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

    def acquire(self, blocking: bool = True, first: bool = False) -> bool:
        with self._cond:
            if not self._held and not self._queue:
                self._held = True
                return True
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
            try:
                while self._held or self._queue[0] != ticket:
                    self._cond.wait()
            except BaseException:               # never leave a dead ticket at the head of the queue
                self._queue.remove(ticket)
                self._first.discard(ticket)
                self._cond.notify_all()
                raise
            self._queue.pop(0)
            self._first.discard(ticket)
            self._held = True
            return True

    def release(self) -> None:
        with self._cond:
            self._held = False
            self._cond.notify_all()

    def locked(self) -> bool:
        return self._held

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, *exc):
        self.release()


V8_LOCK = _V8Lock()


def v8_call(fn, *args, **kwargs):
    """Run one akshare call that goes through V8 (Sina daily/index history, 10jqka, cninfo)
    while holding the lock. Hold it per call, not per batch, so a request never waits long."""
    with V8_LOCK:
        return fn(*args, **kwargs)


def v8_call_first(fn, *args, **kwargs):
    """v8_call for a short call a request waits on (a Sina history decode, ~50ms): it takes the lock
    as soon as the current holder lets go, ahead of queued background jobs."""
    V8_LOCK.acquire(first=True)
    try:
        return fn(*args, **kwargs)
    finally:
        V8_LOCK.release()
