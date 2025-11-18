# GitHub Workflows Documentation

This directory contains automated CI/CD workflows for the AWS Profile Containers Firefox extension.

## Workflows Overview

### 🚀 [release.yml](./release.yml)
**Trigger:** Push to `main` branch
**Purpose:** Automated release pipeline

This is the main release workflow that runs on every push to main. It:
1. **Tests & Lints** - Validates code quality
2. **E2E Tests** - Runs Playwright tests to ensure quality
3. **Builds Native Hosts** - Creates executables for Linux, macOS Intel, and macOS ARM64
4. **Semantic Release** - Automatically:
   - Analyzes commits using [Conventional Commits](https://www.conventionalcommits.org/)
   - Determines version bump (patch/minor/major)
   - Generates changelog
   - Creates GitHub release
   - Updates package.json and CHANGELOG.md
5. **Builds Firefox Extension** - Creates production-ready .xpi file
6. **Uploads Assets** - Attaches all binaries to the GitHub release

**Semantic Versioning:**
- `fix:` commits → patch release (0.0.x)
- `feat:` commits → minor release (0.x.0)
- `BREAKING CHANGE:` or `feat!:`/`fix!:` → major release (x.0.0)

### 🔄 [build-extension.yml](./build-extension.yml) (CI)
**Trigger:** Pull requests to `main`, manual dispatch
**Purpose:** Continuous integration for PRs

Ensures code quality before merging:
1. **Lint & Test** - Runs linter (ESLint) and unit tests (Jest)
2. **E2E Tests** - Runs Playwright tests in Firefox
   - Builds extension for testing
   - Uploads test reports and screenshots on failure
   - Firefox-only (extension uses Firefox containers)
3. **Build Extension** - Builds production extension to verify no errors
4. Uploads dev build as artifact for testing

### 🔒 [security.yml](./security.yml)
**Trigger:** Push to `main`, PRs, daily at 2 AM UTC, manual dispatch
**Purpose:** Security scanning

Provides automated security analysis:
1. **CodeQL Analysis** - Scans JavaScript and Python for vulnerabilities
2. **NPM Audit** - Checks dependencies for known security issues

### 🔍 [dependency-review.yml](./dependency-review.yml)
**Trigger:** Pull requests to `main`
**Purpose:** Dependency change validation

Reviews dependency changes in PRs:
- Identifies new dependencies
- Flags known vulnerabilities
- Posts summary comment in PR
- Fails if moderate+ severity issues found

### 🎭 [e2e.yml](./e2e.yml)
**Trigger:** Daily at 3 AM UTC, manual dispatch
**Purpose:** Comprehensive E2E testing

Provides extensive end-to-end testing across platforms:
- **Test Matrix** - Runs on Ubuntu and macOS with Firefox
- **Scheduled Runs** - Daily automated testing
- **Failure Reporting** - Auto-creates GitHub issues on scheduled failures
- **Artifacts** - Uploads test reports, screenshots, and videos
- **Firefox-only** - Tests Firefox exclusively (extension uses Firefox containers)

### 🎯 [build-release.yml](./build-release.yml) (Manual)
**Trigger:** Manual workflow dispatch only
**Purpose:** Emergency/manual releases

Same as automated release workflow but requires manual trigger. Useful for:
- Testing release process
- Emergency releases
- Releases outside normal flow

## Best Practices Implemented

### ✅ Security
- **Minimal permissions** - Each workflow only has permissions it needs
- **CodeQL scanning** - Automated security analysis
- **Dependency review** - Prevents vulnerable dependencies
- **NPM audit** - Regular dependency security checks

### ✅ Performance
- **Caching** - npm dependencies cached between runs
- **Concurrency control** - Prevents multiple releases/CI runs
- **Parallel jobs** - Native hosts build in parallel
- **Fail-fast strategies** - Quick failure detection

### ✅ Reliability
- **Job dependencies** - Proper ordering (test → build → release)
- **Conditional execution** - Steps only run when needed
- **Artifact retention** - 90 days for releases, 30 for dev builds
- **Build validation** - Verifies output before uploading

### ✅ Developer Experience
- **Clear naming** - Descriptive job and step names
- **Job summaries** - Rich output in GitHub UI
- **Artifact uploads** - Easy access to builds
- **Auto-versioning** - No manual version management

### ✅ Testing
- **E2E Tests** - Playwright tests for browser automation
- **Firefox-focused** - Tests run on Firefox (extension's target platform)
- **Cross-platform** - Tests on Ubuntu and macOS
- **Test artifacts** - Screenshots, videos, and HTML reports
- **Scheduled testing** - Daily automated E2E runs

## Making a Release

### Automatic (Recommended)
Just merge to `main` with properly formatted commits:

```bash
git commit -m "feat: add new profile switcher"  # Minor release
git commit -m "fix: correct URL parsing"        # Patch release
git commit -m "feat!: redesign UI"              # Major release
```

The release workflow will:
1. Determine version automatically
2. Update CHANGELOG.md
3. Create GitHub release
4. Build and upload all assets

### Manual (Emergency Only)
1. Go to Actions → Manual Release
2. Click "Run workflow"
3. Select release type
4. Click "Run workflow"

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes

**Breaking changes:**
Add `!` after type or `BREAKING CHANGE:` in footer for major version bump.

## Monitoring

### Workflow Status
Check workflow runs: [Actions tab](../../actions)

### Security Alerts
Check security: [Security tab](../../security)

### Releases
View releases: [Releases page](../../releases)

## Troubleshooting

### Release Not Created
- Check commit messages follow conventional format
- Verify `main` branch protection rules allow pushes
- Check GitHub token permissions
- Review workflow logs in Actions tab

### Build Failures
- Check Node.js version compatibility (v24)
- Verify all tests pass locally
- Review build logs for specific errors
- Ensure dependencies install correctly

### Security Scan Failures
- Review CodeQL alerts in Security tab
- Run `npm audit` locally to check dependencies
- Update vulnerable packages
- Add suppressions only if false positives

### E2E Test Failures
- Download test artifacts from Actions tab
- View HTML report in `playwright-report/index.html`
- Check screenshots for visual issues
- Watch videos to see test execution
- Run locally with `npm run test:e2e:debug`

## Configuration Files

- **`.releaserc.json`** - Semantic-release configuration
- **`package.json`** - Project metadata and version
- **`CHANGELOG.md`** - Auto-generated changelog
- **`playwright.config.ts`** - Playwright E2E test configuration

## Running Tests Locally

### Unit Tests
```bash
npm test                    # Run Jest tests
npm run test:perf          # Run performance tests
```

### E2E Tests
```bash
npm run test:e2e           # Run all Playwright tests
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:headed    # Run with visible browser
npm run test:e2e:debug     # Debug mode
npm run test:e2e:report    # View last test report
```

### All Tests
```bash
npm run test:all           # Run both unit and E2E tests
```

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Release](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [CodeQL](https://codeql.github.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
