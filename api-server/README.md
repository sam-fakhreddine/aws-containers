# AWS Profile Bridge - API Server

A refactored HTTP API server following SOLID, DRY, and KISS principles with comprehensive unit tests.

## Project Structure

```
api-server/
├── src/
│   └── aws_profile_bridge/          # Main package
│       ├── __init__.py
│       ├── __main__.py              # CLI entry point
│       ├── app.py                   # FastAPI application
│       │
│       ├── api/                     # HTTP API endpoints
│       │   ├── health.py            # Health check endpoints
│       │   └── profiles.py          # Profile & console URL endpoints
│       │
│       ├── auth/                    # Authentication & authorization
│       │   ├── authenticator.py     # Token authentication
│       │   ├── rate_limiter.py      # Rate limiting
│       │   └── token_manager.py     # Token generation & validation
│       │
│       ├── cli/                     # Command-line interface
│       │   ├── main.py              # CLI commands
│       │   └── profile_commands.py  # Profile management commands
│       │
│       ├── config/                  # Configuration management
│       │   ├── logging.py           # Logging configuration
│       │   └── settings.py          # Application settings
│       │
│       ├── core/                    # Core business logic
│       │   ├── bridge.py            # Main application bridge
│       │   ├── console_url.py       # Console URL generation
│       │   ├── credentials.py       # Credential provider
│       │   ├── metadata.py          # Profile metadata (colors/icons)
│       │   ├── parsers.py           # AWS file parsers
│       │   └── url_cache.py         # Console URL caching
│       │
│       ├── middleware/              # HTTP middleware
│       │   ├── extension_validator.py  # Extension origin validation
│       │   └── logging.py           # Request/response logging
│       │
│       ├── services/                # External services
│       │   └── sso.py               # AWS SSO integration
│       │
│       └── utils/                   # Utilities
│           ├── logger.py            # Logging utilities
│           └── validators.py        # Input validation
│
├── tests/                           # Unit tests
│   ├── test_bridge.py
│   ├── test_parsers.py
│   ├── test_sso.py
│   ├── test_metadata.py
│   └── test_console_url.py
│
├── pyproject.toml                   # Package configuration
├── requirements.txt                 # Dependencies
└── pytest.ini                       # Pytest configuration
```

## Architecture Principles

### SOLID Principles

- **Single Responsibility**: Each class has one clearly defined responsibility
  - `FileCache`: File caching based on mtime
  - `INIFileParser`: Base INI file parsing logic
  - `SSOTokenCache`: SSO token caching
  - `ConsoleURLGenerator`: AWS console URL generation
  - `TokenAuthenticator`: Token validation
  - etc.

- **Open/Closed**: Extensible without modification
  - `ProfileMetadataProvider` uses Strategy pattern for color/icon rules
  - Add new rules without modifying existing code

- **Liskov Substitution**: Not applicable (no deep inheritance)

- **Interface Segregation**: Focused interfaces
  - Small, focused modules with clear responsibilities

- **Dependency Inversion**: Depends on abstractions
  - All components use dependency injection
  - Easy to mock for testing

### DRY (Don't Repeat Yourself)

- Common INI parsing logic extracted to `INIFileParser` base class
- Cache checking logic centralized in `FileCache`
- Profile data structure creation standardized
- Authentication logic centralized in `auth/` module

### KISS (Keep It Simple, Stupid)

- Each class/method does one thing
- Clear, descriptive names
- Minimal nesting
- Short methods (typically < 30 lines)

## Installation

### Using uv (Recommended)

```bash
# Install with uv
uv pip install -e .

# Or with test dependencies
uv pip install -e .[test]
```

### Using pip

```bash
# Install package in development mode
pip install -e .

# Or install with test dependencies
pip install -e .[test]
```

## Running the API Server

### As a System Service

**Linux (systemd):**
```bash
systemctl --user start aws-profile-bridge
systemctl --user status aws-profile-bridge
journalctl --user -u aws-profile-bridge -f
```

**macOS (launchd):**
```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.aws.profile-bridge.plist
launchctl list | grep aws-profile-bridge
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

### Manual Development Mode

```bash
# Run API server
uv run python -m aws_profile_bridge api

# Or with hot reload (development)
ENV=development uv run python -m aws_profile_bridge api
```

## Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage report
uv run pytest --cov=src/aws_profile_bridge --cov-report=html

# Run specific test file
uv run pytest tests/test_parsers.py

# Run specific test
uv run pytest tests/test_parsers.py::TestFileCache::test_cache_stores_and_retrieves_data
```

## Code Quality

