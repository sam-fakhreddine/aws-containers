/**
 * HTTP API Client for AWS Profile Bridge
 * Replaces native messaging with HTTP requests to localhost API server
 */

import { ProfileListResponse, ConsoleUrlResponse } from "../popup/types";

const API_BASE_URL = "http://127.0.0.1:10999";
const REQUEST_TIMEOUT_MS = 30000;
const TOKEN_STORAGE_KEY = "apiToken";

export class ApiClientError extends Error {
    constructor(message: string, public readonly statusCode?: number) {
        super(message);
        this.name = "ApiClientError";
    }
}

let cachedToken: string | null = null;

export async function getApiToken(): Promise<string | null> {
    if (cachedToken) return cachedToken;
    
    const browser = await import("webextension-polyfill");
    const result = await browser.default.storage.local.get(TOKEN_STORAGE_KEY);
    const token = result[TOKEN_STORAGE_KEY];
    cachedToken = typeof token === "string" ? token : null;
    return cachedToken;
}

export async function setApiToken(token: string): Promise<void> {
    const browser = await import("webextension-polyfill");
    await browser.default.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
    cachedToken = token;
}

export async function clearApiToken(): Promise<void> {
    const browser = await import("webextension-polyfill");
    await browser.default.storage.local.remove(TOKEN_STORAGE_KEY);
    cachedToken = null;
}

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

export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
        return response.ok;
    } catch {
        return false;
    }
}

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
                    "Too many failed attempts. Please wait and try again.",
                    429
                );
            }
            if (response.status === 401) {
                throw new ApiClientError(
                    "Invalid API token. Check your settings.",
                    401
                );
            }
            throw new ApiClientError(
                "Request failed. Check API server logs.",
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
                "Cannot connect to API server. Check if service is running."
            );
        }
        throw new ApiClientError("Request failed");
    }
}

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
                    "Too many failed attempts. Please wait and try again.",
                    429
                );
            }
            if (response.status === 401) {
                throw new ApiClientError(
                    "Invalid API token. Check your settings.",
                    401
                );
            }
            throw new ApiClientError(
                "Request failed. Check API server logs.",
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
                "Cannot connect to API server. Check if service is running."
            );
        }
        throw new ApiClientError("Request failed");
    }
}

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
                    "Too many failed attempts. Please wait and try again.",
                    429
                );
            }
            if (response.status === 401) {
                throw new ApiClientError(
                    "Invalid API token. Check your settings.",
                    401
                );
            }
            if (response.status === 400) {
                throw new ApiClientError(
                    "Invalid profile name",
                    400
                );
            }
            throw new ApiClientError(
                "Request failed. Check API server logs.",
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
                "Cannot connect to API server. Check if service is running."
            );
        }
        throw new ApiClientError("Request failed");
    }
}

export async function getApiVersion(): Promise<Record<string, string>> {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/version`, {}, 5000);

        if (!response.ok) {
            throw new ApiClientError(
                "Failed to get API version",
                response.status
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw error;
        }
        throw new ApiClientError("Request failed");
    }
}
