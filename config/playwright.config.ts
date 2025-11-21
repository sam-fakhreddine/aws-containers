import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for AWS Profile Containers extension testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '../tests/e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use 4 workers in CI for better performance (tests are stable with parallelization)
  workers: process.env.CI ? 4 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for your tests
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects - Firefox only (extension uses Firefox containers)
  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox-specific settings for extension testing
        launchOptions: {
          firefoxUserPrefs: {
            // Enable extension debugging
            'devtools.chrome.enabled': true,
            'devtools.debugger.remote-enabled': true,
            // Enable container tabs (Firefox Multi-Account Containers)
            'privacy.userContext.enabled': true,
            'privacy.userContext.ui.enabled': true,
          },
        },
      },
    },
  ],

  // Web server configuration (if you have a local server for testing)
  // webServer: {
  //   command: 'npm run start:test-server',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
