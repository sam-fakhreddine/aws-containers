"""Input validation utilities."""

import re
from fastapi import HTTPException, status

PROFILE_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')

def validate_profile_name(name: str) -> str:
    """Validate profile name to prevent path traversal."""
    if not name or len(name) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid profile name"
        )
    if not PROFILE_NAME_PATTERN.match(name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid profile name"
        )
    return name
