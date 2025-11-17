"""Token generation and validation."""

import json
import secrets
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class TokenManager:
    """Manages API token generation and validation."""
    
    def __init__(self, config_file: Path):
        self.config_file = config_file
        self._token: str | None = None
    
    def load_or_create(self) -> str:
        """Load token from config or create new one."""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    token = config.get('api_token')
                    if token:
                        logger.info("Loaded API token from config")
                        self._token = token
                        return token
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")
        
        token = secrets.token_urlsafe(32)
        try:
            with open(self.config_file, 'w') as f:
                json.dump({'api_token': token}, f, indent=2)
            self.config_file.chmod(0o600)
            logger.info(f"Generated new API token and saved to {self.config_file}")
        except Exception as e:
            logger.error(f"Failed to save token: {e}")
        
        self._token = token
        return token
    
    def validate(self, token: str | None) -> bool:
        """Validate provided token against stored token."""
        return token is not None and token == self._token
