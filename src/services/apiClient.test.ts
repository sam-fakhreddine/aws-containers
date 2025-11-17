/**
 * Tests for API Client
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import * as apiClient from "./apiClient";

describe("apiClient", () => {
    beforeEach(() => {
        global.fetch = jest.fn() as any;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("checkApiHealth", () => {
        it("returns true when API is healthy", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
            });

            const result = await apiClient.checkApiHealth();
            expect(result).toBe(true);
        });

        it("returns false when API is not reachable", async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

            const result = await apiClient.checkApiHealth();
            expect(result).toBe(false);
        });
    });

    describe("getProfiles", () => {
        it("returns profiles on success", async () => {
            const mockResponse = {
                action: "profileList",
                profiles: [
                    {
                        name: "test-profile",
                        has_credentials: true,
                        expired: false,
                        is_sso: false,
                        color: "blue",
                        icon: "briefcase",
                    },
                ],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await apiClient.getProfiles();
            expect(result).toEqual(mockResponse);
        });

        it("throws ApiClientError on API error response", async () => {
            const mockResponse = {
                action: "error",
                message: "Failed to read credentials",
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            await expect(apiClient.getProfiles()).rejects.toThrow(
                "Failed to read credentials"
            );
        });

        it("throws ApiClientError when API is not reachable", async () => {
            (global.fetch as any).mockRejectedValueOnce(
                new TypeError("Failed to fetch")
            );

            await expect(apiClient.getProfiles()).rejects.toThrow(
                "Cannot connect to API server"
            );
        });
    });

    describe("getConsoleUrl", () => {
        it("returns console URL on success", async () => {
            const mockResponse = {
                action: "consoleUrl",
                profileName: "test-profile",
                url: "https://signin.aws.amazon.com/...",
                color: "blue",
                icon: "briefcase",
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await apiClient.getConsoleUrl("test-profile");
            expect(result).toEqual(mockResponse);
        });

        it("encodes profile name in URL", async () => {
            const mockResponse = {
                action: "consoleUrl",
                profileName: "test profile",
                url: "https://signin.aws.amazon.com/...",
                color: "blue",
                icon: "briefcase",
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            await apiClient.getConsoleUrl("test profile");

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("test%20profile"),
                expect.any(Object)
            );
        });
    });
});
