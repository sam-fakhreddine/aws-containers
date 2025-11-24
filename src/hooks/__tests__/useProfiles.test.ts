/**
 * Tests for useProfiles hook
 * Verifies profile loading, caching, error handling, and refresh functionality
 */

import { renderHook, waitFor } from "@testing-library/react";
import useProfiles from "../useProfiles";
import * as apiClient from "@/services/apiClient";
import browser from "webextension-polyfill";
import { AWSProfile } from "@/types";

// Mock dependencies
jest.mock("@/services/apiClient");
jest.mock("@/utils/profiles", () => ({
    sortByCredentialStatus: jest.fn((profiles) => profiles),
    logProfileSummary: jest.fn(),
}));

describe("useProfiles", () => {
    const mockProfiles: AWSProfile[] = [
        {
            name: "profile1",
            has_credentials: true,
            expiration: null,
            expired: false,
            color: "blue",
            icon: "fingerprint",
        },
        {
            name: "profile2",
            has_credentials: true,
            expiration: "2024-12-31T23:59:59Z",
            expired: false,
            color: "red",
            icon: "briefcase",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        // Clear browser storage before each test
        browser.storage.local.get = jest.fn().mockResolvedValue({});
        browser.storage.local.set = jest.fn().mockResolvedValue(undefined);
        
        // Mock getApiToken to return a valid token by default
        (apiClient.getApiToken as jest.Mock).mockResolvedValue("awspc_test123_abc456");
    });

    it("should load profiles on mount", async () => {
        // Mock API response
        (apiClient.getProfiles as jest.Mock).mockResolvedValue({
            action: "profileList",
            profiles: mockProfiles,
        });

        const { result } = renderHook(() => useProfiles());

        // Initially loading should be true
        expect(result.current.loading).toBe(true);
        expect(result.current.profiles).toEqual([]);

        // Wait for profiles to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.profiles).toEqual(mockProfiles);
        expect(result.current.error).toBeNull();
        expect(apiClient.getProfiles).toHaveBeenCalledTimes(1);
    });

    it("should cache profiles and not reload on rerender", async () => {
        // Mock API response
        (apiClient.getProfiles as jest.Mock).mockResolvedValue({
            action: "profileList",
            profiles: mockProfiles,
        });

        const { result, rerender } = renderHook(() => useProfiles());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.profiles).toEqual(mockProfiles);
        expect(apiClient.getProfiles).toHaveBeenCalledTimes(1);

        // Rerender the hook
        rerender();

        // API should still only be called once (cached)
        expect(apiClient.getProfiles).toHaveBeenCalledTimes(1);
        expect(result.current.profiles).toEqual(mockProfiles);
    });

    it("should handle API errors gracefully", async () => {
        const errorMessage = "Failed to connect to API server";
        
        // Create a proper ApiClientError instance
        const error = new Error(errorMessage);
        error.name = "ApiClientError";
        Object.setPrototypeOf(error, apiClient.ApiClientError.prototype);
        
        // Mock API to throw an error
        (apiClient.getProfiles as jest.Mock).mockRejectedValue(error);

        const { result } = renderHook(() => useProfiles());

        // Wait for error state
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe(errorMessage);
        expect(result.current.profiles).toEqual([]);
    });

    it("should refetch profiles when force refresh is called", async () => {
        // Mock API response
        (apiClient.getProfiles as jest.Mock).mockResolvedValue({
            action: "profileList",
            profiles: mockProfiles,
        });

        const { result } = renderHook(() => useProfiles());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(apiClient.getProfiles).toHaveBeenCalledTimes(1);

        // Call refreshProfiles to force a refresh
        result.current.refreshProfiles();

        // Wait for refresh to complete
        await waitFor(() => {
            expect(apiClient.getProfiles).toHaveBeenCalledTimes(2);
        });

        expect(result.current.profiles).toEqual(mockProfiles);
    });

    it("should handle missing API token", async () => {
        // Mock getApiToken to return null
        (apiClient.getApiToken as jest.Mock).mockResolvedValue(null);

        const { result } = renderHook(() => useProfiles());

        // Wait for error state
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe(
            "No API token configured. Please configure your token in Settings."
        );
        expect(result.current.profiles).toEqual([]);
        expect(apiClient.getProfiles).not.toHaveBeenCalled();
    });

    it("should restore profiles from cache if not expired", async () => {
        const cachedData = {
            timestamp: Date.now() - 60000, // 1 minute ago (not expired)
            profiles: mockProfiles,
        };

        // Mock browser storage to return cached data
        browser.storage.local.get = jest.fn().mockResolvedValue({
            "aws-profiles": cachedData,
        });

        const { result } = renderHook(() => useProfiles());

        // Wait for cache to be restored
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.profiles).toEqual(mockProfiles);
        // API should not be called when cache is valid
        expect(apiClient.getProfiles).not.toHaveBeenCalled();
    });

    it("should fetch fresh profiles if cache is expired", async () => {
        const cachedData = {
            timestamp: Date.now() - 2000000, // More than 30 minutes ago (expired)
            profiles: mockProfiles,
        };

        // Mock browser storage to return expired cached data
        browser.storage.local.get = jest.fn().mockResolvedValue({
            "aws-profiles": cachedData,
        });

        // Mock API response
        (apiClient.getProfiles as jest.Mock).mockResolvedValue({
            action: "profileList",
            profiles: mockProfiles,
        });

        const { result } = renderHook(() => useProfiles());

        // Wait for fresh data to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.profiles).toEqual(mockProfiles);
        // API should be called when cache is expired
        expect(apiClient.getProfiles).toHaveBeenCalledTimes(1);
    });

    it("should save profiles to cache after successful load", async () => {
        // Mock API response
        (apiClient.getProfiles as jest.Mock).mockResolvedValue({
            action: "profileList",
            profiles: mockProfiles,
        });

        const { result } = renderHook(() => useProfiles());

        // Wait for profiles to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Verify cache was updated
        expect(browser.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                "aws-profiles": expect.objectContaining({
                    profiles: mockProfiles,
                    timestamp: expect.any(Number),
                }),
            })
        );
    });

    it("should handle generic errors", async () => {
        const genericError = new Error("Network error");
        
        // Mock API to throw a generic error
        (apiClient.getProfiles as jest.Mock).mockRejectedValue(genericError);

        const { result } = renderHook(() => useProfiles());

        // Wait for error state
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe("Network error");
        expect(result.current.profiles).toEqual([]);
    });

    it("should call enrichSSOProfiles when enrichSSOProfiles is invoked", async () => {
        const enrichedProfiles: AWSProfile[] = [
            ...mockProfiles,
            {
                name: "sso-profile",
                has_credentials: true,
                expiration: null,
                expired: false,
                color: "green",
                icon: "circle",
                is_sso: true,
                sso_start_url: "https://example.awsapps.com/start",
            },
        ];

        // Mock API response for enriched profiles
        (apiClient.getProfilesEnriched as jest.Mock).mockResolvedValue({
            action: "profileList",
            profiles: enrichedProfiles,
        });

        // Mock initial profiles
        (apiClient.getProfiles as jest.Mock).mockResolvedValue({
            action: "profileList",
            profiles: mockProfiles,
        });

        const { result } = renderHook(() => useProfiles());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Call enrichSSOProfiles
        result.current.enrichSSOProfiles();

        // Wait for enriched profiles to load
        await waitFor(() => {
            expect(apiClient.getProfilesEnriched).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(result.current.profiles).toEqual(enrichedProfiles);
        });
    });
});
