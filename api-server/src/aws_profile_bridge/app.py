"""AWS Profile Bridge HTTP API Server - Clean Architecture."""

import asyncio
import logging
import os
import signal
import sys
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .api import health, profiles
from .auth.authenticator import Authenticator
from .auth.rate_limiter import RateLimiter
from .auth.token_manager import TokenManager
from .config import settings
from .middleware.extension_validator import validate_extension_origin
from .middleware.logging import log_requests


def setup_logging() -> logging.Logger:
    """Configure rotating file logger."""
    settings.LOG_DIR.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("aws_profile_bridge")
    logger.setLevel(logging.INFO)

    handler = RotatingFileHandler(
        settings.LOG_FILE,
        maxBytes=settings.LOG_MAX_BYTES,
        backupCount=settings.LOG_BACKUP_COUNT,
        encoding="utf-8",
    )

    formatter = logging.Formatter(
        fmt="{asctime} | {levelname:8} | {name} | {message}",
        style="{",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger


logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("Starting AWS Profile Bridge API v2.0.0")
    logger.info(f"Python {sys.version}")
    logger.info(f"PID: {__import__('os').getpid()}")
    logger.info(f"Listening on {settings.HOST}:{settings.PORT}")
    logger.info(f"Logs: {settings.LOG_FILE}")

    # Initialize authentication
    token_manager = TokenManager(settings.CONFIG_FILE)
    token_manager.load_or_create()
    logger.info(f"API token configured (stored in {settings.CONFIG_FILE})")

    rate_limiter = RateLimiter(settings.MAX_ATTEMPTS, settings.WINDOW_SECONDS)
    logger.info(
        f"Rate limiting: {settings.MAX_ATTEMPTS} attempts per {settings.WINDOW_SECONDS}s"
    )

    authenticator = Authenticator(token_manager, rate_limiter)
    profiles.set_authenticator(authenticator)

    # Setup graceful shutdown
    loop = asyncio.get_running_loop()

    def signal_handler(sig):
        logger.info(f"Received signal {sig}, initiating graceful shutdown...")
        loop.stop()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda s=sig: signal_handler(s))

    yield

    logger.info("Shutting down AWS Profile Bridge API")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(title="AWS Profile Bridge API", version="2.0.0", lifespan=lifespan)

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_methods=["POST", "GET", "OPTIONS"],
        allow_headers=["Content-Type", "X-API-Token"],
        allow_credentials=False,
    )

    # Logging middleware
    app.middleware("http")(log_requests)

    # Extension origin validation
    app.middleware("http")(validate_extension_origin)

    # Register routes
    app.include_router(health.router)
    app.include_router(profiles.router)

    return app


app = create_app()


def start_server() -> None:
    """Run the API server."""
    match os.getenv("ENV", "production").lower():
        case "development" | "dev":
            uvicorn.run(
                "aws_profile_bridge.app:app",
                host=settings.HOST,
                port=settings.PORT,
                reload=True,
                log_level="debug",
            )
        case "production" | "prod":
            uvicorn.run(
                app,
                host=settings.HOST,
                port=settings.PORT,
                log_level="warning",
                access_log=False,
            )
        case _:
            logger.error(f"Unknown environment: {os.getenv('ENV')}")
            sys.exit(1)


def main() -> None:
    """Entry point for running the server."""
    start_server()


if __name__ == "__main__":
    main()
