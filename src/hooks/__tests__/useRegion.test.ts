/**
 * Unit tests for useRegion hook
 * Tests region selection, persistence, and default region handling
 */

import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { useRegion } from "@/hooks/useRegion";
import browser from "webextension-polyfill";
import { STORAGE_KEYS } from "@/constants";

// Mock webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
}));

describe("useRegion", () => {
    const mockStorageGet = browser.storage.local.get as jest.Mock;
    const mockStorageSet = browser.storage.local.set as jest.Mock;
    const DEFAULT_REGION = "us-east-1";

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
    });

    describe("Initialization", () => {
        it("initializes with default region when storage is empty", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.selectedRegion).toBe(DEFAULT_REGION);
        });

        it("loads selected region from storage", async () => {
            const storedRegion = "eu-west-1";
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.SELECTED_REGION]: storedRegion });

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.selectedRegion).toBe(storedRegion);
        });

        it("sets loading state correctly", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it("handles storage load errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockStorageGet.mockRejectedValue(new Error("Storage error"));

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should default to us-east-1 on error
            expect(result.current.selectedRegion).toBe(DEFAULT_REGION);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it("handles invalid data types in storage", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.SELECTED_REGION]: 12345 });

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should default to us-east-1 for invalid data
            expect(result.current.selectedRegion).toBe(DEFAULT_REGION);
        });
    });

    describe("setRegion", () => {
        it("sets and persists a new region", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const newRegion = "ap-southeast-1";

            await act(async () => {
                await result.current.setRegion(newRegion);
            });

            expect(result.current.selectedRegion).toBe(newRegion);
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.SELECTED_REGION]: newRegion,
            });
        });

        it("updates region multiple times", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion("eu-west-1");
            });

            expect(result.current.selectedRegion).toBe("eu-west-1");

            await act(async () => {
                await result.current.setRegion("ap-northeast-1");
            });

            expect(result.current.selectedRegion).toBe("ap-northeast-1");
            expect(mockStorageSet).toHaveBeenCalledTimes(2);
        });

        it("persists region to storage immediately", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion("us-west-2");
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.SELECTED_REGION]: "us-west-2",
            });
        });

        it("logs error when storage fails", async () => {
            mockStorageGet.mockResolvedValue({});
            mockStorageSet.mockRejectedValue(new Error("Storage error"));
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(async () => {
                await act(async () => {
                    await result.current.setRegion("eu-central-1");
                });
            }).rejects.toThrow("Storage error");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Failed to save selected region:",
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it("allows setting the same region again", async () => {
            const initialRegion = "us-east-1";
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.SELECTED_REGION]: initialRegion });

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion(initialRegion);
            });

            expect(result.current.selectedRegion).toBe(initialRegion);
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.SELECTED_REGION]: initialRegion,
            });
        });
    });

    describe("Region Persistence", () => {
        it("persists region across hook instances", async () => {
            const region = "ca-central-1";
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.SELECTED_REGION]: region });

            const { result: result1 } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
            });

            expect(result1.current.selectedRegion).toBe(region);

            // Create a new instance
            const { result: result2 } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result2.current.loading).toBe(false);
            });

            expect(result2.current.selectedRegion).toBe(region);
        });

        it("loads persisted region after setting", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result, unmount } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const newRegion = "sa-east-1";

            await act(async () => {
                await result.current.setRegion(newRegion);
            });

            unmount();

            // Simulate loading from storage on next mount
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.SELECTED_REGION]: newRegion });

            const { result: result2 } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result2.current.loading).toBe(false);
            });

            expect(result2.current.selectedRegion).toBe(newRegion);
        });
    });

    describe("Edge Cases", () => {
        it("handles empty string region", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion("");
            });

            expect(result.current.selectedRegion).toBe("");
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.SELECTED_REGION]: "",
            });
        });

        it("handles special characters in region", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const specialRegion = "test-region-123";

            await act(async () => {
                await result.current.setRegion(specialRegion);
            });

            expect(result.current.selectedRegion).toBe(specialRegion);
        });
    });
});
