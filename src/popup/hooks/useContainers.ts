/**
 * Custom hook for managing Firefox containers
 * Handles container listing, creation, and deletion
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { type ContextualIdentities } from "webextension-polyfill";
import {
    getManagedContainers,
    clearAllContainers,
    prepareContainer,
} from "../../utils/containerManager";
import { useIsMounted } from "./useIsMounted";

interface UseContainersReturn {
    containers: ContextualIdentities.ContextualIdentity[];
    loading: boolean;
    error: string | null;
    refreshContainers: () => Promise<void>;
    clearContainers: () => Promise<void>;
    createContainer: (name: string, color?: string, icon?: string) => Promise<ContextualIdentities.ContextualIdentity>;
}

/**
 * Hook for managing Firefox containers
 * @returns Container state and management functions
 */
export function useContainers(): UseContainersReturn {
    const [containers, setContainers] = useState<ContextualIdentities.ContextualIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isMounted = useIsMounted();
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Refresh the list of managed containers (debounced)
     */
    const refreshContainers = useCallback(async (): Promise<void> => {
        // Clear existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Debounce container queries to avoid excessive API calls
        debounceTimerRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                setError(null);
                const containerList = await getManagedContainers();
                if (isMounted()) {
                    setContainers(containerList);
                }
            } catch (err) {
                console.error("Failed to refresh containers:", err);
                if (isMounted()) {
                    setError("Failed to load containers");
                    setContainers([]);
                }
            } finally {
                if (isMounted()) {
                    setLoading(false);
                }
            }
        }, 300);
    }, [isMounted]);

    /**
     * Load containers on mount
     */
    useEffect(() => {
        refreshContainers();
    }, [refreshContainers]);

    /**
     * Clear all managed containers
     */
    const clearContainers = useCallback(async (): Promise<void> => {
        try {
            setError(null);
            await clearAllContainers();
            await refreshContainers();
        } catch (err) {
            console.error("Failed to clear containers:", err);
            setError("Failed to clear containers");
            throw err;
        }
    }, [refreshContainers]);

    /**
     * Create a new container
     */
    const createContainer = useCallback(
        async (
            name: string,
            color?: string,
            icon?: string
        ): Promise<ContextualIdentities.ContextualIdentity> => {
            try {
                setError(null);
                const container = await prepareContainer(name, color, icon);
                await refreshContainers();
                return container;
            } catch (err) {
                console.error("Failed to create container:", err);
                setError("Failed to create container");
                throw err;
            }
        },
        [refreshContainers]
    );

    return {
        containers,
        loading,
        error,
        refreshContainers,
        clearContainers,
        createContainer,
    };
}
