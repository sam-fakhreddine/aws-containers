/**
 * Unit tests for useProfiles hook
 * Tests profile loading, caching, API interaction, and SSO enrichment
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import browser from "webextension-polyfill";
import useProfiles from "../useProfiles";
import * as apiClient from "../../../services/apiClient";
import { AWSProfile } from "../../types";

// Mock dependencies
jest.mock("webextension-polyfill", () => ({
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
}));

jest.mock("../../../services/apiClient");

jest.mock("../useIsMounted", () => ({
    useIsMounted: () => () => true,
}));

describe("useProfiles", () => {
    const mockStorageGet = browser.storage.local.get as jest.Mock;
    const mockStorageSet = browser.storage.local.set as jest.Mock;
    const mockGetProfiles = apiClient.getProfiles as jest.Mock;
    const mockGetProfilesEnriched = apiClient.getProfilesEnriched as jest.Mock;

    const createProfile = (name: string, overrides: Partial<AWSProfile> = {}): AWSProfile => ({
        name,
        has_credentials: true,
        expiration: null,
        expired: false,
        color: "blue",
        icon: "fingerprint",
        is_sso: false,
        sso_start_url: undefined,
        ...overrides,
    });

    const mockProfiles: AWSProfile[] = [
        createProfile("profile1"),
        createProfile("profile2"),
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
        mockGetProfiles.mockResolvedValue({ profiles: mockProfiles });
        mockGetProfilesEnriched.mockResolvedValue({ profiles: mockProfiles });
    });

    describe("Initial loading", () => {
        it("starts with loading state", () => {
            const { result } = renderHook(() => useProfiles());

            expect(result.current.loading).toBe(true);
            expect(result.current.profiles).toEqual([]);
        });

        it("loads profiles from API on mount", async () => {
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetProfiles).toHaveBeenCalled();
            expect(result.current.profiles).toEqual(mockProfiles);
            expect(result.current.error).toBeNull();
        });

        it("sets apiAvailable to true when API responds", async () => {
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.apiAvailable).toBe(true);
        });

        it("handles API errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockGetProfiles.mockRejectedValue(new Error("Cannot connect to API server"));

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe("Cannot connect to API server");
            expect(result.current.apiAvailable).toBe(false);
            expect(result.current.profiles).toEqual([]);

            consoleErrorSpy.mockRestore();
        });

        it("handles network errors", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockGetProfiles.mockRejectedValue(new Error("Network error"));

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe("Network error");
            expect(result.current.profiles).toEqual([]);

            consoleErrorSpy.mockRestore();
        });
    });

    describe("Cache management", () => {
        it("uses cached profiles when cache is fresh", async () => {
            const cacheTimestamp = Date.now();
            mockStorageGet.mockResolvedValue({
                "aws-profiles": {
                    profiles: mockProfiles,
                    timestamp: cacheTimestamp,
                },
            });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profiles).toEqual(mockProfiles);
            // Should not call API if cache is fresh
            expect(mockGetProfiles).not.toHaveBeenCalled();
        });

        it("fetches new profiles when cache is stale", async () => {
            const staleTimestamp = Date.now() - 61000; // 61 seconds ago
            mockStorageGet.mockResolvedValue({
                "aws-profiles": {
                    profiles: [createProfile("old-profile")],
                    timestamp: staleTimestamp,
                },
            });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetProfiles).toHaveBeenCalled();
            expect(result.current.profiles).toEqual(mockProfiles);
        });

        it("saves profiles to cache after fetch", async () => {
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockStorageSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    "aws-profiles": expect.objectContaining({
                        profiles: mockProfiles,
                        timestamp: expect.any(Number),
                    }),
                })
            );
        });

        it("handles cache restoration errors", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockStorageGet.mockRejectedValue(new Error("Storage error"));

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should still attempt to load from API
            expect(mockGetProfiles).toHaveBeenCalled();
            expect(result.current.profiles).toEqual(mockProfiles);

            consoleErrorSpy.mockRestore();
        });

        it("handles invalid cache data", async () => {
            mockStorageGet.mockResolvedValue({
                "aws-profiles": {
                    profiles: "invalid",
                    timestamp: "not a number",
                },
            });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should fetch from API when cache is invalid
            expect(mockGetProfiles).toHaveBeenCalled();
        });
    });

    describe("Force refresh", () => {
        it("bypasses cache when loadProfiles called with force=true", async () => {
            const cacheTimestamp = Date.now();
            mockStorageGet.mockResolvedValue({
                "aws-profiles": {
                    profiles: [createProfile("cached-profile")],
                    timestamp: cacheTimestamp,
                },
            });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Initial load should use cache
            expect(mockGetProfiles).not.toHaveBeenCalled();

            // Force refresh
            await act(async () => {
                result.current.loadProfiles(true);
            });

            await waitFor(() => {
                expect(mockGetProfiles).toHaveBeenCalled();
            });
        });

        it("refreshProfiles bypasses cache", async () => {
            const cacheTimestamp = Date.now();
            mockStorageGet.mockResolvedValue({
                "aws-profiles": {
                    profiles: [createProfile("cached-profile")],
                    timestamp: cacheTimestamp,
                },
            });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                result.current.refreshProfiles();
            });

            await waitFor(() => {
                expect(mockGetProfiles).toHaveBeenCalled();
            });
        });

        it("sets loading state during refresh", async () => {
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            let resolveGetProfiles: (value: AWSProfile[]) => void;
            mockGetProfiles.mockReturnValue(
                new Promise((resolve) => {
                    resolveGetProfiles = resolve;
                })
            );

            act(() => {
                result.current.refreshProfiles();
            });

            // Should be loading
            expect(result.current.loading).toBe(true);

            // Resolve the promise
            await act(async () => {
                resolveGetProfiles!(mockProfiles);
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });
    });

    describe("SSO enrichment", () => {
        it("calls getProfilesEnriched when enrichSSOProfiles is called", async () => {
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const enrichedProfiles = [
                createProfile("profile1", { is_sso: true, sso_start_url: "https://sso.example.com" }),
            ];
            mockGetProfilesEnriched.mockResolvedValue({ profiles: enrichedProfiles });

            act(() => {
                result.current.enrichSSOProfiles();
            });

            await waitFor(() => {
                expect(mockGetProfilesEnriched).toHaveBeenCalled();
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profiles).toEqual(enrichedProfiles);
        });

        it("handles enrichment errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            mockGetProfilesEnriched.mockRejectedValue(new Error("Enrichment failed"));

            act(() => {
                result.current.enrichSSOProfiles();
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await waitFor(() => {
                expect(result.current.error).toBe("Enrichment failed");
            });

            consoleErrorSpy.mockRestore();
        });

        it("updates cache after SSO enrichment", async () => {
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const enrichedProfiles = [
                createProfile("profile1", { is_sso: true }),
            ];
            mockGetProfilesEnriched.mockResolvedValue({ profiles: enrichedProfiles });

            jest.clearAllMocks();

            act(() => {
                result.current.enrichSSOProfiles();
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await waitFor(() => {
                expect(mockStorageSet).toHaveBeenCalledWith(
                    expect.objectContaining({
                        "aws-profiles": expect.objectContaining({
                            profiles: enrichedProfiles,
                        }),
                    })
                );
            });
        });
    });

    describe("Profile processing", () => {
        it("sorts profiles by credential status", async () => {
            const unsortedProfiles = [
                createProfile("expired", { has_credentials: true, expired: true }),
                createProfile("active", { has_credentials: true, expired: false }),
                createProfile("no-creds", { has_credentials: false }),
            ];

            mockGetProfiles.mockResolvedValue({ profiles: unsortedProfiles });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const profiles = result.current.profiles;
            // Active credentials should come first
            expect(profiles[0].name).toBe("active");
            // Then expired
            expect(profiles[1].name).toBe("expired");
            // Then no credentials
            expect(profiles[2].name).toBe("no-creds");
        });

        it("handles empty profile list", async () => {
            mockGetProfiles.mockResolvedValue({ profiles: [] });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profiles).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        it("handles profiles with various credential states", async () => {
            const profiles = [
                createProfile("p1", { has_credentials: true, expired: false }),
                createProfile("p2", { has_credentials: true, expired: true }),
                createProfile("p3", { has_credentials: false }),
                createProfile("p4", { has_credentials: true, expired: false }),
            ];

            mockGetProfiles.mockResolvedValue({ profiles: profiles });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profiles).toHaveLength(4);
        });
    });

    describe("Error recovery", () => {
        it("clears error on successful retry", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockGetProfiles.mockRejectedValueOnce(new Error("First error"));

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe("First error");

            // Second attempt succeeds
            mockGetProfiles.mockResolvedValue({ profiles: mockProfiles });

            await act(async () => {
                result.current.refreshProfiles();
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBeNull();
            expect(result.current.profiles).toEqual(mockProfiles);

            consoleErrorSpy.mockRestore();
        });
    });

    describe("Multiple hook instances", () => {
        it("each instance manages its own state", async () => {
            const { result: result1 } = renderHook(() => useProfiles());
            const { result: result2 } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
                expect(result2.current.loading).toBe(false);
            });

            expect(result1.current.profiles).toEqual(mockProfiles);
            expect(result2.current.profiles).toEqual(mockProfiles);
        });
    });

    describe("Edge cases", () => {
        it("handles very large profile lists", async () => {
            const largeProfileList = Array.from({ length: 1000 }, (_, i) =>
                createProfile(`profile-${i}`)
            );

            mockGetProfiles.mockResolvedValue({ profiles: largeProfileList });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profiles).toHaveLength(1000);
        });

        it("handles profiles with special characters", async () => {
            const specialProfiles = [
                createProfile("profile-@#$%"),
                createProfile("profile with spaces"),
                createProfile("プロファイル"),
            ];

            mockGetProfiles.mockResolvedValue({ profiles: specialProfiles });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profiles).toEqual(specialProfiles);
        });

        it("handles cache timestamp edge cases", async () => {
            // Cache exactly 60 seconds old (should be considered fresh)
            const exactlyFresh = Date.now() - 59999;
            mockStorageGet.mockResolvedValue({
                "aws-profiles": {
                    profiles: mockProfiles,
                    timestamp: exactlyFresh,
                },
            });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetProfiles).not.toHaveBeenCalled();
        });

        it("handles missing cache timestamp", async () => {
            mockStorageGet.mockResolvedValue({
                "aws-profiles": {
                    profiles: mockProfiles,
                    // Missing timestamp
                },
            });

            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should fetch from API when timestamp is missing
            expect(mockGetProfiles).toHaveBeenCalled();
        });
    });

    describe("Return values", () => {
        it("returns all expected properties", async () => {
            const { result } = renderHook(() => useProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current).toHaveProperty("profiles");
            expect(result.current).toHaveProperty("loading");
            expect(result.current).toHaveProperty("error");
            expect(result.current).toHaveProperty("apiAvailable");
            expect(result.current).toHaveProperty("loadProfiles");
            expect(result.current).toHaveProperty("refreshProfiles");
            expect(result.current).toHaveProperty("enrichSSOProfiles");

            expect(typeof result.current.loadProfiles).toBe("function");
            expect(typeof result.current.refreshProfiles).toBe("function");
            expect(typeof result.current.enrichSSOProfiles).toBe("function");
        });
    });
});
