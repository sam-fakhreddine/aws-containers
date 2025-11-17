#!/usr/bin/env python3
"""
Unit tests for profile_metadata module.

Tests the Strategy pattern implementation for profile metadata.
"""

import pytest
from unittest.mock import Mock

from aws_profile_bridge.core.metadata import (
    KeywordMetadataRule,
    ProfileMetadataProvider,
    create_default_metadata_provider,
)


class TestMetadataRule:
    """Test MetadataRule abstract base class."""

    def test_metadata_rule_is_abstract(self):
        """Test that MetadataRule cannot be instantiated directly."""
        from aws_profile_bridge.core.metadata import MetadataRule
        from abc import ABC

        assert issubclass(MetadataRule, ABC)

    def test_metadata_rule_abstract_methods(self):
        """Test that abstract methods must be implemented."""
        from aws_profile_bridge.core.metadata import MetadataRule

        # Try to create a subclass without implementing abstract methods
        with pytest.raises(TypeError):

            class IncompleteRule(MetadataRule):
                pass

            IncompleteRule()


class TestKeywordMetadataRule:
    """Test KeywordMetadataRule class."""

    def test_matches_single_keyword(self):
        """Test rule matches profile with single keyword."""
        rule = KeywordMetadataRule(["prod"], "red", "briefcase")

        assert rule.matches("prod-account") is True
        assert rule.matches("production") is True
        assert rule.matches("dev-account") is False

    def test_matches_multiple_keywords(self):
        """Test rule matches any of multiple keywords."""
        rule = KeywordMetadataRule(["dev", "development"], "green", "fingerprint")

        assert rule.matches("dev-account") is True
        assert rule.matches("development-env") is True
        assert rule.matches("prod-account") is False

    def test_matches_case_insensitive(self):
        """Test rule matches case-insensitively."""
        rule = KeywordMetadataRule(["prod"], "red", "briefcase")

        assert rule.matches("PROD-ACCOUNT") is True
        assert rule.matches("Prod-Account") is True
        assert rule.matches("prod-account") is True

    def test_get_color_returns_configured_color(self):
        """Test get_color returns the configured color."""
        rule = KeywordMetadataRule(["prod"], "red", "briefcase")

        assert rule.get_color() == "red"

    def test_get_icon_returns_configured_icon(self):
        """Test get_icon returns the configured icon."""
        rule = KeywordMetadataRule(["prod"], "red", "briefcase")

        assert rule.get_icon() == "briefcase"


class TestProfileMetadataProvider:
    """Test ProfileMetadataProvider class."""

    def test_get_color_uses_first_matching_rule(self):
        """Test get_color uses first matching rule."""
        rule1 = KeywordMetadataRule(["prod"], "red", "briefcase")
        rule2 = KeywordMetadataRule(["dev"], "green", "fingerprint")

        provider = ProfileMetadataProvider([rule1, rule2])

        assert provider.get_color("prod-account") == "red"
        assert provider.get_color("dev-account") == "green"

    def test_get_color_returns_default_when_no_match(self):
        """Test get_color returns default color when no rule matches."""
        rule1 = KeywordMetadataRule(["prod"], "red", "briefcase")

        provider = ProfileMetadataProvider([rule1], default_color="blue")

        assert provider.get_color("random-account") == "blue"

    def test_get_icon_uses_first_matching_rule(self):
        """Test get_icon uses first matching rule."""
        rule1 = KeywordMetadataRule(["prod"], "red", "briefcase")
        rule2 = KeywordMetadataRule(["dev"], "green", "fingerprint")

        provider = ProfileMetadataProvider([rule1, rule2])

        assert provider.get_icon("prod-account") == "briefcase"
        assert provider.get_icon("dev-account") == "fingerprint"

    def test_get_icon_returns_default_when_no_match(self):
        """Test get_icon returns default icon when no rule matches."""
        rule1 = KeywordMetadataRule(["prod"], "red", "briefcase")

        provider = ProfileMetadataProvider([rule1], default_icon="circle")

        assert provider.get_icon("random-account") == "circle"

    def test_enrich_profile_adds_color_and_icon(self):
        """Test enrich_profile adds color and icon to profile dict."""
        rule1 = KeywordMetadataRule(["prod"], "red", "briefcase")

        provider = ProfileMetadataProvider([rule1])

        profile = {"name": "prod-account"}
        result = provider.enrich_profile(profile)

        assert result["color"] == "red"
        assert result["icon"] == "briefcase"
        assert result["name"] == "prod-account"  # Original data preserved

    def test_rules_are_evaluated_in_order(self):
        """Test rules are evaluated in order and first match wins."""
        # Both rules would match 'prod-dev', but first should win
        rule1 = KeywordMetadataRule(["prod"], "red", "briefcase")
        rule2 = KeywordMetadataRule(["dev"], "green", "fingerprint")

        provider = ProfileMetadataProvider([rule1, rule2])

        # 'prod' comes first, so it should win
        assert provider.get_color("prod-dev") == "red"
        assert provider.get_icon("prod-dev") == "briefcase"

        # Change order - now 'dev' should win
        provider2 = ProfileMetadataProvider([rule2, rule1])

        assert provider2.get_color("prod-dev") == "green"
        assert provider2.get_icon("prod-dev") == "fingerprint"


