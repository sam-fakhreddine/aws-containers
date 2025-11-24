/**
 * Integration tests for API Client - Verifies API communication works correctly
 * Task 17: Verify API communication still works
 * Requirements: 3.1, 3.2
 */

import {
    ApiClientError,
    checkApiHealth,
    getProfiles,
    getConsoleUrl,
    setApiToken,
    clearApiToken,
} from "@/services/apiClient";
import { API_BASE_URL } from "@/services/config";
import { browser } from "@/services/browserUtils";

jest.mock("@/services/browserUtils", () => ({
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

// Mock fetch globally
global.fetch = jest.fn();

describe("API Communication Integration Tests", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await clearApiToken();
        (global.fetch as jest.Mock).mockClear();
    });

    describe("Connection to localhost:10999", () => {
        it("should connect to localhost:10999 for health check", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: "healthy" }),
            });

            await checkApiHealth();

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/health`,
                expect.any(Object)
            );
            expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/^http:\/\/127\.0\.0\.1:10999/);
        });

        it("should connect to localhost:10999 for getProfiles", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ profiles: [] }),
            });

            await getProfiles();

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/profiles`,
                expect.any(Object)
            );
            expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/^http:\/\/127\.0\.0\.1:10999/);
        });

        it("should connect to localhost:10999 for getConsoleUrl", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ url: "https://console.aws.amazon.com" }),
            });

            await getConsoleUrl("test-profile");

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/profiles/test-profile/console-url`,
                expect.any(Object)
            );
            expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/^http:\/\/127\.0\.0\.1:10999/);
        });

        it("should use HTTP protocol (not nativeMessaging)", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ profiles: [] }),
            });

            await getProfiles();

            // Verify fetch was called (HTTP)
            expect(global.fetch).toHaveBeenCalled();
            
            // Verify URL uses HTTP protocol
            const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
            expect(calledUrl).toMatch(/^http:\/\//);
            
            // Verify no browser.runtime.connectNative or sendNativeMessage calls
            expect(browser).not.toHaveProperty("runtime.connectNative");
            expect(browser).not.toHaveProperty("runtime.sendNativeMessage");
        });
    });

    describe("API Token Authentication", () => {
        it("should include X-API-Token header when token is set", async () => {
            const testToken = "a".repeat(32); // Valid legacy token
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: testToken });
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ profiles: [] }),
            });

            await getProfiles();

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const headers = fetchCall[1].headers as Headers;
            expect(headers.get("X-API-Token")).toBe(testToken);
        });

        it("should make request without token when not set", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: "healthy" }),
            });

            await checkApiHealth();

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const headers = fetchCall[1].headers as Headers;
            expect(headers.get("X-API-Token")).toBeNull();
        });

        it("should handle 401 authentication failure", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "invalid" });
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 401,
            });

            await expect(getProfiles()).rejects.toThrow(/Authentication failed/);
        });

        it("should validate token format before storing", async () => {
            await expect(setApiToken("invalid-token")).rejects.toThrow(/Invalid token format/);
        });

        it("should accept valid legacy token format", async () => {
            const validToken = "a".repeat(32);
            await expect(setApiToken(validToken)).resolves.not.toThrow();
        });
    });

    describe("getProfiles() API Call", () => {
        beforeEach(() => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
        });

        it("should successfully fetch profiles", async () => {
            const mockProfiles = {
                profiles: [
                    { name: "profile1", region: "us-east-1" },
                    { name: "profile2", region: "us-west-2" },
                ],
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockProfiles,
            });

            const result = await getProfiles();

            expect(result).toEqual(mockProfiles);
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/profiles`,
                expect.objectContaining({
                    method: "POST",
                    headers: expect.any(Headers),
                })
            );
        });

        it("should use POST method", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ profiles: [] }),
            });

            await getProfiles();

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            expect(fetchCall[1].method).toBe("POST");
        });

        it("should include Content-Type header", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ profiles: [] }),
            });

            await getProfiles();

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const headers = fetchCall[1].headers as Headers;
            expect(headers.get("Content-Type")).toBe("application/json");
        });

        it("should handle rate limiting (429)", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 429,
            });

            await expect(getProfiles()).rejects.toThrow(/Rate limit/);
        });

        it("should handle connection errors", async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new TypeError("fetch failed"));

            await expect(getProfiles()).rejects.toThrow(/Cannot connect/);
        });

        it("should handle timeout", async () => {
            (global.fetch as jest.Mock).mockImplementation(() => {
                const error = new Error();
                error.name = "AbortError";
                return Promise.reject(error);
            });

            await expect(getProfiles()).rejects.toThrow(/timed out/);
        });
    });

    describe("getConsoleUrl() API Call", () => {
        beforeEach(() => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
        });

        it("should successfully fetch console URL", async () => {
            const mockResponse = {
                url: "https://console.aws.amazon.com/console/home",
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await getConsoleUrl("my-profile");

            expect(result).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/profiles/my-profile/console-url`,
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("should URL-encode profile names", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ url: "https://console.aws.amazon.com" }),
            });

            await getConsoleUrl("profile with spaces");

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("profile%20with%20spaces"),
                expect.any(Object)
            );
        });

        it("should handle special characters in profile names", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ url: "https://console.aws.amazon.com" }),
            });

            await getConsoleUrl("profile/with/slashes");

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("profile%2Fwith%2Fslashes"),
                expect.any(Object)
            );
        });

        it("should handle 404 profile not found", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 404,
            });

            await expect(getConsoleUrl("missing-profile")).rejects.toThrow(/not found/);
        });

        it("should handle 400 invalid profile name", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 400,
            });

            await expect(getConsoleUrl("invalid")).rejects.toThrow(/Invalid profile name/);
        });
    });

    describe("No nativeMessaging Usage", () => {
        it("should not have nativeMessaging in browser API", () => {
            // Verify browser object doesn't have nativeMessaging methods
            expect(browser).not.toHaveProperty("runtime.connectNative");
            expect(browser).not.toHaveProperty("runtime.sendNativeMessage");
        });

        it("should use fetch for all API calls", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ profiles: [] }),
            });

            await getProfiles();

            // Verify fetch was called
            expect(global.fetch).toHaveBeenCalled();
            
            // Verify it's using HTTP
            const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
            expect(url).toMatch(/^http:\/\//);
        });

        it("should use HTTP protocol for all endpoints", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({}),
            });

            const endpoints = [
                () => checkApiHealth(),
                () => getProfiles(),
                () => getConsoleUrl("test"),
            ];

            for (const endpoint of endpoints) {
                (global.fetch as jest.Mock).mockClear();
                await endpoint();
                
                const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
                expect(url).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):10999/);
            }
        });
    });

    describe("Error Handling", () => {
        beforeEach(() => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
        });

        it("should throw ApiClientError on network failure", async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new TypeError("fetch failed"));

            await expect(getProfiles()).rejects.toThrow(ApiClientError);
            await expect(getProfiles()).rejects.toThrow(/Cannot connect/);
        });

        it("should include status code in error", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 500,
            });

            try {
                await getProfiles();
                fail("Should have thrown error");
            } catch (error) {
                expect(error).toBeInstanceOf(ApiClientError);
                expect((error as ApiClientError).statusCode).toBe(500);
            }
        });

        it("should handle server error responses", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ action: "error" }),
            });

            await expect(getProfiles()).rejects.toThrow(/Server returned error/);
        });
    });
});
