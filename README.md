<p align="center">
  <img src="docs/assets/aws-console-containers.png" alt="AWS Console Containers Logo" width="200"/>
</p>

# AWS Profile Containers

A Firefox extension that reads your AWS credentials file and opens AWS profiles in separate isolated containers with automatic AWS Console federation.

**Key Features:**
- 🔐 Automatic AWS Console federation with your credentials
- 🔒 Each profile in its own isolated Firefox container
- 📁 Auto-detection of profiles from `~/.aws/credentials` and `~/.aws/config`
- 🔑 Full AWS IAM Identity Center (SSO) support
- ⭐ Favorites and recent profiles tracking
- 🌍 Region selection for console access

## ⚠️ Security Notice

**This extension reads sensitive AWS credentials from your local filesystem.**

- ✅ **Read** `~/.aws/credentials` (local only)
- ✅ **Calls** AWS Federation API (official AWS service)
- ❌ **Never stores** credentials in browser storage
- ❌ **Never transmits** credentials to any server except AWS
- 📖 **[Read full security documentation](docs/security/security-root.md)** before installing

## Quick Start

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install and start the API server
./scripts/install-api-service.sh

# Build the extension
yarn install
yarn build
```

**Load Extension in Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/manifest.json`

📖 **[Complete Installation Guide](docs/getting-started/install-root.md)**

## Documentation

### Getting Started
- 📘 [Installation Guide](docs/getting-started/install-root.md) - Detailed setup instructions
- 📘 [Requirements & Compatibility](docs/getting-started/requirements.md) - System requirements
- 📘 [Configuration](docs/getting-started/configuration.md) - AWS credentials and token setup
- 📘 [Quick Start Guide](docs/getting-started/quick-start.md) - Fast track to get running
- 📘 [First Steps](docs/getting-started/first-steps.md) - What to do after installation

### User Guide
- 📗 [Features](docs/user-guide/features.md) - Complete feature list
- 📗 [Usage Guide](docs/user-guide/usage.md) - How to use the extension
- 📗 [Managing Profiles](docs/user-guide/profiles.md) - Working with AWS profiles
- 📗 [Container Management](docs/user-guide/containers.md) - Understanding containers
- 📗 [Troubleshooting](docs/user-guide/troubleshooting.md) - Common issues and solutions

### Security & Privacy
- 🔒 [Security Overview](docs/security/security-root.md) - How we protect your credentials
- 🔒 [Privacy Policy](docs/security/privacy.md) - What data we collect (spoiler: none)
- 🔒 [Best Practices](docs/security/best-practices.md) - Recommended security practices

### Development
- 🔧 [Architecture](docs/development/architecture.md) - How the extension works
- 🔧 [Building from Source](docs/development/building.md) - Development setup
- 🔧 [Contributing](docs/development/contributing.md) - How to contribute
- 🔧 [Testing](docs/development/testing.md) - Running tests

### Reference
- 📚 [Extension API](docs/api/extension-api.md) - API reference
- 📚 [Token Authentication](docs/TOKEN_AUTHENTICATION.md) - Token system details
- 📚 [Full Documentation Index](docs/index.md) - All documentation

## How It Works

The extension uses a local HTTP API server that bridges between Firefox and your AWS credentials:

```
Firefox Extension  →  API Server (localhost:10999)  →  ~/.aws/credentials
                   ←  AWS Console URL              ←  AWS Federation API
```

- Credentials stay on your machine (only sent to AWS's official API)
- API server binds to localhost only
- Token-based authentication between extension and server
- Each profile opens in an isolated Firefox container

📖 **[Detailed Architecture Documentation](docs/development/architecture.md)**

## Requirements

- **Firefox**: Version 60+ (latest recommended)
- **Python**: 3.12+
- **Operating Systems**: macOS, Linux (Windows via WSL2)
- **For Building**: Node.js 22.14.0+ or 24.10.0+, Yarn

📖 **[Complete Requirements](docs/getting-started/requirements.md)**

## Support

Having issues? Check these resources:

1. 📖 [Troubleshooting Guide](docs/user-guide/troubleshooting.md)
2. 🔍 Verify API server: `curl http://localhost:10999/health`
3. 📋 Check logs: `tail -f ~/.aws/logs/aws_profile_bridge_api.log`
4. 🐛 [Report an issue](https://github.com/sam-fakhreddine/aws-containers/issues)

📖 **[Complete Support Guide](SUPPORT.md)**

## Contributing

Contributions welcome! Please see:

- 📖 [Contributing Guide](docs/development/contributing.md)
- 📖 [Code of Conduct](CODE_OF_CONDUCT.md)
- 🏷️ [Good First Issues](https://github.com/sam-fakhreddine/aws-containers/labels/good%20first%20issue)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- **Repository**: https://github.com/sam-fakhreddine/aws-containers
- **Issues**: https://github.com/sam-fakhreddine/aws-containers/issues
- **Releases**: https://github.com/sam-fakhreddine/aws-containers/releases
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

Made with ☕ by developers who were tired of logging in and out of AWS accounts.
