/**
 * HTTP API Client for AWS Profile Bridge
 * Replaces native messaging with HTTP requests to localhost API server
 */

// Internal imports
import { ProfileListResponse, ConsoleUrlResponse } from "../popup/types";
import { STORAGE_KEYS, API_TOKEN_PATTERN } from "../popup/constants";
import { API_BASE_URL, REQUEST_TIMEOUT_MS, HEALTH_CHECK_TIMEOUT_MS } from "./config";
import { browser } from "./browserUtils";

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
    
    const result = await browser.storage.local.get(STORAGE_KEYS.API_TOKEN);
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
    
    await browser.storage.local.set({ [STORAGE_KEYS.API_TOKEN]: token });
    cachedToken = token;
}

/**
 * Removes the API token from storage
 */
export async function clearApiToken(): Promise<void> {
    await browser.storage.local.remove(STORAGE_KEYS.API_TOKEN);
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

    try {
        const token = await getApiToken();
        const headers = new Headers(options.headers);
        if (token) {
            headers.set("X-API-Token", token);
        }

        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new ApiClientError(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

type ErrorMap = Record<number, string>;

/**
 * Generic API request helper that centralizes error handling and response parsing
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMap - Status code to error message mapping
 * @returns Parsed response data
 * @throws {ApiClientError} If request fails
 */
async function apiRequest<T>(
    url: string,
    init: RequestInit = {},
    timeoutMs = REQUEST_TIMEOUT_MS,
    errorMap: ErrorMap = {}
): Promise<T> {
    let response: Response;
    try {
        response = await fetchWithTimeout(url, init, timeoutMs);
    } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
            throw new ApiClientError("Request timed out");
        }
        if (e instanceof TypeError && e.message.includes("fetch")) {
            throw new ApiClientError(
                `Cannot connect to API server at ${API_BASE_URL}. Ensure the service is running. Check status with: systemctl --user status aws-profile-bridge (Linux) or launchctl list | grep aws-profile-bridge (macOS). Original error: ${e.message}`
            );
        }
        throw e;
    }

    if (!response.ok) {
        const msg = errorMap[response.status] ||
            `Request failed with status ${response.status}. Check API server logs at ~/.aws/logs/aws_profile_bridge_api.log for details.`;
        throw new ApiClientError(msg, response.status);
    }

    const data = await response.json();
    if ((data as any).action === "error") {
        throw new ApiClientError("Server returned error action");
    }
    return data as T;
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
export function getProfiles(): Promise<ProfileListResponse> {
    return apiRequest<ProfileListResponse>(
        `${API_BASE_URL}/profiles`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
        REQUEST_TIMEOUT_MS,
        {
            401: "Authentication failed. Invalid or missing API token. Please configure your token in Settings.",
            429: "Rate limit exceeded. Too many requests. Please wait a moment and try again.",
        }
    );
}

/**
 * Fetches enriched AWS profiles with SSO entitlements
 * @returns Enriched profile list response
 * @throws {ApiClientError} If request fails or API returns error
 */
export function getProfilesEnriched(): Promise<ProfileListResponse> {
    return apiRequest<ProfileListResponse>(
        `${API_BASE_URL}/profiles/enrich`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
        REQUEST_TIMEOUT_MS,
        {
            401: "Authentication failed. Invalid or missing API token. Please configure your token in Settings.",
            429: "Rate limit exceeded. Too many requests. Please wait a moment and try again.",
        }
    );
}

/**
 * Generates an AWS Console URL for a specific profile
 * @param profileName - Name of the AWS profile
 * @returns Console URL response with authentication
 * @throws {ApiClientError} If request fails or profile not found
 */
export function getConsoleUrl(profileName: string): Promise<ConsoleUrlResponse> {
    return apiRequest<ConsoleUrlResponse>(
        `${API_BASE_URL}/profiles/${encodeURIComponent(profileName)}/console-url`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
        REQUEST_TIMEOUT_MS,
        {
            400: `Invalid profile name: '${profileName}'. Profile not found in ~/.aws/credentials or ~/.aws/config.`,
            401: "Authentication failed. Invalid or missing API token. Please configure your token in Settings.",
            404: `Profile '${profileName}' not found. Refresh profiles or check your AWS configuration files.`,
            429: "Rate limit exceeded. Too many requests. Please wait a moment and try again.",
        }
    );
}

/**
 * Retrieves the API server version information
 * @returns Version information object
 * @throws {ApiClientError} If request fails
 */
export function getApiVersion(): Promise<Record<string, string>> {
    return apiRequest<Record<string, string>>(
        `${API_BASE_URL}/version`,
        {},
        HEALTH_CHECK_TIMEOUT_MS
    );
}
