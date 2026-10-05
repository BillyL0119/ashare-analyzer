"""Security layer for the API: security headers, per-IP rate limiting, scanner auto-ban,
request size cap and generic error responses. Pure ASGI, no extra dependencies."""

import json
import logging
import os
import time
from collections import defaultdict, deque

logger = logging.getLogger("security")

# ── Configuration ────────────────────────────────────────────────────────────

DEFAULT_ORIGINS = [
    "https://bestfriendstock.com",
    "https://www.bestfriendstock.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]


def allowed_origins() -> list[str]:
    extra = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
    return DEFAULT_ORIGINS + extra


MAX_BODY_BYTES = 256 * 1024          # no endpoint here takes more than a chat message
TRUSTED_PROXIES = {"127.0.0.1", "::1"}

# (path prefix, method or "*", max requests, window seconds) — first match wins
RATE_RULES = [
    # Limits are per IP and deliberately generous: a school or office shares one IP, and
    # the endpoints that spend LLM credits also keep their own per-device limits.
    ("/api/ai/chat",         "POST", 40, 60),    # each call spends LLM credits
    ("/api/career",          "POST", 30, 60),
    ("/api/universities",    "POST", 30, 60),
    ("/api/paper",           "POST", 120, 60),
    ("/api/comments",        "POST", 20, 60),
    ("/api/watchlist",       "POST", 40, 60),
    ("/api/watchlist",       "DELETE", 40, 60),
    ("/api/export",          "*",    20, 60),    # PDF/Excel generation is CPU heavy
    ("/api/backtest",        "*",    40, 60),
    ("/api/",                "*",   900, 60),    # everything else
]

# Paths no legitimate client requests: hitting them marks the IP as a scanner.
HONEYPOT_FRAGMENTS = (
    "/.env", "/.git", "/wp-admin", "/wp-login", "/wp-content", "/xmlrpc.php", "/phpmyadmin",
    "/vendor/phpunit", "/cgi-bin", "/.aws", "/.ssh", "/actuator", "/boaform", "/shell",
    "/config.json", "/server-status", "/etc/passwd", "../",
)
STRIKES_TO_BAN = 3
BAN_SECONDS = 3600

# ── State (single process) ───────────────────────────────────────────────────

_hits: dict[tuple, deque] = defaultdict(deque)
_strikes: dict[str, int] = defaultdict(int)
_banned_until: dict[str, float] = {}
_last_sweep = 0.0


def _sweep(now: float) -> None:
    global _last_sweep
    if now - _last_sweep < 300:
        return
    _last_sweep = now
    for key in [k for k, d in _hits.items() if not d or now - d[-1] > 300]:
        _hits.pop(key, None)
    for ip in [ip for ip, t in _banned_until.items() if t < now]:
        _banned_until.pop(ip, None)
        _strikes.pop(ip, None)


def client_ip(scope) -> str:
    peer = (scope.get("client") or ("unknown", 0))[0]
    if peer in TRUSTED_PROXIES:
        for name, value in scope.get("headers", []):
            if name == b"x-real-ip":
                return value.decode("latin-1").strip()[:64]
    return peer


def _rule_for(path: str, method: str):
    for prefix, m, limit, window in RATE_RULES:
        if path.startswith(prefix) and (m == "*" or m == method):
            return prefix, m, limit, window
    return None


def check_rate(ip: str, path: str, method: str) -> int:
    """Return 0 if allowed, otherwise seconds to wait."""
    rule = _rule_for(path, method)
    if rule is None:
        return 0
    prefix, m, limit, window = rule
    now = time.time()
    dq = _hits[(ip, prefix, m)]
    while dq and now - dq[0] > window:
        dq.popleft()
    if len(dq) >= limit:
        return max(1, int(window - (now - dq[0])))
    dq.append(now)
    return 0


# ── Responses ────────────────────────────────────────────────────────────────

async def _send_json(send, status: int, body: dict, extra_headers=()):
    payload = json.dumps(body).encode()
    headers = [(b"content-type", b"application/json"), (b"content-length", str(len(payload)).encode())]
    headers += list(extra_headers)
    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": payload})


SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=(), payment=()"),
    (b"cross-origin-resource-policy", b"same-site"),
]
API_CSP = (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'")


class SecurityMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        now = time.time()
        _sweep(now)
        ip = client_ip(scope)
        path = scope.get("path", "")
        method = scope.get("method", "GET")

        # 1. banned scanners
        until = _banned_until.get(ip)
        if until and until > now:
            return await _send_json(send, 403, {"detail": "Forbidden"})

        # 2. honeypot paths -> strike -> temporary ban
        lowered = path.lower()
        if any(f in lowered for f in HONEYPOT_FRAGMENTS):
            _strikes[ip] += 1
            if _strikes[ip] >= STRIKES_TO_BAN:
                _banned_until[ip] = now + BAN_SECONDS
                logger.warning("banned scanner %s for %ss (last path %s)", ip, BAN_SECONDS, path[:80])
            return await _send_json(send, 404, {"detail": "Not Found"})

        # 3. request size cap
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    if int(value) > MAX_BODY_BYTES:
                        return await _send_json(send, 413, {"detail": "Request too large"})
                except ValueError:
                    return await _send_json(send, 400, {"detail": "Bad request"})

        # 4. rate limit per real client IP
        wait = check_rate(ip, path, method)
        if wait:
            logger.info("rate limited %s %s %s", ip, method, path[:60])
            return await _send_json(
                send, 429, {"detail": "Too many requests. Please slow down."},
                [(b"retry-after", str(wait).encode())],
            )

        started = False
        is_api = path.startswith("/api/")

        async def send_with_headers(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
                existing = {k.lower() for k, _ in message.get("headers", [])}
                headers = list(message.get("headers", []))
                for k, v in SECURITY_HEADERS + ([API_CSP] if is_api else []):
                    if k not in existing:
                        headers.append((k, v))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_headers)
        except Exception:
            logger.exception("unhandled error on %s %s", method, path[:80])
            if not started:
                await _send_json(send, 500, {"detail": "Internal server error"},
                                 SECURITY_HEADERS)


def internal_error():
    """Log the active exception server-side and return a generic 500 for the client."""
    from fastapi import HTTPException
    logger.exception("internal error")
    return HTTPException(status_code=500, detail="Internal server error")
