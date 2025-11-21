/**
 * Property-Based Test: API Communication Preservation
 * Feature: webpack-to-wxt-migration, Property 3: API communication preservation
 * Validates: Requirements 3.1, 3.2
 * 
 * Tests that all API communication uses HTTP requests to localhost:10999
 * and does NOT use browser nativeMessaging. This ensures the migration
 * from Webpack to WXT preserves the HTTP-based API communication pattern.
 */

import * as fc from 'fast-check';
import { 
    getConsoleUrl, 
    getProfiles, 
    getProfilesEnriched,
    getApiVersion,
    getRegions,
    checkApiHealth,
    ApiClientError 
} from '@/services/apiClient';
import { browser } from '@/services/browserUtils';

// Mock browser utilities
jest.mock('@/services/browserUtils', () => ({
    browser: {
        storage: {
            local: {
                get: jest.fn(),
                set: jest.fn(),
                remove: jest.fn(),
            },
            onChanged: {
                addListener: jest.fn(),
            },
        },
    },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Property-Based Test: API Communication Preservation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default token
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
            apiToken: 'a'.repeat(32) // Valid legacy token
        });
    });

    /**
     * Property 1: All API calls use HTTP to localhost:10999
     * For any profile name, all API calls should use HTTP fetch to localhost:10999
     */
    it('should use HTTP to localhost:10999 for all API calls', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random profile names (alphanumeric with hyphens/underscores)
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (profileName) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock successful response
                    (global.fetch as jest.Mock).mockResolvedValue({
                        ok: true,
                        json: async () => ({ url: 'https://console.aws.amazon.com' }),
                    });

                    try {
                        await getConsoleUrl(profileName);
                    } catch (error) {
                        // Ignore errors, we're testing the fetch call
                    }

                    // Verify fetch was called
                    expect(global.fetch).toHaveBeenCalled();
                    
                    // Get the URL that was called
                    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
                    const calledUrl = fetchCall[0] as string;
                    
                    // Verify it uses HTTP (not HTTPS) and localhost:10999 or 127.0.0.1:10999
                    expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999/);
                    
                    // Verify it does NOT use any other protocol or port
                    expect(calledUrl).not.toMatch(/^https:/);
                    expect(calledUrl).not.toMatch(/:(?!10999)\d+/);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 2: getProfiles uses correct HTTP endpoint
     * For any call to getProfiles, it should use HTTP to localhost:10999/profiles
     */
    it('should use HTTP to localhost:10999/profiles for getProfiles', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of calls
                fc.integer({ min: 1, max: 10 }),
                async (numCalls) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    for (let i = 0; i < numCalls; i++) {
                        // Mock successful response
                        (global.fetch as jest.Mock).mockResolvedValueOnce({
                            ok: true,
                            json: async () => ({ profiles: [] }),
                        });

                        try {
                            await getProfiles();
                        } catch (error) {
                            // Ignore errors
                        }

                        // Verify fetch was called with correct URL
                        const fetchCall = (global.fetch as jest.Mock).mock.calls[i];
                        const calledUrl = fetchCall[0] as string;
                        
                        // Should use HTTP to localhost:10999/profiles
                        expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999\/profiles$/);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 3: getProfilesEnriched uses correct HTTP endpoint
     * For any call to getProfilesEnriched, it should use HTTP to localhost:10999/profiles/enrich
     */
    it('should use HTTP to localhost:10999/profiles/enrich for getProfilesEnriched', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of calls
                fc.integer({ min: 1, max: 10 }),
                async (numCalls) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    for (let i = 0; i < numCalls; i++) {
                        // Mock successful response
                        (global.fetch as jest.Mock).mockResolvedValueOnce({
                            ok: true,
                            json: async () => ({ profiles: [] }),
                        });

                        try {
                            await getProfilesEnriched();
                        } catch (error) {
                            // Ignore errors
                        }

                        // Verify fetch was called with correct URL
                        const fetchCall = (global.fetch as jest.Mock).mock.calls[i];
                        const calledUrl = fetchCall[0] as string;
                        
                        // Should use HTTP to localhost:10999/profiles/enrich
                        expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999\/profiles\/enrich$/);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 4: getApiVersion uses correct HTTP endpoint
     * For any call to getApiVersion, it should use HTTP to localhost:10999/version
     */
    it('should use HTTP to localhost:10999/version for getApiVersion', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of calls
                fc.integer({ min: 1, max: 10 }),
                async (numCalls) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    for (let i = 0; i < numCalls; i++) {
                        // Mock successful response
                        (global.fetch as jest.Mock).mockResolvedValueOnce({
                            ok: true,
                            json: async () => ({ version: '1.0.0' }),
                        });

                        try {
                            await getApiVersion();
                        } catch (error) {
                            // Ignore errors
                        }

                        // Verify fetch was called with correct URL
                        const fetchCall = (global.fetch as jest.Mock).mock.calls[i];
                        const calledUrl = fetchCall[0] as string;
                        
                        // Should use HTTP to localhost:10999/version
                        expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999\/version$/);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5: getRegions uses correct HTTP endpoint
     * For any call to getRegions, it should use HTTP to localhost:10999/regions
     */
    it('should use HTTP to localhost:10999/regions for getRegions', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of calls
                fc.integer({ min: 1, max: 10 }),
                async (numCalls) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    for (let i = 0; i < numCalls; i++) {
                        // Mock successful response
                        (global.fetch as jest.Mock).mockResolvedValueOnce({
                            ok: true,
                            json: async () => ({ regions: [] }),
                        });

                        try {
                            await getRegions();
                        } catch (error) {
                            // Ignore errors
                        }

                        // Verify fetch was called with correct URL
                        const fetchCall = (global.fetch as jest.Mock).mock.calls[i];
                        const calledUrl = fetchCall[0] as string;
                        
                        // Should use HTTP to localhost:10999/regions
                        expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999\/regions$/);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 6: checkApiHealth uses correct HTTP endpoint
     * For any call to checkApiHealth, it should use HTTP to localhost:10999/health
     */
    it('should use HTTP to localhost:10999/health for checkApiHealth', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of calls
                fc.integer({ min: 1, max: 10 }),
                async (numCalls) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    for (let i = 0; i < numCalls; i++) {
                        // Mock successful response
                        (global.fetch as jest.Mock).mockResolvedValueOnce({
                            ok: true,
                        });

                        try {
                            await checkApiHealth();
                        } catch (error) {
                            // Ignore errors
                        }

                        // Verify fetch was called with correct URL
                        const fetchCall = (global.fetch as jest.Mock).mock.calls[i];
                        const calledUrl = fetchCall[0] as string;
                        
                        // Should use HTTP to localhost:10999/health
                        expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999\/health$/);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7: No nativeMessaging is used
     * For any API call, browser.runtime.sendNativeMessage should NOT be called
     */
    it('should NOT use browser.runtime.sendNativeMessage for any API call', async () => {
        // Mock sendNativeMessage if it exists
        const mockSendNativeMessage = jest.fn();
        if (typeof browser.runtime === 'undefined') {
            (browser as any).runtime = {};
        }
        (browser as any).runtime.sendNativeMessage = mockSendNativeMessage;

        await fc.assert(
            fc.asyncProperty(
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (profileName) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    mockSendNativeMessage.mockClear();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock successful response
                    (global.fetch as jest.Mock).mockResolvedValue({
                        ok: true,
                        json: async () => ({ url: 'https://console.aws.amazon.com' }),
                    });

                    try {
                        await getConsoleUrl(profileName);
                    } catch (error) {
                        // Ignore errors
                    }

                    // Verify sendNativeMessage was NOT called
                    expect(mockSendNativeMessage).not.toHaveBeenCalled();
                    
                    // Verify fetch WAS called instead
                    expect(global.fetch).toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 8: All API endpoints use the same base URL
     * For any API function, it should use http://127.0.0.1:10999 as the base URL
     */
    it('should use consistent base URL for all API endpoints', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random API function to test
                fc.constantFrom(
                    'getProfiles',
                    'getProfilesEnriched',
                    'getApiVersion',
                    'getRegions',
                    'checkApiHealth'
                ),
                async (apiFunction) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock successful response
                    (global.fetch as jest.Mock).mockResolvedValue({
                        ok: true,
                        json: async () => ({}),
                    });

                    try {
                        switch (apiFunction) {
                            case 'getProfiles':
                                await getProfiles();
                                break;
                            case 'getProfilesEnriched':
                                await getProfilesEnriched();
                                break;
                            case 'getApiVersion':
                                await getApiVersion();
                                break;
                            case 'getRegions':
                                await getRegions();
                                break;
                            case 'checkApiHealth':
                                await checkApiHealth();
                                break;
                        }
                    } catch (error) {
                        // Ignore errors
                    }

                    // Verify fetch was called
                    expect(global.fetch).toHaveBeenCalled();
                    
                    // Get the URL that was called
                    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
                    const calledUrl = fetchCall[0] as string;
                    
                    // Should start with http://127.0.0.1:10999 or http://localhost:10999
                    expect(calledUrl).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):10999/);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 9: Profile names are properly URL-encoded in API calls
     * For any profile name with special characters, it should be properly encoded
     */
    it('should properly URL-encode profile names in API calls', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate profile names with various characters
                fc.string({ minLength: 1, maxLength: 50 }),
                async (profileName) => {
                    // Skip empty strings
                    if (!profileName.trim()) return;

                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock successful response
                    (global.fetch as jest.Mock).mockResolvedValue({
                        ok: true,
                        json: async () => ({ url: 'https://console.aws.amazon.com' }),
                    });

                    try {
                        await getConsoleUrl(profileName);
                    } catch (error) {
                        // Ignore errors
                    }

                    if ((global.fetch as jest.Mock).mock.calls.length > 0) {
                        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
                        const calledUrl = fetchCall[0] as string;
                        
                        // Verify the profile name is properly encoded
                        const expectedEncoded = encodeURIComponent(profileName);
                        expect(calledUrl).toContain(expectedEncoded);
                        
                        // Verify it uses HTTP to localhost:10999
                        expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999/);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 10: HTTP method is POST for profile-related endpoints
     * For any profile-related API call, it should use POST method
     */
    it('should use POST method for profile-related API calls', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (profileName) => {
                    // Clear mocks before each iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock successful response
                    (global.fetch as jest.Mock).mockResolvedValue({
                        ok: true,
                        json: async () => ({ url: 'https://console.aws.amazon.com' }),
                    });

                    try {
                        await getConsoleUrl(profileName);
                    } catch (error) {
                        // Ignore errors
                    }

                    // Verify fetch was called with POST method
                    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
                    const options = fetchCall[1] as RequestInit;
                    
                    expect(options.method).toBe('POST');
                }
            ),
            { numRuns: 100 }
        );
    });
});
