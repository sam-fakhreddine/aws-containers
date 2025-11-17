"""Request logging middleware."""

import time
import uuid
import logging
from fastapi import Request

logger = logging.getLogger(__name__)


async def log_requests(request: Request, call_next):
    """Log all requests with timing and request ID."""
    request_id = uuid.uuid4().hex[:8]
    start_time = time.time()
    
    logger.info(f"[{request_id}] → {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        
        logger.info(f"[{request_id}] ← {response.status_code} ({duration_ms:.2f}ms)")
        
        response.headers["X-Request-ID"] = request_id
        return response
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.exception(f"[{request_id}] ! Error after {duration_ms:.2f}ms: {e}")
        raise
