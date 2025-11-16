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

/**
 * Sort profiles by credential status, then alphabetically
 * Priority:
 * 1. Has credentials + not expired
 * 2. Has credentials + expired
 * 3. No credentials
 * Within each group, sort alphabetically by name
 */
function sortProfilesByCredentialStatus(profiles: AWSProfile[]): AWSProfile[] {
    return profiles.sort((a, b) => {
        // First, sort by credential availability
        if (a.has_credentials !== b.has_credentials) {
            return a.has_credentials ? -1 : 1;
        }

        // If both have credentials or both don't, sort by expiration status
        if (a.has_credentials && b.has_credentials) {
            if (a.expired !== b.expired) {
                return a.expired ? 1 : -1;
            }
        }

        // Finally, sort alphabetically by name
        return a.name.localeCompare(b.name);
    });
}

interface UseProfilesReturn {
    profiles: AWSProfile[];
    loading: boolean;
    error: string | null;
    nativeMessagingAvailable: boolean;
    loadProfiles: (forceRefresh?: boolean) => Promise<void>;
    refreshProfiles: () => Promise<void>;
    enrichSSOProfiles: (profileNames?: string[]) => Promise<void>;
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
                        const ssoCount = data.cachedProfiles.filter(p => p.is_sso).length;
                        const credCount = data.cachedProfiles.length - ssoCount;
                        console.log(`Loading ${data.cachedProfiles.length} profiles from cache (age: ${Math.round(cacheAge / 1000)}s)`);
                        console.log(`  - SSO profiles: ${ssoCount}`);
                        console.log(`  - Credential profiles: ${credCount}`);
                        setProfiles(data.cachedProfiles);
                        setLoading(false);
                        return true;
                    } else {
                        console.log(`Cache expired (age: ${Math.round(cacheAge / 1000)}s > ${CACHE_DURATION_MS / 1000}s)`);
                    }
                }
            } else {
                console.log("No cache found");
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
                            // Debug logging
                            console.log(`Received ${response.profiles.length} profiles from native messaging host`);
                            const ssoCount = response.profiles.filter(p => p.is_sso).length;
                            const credCount = response.profiles.length - ssoCount;
                            console.log(`  - SSO profiles: ${ssoCount}`);
                            console.log(`  - Credential profiles: ${credCount}`);

                            // Sort profiles by credential status, then alphabetically
                            const sortedProfiles = sortProfilesByCredentialStatus(response.profiles);
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
                console.error("Native messaging connection error:", err);
                setError(
                    "Could not connect to AWS Profile Bridge. " +
                    "Please run ./install.sh to set up the native messaging host. " +
                    "After installation, restart Firefox and try again."
                );
                setNativeMessagingAvailable(false);
                setLoading(false);
            }
        },
        [profiles.length, loadFromCache, saveToCache]
    );

    /**
     * Refreshes profiles (forces reload from native messaging host)
     * Explicitly clears cache first to ensure fresh data
     */
    const refreshProfiles = useCallback(async (): Promise<void> => {
        try {
            // Explicitly clear the cache first
            await browser.storage.local.remove([
                STORAGE_KEYS.CACHED_PROFILES,
                STORAGE_KEYS.PROFILES_CACHE_TIME,
            ]);
            console.log("Cache cleared, forcing fresh profile load from native messaging host");
        } catch (err) {
            console.error("Failed to clear cache:", err);
        }

        // Force reload from native messaging (bypass cache)
        await loadProfiles(true);
    }, [loadProfiles]);

    /**
     * Enriches SSO profiles with token validation (slow operation)
     * This validates SSO tokens and updates expiration info
     */
    const enrichSSOProfiles = useCallback(async (profileNames?: string[]): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            // Connect to native messaging host
            const port = browser.runtime.connectNative(NATIVE_MESSAGING_HOST_NAME);
            portRef.current = port;

            // Message listener
            const messageListener = async (response: unknown) => {
                try {
                    if (isProfileListResponse(response)) {
                        // Sort profiles by credential status, then alphabetically
                        const sortedProfiles = sortProfilesByCredentialStatus(response.profiles);
                        setProfiles(sortedProfiles);
                        setLoading(false);

                        // Cache the enriched profiles
                        await saveToCache(sortedProfiles);
                    } else if (isErrorResponse(response)) {
                        setError(response.message);
                        setLoading(false);
                    } else {
                        setError("Received invalid response from native messaging host");
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("Error handling SSO enrichment response:", err);
                    setError("Failed to process SSO enrichment");
                    setLoading(false);
                }
            };

            // Disconnect listener
            const disconnectListener = () => {
                if (browser.runtime.lastError) {
                    setError(
                        `Native messaging error: ${browser.runtime.lastError.message}`
                    );
                }
                setLoading(false);
                portRef.current = null;
            };

            // Attach listeners
            port.onMessage.addListener(messageListener);
            port.onDisconnect.addListener(disconnectListener);

            // Request SSO profile enrichment
            port.postMessage({
                action: "enrichSSOProfiles",
                profileNames: profileNames || [],
            });
        } catch (err) {
            console.error("SSO enrichment error:", err);
            setError("Failed to enrich SSO profiles");
            setLoading(false);
        }
    }, [saveToCache]);

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
        enrichSSOProfiles,
    };
}
