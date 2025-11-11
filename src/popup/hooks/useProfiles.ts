/**
 * Custom hook for managing AWS profiles
 * Handles profile loading, caching, and native messaging communication
 */

import { useState, useCallback, useRef, useEffect } from "react";
import browser from "webextension-polyfill";
import type { Runtime } from "webextension-polyfill";
import {
    CACHE_DURATION_MS,
    NATIVE_MESSAGING_HOST_NAME,
    STORAGE_KEYS,
} from "../constants";
import {
    AWSProfile,
    isProfileListResponse,
    isErrorResponse,
    isAWSProfileArray,
} from "../types";

interface UseProfilesReturn {
    profiles: AWSProfile[];
    loading: boolean;
    error: string | null;
    nativeMessagingAvailable: boolean;
    loadProfiles: (forceRefresh?: boolean) => Promise<void>;
    refreshProfiles: () => Promise<void>;
}

/**
 * Hook for managing AWS profiles
 * @returns Profile state and management functions
 */
export function useProfiles(): UseProfilesReturn {
    const [profiles, setProfiles] = useState<AWSProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nativeMessagingAvailable, setNativeMessagingAvailable] = useState(false);

    // Store port reference for cleanup
    const portRef = useRef<Runtime.Port | null>(null);

    /**
     * Loads profiles from cache if available and recent
     */
    const loadFromCache = useCallback(async (): Promise<boolean> => {
        try {
            const data = await browser.storage.local.get([
                STORAGE_KEYS.CACHED_PROFILES,
                STORAGE_KEYS.PROFILES_CACHE_TIME,
            ]);

            if (data.cachedProfiles && data.profilesCacheTime) {
                if (
                    typeof data.profilesCacheTime === "number" &&
                    isAWSProfileArray(data.cachedProfiles)
                ) {
                    const cacheAge = Date.now() - data.profilesCacheTime;
                    if (cacheAge < CACHE_DURATION_MS) {
                        setProfiles(data.cachedProfiles);
                        setLoading(false);
                        return true;
                    }
                }
            }
            return false;
        } catch (err) {
            console.error("Failed to load profiles from cache:", err);
            return false;
        }
    }, []);

    /**
     * Saves profiles to cache
     */
    const saveToCache = useCallback(async (profileList: AWSProfile[]): Promise<void> => {
        try {
            await browser.storage.local.set({
                [STORAGE_KEYS.CACHED_PROFILES]: profileList,
                [STORAGE_KEYS.PROFILES_CACHE_TIME]: Date.now(),
            });
        } catch (err) {
            console.error("Failed to save profiles to cache:", err);
        }
    }, []);

    /**
     * Loads profiles from native messaging host
     */
    const loadProfiles = useCallback(
        async (forceRefresh: boolean = false): Promise<void> => {
            // If not forcing refresh and we have profiles, don't reload
            if (!forceRefresh && profiles.length > 0) {
                return;
            }

            // Try to load from cache first (unless forcing refresh)
            if (!forceRefresh) {
                const cachedSuccessfully = await loadFromCache();
                if (cachedSuccessfully) {
                    return;
                }
            }

            setLoading(true);
            setError(null);

            try {
                // Disconnect existing port if any
                if (portRef.current) {
                    try {
                        portRef.current.disconnect();
                    } catch (e) {
                        // Port may already be disconnected
                    }
                    portRef.current = null;
                }

                // Connect to native messaging host
                const port = browser.runtime.connectNative(NATIVE_MESSAGING_HOST_NAME);
                portRef.current = port;
                setNativeMessagingAvailable(true);

                // Message listener
                const messageListener = async (response: unknown) => {
                    try {
                        if (isProfileListResponse(response)) {
                            // Sort profiles alphabetically by name
                            const sortedProfiles = response.profiles.sort(
                                (a: AWSProfile, b: AWSProfile) =>
                                    a.name.localeCompare(b.name)
                            );
                            setProfiles(sortedProfiles);
                            setLoading(false);

                            // Cache the profiles
                            await saveToCache(sortedProfiles);
                        } else if (isErrorResponse(response)) {
                            setError(response.message);
                            setLoading(false);
                        } else {
                            setError("Received invalid response from native messaging host");
                            setLoading(false);
                        }
                    } catch (err) {
                        console.error("Error handling profile list response:", err);
                        setError("Failed to process profile list");
                        setLoading(false);
                    }
                };

                // Disconnect listener
                const disconnectListener = () => {
                    if (browser.runtime.lastError) {
                        setError(
                            `Native messaging error: ${browser.runtime.lastError.message}`
                        );
                        setNativeMessagingAvailable(false);
                    }
                    setLoading(false);
                    portRef.current = null;
                };

                // Attach listeners
                port.onMessage.addListener(messageListener);
                port.onDisconnect.addListener(disconnectListener);

                // Request profile list
                port.postMessage({ action: "getProfiles" });
            } catch (err) {
                setError(`Failed to connect to native messaging host: ${err}`);
                setNativeMessagingAvailable(false);
                setLoading(false);
            }
        },
        [profiles.length, loadFromCache, saveToCache]
    );

    /**
     * Refreshes profiles (forces reload from native messaging host)
     */
    const refreshProfiles = useCallback(async (): Promise<void> => {
        await loadProfiles(true);
    }, [loadProfiles]);

    /**
     * Cleanup: Disconnect port when component unmounts
     */
    useEffect(() => {
        return () => {
            if (portRef.current) {
                try {
                    portRef.current.disconnect();
                } catch (e) {
                    // Port may already be disconnected
                }
                portRef.current = null;
            }
        };
    }, []);

    return {
        profiles,
        loading,
        error,
        nativeMessagingAvailable,
        loadProfiles,
        refreshProfiles,
    };
}
