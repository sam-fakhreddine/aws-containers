/**
 * Custom hook for managing favorite profiles
 * Handles loading, saving, and toggling favorites
 */

import { useState, useCallback, useEffect } from "react";
import browser from "webextension-polyfill";
import { STORAGE_KEYS } from "../constants";
import { isStringArray } from "../types";

interface UseFavoritesReturn {
    favorites: string[];
    isFavorite: (profileName: string) => boolean;
    toggleFavorite: (profileName: string) => Promise<void>;
    addFavorite: (profileName: string) => Promise<void>;
    removeFavorite: (profileName: string) => Promise<void>;
    loading: boolean;
}

/**
 * Hook for managing favorite profiles
 * @returns Favorites state and management functions
 */
export function useFavorites(): UseFavoritesReturn {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    /**
     * Load favorites from storage on mount
     */
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const result = await browser.storage.local.get(STORAGE_KEYS.FAVORITES);
                const data = result as Record<string, unknown>;
                if (data && 'favorites' in data && isStringArray(data.favorites)) {
                    setFavorites(data.favorites);
                }
            } catch (err) {
                console.error("Failed to load favorites:", err);
            } finally {
                setLoading(false);
            }
        };

        loadFavorites();
    }, []);

    /**
     * Check if a profile is favorited
     */
    const isFavorite = useCallback(
        (profileName: string): boolean => {
            return favorites.includes(profileName);
        },
        [favorites]
    );

    /**
     * Add a profile to favorites
     */
    const addFavorite = useCallback(
        async (profileName: string): Promise<void> => {
            if (favorites.includes(profileName)) {
                return; // Already a favorite
            }

            try {
                const updatedFavorites = [...favorites, profileName];
                setFavorites(updatedFavorites);
                await browser.storage.local.set({
                    [STORAGE_KEYS.FAVORITES]: updatedFavorites,
                });
            } catch (err) {
                console.error("Failed to add favorite:", err);
                // Revert on error
                setFavorites([...favorites]);
                throw err;
            }
        },
        [favorites]
    );

    /**
     * Remove a profile from favorites
     */
    const removeFavorite = useCallback(
        async (profileName: string): Promise<void> => {
            if (!favorites.includes(profileName)) {
                return; // Not a favorite
            }

            try {
                const updatedFavorites = favorites.filter((f) => f !== profileName);
                setFavorites(updatedFavorites);
                await browser.storage.local.set({
                    [STORAGE_KEYS.FAVORITES]: updatedFavorites,
                });
            } catch (err) {
                console.error("Failed to remove favorite:", err);
                // Revert on error
                setFavorites([...favorites]);
                throw err;
            }
        },
        [favorites]
    );

    /**
     * Toggle a profile's favorite status
     */
    const toggleFavorite = useCallback(
        async (profileName: string): Promise<void> => {
            if (favorites.includes(profileName)) {
                await removeFavorite(profileName);
            } else {
                await addFavorite(profileName);
            }
        },
        [favorites, addFavorite, removeFavorite]
    );

    return {
        favorites,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        loading,
    };
}
