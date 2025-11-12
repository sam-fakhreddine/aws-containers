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

export function isProfileListResponse(response: any): response is ProfileListResponse {
    return (
        response &&
        typeof response === 'object' &&
        response.action === 'profileList' &&
        Array.isArray(response.profiles)
    );
}

export function isConsoleUrlResponse(response: any): response is ConsoleUrlResponse {
    return (
        response &&
        typeof response === 'object' &&
        response.action === 'consoleUrl' &&
        typeof response.url === 'string' &&
        typeof response.profileName === 'string' &&
        typeof response.color === 'string' &&
        typeof response.icon === 'string'
    );
}

export function isErrorResponse(response: any): response is ErrorResponse {
    return (
        response &&
        typeof response === 'object' &&
        response.action === 'error' &&
        typeof response.message === 'string'
    );
}

export function isNativeMessagingResponse(response: any): response is NativeMessagingResponse {
    return (
        isProfileListResponse(response) ||
        isConsoleUrlResponse(response) ||
        isErrorResponse(response)
    );
}

export function isStringArray(value: any): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isAWSProfile(value: any): value is AWSProfile {
    return (
        value &&
        typeof value === 'object' &&
        typeof value.name === 'string' &&
        typeof value.has_credentials === 'boolean' &&
        (value.expiration === null || typeof value.expiration === 'string') &&
        typeof value.expired === 'boolean' &&
        typeof value.color === 'string' &&
        typeof value.icon === 'string' &&
        (value.is_sso === undefined || typeof value.is_sso === 'boolean') &&
        (value.sso_start_url === undefined || typeof value.sso_start_url === 'string')
    );
}

export function isAWSProfileArray(value: any): value is AWSProfile[] {
    return Array.isArray(value) && value.every(item => isAWSProfile(item));
}

export function isStorageData(value: any): value is StorageData {
    if (!value || typeof value !== 'object') {
        return false;
    }

    // Check optional properties
    if (value.favorites !== undefined && !isStringArray(value.favorites)) {
        return false;
    }
    if (value.recentProfiles !== undefined && !isStringArray(value.recentProfiles)) {
        return false;
    }
    if (value.selectedRegion !== undefined && typeof value.selectedRegion !== 'string') {
        return false;
    }
    if (value.cachedProfiles !== undefined && !isAWSProfileArray(value.cachedProfiles)) {
        return false;
    }
    if (value.profilesCacheTime !== undefined && typeof value.profilesCacheTime !== 'number') {
        return false;
    }
    if (value.containers !== undefined && !isStringArray(value.containers)) {
        return false;
    }

    return true;
}
