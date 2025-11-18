/**
 * Constants for AWS Profile Containers extension
 */

// Cache configuration
export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const CACHE_DURATION_MINUTES = 5;

// Profile management
export const MAX_RECENT_PROFILES = 10;

// UI thresholds
export const POPUP_WIDTH_THRESHOLD = 400; // Width threshold to determine if running in popup vs sidebar

// Time conversion constants
export const MILLISECONDS_PER_MINUTE = 60000;
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440; // 24 * 60



// UI Timing
export const SEARCH_DEBOUNCE_MS = 300;
export const MESSAGE_DISPLAY_DURATION_MS = 5000;
export const TRANSITION_DURATION_MS = 200;

// Storage keys
export const STORAGE_KEYS = {
    FAVORITES: "favorites",
    RECENT_PROFILES: "recentProfiles",
    SELECTED_REGION: "selectedRegion",
    CACHED_PROFILES: "cachedProfiles",
    PROFILES_CACHE_TIME: "profilesCacheTime",
    CONTAINERS: "containers",
    THEME_MODE: "themeMode",
    API_TOKEN: "apiToken",
} as const;

// Token validation
export const API_TOKEN_PREFIX = "awspc";
export const API_TOKEN_LENGTH = 56; // awspc(5) + _(1) + random(43) + _(1) + checksum(6) = 56

// New format: awspc_{43_chars}_{6_char_checksum}
export const API_TOKEN_PATTERN = /^awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}$/;

// Legacy format (backward compatibility)
export const API_TOKEN_PATTERN_LEGACY = /^[A-Za-z0-9_-]{32,64}$/;
export const API_TOKEN_MIN_LENGTH = 32; // Legacy minimum
export const API_TOKEN_MAX_LENGTH = 64; // Legacy maximum
