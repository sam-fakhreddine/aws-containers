/**
 * Unit tests for useFavorites hook
 * Tests favorite management, persistence, and state updates
 */

import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { useFavorites } from "@/hooks/useFavorites";
import browser from "webextension-polyfill";

// Mock webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
}));

describe("useFavorites", () => {
    const mockStorageGet = browser.storage.local.get as jest.Mock;
    const mockStorageSet = browser.storage.local.set as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
    });

    describe("Initialization", () => {
        it("initializes with empty favorites", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.favorites).toEqual([]);
        });

        it("loads favorites from storage", async () => {
            const storedFavorites = ["profile1", "profile2"];
            mockStorageGet.mockResolvedValue({ favorites: storedFavorites });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.favorites).toEqual(storedFavorites);
        });

        it("sets loading state correctly", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it("handles storage load errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockStorageGet.mockRejectedValue(new Error("Storage error"));

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.favorites).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("isFavorite", () => {
        it("returns true for favorited profile", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1"] });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.isFavorite("profile1")).toBe(true);
        });

        it("returns false for non-favorited profile", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1"] });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.isFavorite("profile2")).toBe(false);
        });

        it("returns false for empty favorites", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.isFavorite("profile1")).toBe(false);
        });
    });

    describe("addFavorite", () => {
        it("adds a favorite successfully", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addFavorite("profile1");
            });

            expect(result.current.favorites).toEqual(["profile1"]);
            expect(mockStorageSet).toHaveBeenCalledWith({
                favorites: ["profile1"],
            });
        });

        it("adds multiple favorites", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addFavorite("profile1");
            });

            await act(async () => {
                await result.current.addFavorite("profile2");
            });

            expect(result.current.favorites).toEqual(["profile1", "profile2"]);
        });

        it("does not add duplicate favorites", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1"] });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addFavorite("profile1");
            });

            // Should still have only one instance
            expect(result.current.favorites).toEqual(["profile1"]);
            // Storage should not be called for duplicate
            expect(mockStorageSet).not.toHaveBeenCalled();
        });

        it("reverts state on storage error", async () => {
            mockStorageGet.mockResolvedValue({});
            mockStorageSet.mockRejectedValue(new Error("Storage error"));
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(async () => {
                await act(async () => {
                    await result.current.addFavorite("profile1");
                });
            }).rejects.toThrow();

            // State should be reverted
            expect(result.current.favorites).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("removeFavorite", () => {
        it("removes a favorite successfully", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1", "profile2"] });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.removeFavorite("profile1");
            });

            expect(result.current.favorites).toEqual(["profile2"]);
            expect(mockStorageSet).toHaveBeenCalledWith({
                favorites: ["profile2"],
            });
        });

        it("does not error when removing non-existent favorite", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1"] });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.removeFavorite("profile2");
            });

            expect(result.current.favorites).toEqual(["profile1"]);
            // Storage should not be called for non-existent favorite
            expect(mockStorageSet).not.toHaveBeenCalled();
        });

        it("reverts state on storage error", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1"] });
            mockStorageSet.mockRejectedValue(new Error("Storage error"));
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(async () => {
                await act(async () => {
                    await result.current.removeFavorite("profile1");
                });
            }).rejects.toThrow();

            // State should be reverted
            expect(result.current.favorites).toEqual(["profile1"]);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("toggleFavorite", () => {
        it("adds favorite when not present", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.toggleFavorite("profile1");
            });

            expect(result.current.favorites).toEqual(["profile1"]);
        });

        it("removes favorite when present", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1"] });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.toggleFavorite("profile1");
            });

            expect(result.current.favorites).toEqual([]);
        });

        it("toggles multiple times correctly", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Add
            await act(async () => {
                await result.current.toggleFavorite("profile1");
            });
            expect(result.current.favorites).toEqual(["profile1"]);

            // Remove
            await act(async () => {
                await result.current.toggleFavorite("profile1");
            });
            expect(result.current.favorites).toEqual([]);

            // Add again
            await act(async () => {
                await result.current.toggleFavorite("profile1");
            });
            expect(result.current.favorites).toEqual(["profile1"]);
        });
    });

    describe("Storage Persistence", () => {
        it("persists favorites to storage on add", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addFavorite("profile1");
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                favorites: ["profile1"],
            });
        });

        it("persists favorites to storage on remove", async () => {
            mockStorageGet.mockResolvedValue({ favorites: ["profile1", "profile2"] });

            const { result } = renderHook(() => useFavorites());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.removeFavorite("profile1");
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                favorites: ["profile2"],
            });
        });
    });
});
