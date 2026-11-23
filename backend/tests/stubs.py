"""Stand-ins for the heavy third-party modules the routers import (fastapi, akshare, requests, pandas),
so tests of routers/market.py, news.py and the like can run where CI installs only pytest and numpy.
A module that is really installed is used as it is: stub() only fills in what is missing."""
import importlib
import os
import sys
import types


def _module(name, **attrs):
    m = types.ModuleType(name)
    m.__dict__.update(attrs)
    sys.modules[name] = m
    return m


def _missing(name):
    try:
        importlib.import_module(name)
        return False
    except ImportError:
        return True


class _Router:
    """APIRouter whose decorators return the function itself, so tests can call the endpoints."""
    def __init__(self, *a, **kw):
        pass

    def _deco(self, *a, **kw):
        return lambda fn: fn

    get = post = put = delete = patch = api_route = _deco


class HTTPException(Exception):
    def __init__(self, status_code=500, detail=None, headers=None):
        super().__init__(detail)
        self.status_code, self.detail = status_code, detail


class JSONResponse:
    def __init__(self, content=None, status_code=200, headers=None):
        self.content, self.status_code, self.headers = content, status_code, headers or {}


def _anything(name):
    """A module whose every attribute is a harmless callable returning another one."""
    class _Any:
        def __or__(self, other):            # `pd.DataFrame | None` in an annotation
            return self
        __ror__ = __or__

        def __call__(self, *a, **kw):
            return _Any()

        def __getattr__(self, k):
            if k.startswith("__"):
                raise AttributeError(k)
            return _Any()
    def attr(k):
        if k.startswith("__"):                       # __path__, __spec__ ...: the import machinery asks
            raise AttributeError(k)
        return _Any()
    m = _module(name)
    m.__getattr__ = attr
    return m


def stub():
    os.environ["BFS_NO_WARMUP"] = "1"        # routers/market.py starts background threads on import
    if _missing("requests"):
        class RequestException(Exception):
            pass

        class Timeout(RequestException):
            pass

        class ConnectionError(RequestException):  # noqa: A001 (mirrors requests.ConnectionError)
            pass

        class HTTPAdapter:
            def send(self, request, **kw):
                raise Timeout("stub")
        exceptions = _module("requests.exceptions", Timeout=Timeout, RequestException=RequestException,
                             ConnectionError=ConnectionError)
        adapters = _module("requests.adapters", HTTPAdapter=HTTPAdapter)
        _module("requests", adapters=adapters, exceptions=exceptions, get=lambda *a, **kw: None,
                post=lambda *a, **kw: None, Session=object, RequestException=RequestException, Timeout=Timeout,
                ConnectionError=ConnectionError)
    if _missing("fastapi"):
        _module("fastapi", APIRouter=_Router, BackgroundTasks=object, HTTPException=HTTPException,
                Query=lambda default=None, **kw: default, Request=object, Depends=lambda f=None: f,
                Header=lambda default=None, **kw: default, Response=object, Body=lambda default=None, **kw: default)
        _module("fastapi.responses", JSONResponse=JSONResponse, Response=object,
                StreamingResponse=object, FileResponse=object)
    for name in ("akshare", "pandas", "py_mini_racer"):
        if _missing(name):
            _anything(name)
