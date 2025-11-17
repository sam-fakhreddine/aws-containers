"""Health and version API routes."""

import sys
import time
from fastapi import APIRouter

router = APIRouter()
start_time: float = time.time()


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "uptime_seconds": time.time() - start_time,
        "python_version": sys.version.split()[0],
    }


@router.get("/version")
async def version_info():
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
