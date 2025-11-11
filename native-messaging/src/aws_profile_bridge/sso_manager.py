#!/usr/bin/env python3
"""
AWS SSO Token and Credential Manager

Handles SSO token caching and retrieval of temporary credentials.
Follows Single Responsibility Principle.
"""

import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict
import urllib.request as request

# Constants
DEFAULT_CACHE_TTL_SECONDS = 30  # In-memory cache TTL for SSO tokens


class SSOTokenCache:
    """Manages caching of SSO tokens (file and memory)."""

    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self._memory_cache: Dict[str, tuple] = {}
        self._cache_ttl_seconds = DEFAULT_CACHE_TTL_SECONDS

    def get_token(self, start_url: str) -> Optional[Dict]:
        """Get cached SSO token for a given start URL."""
        # Check memory cache first
        token = self._get_from_memory(start_url)
        if token:
            return token

        # Check file cache
        token = self._get_from_file(start_url)
        if token:
            self._save_to_memory(start_url, token)
            return token

        return None

    def _get_from_memory(self, start_url: str) -> Optional[Dict]:
        """Get token from in-memory cache."""
        if start_url not in self._memory_cache:
            return None

        cached_token, cache_time = self._memory_cache[start_url]

        # Check if cache is still fresh
        age_seconds = (datetime.now(timezone.utc) - cache_time).total_seconds()
        if age_seconds >= self._cache_ttl_seconds:
            del self._memory_cache[start_url]
            return None

        # Check if token is expired
        if not self._is_token_valid(cached_token):
            del self._memory_cache[start_url]
            return None

        return cached_token

    def _get_from_file(self, start_url: str) -> Optional[Dict]:
        """Get token from file cache."""
        if not self.cache_dir.exists():
            return None

        # Try hashed filename first (fast path)
        token = self._get_by_hash(start_url)
        if token:
            return token

        # Fallback: search all cache files (slow path)
        return self._search_cache_files(start_url)

    def _get_by_hash(self, start_url: str) -> Optional[Dict]:
        """Get token by SHA1 hash of start URL."""
        cache_key = hashlib.sha1(start_url.encode('utf-8')).hexdigest()
        cache_file = self.cache_dir / f"{cache_key}.json"

        if not cache_file.exists():
            return None

        try:
            with open(cache_file, 'r') as f:
                token_data = json.load(f)
                if self._is_token_valid(token_data):
                    return token_data
        except Exception:
            pass

        return None

    def _search_cache_files(self, start_url: str) -> Optional[Dict]:
        """Search all cache files for matching start URL."""
        cache_files = list(self.cache_dir.glob('*.json'))

        for cache_file_path in cache_files:
            try:
                with open(cache_file_path, 'r') as f:
                    token_data = json.load(f)
                    if token_data.get('startUrl') == start_url:
                        if self._is_token_valid(token_data):
                            return token_data
            except Exception:
                continue

        return None

    @staticmethod
    def _is_token_valid(token_data: Dict) -> bool:
        """Check if token is not expired."""
        if 'expiresAt' not in token_data:
            return False

        expires_at = datetime.fromisoformat(
            token_data['expiresAt'].replace('Z', '+00:00')
        )
        return expires_at > datetime.now(timezone.utc)

    def _save_to_memory(self, start_url: str, token: Dict):
        """Save token to memory cache."""
        self._memory_cache[start_url] = (token, datetime.now(timezone.utc))

    def clear(self):
        """Clear memory cache."""
        self._memory_cache.clear()


class SSOCredentialsProvider:
    """Retrieves temporary credentials for SSO profiles."""

    def __init__(self, token_cache: SSOTokenCache):
        self.token_cache = token_cache

    def get_credentials(self, profile_config: Dict) -> Optional[Dict[str, str]]:
        """
        Get temporary credentials for an SSO profile.

        Args:
            profile_config: Dict with sso_start_url, sso_region, sso_account_id, sso_role_name

        Returns:
            Dict with aws_access_key_id, aws_secret_access_key, aws_session_token, expiration
        """
        # Validate required fields
        validation_error = self._validate_profile_config(profile_config)
        if validation_error:
            return None

        # Get SSO token
        sso_start_url = profile_config['sso_start_url']
        token_data = self.token_cache.get_token(sso_start_url)

        if not token_data or 'accessToken' not in token_data:
            return None

        # Fetch role credentials from AWS SSO API
        return self._fetch_role_credentials(
            access_token=token_data['accessToken'],
            sso_region=profile_config.get('sso_region', 'us-east-1'),
            account_id=profile_config['sso_account_id'],
            role_name=profile_config['sso_role_name']
        )

    @staticmethod
    def _validate_profile_config(profile_config: Dict) -> Optional[str]:
        """Validate that profile has required SSO fields."""
        if not profile_config.get('sso_start_url'):
            return "SSO profile missing sso_start_url"

        if not profile_config.get('sso_account_id'):
            return "SSO profile missing sso_account_id"

        if not profile_config.get('sso_role_name'):
            return "SSO profile missing sso_role_name"

        return None

    def _fetch_role_credentials(
        self,
        access_token: str,
        sso_region: str,
        account_id: str,
        role_name: str
    ) -> Optional[Dict[str, str]]:
        """
        Fetch role credentials from AWS SSO API.

        SECURITY: Sends access token to official AWS SSO endpoint.
        """
        try:
            api_url = f"https://portal.sso.{sso_region}.amazonaws.com/federation/credentials"
            api_url += f"?account_id={account_id}&role_name={role_name}"

            api_request = request.Request(
                api_url,
                headers={'x-amz-sso_bearer_token': access_token}
            )

            with request.urlopen(api_request, timeout=10) as response:
                if response.status != 200:
                    return None

                creds = json.loads(response.read())
                return self._format_credentials(creds['roleCredentials'])

        except Exception:
            return None

    @staticmethod
    def _format_credentials(role_creds: Dict) -> Dict[str, str]:
        """Format AWS SSO credentials to standard format."""
        return {
            'aws_access_key_id': role_creds['accessKeyId'],
            'aws_secret_access_key': role_creds['secretAccessKey'],
            'aws_session_token': role_creds['sessionToken'],
            'expiration': datetime.fromtimestamp(
                role_creds['expiration'] / 1000,
                tz=timezone.utc
            ).isoformat()
        }


class SSOProfileEnricher:
    """Enriches SSO profiles with token expiration info."""

    def __init__(self, token_cache: SSOTokenCache):
        self.token_cache = token_cache

    def enrich_profile(self, profile: Dict) -> Dict:
        """Add SSO token expiration info to profile."""
        if not profile.get('is_sso') or not profile.get('sso_start_url'):
            return profile

        token = self.token_cache.get_token(profile['sso_start_url'])

        if token and 'expiresAt' in token:
            expires_at = datetime.fromisoformat(
                token['expiresAt'].replace('Z', '+00:00')
            )
            profile['expiration'] = expires_at.isoformat()
            profile['expired'] = expires_at < datetime.now(timezone.utc)
            profile['has_credentials'] = not profile['expired']
        else:
            profile['expired'] = True
            profile['has_credentials'] = False

        return profile
