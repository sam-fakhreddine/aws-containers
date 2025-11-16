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
 * Parameter validator function type
 * Takes a parameter value and name, returns validated/transformed value
 * Note: Uses flexible typing to accommodate various validator implementations
 */
export type ParameterValidator = (
    p: string | null | undefined,
    name?: string,
) => unknown;

/**
 * Global validator function type
 * Takes all parameters and returns validated parameters object
 */
export type GlobalValidator = (
    params: Record<string, unknown>,
) => Record<string, unknown>;

/**
 * Schema for validating opener parameters
 */
export interface OpenerParamsSchema {
    signature: string[];
    id: string[];
    name: string[];
    color: ParameterValidator[];
    icon: ParameterValidator[];
    url: ParameterValidator[];
    index: ParameterValidator[];
    pinned: ParameterValidator[];
    openInReaderMode: ParameterValidator[];
    __validators: GlobalValidator[];
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
