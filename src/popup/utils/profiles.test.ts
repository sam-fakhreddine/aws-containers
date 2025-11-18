/**
 * Unit tests for profiles utilities
 * Tests profile sorting and logging utilities
 */

import { sortByCredentialStatus, logProfileSummary } from "./profiles";
import { AWSProfile } from "../types";

describe("profiles utilities", () => {
    describe("sortByCredentialStatus", () => {
        const createProfile = (overrides: Partial<AWSProfile>): AWSProfile => ({
            name: "default",
            has_credentials: false,
            expiration: null,
            expired: false,
            color: "blue",
            icon: "fingerprint",
            ...overrides,
        });

        it("does not mutate original array", () => {
            const profiles = [
                createProfile({ name: "profile1" }),
                createProfile({ name: "profile2" }),
            ];
            const originalProfiles = [...profiles];

            sortByCredentialStatus(profiles);

            expect(profiles).toEqual(originalProfiles);
        });

        it("sorts profiles with credentials before those without", () => {
            const profiles = [
                createProfile({ name: "no-creds", has_credentials: false }),
                createProfile({ name: "with-creds", has_credentials: true }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted[0].name).toBe("with-creds");
            expect(sorted[1].name).toBe("no-creds");
        });

        it("sorts active credentials before expired within credentials group", () => {
            const profiles = [
                createProfile({
                    name: "expired",
                    has_credentials: true,
                    expired: true,
                    expiration: "2020-01-01T00:00:00Z",
                }),
                createProfile({
                    name: "active",
                    has_credentials: true,
                    expired: false,
                }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted[0].name).toBe("active");
            expect(sorted[1].name).toBe("expired");
        });

        it("sorts alphabetically within same credential/expiration group", () => {
            const profiles = [
                createProfile({ name: "zebra", has_credentials: true, expired: false }),
                createProfile({ name: "alpha", has_credentials: true, expired: false }),
                createProfile({ name: "beta", has_credentials: true, expired: false }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted[0].name).toBe("alpha");
            expect(sorted[1].name).toBe("beta");
            expect(sorted[2].name).toBe("zebra");
        });

        it("sorts with all three groups: active, expired, no credentials", () => {
            const profiles = [
                createProfile({ name: "no-creds-1", has_credentials: false }),
                createProfile({ name: "expired-1", has_credentials: true, expired: true }),
                createProfile({ name: "active-1", has_credentials: true, expired: false }),
                createProfile({ name: "no-creds-2", has_credentials: false }),
                createProfile({ name: "active-2", has_credentials: true, expired: false }),
                createProfile({ name: "expired-2", has_credentials: true, expired: true }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            // Active credentials first
            expect(sorted[0].name).toBe("active-1");
            expect(sorted[1].name).toBe("active-2");

            // Expired credentials next
            expect(sorted[2].name).toBe("expired-1");
            expect(sorted[3].name).toBe("expired-2");

            // No credentials last
            expect(sorted[4].name).toBe("no-creds-1");
            expect(sorted[5].name).toBe("no-creds-2");
        });

        it("handles empty array", () => {
            const sorted = sortByCredentialStatus([]);

            expect(sorted).toEqual([]);
        });

        it("handles single profile", () => {
            const profile = createProfile({ name: "single" });
            const sorted = sortByCredentialStatus([profile]);

            expect(sorted).toEqual([profile]);
        });

        it("handles all profiles with same status", () => {
            const profiles = [
                createProfile({ name: "profile-c", has_credentials: true, expired: false }),
                createProfile({ name: "profile-a", has_credentials: true, expired: false }),
                createProfile({ name: "profile-b", has_credentials: true, expired: false }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted.map((p) => p.name)).toEqual([
                "profile-a",
                "profile-b",
                "profile-c",
            ]);
        });

        it("handles profiles without expiration date but marked expired", () => {
            const profiles = [
                createProfile({
                    name: "weird-expired",
                    has_credentials: true,
                    expired: true,
                    expiration: null,
                }),
                createProfile({
                    name: "normal-active",
                    has_credentials: true,
                    expired: false,
                }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            expect(sorted[0].name).toBe("normal-active");
            expect(sorted[1].name).toBe("weird-expired");
        });

        it("uses localeCompare for case-insensitive alphabetical sorting", () => {
            const profiles = [
                createProfile({ name: "Zulu", has_credentials: false }),
                createProfile({ name: "alpha", has_credentials: false }),
                createProfile({ name: "Bravo", has_credentials: false }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            // localeCompare should handle case properly
            expect(sorted[0].name).toBe("alpha");
            expect(sorted[1].name).toBe("Bravo");
            expect(sorted[2].name).toBe("Zulu");
        });

        it("handles SSO profiles mixed with regular profiles", () => {
            const profiles = [
                createProfile({ name: "regular", has_credentials: true, expired: false }),
                createProfile({
                    name: "sso",
                    has_credentials: true,
                    expired: false,
                    is_sso: true,
                    sso_start_url: "https://example.awsapps.com/start",
                }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            // Both should be in active group, sorted alphabetically
            expect(sorted[0].name).toBe("regular");
            expect(sorted[1].name).toBe("sso");
        });

        it("handles complex real-world scenario", () => {
            const profiles = [
                createProfile({
                    name: "prod-admin",
                    has_credentials: true,
                    expired: true,
                    expiration: "2023-01-01T00:00:00Z",
                }),
                createProfile({
                    name: "dev-user",
                    has_credentials: true,
                    expired: false,
                }),
                createProfile({
                    name: "staging-admin",
                    has_credentials: false,
                }),
                createProfile({
                    name: "dev-admin",
                    has_credentials: true,
                    expired: false,
                }),
                createProfile({
                    name: "test-readonly",
                    has_credentials: false,
                }),
                createProfile({
                    name: "prod-readonly",
                    has_credentials: true,
                    expired: true,
                    expiration: "2023-06-01T00:00:00Z",
                }),
            ];

            const sorted = sortByCredentialStatus(profiles);

            // Active credentials (alphabetical)
            expect(sorted[0].name).toBe("dev-admin");
            expect(sorted[1].name).toBe("dev-user");

            // Expired credentials (alphabetical)
            expect(sorted[2].name).toBe("prod-admin");
            expect(sorted[3].name).toBe("prod-readonly");

            // No credentials (alphabetical)
            expect(sorted[4].name).toBe("staging-admin");
            expect(sorted[5].name).toBe("test-readonly");
        });
    });

    describe("logProfileSummary", () => {
        const createProfile = (overrides: Partial<AWSProfile>): AWSProfile => ({
            name: "default",
            has_credentials: false,
            expiration: null,
            expired: false,
            color: "blue",
            icon: "fingerprint",
            ...overrides,
        });

        let consoleLogSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
        });

        it("logs correct summary for empty array", () => {
            logProfileSummary([]);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 0 | SSO: 0 | Active: 0 | Expired: 0"
            );
        });

        it("logs correct summary for profiles with active credentials", () => {
            const profiles = [
                createProfile({ name: "profile1", has_credentials: true, expired: false }),
                createProfile({ name: "profile2", has_credentials: true, expired: false }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 2 | SSO: 0 | Active: 2 | Expired: 0"
            );
        });

        it("logs correct summary for profiles with expired credentials", () => {
            const profiles = [
                createProfile({
                    name: "profile1",
                    has_credentials: true,
                    expired: true,
                }),
                createProfile({
                    name: "profile2",
                    has_credentials: true,
                    expired: true,
                }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 2 | SSO: 0 | Active: 0 | Expired: 2"
            );
        });

        it("logs correct summary for SSO profiles", () => {
            const profiles = [
                createProfile({
                    name: "sso1",
                    has_credentials: true,
                    expired: false,
                    is_sso: true,
                }),
                createProfile({
                    name: "sso2",
                    has_credentials: true,
                    expired: false,
                    is_sso: true,
                }),
                createProfile({
                    name: "regular",
                    has_credentials: true,
                    expired: false,
                }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 3 | SSO: 2 | Active: 3 | Expired: 0"
            );
        });

        it("logs correct summary for profiles without credentials", () => {
            const profiles = [
                createProfile({ name: "profile1", has_credentials: false }),
                createProfile({ name: "profile2", has_credentials: false }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 2 | SSO: 0 | Active: 0 | Expired: 0"
            );
        });

        it("logs correct summary for mixed profile types", () => {
            const profiles = [
                createProfile({
                    name: "active1",
                    has_credentials: true,
                    expired: false,
                }),
                createProfile({
                    name: "active2",
                    has_credentials: true,
                    expired: false,
                }),
                createProfile({
                    name: "expired1",
                    has_credentials: true,
                    expired: true,
                }),
                createProfile({
                    name: "no-creds",
                    has_credentials: false,
                }),
                createProfile({
                    name: "sso1",
                    has_credentials: true,
                    expired: false,
                    is_sso: true,
                }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 5 | SSO: 1 | Active: 3 | Expired: 1"
            );
        });

        it("distinguishes between SSO and non-SSO profiles correctly", () => {
            const profiles = [
                createProfile({
                    name: "sso-active",
                    has_credentials: true,
                    expired: false,
                    is_sso: true,
                }),
                createProfile({
                    name: "sso-expired",
                    has_credentials: true,
                    expired: true,
                    is_sso: true,
                }),
                createProfile({
                    name: "regular-active",
                    has_credentials: true,
                    expired: false,
                    is_sso: false,
                }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 3 | SSO: 2 | Active: 2 | Expired: 1"
            );
        });

        it("handles profiles with undefined is_sso field", () => {
            const profiles = [
                createProfile({
                    name: "no-sso-field",
                    has_credentials: true,
                    expired: false,
                    // is_sso is undefined
                }),
                createProfile({
                    name: "with-sso-field",
                    has_credentials: true,
                    expired: false,
                    is_sso: true,
                }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 2 | SSO: 1 | Active: 2 | Expired: 0"
            );
        });

        it("counts profiles correctly when both has_credentials and expired are true", () => {
            const profiles = [
                createProfile({
                    name: "expired-creds",
                    has_credentials: true,
                    expired: true,
                }),
            ];

            logProfileSummary(profiles);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "[Profile Summary] Total: 1 | SSO: 0 | Active: 0 | Expired: 1"
            );
        });

        it("handles large numbers of profiles", () => {
            const profiles = Array.from({ length: 100 }, (_, i) =>
                createProfile({
                    name: `profile${i}`,
                    has_credentials: i % 2 === 0,
                    expired: i % 3 === 0,
                    is_sso: i % 5 === 0,
                })
            );

            logProfileSummary(profiles);

            // Verify the log was called
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("Total: 100")
            );
        });
    });
});
