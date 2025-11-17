"""AWS Profile Bridge HTTP API Server - Python 3.12+

Leverages modern Python features:
- PEP 695: Type parameter syntax
- PEP 692: TypedDict for precise typing
- Improved type hints with unions using |
- Better error messages and traceback
"""

from typing import TypedDict, NotRequired
from collections.abc import Sequence
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import signal
import sys
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone
import time

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn


# Python 3.12 type hints - use | for unions, modern syntax
type ProfileName = str
type URL = str


# Python 3.12 TypedDict with NotRequired for optional fields
class Profile(TypedDict):
    name: str
    has_credentials: bool
    expired: bool
    is_sso: bool
    color: NotRequired[str]
    icon: NotRequired[str]


class ProfileListResponse(TypedDict):
    action: str  # Literal["profileList"]
    profiles: Sequence[Profile]


class ConsoleUrlResponse(TypedDict):
    action: str  # Literal["consoleUrl"]
    profileName: ProfileName
    url: URL
    color: NotRequired[str]
    icon: NotRequired[str]


class ErrorResponse(TypedDict):
    action: str  # Literal["error"]
    message: str


class HealthResponse(TypedDict):
    status: str
    version: str
    uptime_seconds: float
    python_version: str


# Modern Pydantic models with Python 3.12 syntax
class ApiResponse[T](BaseModel):
    """Generic API response wrapper using Python 3.12 type parameters."""
    data: T
    request_id: str = Field(default_factory=lambda: __import__('uuid').uuid4().hex)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Configuration constants
HOST: str = "127.0.0.1"  # SECURITY: localhost only
PORT: int = 10999
LOG_DIR: Path = Path.home() / ".aws" / "logs"
LOG_FILE: Path = LOG_DIR / "aws_profile_bridge_api.log"
LOG_MAX_BYTES: int = 10 * 1024 * 1024  # 10MB
LOG_BACKUP_COUNT: int = 5
CORS_ORIGINS: list[str] = ["moz-extension://*"]

# Global state
START_TIME: float = time.time()


def setup_logging() -> logging.Logger:
    """Configure rotating file logger with detailed formatting."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger("aws_profile_bridge")
    logger.setLevel(logging.INFO)
    
    # Rotating file handler
    handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=LOG_MAX_BYTES,
        backupCount=LOG_BACKUP_COUNT,
        encoding="utf-8"
    )
    
    # Python 3.12 f-string improvements - cleaner formatting
    formatter = logging.Formatter(
        fmt="{asctime} | {levelname:8} | {name} | {message}",
        style="{",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger


logger = setup_logging()


# Python 3.12 async context manager with modern syntax
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle with proper async cleanup."""
    # Startup
    logger.info(f"Starting AWS Profile Bridge API v2.0.0")
    logger.info(f"Python {sys.version}")
    logger.info(f"PID: {__import__('os').getpid()}")
    logger.info(f"Listening on {HOST}:{PORT}")
    logger.info(f"Logs: {LOG_FILE}")
    
    # Setup graceful shutdown handlers
    loop = asyncio.get_running_loop()
    
    def signal_handler(sig):
        logger.info(f"Received signal {sig}, initiating graceful shutdown...")
        loop.stop()
    
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda s=sig: signal_handler(s))
    
    yield
    
    # Shutdown
    logger.info("Shutting down AWS Profile Bridge API")


app = FastAPI(
    title="AWS Profile Bridge API",
    version="2.0.0",
    lifespan=lifespan
)


# CORS configuration - restrict to extension only
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


