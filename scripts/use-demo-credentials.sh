#!/bin/bash
# Script to temporarily use demo credentials for screenshots

set -e

BACKUP_DIR="$HOME/.aws-backup-$(date +%s)"
DEMO_CREDS="$(dirname "$0")/../demo-credentials"
DEMO_CONFIG="$(dirname "$0")/../demo-config"

echo "📸 Setting up demo credentials for screenshots..."

# Backup existing credentials
if [ -d "$HOME/.aws" ]; then
    echo "💾 Backing up existing credentials to: $BACKUP_DIR"
    cp -r "$HOME/.aws" "$BACKUP_DIR"
fi

# Create .aws directory if it doesn't exist
mkdir -p "$HOME/.aws"

# Copy demo files
echo "📋 Copying demo credentials..."
cp "$DEMO_CREDS" "$HOME/.aws/credentials"
cp "$DEMO_CONFIG" "$HOME/.aws/config"

echo "✅ Demo credentials active!"
echo ""
echo "Organizations available:"
echo "  - acme-corp (production, staging, development)"
echo "  - globex (production, development)"
echo "  - initech (production, staging)"
echo "  - personal-sandbox"
echo "  - demo-account"
echo ""
echo "⚠️  To restore your real credentials, run:"
echo "    ./scripts/restore-credentials.sh"
echo ""
echo "Backup location: $BACKUP_DIR"
