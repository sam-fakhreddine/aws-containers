# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2025-01-XX

### Added
- AWS Profile Containers Firefox extension
- Automatic AWS Console federation with credentials
- Isolated Firefox containers per AWS profile
- Auto-detection of profiles from ~/.aws/credentials and ~/.aws/config
- Full AWS IAM Identity Center (SSO) support
- Favorites and recent profiles tracking
- Region selection for console access
- Local HTTP API server for credential bridging
- Token-based authentication between extension and server
- Automatic semantic versioning with semantic-release
- Version synchronization between package.json and manifest.json

### Security
- Credentials stay local (only sent to AWS official API)
- API server binds to localhost only
- No credential storage in browser
- No credential transmission except to AWS