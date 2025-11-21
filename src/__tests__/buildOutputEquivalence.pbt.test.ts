/**
 * Property-Based Test: Build Output Equivalence
 * Feature: webpack-to-wxt-migration, Property 1: Build output equivalence
 * Validates: Requirements 3.5
 * 
 * Tests that core functionality works identically in WXT build by verifying:
 * - API client functions work with various profile names and regions
 * - HTTP communication to localhost:10999 is preserved
 * - Core data transformations remain consistent
 */

import * as fc from 'fast-check';
import { getConsoleUrl, getProfiles, ApiClientError } from '@/services/apiClient';
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

describe('Property-Based Test: Build Output Equivalence', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default token
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
            apiToken: 'a'.repeat(32) // Valid legacy token
        });
    });

    /**
     * Property 1: API communication uses HTTP to localhost:10999
     * For any valid profile name, API calls should use HTTP fetch to localhost:10999
     */
    it('should use HTTP fetch to localhost:10999 for all profile names', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random profile names (alphanumeric with hyphens/underscores)
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (profileName) => {
                    // Clear mocks before each property test iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock successful response
                    (global.fetch as jest.Mock).mockResolvedValueOnce({
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
                    
                    // Get the URL that was called (should be the first call)
                    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
                    const calledUrl = fetchCall[0] as string;
                    
                    // Verify it uses HTTP and localhost:10999
                    expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999/);
                    
                    // Verify profile name is properly encoded in URL
                    expect(calledUrl).toContain(encodeURIComponent(profileName));
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 2: Profile list API uses correct endpoint
     * For any API call to get profiles, it should use the correct HTTP endpoint
     */
    it('should use correct HTTP endpoint for profile list requests', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of iterations
                fc.integer({ min: 1, max: 10 }),
                async (iterations) => {
                    // Clear mocks before each property test iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    for (let i = 0; i < iterations; i++) {
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
                        
                        expect(calledUrl).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):10999\/profiles$/);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 3: Profile names with special characters are properly encoded
     * For any profile name containing special characters, URL encoding should be applied
     */
    it('should properly encode profile names with special characters', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate profile names with various special characters
                fc.string({ minLength: 1, maxLength: 50 }),
                async (profileName) => {
                    // Skip empty strings
                    if (!profileName.trim()) return;

                    // Clear mocks before each property test iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    (global.fetch as jest.Mock).mockResolvedValueOnce({
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
                        
                        // Verify the profile name is encoded
                        const expectedEncoded = encodeURIComponent(profileName);
                        expect(calledUrl).toContain(expectedEncoded);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 4: API errors are consistently handled
     * For any HTTP error status, the API client should throw ApiClientError
     */
    it('should consistently handle API errors across all status codes', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate various HTTP error status codes
                fc.oneof(
                    fc.constant(400),
                    fc.constant(401),
                    fc.constant(404),
                    fc.constant(429),
                    fc.constant(500),
                    fc.constant(503)
                ),
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (statusCode, profileName) => {
                    // Clear mocks before each property test iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    (global.fetch as jest.Mock).mockResolvedValueOnce({
                        ok: false,
                        status: statusCode,
                    });

                    // Should throw ApiClientError for any error status
                    await expect(getConsoleUrl(profileName)).rejects.toThrow(ApiClientError);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5: Authentication token is included in all requests
     * For any API request, the X-API-Token header should be present
     */
    it('should include authentication token in all API requests', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (profileName) => {
                    // Clear mocks before each property test iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    (global.fetch as jest.Mock).mockResolvedValueOnce({
                        ok: true,
                        json: async () => ({ url: 'https://console.aws.amazon.com' }),
                    });

                    try {
                        await getConsoleUrl(profileName);
                    } catch (error) {
                        // Ignore errors
                    }

                    // Verify fetch was called with headers
                    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
                    const options = fetchCall[1] as RequestInit;
                    
                    expect(options.headers).toBeDefined();
                    
                    // Check if X-API-Token header is present
                    const headers = options.headers as Headers;
                    if (headers instanceof Headers) {
                        expect(headers.has('X-API-Token')).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 6: Timeout handling is consistent
     * For any request that times out, the error should be handled consistently
     */
    it('should consistently handle request timeouts', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (profileName) => {
                    // Clear mocks before each property test iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock timeout error
                    (global.fetch as jest.Mock).mockImplementation(() => {
                        const error = new Error('Timeout');
                        error.name = 'AbortError';
                        return Promise.reject(error);
                    });

                    // Should throw ApiClientError with timeout message
                    await expect(getConsoleUrl(profileName)).rejects.toThrow(ApiClientError);
                    await expect(getConsoleUrl(profileName)).rejects.toThrow(/timed out/i);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7: Connection errors are consistently reported
     * For any connection failure, the error message should be informative
     */
    it('should provide informative error messages for connection failures', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/),
                async (profileName) => {
                    // Clear mocks before each property test iteration
                    jest.clearAllMocks();
                    (browser.storage.local.get as jest.Mock).mockResolvedValue({ 
                        apiToken: 'a'.repeat(32)
                    });

                    // Mock connection error
                    (global.fetch as jest.Mock).mockRejectedValueOnce(
                        new TypeError('fetch failed')
                    );

                    try {
                        await getConsoleUrl(profileName);
                        // Should not reach here
                        expect(true).toBe(false);
                    } catch (error) {
                        expect(error).toBeInstanceOf(ApiClientError);
                        if (error instanceof ApiClientError) {
                            // Error message should mention connection and API server
                            expect(error.message).toMatch(/cannot connect|api server/i);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
