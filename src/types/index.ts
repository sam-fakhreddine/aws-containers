/**
 * Shared type definitions for the AWS Containers extension
 */

/**
 * Represents an AWS profile with credentials and metadata
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
}

/**
 * Container configuration for opening URLs
 */
export interface Container {
    name: string;
    url: string;
    color?: string;
    icon?: string;
}

/**
 * AWS region configuration
 */
export interface AWSRegion {
    code: string;
    name: string;
}

/**
 * Organization grouping for profiles
 */
export interface Organization {
    name: string;
    profiles: AWSProfile[];
}

/**
 * Schema for validating opener parameters
 */
export interface OpenerParamsSchema {
    signature: string[];
    id: string[];
    name: string[];
    color: ((p: any, name: any) => any)[];
    icon: ((p: any, name: any) => any)[];
    url: ((p: any, name: any) => any)[];
    index: ((p: any, name: any) => any)[];
    pinned: ((p: any, name: any) => any)[];
    openInReaderMode: ((p: any, name: any) => any)[];
    __validators: ((params: any) => any)[];
}

/**
 * Native messaging request/response types
 */
export interface NativeMessageRequest {
    action: "getProfiles" | "openProfile";
    profileName?: string;
}

export interface NativeMessageResponse {
    action: "profileList" | "consoleUrl" | "error";
    profiles?: AWSProfile[];
    url?: string;
    profileName?: string;
    color?: string;
    icon?: string;
    message?: string;
}
