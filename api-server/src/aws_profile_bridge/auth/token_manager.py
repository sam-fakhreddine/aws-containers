"""Token generation and validation."""

import json
import re
import secrets
import logging
import zlib
from pathlib import Path

logger = logging.getLogger(__name__)


class TokenManager:
    """Manages API token generation and validation."""

    TOKEN_PREFIX = "awspc"
    RANDOM_BYTES = 32
    BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    # Legacy pattern for backward compatibility (base64url-like, no multiple underscores)
    LEGACY_PATTERN = re.compile(r"^(?!.*__)[A-Za-z0-9_-]{32,64}$")
    # New pattern with prefix and checksum
    NEW_PATTERN = re.compile(r"^awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}$")

    def __init__(self, config_file: Path):
        self.config_file = config_file
        self._token: str | None = None

    @staticmethod
    def _encode_base62(data: bytes) -> str:
        """Encode bytes to Base62 (alphanumeric only)."""
        if not data:
            return TokenManager.BASE62_ALPHABET[0]

        num = int.from_bytes(data, byteorder="big")
        if num == 0:
            return TokenManager.BASE62_ALPHABET[0]

        result = []
        base = len(TokenManager.BASE62_ALPHABET)
        while num:
            num, remainder = divmod(num, base)
            result.append(TokenManager.BASE62_ALPHABET[remainder])

        return "".join(reversed(result))

    @staticmethod
    def _calculate_checksum(data: str) -> str:
        """Calculate CRC32 checksum and encode as Base62 (6 chars)."""
        crc = zlib.crc32(data.encode("utf-8")) & 0xFFFFFFFF
        checksum_bytes = crc.to_bytes(4, byteorder="big")
        checksum = TokenManager._encode_base62(checksum_bytes)
        # Pad to 6 characters with leading zeros
        return checksum.zfill(6)

    @staticmethod
    def generate_token() -> str:
        """Generate new token with format: awspc_{random}_{checksum}"""
        # Generate random data
        random_bytes = secrets.token_bytes(TokenManager.RANDOM_BYTES)
        random_part = TokenManager._encode_base62(random_bytes)

        # Ensure consistent length (pad or truncate to 43 chars)
        random_part = random_part[:43].ljust(43, "0")

        # Calculate checksum
        checksum = TokenManager._calculate_checksum(random_part)

        # Construct token
        token = f"{TokenManager.TOKEN_PREFIX}_{random_part}_{checksum}"
        return token

    @staticmethod
    def validate_format(token: str) -> bool:
        """Validate token format and checksum without checking against stored value."""
        if not token:
            return False

        # Check new format
        if TokenManager.NEW_PATTERN.match(token):
            parts = token.split("_")
            if len(parts) != 3:
                return False

            random_part = parts[1]
            claimed_checksum = parts[2]
            calculated_checksum = TokenManager._calculate_checksum(random_part)

            if claimed_checksum != calculated_checksum:
                logger.warning("Token checksum validation failed")
                return False

            return True

        # Reject tokens that start with awspc_ but don't match new format
        if token.startswith(f"{TokenManager.TOKEN_PREFIX}_"):
            return False

        # Reject tokens that look like new format but have wrong prefix
        if "_" in token:
            parts = token.split("_")
            if len(parts) == 3:
                return False

        # Check legacy format for backward compatibility
        if TokenManager.LEGACY_PATTERN.match(token):
            logger.warning("Legacy token format detected - please rotate to new format")
            return True

        return False

    def load_or_create(self) -> str:
        """Load token from config or create new one."""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)

        if self.config_file.exists():
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    token = config.get("api_token")
                    if token:
                        # Validate format of loaded token
                        if self.validate_format(token):
                            logger.info("Loaded API token from config")
                            self._token = token
                            return token
                        else:
                            logger.warning("Invalid token format in config, generating new token")
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")

        # Generate new token with new format
        token = self.generate_token()
        self._save_token(token)
        self._token = token
        logger.info("Generated new API token with format: awspc_..._...")
        return token

    def rotate(self) -> str:
        """Generate and save new token."""
        token = self.generate_token()
        self._save_token(token)
        self._token = token
        logger.info("Rotated API token")
        return token

    def _save_token(self, token: str) -> None:
        """Save token to config file."""
        try:
            with open(self.config_file, "w") as f:
                json.dump({"api_token": token}, f, indent=2)
            self.config_file.chmod(0o600)
            logger.info(f"Saved API token to {self.config_file}")
        except Exception as e:
            logger.error(f"Failed to save token: {e}")
            raise

    def validate(self, token: str | None) -> bool:
        """Validate token format and value."""
        if not token:
            return False

        # First validate format and checksum
        if not self.validate_format(token):
            return False

        # Then check against stored token
        return token == self._token
