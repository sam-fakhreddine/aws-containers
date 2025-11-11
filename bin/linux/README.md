# Native Messaging Host Binary

This directory contains the compiled standalone executable for the AWS Profile Containers native messaging host on Linux.

## What is this?

The native messaging host is a self-contained binary that:
- Reads AWS credentials from `~/.aws/credentials` and `~/.aws/config`
- Generates AWS Console federation URLs
- Handles SSO profile authentication
- Communicates with the Firefox extension via native messaging protocol

## Building

To build the standalone executable:

```bash
# From the project root
./build-native-host.sh
```

This will create `aws_profile_bridge` in this directory (~15-20MB), which includes:
- Python runtime
- boto3 and botocore libraries
- All required dependencies

## Installation

The executable is installed automatically by `install.sh` to:
```
~/.local/bin/aws_profile_bridge
```

## Platform-Specific Builds

- **Linux**: `bin/linux/aws_profile_bridge`
- **macOS Intel**: `bin/darwin-x86_64/aws_profile_bridge`
- **macOS ARM64**: `bin/darwin-arm64/aws_profile_bridge`

## Pre-built Binaries

Pre-built executables are available in GitHub Releases:
- https://github.com/sam-fakhreddine/aws-containers/releases

## Benefits of Standalone Executable

- No Python installation required on user systems
- No dependency management issues
- Single binary to distribute
- Consistent behavior across systems
- Works offline (all dependencies bundled)

## For Developers

If you prefer to use the Python script directly instead of the compiled binary:

```bash
# Install Python dependencies
pip install -r native-messaging/requirements.txt

# The install.sh script will use the Python script if no binary is found
./install.sh
```

See [../native-messaging/README.md](../../native-messaging/README.md) for the Python implementation details.
