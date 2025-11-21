"""Region-related API routes."""

import logging
from functools import lru_cache

import boto3
from fastapi import APIRouter, Header, Request

from ..auth.authenticator import Authenticator

logger = logging.getLogger(__name__)

router = APIRouter()
authenticator: Authenticator | None = None


def set_authenticator(auth: Authenticator) -> None:
    """Set the authenticator instance."""
    global authenticator
    authenticator = auth


@lru_cache(maxsize=1)
def get_aws_regions() -> list[dict[str, str]]:
    """Fetch all AWS regions from EC2 service.
    
    Returns:
        List of region dictionaries with 'code' and 'name' keys
    """
    try:
        ec2 = boto3.client('ec2', region_name='us-east-1')
        response = ec2.describe_regions(AllRegions=False)
        
        regions = []
        for region in response['Regions']:
            region_code = region['RegionName']
            # Use endpoint as fallback name
            region_name = region.get('RegionName', region_code)
            regions.append({
                'code': region_code,
                'name': region_name
            })
        
        # Sort by region code
        regions.sort(key=lambda x: x['code'])
        return regions
    except Exception as e:
        logger.error(f"Failed to fetch AWS regions: {e}")
        # Return empty list on error
        return []


@router.get("/regions")
@router.options("/regions")
async def list_regions(request: Request, x_api_token: str | None = Header(None, alias="X-API-Token")):
    """Get list of all AWS regions."""
    if request.method == "OPTIONS":
        return {}
    
    authenticator.authenticate(x_api_token)
    
    try:
        regions = get_aws_regions()
        return {"regions": regions}
    except Exception as e:
        logger.exception("Error fetching regions")
        return {"action": "error", "message": f"Failed to fetch regions: {e!s}"}
