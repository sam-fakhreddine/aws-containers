#!/bin/bash
# Script to migrate AWS Profile Containers to a new repository

set -e

echo "=========================================="
echo "AWS Profile Containers - Repo Migration"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "aws-profile-containers" package.json; then
    echo "Error: Not in aws-profile-containers directory"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Prompt for new repo URL
echo "Enter the new repository URL:"
echo "Examples:"
echo "  https://github.com/YOUR-USERNAME/aws-profile-containers.git"
echo "  git@github.com:YOUR-USERNAME/aws-profile-containers.git"
echo ""
read -p "New repo URL: " NEW_REPO_URL

if [ -z "$NEW_REPO_URL" ]; then
    echo "Error: Repository URL is required"
    exit 1
fi

echo ""
echo "Choose migration option:"
echo "1) Keep full git history (shows original commits + your changes)"
echo "2) Clean history (only your commits, no original Granted Containers history)"
echo ""
read -p "Option (1 or 2): " OPTION

if [ "$OPTION" = "1" ]; then
    echo ""
    echo "=========================================="
    echo "Option 1: Migrating with full history"
    echo "=========================================="
    echo ""

    # Add new remote
    echo "Adding new remote..."
    git remote add new-origin "$NEW_REPO_URL" 2>/dev/null || git remote set-url new-origin "$NEW_REPO_URL"

    # Push current branch as main to new repo
    echo "Pushing to new repository..."
    git push -u new-origin "$CURRENT_BRANCH":main

    echo ""
    echo "✓ Repository migrated successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Verify at: ${NEW_REPO_URL%.git}"
    echo "2. Run: git remote remove origin"
    echo "3. Run: git remote rename new-origin origin"
    echo "4. Run: git branch -m main"
    echo ""

elif [ "$OPTION" = "2" ]; then
    echo ""
    echo "=========================================="
    echo "Option 2: Migrating with clean history"
    echo "=========================================="
    echo ""

    # Create orphan branch with clean history
    echo "Creating clean history branch..."
    git checkout --orphan clean-main

    # Stage all files
    git add -A

    # Create single initial commit
    echo "Creating initial commit..."
    git commit -m "Initial commit: AWS Profile Containers

Firefox extension for managing AWS profiles from credentials file in isolated containers.

Features:
- Native messaging integration for reading ~/.aws/credentials
- Popup UI for AWS profile selection with expiration monitoring
- Automatic environment-based color coding (prod=red, dev=green, etc.)
- Container isolation per AWS profile
- Integration with existing shell functions and credential management

Technical:
- Built with TypeScript, React, and Firefox WebExtensions API
- Python bridge for filesystem access via native messaging
- Supports ext+container:// protocol for CLI integration"

    # Add new remote
    echo "Adding new remote..."
    git remote add new-origin "$NEW_REPO_URL" 2>/dev/null || git remote set-url new-origin "$NEW_REPO_URL"

    # Push to new repo
    echo "Pushing to new repository..."
    git push -u new-origin clean-main:main

    echo ""
    echo "✓ Repository migrated successfully with clean history!"
    echo ""
    echo "Next steps:"
    echo "1. Verify at: ${NEW_REPO_URL%.git}"
    echo "2. Run: git remote remove origin"
    echo "3. Run: git remote rename new-origin origin"
    echo "4. Run: git checkout main"
    echo "5. Run: git branch -D $CURRENT_BRANCH clean-main"
    echo ""

else
    echo "Invalid option. Exiting."
    exit 1
fi

echo "=========================================="
echo "Optional: Clean up local repository"
echo "=========================================="
echo ""
echo "Run these commands to complete the migration:"
echo ""
echo "git remote remove origin"
echo "git remote rename new-origin origin"
if [ "$OPTION" = "2" ]; then
    echo "git checkout main"
    echo "git branch -D $CURRENT_BRANCH clean-main"
else
    echo "git branch -m main"
fi
echo ""
echo "Done! Your repository is now at: $NEW_REPO_URL"
