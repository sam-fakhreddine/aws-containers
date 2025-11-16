/**
 * Test setup file for Jest
 * Configures testing libraries and global test utilities
 */

import "@testing-library/jest-dom";

// Mock webpack-injected constants for tests
(global as any).__VERSION__ = "0.0.0-test";
(global as any).__BUILD_TIMESTAMP__ = "2025.01.01.0000";

// Suppress console warnings/errors in tests unless explicitly needed
// This keeps test output clean and focused on actual test failures
global.console = {
    ...console,
    // Uncomment to suppress console.error in tests
    // error: jest.fn(),
    // Uncomment to suppress console.warn in tests
    // warn: jest.fn(),
};
