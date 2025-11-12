/**
 * Custom hook for managing application theme (dark/light/system)
 * Handles theme preference storage and system theme detection
 */

import { useState, useEffect, useCallback } from "react";
import browser from "webextension-polyfill";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { STORAGE_KEYS } from "../constants";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface UseThemeReturn {
    mode: ThemeMode;
    resolvedTheme: ResolvedTheme;
    setMode: (mode: ThemeMode) => Promise<void>;
}

/**
 * Detects system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
    if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }
    return "light";
}

/**
 * Hook for managing application theme
 * @returns Theme state and management functions
 */
export function useTheme(): UseThemeReturn {
    const [mode, setModeState] = useState<ThemeMode>("system");
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme());

    /**
     * Load theme preference from storage
     */
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const data = await browser.storage.local.get(STORAGE_KEYS.THEME_MODE);
                if (data[STORAGE_KEYS.THEME_MODE]) {
                    setModeState(data[STORAGE_KEYS.THEME_MODE] as ThemeMode);
                }
            } catch (err) {
                console.error("Failed to load theme preference:", err);
            }
        };

        loadTheme();
    }, []);

    /**
     * Listen for system theme changes
     */
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) {
            return;
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? "dark" : "light");
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
        }
        // Legacy browsers
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, []);

    /**
     * Set theme mode and persist to storage
     */
    const setMode = useCallback(async (newMode: ThemeMode): Promise<void> => {
        try {
            setModeState(newMode);
            await browser.storage.local.set({
                [STORAGE_KEYS.THEME_MODE]: newMode,
            });
        } catch (err) {
            console.error("Failed to save theme preference:", err);
        }
    }, []);

    /**
     * Resolve the actual theme to apply
     */
    const resolvedTheme: ResolvedTheme =
        mode === "system" ? systemTheme : mode;

    /**
     * Apply theme using Cloudscape's applyMode
     */
    useEffect(() => {
        applyMode(resolvedTheme as Mode);
    }, [resolvedTheme]);

    return {
        mode,
        resolvedTheme,
        setMode,
    };
}
