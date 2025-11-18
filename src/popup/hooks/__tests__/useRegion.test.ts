/**
 * Unit tests for useRegion hook
 * Tests region selection and persistence
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import browser from "webextension-polyfill";
import { useRegion } from "../useRegion";
import { STORAGE_KEYS } from "../../constants";

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

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
    });

    describe("Initialization", () => {
        it("initializes with default region us-east-1", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.selectedRegion).toBe("us-east-1");
        });

        it("loads saved region from storage", async () => {
            mockStorageGet.mockResolvedValue({ selectedRegion: "us-west-2" });

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.selectedRegion).toBe("us-west-2");
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

            // Should fall back to default region
            expect(result.current.selectedRegion).toBe("us-east-1");
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it("ignores invalid storage data", async () => {
            mockStorageGet.mockResolvedValue({ selectedRegion: 12345 });

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should use default region when data is invalid
            expect(result.current.selectedRegion).toBe("us-east-1");
        });
    });

    describe("setRegion", () => {
        it("updates selected region", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion("eu-west-1");
            });

            expect(result.current.selectedRegion).toBe("eu-west-1");
        });

        it("persists region to storage", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion("ap-southeast-1");
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.SELECTED_REGION]: "ap-southeast-1",
            });
        });

        it("updates state immediately before persisting", async () => {
            mockStorageGet.mockResolvedValue({});
            // Delay storage set to ensure state updates first
            let resolveStorage: () => void;
            mockStorageSet.mockReturnValue(
                new Promise((resolve) => {
                    resolveStorage = () => resolve(undefined);
                })
            );

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            act(() => {
                result.current.setRegion("us-west-1");
            });

            // State should update immediately
            expect(result.current.selectedRegion).toBe("us-west-1");

            // Complete storage operation
            resolveStorage!();
            await waitFor(() => {
                expect(mockStorageSet).toHaveBeenCalled();
            });
        });

        it("throws error when storage fails", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const error = new Error("Storage error");
            mockStorageGet.mockResolvedValue({});
            mockStorageSet.mockRejectedValue(error);

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(
                act(async () => {
                    await result.current.setRegion("us-east-2");
                })
            ).rejects.toThrow(error);

            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });

        it("logs error when storage fails", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const error = new Error("Storage error");
            mockStorageGet.mockResolvedValue({});
            mockStorageSet.mockRejectedValue(error);

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(
                act(async () => {
                    await result.current.setRegion("eu-central-1");
                })
            ).rejects.toThrow(error);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Failed to save selected region:",
                error
            );
            consoleErrorSpy.mockRestore();
        });
    });

    describe("Common AWS regions", () => {
        const regions = [
            "us-east-1",
            "us-east-2",
            "us-west-1",
            "us-west-2",
            "eu-west-1",
            "eu-central-1",
            "ap-southeast-1",
            "ap-northeast-1",
        ];

        regions.forEach((region) => {
            it(`handles ${region} region`, async () => {
                mockStorageGet.mockResolvedValue({});

                const { result } = renderHook(() => useRegion());

                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });

                await act(async () => {
                    await result.current.setRegion(region);
                });

                expect(result.current.selectedRegion).toBe(region);
                expect(mockStorageSet).toHaveBeenCalledWith({
                    [STORAGE_KEYS.SELECTED_REGION]: region,
                });
            });
        });
    });

    describe("Multiple region changes", () => {
        it("handles sequential region changes", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion("us-west-2");
            });
            expect(result.current.selectedRegion).toBe("us-west-2");

            await act(async () => {
                await result.current.setRegion("eu-west-1");
            });
            expect(result.current.selectedRegion).toBe("eu-west-1");

            await act(async () => {
                await result.current.setRegion("ap-southeast-1");
            });
            expect(result.current.selectedRegion).toBe("ap-southeast-1");

            expect(mockStorageSet).toHaveBeenCalledTimes(3);
        });

        it("handles setting same region multiple times", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.setRegion("us-east-1");
            });

            await act(async () => {
                await result.current.setRegion("us-east-1");
            });

            expect(result.current.selectedRegion).toBe("us-east-1");
            expect(mockStorageSet).toHaveBeenCalledTimes(2);
        });
    });

    describe("Hook return values", () => {
        it("returns selectedRegion, setRegion, and loading", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current).toHaveProperty("selectedRegion");
            expect(result.current).toHaveProperty("setRegion");
            expect(result.current).toHaveProperty("loading");
            expect(typeof result.current.setRegion).toBe("function");
            expect(typeof result.current.selectedRegion).toBe("string");
            expect(typeof result.current.loading).toBe("boolean");
        });
    });

    describe("Edge cases", () => {
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

        it("handles region with special characters", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const specialRegion = "custom-region-123";
            await act(async () => {
                await result.current.setRegion(specialRegion);
            });

            expect(result.current.selectedRegion).toBe(specialRegion);
        });

        it("handles very long region string", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            const longRegion = "a".repeat(1000);
            await act(async () => {
                await result.current.setRegion(longRegion);
            });

            expect(result.current.selectedRegion).toBe(longRegion);
        });
    });

    describe("Persistence", () => {
        it("region persists across hook instances", async () => {
            mockStorageGet.mockResolvedValue({ selectedRegion: "eu-west-1" });

            const { result: result1 } = renderHook(() => useRegion());
            const { result: result2 } = renderHook(() => useRegion());

            await waitFor(() => {
                expect(result1.current.loading).toBe(false);
                expect(result2.current.loading).toBe(false);
            });

            expect(result1.current.selectedRegion).toBe("eu-west-1");
            expect(result2.current.selectedRegion).toBe("eu-west-1");
        });
    });
});
