# Requirements & Compatibility

This document outlines the system requirements and compatibility information for AWS Profile Containers.

## System Requirements

### For End Users (Running the Extension)

**Minimum Requirements:**
- **Browser**: Firefox 60 or later (latest version recommended)
- **Python**: 3.12 or later (for API server)
- **Package Manager**: `uv` (automatically installed by the install script if missing)
- **Operating System**: macOS or Linux

**Recommended:**
- Firefox latest stable version
- Python 3.12+
- At least 100MB free disk space
- Active internet connection for AWS API calls

### For Developers (Building from Source)

In addition to the end-user requirements:

- **Node.js**: Version 22.14.0+ or 24.10.0+
- **Yarn**: Latest stable version (v1 or v3+)
- **Git**: For cloning the repository
- **Development Tools**:
  - Build tools for your platform (gcc, make on Linux/macOS)
  - Python development headers

## Browser Compatibility

### Firefox

| Version | Status | Notes |
|---------|--------|-------|
| 60+ | ✅ Supported | Minimum required version |
| 100+ | ✅ Recommended | Full feature support |
| Latest | ✅ Recommended | Best performance and security |

**Required Firefox Features:**
- Container Tabs API (containers)
- Native Messaging (for future versions)
- Web Extensions Manifest V2

**Why Firefox Only?**
- Firefox provides the Container Tabs API, which is essential for profile isolation
- Chrome/Edge do not support multi-account container tabs
- This is a fundamental architectural requirement

## Operating System Compatibility

### macOS

| Version | Status | Architecture | Notes |
|---------|--------|--------------|-------|
| macOS 11 (Big Sur)+ | ✅ Fully Supported | Intel & Apple Silicon | Recommended |
| macOS 10.15 (Catalina) | ⚠️ Limited Testing | Intel | May work but not officially tested |
| macOS 10.14 and earlier | ❌ Not Supported | Intel | Python 3.12 compatibility issues |

**macOS-Specific Requirements:**
- **Service Management**: Uses `launchd` for API server auto-start
- **Permissions**: May require granting Terminal/IDE permission to access `~/.aws/`
- **Python**: Install via Homebrew recommended: `brew install python@3.12`

### Linux

| Distribution | Status | Notes |
|-------------|--------|-------|
| Ubuntu 22.04+ | ✅ Fully Supported | Recommended |
| Debian 11+ | ✅ Fully Supported | |
| Fedora 36+ | ✅ Fully Supported | |
| Arch Linux | ✅ Fully Supported | |
| CentOS/RHEL 8+ | ✅ Supported | Requires EPEL for Python 3.12 |
| Other systemd distros | ✅ Likely Compatible | Uses systemd for service management |
| Non-systemd distros | ⚠️ Manual Setup Required | API server must be started manually |

**Linux-Specific Requirements:**
- **Service Management**: Uses `systemd` (user services)
- **Python**: Most distributions: `apt install python3.12` or equivalent
- **Desktop Environment**: Any (GNOME, KDE, XFCE, etc.)

### Windows

| Version | Status | Notes |
|---------|--------|-------|
| Windows 10/11 | ❌ Not Currently Supported | Planned for future release |

**Why Not Windows?**
- API server installation scripts are Unix-specific
- Service management uses systemd/launchd
- Path handling assumes Unix-style paths

**Workaround for Windows Users:**
- Use WSL2 (Windows Subsystem for Linux)
- Run Firefox in WSL2 environment
- API server runs in WSL2

## Python Version Compatibility

| Version | Status | Notes |
|---------|--------|-------|
| 3.12+ | ✅ Required | Minimum version |
| 3.13 | ✅ Supported | Latest version |
| 3.11 and earlier | ❌ Not Supported | Missing required features |

**Python Dependencies:**
- FastAPI (web framework)
- uvicorn (ASGI server)
- boto3 (AWS SDK)
- pydantic (data validation)

All Python dependencies are automatically managed by `uv`.

## Node.js Version Compatibility (Development Only)

| Version | Status | Notes |
|---------|--------|-------|
| 24.10.0+ | ✅ Recommended | Latest LTS |
| 22.14.0+ | ✅ Supported | Previous LTS |
| 20.x | ⚠️ May Work | Not tested |
| 18.x and earlier | ❌ Not Supported | Missing required features |

**Why These Versions?**
- Modern JavaScript features (ESM, top-level await)
- TypeScript 5.x compatibility
- Build tool requirements (Vite, esbuild)

## Network Requirements

### Outbound Connections

The extension and API server require outbound HTTPS access to:

