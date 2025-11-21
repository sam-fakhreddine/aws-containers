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
    ENABLED_REGIONS: "enabledRegions",
    SEPARATE_REGIONS_IN_CONTAINERS: "separateRegionsInContainers",
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

// AWS Regions
export const AWS_REGIONS = [
    // US Regions
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "us-east-2", name: "US East (Ohio)" },
    { code: "us-west-1", name: "US West (N. California)" },
    { code: "us-west-2", name: "US West (Oregon)" },
    // Canada
    { code: "ca-central-1", name: "Canada (Central)" },
    { code: "ca-west-1", name: "Canada (Calgary)" },
    // South America
    { code: "sa-east-1", name: "South America (São Paulo)" },
    // Europe
    { code: "eu-central-1", name: "Europe (Frankfurt)" },
    { code: "eu-central-2", name: "Europe (Zurich)" },
    { code: "eu-west-1", name: "Europe (Ireland)" },
    { code: "eu-west-2", name: "Europe (London)" },
    { code: "eu-west-3", name: "Europe (Paris)" },
    { code: "eu-south-1", name: "Europe (Milan)" },
    { code: "eu-south-2", name: "Europe (Spain)" },
    { code: "eu-north-1", name: "Europe (Stockholm)" },
    // Asia Pacific
    { code: "ap-east-1", name: "Asia Pacific (Hong Kong)" },
    { code: "ap-south-1", name: "Asia Pacific (Mumbai)" },
    { code: "ap-south-2", name: "Asia Pacific (Hyderabad)" },
    { code: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
    { code: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
    { code: "ap-southeast-3", name: "Asia Pacific (Jakarta)" },
    { code: "ap-southeast-4", name: "Asia Pacific (Melbourne)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
    { code: "ap-northeast-2", name: "Asia Pacific (Seoul)" },
    { code: "ap-northeast-3", name: "Asia Pacific (Osaka)" },
    // Middle East
    { code: "me-south-1", name: "Middle East (Bahrain)" },
    { code: "me-central-1", name: "Middle East (UAE)" },
    // Africa
    { code: "af-south-1", name: "Africa (Cape Town)" },
    // Israel
    { code: "il-central-1", name: "Israel (Tel Aviv)" },
] as const;
