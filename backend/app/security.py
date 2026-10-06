"""
Optional access token for a backend shared beyond this machine (`npm run share`).

When NEXUS_ACCESS_TOKEN is set, every /api and /ws request must carry it in the
`X-Nexus-Token` header or a `token` query parameter. Requests made directly on
this computer (loopback, not relayed by the Cloudflare tunnel) stay open, so the
local UI keeps working without a token.
"""

from __future__ import annotations

import hmac
import json
from typing import Any, Awaitable, Callable
from urllib.parse import parse_qs

Scope = dict[str, Any]
ASGIApp = Callable[[Scope, Callable[[], Awaitable[Any]], Callable[[Any], Awaitable[None]]], Awaitable[None]]

LOOPBACK = {"127.0.0.1", "::1", "localhost"}
TUNNEL_HEADERS = (b"cf-connecting-ip", b"x-forwarded-for")


class AccessTokenMiddleware:
    def __init__(self, app: ASGIApp, token: str) -> None:
        self.app = app
        self.token = token.encode()

    def _allowed(self, scope: Scope) -> bool:
        path: str = scope.get("path", "")
        if not (path.startswith("/api") or path.startswith("/ws")) or path == "/api/health":
            return True
        if scope["type"] == "http" and scope.get("method") == "OPTIONS":
            return True
        headers = dict(scope.get("headers") or [])
        client = (scope.get("client") or ("", 0))[0]
        if client in LOOPBACK and not any(h in headers for h in TUNNEL_HEADERS):
            return True
        supplied = headers.get(b"x-nexus-token", b"")
        if not supplied:
            query = parse_qs(scope.get("query_string", b"").decode())
            supplied = (query.get("token") or [""])[0].encode()
        return bool(supplied) and hmac.compare_digest(supplied, self.token)

    async def __call__(self, scope: Scope, receive: Callable[[], Awaitable[Any]], send: Callable[[Any], Awaitable[None]]) -> None:
        if scope["type"] not in ("http", "websocket") or self._allowed(scope):
            await self.app(scope, receive, send)
            return
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 4401})
            return
        body = json.dumps({"detail": "A valid NEXUS access token is required."}).encode()
        await send({"type": "http.response.start", "status": 401, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})
