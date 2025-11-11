# AWS Profile Containers Documentation

Welcome to the AWS Profile Containers documentation! This Firefox extension helps you manage multiple AWS accounts securely using isolated browser containers.

![AWS Console Containers Logo](../aws-console-containers.png)

## What is AWS Profile Containers?

AWS Profile Containers is a Firefox extension that reads your AWS credentials file and opens AWS profiles in separate isolated containers with automatic AWS Console federation. Each AWS profile gets its own container, preventing cookie and session contamination between accounts.

## Key Features

- **AWS Console Federation**: Automatically generates authenticated console URLs
- **Container Isolation**: Each AWS profile opens in its own Firefox container
- **Automatic Profile Detection**: Reads profiles from `~/.aws/credentials` and `~/.aws/config`
- **AWS IAM Identity Center (SSO)**: Full support for SSO profiles
- **Credential Monitoring**: Shows credential expiration status
- **Smart Organization**: Favorites, recent profiles, and search/filter capabilities
- **Region Selection**: Choose AWS region before opening console
- **Auto Color Coding**: Environment-based colors (production=red, dev=green, etc.)

## Quick Links

### Getting Started
- [Quick Start Guide](getting-started/quick-start.md) - Get up and running in minutes
- [Installation Guide](getting-started/installation.md) - Comprehensive installation instructions
- [First Steps](getting-started/first-steps.md) - What to do after installation

### User Guide
- [Features Overview](user-guide/features.md) - Detailed feature descriptions
- [Usage Guide](user-guide/usage.md) - How to use the extension
- [Working with Profiles](user-guide/profiles.md) - Managing AWS profiles
- [Container Management](user-guide/containers.md) - Managing Firefox containers
- [Troubleshooting](user-guide/troubleshooting.md) - Common issues and solutions

### Security
- [Security Overview](security/overview.md) - How we handle your credentials
- [Privacy Policy](security/privacy.md) - What data we collect (spoiler: none)
- [Best Practices](security/best-practices.md) - Security recommendations

### Development
- [Architecture](development/architecture.md) - How the extension works
- [Contributing](development/contributing.md) - How to contribute
- [Building from Source](development/building.md) - Build instructions
- [Testing](development/testing.md) - Running tests

### API Reference
- [Native Messaging API](api/native-messaging.md) - Native messaging protocol
- [Extension API](api/extension-api.md) - Extension interfaces

## Platform Support

- **Firefox**: 60+ (tested on latest)
- **Operating Systems**:
  - Linux (fully supported)
  - macOS Intel & Apple Silicon (fully supported)
  - Windows (planned for future release)

## Security Notice

This extension reads sensitive AWS credentials from your local filesystem. Please review our [Security Documentation](security/overview.md) before installing.

## Support

- **GitHub**: [sam-fakhreddine/aws-containers](https://github.com/sam-fakhreddine/aws-containers)
- **Issues**: [Report a bug or request a feature](https://github.com/sam-fakhreddine/aws-containers/issues)
- **License**: MIT License

## Table of Contents

```{toctree}
:maxdepth: 2
:caption: Getting Started

getting-started/quick-start
getting-started/installation
getting-started/first-steps
```

```{toctree}
:maxdepth: 2
:caption: User Guide

user-guide/features
user-guide/usage
user-guide/profiles
user-guide/containers
user-guide/troubleshooting
```

```{toctree}
:maxdepth: 2
:caption: Security

security/overview
security/privacy
security/best-practices
```

```{toctree}
:maxdepth: 2
:caption: Development

development/architecture
development/contributing
development/building
development/testing
```

```{toctree}
:maxdepth: 2
:caption: API Reference

api/native-messaging
api/extension-api
```
