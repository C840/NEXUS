"""
Realtime WebSocket — pushes the sequenced event log to the browser.

Frames are JSON: {"seq": <last seq in frame>, "messages": [RealtimeMessage, ...]}.
Connect with ?after=<seq> to resume: the first frame then carries everything
published since (and "gap": true if some of it already fell off the log).
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

log = logging.getLogger("nexus.realtime")
router = APIRouter()


@router.websocket("/ws/events")
async def events_socket(ws: WebSocket, after: Optional[int] = None) -> None:
    service = ws.app.state.service
    await ws.accept()
    queue = service.bus.subscribe()
    try:
        if after is None:
            await ws.send_json({"seq": service.bus.seq, "messages": []})
        else:
            seq, backlog, gap = service.bus.since(after)
            await ws.send_json({"seq": seq, "messages": backlog, "gap": gap})
        while True:
            seq, msg = await queue.get()
            await ws.send_json({"seq": seq, "messages": [msg]})
    except WebSocketDisconnect:
        pass
    except Exception:  # network errors on send — the client reconnects and resumes by seq
        log.debug("websocket closed", exc_info=True)
    finally:
        service.bus.unsubscribe(queue)
