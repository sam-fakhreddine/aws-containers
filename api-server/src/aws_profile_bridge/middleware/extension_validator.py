"""Extension origin validation middleware."""

import logging
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

ALLOWED_EXTENSION_ID = "aws-profile-containers@yourname.local"

async def validate_extension_origin(request: Request, call_next):
    """Validate request comes from authorized extension."""
    if request.url.path == "/health":
        return await call_next(request)
    
    origin = request.headers.get("origin", "")
    if origin and origin.startswith("moz-extension://") and ALLOWED_EXTENSION_ID not in request.headers.get("user-agent", ""):
        logger.warning(f"Unauthorized extension origin: {origin}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Unauthorized extension origin"}
        )
    
    return await call_next(request)
