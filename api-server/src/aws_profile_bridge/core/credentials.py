#!/usr/bin/env python3
"""
AWS Credential Provider

Orchestrates credential retrieval from multiple sources.
Follows Single Responsibility Principle.
"""

from pathlib import Path
from typing import Dict, List, Optional

try:
    import boto3

    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

from ..services.sso import SSOCredentialsProvider, SSOProfileEnricher
from ..utils.logger import log_error, log_operation, log_result, timer
from .parsers import (
    ConfigFileParser,
    CredentialsFileParser,
    FileCache,
    ProfileConfigReader,
)


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
        config_reader: ProfileConfigReader,
    ):
        self.credentials_file = credentials_file
        self.config_file = config_file
        self.sso_credentials_provider = sso_credentials_provider
        self.config_reader = config_reader

    def get_credentials(self, profile_name: str) -> Optional[Dict[str, str]]:
        """
        Get credentials for a profile from any available source.

        Returns:
            Dict with aws_access_key_id, aws_secret_access_key, optionally aws_session_token,
            and expiry_time if available
        """
        # Use boto3 if available (handles SSO automatically)
        if BOTO3_AVAILABLE:
            try:
                session = boto3.Session(profile_name=profile_name)
                credentials = session.get_credentials()

                if credentials:
                    result = {
                        "aws_access_key_id": credentials.access_key,
                        "aws_secret_access_key": credentials.secret_key,
                    }
                    if credentials.token:
                        result["aws_session_token"] = credentials.token
                    
                    # Get expiry time if available
                    if hasattr(credentials, '_expiry_time'):
                        result["expiry_time"] = credentials._expiry_time
                    
                    return result
            except Exception:
                pass

        # Fallback: Try credentials file
        credentials = self.config_reader.get_credentials(profile_name)
        if credentials:
            return credentials

        # Fallback: Try SSO profile manually
        profile_config = self.config_reader.get_config(profile_name)
        if profile_config and profile_config.get("sso_start_url"):
            return self.sso_credentials_provider.get_credentials(profile_config)

        return None