# Middleware for request logging with request ID
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with timing and request ID."""
    import uuid
    
    request_id = uuid.uuid4().hex[:8]
    start_time = time.time()
    
    # Python 3.12 improved f-strings
    logger.info(f"[{request_id}] → {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        
        logger.info(
            f"[{request_id}] ← {response.status_code} "
            f"({duration_ms:.2f}ms)"
        )
        
        response.headers["X-Request-ID"] = request_id
        return response
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.exception(f"[{request_id}] ! Error after {duration_ms:.2f}ms: {e}")
        raise


# Endpoints using Python 3.12 type hints
@app.get("/health")
async def health_check() -> HealthResponse:
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "uptime_seconds": time.time() - START_TIME,
        "python_version": sys.version.split()[0],
    }


@app.post("/profiles")
async def get_profiles() -> ProfileListResponse | ErrorResponse:
    """
    Get all AWS profiles (fast mode - no SSO enrichment).
    
    Returns profiles from ~/.aws/config and ~/.aws/credentials
    with basic information only.
    """
    try:
        from aws_profile_bridge import AWSProfileBridge
        
        # Create bridge and access the handler
        bridge = AWSProfileBridge()
        handler = bridge.host.handler
        
        # Call the handler's method
        result = await asyncio.wait_for(
            asyncio.to_thread(handler._handle_get_profiles),
            timeout=5.0
        )
        
        return result
        
    except asyncio.TimeoutError:
        logger.error("Profile list request timed out")
        return {
            "action": "error",
            "message": "Request timed out after 5 seconds",
        }
    except Exception as e:
        logger.exception("Error getting profiles")
        return {
            "action": "error",
            "message": f"Failed to get profiles: {e!s}",
        }


@app.post("/profiles/enrich")
async def get_profiles_enriched() -> ProfileListResponse | ErrorResponse:
    """
    Get all AWS profiles with SSO enrichment (slow mode).
    
    Validates SSO tokens and enriches profile data. May take several seconds
    depending on number of SSO profiles.
    """
    try:
        from aws_profile_bridge import AWSProfileBridge
        
        # Create bridge and access the handler
        bridge = AWSProfileBridge()
        handler = bridge.host.handler
        
        # Call the handler's method with empty message to enrich all profiles
        result = await asyncio.wait_for(
            asyncio.to_thread(handler._handle_enrich_sso_profiles, {}),
            timeout=30.0
        )
        
        return result
        
    except asyncio.TimeoutError:
        logger.error("Profile enrichment timed out")
        return {
            "action": "error",
            "message": "SSO enrichment timed out after 30 seconds",
        }
    except Exception as e:
        logger.exception("Error enriching profiles")
        return {
            "action": "error",
            "message": f"Failed to enrich profiles: {e!s}",
        }


@app.post("/profiles/{profile_name}/console-url")
async def get_console_url(
    profile_name: ProfileName
) -> ConsoleUrlResponse | ErrorResponse:
    """
    Generate AWS Console URL for specified profile.
    
    Args:
        profile_name: Name of the AWS profile from ~/.aws/config
        
    Returns:
        Console federation URL with temporary credentials
    """
    try:
        from aws_profile_bridge import AWSProfileBridge
        
        # Create bridge and access the handler
        bridge = AWSProfileBridge()
        handler = bridge.host.handler
        
        # Call the handler's method
        result = await asyncio.wait_for(
            asyncio.to_thread(
                handler._handle_open_profile, 
                {"profileName": profile_name}
            ),
            timeout=15.0
        )
        
        # Return the result directly if it's already formatted correctly
        if result.get("action") == "consoleUrl":
            return result
        
        # Handle error case
        return result
        
    except asyncio.TimeoutError:
        logger.error(f"Console URL generation timed out for {profile_name}")
        return {
            "action": "error",
            "message": f"Console URL generation timed out for {profile_name}",
        }
    except Exception as e:
        logger.exception(f"Error generating console URL for {profile_name}")
        return {
            "action": "error",
            "message": f"Failed to generate console URL: {e!s}",
        }


@app.get("/version")
async def version_info() -> dict[str, str]:
    """Get detailed version information."""
    import platform
    import fastapi
    
    return {
        "api_version": "2.0.0",
        "api_protocol": "1",
        "python_version": sys.version,
        "platform": platform.platform(),
        "fastapi_version": fastapi.__version__,
    }


def main() -> None:
    """Run the API server."""
    import os
    
    # Python 3.12 match statement for environment-based config
    match os.getenv("ENV", "production").lower():
        case "development" | "dev":
            uvicorn.run(
                "aws_profile_bridge.api_server:app",
                host=HOST,
                port=PORT,
                reload=True,
                log_level="debug",
            )
        case "production" | "prod":
            uvicorn.run(
                app,
                host=HOST,
                port=PORT,
                log_level="warning",
                access_log=False,  # We handle logging in middleware
            )
        case _:
            logger.error(f"Unknown environment: {os.getenv('ENV')}")
            sys.exit(1)


if __name__ == "__main__":
    main()
