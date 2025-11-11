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

// Native messaging
export const NATIVE_MESSAGING_HOST_NAME = "aws_profile_bridge";

// Storage keys
export const STORAGE_KEYS = {
    FAVORITES: "favorites",
    RECENT_PROFILES: "recentProfiles",
    SELECTED_REGION: "selectedRegion",
    CACHED_PROFILES: "cachedProfiles",
    PROFILES_CACHE_TIME: "profilesCacheTime",
    CONTAINERS: "containers",
} as const;
