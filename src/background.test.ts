/**
 * Tests for WXT background script entrypoint
 * Verifies that the background script is properly wrapped with defineBackground
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock browser API
const mockAddListener = jest.fn();
const mockBrowser = {
  runtime: {
    onMessage: {
      addListener: mockAddListener,
    },
  },
};

// Make browser available globally
(global as any).browser = mockBrowser;

// Mock defineBackground to capture the callback
let backgroundCallback: (() => void) | null = null;
(global as any).defineBackground = jest.fn((callback: () => void) => {
  backgroundCallback = callback;
  return callback;
});

describe('WXT Background Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    backgroundCallback = null;
  });

  it('should export a function wrapped with defineBackground', async () => {
    // Import the background script
    await import('./background');
    
    // Verify defineBackground was called
    expect((global as any).defineBackground).toHaveBeenCalled();
    expect(backgroundCallback).not.toBeNull();
  });

  it('should register message listener when background callback is executed', async () => {
    // Import the background script
    await import('./background');
    
    // Execute the background callback
    if (backgroundCallback) {
      backgroundCallback();
    }
    
    // Verify the message listener was registered
    expect(mockAddListener).toHaveBeenCalled();
  });

  it('should handle messages correctly through the registered listener', async () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    // Import and execute the background script
    await import('./background');
    if (backgroundCallback) {
      backgroundCallback();
    }
    
    // Get the registered message handler
    const messageHandler = mockAddListener.mock.calls[0][0];
    
    // Test with popupMounted message
    messageHandler({ popupMounted: true });
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'backgroundPage notified that Popup.tsx has mounted.'
    );
    
    // Test with popupUnmounted message
    messageHandler({ popupUnmounted: true });
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'backgroundPage notified that Popup.tsx has unmounted.'
    );
    
    mockConsoleLog.mockRestore();
  });

  it('should handle invalid messages without throwing', async () => {
    // Import and execute the background script
    await import('./background');
    if (backgroundCallback) {
      backgroundCallback();
    }
    
    // Get the registered message handler
    const messageHandler = mockAddListener.mock.calls[0][0];
    
    // Test with various invalid inputs
    expect(() => messageHandler(null)).not.toThrow();
    expect(() => messageHandler(undefined)).not.toThrow();
    expect(() => messageHandler('string')).not.toThrow();
    expect(() => messageHandler(123)).not.toThrow();
    expect(() => messageHandler({})).not.toThrow();
  });
});
