// Global Jest setup
// Manual mocks are in src/__mocks__/

// Import testing library matchers
import '@testing-library/jest-dom';

// Define global constants that WXT provides at build time
global.__VERSION__ = '0.5.0';
global.__BUILD_TIMESTAMP__ = '2024-01-01T00:00';
