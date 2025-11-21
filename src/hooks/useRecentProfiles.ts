/**
 * Custom hook for managing recent profiles
 * Handles loading, saving, and tracking recently accessed profiles
 */

import { useState, useCallback, useEffect, useRef } from "react";
import browser from "webextension-polyfill";
import { STORAGE_KEYS, MAX_RECENT_PROFILES } from "@/constants";
import { isStringArray } from "@/types";

interface UseRecentProfilesReturn {
    recentProfiles: string[];
    addRecentProfile: (profileName: string) => Promise<void>;
    clearRecentProfiles: () => Promise<void>;
    loading: boolean;
    flushPendingWrites?: () => Promise<void>;
}

/**
 * Hook for managing recently accessed profiles
 * @returns Recent profiles state and management functions
 */
export function useRecentProfiles(): UseRecentProfilesReturn {
    const [recentProfiles, setRecentProfiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingRecentRef = useRef<string[] | null>(null);

    /**
     * Load recent profiles from storage on mount
     */
    useEffect(() => {
        const loadRecentProfiles = async () => {
            try {
                const result = await browser.storage.local.get(STORAGE_KEYS.RECENT_PROFILES);
                const data = result as Record<string, unknown>;
                if (data && 'recentProfiles' in data && isStringArray(data.recentProfiles)) {
                    setRecentProfiles(data.recentProfiles);
                }
            } catch (err) {
                console.error("Failed to load recent profiles:", err);
            } finally {
                setLoading(false);
            }
        };

        loadRecentProfiles();

        return () => {
            // Cleanup: flush pending writes on unmount
            if (batchTimerRef.current) {
                clearTimeout(batchTimerRef.current);
            }
        };
    }, []);

    /**
     * Flush pending writes immediately
     */
    const flushPendingWrites = useCallback(async () => {
        if (batchTimerRef.current) {
            clearTimeout(batchTimerRef.current);
            batchTimerRef.current = null;
        }
        if (pendingRecentRef.current) {
            await browser.storage.local.set({
                [STORAGE_KEYS.RECENT_PROFILES]: pendingRecentRef.current,
            });
            pendingRecentRef.current = null;
        }
    }, []);

    /**
     * Batch write recent profiles to storage
     */
    const batchWriteRecent = useCallback((updatedRecent: string[]) => {
        pendingRecentRef.current = updatedRecent;

        if (batchTimerRef.current) {
            clearTimeout(batchTimerRef.current);
        }

        batchTimerRef.current = setTimeout(async () => {
            try {
                await flushPendingWrites();
            } catch (err) {
                console.error("Failed to write recent profiles:", err);
            }
        }, 500);
    }, [flushPendingWrites]);

    /**
     * Add a profile to recent profiles (moves to front if already exists)
     */
    const addRecentProfile = useCallback(
        async (profileName: string): Promise<void> => {
            try {
                // Skip if already at the front to avoid unnecessary operations
                if (recentProfiles.length > 0 && recentProfiles[0] === profileName) {
                    return;
                }

                // Move profile to front, remove duplicates, limit to MAX_RECENT_PROFILES
                const updatedRecent = [
                    profileName,
                    ...recentProfiles.filter((p) => p !== profileName),
                ].slice(0, MAX_RECENT_PROFILES);

                setRecentProfiles(updatedRecent);
                batchWriteRecent(updatedRecent);
            } catch (err) {
                console.error("Failed to add recent profile:", err);
                // Revert on error
                setRecentProfiles([...recentProfiles]);
                throw err;
            }
        },
        [recentProfiles, batchWriteRecent]
    );

    /**
     * Clear all recent profiles
     */
    const clearRecentProfiles = useCallback(async (): Promise<void> => {
        try {
            setRecentProfiles([]);
            await browser.storage.local.set({
                [STORAGE_KEYS.RECENT_PROFILES]: [],
            });
        } catch (err) {
            console.error("Failed to clear recent profiles:", err);
            throw err;
        }
    }, []);

    return {
        recentProfiles,
        addRecentProfile,
        clearRecentProfiles,
        loading,
        ...(process.env.NODE_ENV === 'test' && { flushPendingWrites }),
    };
}
