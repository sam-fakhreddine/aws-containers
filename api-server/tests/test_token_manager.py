"""Tests for token generation and validation."""

import pytest
import tempfile
from pathlib import Path

from aws_profile_bridge.auth.token_manager import TokenManager


class TestTokenGeneration:
    """Test token generation functionality."""

    def test_generate_token_format(self):
        """Test that generated tokens have correct format."""
        token = TokenManager.generate_token()

        assert token.startswith("awspc_")
        assert len(token) == 56  # awspc (5) + _ (1) + random (43) + _ (1) + checksum (6)

        parts = token.split("_")
        assert len(parts) == 3
        assert parts[0] == "awspc"
        assert len(parts[1]) == 43  # Random part
        assert len(parts[2]) == 6  # Checksum

    def test_generate_token_uniqueness(self):
        """Test that generated tokens are unique."""
        tokens = [TokenManager.generate_token() for _ in range(100)]
        assert len(set(tokens)) == 100

    def test_generate_token_checksum_valid(self):
        """Test that generated tokens have valid checksums."""
        token = TokenManager.generate_token()
        assert TokenManager.validate_format(token) is True

    def test_base62_encoding(self):
        """Test Base62 encoding."""
        # Test zero
        assert TokenManager._encode_base62(b"\x00") == "0"

        # Test small number
        result = TokenManager._encode_base62(b"\x00\x00\x00\x01")
        assert result.isalnum()

        # Test all bytes generate valid Base62
        result = TokenManager._encode_base62(b"\xff" * 4)
        assert all(c in TokenManager.BASE62_ALPHABET for c in result)

    def test_checksum_calculation(self):
        """Test checksum calculation is deterministic."""
        data = "test_random_part_12345678901234567890123456"
        checksum1 = TokenManager._calculate_checksum(data)
        checksum2 = TokenManager._calculate_checksum(data)

        assert checksum1 == checksum2
        assert len(checksum1) == 6
        assert all(c in TokenManager.BASE62_ALPHABET for c in checksum1)

    def test_checksum_different_for_different_data(self):
        """Test that different data produces different checksums."""
        data1 = "random_part_1" + "0" * 30
        data2 = "random_part_2" + "0" * 30

        checksum1 = TokenManager._calculate_checksum(data1)
        checksum2 = TokenManager._calculate_checksum(data2)

        assert checksum1 != checksum2


class TestTokenValidation:
    """Test token validation functionality."""

    def test_validate_format_new_token(self):
        """Test validation of new format tokens."""
        token = TokenManager.generate_token()
        assert TokenManager.validate_format(token) is True

    def test_validate_format_invalid_checksum(self):
        """Test that tokens with invalid checksums are rejected."""
        token = TokenManager.generate_token()
        # Tamper with the checksum
        parts = token.split("_")
        tampered_checksum = "X" + parts[2][1:]  # Change first character
        tampered_token = f"{parts[0]}_{parts[1]}_{tampered_checksum}"

        assert TokenManager.validate_format(tampered_token) is False

    def test_validate_format_legacy_token(self):
        """Test validation of legacy format tokens."""
        # Old format tokens (base64url style)
        legacy_tokens = [
            "dGhpc19pc19hX3Rlc3RfdG9rZW5fZXhhbXBsZQ",  # 42 chars
            "YW5vdGhlcl90ZXN0X3Rva2VuXzEyMzQ1Njc4OTBhYmNkZWY",  # 49 chars
        ]

        for legacy_token in legacy_tokens:
            assert TokenManager.validate_format(legacy_token) is True

    def test_validate_format_invalid_tokens(self):
        """Test that invalid tokens are rejected."""
        invalid_tokens = [
            "",  # Empty
            "short",  # Too short (< 32)
            "invalid!@#$%^&*()",  # Invalid characters
            "a" * 65,  # Too long for legacy format (> 64)
            "a" * 31,  # Too short for legacy format (< 32)
            "token with spaces in it",  # Spaces not allowed
            "token!with!special@chars#",  # Special chars not allowed (too short)
        ]

        for invalid_token in invalid_tokens:
            assert TokenManager.validate_format(invalid_token) is False

    def test_validate_format_new_format_invalid_lengths(self):
        """Test that new format tokens with invalid lengths are rejected as new format but may pass as legacy."""
        # These have wrong lengths for new format but may be valid legacy tokens
        token1 = "awspc_" + "0" * 40 + "_123456"  # Random part too short (48 chars total)
        token2 = "awspc_" + "0" * 43 + "_123"  # Checksum too short (52 chars total)

        # Both should match legacy pattern (between 32-64 chars)
        # So validate_format will return True (as legacy tokens)
        assert TokenManager.validate_format(token1) is True
        assert TokenManager.validate_format(token2) is True

    def test_validate_format_pattern_matching(self):
        """Test that pattern matching works correctly."""
        # Valid new format
        assert TokenManager.NEW_PATTERN.match(
            "awspc_" + "A" * 43 + "_" + "0" * 6
        ) is not None

        # Valid legacy format
        assert TokenManager.LEGACY_PATTERN.match("a" * 32) is not None
        assert TokenManager.LEGACY_PATTERN.match("a" * 64) is not None
        assert TokenManager.LEGACY_PATTERN.match("A1_-" * 10) is not None

        # Invalid patterns
        assert TokenManager.NEW_PATTERN.match("awspc_short_123456") is None
        assert TokenManager.LEGACY_PATTERN.match("a" * 31) is None  # Too short
        assert TokenManager.LEGACY_PATTERN.match("a" * 65) is None  # Too long


