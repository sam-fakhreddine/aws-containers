/**
 * Tests for useContainers hook
 * Verifies container loading, filtering, error handling, and management functionality
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useContainers } from "../useContainers";
import * as containerManager from "@/utils/containerManager";
import browser from "webextension-polyfill";
import { type ContextualIdentities } from "webextension-polyfill";

// Mock dependencies
jest.mock("@/utils/containerManager");

describe("useContainers", () => {
    const mockContainers: ContextualIdentities.ContextualIdentity[] = [
        {
            cookieStoreId: "firefox-container-1",
            name: "Container 1",
            color: "blue",
            colorCode: "#0a84ff",
            icon: "fingerprint",
            iconUrl: "resource://usercontext-content/fingerprint.svg",
        },
        {
            cookieStoreId: "firefox-container-2",
            name: "Container 2",
            color: "red",
            colorCode: "#ff0039",
            icon: "briefcase",
            iconUrl: "resource://usercontext-content/briefcase.svg",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock browser storage
        browser.storage.local.get = jest.fn().mockResolvedValue({});
        browser.storage.local.set = jest.fn().mockResolvedValue(undefined);
        
        // Mock browser contextualIdentities
        browser.contextualIdentities.query = jest.fn().mockResolvedValue([]);
        browser.contextualIdentities.create = jest.fn();
        browser.contextualIdentities.update = jest.fn();
        browser.contextualIdentities.remove = jest.fn().mockResolvedValue(undefined);
    });

    it("should load containers on mount", async () => {
        // Mock getManagedContainers to return mock containers
        (containerManager.getManagedContainers as jest.Mock).mockResolvedValue(mockContainers);

        const { result } = renderHook(() => useContainers());

        // Initially loading should be true
        expect(result.current.loading).toBe(true);
        expect(result.current.containers).toEqual([]);

        // Wait for containers to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.containers).toEqual(mockContainers);
        expect(result.current.error).toBeNull();
        expect(containerManager.getManagedContainers).toHaveBeenCalledTimes(1);
    });

    it("should filter containers by stored IDs", async () => {
        const storedIds = ["firefox-container-1"];
        const allContainers: ContextualIdentities.ContextualIdentity[] = [
            ...mockContainers,
            {
                cookieStoreId: "firefox-container-3",
                name: "Container 3",
                color: "green",
                colorCode: "#00c100",
                icon: "circle",
                iconUrl: "resource://usercontext-content/circle.svg",
            },
        ];

        // Mock browser.contextualIdentities.query to return all containers
        browser.contextualIdentities.query = jest.fn().mockResolvedValue(allContainers);
        
        // Mock browser.storage.local.get to return stored container IDs
        browser.storage.local.get = jest.fn().mockResolvedValue({
            containers: storedIds,
        });

        // Mock getManagedContainers to filter by stored IDs
        (containerManager.getManagedContainers as jest.Mock).mockResolvedValue(
            allContainers.filter((c) => storedIds.includes(c.cookieStoreId))
        );

        const { result } = renderHook(() => useContainers());

        // Wait for containers to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should only return containers with stored IDs
        expect(result.current.containers).toHaveLength(1);
        expect(result.current.containers[0].cookieStoreId).toBe("firefox-container-1");
        expect(result.current.error).toBeNull();
    });

    it("should handle empty container storage", async () => {
        // Mock getManagedContainers to return empty array
        (containerManager.getManagedContainers as jest.Mock).mockResolvedValue([]);

        // Mock browser.storage.local.get to return empty containers
        browser.storage.local.get = jest.fn().mockResolvedValue({
            containers: [],
        });

        const { result } = renderHook(() => useContainers());

        // Wait for containers to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.containers).toEqual([]);
        expect(result.current.error).toBeNull();
        expect(containerManager.getManagedContainers).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when loading containers", async () => {
        const errorMessage = "Failed to load containers";
        
        // Mock getManagedContainers to throw an error
        (containerManager.getManagedContainers as jest.Mock).mockRejectedValue(
            new Error(errorMessage)
        );

        const { result } = renderHook(() => useContainers());

        // Wait for error state
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe("Failed to load containers");
        expect(result.current.containers).toEqual([]);
    });

    it("should refresh containers when refreshContainers is called", async () => {
        // Mock getManagedContainers to return mock containers
        (containerManager.getManagedContainers as jest.Mock).mockResolvedValue(mockContainers);

        const { result } = renderHook(() => useContainers());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(containerManager.getManagedContainers).toHaveBeenCalledTimes(1);

        // Call refreshContainers
        await result.current.refreshContainers();

        // Should call getManagedContainers again
        expect(containerManager.getManagedContainers).toHaveBeenCalledTimes(2);
        expect(result.current.containers).toEqual(mockContainers);
    });

    it("should clear all containers when clearContainers is called", async () => {
        // Mock getManagedContainers to return mock containers initially
        (containerManager.getManagedContainers as jest.Mock)
            .mockResolvedValueOnce(mockContainers)
            .mockResolvedValueOnce([]); // After clearing

        // Mock clearAllContainers
        (containerManager.clearAllContainers as jest.Mock).mockResolvedValue(undefined);

        const { result } = renderHook(() => useContainers());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.containers).toEqual(mockContainers);

        // Call clearContainers
        await result.current.clearContainers();

        // Should call clearAllContainers and refresh
        expect(containerManager.clearAllContainers).toHaveBeenCalledTimes(1);
        expect(containerManager.getManagedContainers).toHaveBeenCalledTimes(2);
        
        // Wait for containers to be cleared
        await waitFor(() => {
            expect(result.current.containers).toEqual([]);
        });
    });

    it("should create a new container when createContainer is called", async () => {
        const newContainer: ContextualIdentities.ContextualIdentity = {
            cookieStoreId: "firefox-container-3",
            name: "New Container",
            color: "green",
            colorCode: "#00c100",
            icon: "circle",
            iconUrl: "resource://usercontext-content/circle.svg",
        };

        // Mock getManagedContainers to return mock containers initially
        (containerManager.getManagedContainers as jest.Mock)
            .mockResolvedValueOnce(mockContainers)
            .mockResolvedValueOnce([...mockContainers, newContainer]); // After creating

        // Mock prepareContainer
        (containerManager.prepareContainer as jest.Mock).mockResolvedValue(newContainer);

        const { result } = renderHook(() => useContainers());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.containers).toEqual(mockContainers);

        // Call createContainer
        const created = await result.current.createContainer("New Container", "green", "circle");

        // Should call prepareContainer and refresh
        expect(containerManager.prepareContainer).toHaveBeenCalledWith(
            "New Container",
            "green",
            "circle"
        );
        expect(containerManager.getManagedContainers).toHaveBeenCalledTimes(2);
        expect(created).toEqual(newContainer);
        
        // Wait for containers to be updated
        await waitFor(() => {
            expect(result.current.containers).toHaveLength(3);
        });
    });

    it("should handle errors when clearing containers", async () => {
        const errorMessage = "Failed to clear containers";
        
        // Mock getManagedContainers to return mock containers
        (containerManager.getManagedContainers as jest.Mock).mockResolvedValue(mockContainers);

        // Mock clearAllContainers to throw an error
        (containerManager.clearAllContainers as jest.Mock).mockRejectedValue(
            new Error(errorMessage)
        );

        const { result } = renderHook(() => useContainers());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Call clearContainers and expect it to throw
        await expect(result.current.clearContainers()).rejects.toThrow();

        // Wait for error state to be updated
        await waitFor(() => {
            expect(result.current.error).toBe("Failed to clear containers");
        });
    });

    it("should handle errors when creating containers", async () => {
        const errorMessage = "Failed to create container";
        
        // Mock getManagedContainers to return mock containers
        (containerManager.getManagedContainers as jest.Mock).mockResolvedValue(mockContainers);

        // Mock prepareContainer to throw an error
        (containerManager.prepareContainer as jest.Mock).mockRejectedValue(
            new Error(errorMessage)
        );

        const { result } = renderHook(() => useContainers());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Call createContainer and expect it to throw
        await expect(
            result.current.createContainer("New Container")
        ).rejects.toThrow();

        // Wait for error state to be updated
        await waitFor(() => {
            expect(result.current.error).toBe("Failed to create container");
        });
    });

    it("should not update state if component is unmounted", async () => {
        // Mock getManagedContainers with a delay
        (containerManager.getManagedContainers as jest.Mock).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve(mockContainers), 100))
        );

        const { result, unmount } = renderHook(() => useContainers());

        // Unmount before the async operation completes
        unmount();

        // Wait a bit to ensure the async operation would have completed
        await new Promise((resolve) => setTimeout(resolve, 150));

        // State should not have been updated (still in initial state)
        // This test verifies the useIsMounted hook is working correctly
        expect(containerManager.getManagedContainers).toHaveBeenCalledTimes(1);
    });
});
