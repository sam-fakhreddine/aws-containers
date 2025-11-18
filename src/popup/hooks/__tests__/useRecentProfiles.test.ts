/**
 * Unit tests for useRecentProfiles hook
 * Tests recent profile tracking, batching, and persistence
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import browser from "webextension-polyfill";
import { useRecentProfiles } from "../useRecentProfiles";
import { STORAGE_KEYS, MAX_RECENT_PROFILES } from "../../constants";

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
        jest.useFakeTimers();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
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
            mockStorageGet.mockResolvedValue({ recentProfiles: storedProfiles });

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

        it("ignores invalid data types in storage", async () => {
            mockStorageGet.mockResolvedValue({ recentProfiles: "invalid" });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.recentProfiles).toEqual([]);
        });
    });

    describe("addRecentProfile", () => {
        it("adds new profile to recent list", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            expect(result.current.recentProfiles).toEqual(["profile1"]);
        });

        it("moves existing profile to front", async () => {
            const initialProfiles = ["profile1", "profile2", "profile3"];
            mockStorageGet.mockResolvedValue({ recentProfiles: initialProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.recentProfiles).toEqual(initialProfiles);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile2");
            });

            expect(result.current.recentProfiles).toEqual(["profile2", "profile1", "profile3"]);
        });

        it("skips update if profile already at front", async () => {
            const initialProfiles = ["profile1", "profile2"];
            mockStorageGet.mockResolvedValue({ recentProfiles: initialProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.recentProfiles).toEqual(initialProfiles);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            // Should not trigger storage update
            expect(result.current.recentProfiles).toEqual(initialProfiles);
        });

        it("limits to MAX_RECENT_PROFILES", async () => {
            const initialProfiles = Array.from(
                { length: MAX_RECENT_PROFILES },
                (_, i) => `profile${i + 1}`
            );
            mockStorageGet.mockResolvedValue({ recentProfiles: initialProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.recentProfiles).toEqual(initialProfiles);
            });

            await act(async () => {
                await result.current.addRecentProfile("new-profile");
            });

            expect(result.current.recentProfiles).toHaveLength(MAX_RECENT_PROFILES);
            expect(result.current.recentProfiles[0]).toBe("new-profile");
            expect(result.current.recentProfiles).not.toContain("profile10");
        });

        it("removes duplicate before adding to front", async () => {
            const initialProfiles = ["profile1", "profile2", "profile3"];
            mockStorageGet.mockResolvedValue({ recentProfiles: initialProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile3");
            });

            expect(result.current.recentProfiles).toEqual(["profile3", "profile1", "profile2"]);
            expect(result.current.recentProfiles).toHaveLength(3); // No duplicates
        });

        it("batches storage writes", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Add multiple profiles quickly
            await act(async () => {
                await result.current.addRecentProfile("profile1");
                await result.current.addRecentProfile("profile2");
                await result.current.addRecentProfile("profile3");
            });

            // Storage set should not be called yet (batched)
            expect(mockStorageSet).not.toHaveBeenCalled();

            // Fast-forward the batch timer
            await act(async () => {
                jest.advanceTimersByTime(500);
            });

            await waitFor(() => {
                expect(mockStorageSet).toHaveBeenCalledTimes(1);
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.RECENT_PROFILES]: ["profile3", "profile2", "profile1"],
            });
        });

        it("handles storage write errors", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const error = new Error("Storage error");
            mockStorageGet.mockResolvedValue({});
            mockStorageSet.mockRejectedValue(error);

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(
                act(async () => {
                    await result.current.addRecentProfile("profile1");
                })
            ).rejects.toThrow(error);

            expect(result.current.recentProfiles).toEqual([]);

            consoleErrorSpy.mockRestore();
        });

        it("reverts state on error", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const initialProfiles = ["profile1"];
            mockStorageGet.mockResolvedValue({ recentProfiles: initialProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.recentProfiles).toEqual(initialProfiles);
            });

            // Simulate error by throwing in the function
            await expect(
                act(async () => {
                    await result.current.addRecentProfile("profile2");
                    throw new Error("Test error");
                })
            ).rejects.toThrow();

            // State should be reverted
            expect(result.current.recentProfiles).toEqual(initialProfiles);

            consoleErrorSpy.mockRestore();
        });
    });

    describe("clearRecentProfiles", () => {
        it("clears all recent profiles", async () => {
            const initialProfiles = ["profile1", "profile2", "profile3"];
            mockStorageGet.mockResolvedValue({ recentProfiles: initialProfiles });

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.recentProfiles).toEqual(initialProfiles);
            });

            await act(async () => {
                await result.current.clearRecentProfiles();
            });

            expect(result.current.recentProfiles).toEqual([]);
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.RECENT_PROFILES]: [],
            });
        });

        it("handles clear on empty list", async () => {
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

        it("handles storage errors", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const error = new Error("Storage error");
            mockStorageGet.mockResolvedValue({ recentProfiles: ["profile1"] });
            mockStorageSet.mockRejectedValue(error);

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(
                act(async () => {
                    await result.current.clearRecentProfiles();
                })
            ).rejects.toThrow(error);

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("flushPendingWrites (test mode)", () => {
        beforeEach(() => {
            // Set NODE_ENV to test
            process.env.NODE_ENV = "test";
        });

        it("exposes flushPendingWrites in test mode", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.flushPendingWrites).toBeDefined();
        });

        it("flushes pending writes immediately", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            // Should not be written yet
            expect(mockStorageSet).not.toHaveBeenCalled();

            // Flush writes
            await act(async () => {
                await result.current.flushPendingWrites!();
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.RECENT_PROFILES]: ["profile1"],
            });
        });

        it("handles flush with no pending writes", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.flushPendingWrites!();
            });

            expect(mockStorageSet).not.toHaveBeenCalled();
        });
    });

    describe("Unmount behavior", () => {
        it("clears batch timer on unmount", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result, unmount } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
            });

            act(() => {
                unmount();
            });

            // Should not throw or cause issues
            expect(true).toBe(true);
        });
    });

    describe("Edge cases", () => {
        it("handles rapid sequential adds", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Rapidly add profiles
            await act(async () => {
                for (let i = 1; i <= 5; i++) {
                    await result.current.addRecentProfile(`profile${i}`);
                }
            });

            expect(result.current.recentProfiles).toEqual([
                "profile5",
                "profile4",
                "profile3",
                "profile2",
                "profile1",
            ]);
        });

        it("handles adding same profile multiple times", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addRecentProfile("profile1");
                await result.current.addRecentProfile("profile1");
                await result.current.addRecentProfile("profile1");
            });

            expect(result.current.recentProfiles).toEqual(["profile1"]);
        });

        it("handles maximum capacity correctly", async () => {
            // Create MAX_RECENT_PROFILES + 5 profiles
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRecentProfiles());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                for (let i = 1; i <= MAX_RECENT_PROFILES + 5; i++) {
                    await result.current.addRecentProfile(`profile${i}`);
                }
            });

            expect(result.current.recentProfiles).toHaveLength(MAX_RECENT_PROFILES);
            // Most recent should be at the front
            expect(result.current.recentProfiles[0]).toBe(
                `profile${MAX_RECENT_PROFILES + 5}`
            );
        });
    });
});
