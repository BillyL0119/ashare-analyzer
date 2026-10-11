"""akshare signs or decodes some feeds (cninfo, 10jqka, Sina history) in an embedded V8 (py_mini_racer), which is not
thread safe: two threads inside it at once can take the whole process down (it did, for cninfo).
Every call into these feeds, from the background jobs (calendar, CN sector boards) and from
request handlers (Sina daily/index history), holds this one lock, one call at a time."""
import threading

V8_LOCK = threading.Lock()


def v8_call(fn, *args, **kwargs):
    """Run one akshare call that goes through V8 (Sina daily/index history, 10jqka, cninfo)
    while holding the lock. Hold it per call, not per batch, so a request never waits long."""
    with V8_LOCK:
        return fn(*args, **kwargs)
