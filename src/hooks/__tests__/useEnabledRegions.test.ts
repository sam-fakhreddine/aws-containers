/**
 * Tests for useEnabledRegions hook
 * Verifies enabled regions loading, filtering, storage handling, and change listeners
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useEnabledRegions } from "../useEnabledRegions";
import browser from "webextension-polyfill";
import { STORAGE_KEYS, AWS_REGIONS } from "@/constants";

describe("useEnabledRegions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock browser storage
        browser.storage.local.get = jest.fn().mockResolvedValue({});
        browser.storage.local.set = jest.fn().mockResolvedValue(undefined);
        
        // Mock storage change listeners
        browser.storage.onChanged.addListener = jest.fn();
        browser.storage.onChanged.removeListener = jest.fn();
    });

    it("should load enabled regions from storage", async () => {
        const enabledRegionCodes = ["us-east-1", "us-west-2", "eu-west-1"];
        
        // Mock browser.storage.local.get to return enabled regions
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: enabledRegionCodes,
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Initially loading should be true
        expect(result.current.loading).toBe(true);

        // Wait for regions to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should return only the enabled regions
        expect(result.current.regions).toHaveLength(3);
        expect(result.current.regions.map(r => r.code)).toEqual(enabledRegionCodes);
        expect(browser.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.ENABLED_REGIONS);
    });

    it("should return all regions when storage is empty", async () => {
        // Mock browser.storage.local.get to return empty object
        browser.storage.local.get = jest.fn().mockResolvedValue({});

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for regions to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should return all AWS regions when no enabled regions are stored
        expect(result.current.regions).toEqual(AWS_REGIONS);
        expect(result.current.regions).toHaveLength(AWS_REGIONS.length);
    });

    it("should return all regions when enabled regions array is empty", async () => {
        // Mock browser.storage.local.get to return empty array
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: [],
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for regions to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should return all AWS regions when enabled regions is empty array
        expect(result.current.regions).toEqual(AWS_REGIONS);
        expect(result.current.regions).toHaveLength(AWS_REGIONS.length);
    });

    it("should handle storage errors gracefully", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
        
        // Mock browser.storage.local.get to throw an error
        browser.storage.local.get = jest.fn().mockRejectedValue(
            new Error("Storage access denied")
        );

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for error handling
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should return all regions as fallback
        expect(result.current.regions).toEqual(AWS_REGIONS);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Failed to load enabled regions:",
            expect.any(Error)
        );
        
        consoleErrorSpy.mockRestore();
    });

    it("should listen for storage changes", async () => {
        browser.storage.local.get = jest.fn().mockResolvedValue({});

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Verify listener was added
        expect(browser.storage.onChanged.addListener).toHaveBeenCalledTimes(1);
        expect(browser.storage.onChanged.addListener).toHaveBeenCalledWith(
            expect.any(Function)
        );
    });

    it("should update regions when storage changes", async () => {
        const initialRegions = ["us-east-1", "us-west-2"];
        const updatedRegions = ["eu-west-1", "ap-southeast-1"];
        
        // Mock initial storage
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: initialRegions,
        });

        let storageChangeHandler: any;
        browser.storage.onChanged.addListener = jest.fn((handler) => {
            storageChangeHandler = handler;
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.regions).toHaveLength(2);
        expect(result.current.regions.map(r => r.code)).toEqual(initialRegions);

        // Simulate storage change
        const changes = {
            [STORAGE_KEYS.ENABLED_REGIONS]: {
                newValue: updatedRegions,
                oldValue: initialRegions,
            },
        };
        storageChangeHandler(changes, "local");

        // Wait for regions to update
        await waitFor(() => {
            expect(result.current.regions.map(r => r.code)).toEqual(updatedRegions);
        });

        expect(result.current.regions).toHaveLength(2);
    });

    it("should handle storage change to empty array", async () => {
        const initialRegions = ["us-east-1", "us-west-2"];
        
        // Mock initial storage
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: initialRegions,
        });

        let storageChangeHandler: any;
        browser.storage.onChanged.addListener = jest.fn((handler) => {
            storageChangeHandler = handler;
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.regions).toHaveLength(2);

        // Simulate storage change to empty array
        const changes = {
            [STORAGE_KEYS.ENABLED_REGIONS]: {
                newValue: [],
                oldValue: initialRegions,
            },
        };
        storageChangeHandler(changes, "local");

        // Wait for regions to update
        await waitFor(() => {
            expect(result.current.regions).toEqual(AWS_REGIONS);
        });
    });

    it("should handle storage change to undefined", async () => {
        const initialRegions = ["us-east-1", "us-west-2"];
        
        // Mock initial storage
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: initialRegions,
        });

        let storageChangeHandler: any;
        browser.storage.onChanged.addListener = jest.fn((handler) => {
            storageChangeHandler = handler;
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.regions).toHaveLength(2);

        // Simulate storage change to undefined (key deleted)
        const changes = {
            [STORAGE_KEYS.ENABLED_REGIONS]: {
                newValue: undefined,
                oldValue: initialRegions,
            },
        };
        storageChangeHandler(changes, "local");

        // Wait for regions to update
        await waitFor(() => {
            expect(result.current.regions).toEqual(AWS_REGIONS);
        });
    });

    it("should ignore storage changes from other areas", async () => {
        const initialRegions = ["us-east-1", "us-west-2"];
        
        // Mock initial storage
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: initialRegions,
        });

        let storageChangeHandler: any;
        browser.storage.onChanged.addListener = jest.fn((handler) => {
            storageChangeHandler = handler;
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const initialRegionCodes = result.current.regions.map(r => r.code);

        // Simulate storage change from sync area (should be ignored)
        const changes = {
            [STORAGE_KEYS.ENABLED_REGIONS]: {
                newValue: ["eu-west-1"],
                oldValue: initialRegions,
            },
        };
        storageChangeHandler(changes, "sync");

        // Wait a bit to ensure no update happens
        await new Promise(resolve => setTimeout(resolve, 50));

        // Regions should not have changed
        expect(result.current.regions.map(r => r.code)).toEqual(initialRegionCodes);
    });

    it("should ignore storage changes for other keys", async () => {
        const initialRegions = ["us-east-1", "us-west-2"];
        
        // Mock initial storage
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: initialRegions,
        });

        let storageChangeHandler: any;
        browser.storage.onChanged.addListener = jest.fn((handler) => {
            storageChangeHandler = handler;
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const initialRegionCodes = result.current.regions.map(r => r.code);

        // Simulate storage change for different key
        const changes = {
            [STORAGE_KEYS.FAVORITES]: {
                newValue: ["profile1"],
                oldValue: [],
            },
        };
        storageChangeHandler(changes, "local");

        // Wait a bit to ensure no update happens
        await new Promise(resolve => setTimeout(resolve, 50));

        // Regions should not have changed
        expect(result.current.regions.map(r => r.code)).toEqual(initialRegionCodes);
    });

    it("should remove listener on unmount", async () => {
        browser.storage.local.get = jest.fn().mockResolvedValue({});

        const { unmount } = renderHook(() => useEnabledRegions());

        // Wait for initial load
        await waitFor(() => {
            expect(browser.storage.onChanged.addListener).toHaveBeenCalledTimes(1);
        });

        // Unmount the hook
        unmount();

        // Verify listener was removed
        expect(browser.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
        expect(browser.storage.onChanged.removeListener).toHaveBeenCalledWith(
            expect.any(Function)
        );
    });

    it("should filter regions correctly based on enabled list", async () => {
        const enabledRegionCodes = ["us-east-1", "eu-west-1", "ap-southeast-1"];
        
        // Mock browser.storage.local.get to return enabled regions
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: enabledRegionCodes,
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for regions to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Verify filtered regions match enabled list
        expect(result.current.regions).toHaveLength(3);
        result.current.regions.forEach((region) => {
            expect(enabledRegionCodes).toContain(region.code);
        });

        // Verify region objects have correct structure
        result.current.regions.forEach((region) => {
            expect(region).toHaveProperty("code");
            expect(region).toHaveProperty("name");
            expect(typeof region.code).toBe("string");
            expect(typeof region.name).toBe("string");
        });
    });

    it("should maintain region order from AWS_REGIONS constant", async () => {
        const enabledRegionCodes = ["eu-west-1", "us-east-1", "ap-southeast-1"];
        
        // Mock browser.storage.local.get to return enabled regions in different order
        browser.storage.local.get = jest.fn().mockResolvedValue({
            [STORAGE_KEYS.ENABLED_REGIONS]: enabledRegionCodes,
        });

        const { result } = renderHook(() => useEnabledRegions());

        // Wait for regions to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Get expected order from AWS_REGIONS
        const expectedOrder = AWS_REGIONS
            .filter(r => enabledRegionCodes.includes(r.code))
            .map(r => r.code);

        // Verify regions are in AWS_REGIONS order, not storage order
        expect(result.current.regions.map(r => r.code)).toEqual(expectedOrder);
    });
});
