/**
 * Tests for Profile Utilities
 */

import { sortByCredentialStatus, logProfileSummary } from "@/utils/profiles";
import { AWSProfile } from "@/types";

describe("profiles utilities", () => {
    describe("sortByCredentialStatus", () => {
        it("should sort profiles with credentials before those without", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "no-creds",
                    has_credentials: false,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "with-creds",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted[0].name).toBe("with-creds");
            expect(sorted[1].name).toBe("no-creds");
        });

        it("should sort active credentials before expired credentials", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "expired-creds",
                    has_credentials: true,
                    expiration: "2023-01-01T00:00:00Z",
                    expired: true,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "active-creds",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted[0].name).toBe("active-creds");
            expect(sorted[1].name).toBe("expired-creds");
        });

        it("should sort alphabetically within same credential status", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "zebra",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "alpha",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
                {
                    name: "beta",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "green",
                    icon: "dollar",
                },
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted[0].name).toBe("alpha");
            expect(sorted[1].name).toBe("beta");
            expect(sorted[2].name).toBe("zebra");
        });

        it("should handle complex sorting with all credential states", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "no-creds-z",
                    has_credentials: false,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "expired-b",
                    has_credentials: true,
                    expiration: "2023-01-01T00:00:00Z",
                    expired: true,
                    color: "red",
                    icon: "briefcase",
                },
                {
                    name: "active-c",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "green",
                    icon: "dollar",
                },
                {
                    name: "no-creds-a",
                    has_credentials: false,
                    expiration: null,
                    expired: false,
                    color: "yellow",
                    icon: "cart",
                },
                {
                    name: "active-a",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "orange",
                    icon: "circle",
                },
                {
                    name: "expired-a",
                    has_credentials: true,
                    expiration: "2023-01-01T00:00:00Z",
                    expired: true,
                    color: "pink",
                    icon: "gift",
                },
            ];

            const sorted = sortByCredentialStatus(profiles);

            // Active credentials first (alphabetically)
            expect(sorted[0].name).toBe("active-a");
            expect(sorted[1].name).toBe("active-c");
            // Expired credentials second (alphabetically)
            expect(sorted[2].name).toBe("expired-a");
            expect(sorted[3].name).toBe("expired-b");
            // No credentials last (alphabetically)
            expect(sorted[4].name).toBe("no-creds-a");
            expect(sorted[5].name).toBe("no-creds-z");
        });

        it("should not mutate the original array", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "profile-b",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "profile-a",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
            ];

            const originalOrder = profiles.map((p) => p.name);
            sortByCredentialStatus(profiles);

            // Original array should remain unchanged
            expect(profiles.map((p) => p.name)).toEqual(originalOrder);
        });

        it("should handle empty array", () => {
            const profiles: AWSProfile[] = [];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted).toEqual([]);
        });

        it("should handle single profile", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "single-profile",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted).toHaveLength(1);
            expect(sorted[0].name).toBe("single-profile");
        });

        it("should handle profiles with SSO metadata", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "sso-profile",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: true,
                    sso_start_url: "https://example.awsapps.com/start",
                    sso_session: "my-session",
                },
                {
                    name: "regular-profile",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
            ];

            const sorted = sortByCredentialStatus(profiles);

            // Should sort alphabetically within same credential status
            expect(sorted[0].name).toBe("regular-profile");
            expect(sorted[1].name).toBe("sso-profile");
        });

        it("should handle profiles with null expiration", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "no-expiration",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "with-expiration",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
            ];

            const sorted = sortByCredentialStatus(profiles);

            // Both have credentials and are not expired, so alphabetical order
            expect(sorted[0].name).toBe("no-expiration");
            expect(sorted[1].name).toBe("with-expiration");
        });
    });

    describe("logProfileSummary", () => {
        let consoleLogSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
        });

        it("should log summary with correct counts", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "active-profile",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: true,
                },
                {
                    name: "expired-profile",
                    has_credentials: true,
                    expiration: "2023-01-01T00:00:00Z",
                    expired: true,
                    color: "red",
                    icon: "briefcase",
                    is_sso: false,
                },
                {
                    name: "no-creds-profile",
                    has_credentials: false,
                    expiration: null,
                    expired: false,
                    color: "green",
                    icon: "dollar",
                },
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 3 | SSO: 1 | Active: 1 | Expired: 1"
            );
        });

        it("should handle empty profile array", () => {
            const profiles: AWSProfile[] = [];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 0 | SSO: 0 | Active: 0 | Expired: 0"
            );
        });

        it("should handle all SSO profiles", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "sso-1",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: true,
                },
                {
                    name: "sso-2",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                    is_sso: true,
                },
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 2 | SSO: 2 | Active: 2 | Expired: 0"
            );
        });

        it("should handle profiles without SSO flag", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "profile-1",
                    has_credentials: true,
                    expiration: "2024-12-31T23:59:59Z",
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "profile-2",
                    has_credentials: false,
                    expiration: null,
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 2 | SSO: 0 | Active: 1 | Expired: 0"
            );
        });

        it("should count profiles with credentials but no expiration as active", () => {
            const profiles: AWSProfile[] = [
                {
                    name: "no-expiration",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 1 | SSO: 0 | Active: 1 | Expired: 0"
            );
        });
    });
});
