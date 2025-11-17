# Token Authentication

The extension uses token-based authentication to secure communication between the browser extension and the API server.

## How It Works

1. **API Server** generates a random token on first startup
2. **Token** is stored in `~/.aws/profile_bridge_config.json`
3. **Extension** must be configured with this token
4. **All API requests** include the token in the `X-API-Token` header
5. **Server validates** the token on every request

## Setup

### 1. Start API Server

The API server automatically generates a token on first startup:

```bash
./scripts/install-api-service.sh
```

### 2. Get Your Token

```bash
cat ~/.aws/profile_bridge_config.json
```

Output:
```json
{
  "api_token": "your-random-token-here"
}
```

### 3. Configure Extension

**Option A: Via Settings Page**
1. Click extension icon
2. Click settings icon (gear) in top right
3. Paste token
4. Click "Save Token"
5. Click "Test Connection"

**Option B: Via Browser**
1. Right-click extension icon
2. Select "Manage Extension"
3. Click "Preferences" or "Options"
4. Paste token
5. Click "Save Token"

## Security

### Token Generation
- 32-byte random token using `secrets.token_urlsafe()`
- Cryptographically secure random number generator
- URL-safe base64 encoding
- ~256 bits of entropy

### Token Storage

**Server Side:**
- Stored in `~/.aws/profile_bridge_config.json`
- File permissions: `0600` (owner read/write only)
- Location: User's home directory

**Client Side:**
- Stored in browser's local storage
- Only accessible to the extension
- Never transmitted except to localhost

### Token Transmission
- Only sent to `127.0.0.1:10999` (localhost)
- Included in `X-API-Token` HTTP header
- Never logged by server
- HTTPS not required (localhost only)

## API Endpoints

### Protected Endpoints
All endpoints except `/health` require authentication:

- `POST /profiles` - Requires token
- `POST /profiles/enrich` - Requires token
- `POST /profiles/{name}/console-url` - Requires token

### Public Endpoints
- `GET /health` - No token required
- `GET /version` - No token required

## Error Handling

### 401 Unauthorized

**Cause:** Missing or invalid token

**Response:**
```json
{
  "detail": "Invalid or missing API token"
}
```

**Solution:**
1. Check token in `~/.aws/profile_bridge_config.json`
2. Update token in extension settings
3. Test connection

### Token Mismatch

**Symptoms:**
- Extension shows "Authentication Required"
- All API calls return 401

**Fix:**
```bash
# Get current token
cat ~/.aws/profile_bridge_config.json

# Copy token to extension settings
# Settings → Paste token → Save
```

## Token Rotation

### Manual Rotation

**1. Generate New Token:**
```bash
# Edit config file
nano ~/.aws/profile_bridge_config.json

# Replace api_token value with new random string
# Or delete the file and restart server to auto-generate
```

**2. Restart API Server:**
```bash
# Linux
systemctl --user restart aws-profile-bridge

# macOS
launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist
```

**3. Update Extension:**
- Open extension settings
- Paste new token
- Save and test

### Automatic Rotation (Future)

Token rotation could be automated with:
- Time-based expiration
- Request count limits
- Periodic regeneration
- Multi-token support

## Troubleshooting

### Extension Can't Connect

**Check token is set:**
```bash
# In browser console (F12)
browser.storage.local.get('apiToken')
```

**Should return:**
```javascript
{ apiToken: "your-token-here" }
```

### Server Rejects Token

**Check server token:**
```bash
cat ~/.aws/profile_bridge_config.json
```

**Check server logs:**
```bash
tail -f ~/.aws/logs/aws_profile_bridge_api.log
# Look for "Invalid API token attempt"
```

### Token File Missing

**Regenerate:**
```bash
# Delete config (if exists)
rm ~/.aws/profile_bridge_config.json

# Restart server (will auto-generate)
systemctl --user restart aws-profile-bridge  # Linux
launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist  # macOS
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist

# Get new token
cat ~/.aws/profile_bridge_config.json
```

## Testing

### Test Token Authentication

```bash
# Without token (should fail)
curl -X POST http://localhost:10999/profiles

# Expected: 401 Unauthorized

# With token (should succeed)
TOKEN=$(jq -r .api_token ~/.aws/profile_bridge_config.json)
curl -X POST http://localhost:10999/profiles \
  -H "X-API-Token: $TOKEN"

# Expected: Profile list JSON
```

### Test Extension

1. Open extension
2. Should see profiles (if token is set)
3. If not, click settings icon
4. Configure token
5. Retry

## Best Practices

### Do
- ✅ Keep token in `~/.aws/profile_bridge_config.json`
- ✅ Use file permissions `0600`
- ✅ Rotate token if compromised
- ✅ Test connection after setting token

### Don't
- ❌ Share token publicly
- ❌ Commit token to git
- ❌ Store token in plain text elsewhere
- ❌ Use same token across systems

## Advanced Configuration

### Custom Token

Set your own token instead of auto-generated:

```bash
# Create config with custom token
cat > ~/.aws/profile_bridge_config.json << EOF
{
  "api_token": "my-custom-secure-token-here"
}
EOF

# Secure permissions
chmod 600 ~/.aws/profile_bridge_config.json

# Restart server
systemctl --user restart aws-profile-bridge
```

### Multiple Extensions

Each extension instance needs the same token:

1. Get token from server
2. Configure in each browser/profile
3. All use same API server

### Disable Authentication (Not Recommended)

To disable authentication (development only):

**Edit `api_server.py`:**
```python
# Comment out verify_token() calls
# @app.post("/profiles")
# async def get_profiles():
#     # verify_token(_)  # Comment this line
```

**Warning:** Only for local development. Never in production.

## Migration from No Auth

If upgrading from version without authentication:

1. **Server** will auto-generate token on first start
2. **Extension** will fail with 401 until configured
3. **Get token** from `~/.aws/profile_bridge_config.json`
4. **Configure** in extension settings
5. **Test** connection

## FAQ

**Q: Where is the token stored?**
A: Server: `~/.aws/profile_bridge_config.json`, Extension: Browser local storage

**Q: Is the token encrypted?**
A: No, but file permissions restrict access to owner only

**Q: Can I use the same token on multiple machines?**
A: No, each API server generates its own token

**Q: What if I lose the token?**
A: Delete config file and restart server to regenerate

**Q: Is HTTPS required?**
A: No, server only binds to localhost (127.0.0.1)

**Q: Can I disable authentication?**
A: Not recommended. Only for development.

## References

- [Python secrets module](https://docs.python.org/3/library/secrets.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Browser Storage API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
