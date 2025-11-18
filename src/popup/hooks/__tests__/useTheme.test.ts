/**
 * Unit tests for useTheme hook
 * Tests theme mode management, system theme detection, and persistence
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import browser from "webextension-polyfill";
import { useTheme } from "../useTheme";
import { STORAGE_KEYS } from "../../constants";
import { applyMode } from "@cloudscape-design/global-styles";

// Mock webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
}));

// Mock cloudscape applyMode
jest.mock("@cloudscape-design/global-styles", () => ({
    applyMode: jest.fn(),
}));

describe("useTheme", () => {
    const mockStorageGet = browser.storage.local.get as jest.Mock;
    const mockStorageSet = browser.storage.local.set as jest.Mock;
    const mockApplyMode = applyMode as jest.Mock;

    let mockMediaQuery: {
        matches: boolean;
        addEventListener?: jest.Mock;
        removeEventListener?: jest.Mock;
        addListener?: jest.Mock;
        removeListener?: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
        mockApplyMode.mockReturnValue(undefined);

        // Mock matchMedia
        mockMediaQuery = {
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };

        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: jest.fn().mockImplementation(() => mockMediaQuery),
        });
    });

    afterEach(() => {
        // Clean up
        delete (window as any).matchMedia;
    });

    describe("Initialization", () => {
        it("initializes with system mode by default", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(mockStorageGet).toHaveBeenCalled();
            });

            expect(result.current.mode).toBe("system");
        });

        it("loads saved theme mode from storage", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "dark" });

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("dark");
            });
        });

        it("detects light system theme", () => {
            mockMediaQuery.matches = false; // Light theme

            const { result } = renderHook(() => useTheme());

            expect(result.current.resolvedTheme).toBe("light");
        });

        it("detects dark system theme", () => {
            mockMediaQuery.matches = true; // Dark theme

            const { result } = renderHook(() => useTheme());

            expect(result.current.resolvedTheme).toBe("dark");
        });

        it("handles storage load errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockStorageGet.mockRejectedValue(new Error("Storage error"));

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalled();
            });

            // Should fall back to default system mode
            expect(result.current.mode).toBe("system");

            consoleErrorSpy.mockRestore();
        });
    });

    describe("setMode", () => {
        it("sets light mode", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("light");
            });

            expect(result.current.mode).toBe("light");
            expect(result.current.resolvedTheme).toBe("light");
        });

        it("sets dark mode", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("dark");
            });

            expect(result.current.mode).toBe("dark");
            expect(result.current.resolvedTheme).toBe("dark");
        });

        it("sets system mode", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("system");
            });

            expect(result.current.mode).toBe("system");
        });

        it("persists mode to storage", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("dark");
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.THEME_MODE]: "dark",
            });
        });

        it("handles storage errors", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockStorageSet.mockRejectedValue(new Error("Storage error"));

            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("dark");
            });

            expect(consoleErrorSpy).toHaveBeenCalled();
            // State should still update despite storage error
            expect(result.current.mode).toBe("dark");

            consoleErrorSpy.mockRestore();
        });
    });

    describe("Resolved theme", () => {
        it("resolves to light when mode is light", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("light");
            });

            expect(result.current.resolvedTheme).toBe("light");
        });

        it("resolves to dark when mode is dark", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("dark");
            });

            expect(result.current.resolvedTheme).toBe("dark");
        });

        it("resolves to system theme when mode is system", () => {
            mockMediaQuery.matches = true; // Dark system theme

            const { result } = renderHook(() => useTheme());

            expect(result.current.mode).toBe("system");
            expect(result.current.resolvedTheme).toBe("dark");
        });

        it("updates resolved theme when system theme changes", () => {
            mockMediaQuery.matches = false; // Light initially

            const { result, rerender } = renderHook(() => useTheme());

            expect(result.current.resolvedTheme).toBe("light");

            // Simulate system theme change
            act(() => {
                mockMediaQuery.matches = true;
                const changeHandler = mockMediaQuery.addEventListener?.mock.calls.find(
                    (call) => call[0] === "change"
                )?.[1];

                if (changeHandler) {
                    changeHandler({ matches: true } as MediaQueryListEvent);
                }
            });

            expect(result.current.resolvedTheme).toBe("dark");
        });
    });

    describe("CloudScape integration", () => {
        it("applies light mode to CloudScape", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("light");
            });

            await waitFor(() => {
                expect(mockApplyMode).toHaveBeenCalledWith("light");
            });
        });

        it("applies dark mode to CloudScape", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("dark");
            });

            await waitFor(() => {
                expect(mockApplyMode).toHaveBeenCalledWith("dark");
            });
        });

        it("applies system theme to CloudScape", () => {
            mockMediaQuery.matches = true; // Dark system theme

            renderHook(() => useTheme());

            expect(mockApplyMode).toHaveBeenCalledWith("dark");
        });
    });

    describe("System theme listener", () => {
        it("sets up system theme listener on mount", () => {
            renderHook(() => useTheme());

            expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
                "change",
                expect.any(Function)
            );
        });

        it("removes system theme listener on unmount", () => {
            const { unmount } = renderHook(() => useTheme());

            unmount();

            expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith(
                "change",
                expect.any(Function)
            );
        });

        it("uses legacy addListener if addEventListener not available", () => {
            mockMediaQuery.addEventListener = undefined;
            mockMediaQuery.addListener = jest.fn();
            mockMediaQuery.removeListener = jest.fn();

            const { unmount } = renderHook(() => useTheme());

            expect(mockMediaQuery.addListener).toHaveBeenCalledWith(expect.any(Function));

            unmount();

            expect(mockMediaQuery.removeListener).toHaveBeenCalledWith(
                expect.any(Function)
            );
        });

        it("handles missing matchMedia gracefully", () => {
            delete (window as any).matchMedia;

            const { result } = renderHook(() => useTheme());

            // Should still work with default values
            expect(result.current.mode).toBe("system");
            expect(result.current.resolvedTheme).toBe("light"); // Default fallback
        });
    });

    describe("Multiple mode changes", () => {
        it("handles sequential mode changes", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("light");
            });
            expect(result.current.mode).toBe("light");

            await act(async () => {
                await result.current.setMode("dark");
            });
            expect(result.current.mode).toBe("dark");

            await act(async () => {
                await result.current.setMode("system");
            });
            expect(result.current.mode).toBe("system");

            expect(mockStorageSet).toHaveBeenCalledTimes(3);
        });

        it("handles setting same mode multiple times", async () => {
            const { result } = renderHook(() => useTheme());

            await act(async () => {
                await result.current.setMode("dark");
            });

            await act(async () => {
                await result.current.setMode("dark");
            });

            expect(result.current.mode).toBe("dark");
            expect(mockStorageSet).toHaveBeenCalledTimes(2);
        });
    });

    describe("Hook return values", () => {
        it("returns mode, resolvedTheme, and setMode", () => {
            const { result } = renderHook(() => useTheme());

            expect(result.current).toHaveProperty("mode");
            expect(result.current).toHaveProperty("resolvedTheme");
            expect(result.current).toHaveProperty("setMode");
            expect(typeof result.current.setMode).toBe("function");
        });

        it("mode is one of light, dark, or system", () => {
            const { result } = renderHook(() => useTheme());

            expect(["light", "dark", "system"]).toContain(result.current.mode);
        });

        it("resolvedTheme is either light or dark", () => {
            const { result } = renderHook(() => useTheme());

            expect(["light", "dark"]).toContain(result.current.resolvedTheme);
        });
    });

    describe("Edge cases", () => {
        it("handles rapid mode changes", async () => {
            const { result } = renderHook(() => useTheme());

            // Rapidly change modes
            await act(async () => {
                await result.current.setMode("light");
                await result.current.setMode("dark");
                await result.current.setMode("system");
                await result.current.setMode("light");
            });

            expect(result.current.mode).toBe("light");
        });

        it("system mode respects current system preference", () => {
            mockMediaQuery.matches = true; // System is dark

            const { result } = renderHook(() => useTheme());

            expect(result.current.mode).toBe("system");
            expect(result.current.resolvedTheme).toBe("dark");

            // Change to light and back to system
            act(() => {
                result.current.setMode("light");
            });

            expect(result.current.resolvedTheme).toBe("light");

            act(() => {
                result.current.setMode("system");
            });

            expect(result.current.resolvedTheme).toBe("dark"); // Back to dark system theme
        });
    });

    describe("Persistence", () => {
        it("theme persists across hook instances", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "dark" });

            const { result: result1 } = renderHook(() => useTheme());
            const { result: result2 } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result1.current.mode).toBe("dark");
                expect(result2.current.mode).toBe("dark");
            });
        });
    });
});
