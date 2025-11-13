#!/usr/bin/env python3
"""
Profile Cache Manager using TinyDB

Provides fast profile access by caching profile data locally.
Enables instant popup loading while keeping data fresh in the background.
"""

from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import json

try:
    from tinydb import TinyDB, Query
    TINYDB_AVAILABLE = True
except ImportError:
    TINYDB_AVAILABLE = False

from .debug_logger import log_operation, log_result, log_error, timer


class ProfileCache:
    """
    Manages profile caching using TinyDB.

    Cache structure:
    - profiles: List of profile dictionaries
    - timestamp: ISO timestamp of last update
    - version: Cache format version
    """

    CACHE_VERSION = "1.0"
    DEFAULT_TTL = timedelta(minutes=5)  # Cache expires after 5 minutes

    def __init__(self, cache_file: Optional[Path] = None):
        """
        Initialize profile cache.

        Args:
            cache_file: Path to cache file (default: ~/.aws/profile_cache.json)
        """
        if cache_file is None:
            cache_file = Path.home() / '.aws' / 'profile_cache.json'

        self.cache_file = cache_file
        self._ensure_cache_dir()

        if TINYDB_AVAILABLE:
            self.db = TinyDB(str(cache_file))
            self.enabled = True
        else:
            log_result("TinyDB not available - caching disabled", success=False)
            self.db = None
            self.enabled = False

    def _ensure_cache_dir(self):
        """Ensure cache directory exists with proper permissions."""
        try:
            cache_dir = self.cache_file.parent
            cache_dir.mkdir(parents=True, exist_ok=True)

            # Set secure permissions (user only)
            try:
                import os
                os.chmod(cache_dir, 0o700)
            except Exception:
                pass  # Best effort

        except Exception as e:
            log_error(e, "Failed to create cache directory")

    @timer("get_cached_profiles")
    def get_cached_profiles(self) -> Optional[List[Dict]]:
        """
        Get profiles from cache if available and not expired.

        Returns:
            List of profile dictionaries if cache is valid, None otherwise
        """
        if not self.enabled:
            log_result("Cache disabled - TinyDB not available", success=False)
            return None

        try:
            log_operation("Reading from profile cache")

            # Get cache entry
            cache_table = self.db.table('cache')
            all_entries = cache_table.all()

            if not all_entries:
                log_result("Cache empty", success=False)
                return None

            # Get most recent entry (should only be one)
            cache_entry = all_entries[0]

            # Validate cache structure
            if 'version' not in cache_entry or cache_entry['version'] != self.CACHE_VERSION:
                log_result("Cache version mismatch - invalidating", success=False)
                cache_table.truncate()
                return None

            if 'profiles' not in cache_entry or 'timestamp' not in cache_entry:
                log_result("Invalid cache structure", success=False)
                cache_table.truncate()
                return None

            # Check cache age
            try:
                cache_time = datetime.fromisoformat(cache_entry['timestamp'])
                age = datetime.now(timezone.utc) - cache_time

                log_operation(f"Cache age: {age.total_seconds():.1f}s")

                if age > self.DEFAULT_TTL:
                    log_result(f"Cache expired (age: {age}, ttl: {self.DEFAULT_TTL})", success=False)
                    return None

            except (ValueError, TypeError) as e:
                log_error(e, "Failed to parse cache timestamp")
                return None

            profiles = cache_entry['profiles']
            log_result(f"Retrieved {len(profiles)} profiles from cache (age: {age.total_seconds():.1f}s)")

            return profiles

        except Exception as e:
            log_error(e, "Failed to read from cache")
            return None

    @timer("update_cache")
    def update_cache(self, profiles: List[Dict]) -> bool:
        """
        Update cache with new profile data.

        Args:
            profiles: List of profile dictionaries to cache

        Returns:
            True if cache updated successfully, False otherwise
        """
        if not self.enabled:
            log_result("Cache disabled - TinyDB not available", success=False)
            return False

        try:
            log_operation(f"Updating cache with {len(profiles)} profiles")

            cache_entry = {
                'version': self.CACHE_VERSION,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'profiles': profiles,
                'profile_count': len(profiles)
            }

            # Clear old cache and insert new
            cache_table = self.db.table('cache')
            cache_table.truncate()
            cache_table.insert(cache_entry)

            log_result(f"Cache updated successfully ({len(profiles)} profiles)")
            return True

        except Exception as e:
            log_error(e, "Failed to update cache")
            return False

    def clear_cache(self) -> bool:
        """
        Clear all cached data.

        Returns:
            True if cache cleared successfully, False otherwise
        """
        if not self.enabled:
            return False

        try:
            log_operation("Clearing profile cache")
            cache_table = self.db.table('cache')
            cache_table.truncate()
            log_result("Cache cleared")
            return True

        except Exception as e:
            log_error(e, "Failed to clear cache")
            return False

    def get_cache_info(self) -> Dict:
        """
        Get information about the cache.

        Returns:
            Dictionary with cache info (enabled, file, age, profile_count, etc.)
        """
        info = {
            'enabled': self.enabled,
            'cache_file': str(self.cache_file) if self.cache_file else None,
            'tinydb_available': TINYDB_AVAILABLE
        }

        if not self.enabled:
            return info

        try:
            cache_table = self.db.table('cache')
            all_entries = cache_table.all()

            if all_entries:
                cache_entry = all_entries[0]
                cache_time = datetime.fromisoformat(cache_entry['timestamp'])
                age = datetime.now(timezone.utc) - cache_time

                info.update({
                    'has_cache': True,
                    'timestamp': cache_entry['timestamp'],
                    'age_seconds': age.total_seconds(),
                    'profile_count': cache_entry.get('profile_count', 0),
                    'version': cache_entry.get('version'),
                    'expired': age > self.DEFAULT_TTL
                })
            else:
                info['has_cache'] = False

        except Exception as e:
            info['error'] = str(e)

        return info

    def __del__(self):
        """Clean up database connection."""
        if self.db is not None:
            try:
                self.db.close()
            except Exception:
                pass  # Ignore cleanup errors
