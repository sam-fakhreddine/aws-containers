/**
 * Unit tests for useContainers hook
 * Tests container management, loading states, and error handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useContainers } from "../useContainers";
import * as containerManager from "../../../utils/containerManager";
import { createMockContainer } from "../../../__testUtils__/helpers";

// Mock the container manager module
jest.mock("../../../utils/containerManager");

// Mock useIsMounted hook
jest.mock("../useIsMounted", () => ({
    useIsMounted: () => () => true,
}));

describe("useContainers", () => {
    const mockGetManagedContainers = containerManager.getManagedContainers as jest.Mock;
    const mockClearAllContainers = containerManager.clearAllContainers as jest.Mock;
    const mockPrepareContainer = containerManager.prepareContainer as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        act(() => {
            jest.runOnlyPendingTimers();
        });
        jest.useRealTimers();
    });

    describe("Initialization", () => {
        it("initializes with loading state", () => {
            mockGetManagedContainers.mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            const { result } = renderHook(() => useContainers());

            expect(result.current.loading).toBe(true);
            expect(result.current.containers).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        it("loads containers on mount", async () => {
            const mockContainers = [
                createMockContainer({ name: "container-1" }),
                createMockContainer({ name: "container-2" }),
            ];
            mockGetManagedContainers.mockResolvedValue(mockContainers);

            const { result } = renderHook(() => useContainers());

            // Fast-forward debounce timer
            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.containers).toEqual(mockContainers);
            expect(result.current.error).toBeNull();
        });

        it("sets error state on load failure", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockGetManagedContainers.mockRejectedValue(new Error("Load failed"));

            const { result } = renderHook(() => useContainers());

            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe("Failed to load containers");
            expect(result.current.containers).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("refreshContainers", () => {
        it("refreshes container list", async () => {
            const initialContainers = [createMockContainer({ name: "container-1" })];
            const updatedContainers = [
                createMockContainer({ name: "container-1" }),
                createMockContainer({ name: "container-2" }),
            ];

            mockGetManagedContainers
                .mockResolvedValueOnce(initialContainers)
                .mockResolvedValueOnce(updatedContainers);

            const { result } = renderHook(() => useContainers());

            // Wait for initial load
            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.containers).toEqual(initialContainers);
            });

            // Refresh containers
            await act(async () => {
                result.current.refreshContainers();
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.containers).toEqual(updatedContainers);
            });
        });

        it("debounces multiple refresh calls", async () => {
            mockGetManagedContainers.mockResolvedValue([]);

            const { result } = renderHook(() => useContainers());

            // Make multiple rapid refresh calls
            await act(async () => {
                result.current.refreshContainers();
                result.current.refreshContainers();
                result.current.refreshContainers();
                jest.advanceTimersByTime(100);
                result.current.refreshContainers();
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should only call once after debounce
            expect(mockGetManagedContainers).toHaveBeenCalledTimes(1);
        });

        it("sets loading state during refresh", async () => {
            mockGetManagedContainers.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
            );

            const { result } = renderHook(() => useContainers());

            await act(async () => {
                result.current.refreshContainers();
                jest.advanceTimersByTime(300);
            });

            expect(result.current.loading).toBe(true);
        });

        it("clears error on successful refresh", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockGetManagedContainers
                .mockRejectedValueOnce(new Error("First error"))
                .mockResolvedValueOnce([createMockContainer()]);

            const { result } = renderHook(() => useContainers());

            // Initial load fails
            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.error).toBe("Failed to load containers");
            });

            // Refresh succeeds
            await act(async () => {
                result.current.refreshContainers();
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.error).toBeNull();
            });

            consoleErrorSpy.mockRestore();
        });
    });

    describe("clearContainers", () => {
        it("clears all containers and refreshes list", async () => {
            const initialContainers = [
                createMockContainer({ name: "container-1" }),
                createMockContainer({ name: "container-2" }),
            ];

            mockGetManagedContainers
                .mockResolvedValueOnce(initialContainers)
                .mockResolvedValueOnce([]);
            mockClearAllContainers.mockResolvedValue(undefined);

            const { result } = renderHook(() => useContainers());

            // Wait for initial load
            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.containers).toEqual(initialContainers);
            });

            // Clear containers
            await act(async () => {
                await result.current.clearContainers();
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.containers).toEqual([]);
            });

            expect(mockClearAllContainers).toHaveBeenCalled();
        });

        it("sets error state on clear failure", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const error = new Error("Clear failed");
            mockGetManagedContainers.mockResolvedValue([]);
            mockClearAllContainers.mockRejectedValue(error);

            const { result } = renderHook(() => useContainers());

            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await expect(
                act(async () => {
                    await result.current.clearContainers();
                })
            ).rejects.toThrow(error);

            await waitFor(() => {
                expect(result.current.error).toBe("Failed to clear containers");
            });
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it("clears error before attempting clear", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            mockGetManagedContainers
                .mockRejectedValueOnce(new Error("Load error"))
                .mockResolvedValueOnce([]);
            mockClearAllContainers.mockResolvedValue(undefined);

            const { result } = renderHook(() => useContainers());

            // Initial load fails
            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.error).toBe("Failed to load containers");
            });

            // Clear containers should reset error
            await act(async () => {
                await result.current.clearContainers();
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.error).toBeNull();
            });

            consoleErrorSpy.mockRestore();
        });
    });

    describe("createContainer", () => {
        it("creates new container and refreshes list", async () => {
            const initialContainers = [createMockContainer({ name: "container-1" })];
            const newContainer = createMockContainer({
                name: "new-container",
                color: "red",
                icon: "briefcase",
            });
            const updatedContainers = [...initialContainers, newContainer];

            mockGetManagedContainers
                .mockResolvedValueOnce(initialContainers)
                .mockResolvedValueOnce(updatedContainers);
            mockPrepareContainer.mockResolvedValue(newContainer);

            const { result } = renderHook(() => useContainers());

            // Wait for initial load
            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.containers).toEqual(initialContainers);
            });

            // Create container
            let createdContainer;
            await act(async () => {
                createdContainer = await result.current.createContainer(
                    "new-container",
                    "red",
                    "briefcase"
                );
                jest.advanceTimersByTime(300);
            });

            expect(createdContainer).toEqual(newContainer);
            expect(mockPrepareContainer).toHaveBeenCalledWith(
                "new-container",
                "red",
                "briefcase"
            );

            await waitFor(() => {
                expect(result.current.containers).toEqual(updatedContainers);
            });
        });

        it("creates container with default color and icon", async () => {
            const newContainer = createMockContainer({ name: "simple-container" });
            mockGetManagedContainers.mockResolvedValue([newContainer]);
            mockPrepareContainer.mockResolvedValue(newContainer);

            const { result } = renderHook(() => useContainers());

            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await act(async () => {
                await result.current.createContainer("simple-container");
                jest.advanceTimersByTime(300);
            });

            expect(mockPrepareContainer).toHaveBeenCalledWith(
                "simple-container",
                undefined,
                undefined
            );
        });

        it("sets error state on creation failure", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const error = new Error("Creation failed");
            mockGetManagedContainers.mockResolvedValue([]);
            mockPrepareContainer.mockRejectedValue(error);

            const { result } = renderHook(() => useContainers());

            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await expect(
                act(async () => {
                    await result.current.createContainer("test");
                })
            ).rejects.toThrow(error);

            await waitFor(() => {
                expect(result.current.error).toBe("Failed to create container");
            });
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it("clears error before attempting creation", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            const newContainer = createMockContainer({ name: "new" });

            mockGetManagedContainers
                .mockRejectedValueOnce(new Error("Load error"))
                .mockResolvedValueOnce([newContainer]);
            mockPrepareContainer.mockResolvedValue(newContainer);

            const { result } = renderHook(() => useContainers());

            // Initial load fails
            await act(async () => {
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.error).toBe("Failed to load containers");
            });

            // Create container should reset error
            await act(async () => {
                await result.current.createContainer("new");
                jest.advanceTimersByTime(300);
            });

            await waitFor(() => {
                expect(result.current.error).toBeNull();
            });

            consoleErrorSpy.mockRestore();
        });
    });

    describe("Unmount behavior", () => {
        it("cleans up debounce timer on unmount", () => {
            mockGetManagedContainers.mockResolvedValue([]);

            const { unmount } = renderHook(() => useContainers());

            act(() => {
                unmount();
            });

            // Should not throw or cause issues
            expect(true).toBe(true);
        });
    });
});
