"""
Realtime event log.

Every change the frontend should see is published here as a RealtimeMessage
(the union in frontend/src/types/realtime.ts) with a monotonically increasing
sequence number. Transports read from the log:

* polling  — GET /api/realtime/poll?after=<seq>      (phase 2, fallback)
* WebSocket — /ws/events, pushed as they are published  (phase 3)

Sequence numbers let a client resume after a reconnect without gaps.
"""

from __future__ import annotations

import asyncio
from collections import deque
from typing import Any

from pydantic import BaseModel

Message = dict[str, Any]


def message(kind: str, **payload: Any) -> Message:
    """Build a JSON-ready realtime message; pydantic models are serialized camelCase."""
    out: Message = {"type": kind}
    for key, value in payload.items():
        if isinstance(value, BaseModel):
            out[key] = value.model_dump(mode="json")
        else:
            out[key] = value
    return out


class EventBus:
    def __init__(self, capacity: int = 2000) -> None:
        self._seq = 0
        self._log: deque[tuple[int, Message]] = deque(maxlen=capacity)
        self._subscribers: set[asyncio.Queue[tuple[int, Message]]] = set()

    @property
    def seq(self) -> int:
        return self._seq

    def publish(self, msg: Message) -> int:
        self._seq += 1
        entry = (self._seq, msg)
        self._log.append(entry)
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(entry)
            except asyncio.QueueFull:
                # A stalled client must not block the engine; it can resume by sequence.
                pass
        return self._seq

    def since(self, after: int, limit: int = 1000) -> tuple[int, list[Message], bool]:
        """Messages with seq > after. `gap` is true when older messages already fell off the log."""
        oldest = self._log[0][0] if self._log else self._seq + 1
        gap = after < oldest - 1
        messages = [m for s, m in self._log if s > after][:limit]
        return self._seq, messages, gap

    def subscribe(self, max_queue: int = 1000) -> asyncio.Queue[tuple[int, Message]]:
        queue: asyncio.Queue[tuple[int, Message]] = asyncio.Queue(maxsize=max_queue)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[tuple[int, Message]]) -> None:
        self._subscribers.discard(queue)
