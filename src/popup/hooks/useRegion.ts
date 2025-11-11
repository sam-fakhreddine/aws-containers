/**
 * Custom hook for managing AWS region selection
 * Handles loading and saving the selected region preference
 */

import { useState, useCallback, useEffect } from "react";
import browser from "webextension-polyfill";
import { STORAGE_KEYS } from "../constants";

const DEFAULT_REGION = "us-east-1";

interface UseRegionReturn {
    selectedRegion: string;
    setRegion: (region: string) => Promise<void>;
    loading: boolean;
}

/**
 * Hook for managing AWS region selection
 * @returns Region state and management functions
 */
export function useRegion(): UseRegionReturn {
    const [selectedRegion, setSelectedRegion] = useState<string>(DEFAULT_REGION);
    const [loading, setLoading] = useState(true);

    /**
     * Load selected region from storage on mount
     */
    useEffect(() => {
        const loadRegion = async () => {
            try {
                const data = await browser.storage.local.get(STORAGE_KEYS.SELECTED_REGION);
                if (data.selectedRegion && typeof data.selectedRegion === "string") {
                    setSelectedRegion(data.selectedRegion);
                }
            } catch (err) {
                console.error("Failed to load selected region:", err);
            } finally {
                setLoading(false);
            }
        };

        loadRegion();
    }, []);

    /**
     * Set and persist the selected region
     */
    const setRegion = useCallback(
        async (region: string): Promise<void> => {
            try {
                setSelectedRegion(region);
                await browser.storage.local.set({
                    [STORAGE_KEYS.SELECTED_REGION]: region,
                });
            } catch (err) {
                console.error("Failed to save selected region:", err);
                // State already updated, log but don't revert
                throw err;
            }
        },
        []
    );

    return {
        selectedRegion,
        setRegion,
        loading,
    };
}
