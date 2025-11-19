#!/usr/bin/env python3
"""
Console URL Cache

In-memory cache for AWS console URLs to prevent regeneration and tab logouts.
Uses TinyDB with in-memory storage.
"""

import time
from datetime import datetime
from typing import Dict, Optional

from tinydb import Query, TinyDB
from tinydb.storages import MemoryStorage


class ConsoleURLCache:
    """
    Caches console URLs with credential expiration tracking.
    
    Prevents:
    - Unnecessary regeneration of federation URLs
    - Tab logouts when credentials haven't changed
    - Using cached URLs when credentials have expired
    """

    def __init__(self, default_ttl: int = 43200):  # 12 hours
        """
        Initialize in-memory cache.
        
        Args:
            default_ttl: Time-to-live in seconds (default: 12 hours)
        """
        self.db = TinyDB(storage=MemoryStorage)
        self.default_ttl = default_ttl

    def get(self, profile_name: str, current_expiry: Optional[datetime] = None) -> Optional[str]:
        """
        Get cached console URL if still valid.
        
        Args:
            profile_name: AWS profile name
            current_expiry: Current credential expiry time (if available)
            
        Returns:
            Console URL if cached and valid, None otherwise
        """
        Profile = Query()
        result = self.db.search(Profile.name == profile_name)
        
        if not result:
            return None
            
        entry = result[0]
        
        # Check if credentials changed (different expiry time)
        if current_expiry and entry.get("credential_expiry"):
            cached_expiry = datetime.fromisoformat(entry["credential_expiry"])
            if cached_expiry != current_expiry:
                self.db.remove(Profile.name == profile_name)
                return None
        
        # Check if expired
        if time.time() > entry["expires_at"]:
            self.db.remove(Profile.name == profile_name)
            return None
            
        return entry["url"]

    def set(self, profile_name: str, url: str, credential_expiry: Optional[datetime] = None) -> None:
        """
        Cache console URL with expiration.
        
        Args:
            profile_name: AWS profile name
            url: Console URL to cache
            credential_expiry: Credential expiry time (if available)
        """
        Profile = Query()
        
        # Use credential expiry if available, otherwise use default TTL
        if credential_expiry:
            expires_at = credential_expiry.timestamp()
        else:
            expires_at = time.time() + self.default_ttl
        
        # Upsert entry
        self.db.upsert(
            {
                "name": profile_name,
                "url": url,
                "expires_at": expires_at,
                "cached_at": time.time(),
                "credential_expiry": credential_expiry.isoformat() if credential_expiry else None,
            },
            Profile.name == profile_name,
        )

    def invalidate(self, profile_name: str) -> None:
        """
        Invalidate cached URL for a profile.
        
        Args:
            profile_name: AWS profile name
        """
        Profile = Query()
        self.db.remove(Profile.name == profile_name)

    def clear(self) -> None:
        """Clear all cached URLs."""
        self.db.truncate()

    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        now = time.time()
        all_entries = self.db.all()
        
        valid = sum(1 for e in all_entries if e["expires_at"] > now)
        expired = len(all_entries) - valid
        
        return {
            "total": len(all_entries),
            "valid": valid,
            "expired": expired,
        }
