"""Profile-related API routes."""

import asyncio
import logging
from fastapi import APIRouter, Header

from ..auth.authenticator import Authenticator

logger = logging.getLogger(__name__)

router = APIRouter()
authenticator: Authenticator | None = None


def set_authenticator(auth: Authenticator) -> None:
    """Set the authenticator instance."""
    global authenticator
    authenticator = auth


@router.get("/profiles")
@router.post("/profiles")
async def get_profiles(x_api_token: str | None = Header(None, alias="X-API-Token")):
    """Get all AWS profiles (fast mode)."""
    authenticator.authenticate(x_api_token)

    try:
        from ..core.bridge import AWSProfileBridge

        bridge = AWSProfileBridge()
        handler = bridge.message_handler

        result = await asyncio.wait_for(
            asyncio.to_thread(handler._handle_get_profiles), timeout=5.0
        )

        return result

    except asyncio.TimeoutError:
        logger.error("Profile list request timed out")
        return {"action": "error", "message": "Request timed out after 5 seconds"}
    except Exception as e:
        logger.exception("Error getting profiles")
        return {"action": "error", "message": f"Failed to get profiles: {e!s}"}


@router.get("/profiles/enrich")
@router.post("/profiles/enrich")
async def get_profiles_enriched(
    x_api_token: str | None = Header(None, alias="X-API-Token")
):
    """Get all AWS profiles with SSO enrichment."""
    authenticator.authenticate(x_api_token)

    try:
        from ..core.bridge import AWSProfileBridge

        bridge = AWSProfileBridge()
        handler = bridge.message_handler

        result = await asyncio.wait_for(
            asyncio.to_thread(handler._handle_enrich_sso_profiles, {}), timeout=30.0
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
        return {"action": "error", "message": f"Failed to enrich profiles: {e!s}"}


@router.post("/profiles/{profile_name}/console-url")
async def get_console_url(
    profile_name: str, x_api_token: str | None = Header(None, alias="X-API-Token")
):
    """Generate AWS Console URL for specified profile."""
    authenticator.authenticate(x_api_token)

    try:
        from ..core.bridge import AWSProfileBridge

        bridge = AWSProfileBridge()
        handler = bridge.message_handler

        result = await asyncio.wait_for(
            asyncio.to_thread(
                handler._handle_open_profile, {"profileName": profile_name}
            ),
            timeout=15.0,
        )

        return result

    except asyncio.TimeoutError:
        logger.error(f"Console URL generation timed out for {profile_name}")
        return {
            "action": "error",
            "message": f"Console URL generation timed out for {profile_name}",
        }
    except Exception as e:
        logger.exception(f"Error generating console URL for {profile_name}")
        return {"action": "error", "message": f"Failed to generate console URL: {e!s}"}
