# Screenshot Workflow for Firefox Submission

## Quick Start

```bash
# 1. Switch to demo credentials
./scripts/use-demo-credentials.sh

# 2. Restart the API server
./scripts/manage.sh restart

# 3. Take your screenshots in Firefox

# 4. Restore your real credentials
./scripts/restore-credentials.sh

# 5. Restart the API server again
./scripts/manage.sh restart
```

## Demo Organizations & Profiles

The demo credentials include:

### Acme Corp (Multi-environment)
- `acme-corp-production` (us-east-1)
- `acme-corp-staging` (us-west-2)
- `acme-corp-development` (eu-west-1)

### Globex (Production + Dev)
- `globex-production` (us-east-1)
- `globex-development` (us-west-2)

### Initech (Production + Staging)
- `initech-production` (ap-southeast-1)
- `initech-staging` (ap-southeast-2)

### Individual Accounts
- `personal-sandbox` (us-east-1)
- `demo-account` (eu-central-1)

## Screenshot Tips

1. **Show organization grouping**: The profiles are named to demonstrate the organization detection feature
2. **Show multiple regions**: Different profiles use different AWS regions
3. **Show search functionality**: Search for "acme" or "production"
4. **Show favorites**: Star a few profiles to demonstrate favorites
5. **Show container isolation**: Open multiple profiles to show separate containers

## Important Notes

- ⚠️ Demo credentials use AWS example keys (won't actually work)
- ⚠️ Your real credentials are safely backed up to `~/.aws-backup-*`
- ⚠️ Remember to restore credentials after screenshots
- ⚠️ Restart the API server after switching credentials