class ProfileAggregator:
    """
    Aggregates profiles from all AWS configuration sources.

    Uses boto3 when available for better profile discovery,
    falls back to manual parsing.

    Supports ~/.aws/.nosso file to disable SSO profile enumeration.
    """

    def __init__(
        self,
        credentials_parser: CredentialsFileParser,
        config_parser: ConfigFileParser,
        sso_enricher: SSOProfileEnricher,
        config_reader: ProfileConfigReader,
        aws_dir: Path,
    ):
        self.credentials_parser = credentials_parser
        self.config_parser = config_parser
        self.sso_enricher = sso_enricher
        self.config_reader = config_reader
        self.aws_dir = aws_dir
        self.nosso_file = aws_dir / ".nosso"

    def _should_skip_sso_profiles(self) -> bool:
        """
        Check if SSO profiles should be skipped.

        Returns True if ~/.aws/.nosso file exists, indicating that
        SSO profiles should not be enumerated.
        """
        skip = self.nosso_file.exists()
        if skip:
            log_operation("Found ~/.aws/.nosso file - skipping all SSO profiles")
        return skip

    @timer("get_all_profiles")
    def get_all_profiles(self, skip_sso_enrichment: bool = True) -> List[Dict]:
        """
        Get all profiles from both credentials and config files.

        Args:
            skip_sso_enrichment: If True, skip SSO token validation (faster).
                                If False, check SSO token expiration (slower).
        """
        log_operation(
            f"Getting all profiles (skip_sso_enrichment={skip_sso_enrichment})"
        )

        # Check and log .nosso file status
        if self.nosso_file.exists():
            log_result(
                f"⚠️  ~/.aws/.nosso file detected - SSO profiles will be DISABLED"
            )

        if BOTO3_AVAILABLE:
            log_operation("Using boto3 for profile enumeration")
            result = self._get_profiles_with_boto3(skip_sso_enrichment)
        else:
            log_operation(
                "Using manual parsing for profile enumeration (boto3 not available)"
            )
            result = self._get_profiles_manual(skip_sso_enrichment)

        log_result(f"Retrieved {len(result)} profiles")
        return result

    def _get_profiles_with_boto3(self, skip_sso_enrichment: bool = True) -> List[Dict]:
        """Use boto3 to enumerate profiles (faster and more reliable)."""
        try:
            # Check if SSO profiles should be skipped BEFORE enumerating
            skip_sso = self._should_skip_sso_profiles()

            available_profiles = boto3.Session().available_profiles
            log_operation(
                f"Boto3 found {len(available_profiles)} profiles: {', '.join(available_profiles)}"
            )
            profiles = []

            for profile_name in available_profiles:
                profile = self._build_profile_info(profile_name, skip_sso_enrichment)
                if profile:
                    profiles.append(profile)

            # Summary of classifications
            sso_profiles = [p["name"] for p in profiles if p.get("is_sso")]
            cred_profiles = [p["name"] for p in profiles if not p.get("is_sso")]

            log_result(f"Profile classification summary:")
            log_operation(
                f"  • SSO profiles ({len(sso_profiles)}): {', '.join(sso_profiles) if sso_profiles else 'none'}"
            )
            log_operation(
                f"  • Credential profiles ({len(cred_profiles)}): {', '.join(cred_profiles) if cred_profiles else 'none'}"
            )

            return profiles

        except Exception as e:
            log_error(e, "Failed to get profiles with boto3")
            # Fall back to manual parsing
            return self._get_profiles_manual(skip_sso_enrichment)

    def _build_profile_info(
        self, profile_name: str, skip_sso_enrichment: bool = True
    ) -> Optional[Dict]:
        """Build profile information for a single profile."""
        try:
            log_operation(f"Building profile info for: {profile_name}")

            profile_data = {
                "name": profile_name,
                "has_credentials": False,
                "expiration": None,
                "expired": False,
                "is_sso": False,
            }

            # Check if this is an SSO profile
            log_operation(f"Checking config file for SSO markers")
            profile_config = self.config_reader.get_config(profile_name)

            if profile_config:
                log_operation(
                    f"Found config for {profile_name}",
                    {"config_keys": list(profile_config.keys())},
                )

                # Check for SSO markers
                has_sso_start_url = "sso_start_url" in profile_config
                has_sso_session = "sso_session" in profile_config

                if has_sso_start_url or has_sso_session:
                    # This is an SSO profile - check if we should skip it
                    if self._should_skip_sso_profiles():
                        log_result(
                            f"⊗ SKIPPING SSO profile {profile_name} due to .nosso file"
                        )
                        return None
                    sso_markers = []
                    if has_sso_start_url:
                        sso_markers.append(
                            f"sso_start_url={profile_config['sso_start_url']}"
                        )
                    if has_sso_session:
                        sso_markers.append(
                            f"sso_session={profile_config['sso_session']}"
                        )

                    log_result(
                        f"✓ CLASSIFIED AS SSO - Found markers: {', '.join(sso_markers)}"
                    )

                    profile_data["is_sso"] = True
                    profile_data["has_credentials"] = (
                        True  # boto3 will resolve on-demand
                    )
                    if "sso_start_url" in profile_config:
                        profile_data["sso_start_url"] = profile_config["sso_start_url"]
                    if "sso_session" in profile_config:
                        profile_data["sso_session"] = profile_config["sso_session"]
                    profile_data["sso_region"] = profile_config.get(
                        "sso_region", "us-east-1"
                    )
                    profile_data["sso_account_id"] = profile_config.get(
                        "sso_account_id"
                    )
                    profile_data["sso_role_name"] = profile_config.get("sso_role_name")
                    profile_data["aws_region"] = profile_config.get("region")

                    log_operation(
                        f"SSO profile details",
                        {
                            "sso_region": profile_data["sso_region"],
                            "sso_account_id": profile_data.get(
                                "sso_account_id", "not set"
                            ),
                            "sso_role_name": profile_data.get(
                                "sso_role_name", "not set"
                            ),
                        },
                    )

                    # Optionally enrich with SSO token info (slow operation)
                    if not skip_sso_enrichment:
                        log_operation("Enriching with SSO token info (slow)")
                        profile_data = self.sso_enricher.enrich_profile(profile_data)
                else:
                    log_result(
                        f"Config found but NO SSO markers - checking credentials file"
                    )
                    # Has config but not SSO - check credentials
                    cred_profiles = {
                        p["name"]: p for p in self.credentials_parser.parse()
                    }
                    if profile_name in cred_profiles:
                        cred_profile = cred_profiles[profile_name]
                        has_creds = cred_profile.get("has_credentials", False)
                        if has_creds:
                            log_result(
                                f"✓ CLASSIFIED AS CREDENTIALS - Found in credentials file"
                            )
                        else:
                            log_result(
                                f"Found in credentials file but no actual credentials",
                                success=False,
                            )
                        profile_data["has_credentials"] = has_creds
                        profile_data["expiration"] = cred_profile.get("expiration")
                        profile_data["expired"] = cred_profile.get("expired", False)
                    else:
                        log_result(
                            f"Not found in credentials file - checking if it's role assumption",
                            success=False,
                        )
            else:
                # No config found - must be credentials-only profile
                log_operation(f"No config found - checking credentials file only")
                cred_profiles = {p["name"]: p for p in self.credentials_parser.parse()}
                if profile_name in cred_profiles:
                    cred_profile = cred_profiles[profile_name]
                    has_creds = cred_profile.get("has_credentials", False)
                    if has_creds:
                        log_result(
                            f"✓ CLASSIFIED AS CREDENTIALS - Found only in credentials file (no config)"
                        )
                    else:
                        log_result(
                            f"Found in credentials file but no actual credentials",
                            success=False,
                        )
                    profile_data["has_credentials"] = has_creds
                    profile_data["expiration"] = cred_profile.get("expiration")
                    profile_data["expired"] = cred_profile.get("expired", False)
                else:
                    log_result(f"Profile not found anywhere", success=False)

            log_result(
                f"Final classification: {'SSO' if profile_data['is_sso'] else 'CREDENTIALS'} (has_credentials={profile_data['has_credentials']})"
            )
            return profile_data

        except Exception as e:
            log_error(e, f"Failed to build profile info for {profile_name}")
            return None

    def _get_profiles_manual(self, skip_sso_enrichment: bool = True) -> List[Dict]:
        """Manual parsing when boto3 is not available."""
        cred_profiles = self.credentials_parser.parse()

        # Check if SSO profiles should be skipped
        if self._should_skip_sso_profiles():
            log_result(
                f"Skipping SSO profiles due to .nosso file - returning only credential profiles"
            )
            return cred_profiles

        sso_profiles = self.config_parser.parse()

        # Optionally enrich SSO profiles with token info (slow operation)
        if not skip_sso_enrichment:
            for profile in sso_profiles:
                self.sso_enricher.enrich_profile(profile)

        # Merge profiles (SSO profiles take precedence)
        all_profiles = {}
        for profile in cred_profiles:
            all_profiles[profile["name"]] = profile
        for profile in sso_profiles:
            all_profiles[profile["name"]] = profile

        return list(all_profiles.values())
