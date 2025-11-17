# AWS Profile Bridge API Server - Sequence Diagrams

## 1. API Server Startup Flow

```
User                    Service Manager          API Server              Logger
 |                             |                      |                      |
 |  ./install-api-service.sh  |                      |                      |
 |---------------------------->|                      |                      |
 |                             |                      |                      |
 |                             |  start service       |                      |
 |                             |--------------------->|                      |
 |                             |                      |                      |
 |                             |                      |  setup_logging()     |
 |                             |                      |--------------------->|
 |                             |                      |                      |
 |                             |                      |<---------------------|
 |                             |                      |  (logger ready)      |
 |                             |                      |                      |
 |                             |                      |  lifespan startup    |
 |                             |                      |  (signal handlers)   |
 |                             |                      |                      |
 |                             |                      |  bind to 127.0.0.1   |
 |                             |                      |  port 10999          |
 |                             |                      |                      |
 |                             |<---------------------|                      |
 |                             |  (service running)   |                      |
 |                             |                      |                      |
 |<----------------------------|                      |                      |
 |  health check OK            |                      |                      |
 |                             |                      |                      |
```

## 2. GET /health Endpoint Flow

```
Browser Extension    CORS Middleware    API Server         Logger
      |                    |                 |                |
      |  GET /health       |                 |                |
      |  Origin: moz-ext   |                 |                |
      |------------------->|                 |                |
      |                    |                 |                |
      |                    |  validate CORS  |                |
      |                    |                 |                |
      |                    |  add request_id |                |
      |                    |                 |                |
      |                    |---------------->|                |
      |                    |                 |                |
      |                    |                 |  log request   |
      |                    |                 |--------------->|
      |                    |                 |                |
      |                    |                 |  health_check()|
      |                    |                 |  {             |
      |                    |                 |    status,     |
      |                    |                 |    version,    |
      |                    |                 |    uptime      |
      |                    |                 |  }             |
      |                    |                 |                |
      |                    |                 |  log response  |
      |                    |                 |--------------->|
      |                    |                 |                |
      |                    |<----------------|                |
      |                    |  JSON response  |                |
      |                    |  X-Request-ID   |                |
      |                    |                 |                |
      |<-------------------|                 |                |
      |  200 OK            |                 |                |
      |  CORS headers      |                 |                |
      |                    |                 |                |
```

## 3. POST /profiles Flow (Fast Mode)

```
Browser         API Server      Thread Pool    AWSProfileBridge    File System
Extension                                          Handler
   |                |                |                |                 |
   |  POST          |                |                |                 |
   | /profiles      |                |                |                 |
   |--------------->|                |                |                 |
   |                |                |                |                 |
   |                |  create bridge |                |                 |
   |                |  instance      |                |                 |
   |                |                |                |                 |
   |                |  asyncio       |                |                 |
   |                | .to_thread()   |                |                 |
   |                |--------------->|                |                 |
   |                |                |                |                 |
   |                |                |  _handle_get   |                 |
   |                |                | _profiles()    |                 |
   |                |                |--------------->|                 |
   |                |                |                |                 |
   |                |                |                | read ~/.aws/    |
   |                |                |                | credentials     |
   |                |                |                |---------------->|
   |                |                |                |                 |
   |                |                |                |<----------------|
   |                |                |                | (profile data)  |
   |                |                |                |                 |
   |                |                |                | read ~/.aws/    |
   |                |                |                | config          |
   |                |                |                |---------------->|
   |                |                |                |                 |
   |                |                |                |<----------------|
   |                |                |                | (config data)   |
   |                |                |                |                 |
   |                |                |                | aggregate       |
   |                |                |                | profiles        |
   |                |                |                | (skip SSO)      |
   |                |                |                |                 |
   |                |                |<---------------|                 |
   |                |                |  profile list  |                 |
   |                |                |                |                 |
   |                |<---------------|                |                 |
   |                |  return result |                |                 |
   |                |                |                |                 |
   |<---------------|                |                |                 |
   |  200 OK        |                |                |                 |
   |  {             |                |                |                 |
   |    action:     |                |                |                 |
   |    "profileList"|               |                |                 |
   |    profiles: []|                |                |                 |
   |  }             |                |                |                 |
   |                |                |                |                 |
```

## 4. POST /profiles/enrich Flow (With SSO)