class TestCreateDefaultMetadataProvider:
    """Test create_default_metadata_provider function."""

    def test_creates_provider_with_default_rules(self):
        """Test function creates provider with default rules."""
        provider = create_default_metadata_provider()

        assert provider is not None
        assert isinstance(provider, ProfileMetadataProvider)

    def test_production_profiles_get_red_color(self):
        """Test production profiles are colored red."""
        provider = create_default_metadata_provider()

        assert provider.get_color("prod-account") == "red"
        assert provider.get_color("production-env") == "red"

    def test_staging_profiles_get_yellow_color(self):
        """Test staging profiles are colored yellow."""
        provider = create_default_metadata_provider()

        assert provider.get_color("stg-account") == "yellow"
        assert provider.get_color("staging-env") == "yellow"
        assert provider.get_color("stage-env") == "yellow"

    def test_development_profiles_get_green_color(self):
        """Test development profiles are colored green."""
        provider = create_default_metadata_provider()

        assert provider.get_color("dev-account") == "green"
        assert provider.get_color("development-env") == "green"

    def test_test_profiles_get_turquoise_color(self):
        """Test test profiles are colored turquoise."""
        provider = create_default_metadata_provider()

        assert provider.get_color("test-account") == "turquoise"
        assert provider.get_color("qa-account") == "turquoise"

    def test_integration_profiles_get_blue_color(self):
        """Test integration profiles are colored blue."""
        provider = create_default_metadata_provider()

        assert provider.get_color("ite-account") == "blue"
        assert provider.get_color("integration-env") == "blue"

    def test_vdi_profiles_get_vacation_icon(self):
        """Test VDI profiles get vacation icon."""
        provider = create_default_metadata_provider()

        assert provider.get_icon("vdi-account") == "vacation"

    def test_janus_profiles_get_purple_color(self):
        """Test Janus profiles are colored purple."""
        provider = create_default_metadata_provider()

        assert provider.get_color("janus-account") == "purple"

    def test_production_profiles_get_briefcase_icon(self):
        """Test production profiles get briefcase icon."""
        provider = create_default_metadata_provider()

        assert provider.get_icon("prod-account") == "briefcase"

    def test_development_profiles_get_fingerprint_icon(self):
        """Test development profiles get fingerprint icon."""
        provider = create_default_metadata_provider()

        assert provider.get_icon("dev-account") == "fingerprint"

    def test_unknown_profiles_get_default_color_and_icon(self):
        """Test unknown profiles get default color and icon."""
        provider = create_default_metadata_provider()

        assert provider.get_color("random-account") == "blue"
        assert provider.get_icon("random-account") == "circle"