- **100% mocked tests**: No file system or network dependencies in tests
- **High test coverage**: Comprehensive unit tests for all modules
- **Type hints**: Used throughout for better IDE support
- **Docstrings**: All classes and public methods documented

## Module Overview

### Core Business Logic (`core/`)

**`bridge.py`**
- `AWSProfileBridge`: Main application - wires all components together

**`parsers.py`**
- `FileCache`: Efficient file caching using mtime
- `INIFileParser`: Base class for INI-style files (DRY)
- `CredentialsFileParser`: Parses `~/.aws/credentials`
- `ConfigFileParser`: Parses `~/.aws/config`
- `ProfileConfigReader`: Reads individual profile configs

**`credentials.py`**
- `CredentialProvider`: Orchestrates credential retrieval from all sources
- `ProfileAggregator`: Aggregates profiles from all AWS configuration sources

**`metadata.py`**
- `MetadataRule`: Base class for metadata rules (Strategy pattern)
- `KeywordMetadataRule`: Keyword-based color/icon mapping
- `ProfileMetadataProvider`: Provides color and icon for profiles

**`console_url.py`**
- `ConsoleURLGenerator`: Generates AWS console federation URLs
- `ProfileConsoleURLGenerator`: High-level interface for profile URLs

**`url_cache.py`**
- `ConsoleURLCache`: Caches generated console URLs

### Services (`services/`)

**`sso.py`**
- `SSOTokenCache`: Manages SSO token caching (file + memory)
- `SSOCredentialsProvider`: Fetches temporary credentials via AWS SSO API
- `SSOProfileEnricher`: Adds SSO token status to profiles

### API Endpoints (`api/`)

**`health.py`**
- Health check endpoints
- System status information

**`profiles.py`**
- Profile listing endpoints
- Console URL generation endpoints
- Profile enrichment endpoints

### Authentication (`auth/`)

**`authenticator.py`**
- `TokenAuthenticator`: Validates API tokens

**`token_manager.py`**
- `TokenManager`: Generates and manages API tokens

**`rate_limiter.py`**
- `RateLimiter`: Rate limiting for API endpoints

### HTTP Application (`app.py`)

- FastAPI HTTP server for browser extension communication
- Token-based authentication middleware
- Rate limiting middleware
- CORS configuration
- Request/response logging

## API Endpoints

### Health Check
```
GET /health
```

Returns server health status and version information.

### Get Profiles
```
GET /profiles
```

Returns list of all AWS profiles (fast, no SSO enrichment).

### Get Enriched Profiles
```
GET /profiles/enrich
```

Returns profiles with SSO token validation (slower, 2-10s).

### Generate Console URL
```
POST /profiles/{profile_name}/console-url
```

Generates AWS Console federation URL for a specific profile.

**Query Parameters:**
- `region`: AWS region (optional, default: us-east-1)

## Configuration

Configuration is loaded from:
1. `~/.aws/profile_bridge_config.json` - API token and settings
2. Environment variables
3. Default values

**Example `~/.aws/profile_bridge_config.json`:**
```json
{
  "api_token": "your-secure-token-here",
  "port": 10999,
  "host": "127.0.0.1"
}
```

## Security

This application handles sensitive AWS credentials. See `../SECURITY.md` for details.

**Key security features:**
- Never logs credentials
- Never stores credentials
- Only sends temporary credentials to official AWS endpoints
- Communicates only with browser extension via HTTP API (localhost only)
- Token-based authentication (required for all endpoints except `/health`)
- Rate limiting (prevents brute force attacks)
- Extension origin validation

## Development

### Code Style

- Follow PEP 8
- Use type hints
- Write docstrings for all public methods
- Keep methods short (< 30 lines)
- Use dependency injection

### Adding New Features

1. Create new module in appropriate directory (`api/`, `core/`, `services/`, etc.)
2. Write unit tests first (TDD)
3. Implement feature
4. Update documentation
5. Run tests: `uv run pytest`

### Debugging

**Enable debug logging:**
```bash
ENV=development uv run python -m aws_profile_bridge api
```

**Check logs:**
```bash
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

**Test API manually:**
```bash
# Health check
curl http://localhost:10999/health

# Get profiles (requires token)
curl -H "X-API-Token: your-token-here" http://localhost:10999/profiles
```

## License

See LICENSE file for details.

## Related Documentation

- [Main README](../README.md) - Project overview
- [API Migration Guide](./MIGRATION_GUIDE.md) - Native Messaging → HTTP API migration
- [Security Documentation](../docs/security/security-root.md) - Security details
- [User Guide](../docs/user-guide/) - End-user documentation
