"""Runtime configuration from environment variables (12-factor; Docker friendly).

Values may also come from backend/.env (KEY=value lines; never committed).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


def load_env_file(path: Path = ENV_FILE) -> None:
    """Minimal .env loader — real environment variables take precedence."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()


def _list(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


def _flag(name: str, default: str) -> bool:
    return os.getenv(name, default) not in ("0", "false", "False", "")


@dataclass(frozen=True)
class Config:
    #: Browser origins allowed to call the API directly (the Vite dev proxy needs none).
    cors_origins: list[str] = field(default_factory=lambda: _list(os.getenv("NEXUS_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")))
    #: Run the live loop (traffic ticks, heartbeats, background detections). Tests turn it off.
    live: bool = _flag("NEXUS_LIVE", "1")
    #: Start packet capture automatically when a capture driver is available.
    capture_autostart: bool = _flag("NEXUS_CAPTURE_AUTOSTART", "1")
    #: Log level for the nexus.* loggers.
    log_level: str = os.getenv("NEXUS_LOG_LEVEL", "INFO")
