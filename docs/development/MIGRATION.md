# Repository Migration Guide

## Quick Migration (One Command)

```bash
./migrate-to-new-repo.sh
```

The script will prompt you for:
1. New repository URL
2. Migration option (full history vs clean history)

## Manual Migration

### Option 1: Keep Full History

```bash
# Create new repo on GitHub first, then:
NEW_REPO="https://github.com/YOUR-USERNAME/aws-profile-containers.git"

git remote add new-origin "$NEW_REPO"
git push -u new-origin claude/create-custom-version-011CUziwk8XDKS7mdCZxmaqv:main

# Clean up
git remote remove origin
git remote rename new-origin origin
git branch -m main
```

### Option 2: Clean History (Recommended)

```bash
# Create new repo on GitHub first, then:
NEW_REPO="https://github.com/YOUR-USERNAME/aws-profile-containers.git"

# Create orphan branch with clean history
git checkout --orphan clean-main
git add -A
git commit -m "Initial commit: AWS Profile Containers

Firefox extension for managing AWS profiles from credentials file in isolated containers.

Features:
- Native messaging integration for reading ~/.aws/credentials
- Popup UI for AWS profile selection with expiration monitoring
- Automatic environment-based color coding
- Container isolation per AWS profile
- Integration with existing shell functions"

# Push to new repo
git remote add new-origin "$NEW_REPO"
git push -u new-origin clean-main:main

# Clean up
git remote remove origin
git remote rename new-origin origin
git checkout main
git branch -D claude/create-custom-version-011CUziwk8XDKS7mdCZxmaqv clean-main
```

## After Migration

1. Update remote URLs in documentation if needed
2. Configure GitHub repo settings:
   - Add description: "Firefox extension for managing AWS profiles in isolated containers"
   - Add topics: `firefox`, `aws`, `containers`, `firefox-extension`, `native-messaging`
   - Set up branch protection for `main` (optional)

3. Verify everything works:
   ```bash
   git pull
   ./install.sh
   ```

## Differences Between Options

| Aspect | Full History | Clean History |
|--------|-------------|---------------|
| Commit history | Shows original Granted Containers commits + yours | Only your single initial commit |
| Git size | Larger (includes all original commits) | Smaller |
| Attribution | Visible in git log | Only in LICENSE file |
| Recommended | If you want full transparency | If you want a fresh start |

## Creating New GitHub Repo

### Via GitHub Web UI
1. Go to https://github.com/new
2. Repository name: `aws-profile-containers`
3. Description: "Firefox extension for managing AWS profiles in isolated containers"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"
7. Copy the repository URL

### Via GitHub CLI
```bash
gh repo create aws-profile-containers \
  --public \
  --description "Firefox extension for managing AWS profiles in isolated containers"
```

This gives you the repo URL to use in migration.

## Troubleshooting

### "Repository not found"
- Make sure you created the repo on GitHub first
- Check that you have the correct URL
- Verify you have push access to the repository

### "Failed to push"
- If using HTTPS, check your GitHub credentials
- If using SSH, verify your SSH keys are set up: `ssh -T git@github.com`

### "Branch already exists"
- If the repo isn't empty, you may need to force push (be careful!)
- Or delete the existing branch in the new repo first

### Want to start over?
```bash
git remote remove new-origin
git checkout claude/create-custom-version-011CUziwk8XDKS7mdCZxmaqv
git branch -D clean-main  # if you created it
```
