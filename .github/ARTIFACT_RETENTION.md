# Artifact Retention Policy

This document explains the retention periods for artifacts in our GitHub Actions workflows.

## Retention Periods

### 90 Days - Release Artifacts
**Workflows:** `release.yml`, `build-release.yml`

- Native host binaries (Linux, macOS Intel, macOS ARM64)
- Production Firefox extension builds
- Release-tagged artifacts

**Rationale:** Release artifacts need longer retention as they represent production builds that users may need to reference or download even after newer releases. 90 days provides a reasonable window for troubleshooting and rollback scenarios.

### 30 Days - Development & Test Artifacts
**Workflows:** `build-extension.yml` (CI), `e2e.yml`

- PR build artifacts
- Development extension builds
- E2E test reports, screenshots, and videos
- Playwright test results

**Rationale:** Development artifacts are temporary and primarily useful during active development and code review. 30 days provides sufficient time for PR review cycles while managing storage costs. E2E tests run daily, so keeping 30 days of history is more than adequate for debugging trends.

## Modifying Retention Periods

To change retention periods, update the `retention-days` parameter in the relevant workflow files:

```yaml
- uses: actions/upload-artifact@v5
  with:
    name: artifact-name
    path: artifact-path/
    retention-days: 30  # Change this value
```

## Storage Considerations

GitHub provides storage limits based on your plan:
- Artifacts count against repository storage quotas
- Longer retention = higher storage costs
- Balance retention needs with storage budget

Review and adjust these policies periodically based on actual usage patterns.
