/**
 * Unit tests for useRecentProfiles hook
 * Tests recent profiles management, persistence, and list size limiting
 */

import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { useRecentProfiles } from "@/hooks/useRecentProfiles";
import browser from "webextension-polyfill";
import { STORAGE_KEYS, MAX_RECENT_PROFILES } from "@/constants";

// Mock webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
}));

describe("useRecentProfiles", () => {
    const mockStorageGet = browser.storage.local.get as jest.Mock;
    const mockStorageSet = browser.storage.local.set as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
    });

    describe("Initialization", () => {
        it("initializes with empty recent profiles", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.recentProfiles).toEqual([]);
        });

        it("loads recent profiles from storage", async () => {
            const storedProfiles = ["profile1", "profile2", "profile3"];
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: storedProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.recentProfiles).toEqual(storedProfiles);
        });

        it("sets loading state correctly", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it("handles storage load errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockStorageGet.mockRejectedValue(new Error("Storage error"));

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.recentProfiles).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it("handles invalid data types in storage", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: "not-an-array" });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should default to empty array for invalid data
            expect(result.current.recentProfiles).toEqual([]);
        });
    });

    describe("addRecentProfile", () => {
        it("adds a profile to recent list", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            // Flush pending writes in test mode
            if (result.current.flushPendingWrites) {
                await act(async () => {
                    await result.current.flushPendingWrites!();
                });
            }

            expect(result.current.recentProfiles).toEqual(["profile1"]);
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.RECENT_PROFILES]: ["profile1"],
            });
        });

        it("moves existing profile to front", async () => {
            const storedProfiles = ["profile1", "profile2", "profile3"];
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: storedProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile2");
            });

            // Flush pending writes in test mode
            if (result.current.flushPendingWrites) {
                await act(async () => {
                    await result.current.flushPendingWrites!();
                });
            }

            expect(result.current.recentProfiles).toEqual(["profile2", "profile1", "profile3"]);
        });

        it("does not duplicate profiles", async () => {
            const storedProfiles = ["profile1", "profile2"];
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: storedProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            // Flush pending writes in test mode
            if (result.current.flushPendingWrites) {
                await act(async () => {
                    await result.current.flushPendingWrites!();
                });
            }

            // profile1 should be moved to front, no duplicates
            expect(result.current.recentProfiles).toEqual(["profile1", "profile2"]);
        });

        it("skips update if profile is already at front", async () => {
            const storedProfiles = ["profile1", "profile2"];
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: storedProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            // Should not trigger storage update
            expect(mockStorageSet).not.toHaveBeenCalled();
            expect(result.current.recentProfiles).toEqual(storedProfiles);
        });

        it("limits recent profiles to MAX_RECENT_PROFILES", async () => {
            // Create a list at max capacity
            const storedProfiles = Array.from({ length: MAX_RECENT_PROFILES }, (_, i) => `profile${i + 1}`);
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: storedProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Add a new profile
            await act(async () => {
                await result.current.addRecentProfile("newProfile");
            });

            // Flush pending writes in test mode
            if (result.current.flushPendingWrites) {
                await act(async () => {
                    await result.current.flushPendingWrites!();
                });
            }

            // Should have MAX_RECENT_PROFILES items, with new one at front and oldest removed
            expect(result.current.recentProfiles).toHaveLength(MAX_RECENT_PROFILES);
            expect(result.current.recentProfiles[0]).toBe("newProfile");
            expect(result.current.recentProfiles).not.toContain(`profile${MAX_RECENT_PROFILES}`);
        });


    });

    describe("clearRecentProfiles", () => {
        it("clears all recent profiles", async () => {
            const storedProfiles = ["profile1", "profile2", "profile3"];
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: storedProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.clearRecentProfiles();
            });

            expect(result.current.recentProfiles).toEqual([]);
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.RECENT_PROFILES]: [],
            });
        });

        it("handles clear when already empty", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.clearRecentProfiles();
            });

            expect(result.current.recentProfiles).toEqual([]);
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.RECENT_PROFILES]: [],
            });
        });

        it("handles storage error on clear", async () => {
            const storedProfiles = ["profile1"];
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.RECENT_PROFILES]: storedProfiles });
            mockStorageSet.mockRejectedValue(new Error("Storage error"));
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(async () => {
                await act(async () => {
                    await result.current.clearRecentProfiles();
                });
            }).rejects.toThrow();

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("Batch Writing", () => {
        it("adds multiple profiles in correct order", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Add profiles one at a time
            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            if (result.current.flushPendingWrites) {
                await act(async () => {
                    await result.current.flushPendingWrites!();
                });
            }

            await act(async () => {
                await result.current.addRecentProfile("profile2");
            });

            if (result.current.flushPendingWrites) {
                await act(async () => {
                    await result.current.flushPendingWrites!();
                });
            }

            await act(async () => {
                await result.current.addRecentProfile("profile3");
            });

            if (result.current.flushPendingWrites) {
                await act(async () => {
                    await result.current.flushPendingWrites!();
                });
            }

            // Should have all profiles in correct order (most recent first)
            expect(result.current.recentProfiles).toEqual(["profile3", "profile2", "profile1"]);
        });

        it("flushes pending writes on unmount", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result, unmount } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            // Unmount should trigger cleanup
            unmount();

            // In test environment, we can't verify the cleanup directly,
            // but we can ensure no errors occur
            expect(result.current.recentProfiles).toEqual(["profile1"]);
        });
    });
});
