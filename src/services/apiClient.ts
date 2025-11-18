/**
 * HTTP API Client for AWS Profile Bridge
 * Replaces native messaging with HTTP requests to localhost API server
 */

// Internal imports
import { ProfileListResponse, ConsoleUrlResponse } from "../popup/types";
import { 
    API_BASE_URL, 
    REQUEST_TIMEOUT_MS, 
    HEALTH_CHECK_TIMEOUT_MS,
    STORAGE_KEYS,
    API_TOKEN_PATTERN 
} from "../popup/constants";

/**
 * Custom error class for API client errors
 */
export class ApiClientError extends Error {
    constructor(message: string, public readonly statusCode?: number) {
        super(message);
        this.name = "ApiClientError";
    }
}

let cachedToken: string | null = null;

/**
 * Validates API token format
 * @param token - Token to validate
 * @returns True if token format is valid
 */
export function validateTokenFormat(token: string): boolean {
    return API_TOKEN_PATTERN.test(token);
}

/**
 * Retrieves the API token from storage
 * @returns The stored API token or null if not found
 */
export async function getApiToken(): Promise<string | null> {
    if (cachedToken) return cachedToken;
    
    const browser = await import("webextension-polyfill");
    const result = await browser.default.storage.local.get(STORAGE_KEYS.API_TOKEN);
    const token = result[STORAGE_KEYS.API_TOKEN];
    cachedToken = typeof token === "string" ? token : null;
    return cachedToken;
}

/**
 * Stores the API token in browser storage
 * @param token - Token to store
 * @throws {ApiClientError} If token format is invalid
 */
export async function setApiToken(token: string): Promise<void> {
    if (!validateTokenFormat(token)) {
        throw new ApiClientError("Invalid token format. Token must be at least 32 characters and contain only alphanumeric characters, hyphens, and underscores.");
    }
    
    const browser = await import("webextension-polyfill");
    await browser.default.storage.local.set({ [STORAGE_KEYS.API_TOKEN]: token });
    cachedToken = token;
}

/**
 * Removes the API token from storage
 */
export async function clearApiToken(): Promise<void> {
    const browser = await import("webextension-polyfill");
    await browser.default.storage.local.remove(STORAGE_KEYS.API_TOKEN);
    cachedToken = null;
}

/**
 * Performs a fetch request with timeout and authentication
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds
 * @returns Response object
 * @throws {ApiClientError} If request times out or fails
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const token = await getApiToken();
    const headers = new Headers(options.headers);
    if (token) {
        headers.set("X-API-Token", token);
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
            throw new ApiClientError("Request timed out");
        }
        throw error;
    }
}

/**
 * Checks if the API server is healthy and reachable
 * @returns True if API server responds successfully
 */
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, HEALTH_CHECK_TIMEOUT_MS);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Fetches the list of AWS profiles from the API
 * @returns Profile list response
 * @throws {ApiClientError} If request fails or API returns error
 */
export async function getProfiles(): Promise<ProfileListResponse> {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/profiles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new ApiClientError(
                    "Rate limit exceeded. Too many requests. Please wait a moment and try again.",
                    429
                );
            }
            if (response.status === 401) {
                throw new ApiClientError(
                    "Authentication failed. Invalid or missing API token. Please configure your token in Settings.",
                    401
                );
            }
            throw new ApiClientError(
                `Request failed with status ${response.status}. Check API server logs at ~/.aws/logs/aws_profile_bridge_api.log for details.`,
                response.status
            );
        }

        const data = await response.json();

        if (data.action === "error") {
            throw new ApiClientError("Failed to get profiles");
        }

        return data as ProfileListResponse;
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw error;
        }
        if (error instanceof TypeError && error.message.includes("fetch")) {
            throw new ApiClientError(
                `Cannot connect to API server at ${API_BASE_URL}. Ensure the service is running. Check status with: systemctl --user status aws-profile-bridge (Linux) or launchctl list | grep aws-profile-bridge (macOS). Original error: ${error.message}`
            );
        }
        throw new ApiClientError(
            `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Fetches enriched AWS profiles with SSO entitlements
 * @returns Enriched profile list response
 * @throws {ApiClientError} If request fails or API returns error
 */
export async function getProfilesEnriched(): Promise<ProfileListResponse> {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/profiles/enrich`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new ApiClientError(
                    "Rate limit exceeded. Too many requests. Please wait a moment and try again.",
                    429
                );
            }
            if (response.status === 401) {
                throw new ApiClientError(
                    "Authentication failed. Invalid or missing API token. Please configure your token in Settings.",
                    401
                );
            }
            throw new ApiClientError(
                `Request failed with status ${response.status}. Check API server logs at ~/.aws/logs/aws_profile_bridge_api.log for details.`,
                response.status
            );
        }

        const data = await response.json();

        if (data.action === "error") {
            throw new ApiClientError("Failed to enrich profiles");
        }

        return data as ProfileListResponse;
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw error;
        }
        if (error instanceof TypeError && error.message.includes("fetch")) {
            throw new ApiClientError(
                `Cannot connect to API server at ${API_BASE_URL}. Ensure the service is running. Check status with: systemctl --user status aws-profile-bridge (Linux) or launchctl list | grep aws-profile-bridge (macOS). Original error: ${error.message}`
            );
        }
        throw new ApiClientError(
            `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Generates an AWS Console URL for a specific profile
 * @param profileName - Name of the AWS profile
 * @returns Console URL response with authentication
 * @throws {ApiClientError} If request fails or profile not found
 */
export async function getConsoleUrl(
    profileName: string
): Promise<ConsoleUrlResponse> {
    try {
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/profiles/${encodeURIComponent(profileName)}/console-url`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                throw new ApiClientError(
                    "Rate limit exceeded. Too many requests. Please wait a moment and try again.",
                    429
                );
            }
            if (response.status === 401) {
                throw new ApiClientError(
                    "Authentication failed. Invalid or missing API token. Please configure your token in Settings.",
                    401
                );
            }
            if (response.status === 400) {
                throw new ApiClientError(
                    `Invalid profile name: '${profileName}'. Profile not found in ~/.aws/credentials or ~/.aws/config.`,
                    400
                );
            }
            if (response.status === 404) {
                throw new ApiClientError(
                    `Profile '${profileName}' not found. Refresh profiles or check your AWS configuration files.`,
                    404
                );
            }
            throw new ApiClientError(
                `Request failed with status ${response.status}. Check API server logs at ~/.aws/logs/aws_profile_bridge_api.log for details.`,
                response.status
            );
        }

        const data = await response.json();

        if (data.action === "error") {
            throw new ApiClientError("Failed to generate console URL");
        }

        return data as ConsoleUrlResponse;
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw error;
        }
        if (error instanceof TypeError && error.message.includes("fetch")) {
            throw new ApiClientError(
                `Cannot connect to API server at ${API_BASE_URL}. Ensure the service is running. Check status with: systemctl --user status aws-profile-bridge (Linux) or launchctl list | grep aws-profile-bridge (macOS). Original error: ${error.message}`
            );
        }
        throw new ApiClientError(
            `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Retrieves the API server version information
 * @returns Version information object
 * @throws {ApiClientError} If request fails
 */
export async function getApiVersion(): Promise<Record<string, string>> {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/version`, {}, HEALTH_CHECK_TIMEOUT_MS);

        if (!response.ok) {
            throw new ApiClientError(
                `Failed to get API version. Status: ${response.status}`,
                response.status
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw error;
        }
        throw new ApiClientError(
            `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}
