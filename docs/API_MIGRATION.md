# API Migration Guide

## Overview

The Firefox extension has been migrated from **Native Messaging** to **HTTP API** communication.

## What Changed

### Before (Native Messaging)
- Extension communicated with Python bridge via Firefox's native messaging protocol
- Required `nativeMessaging` permission in manifest
- Used `browser.runtime.connectNative()` to send messages
- Python script received messages via stdin/stdout

### After (HTTP API)
- Extension communicates with Python API server via HTTP
- Requires `<all_urls>` permission for localhost access
- Uses standard `fetch()` API to make HTTP requests
- Python FastAPI server runs on `http://127.0.0.1:10999`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Firefox Extension                                       │
│                                                         │
│  ┌──────────────┐                                      │
│  │ UI Component │                                      │
│  └──────┬───────┘                                      │
│         │                                               │
│         ↓                                               │
│  ┌──────────────┐                                      │
│  │ useProfiles  │                                      │
│  │    Hook      │                                      │
│  └──────┬───────┘                                      │
│         │                                               │
│         ↓                                               │
│  ┌──────────────┐                                      │
│  │ API Client   │                                      │
│  │  Service     │                                      │
│  └──────┬───────┘                                      │
└─────────┼───────────────────────────────────────────────┘
          │
          │ HTTP (fetch)
          │ POST http://127.0.0.1:10999/profiles
          │
          ↓
┌─────────────────────────────────────────────────────────┐
│ Python FastAPI Server (Port 10999)                     │
│                                                         │
│  ┌──────────────┐                                      │
│  │ FastAPI      │                                      │
│  │ Endpoints    │                                      │
│  └──────┬───────┘                                      │
│         │                                               │
│         ↓                                               │
│  ┌──────────────┐                                      │
│  │ AWS Profile  │                                      │
│  │   Bridge     │                                      │
│  └──────┬───────┘                                      │
│         │                                               │
│         ↓                                               │
│  ┌──────────────┐                                      │
│  │ Read AWS     │                                      │
│  │ Credentials  │                                      │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

## Installation

### 1. Install API Server

```bash
# Install and start the API server as a system service
./scripts/manage.sh install
```

This will:
- Check for Python 3.12+
- Install dependencies
- Set up systemd (Linux) or launchd (macOS) service
- Start the API server on port 10999
- Verify it's running

### 2. Build Extension

```bash
# Install dependencies
yarn install

# Build extension
yarn build
```

### 3. Load Extension in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/manifest.json`

## API Endpoints

### Health Check
```
GET http://127.0.0.1:10999/health
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

### Get Profiles (Fast)
```
POST http://127.0.0.1:10999/profiles
```

Returns profiles without SSO enrichment (~100ms).

### Get Profiles (Enriched)
```
POST http://127.0.0.1:10999/profiles/enrich
```

Returns profiles with SSO token validation (2-10s).

### Get Console URL
```
POST http://127.0.0.1:10999/profiles/{profile_name}/console-url
```

Generates AWS Console federation URL.

## Code Changes

### New Files

1. **`src/services/apiClient.ts`**
   - HTTP client for API communication
   - Error handling with `ApiClientError`
   - Timeout support (30s default)
   - Type-safe API calls

2. **`src/services/apiClient.test.ts`**
   - Unit tests for API client
   - Mock fetch responses
   - Error handling tests

### Modified Files

1. **`src/popup/hooks/useProfiles.ts`**
   - Replaced `browser.runtime.connectNative()` with `apiClient.getProfiles()`
   - Simplified error handling
   - Changed `nativeMessagingAvailable` to `apiAvailable`

2. **`src/popup/awsProfiles.tsx`**
   - Replaced native messaging port with `apiClient.getConsoleUrl()`
   - Updated error messages
   - Changed installation instructions

3. **`public/manifest.json`**
   - Removed `nativeMessaging` permission
   - Added `<all_urls>` permission for localhost access

4. **`src/popup/constants.ts`**
   - Removed `NATIVE_MESSAGING_HOST_NAME`
   - Added `API_BASE_URL`

## Benefits

### 1. Better Error Handling
- HTTP status codes provide clear error states
- Structured error responses
- Request/response logging

### 2. Easier Debugging
- View API logs: `tail -f ~/.aws/logs/aws_profile_bridge_api.log`
- Test with curl: `curl http://localhost:10999/health`
- OpenAPI documentation available

### 3. More Flexible
- Can add authentication later
- Can add rate limiting
- Can add request validation
- Can add metrics/monitoring

### 4. Better Performance
- Connection pooling
- Async/await throughout
- No stdin/stdout overhead

### 5. Easier Testing
- Mock HTTP responses
- Integration tests with real server
- Load testing possible

## Troubleshooting

### Extension shows "API Server Not Running"

**Check if server is running:**
```bash
curl http://localhost:10999/health
```

**Start the server:**
```bash
# Linux
systemctl --user start aws-profile-bridge

# macOS
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist

# Manual
python -m aws_profile_bridge api
```

**View logs:**
```bash
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

### Port 10999 already in use

**Find process using port:**
```bash
lsof -i :10999
```

**Kill process:**
```bash
kill -9 <PID>
```

**Or change port in:**
- `api-server/src/aws_profile_bridge/api_server.py` (PORT constant)
- `src/services/apiClient.ts` (API_BASE_URL constant)

### CORS errors in browser console

The API server is configured to allow requests from `moz-extension://*` origins only.

If you see CORS errors:
1. Check browser console for exact error
2. Verify extension is loaded from `about:debugging`
3. Check API server logs for CORS-related messages

### Timeout errors

Default timeout is 30 seconds. If you see timeout errors:

1. Check API server logs for slow operations
2. Increase timeout in `src/services/apiClient.ts`:
   ```typescript
   const REQUEST_TIMEOUT_MS = 60000; // 60 seconds
   ```

## Migration Checklist

- [x] Create API client service
- [x] Update useProfiles hook
- [x] Update awsProfiles component
- [x] Update manifest permissions
- [x] Update constants
- [x] Add API client tests
- [x] Update documentation
- [ ] Update README.md with API installation instructions
- [ ] Test on Linux
- [ ] Test on macOS
- [ ] Update CI/CD pipeline

## Rollback Plan

If you need to rollback to native messaging:

1. Restore `public/manifest.json`:
   ```json
   "permissions": ["nativeMessaging"]
   ```

2. Restore `src/popup/hooks/useProfiles.ts` from git history

3. Restore `src/popup/awsProfiles.tsx` from git history

4. Remove `src/services/apiClient.ts`

5. Rebuild extension: `yarn build`

## Future Enhancements

### Authentication
Add API key authentication:
```typescript
headers: {
  "X-API-Key": "secret-key"
}
```

### Rate Limiting
Prevent abuse with rate limiting:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
```

### Metrics
Add Prometheus metrics:
```python
from prometheus_client import Counter, Histogram
request_count = Counter('api_requests_total', 'Total requests')
```

### WebSocket Support
Real-time profile updates:
```typescript
const ws = new WebSocket('ws://localhost:10999/ws');
ws.onmessage = (event) => {
  // Handle profile updates
};
```

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Firefox Extension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [API Server README](../api-server/API_SERVER_README.md)