class TestTokenManager:
    """Test TokenManager class functionality."""

    def test_init(self):
        """Test TokenManager initialization."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            manager = TokenManager(config_file)

            assert manager.config_file == config_file
            assert manager._token is None

    def test_load_or_create_generates_new_token(self):
        """Test that load_or_create generates a new token when file doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            manager = TokenManager(config_file)

            token = manager.load_or_create()

            assert token is not None
            assert TokenManager.validate_format(token) is True
            assert manager._token == token
            assert config_file.exists()

    def test_load_or_create_loads_existing_token(self):
        """Test that load_or_create loads an existing valid token."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            manager1 = TokenManager(config_file)

            # Generate and save a token
            token1 = manager1.load_or_create()

            # Create new manager instance and load
            manager2 = TokenManager(config_file)
            token2 = manager2.load_or_create()

            assert token1 == token2
            assert manager2._token == token1

    def test_rotate_generates_new_token(self):
        """Test that rotate generates a new token."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            manager = TokenManager(config_file)

            token1 = manager.load_or_create()
            token2 = manager.rotate()

            assert token1 != token2
            assert TokenManager.validate_format(token2) is True
            assert manager._token == token2

    def test_validate_checks_format_and_value(self):
        """Test that validate checks both format and stored value."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            manager = TokenManager(config_file)

            token = manager.load_or_create()

            # Valid token and value
            assert manager.validate(token) is True

            # Invalid format
            assert manager.validate("invalid") is False

            # Valid format but different token
            other_token = TokenManager.generate_token()
            assert manager.validate(other_token) is False

            # None
            assert manager.validate(None) is False

    def test_config_file_permissions(self):
        """Test that config file has correct permissions."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            manager = TokenManager(config_file)

            manager.load_or_create()

            # Check file permissions (0o600 = owner read/write only)
            import stat

            file_stat = config_file.stat()
            file_mode = stat.S_IMODE(file_stat.st_mode)
            assert file_mode == 0o600

    def test_invalid_token_in_config_regenerates(self):
        """Test that invalid token in config causes regeneration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"

            # Write invalid token to config
            import json

            config_file.write_text(json.dumps({"api_token": "invalid_token_format"}))

            manager = TokenManager(config_file)
            token = manager.load_or_create()

            # Should generate new valid token
            assert TokenManager.validate_format(token) is True
            assert token != "invalid_token_format"


class TestBackwardCompatibility:
    """Test backward compatibility with legacy tokens."""

    def test_legacy_token_validation(self):
        """Test that legacy tokens are accepted."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"

            # Write legacy token to config
            import json

            legacy_token = "dGhpc19pc19hX3Rlc3RfdG9rZW5fZXhhbXBsZQ"
            config_file.write_text(json.dumps({"api_token": legacy_token}))

            manager = TokenManager(config_file)
            loaded_token = manager.load_or_create()

            # Should load and accept legacy token
            assert loaded_token == legacy_token
            assert manager.validate(legacy_token) is True

    def test_legacy_token_replaced_on_rotation(self):
        """Test that rotating a legacy token creates a new format token."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"

            # Write legacy token to config
            import json

            legacy_token = "dGhpc19pc19hX3Rlc3RfdG9rZW5fZXhhbXBsZQ"
            config_file.write_text(json.dumps({"api_token": legacy_token}))

            manager = TokenManager(config_file)
            manager.load_or_create()

            # Rotate should create new format token
            new_token = manager.rotate()

            assert new_token != legacy_token
            assert TokenManager.validate_format(new_token) is True
            assert new_token.startswith("awspc_")
