/**
 * Type definitions for popup component
 */

/**
 * Message types for native messaging communication
 */
export interface ProfileListResponse {
    action: "profileList";
    profiles: AWSProfile[];
}

export interface ConsoleUrlResponse {
    action: "consoleUrl";
    url: string;
    profileName: string;
    color: string;
    icon: string;
}

export interface ErrorResponse {
    action: "error";
    message: string;
}

export type NativeMessagingResponse = ProfileListResponse | ConsoleUrlResponse | ErrorResponse;

export interface GetProfilesRequest {
    action: "getProfiles";
}

export interface OpenProfileRequest {
    action: "openProfile";
    profileName: string;
}

export type NativeMessagingRequest = GetProfilesRequest | OpenProfileRequest;

/**
 * Storage data structure
 */
export interface StorageData {
    favorites?: string[];
    recentProfiles?: string[];
    selectedRegion?: string;
    cachedProfiles?: AWSProfile[];
    profilesCacheTime?: number;
    containers?: string[];
}

/**
 * AWS Profile interface (already defined in awsProfiles.tsx but extracted here for reuse)
 */
export interface AWSProfile {
    name: string;
    has_credentials: boolean;
    expiration: string | null;
    expired: boolean;
    color: string;
    icon: string;
    is_sso?: boolean;
    sso_start_url?: string;
    sso_session?: string;
}

/**
 * Type guards for runtime validation
 */

export function isProfileListResponse(response: unknown): response is ProfileListResponse {
    return (
        response !== null &&
        typeof response === 'object' &&
        'action' in response &&
        response.action === 'profileList' &&
        'profiles' in response &&
        Array.isArray(response.profiles)
    );
}

export function isConsoleUrlResponse(response: unknown): response is ConsoleUrlResponse {
    return (
        response !== null &&
        typeof response === 'object' &&
        'action' in response &&
        response.action === 'consoleUrl' &&
        'url' in response &&
        typeof response.url === 'string' &&
        'profileName' in response &&
        typeof response.profileName === 'string' &&
        'color' in response &&
        typeof response.color === 'string' &&
        'icon' in response &&
        typeof response.icon === 'string'
    );
}

export function isErrorResponse(response: unknown): response is ErrorResponse {
    return (
        response !== null &&
        typeof response === 'object' &&
        'action' in response &&
        response.action === 'error' &&
        'message' in response &&
        typeof response.message === 'string'
    );
}

export function isNativeMessagingResponse(response: unknown): response is NativeMessagingResponse {
    return (
        isProfileListResponse(response) ||
        isConsoleUrlResponse(response) ||
        isErrorResponse(response)
    );
}

export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isAWSProfile(value: unknown): value is AWSProfile {
    return (
        value !== null &&
        typeof value === 'object' &&
        'name' in value &&
        typeof value.name === 'string' &&
        'has_credentials' in value &&
        typeof value.has_credentials === 'boolean' &&
        'expiration' in value &&
        (value.expiration === null || typeof value.expiration === 'string') &&
        'expired' in value &&
        typeof value.expired === 'boolean' &&
        'color' in value &&
        typeof value.color === 'string' &&
        'icon' in value &&
        typeof value.icon === 'string'
    );
}

export function isAWSProfileArray(value: unknown): value is AWSProfile[] {
    return Array.isArray(value) && value.every(item => isAWSProfile(item));
}

export function isStorageData(value: unknown): value is StorageData {
    if (value === null || typeof value !== 'object') {
        return false;
    }

    const data = value as Record<string, unknown>;

    // Check optional properties
    if (data.favorites !== undefined && !isStringArray(data.favorites)) {
        return false;
    }
    if (data.recentProfiles !== undefined && !isStringArray(data.recentProfiles)) {
        return false;
    }
    if (data.selectedRegion !== undefined && typeof data.selectedRegion !== 'string') {
        return false;
    }
    if (data.cachedProfiles !== undefined && !isAWSProfileArray(data.cachedProfiles)) {
        return false;
    }
    if (data.profilesCacheTime !== undefined && typeof data.profilesCacheTime !== 'number') {
        return false;
    }
    if (data.containers !== undefined && !isStringArray(data.containers)) {
        return false;
    }

    return true;
}