```
Browser      API Server    Thread Pool   Handler    SSO Cache    AWS SSO API
Extension                                                          (HTTPS)
   |              |             |            |           |              |
   |  POST        |             |            |           |              |
   | /profiles/   |             |            |           |              |
   | enrich       |             |            |           |              |
   |------------->|             |            |           |              |
   |              |             |            |           |              |
   |              | asyncio     |            |           |              |
   |              | .to_thread()|            |           |              |
   |              | timeout=30s |            |           |              |
   |              |------------>|            |           |              |
   |              |             |            |           |              |
   |              |             | _handle_   |           |              |
   |              |             | enrich_sso |           |              |
   |              |             | _profiles()|           |              |
   |              |             |----------->|           |              |
   |              |             |            |           |              |
   |              |             |            | read SSO  |              |
   |              |             |            | token     |              |
   |              |             |            | cache     |              |
   |              |             |            |---------->|              |
   |              |             |            |           |              |
   |              |             |            |<----------|              |
   |              |             |            | token data|              |
   |              |             |            |           |              |
   |              |             |            | validate  |              |
   |              |             |            | token     |              |
   |              |             |            | expiry    |              |
   |              |             |            |           |              |
   |              |             |            | get role  |              |
   |              |             |            | credentials              |
   |              |             |            |------------------------>|
   |              |             |            |           |              |
   |              |             |            |<------------------------|
   |              |             |            |           |  credentials |
   |              |             |            |           |              |
   |              |             |            | enrich    |              |
   |              |             |            | profiles  |              |
   |              |             |            | with SSO  |              |
   |              |             |            | data      |              |
   |              |             |            |           |              |
   |              |             |<-----------|           |              |
   |              |             | enriched   |           |              |
   |              |             | profiles   |           |              |
   |              |             |            |           |              |
   |              |<------------|            |           |              |
   |              | result      |            |           |              |
   |              |             |            |           |              |
   |<-------------|             |            |           |              |
   |  200 OK      |             |            |           |              |
   |  profiles    |             |            |           |              |
   |  with SSO    |             |            |           |              |
   |  status      |             |            |           |              |
   |              |             |            |           |              |
```

## 5. POST /profiles/{name}/console-url Flow

```
Browser       API Server    Thread Pool    Handler      Credential     AWS STS
Extension                                                Provider       (HTTPS)
   |               |              |            |              |              |
   |  POST         |              |            |              |              |
   | /profiles/    |              |            |              |              |
   | prod/         |              |            |              |              |
   | console-url   |              |            |              |              |
   |-------------->|              |            |              |              |
   |               |              |            |              |              |
   |               | asyncio      |            |              |              |
   |               | .to_thread() |            |              |              |
   |               | timeout=15s  |            |              |              |
   |               |------------->|            |              |              |
   |               |              |            |              |              |
   |               |              | _handle_   |              |              |
   |               |              | open_      |              |              |
   |               |              | profile()  |              |              |
   |               |              |----------->|              |              |
   |               |              |            |              |              |
   |               |              |            | get          |              |
   |               |              |            | credentials  |              |
   |               |              |            | for profile  |              |
   |               |              |            |------------->|              |
   |               |              |            |              |              |
   |               |              |            |<-------------|              |
   |               |              |            | access_key,  |              |
   |               |              |            | secret_key,  |              |
   |               |              |            | session_token|              |
   |               |              |            |              |              |
   |               |              |            | generate     |              |
   |               |              |            | federation   |              |
   |               |              |            | URL          |              |
   |               |              |            |------------------------------>|
   |               |              |            |              |              |
   |               |              |            |<------------------------------|
   |               |              |            |              |  signin token|
   |               |              |            |              |              |
   |               |              |            | build console|              |
   |               |              |            | URL with     |              |
   |               |              |            | token        |              |
   |               |              |            |              |              |
   |               |              |<-----------|              |              |
   |               |              | {          |              |              |
   |               |              |   action:  |              |              |
   |               |              |   "consoleUrl",          |              |
   |               |              |   url: "https://...",    |              |
   |               |              |   color,   |              |              |
   |               |              |   icon     |              |              |
   |               |              | }          |              |              |
   |               |              |            |              |              |
   |               |<-------------|            |              |              |
   |               | result       |            |              |              |
   |               |              |            |              |              |
   |<--------------|              |            |              |              |
   |  200 OK       |              |            |              |              |
   |  console URL  |              |            |              |              |
   |               |              |            |              |              |
```

