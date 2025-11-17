#!/usr/bin/env python3
"""
AWS Configuration File Parsers

Provides parsers for AWS credentials and config files following DRY principles.
All parsers share common INI-style parsing logic.
"""

import re
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from abc import ABC, abstractmethod

from ..utils.logger import timer, log_operation, log_result, log_error


class FileCache:
    """Simple file-based cache using mtime for invalidation."""

    def __init__(self):
        self._cache: Dict[Path, Tuple[float, any]] = {}

    def get(self, file_path: Path) -> Optional[any]:
        """Get cached data if file hasn't been modified."""
        if not file_path.exists():
            return None

        current_mtime = file_path.stat().st_mtime
        if file_path in self._cache:
            cached_mtime, cached_data = self._cache[file_path]
            if cached_mtime == current_mtime:
                return cached_data

        return None

    def set(self, file_path: Path, data: any):
        """Cache data with file's current mtime."""
        if file_path.exists():
            mtime = file_path.stat().st_mtime
            self._cache[file_path] = (mtime, data)

    def clear(self):
        """Clear all cached data."""
        self._cache.clear()


class INIFileParser(ABC):
    """Base parser for INI-style AWS configuration files (DRY principle)."""

    def __init__(self, file_path: Path, cache: Optional[FileCache] = None):
        self.file_path = file_path
        self.cache = cache or FileCache()

    @timer()
    def parse(self) -> List[Dict]:
        """Parse file with caching support."""
        # Check cache first
        cached_data = self.cache.get(self.file_path)
        if cached_data is not None:
            log_result(
                f"Using cached data for {self.file_path.name} ({len(cached_data)} profiles)"
            )
            return cached_data

        # Parse file
        if not self.file_path.exists():
            log_result(f"File not found: {self.file_path}")
            return []

        log_operation(f"Parsing {self.file_path.name}")
        profiles = self._parse_file()
        log_result(f"Parsed {len(profiles)} profiles from {self.file_path.name}")

        # Cache results
        self.cache.set(self.file_path, profiles)

        return profiles

    def _parse_file(self) -> List[Dict]:
        """Parse the INI file into profile dictionaries."""
        profiles = []
        current_profile = None
        profile_data = {}

        with open(self.file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()

                # Check for section header
                if self._is_section_header(line):
                    # Save previous profile
                    if current_profile and self._should_include_profile(profile_data):
                        profiles.append(profile_data)

                    # Start new profile
                    current_profile = self._extract_profile_name(line)
                    profile_data = self._create_profile_data(current_profile)

                # Parse profile content
                elif current_profile:
                    profile_data = self._parse_line(line, profile_data)

        # Save last profile
        if current_profile and self._should_include_profile(profile_data):
            profiles.append(profile_data)

        return profiles

    @staticmethod
    def _is_section_header(line: str) -> bool:
        """Check if line is a section header [...]."""
        return line.startswith("[") and line.endswith("]")

    @abstractmethod
    def _extract_profile_name(self, header: str) -> str:
        """Extract profile name from header line."""
        pass

    @abstractmethod
    def _create_profile_data(self, profile_name: str) -> Dict:
        """Create initial profile data structure."""
        pass

    @abstractmethod
    def _parse_line(self, line: str, profile_data: Dict) -> Dict:
        """Parse a line and update profile data."""
        pass

    def _should_include_profile(self, profile_data: Dict) -> bool:
        """Determine if profile should be included in results."""
        return True


class CredentialsFileParser(INIFileParser):
    """Parser for ~/.aws/credentials file."""

    def _extract_profile_name(self, header: str) -> str:
        """Extract profile name from [profile-name]."""
        return header[1:-1]

    def _create_profile_data(self, profile_name: str) -> Dict:
        """Create initial credentials profile data."""
        return {
            "name": profile_name,
            "has_credentials": False,
            "expiration": None,
            "expired": False,
        }

    def _parse_line(self, line: str, profile_data: Dict) -> Dict:
        """Parse credentials file line."""
        # Parse expiration comment
        if line.startswith("#") and "Expires" in line:
            expiration = self._parse_expiration(line)
            if expiration:
                log_operation(
                    f"  → Found expiration: {expiration['expiration']} (expired={expiration['expired']})"
                )
                profile_data["expiration"] = expiration["expiration"]
                profile_data["expired"] = expiration["expired"]

        # Check for credentials
        elif "=" in line:
            key, value = line.split("=", 1)
            key = key.strip()
            if key in [
                "aws_access_key_id",
                "aws_secret_access_key",
                "aws_session_token",
            ]:
                if not profile_data["has_credentials"]:
                    log_operation(f"  → Found credential key: {key}")
                profile_data["has_credentials"] = True

        return profile_data

    @staticmethod
    def _parse_expiration(comment: str) -> Optional[Dict]:
        """Parse expiration timestamp from comment."""
        # Format: # Expires 2024-11-10 15:30:00 UTC
        match = re.search(r"Expires\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})", comment)
        if match:
            try:
                exp_time = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M:%S")
                exp_time = exp_time.replace(tzinfo=timezone.utc)
                return {
                    "expiration": exp_time.isoformat(),
                    "expired": exp_time < datetime.now(timezone.utc),
                }
            except ValueError:
                pass
        return None


class ConfigFileParser(INIFileParser):
    """Parser for ~/.aws/config file."""

    def _extract_profile_name(self, header: str) -> str:
        """Extract profile name from [profile name] or [default]."""
        profile_name = header[1:-1]
        # Strip 'profile ' prefix if present
        if profile_name.startswith("profile "):
            profile_name = profile_name[8:]
        return profile_name

    def _create_profile_data(self, profile_name: str) -> Dict:
        """Create initial config profile data."""
        return {
            "name": profile_name,
            "has_credentials": False,
            "expiration": None,
            "expired": False,
            "is_sso": False,
        }

    def _parse_line(self, line: str, profile_data: Dict) -> Dict:
        """Parse config file line."""
        if "=" not in line:
            return profile_data

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        # Parse SSO configuration
        if key == "sso_start_url":
            log_operation(f"  → Found SSO marker: sso_start_url = {value}")
            profile_data["is_sso"] = True
            profile_data["sso_start_url"] = value
        elif key == "sso_session":
            log_operation(f"  → Found SSO marker: sso_session = {value}")
            profile_data["is_sso"] = True
            profile_data["sso_session"] = value
        elif key == "sso_region":
            log_operation(f"  → Found SSO field: sso_region = {value}")
            profile_data["sso_region"] = value
        elif key == "sso_account_id":
            log_operation(f"  → Found SSO field: sso_account_id = {value}")
            profile_data["sso_account_id"] = value
        elif key == "sso_role_name":
            log_operation(f"  → Found SSO field: sso_role_name = {value}")
            profile_data["sso_role_name"] = value
        elif key == "region":
            log_operation(f"  → Found region: {value}")
            profile_data["aws_region"] = value

        return profile_data

    def _should_include_profile(self, profile_data: Dict) -> bool:
        """Only include SSO profiles."""
        is_sso = profile_data.get("is_sso", False)
        if is_sso:
            log_result(f"  ✓ Including SSO profile: {profile_data['name']}")
        else:
            log_operation(f"  → Skipping non-SSO profile: {profile_data['name']}")
        return is_sso


class ProfileConfigReader:
    """Reads individual profile configuration from AWS files."""

    def __init__(self, credentials_file: Path, config_file: Path):
        self.credentials_file = credentials_file
        self.config_file = config_file

    @timer()
    def get_credentials(self, profile_name: str) -> Optional[Dict[str, str]]:
        """Extract credentials for a specific profile."""
        if not self.credentials_file.exists():
            log_result(
                f"Credentials file not found for profile: {profile_name}", success=False
            )
            return None

        log_operation(f"Reading credentials for profile: {profile_name}")
        credentials = {}
        in_profile = False

        with open(self.credentials_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()

                # Check if we're in the target profile
                if line == f"[{profile_name}]":
                    in_profile = True
                    continue

                # Check if we've moved to another profile
                if line.startswith("[") and line.endswith("]"):
                    if in_profile:
                        break
                    in_profile = False
                    continue

                # Parse credentials
                if in_profile and "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip()
                    if key in [
                        "aws_access_key_id",
                        "aws_secret_access_key",
                        "aws_session_token",
                    ]:
                        credentials[key] = value

        if credentials:
            log_result(f"Found credentials for profile: {profile_name}")
        else:
            log_result(
                f"No credentials found for profile: {profile_name}", success=False
            )

        return credentials if credentials else None

    @timer()
    def get_config(self, profile_name: str) -> Optional[Dict[str, str]]:
        """Get profile configuration from config file."""
        if not self.config_file.exists():
            log_result(
                f"Config file not found for profile: {profile_name}", success=False
            )
            return None

        log_operation(f"Reading config for profile: {profile_name}")
        profile_config = {}
        in_profile = False

        with open(self.config_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()

                # Check profile headers
                if line.startswith("[") and line.endswith("]"):
                    current = line[1:-1]
                    if current.startswith("profile "):
                        current = current[8:]

                    if current == profile_name:
                        in_profile = True
                        log_operation(f"  → Found profile section [{current}]")
                        continue
                    elif in_profile:
                        break
                    in_profile = False
                    continue

                # Parse config
                if in_profile and "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip()
                    profile_config[key] = value

                    # Log SSO-specific keys
                    if key.startswith("sso_"):
                        log_operation(f"    • {key} = {value}")

        if profile_config:
            log_result(
                f"Found config for profile: {profile_name} ({len(profile_config)} keys)"
            )
        else:
            log_result(f"No config found for profile: {profile_name}", success=False)

        return profile_config if profile_config else None
