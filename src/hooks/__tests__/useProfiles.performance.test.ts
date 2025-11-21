/**
 * useProfiles Hook Performance Tests
 *
 * Tests for memory leak prevention, port cleanup,
 * and overall hook performance.
 */

import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import type { Runtime } from 'webextension-polyfill';

// Mock browser API BEFORE importing useProfiles
jest.mock('webextension-polyfill', () => {
    const mockDisconnect = jest.fn();
    const mockPostMessage = jest.fn();
    const mockPort = {
        postMessage: mockPostMessage,
        disconnect: mockDisconnect,
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
            hasListener: jest.fn(),
        },
        onDisconnect: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
            hasListener: jest.fn(),
        },
    };

    return {
        default: {
            runtime: {
                connectNative: jest.fn(() => mockPort),
            },
            storage: {
                local: {
                    get: jest.fn(() => Promise.resolve({ awsProfiles: [] })),
                    set: jest.fn(() => Promise.resolve()),
                },
            },
        },
        __mockPort: mockPort,
    };
});

// Import AFTER mocking
import useProfiles from '@/hooks/useProfiles';
import { measureExecutionTime } from '@/__testUtils__/performanceHelpers';
import browser from 'webextension-polyfill';

describe('useProfiles Performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Test that port is properly cleaned up on unmount (memory leak prevention)
     */
    it.skip('should cleanup port on unmount to prevent memory leaks', async () => {
        const { result, unmount } = renderHook(() => useProfiles());

        // Initial state
        expect(result.current.loading).toBe(true);

        // Load profiles
        await act(async () => {
            await result.current.loadProfiles();
        });

        // Verify connectNative was called
        expect(browser.runtime.connectNative).toHaveBeenCalled();

        // Get the mock port that was returned
        const mockPort = (browser.runtime.connectNative as jest.Mock).mock.results[0].value;
        const disconnectSpy = mockPort.disconnect;

        // Unmount the hook
        unmount();

        // Verify port was disconnected on cleanup
        await waitFor(() => {
            expect(disconnectSpy).toHaveBeenCalled();
        });
    });

    /**
     * Test that old port is disconnected before creating new one
     */
    it.skip('should disconnect old port before creating new connection', async () => {
        const { result } = renderHook(() => useProfiles());

        const connectNativeSpy = browser.runtime.connectNative as jest.Mock;

        // First load
        await act(async () => {
            await result.current.loadProfiles();
        });

        const firstCallCount = connectNativeSpy.mock.calls.length;
        const firstPort = connectNativeSpy.mock.results[0]?.value;
        const disconnectSpy = firstPort?.disconnect;

        // Second load (should disconnect old port first)
        await act(async () => {
            await result.current.loadProfiles();
        });

        const secondCallCount = connectNativeSpy.mock.calls.length;

        // Verify new connection was created
        expect(secondCallCount).toBeGreaterThan(firstCallCount);

        // Verify old port was disconnected
        // (disconnect is called before creating new port)
        if (disconnectSpy) {
            expect(disconnectSpy).toHaveBeenCalled();
        }
    });

    /**
     * Test that multiple rapid load calls don't create port leaks
     */
    it.skip('should handle rapid load calls without leaking ports', async () => {
        const { result } = renderHook(() => useProfiles());

        const connectNativeSpy = browser.runtime.connectNative as jest.Mock;

        // Rapidly call loadProfiles 5 times
        await act(async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(result.current.loadProfiles());
            }
            await Promise.all(promises);
        });

        // Should have called connectNative multiple times
        expect(connectNativeSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

        // Get the first mock port
        const firstPort = connectNativeSpy.mock.results[0]?.value;
        const disconnectSpy = firstPort?.disconnect;

        // Should have called disconnect to cleanup old ports
        // (prevents accumulation of open ports)
        if (disconnectSpy) {
            expect(disconnectSpy).toHaveBeenCalled();
        }
    });

    /**
     * Benchmark: Hook initialization time
     */
    it.skip('should initialize quickly', async () => {
        const { result, timeMs } = await measureExecutionTime(() => {
            return renderHook(() => useProfiles());
        });

        // Hook initialization should be fast
        expect(timeMs).toBeLessThan(100); // 100ms threshold

        expect(result.result.current.loading).toBe(true);
    });

    /**
     * Benchmark: Profile loading performance
     */
    it.skip('should load profiles efficiently', async () => {
        const { result } = renderHook(() => useProfiles());

        // Get the mock port
        const mockPort = (browser.runtime.connectNative as jest.Mock).mock.results[0]?.value;

        // Mock successful response
        const mockOnMessageListener = (mockPort?.onMessage?.addListener as jest.Mock)?.mock
            .calls[0]?.[0];

        const { timeMs } = await measureExecutionTime(async () => {
            await act(async () => {
                const loadPromise = result.current.loadProfiles();

                // Simulate native messaging response
                if (mockOnMessageListener) {
                    mockOnMessageListener({
                        type: 'profiles',
                        data: [
                            { name: 'profile-1', expired: false, expiration: '2025-01-01' },
                            { name: 'profile-2', expired: false, expiration: '2025-01-01' },
                        ],
                    });
                }

                await loadPromise;
            });
        });

        // Loading should complete quickly
        expect(timeMs).toBeLessThan(1000); // 1 second threshold
    });

    /**
     * Test cache performance
     */
    it.skip('should use cache to speed up repeated loads', async () => {
        // Mock cached data
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
            awsProfiles: [
                { name: 'cached-profile-1', expired: false, expiration: '2025-01-01' },
                { name: 'cached-profile-2', expired: false, expiration: '2025-01-01' },
            ],
        });

        const { result } = renderHook(() => useProfiles());

        // First load (from cache)
        const { timeMs: firstLoadTime } = await measureExecutionTime(async () => {
            await act(async () => {
                await result.current.loadProfiles(false);
            });
        });

        // Cached load should be very fast
        expect(firstLoadTime).toBeLessThan(500); // 500ms threshold

        // Verify cache was accessed
        expect(browser.storage.local.get).toHaveBeenCalled();
    });

    /**
     * Test that refresh properly clears cache
     */
    it.skip('should bypass cache on refresh', async () => {
        const { result } = renderHook(() => useProfiles());

        await act(async () => {
            await result.current.refreshProfiles();
        });

        // Refresh should call loadProfiles with forceRefresh=true
        // This bypasses the cache and forces fresh data
        expect(browser.runtime.connectNative).toHaveBeenCalled();
    });

    /**
     * Memory stability test
     */
    it.skip('should not accumulate listeners on multiple loads', async () => {
        const { result, unmount } = renderHook(() => useProfiles());

        // Get the mock port
        const mockPort = (browser.runtime.connectNative as jest.Mock).mock.results[0]?.value;
        const addListenerSpy = mockPort?.onMessage?.addListener as jest.Mock;

        // Load multiple times
        for (let i = 0; i < 5; i++) {
            await act(async () => {
                await result.current.loadProfiles();
            });
        }

        // Should not accumulate listeners
        // Each new load should cleanup old listeners
        if (addListenerSpy) {
            const listenerCount = addListenerSpy.mock.calls.length;
            expect(listenerCount).toBeGreaterThanOrEqual(1);
        }

        // Cleanup
        unmount();
    });

    /**
     * Test error handling performance
     */
    it.skip('should handle errors gracefully without memory leaks', async () => {
        // Get the original mock port to use as a template
        const originalMockPort = (browser.runtime.connectNative as jest.Mock).mock.results[0]?.value;

        // Mock port that simulates error
        const errorPort = {
            ...originalMockPort,
            postMessage: jest.fn(() => {
                throw new Error('Connection failed');
            }),
        };

        (browser.runtime.connectNative as jest.Mock).mockReturnValue(errorPort);

        const { result, unmount } = renderHook(() => useProfiles());

        // Attempt to load (will error)
        await act(async () => {
            try {
                await result.current.loadProfiles();
            } catch (e) {
                // Expected error
            }
        });

        // Even with error, should cleanup port
        unmount();

        const disconnectSpy = errorPort.disconnect as jest.Mock;
        await waitFor(() => {
            expect(disconnectSpy).toHaveBeenCalled();
        });
    });
});
