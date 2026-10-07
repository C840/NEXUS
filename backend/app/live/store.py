"""
Persistence for live-capture results (SQLite, backend/data/nexus.db, gitignored).

* live detections — so a backend restart keeps them (re-numbered on load);
* the false-positive allowlist — hosts an analyst marked as benign.

The simulated environment is regenerated deterministically and is not stored.
"""

from __future__ import annotations

import pickle
import sqlite3
import time
from pathlib import Path
from typing import Any, Optional

DB_FILE = Path(__file__).resolve().parents[2] / "data" / "nexus.db"


class LiveStore:
    def __init__(self, path: Path = DB_FILE) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.executescript(
            """
            CREATE TABLE IF NOT EXISTS live_threats (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              created REAL NOT NULL,
              spec BLOB NOT NULL,          -- pickled RecordSpec written by this backend
              status TEXT                  -- latest status override (e.g. dismissed)
            );
            CREATE TABLE IF NOT EXISTS allowlist (
              ip TEXT PRIMARY KEY,
              reason TEXT NOT NULL,
              added REAL NOT NULL
            );
            """
        )
        self._db.commit()

    # ---------------------------------------------------------------- detections

    def add_detection(self, spec: Any) -> int:
        cur = self._db.execute("INSERT INTO live_threats (created, spec) VALUES (?, ?)", (time.time(), pickle.dumps(spec)))
        self._db.commit()
        return int(cur.lastrowid or 0)

    def set_status(self, row_id: int, status: str) -> None:
        self._db.execute("UPDATE live_threats SET status = ? WHERE id = ?", (status, row_id))
        self._db.commit()

    def detections(self, limit: int = 500) -> list[tuple[int, Any, Optional[str]]]:
        rows = self._db.execute("SELECT id, spec, status FROM live_threats ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        out = []
        for row_id, blob, status in reversed(rows):
            try:
                out.append((int(row_id), pickle.loads(blob), status))  # noqa: S301 — local file written by this app
            except Exception:
                continue
        return out

    # ---------------------------------------------------------------- allowlist

    def allow(self, ip: str, reason: str) -> None:
        self._db.execute("INSERT OR REPLACE INTO allowlist (ip, reason, added) VALUES (?, ?, ?)", (ip, reason, time.time()))
        self._db.commit()

    def disallow(self, ip: str) -> None:
        self._db.execute("DELETE FROM allowlist WHERE ip = ?", (ip,))
        self._db.commit()

    def allowlist(self) -> list[dict[str, object]]:
        rows = self._db.execute("SELECT ip, reason, added FROM allowlist ORDER BY added DESC").fetchall()
        return [{"ip": ip, "reason": reason, "added": added} for ip, reason, added in rows]

    def close(self) -> None:
        self._db.close()
