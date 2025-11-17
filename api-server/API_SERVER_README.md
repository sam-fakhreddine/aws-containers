# AWS Profile Bridge HTTP API Server

Python 3.12+ FastAPI-based HTTP API server for managing AWS profiles.

## Features

- **Modern Python 3.12+ Syntax**: Uses PEP 695 type parameters, TypedDict, and `|` unions
- **FastAPI Framework**: High-performance async API with automatic OpenAPI documentation
- **CORS Support**: Restricted to browser extensions for security
- **Rotating Logs**: Automatic log rotation with size limits
- **Health Monitoring**: Built-in health check endpoint
- **Request Tracing**: Every request gets a unique ID for debugging

## Requirements

- **Python 3.12+** (required)
- FastAPI >= 0.104.0
- Uvicorn >= 0.24.0
- Pydantic >= 2.5.0
- Boto3 >= 1.34.0

## Installation

### Quick Install (with System Service)

```bash
# Install API server as a system service
./scripts/install-api-service.sh
```

This will:
1. Check for Python 3.12+
2. Install dependencies
3. Set up systemd (Linux) or launchd (macOS) service
4. Start the API server
5. Verify it's running

### Manual Installation

```bash
cd api-server

# Install dependencies
pip install -e .

# Or with dev dependencies
pip install -e .[dev]
```

## Running the Server

### As a CLI Command

```bash
# Start the API server
python -m aws_profile_bridge api

# Or using the installed command
aws-profile-bridge-api
```

### Environment Variables

- `ENV`: Set to `development` or `production` (default: `production`)
  - `development`: Enables hot reload and debug logging
  - `production`: Optimized for performance

```bash
# Development mode with hot reload
ENV=development python -m aws_profile_bridge api

# Production mode (default)
python -m aws_profile_bridge api
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime_seconds": 123.45,
  "python_version": "3.12.3"
}
```

### Version Info

```bash
GET /version
```

Returns detailed version information including Python version, platform, and FastAPI version.

### Get Profiles (Fast)

```bash
POST /profiles
```

Returns AWS profiles without SSO enrichment (fast, ~100ms).

Response:
```json
{
  "action": "profileList",
  "profiles": [
    {
      "name": "default",
      "has_credentials": true,
      "expired": false,
      "is_sso": false,
      "color": "blue",
      "icon": "briefcase"
    }
  ]
}
```

### Get Profiles (Enriched)

```bash
POST /profiles/enrich
```

Returns AWS profiles with SSO token validation (slow, may take several seconds).

### Get Console URL

```bash
POST /profiles/{profile_name}/console-url
```

Generates AWS Console federation URL for the specified profile.

## Configuration

The server is configured with security in mind:

- **Host**: `127.0.0.1` (localhost only)
- **Port**: `10999`
- **CORS**: Restricted to `moz-extension://*`
- **Logging**: Files only (no stderr output)

### Log Files

Logs are stored in `~/.aws/logs/`:

- `aws_profile_bridge_api.log`: Main log file
- Automatic rotation at 10MB (keeps 5 backups)
- Total max size: ~50MB

View logs:
```bash
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

## Python 3.12+ Features Used

### Type Aliases with `type` Keyword (PEP 695)

```python
type ProfileName = str
type URL = str
```

### Generic Type Parameters (PEP 695)

```python
class ApiResponse[T](BaseModel):
    data: T
    request_id: str
    timestamp: datetime
```

### Union Types with `|`

```python
async def get_profiles() -> ProfileListResponse | ErrorResponse:
    ...
```

### TypedDict with NotRequired

```python
class Profile(TypedDict):
    name: str
    has_credentials: bool
    expired: bool
    is_sso: bool
    color: NotRequired[str]
    icon: NotRequired[str]
```

### Pattern Matching (match/case)

```python
match os.getenv("ENV", "production").lower():
    case "development" | "dev":
        # Development config
    case "production" | "prod":
        # Production config
    case _:
        # Unknown environment
```

### Modern f-strings

```python
logger.info(f"[{request_id}] → {request.method} {request.url.path}")
```

## Development

### Running Tests

```bash
cd api-server

# Run API server tests
pytest tests/test_api_server.py -v

# Run all tests
pytest -v
```

### Type Checking

```bash
# Install mypy
pip install mypy

# Run type checking
mypy src/aws_profile_bridge/api_server.py
```

### Linting

```bash
# Install ruff
pip install ruff

# Run linter with Python 3.12 target
ruff check --target-version py312 src/
```

## Service Management

### Linux (systemd)

```bash
# Status
systemctl --user status aws-profile-bridge

# Start/Stop/Restart
systemctl --user start aws-profile-bridge
systemctl --user stop aws-profile-bridge
systemctl --user restart aws-profile-bridge

# View logs
journalctl --user -u aws-profile-bridge -f
```

### macOS (launchd)

```bash
# Status
launchctl list | grep aws-profile-bridge

# Start/Stop
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist
launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist

# View logs
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

## Security

- **Localhost Only**: Server binds to `127.0.0.1` only
- **CORS Restricted**: Only allows requests from browser extensions
- **No Credential Logging**: Credentials are never logged
- **Secure Federation**: Uses official AWS STS federation API
- **Request IDs**: Every request is tracked for auditing

## Troubleshooting

### Server won't start

1. Check Python version: `python3 --version` (must be 3.12+)
2. Check logs: `tail -f ~/.aws/logs/aws_profile_bridge_api.log`
3. Check if port is in use: `lsof -i :10999`

### API returns errors

1. Check AWS credentials: `ls -la ~/.aws/`
2. Check logs for detailed error messages
3. Test with curl: `curl -v http://localhost:10999/health`

### Service won't start automatically

**Linux**:
```bash
systemctl --user enable aws-profile-bridge
systemctl --user start aws-profile-bridge
```

**macOS**:
```bash
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist
```

## Performance

- Health check: < 1ms
- Profile list (fast): ~100ms
- Profile list (enriched): 2-10s (depends on SSO profiles)
- Console URL: 1-3s

## License

Same as the main project.
