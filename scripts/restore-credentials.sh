#!/bin/bash
# Script to restore original credentials after screenshots

set -e

# Find the most recent backup
BACKUP_DIR=$(ls -td "$HOME"/.aws-backup-* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo "❌ No backup found!"
    echo "Your credentials backup should be in ~/.aws-backup-*"
    exit 1
fi

echo "🔄 Restoring credentials from: $BACKUP_DIR"

# Remove demo credentials
rm -rf "$HOME/.aws"

# Restore backup
cp -r "$BACKUP_DIR" "$HOME/.aws"

echo "✅ Original credentials restored!"
echo ""
echo "💡 You can safely delete the backup:"
echo "    rm -rf $BACKUP_DIR"
