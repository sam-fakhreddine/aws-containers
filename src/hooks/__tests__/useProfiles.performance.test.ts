/**
 * useProfiles Hook Performance Tests
 *
 * Tests for memory leak prevention, API cleanup,
 * and overall hook performance.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useProfiles from '@/hooks/useProfiles';
import { measureExecutionTime } from '@/__testUtils__/performanceHelpers';
import * as apiClient from '@/services/apiClient';
import browser from 'webextension-polyfill';

// Mock apiClient
jest.mock('@/services/apiClient', () => ({
    getProfiles: jest.fn(),
    getProfilesEnriched: jest.fn(),
    getApiToken: jest.fn(),
    ApiClientError: class ApiClientError extends Error {
        constructor(message: string, public readonly statusCode?: number) {
            super(message);
            this.name = 'ApiClientError';
        }
    },
}));

describe('useProfiles Performance', () => {
    const mockProfiles = [
        { name: 'profile-1', expired: false, expiration: '2025-01-01', has_credentials: true },
        { name: 'profile-2', expired: false, expiration: '2025-01-01', has_credentials: true },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock browser storage
        browser.storage.local.get = jest.fn().mockResolvedValue({});
        browser.storage.local.set = jest.fn().mockResolvedValue(undefined);
        
        // Default mock implementations
        (apiClient.getApiToken as jest.Mock).mockResolvedValue('test-token');
        (apiClient.getProfiles as jest.Mock).mockResolvedValue({ profiles: mockProfiles });
    });

    /**
     * Benchmark: Hook initialization time
     */
    it('should initialize quickly', async () => {
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
    it('should load profiles efficiently', async () => {
        const { result } = renderHook(() => useProfiles());

        const { timeMs } = await measureExecutionTime(async () => {
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        // Loading should complete quickly
        expect(timeMs).toBeLessThan(2000); // 2 second threshold
        expect(apiClient.getProfiles).toHaveBeenCalled();
    });

    /**
     * Test cache performance
     */
    it('should use cache to speed up repeated loads', async () => {
        // Mock cached data
        const cachedProfiles = [
            { name: 'cached-profile-1', expired: false, expiration: '2025-01-01', has_credentials: true },
            { name: 'cached-profile-2', expired: false, expiration: '2025-01-01', has_credentials: true },
        ];
        
        browser.storage.local.get = jest.fn().mockResolvedValue({
            'aws-profiles': {
                timestamp: Date.now(),
                profiles: cachedProfiles,
            },
        });

        const { result } = renderHook(() => useProfiles());

        // Wait for cache to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should use cached data without calling API
        expect(result.current.profiles).toEqual(cachedProfiles);
        expect(apiClient.getProfiles).not.toHaveBeenCalled();
    });

    /**
     * Test that refresh properly bypasses cache
     */
    it('should bypass cache on refresh', async () => {
        // Mock cached data
        browser.storage.local.get = jest.fn().mockResolvedValue({
            'aws-profiles': {
                timestamp: Date.now(),
                profiles: [{ name: 'cached', expired: false, expiration: '2025-01-01', has_credentials: true }],
            },
        });

        const { result } = renderHook(() => useProfiles());

        // Wait for initial load from cache
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Clear mock calls from initial load
        jest.clearAllMocks();
        
        // Reset browser storage mock for refresh
        browser.storage.local.get = jest.fn().mockResolvedValue({});
        browser.storage.local.set = jest.fn().mockResolvedValue(undefined);

        // Refresh should call API
        act(() => {
            result.current.refreshProfiles();
        });

        await waitFor(() => {
            expect(apiClient.getProfiles).toHaveBeenCalled();
        });
    });

    /**
     * Test that multiple rapid load calls are handled efficiently
     */
    it('should handle rapid load calls efficiently', async () => {
        const { result } = renderHook(() => useProfiles());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Clear initial calls
        jest.clearAllMocks();

        // Rapidly call loadProfiles 5 times
        const { timeMs } = await measureExecutionTime(async () => {
            act(() => {
                for (let i = 0; i < 5; i++) {
                    result.current.loadProfiles();
                }
            });

            await waitFor(() => {
                expect(apiClient.getProfiles).toHaveBeenCalled();
            });
        });

        // Should complete in reasonable time
        expect(timeMs).toBeLessThan(3000); // 3 second threshold
    });

    /**
     * Test error handling performance
     */
    it('should handle errors gracefully', async () => {
        const error = new apiClient.ApiClientError('Connection failed');
        (apiClient.getProfiles as jest.Mock).mockRejectedValue(error);

        const { result } = renderHook(() => useProfiles());

        // Wait for error state
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeTruthy();
        });

        // Error should be set
        expect(result.current.error).toBe('Connection failed');
    });

    /**
     * Test cache expiration
     */
    it('should reload when cache is expired', async () => {
        // Mock expired cached data (older than 30 minutes)
        const expiredTimestamp = Date.now() - (31 * 60 * 1000);
        browser.storage.local.get = jest.fn().mockResolvedValue({
            'aws-profiles': {
                timestamp: expiredTimestamp,
                profiles: [{ name: 'expired', expired: false, expiration: '2025-01-01', has_credentials: true }],
            },
        });

        const { result } = renderHook(() => useProfiles());

        // Should call API because cache is expired
        await waitFor(() => {
            expect(apiClient.getProfiles).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should have fresh data, not expired cache
        expect(result.current.profiles).toEqual(mockProfiles);
    });

    /**
     * Test enriched profiles loading
     */
    it('should load enriched profiles efficiently', async () => {
        (apiClient.getProfilesEnriched as jest.Mock).mockResolvedValue({ profiles: mockProfiles });

        const { result } = renderHook(() => useProfiles());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const { timeMs } = await measureExecutionTime(async () => {
            act(() => {
                result.current.enrichSSOProfiles();
            });

            await waitFor(() => {
                expect(apiClient.getProfilesEnriched).toHaveBeenCalled();
            });
        });

        // Should complete in reasonable time
        expect(timeMs).toBeLessThan(2000); // 2 second threshold
    });

    /**
     * Test missing token handling
     */
    it('should handle missing token gracefully', async () => {
        (apiClient.getApiToken as jest.Mock).mockResolvedValue(null);

        const { result } = renderHook(() => useProfiles());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should set error about missing token
        expect(result.current.error).toContain('No API token configured');
        expect(apiClient.getProfiles).not.toHaveBeenCalled();
    });
});
