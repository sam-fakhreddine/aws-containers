# AWS Profile Bridge - Native Messaging Host

A refactored implementation following SOLID, DRY, and KISS principles with comprehensive unit tests.

## Project Structure

```
native-messaging/
├── src/
│   └── aws_profile_bridge/      # Main package
│       ├── __init__.py
│       ├── aws_profile_bridge.py       # Main application
│       ├── native_messaging.py         # Native messaging protocol
│       ├── file_parsers.py             # AWS file parsers
│       ├── sso_manager.py              # SSO token management
│       ├── credential_provider.py      # Credential orchestration
│       ├── profile_metadata.py         # Profile metadata (colors/icons)
│       └── console_url_generator.py    # Console URL generation
├── tests/                       # Unit tests
│   ├── test_file_parsers.py
│   ├── test_sso_manager.py
│   ├── test_profile_metadata.py
│   ├── test_console_url_generator.py
│   ├── test_native_messaging.py
│   └── test_aws_profile_bridge.py
├── setup.py                     # Package configuration
├── requirements.txt             # Dependencies
├── pytest.ini                   # Pytest configuration
└── aws_profile_bridge.json      # Native messaging manifest

```

## Architecture Principles

### SOLID Principles

- **Single Responsibility**: Each class has one clearly defined responsibility
  - `FileCache`: File caching based on mtime
  - `INIFileParser`: Base INI file parsing logic
  - `SSOTokenCache`: SSO token caching
  - `ConsoleURLGenerator`: AWS console URL generation
  - etc.

- **Open/Closed**: Extensible without modification
  - `ProfileMetadataProvider` uses Strategy pattern for color/icon rules
  - Add new rules without modifying existing code

- **Liskov Substitution**: Not applicable (no deep inheritance)

- **Interface Segregation**: Focused interfaces
  - `MessageReader`, `MessageWriter`, `MessageHandler` - small, focused interfaces

- **Dependency Inversion**: Depends on abstractions
  - All components use dependency injection
  - Easy to mock for testing

### DRY (Don't Repeat Yourself)

- Common INI parsing logic extracted to `INIFileParser` base class
- Cache checking logic centralized in `FileCache`
- Profile data structure creation standardized

### KISS (Keep It Simple, Stupid)

- Each class/method does one thing
- Clear, descriptive names
- Minimal nesting
- Short methods (typically < 30 lines)

## Installation

```bash
# Install package in development mode
pip install -e .

# Or install with test dependencies
pip install -e .[test]
```

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src/aws_profile_bridge --cov-report=html

# Run specific test file
pytest tests/test_file_parsers.py

# Run specific test
pytest tests/test_file_parsers.py::TestFileCache::test_cache_stores_and_retrieves_data
```

## Code Quality

- **100% mocked tests**: No file system or network dependencies in tests
- **High test coverage**: Comprehensive unit tests for all modules
- **Type hints**: Used throughout for better IDE support
- **Docstrings**: All classes and public methods documented

## Module Overview

### `file_parsers.py`
- `FileCache`: Efficient file caching using mtime
- `INIFileParser`: Base class for INI-style files (DRY)
- `CredentialsFileParser`: Parses `~/.aws/credentials`
- `ConfigFileParser`: Parses `~/.aws/config`
- `ProfileConfigReader`: Reads individual profile configs

### `sso_manager.py`
- `SSOTokenCache`: Manages SSO token caching (file + memory)
- `SSOCredentialsProvider`: Fetches temporary credentials via AWS SSO API
- `SSOProfileEnricher`: Adds SSO token status to profiles

### `credential_provider.py`
- `CredentialProvider`: Orchestrates credential retrieval from all sources
- `ProfileAggregator`: Aggregates profiles from all AWS configuration sources

### `profile_metadata.py`
- `MetadataRule`: Base class for metadata rules (Strategy pattern)
- `KeywordMetadataRule`: Keyword-based color/icon mapping
- `ProfileMetadataProvider`: Provides color and icon for profiles

### `console_url_generator.py`
- `ConsoleURLGenerator`: Generates AWS console federation URLs
- `ProfileConsoleURLGenerator`: High-level interface for profile URLs

### `native_messaging.py`
- `NativeMessagingReader`: Reads messages from stdin
- `NativeMessagingWriter`: Writes messages to stdout
- `NativeMessagingHost`: Main message loop coordinator

### `aws_profile_bridge.py`
- `AWSProfileBridgeHandler`: Handles extension messages
- `AWSProfileBridge`: Main application - wires all components together

## Security

This application handles sensitive AWS credentials. See `SECURITY.md` for details.

Key security features:
- Never logs credentials
- Never stores credentials
- Only sends temporary credentials to official AWS endpoints
- Communicates only with browser extension via native messaging

## License

See LICENSE file for details.
