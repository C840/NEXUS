"""
NEXUS API — FastAPI application.

Run (from backend/):  .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
OpenAPI docs:         http://localhost:8000/docs
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app import __version__
from app.api import router, ws_router
from app.config import Config
from app.engine.service import NexusService, ServiceError


def create_app(config: Optional[Config] = None, service: Optional[NexusService] = None) -> FastAPI:
    cfg = config or Config()
    logging.basicConfig(level=cfg.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.service = service or NexusService()
        task = asyncio.create_task(app.state.service.run_live()) if cfg.live else None
        if cfg.live and cfg.capture_autostart:
            try:
                await app.state.service.live.start()
            except Exception as exc:  # no driver / no permission — the Live Capture page explains how to enable it
                logging.getLogger("nexus.live").warning("live capture not started: %s", exc)
        try:
            yield
        finally:
            if task:
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task
            await app.state.service.shutdown()

    app = FastAPI(
        title="NEXUS API",
        version=__version__,
        summary="Neural Explainable Unified Security — research prototype backend (simulated environment).",
        lifespan=lifespan,
    )
    app.add_middleware(CORSMiddleware, allow_origins=cfg.cors_origins, allow_methods=["*"], allow_headers=["*"])

    @app.exception_handler(ServiceError)
    async def service_error(_: Request, exc: ServiceError) -> JSONResponse:
        return JSONResponse(status_code=exc.status, content={"detail": exc.message})

    @app.get("/", include_in_schema=False)
    async def root() -> RedirectResponse:
        return RedirectResponse("/docs")

    app.include_router(router)
    app.include_router(ws_router)
    return app


app = create_app()
