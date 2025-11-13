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
     * Loads profiles from TinyDB cache (via native messaging host)
     * This is instant as the cache is maintained by the Python backend
     */
    const loadFromCache = useCallback(async (): Promise<boolean> => {
        try {
            // Connect to native messaging host
            const port = browser.runtime.connectNative(NATIVE_MESSAGING_HOST_NAME);
            portRef.current = port;
            setNativeMessagingAvailable(true);

            return new Promise((resolve) => {
                let resolved = false;

                // Message listener
                const messageListener = async (response: unknown) => {
                    if (resolved) return;
                    resolved = true;

                    try {
                        if (isProfileListResponse(response)) {
                            // Sort profiles alphabetically by name
                            const sortedProfiles = response.profiles.sort(
                                (a: AWSProfile, b: AWSProfile) =>
                                    a.name.localeCompare(b.name)
                            );
                            setProfiles(sortedProfiles);
                            setLoading(false);

                            // Check if this came from cache
                            const fromCache = (response as any).fromCache === true;
                            console.log(
                                `Loaded ${sortedProfiles.length} profiles ${fromCache ? "from cache (instant)" : "from files"}`
                            );

                            resolve(true);
                        } else if (isErrorResponse(response)) {
                            console.error("Error loading cached profiles:", response.message);
                            resolve(false);
                        } else {
                            console.error("Invalid response from getCachedProfiles");
                            resolve(false);
                        }
                    } catch (err) {
                        console.error("Error handling cached profile response:", err);
                        resolve(false);
                    } finally {
                        // Clean up port
                        try {
                            port.disconnect();
                        } catch (e) {
                            // Ignore
                        }
                        portRef.current = null;
                    }
                };

                // Disconnect listener
                const disconnectListener = () => {
                    if (!resolved) {
                        resolved = true;
                        console.error("Native messaging disconnected during cache load");
                        resolve(false);
                    }
                    portRef.current = null;
                };

                // Attach listeners
                port.onMessage.addListener(messageListener);
                port.onDisconnect.addListener(disconnectListener);

                // Request cached profiles (instant if cache is valid)
                port.postMessage({ action: "getCachedProfiles" });
            });
        } catch (err) {
            console.error("Failed to load profiles from cache:", err);
            setNativeMessagingAvailable(false);
            return false;
        }
    }, []);

    /**
     * Loads profiles from native messaging host
     * Uses cache for instant loading, falls back to file reading if needed
     */
    const loadProfiles = useCallback(
        async (forceRefresh: boolean = false): Promise<void> => {
            // If not forcing refresh and we have profiles, don't reload
            if (!forceRefresh && profiles.length > 0) {
                return;
            }

            //Try to load from cache first (unless forcing refresh)
            // Cache loading is handled by Python backend (TinyDB)
            if (!forceRefresh) {
                const cachedSuccessfully = await loadFromCache();
                if (cachedSuccessfully) {
                    return;
                }
            }

            // If cache failed or force refresh, read from files
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

                            console.log(`Loaded ${sortedProfiles.length} profiles from files and updated cache`);
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

                // Request profile list (reads from files and updates cache)
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
        [profiles.length, loadFromCache]
    );

    /**
     * Refreshes profiles (forces reload from native messaging host)
     */
    const refreshProfiles = useCallback(async (): Promise<void> => {
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
                        // Sort profiles alphabetically by name
                        const sortedProfiles = response.profiles.sort(
                            (a: AWSProfile, b: AWSProfile) =>
                                a.name.localeCompare(b.name)
                        );
                        setProfiles(sortedProfiles);
                        setLoading(false);

                        console.log(`Enriched ${sortedProfiles.length} SSO profiles`);
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
    }, []);

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
