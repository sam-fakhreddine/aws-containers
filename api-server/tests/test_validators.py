"""Tests for input validation utilities."""

import pytest
from fastapi import HTTPException, status

from aws_profile_bridge.utils.validators import validate_profile_name


class TestValidateProfileName:
    """Test profile name validation."""

    def test_validate_valid_profile_name(self):
        """Test that valid profile names pass validation."""
        valid_names = [
            "my-profile",
            "profile123",
            "my.profile",
            "my_profile",
            "Profile-Name_123.test",
            "a",  # Single character
            "A1-_.",  # All valid characters
        ]

        for name in valid_names:
            result = validate_profile_name(name)
            assert result == name

    def test_validate_empty_profile_name_raises_400(self):
        """Test that empty profile name raises 400."""
        with pytest.raises(HTTPException) as exc_info:
            validate_profile_name("")

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid profile name" in exc_info.value.detail

    def test_validate_profile_name_too_long_raises_400(self):
        """Test that profile name over 128 chars raises 400."""
        long_name = "a" * 129

        with pytest.raises(HTTPException) as exc_info:
            validate_profile_name(long_name)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid profile name" in exc_info.value.detail

    def test_validate_profile_name_max_length_valid(self):
        """Test that profile name exactly 128 chars is valid."""
        max_length_name = "a" * 128

        result = validate_profile_name(max_length_name)
        assert result == max_length_name

    def test_validate_profile_name_with_invalid_characters_raises_400(self):
        """Test that profile names with invalid characters raise 400."""
        invalid_names = [
            "profile/name",  # Path traversal attempt
            "profile\\name",  # Backslash
            "profile name",  # Space
            "profile@name",  # @
            "profile#name",  # #
            "profile$name",  # $
            "profile%name",  # %
            "profile&name",  # &
            "profile*name",  # *
            "profile(name",  # (
            "profile)name",  # )
            "../profile",  # Path traversal
            "profile\x00name",  # Null byte
        ]

        for name in invalid_names:
            with pytest.raises(HTTPException) as exc_info:
                validate_profile_name(name)

            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid profile name" in exc_info.value.detail

    def test_validate_profile_name_returns_input(self):
        """Test that validation returns the original input on success."""
        name = "my-profile"
        result = validate_profile_name(name)
        assert result is name  # Same object
