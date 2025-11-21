/**
 * Custom hook for managing enabled regions
 */

import { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import { STORAGE_KEYS, AWS_REGIONS } from "../constants";

/**
 * Hook for managing enabled regions
 * @returns Filtered regions based on user selection
 */
export function useEnabledRegions() {
    const [enabledRegions, setEnabledRegions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEnabledRegions = async () => {
            try {
                const result = await browser.storage.local.get(STORAGE_KEYS.ENABLED_REGIONS);
                const enabled = (result[STORAGE_KEYS.ENABLED_REGIONS] as string[] | undefined) || [];
                setEnabledRegions(enabled);
            } catch (error) {
                console.error("Failed to load enabled regions:", error);
            } finally {
                setLoading(false);
            }
        };

        loadEnabledRegions();

        // Listen for changes
        const handleStorageChange = (
            changes: { [key: string]: browser.Storage.StorageChange },
            areaName: string
        ) => {
            if (areaName === "local" && changes[STORAGE_KEYS.ENABLED_REGIONS]) {
                setEnabledRegions((changes[STORAGE_KEYS.ENABLED_REGIONS].newValue as string[] | undefined) || []);
            }
        };

        browser.storage.onChanged.addListener(handleStorageChange);
        return () => browser.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    // Filter regions based on enabled list
    const filteredRegions = enabledRegions.length > 0
        ? AWS_REGIONS.filter(r => enabledRegions.includes(r.code))
        : AWS_REGIONS;

    return { regions: filteredRegions, loading };
}

export default useEnabledRegions;
