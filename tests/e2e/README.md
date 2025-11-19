# E2E Tests (Playwright)

This directory contains end-to-end tests for the AWS Profile Containers extension using Playwright.

## Running Tests

### Local Development

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test extension.spec.ts

# Run a specific test by name
npx playwright test -g "should load extension successfully"

# Run Firefox tests (default and only browser)
npx playwright test --project=firefox
```

## Test Structure

### Test Files

- `extension.spec.ts` - Basic extension functionality tests
- `aws-console.spec.ts` - AWS Console integration tests

### Configuration

The Playwright configuration is in `playwright.config.ts` at the project root.

Key settings:
- **Timeout:** 30 seconds per test
- **Retries:** 2 retries in CI, 0 locally
- **Browser:** Firefox only (extension uses Firefox-exclusive container features)
- **Reports:** HTML, JUnit XML, and console output
- **Artifacts:** Screenshots on failure, videos on failure, traces on retry

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to a page
    await page.goto('https://example.com');

    // Interact with elements
    await page.click('button#submit');

    // Assert expectations
    await expect(page).toHaveTitle(/Expected Title/);
  });
});
```

### Best Practices

1. **Use descriptive test names** - Start with "should" and describe behavior
2. **Keep tests isolated** - Each test should be independent
3. **Use proper waits** - Wait for elements/network/state, don't use arbitrary timeouts
4. **Clean up** - Reset state between tests if needed
5. **Group related tests** - Use `test.describe()` blocks

### Testing Firefox Extensions

For extension-specific testing:

```typescript
// Example: Test extension popup
test('should open extension popup', async ({ page }) => {
  // Your extension testing logic here
  // Note: This requires loading the extension in the browser
});
```

## CI/CD Integration

Tests run automatically on:
- **Pull Requests** - Via CI workflow (`build-extension.yml`)
- **Main Branch** - Via release workflow (`release.yml`)
- **Daily Schedule** - Via E2E workflow (`e2e.yml`) at 3 AM UTC

### Artifacts

When tests fail in CI:
- HTML test report
- Screenshots of failures
- Videos of test runs
- Test result XML (JUnit format)

Access artifacts from:
1. Go to Actions tab
2. Click on workflow run
3. Scroll to "Artifacts" section
4. Download reports/screenshots/videos

## Debugging Failed Tests

### Local Debugging

```bash
# Run in debug mode (step through tests)
npm run test:e2e:debug

# Run in headed mode (see what's happening)
npm run test:e2e:headed

# View the HTML report
npm run test:e2e:report
```

### CI Debugging

1. Download the test artifacts from GitHub Actions
2. Extract and view the HTML report (`playwright-report/index.html`)
3. Check screenshots for visual issues
4. Watch videos to see test execution

### Common Issues

**Tests timeout:**
- Increase timeout in test or config
- Check if page/element is actually loading
- Verify network conditions

**Element not found:**
- Check selectors are correct
- Ensure page has loaded
- Verify element is visible and enabled

**Flaky tests:**
- Add proper waits instead of timeouts
- Ensure tests are isolated
- Check for race conditions

## Browser Support

Currently configured browser:
- **Firefox** - Exclusive target (extension uses Firefox-only container features)

**Why Firefox only?**
This extension relies on Firefox's Multi-Account Containers feature, which is exclusive to Firefox. Testing on other browsers would not be meaningful as the core functionality depends on Firefox-specific APIs.

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Firefox Extensions](https://playwright.dev/docs/browsers#firefox)