| Service | Hostname | Port | Purpose |
|---------|----------|------|---------|
| AWS STS | `sts.amazonaws.com` | 443 | Console federation |
| AWS STS (Regional) | `sts.*.amazonaws.com` | 443 | Regional STS endpoints |
| AWS SSO | `*.awsapps.com` | 443 | SSO authentication |

### Local Connections

| Service | Address | Port | Purpose |
|---------|---------|------|---------|
| API Server | `127.0.0.1` | 10999 | Extension ↔ API server |

**Firewall Configuration:**
- No inbound firewall rules needed (API server binds to localhost only)
- Outbound HTTPS (443) must be allowed to AWS services
- No proxy support currently (direct connection required)

## Disk Space Requirements

| Component | Size | Location |
|-----------|------|----------|
| Extension Source | ~2 MB | Browser profile |
| API Server | ~50 MB | `~/.local/bin/` and `~/.local/share/uv/` |
| Logs | ~1-10 MB | `~/.aws/logs/` |
| **Total** | **~60 MB** | |

**Log Rotation:**
- Logs are automatically rotated
- Maximum 10 MB per log file
- 3 backup files kept

## Memory Requirements

| Component | Typical Usage | Peak Usage |
|-----------|---------------|------------|
| Extension | ~20 MB | ~50 MB |
| API Server | ~40 MB | ~100 MB |

**Performance Notes:**
- Extension memory usage scales with number of profiles (~100 KB per profile)
- API server is lightweight (FastAPI/uvicorn)
- No significant CPU usage during idle

## AWS Requirements

### AWS Account

- Active AWS account(s)
- Valid credentials (access keys or SSO)
- No specific IAM permissions required on credentials (federation is handled by AWS STS)

### AWS Services

The extension uses these AWS services:

| Service | Purpose | Cost |
|---------|---------|------|
| AWS STS | Console federation | Free (within AWS Free Tier) |
| AWS SSO | SSO authentication | Free |

**No Additional Costs:**
- Using this extension does not incur AWS charges beyond normal console usage
- STS GetFederationToken calls are within Free Tier limits

## Compatibility Matrix

Quick reference for common setups:

| Setup | Compatibility | Notes |
|-------|---------------|-------|
| **macOS + Firefox Latest + Python 3.12** | ✅ Perfect | Recommended setup |
| **Ubuntu 22.04 + Firefox Latest + Python 3.12** | ✅ Perfect | Recommended setup |
| **Fedora + Firefox + Python 3.12** | ✅ Excellent | Fully supported |
| **macOS 10.14 + Python 3.11** | ❌ Won't Work | Python too old |
| **Windows 11 + Firefox** | ❌ Not Supported | Use WSL2 |
| **Linux + Python 3.11** | ❌ Won't Work | Upgrade Python |
| **Chrome/Edge on any OS** | ❌ Won't Work | No container API |

## Checking Your System

### Quick Compatibility Check

Run these commands to verify your system meets requirements:

```bash
# Check Firefox version
firefox --version

# Check Python version
python3 --version

# Check if uv is installed (optional - install script adds it)
uv --version

# For developers: Check Node.js version
node --version
yarn --version
```

### Expected Output

```bash
$ firefox --version
Mozilla Firefox 120.0

$ python3 --version
Python 3.12.0

$ node --version  # Developers only
v22.14.0
```

## Upgrading Components

### Upgrading Python

**macOS (Homebrew):**
```bash
brew upgrade python@3.12
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.12
```

**Fedora:**
```bash
sudo dnf upgrade python3.12
```

### Upgrading Firefox

- Use your system's package manager or
- Download from [mozilla.org](https://www.mozilla.org/firefox)

### Upgrading Node.js (Developers)

**Using nvm (recommended):**
```bash
nvm install 22
nvm use 22
```

**Using package manager:**
```bash
# macOS
brew upgrade node

# Ubuntu/Debian
sudo apt install nodejs

# Fedora
sudo dnf upgrade nodejs
```

## Troubleshooting Compatibility Issues

### Python Version Too Old

**Error:** `Python 3.12 or later is required`

**Solution:** Upgrade Python using the instructions above

### Firefox Too Old

**Error:** Extension doesn't load or features missing

**Solution:** Update Firefox to latest version

### Operating System Not Supported

**Error:** Installation script fails

**Solution:**
- Linux: Ensure systemd is available
- Windows: Use WSL2
- macOS: Ensure version 11+

## Related Documentation

- [Installation Guide](install-root.md)
- [Configuration Guide](configuration.md)
- [Troubleshooting](../user-guide/troubleshooting.md)
- [Building from Source](../development/building.md)
