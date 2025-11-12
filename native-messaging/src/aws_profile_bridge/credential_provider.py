#!/usr/bin/env python3
"""
AWS Credential Provider

Orchestrates credential retrieval from multiple sources.
Follows Single Responsibility Principle.
"""

from pathlib import Path
from typing import Optional, Dict, List

try:
    import boto3
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

from .debug_logger import timer, log_operation, log_result
from .file_parsers import (
    CredentialsFileParser,
    ConfigFileParser,
    ProfileConfigReader,
    FileCache
)
from .sso_manager import SSOCredentialsProvider, SSOProfileEnricher


class CredentialProvider:
    """
    Provides credentials for AWS profiles from multiple sources.

    Supports:
    - Static credentials from ~/.aws/credentials
    - SSO credentials from ~/.aws/sso/cache
    """

    def __init__(
        self,
        credentials_file: Path,
        config_file: Path,
        sso_credentials_provider: SSOCredentialsProvider,
        config_reader: ProfileConfigReader
    ):
        self.credentials_file = credentials_file
        self.config_file = config_file
        self.sso_credentials_provider = sso_credentials_provider
        self.config_reader = config_reader

    def get_credentials(self, profile_name: str) -> Optional[Dict[str, str]]:
        """
        Get credentials for a profile from any available source.

        Returns:
            Dict with aws_access_key_id, aws_secret_access_key, optionally aws_session_token
        """
        # Try credentials file first
        credentials = self.config_reader.get_credentials(profile_name)
        if credentials:
            return credentials

        # Try SSO profile
        profile_config = self.config_reader.get_config(profile_name)
        if profile_config and profile_config.get('sso_start_url'):
            return self.sso_credentials_provider.get_credentials(profile_config)

        return None


class ProfileAggregator:
    """
    Aggregates profiles from all AWS configuration sources.

    Uses boto3 when available for better profile discovery,
    falls back to manual parsing.
    """

    def __init__(
        self,
        credentials_parser: CredentialsFileParser,
        config_parser: ConfigFileParser,
        sso_enricher: SSOProfileEnricher,
        config_reader: ProfileConfigReader
    ):
        self.credentials_parser = credentials_parser
        self.config_parser = config_parser
        self.sso_enricher = sso_enricher
        self.config_reader = config_reader

    @timer("get_all_profiles")
    def get_all_profiles(self, skip_sso_enrichment: bool = True) -> List[Dict]:
        """
        Get all profiles from both credentials and config files.

        Args:
            skip_sso_enrichment: If True, skip SSO token validation (faster).
                                If False, check SSO token expiration (slower).
        """
        log_operation(f"Getting all profiles (skip_sso_enrichment={skip_sso_enrichment})")

        if BOTO3_AVAILABLE:
            log_operation("Using boto3 for profile enumeration")
            result = self._get_profiles_with_boto3(skip_sso_enrichment)
        else:
            log_operation("Using manual parsing for profile enumeration (boto3 not available)")
            result = self._get_profiles_manual(skip_sso_enrichment)

        log_result(f"Retrieved {len(result)} profiles")
        return result

    def _get_profiles_with_boto3(self, skip_sso_enrichment: bool = True) -> List[Dict]:
        """Use boto3 to enumerate profiles (faster and more reliable)."""
        try:
            available_profiles = boto3.Session().available_profiles
            profiles = []

            for profile_name in available_profiles:
                profile = self._build_profile_info(profile_name, skip_sso_enrichment)
                if profile:
                    profiles.append(profile)

            return profiles

        except Exception:
            # Fall back to manual parsing
            return self._get_profiles_manual(skip_sso_enrichment)

    def _build_profile_info(self, profile_name: str, skip_sso_enrichment: bool = True) -> Optional[Dict]:
        """Build profile information for a single profile."""
        try:
            profile_data = {
                'name': profile_name,
                'has_credentials': False,
                'expiration': None,
                'expired': False,
                'is_sso': False
            }

            # Check if this is an SSO profile
            profile_config = self.config_reader.get_config(profile_name)
            if profile_config and (profile_config.get('sso_start_url') or profile_config.get('sso_session')):
                profile_data['is_sso'] = True
                if 'sso_start_url' in profile_config:
                    profile_data['sso_start_url'] = profile_config['sso_start_url']
                if 'sso_session' in profile_config:
                    profile_data['sso_session'] = profile_config['sso_session']
                profile_data['sso_region'] = profile_config.get('sso_region', 'us-east-1')
                profile_data['sso_account_id'] = profile_config.get('sso_account_id')
                profile_data['sso_role_name'] = profile_config.get('sso_role_name')
                profile_data['aws_region'] = profile_config.get('region')

                # Optionally enrich with SSO token info (slow operation)
                if not skip_sso_enrichment:
                    profile_data = self.sso_enricher.enrich_profile(profile_data)
            else:
                # Check credentials file
                cred_profiles = {p['name']: p for p in self.credentials_parser.parse()}
                if profile_name in cred_profiles:
                    cred_profile = cred_profiles[profile_name]
                    profile_data['has_credentials'] = cred_profile.get('has_credentials', False)
                    profile_data['expiration'] = cred_profile.get('expiration')
                    profile_data['expired'] = cred_profile.get('expired', False)

            return profile_data

        except Exception:
            return None

    def _get_profiles_manual(self, skip_sso_enrichment: bool = True) -> List[Dict]:
        """Manual parsing when boto3 is not available."""
        cred_profiles = self.credentials_parser.parse()
        sso_profiles = self.config_parser.parse()

        # Optionally enrich SSO profiles with token info (slow operation)
        if not skip_sso_enrichment:
            for profile in sso_profiles:
                self.sso_enricher.enrich_profile(profile)

        # Merge profiles (SSO profiles take precedence)
        all_profiles = {}
        for profile in cred_profiles:
            all_profiles[profile['name']] = profile
        for profile in sso_profiles:
            all_profiles[profile['name']] = profile

        return list(all_profiles.values())
