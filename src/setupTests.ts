/**
 * Test setup file for Jest
 * Configures testing libraries and global test utilities
 */

import "@testing-library/jest-dom";

// Suppress console warnings/errors in tests unless explicitly needed
// This keeps test output clean and focused on actual test failures
global.console = {
    ...console,
    // Uncomment to suppress console.error in tests
    // error: jest.fn(),
    // Uncomment to suppress console.warn in tests
    // warn: jest.fn(),
};
