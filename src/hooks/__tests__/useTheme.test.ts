/**
 * Unit tests for useTheme hook
 * Tests theme management, system theme detection, and persistence
 */

import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { useTheme } from "@/hooks/useTheme";
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

// Mock Cloudscape applyMode
jest.mock("@cloudscape-design/global-styles", () => ({
    applyMode: jest.fn(),
}));

describe("useTheme", () => {
    const mockStorageGet = browser.storage.local.get as jest.Mock;
    const mockStorageSet = browser.storage.local.set as jest.Mock;
    let mockMatchMedia: jest.Mock;
    let mediaQueryListeners: ((e: MediaQueryListEvent) => void)[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageGet.mockResolvedValue({});
        mockStorageSet.mockResolvedValue(undefined);
        mediaQueryListeners = [];

        // Mock window.matchMedia
        mockMatchMedia = jest.fn().mockImplementation((query: string) => ({
            matches: false, // Default to light mode
            media: query,
            onchange: null,
            addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
                if (event === "change") {
                    mediaQueryListeners.push(handler);
                }
            }),
            removeEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
                if (event === "change") {
                    const index = mediaQueryListeners.indexOf(handler);
                    if (index > -1) {
                        mediaQueryListeners.splice(index, 1);
                    }
                }
            }),
            addListener: jest.fn((handler: (e: MediaQueryListEvent) => void) => {
                mediaQueryListeners.push(handler);
            }),
            removeListener: jest.fn((handler: (e: MediaQueryListEvent) => void) => {
                const index = mediaQueryListeners.indexOf(handler);
                if (index > -1) {
                    mediaQueryListeners.splice(index, 1);
                }
            }),
            dispatchEvent: jest.fn(),
        }));

        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: mockMatchMedia,
        });
    });

    describe("Initialization", () => {
        it("initializes with system theme mode", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });
        });

        it("loads theme mode from storage", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "dark" });

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("dark");
            });
        });

        it("resolves system theme to light when system prefers light", async () => {
            mockStorageGet.mockResolvedValue({});
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false, // prefers-color-scheme: dark is false = light mode
                media: query,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                addListener: jest.fn(),
                removeListener: jest.fn(),
                dispatchEvent: jest.fn(),
            }));

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
                expect(result.current.resolvedTheme).toBe("light");
            });
        });

        it("resolves system theme to dark when system prefers dark", async () => {
            mockStorageGet.mockResolvedValue({});
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: true, // prefers-color-scheme: dark is true
                media: query,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                addListener: jest.fn(),
                removeListener: jest.fn(),
                dispatchEvent: jest.fn(),
            }));

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
                expect(result.current.resolvedTheme).toBe("dark");
            });
        });

        it("handles storage load errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockStorageGet.mockRejectedValue(new Error("Storage error"));

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("setMode", () => {
        it("sets theme to light mode", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });

            await act(async () => {
                await result.current.setMode("light");
            });

            expect(result.current.mode).toBe("light");
            expect(result.current.resolvedTheme).toBe("light");
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.THEME_MODE]: "light",
            });
        });

        it("sets theme to dark mode", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });

            await act(async () => {
                await result.current.setMode("dark");
            });

            expect(result.current.mode).toBe("dark");
            expect(result.current.resolvedTheme).toBe("dark");
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.THEME_MODE]: "dark",
            });
        });

        it("sets theme back to system mode", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "dark" });

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("dark");
            });

            await act(async () => {
                await result.current.setMode("system");
            });

            expect(result.current.mode).toBe("system");
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.THEME_MODE]: "system",
            });
        });

        it("persists theme mode to storage", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });

            await act(async () => {
                await result.current.setMode("dark");
            });

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.THEME_MODE]: "dark",
            });
        });

        it("handles storage error on set", async () => {
            mockStorageGet.mockResolvedValue({});
            mockStorageSet.mockRejectedValue(new Error("Storage error"));
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });

            await act(async () => {
                await result.current.setMode("dark");
            });

            // State is updated even if storage fails
            expect(result.current.mode).toBe("dark");
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("System Theme Detection", () => {
        it("listens for system theme changes", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
                expect(result.current.resolvedTheme).toBe("light");
            });

            // Simulate system theme change to dark
            act(() => {
                mediaQueryListeners.forEach((listener) => {
                    listener({ matches: true } as MediaQueryListEvent);
                });
            });

            await waitFor(() => {
                expect(result.current.resolvedTheme).toBe("dark");
            });
        });

        it("updates resolved theme when system changes", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.resolvedTheme).toBe("light");
            });

            // Simulate system theme change to dark
            act(() => {
                mediaQueryListeners.forEach((listener) => {
                    listener({ matches: true } as MediaQueryListEvent);
                });
            });

            await waitFor(() => {
                expect(result.current.resolvedTheme).toBe("dark");
            });

            // Simulate system theme change back to light
            act(() => {
                mediaQueryListeners.forEach((listener) => {
                    listener({ matches: false } as MediaQueryListEvent);
                });
            });

            await waitFor(() => {
                expect(result.current.resolvedTheme).toBe("light");
            });
        });

        it("does not update resolved theme when mode is not system", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "dark" });

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("dark");
                expect(result.current.resolvedTheme).toBe("dark");
            });

            // Simulate system theme change (should not affect resolved theme)
            act(() => {
                mediaQueryListeners.forEach((listener) => {
                    listener({ matches: false } as MediaQueryListEvent);
                });
            });

            // Resolved theme should still be dark (not affected by system change)
            expect(result.current.resolvedTheme).toBe("dark");
        });

        it("cleans up event listener on unmount", async () => {
            mockStorageGet.mockResolvedValue({});

            const { result, unmount } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });

            // Unmount should not throw errors
            expect(() => unmount()).not.toThrow();
        });

        it("handles legacy addListener API", async () => {
            mockStorageGet.mockResolvedValue({});

            // Mock legacy API (no addEventListener)
            const addListenerMock = jest.fn((handler: (e: MediaQueryListEvent) => void) => {
                mediaQueryListeners.push(handler);
            });
            const removeListenerMock = jest.fn((handler: (e: MediaQueryListEvent) => void) => {
                const index = mediaQueryListeners.indexOf(handler);
                if (index > -1) {
                    mediaQueryListeners.splice(index, 1);
                }
            });

            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false,
                media: query,
                addEventListener: null, // Explicitly null to trigger legacy path
                removeEventListener: null,
                addListener: addListenerMock,
                removeListener: removeListenerMock,
                dispatchEvent: jest.fn(),
            }));

            const { result, unmount } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
            });

            expect(addListenerMock).toHaveBeenCalled();

            unmount();

            expect(removeListenerMock).toHaveBeenCalled();
        });
    });

    describe("Resolved Theme", () => {
        it("resolves light mode directly", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "light" });

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("light");
                expect(result.current.resolvedTheme).toBe("light");
            });
        });

        it("resolves dark mode directly", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "dark" });

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("dark");
                expect(result.current.resolvedTheme).toBe("dark");
            });
        });

        it("resolves system mode based on system preference", async () => {
            mockStorageGet.mockResolvedValue({ [STORAGE_KEYS.THEME_MODE]: "system" });
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: true, // System prefers dark
                media: query,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                addListener: jest.fn(),
                removeListener: jest.fn(),
                dispatchEvent: jest.fn(),
            }));

            const { result } = renderHook(() => useTheme());

            await waitFor(() => {
                expect(result.current.mode).toBe("system");
                expect(result.current.resolvedTheme).toBe("dark");
            });
        });
    });
});
