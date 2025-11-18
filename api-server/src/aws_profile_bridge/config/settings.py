"""Application configuration."""

from pathlib import Path

HOST: str = "127.0.0.1"
PORT: int = 10999
LOG_DIR: Path = Path.home() / ".aws" / "logs"
LOG_FILE: Path = LOG_DIR / "aws_profile_bridge_api.log"
LOG_MAX_BYTES: int = 10 * 1024 * 1024
LOG_BACKUP_COUNT: int = 5
CORS_ORIGINS: list[str] = [
    "moz-extension://*",
    "http://localhost:*",
    "http://127.0.0.1:*",
]
CONFIG_FILE: Path = Path.home() / ".aws" / "profile_bridge_config.json"
MAX_ATTEMPTS: int = 10
WINDOW_SECONDS: int = 60
