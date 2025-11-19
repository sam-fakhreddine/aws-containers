#!/usr/bin/env python3
"""
AWS Profile Metadata Provider

Provides color and icon metadata for profiles.
Uses Strategy pattern (Open/Closed Principle) for extensibility.
"""

from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Dict, List


class MetadataRule(ABC):
    """Base class for profile metadata rules (Strategy pattern)."""

    @abstractmethod
    def matches(self, profile_name: str) -> bool:
        """Check if this rule matches the profile name."""
        pass

    @abstractmethod
    def get_color(self) -> str:
        """Get color for matching profiles."""
        pass

    @abstractmethod
    def get_icon(self) -> str:
        """Get icon for matching profiles."""
        pass


class KeywordMetadataRule(MetadataRule):
    """Rule that matches profiles containing specific keywords."""

    def __init__(self, keywords: List[str], color: str, icon: str):
        self.keywords = [k.lower() for k in keywords]
        self.color = color
        self.icon = icon

    def matches(self, profile_name: str) -> bool:
        """Check if profile name contains any keyword."""
        name_lower = profile_name.lower()
        return any(keyword in name_lower for keyword in self.keywords)

    def get_color(self) -> str:
        return self.color

    def get_icon(self) -> str:
        return self.icon


class ProfileMetadataProvider:
    """
    Provides color and icon metadata for profiles.

    Uses ordered list of rules (first match wins).
    Follows Open/Closed Principle - add new rules without modifying existing code.
    """

    def __init__(
        self,
        rules: List[MetadataRule],
        default_color: str = "blue",
        default_icon: str = "circle",
    ):
        self.rules = rules
        self.default_color = default_color
        self.default_icon = default_icon

    @lru_cache(maxsize=256)
    def get_color(self, profile_name: str) -> str:
        """Get color for profile based on matching rule."""
        for rule in self.rules:
            if rule.matches(profile_name):
                return rule.get_color()
        return self.default_color

    @lru_cache(maxsize=256)
    def get_icon(self, profile_name: str) -> str:
        """Get icon for profile based on matching rule."""
        for rule in self.rules:
            if rule.matches(profile_name):
                return rule.get_icon()
        return self.default_icon

    def enrich_profile(self, profile: Dict) -> Dict:
        """Add color and icon to profile dict."""
        profile["color"] = self.get_color(profile["name"])
        profile["icon"] = self.get_icon(profile["name"])
        return profile


def create_default_metadata_provider() -> ProfileMetadataProvider:
    """
    Create provider with default rules.

    This function provides the default configuration.
    To customize, create your own rules and provider.
    """
    rules = [
        # Production profiles - red, briefcase
        KeywordMetadataRule(
            keywords=["prod", "production"], color="red", icon="briefcase"
        ),
        # Staging profiles - yellow, circle
        KeywordMetadataRule(
            keywords=["stg", "staging", "stage"], color="yellow", icon="circle"
        ),
        # Development profiles - green, fingerprint
        KeywordMetadataRule(
            keywords=["dev", "development"], color="green", icon="fingerprint"
        ),
        # Test/QA profiles - turquoise, circle
        KeywordMetadataRule(keywords=["test", "qa"], color="turquoise", icon="circle"),
        # Integration profiles - blue, circle
        KeywordMetadataRule(
            keywords=["ite", "integration"], color="blue", icon="circle"
        ),
        # VDI profiles - vacation icon
        KeywordMetadataRule(keywords=["vdi"], color="blue", icon="vacation"),
        # Janus profiles - purple, circle
        KeywordMetadataRule(keywords=["janus"], color="purple", icon="circle"),
    ]

    return ProfileMetadataProvider(rules)