## 6. Error Handling Flow

```
Browser          API Server       Thread Pool      Handler
Extension
   |                 |                 |               |
   |  POST /profiles |                 |               |
   |---------------->|                 |               |
   |                 |                 |               |
   |                 | asyncio         |               |
   |                 | .wait_for()     |               |
   |                 | timeout=5s      |               |
   |                 |---------------->|               |
   |                 |                 |               |
   |                 |                 | handler call  |
   |                 |                 |-------------->|
   |                 |                 |               |
   |                 |                 |               X (exception)
   |                 |                 |               |
   |                 |                 |<--------------|
   |                 |                 | Exception     |
   |                 |                 |               |
   |                 |<----------------|               |
   |                 | catch exception |               |
   |                 |                 |               |
   |                 | log error       |               |
   |                 |                 |               |
   |<----------------|                 |               |
   |  200 OK         |                 |               |
   |  {              |                 |               |
   |    action:      |                 |               |
   |    "error",     |                 |               |
   |    message:     |                 |               |
   |    "Failed..."  |                 |               |
   |  }              |                 |               |
   |                 |                 |               |
```

## 7. Graceful Shutdown Flow

```
Service Manager    Signal Handler     API Server      Active Requests    Logger
      |                  |                 |                 |              |
      |  SIGTERM         |                 |                 |              |
      |----------------->|                 |                 |              |
      |                  |                 |                 |              |
      |                  |  log signal     |                 |              |
      |                  |----------------------------------------->        |
      |                  |                 |                 |              |
      |                  |  loop.stop()    |                 |              |
      |                  |---------------->|                 |              |
      |                  |                 |                 |              |
      |                  |                 |  wait for       |              |
      |                  |                 |  active requests|              |
      |                  |                 |  to complete    |              |
      |                  |                 |---------------->|              |
      |                  |                 |                 |              |
      |                  |                 |<----------------|              |
      |                  |                 |  (all done)     |              |
      |                  |                 |                 |              |
      |                  |                 |  lifespan       |              |
      |                  |                 |  shutdown       |              |
      |                  |                 |                 |              |
      |                  |                 |  log shutdown   |              |
      |                  |                 |----------------------------->  |
      |                  |                 |                 |              |
      |<-----------------|                 |                 |              |
      |  exit code 0     |                 |                 |              |
      |                  |                 |                 |              |
```

## Component Interactions Legend

### Key Components:

- **Browser Extension**: Firefox extension making HTTP requests
- **CORS Middleware**: FastAPI middleware validating origins
- **API Server**: Main FastAPI application (`api_server.py`)
- **Thread Pool**: Python's `asyncio.to_thread()` for sync-to-async bridging
- **Handler**: `AWSProfileBridgeHandler` (existing component)
- **Credential Provider**: Reads AWS credentials from filesystem
- **SSO Cache**: `~/.aws/sso/cache/` directory
- **File System**: `~/.aws/credentials` and `~/.aws/config`
- **AWS SSO API**: External AWS API for SSO token validation
- **AWS STS**: External AWS API for federation token generation
- **Logger**: Rotating file logger
- **Service Manager**: systemd (Linux) or launchd (macOS)
- **Signal Handler**: Graceful shutdown on SIGTERM/SIGINT

### Request Flow Pattern:

1. **Synchronous Path** (left to right): Browser → Middleware → API → Handler → AWS
2. **Asynchronous Bridging**: API uses `asyncio.to_thread()` to call sync handler methods
3. **Error Propagation** (right to left): Exception → Handler → Thread → API → Browser
4. **Logging** (crosscuts all): Every operation logs to rotating files

### Timing Characteristics:

- Health endpoint: < 1ms (no I/O)
- Profile list (fast): ~100ms (local file reads only)
- Profile list (enriched): 2-10s (includes SSO API calls)
- Console URL: 1-3s (includes AWS STS API call)

### Security Boundaries:

- **Network**: API binds to 127.0.0.1 only (no external access)
- **CORS**: Restricted to `moz-extension://*` origins
- **Credentials**: Never logged, passed directly to AWS APIs via HTTPS
- **Timeouts**: All operations have timeout protection
