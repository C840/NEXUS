from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator

# Tests are hermetic: no LLM calls, no packet capture.
os.environ["GROQ_API_KEY"] = ""
os.environ["NEXUS_CAPTURE_AUTOSTART"] = "0"
os.environ["NEXUS_DB_FILE"] = ":memory:"
os.environ["NEXUS_DATA_DIR"] = tempfile.mkdtemp(prefix="nexus-test-")

import pytest
from fastapi.testclient import TestClient

from app.config import Config
from app.engine.service import NexusService
from app.main import create_app


@pytest.fixture(scope="session")
def service() -> NexusService:
    return NexusService()


@pytest.fixture()
def fresh_service() -> NexusService:
    """A private service for tests that mutate state."""
    return NexusService()


@pytest.fixture(scope="session")
def client(service: NexusService) -> Iterator[TestClient]:
    app = create_app(Config(cors_origins=[], live=False), service=service)
    with TestClient(app) as c:
        yield c
