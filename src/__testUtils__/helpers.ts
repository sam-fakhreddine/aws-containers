/**
 * Shared test utilities and helpers
 * Reduces duplication across test files (DRY principle)
 */

import type { ContextualIdentities } from "webextension-polyfill";

/**
 * Creates a mock container object for testing
 * Centralizes container creation to follow DRY principle
 */
export function createMockContainer(
    overrides: Partial<ContextualIdentities.ContextualIdentity> = {}
): ContextualIdentities.ContextualIdentity {
    return {
        cookieStoreId: "firefox-container-1",
        name: "test-container",
        color: "blue",
        icon: "fingerprint",
        iconUrl: "",
        colorCode: "#0000ff",
        ...overrides,
    } as ContextualIdentities.ContextualIdentity;
}

/**
 * Creates multiple mock containers with sequential IDs
 */
export function createMockContainers(count: number): ContextualIdentities.ContextualIdentity[] {
    return Array.from({ length: count }, (_, i) =>
        createMockContainer({
            cookieStoreId: `firefox-container-${i + 1}`,
            name: `test-container-${i + 1}`,
        })
    );
}

/**
 * Mock browser API responses for common scenarios
 */
export const mockBrowserResponses = {
    browserInfo: { name: "Firefox", version: "100.0" },
    tab: (id: number, index: number = 0) => ({ id, index }),
    emptyArray: [] as any[],
};

/**
 * Common test data for AWS profiles
 */
export const testProfiles = {
    basic: {
        name: "test-profile",
        has_credentials: true,
        expiration: null,
        expired: false,
        color: "blue",
        icon: "fingerprint",
    },
    withSSO: {
        name: "sso-profile",
        has_credentials: true,
        expiration: null,
        expired: false,
        color: "red",
        icon: "briefcase",
        is_sso: true,
        sso_start_url: "https://example.awsapps.com/start",
    },
    expired: {
        name: "expired-profile",
        has_credentials: true,
        expiration: "2020-01-01T00:00:00Z",
        expired: true,
        color: "yellow",
        icon: "dollar",
    },
};
