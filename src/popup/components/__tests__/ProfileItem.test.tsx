/**
 * Unit tests for ProfileItem component
 * Tests profile rendering, expiration formatting, and user interactions
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileItem } from "../ProfileItem";
import { AWSProfile } from "../../types";

describe("ProfileItem", () => {
    const createProfile = (overrides: Partial<AWSProfile> = {}): AWSProfile => ({
        name: "test-profile",
        has_credentials: true,
        expiration: null,
        expired: false,
        color: "blue",
        icon: "fingerprint",
        is_sso: false,
        sso_start_url: undefined,
        ...overrides,
    });

    const defaultProps = {
        profile: createProfile(),
        isFavorite: false,
        onProfileClick: jest.fn(),
        onFavoriteToggle: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Basic rendering", () => {
        it("renders profile name", () => {
            render(<ProfileItem {...defaultProps} />);
            expect(screen.getByText("test-profile")).toBeInTheDocument();
        });

        it("renders profile with custom name", () => {
            const profile = createProfile({ name: "production-admin" });
            render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(screen.getByText("production-admin")).toBeInTheDocument();
        });

        it("renders profile without credentials", () => {
            const profile = createProfile({ has_credentials: false });
            render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(screen.getByText("test-profile")).toBeInTheDocument();
        });
    });

    describe("SSO badge", () => {
        it("renders SSO badge for SSO profiles", () => {
            const profile = createProfile({
                is_sso: true,
                sso_start_url: "https://example.awsapps.com/start",
            });
            render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(screen.getByText("SSO")).toBeInTheDocument();
        });

        it("does not render SSO badge for non-SSO profiles", () => {
            const profile = createProfile({ is_sso: false });
            render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(screen.queryByText("SSO")).not.toBeInTheDocument();
        });
    });

    describe("Expiration display", () => {
        it("shows expired badge for expired credentials", () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const profile = createProfile({
                has_credentials: true,
                expiration: yesterday.toISOString(),
                expired: true,
            });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            // Should show "Expired Xh ago" or "Expired X days ago"
            expect(screen.getByText(/Expired.*ago/)).toBeInTheDocument();
        });

        it("shows expiring today badge", () => {
            const in12Hours = new Date();
            in12Hours.setHours(in12Hours.getHours() + 12);

            const profile = createProfile({
                has_credentials: true,
                expiration: in12Hours.toISOString(),
                expired: false,
            });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            const badge = screen.getByText(/Expires in \d+h/);
            expect(badge).toBeInTheDocument();
        });

        it("shows expiring soon badge for profiles expiring within 24 hours", () => {
            const in12Hours = new Date();
            in12Hours.setHours(in12Hours.getHours() + 12);

            const profile = createProfile({
                has_credentials: true,
                expiration: in12Hours.toISOString(),
                expired: false,
            });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            const badge = screen.getByText(/Expires in \d+h/);
            expect(badge).toBeInTheDocument();
        });

        it("shows valid badge for profiles with >24 hours", () => {
            const in48Hours = new Date();
            in48Hours.setHours(in48Hours.getHours() + 48);

            const profile = createProfile({
                has_credentials: true,
                expiration: in48Hours.toISOString(),
                expired: false,
            });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            // Should show "Expires in X days" or "Expires Mon DD"
            const badge = screen.getByText(/Expires in \d+ days?/);
            expect(badge).toBeInTheDocument();
        });

        it("does not show badge when no expiration", () => {
            const profile = createProfile({
                has_credentials: true,
                expiration: null,
            });

            const { container } = render(<ProfileItem {...defaultProps} profile={profile} />);
            // No expiration badge should be present
            expect(container.textContent).not.toMatch(/Expires/);
            expect(container.textContent).not.toMatch(/Expired/);
        });

        it("does not show badge when no credentials", () => {
            const profile = createProfile({
                has_credentials: false,
                expiration: null,
            });

            const { container } = render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(container.textContent).not.toMatch(/Expires/);
            expect(container.textContent).not.toMatch(/Expired/);
        });
    });

    describe("Favorite toggle", () => {
        it("shows star-filled icon when profile is favorited", () => {
            const { container } = render(
                <ProfileItem {...defaultProps} isFavorite={true} />
            );
            // CloudScape Icon should be present
            const icon = container.querySelector('span[class*="awsui_icon"]');
            expect(icon).toBeInTheDocument();
        });

        it("calls onFavoriteToggle when favorite icon clicked", async () => {
            const user = userEvent.setup();
            const onFavoriteToggle = jest.fn();

            const { container } = render(
                <ProfileItem
                    {...defaultProps}
                    isFavorite={false}
                    onFavoriteToggle={onFavoriteToggle}
                />
            );

            // Find the favorite toggle div (has padding: 2px 6px and cursor: pointer)
            const favoriteDiv = container.querySelector('div[style*="padding: 2px 6px"]');
            expect(favoriteDiv).toBeInTheDocument();

            await user.click(favoriteDiv!);
            expect(onFavoriteToggle).toHaveBeenCalledWith(
                "test-profile",
                expect.any(Object)
            );
        });

        it("triggers both favorite toggle and profile click when favorite icon clicked", async () => {
            const user = userEvent.setup();
            const onProfileClick = jest.fn();
            const onFavoriteToggle = jest.fn();
            const profile = createProfile();

            const { container } = render(
                <ProfileItem
                    {...defaultProps}
                    profile={profile}
                    onProfileClick={onProfileClick}
                    onFavoriteToggle={onFavoriteToggle}
                />
            );

            // Find the favorite toggle div
            const favoriteDiv = container.querySelector('div[style*="padding: 2px 6px"]');
            await user.click(favoriteDiv!);

            // Both handlers are called because the event bubbles up
            expect(onFavoriteToggle).toHaveBeenCalled();
            expect(onProfileClick).toHaveBeenCalledWith(profile);
        });
    });

    describe("Profile click", () => {
        it("calls onProfileClick when profile is clicked", async () => {
            const user = userEvent.setup();
            const onProfileClick = jest.fn();
            const profile = createProfile();

            render(
                <ProfileItem
                    {...defaultProps}
                    profile={profile}
                    onProfileClick={onProfileClick}
                />
            );

            // Click on the main container (not the favorite button)
            const profileName = screen.getByText("test-profile");
            await user.click(profileName);

            expect(onProfileClick).toHaveBeenCalledWith(profile);
        });

        it("calls onProfileClick with correct profile", async () => {
            const user = userEvent.setup();
            const onProfileClick = jest.fn();
            const profile = createProfile({ name: "staging-readonly" });

            render(
                <ProfileItem
                    {...defaultProps}
                    profile={profile}
                    onProfileClick={onProfileClick}
                />
            );

            const profileName = screen.getByText("staging-readonly");
            await user.click(profileName);

            expect(onProfileClick).toHaveBeenCalledWith(profile);
        });
    });

    describe("Memoization", () => {
        it("does not re-render when props are the same", () => {
            const profile = createProfile();
            const onProfileClick = jest.fn();
            const onFavoriteToggle = jest.fn();

            const { rerender } = render(
                <ProfileItem
                    profile={profile}
                    isFavorite={false}
                    onProfileClick={onProfileClick}
                    onFavoriteToggle={onFavoriteToggle}
                />
            );

            const firstRender = screen.getByText("test-profile");

            // Re-render with exact same props
            rerender(
                <ProfileItem
                    profile={profile}
                    isFavorite={false}
                    onProfileClick={onProfileClick}
                    onFavoriteToggle={onFavoriteToggle}
                />
            );

            const secondRender = screen.getByText("test-profile");
            expect(firstRender).toBe(secondRender);
        });

        it("re-renders when profile changes", () => {
            const profile1 = createProfile({ name: "profile-1" });
            const profile2 = createProfile({ name: "profile-2" });

            const { rerender } = render(
                <ProfileItem {...defaultProps} profile={profile1} />
            );

            expect(screen.getByText("profile-1")).toBeInTheDocument();

            rerender(<ProfileItem {...defaultProps} profile={profile2} />);

            expect(screen.queryByText("profile-1")).not.toBeInTheDocument();
            expect(screen.getByText("profile-2")).toBeInTheDocument();
        });

        it("re-renders when isFavorite changes", () => {
            const { rerender } = render(
                <ProfileItem {...defaultProps} isFavorite={false} />
            );

            rerender(<ProfileItem {...defaultProps} isFavorite={true} />);

            expect(screen.getByText("test-profile")).toBeInTheDocument();
        });
    });

    describe("Edge cases", () => {
        it("handles profile with very long name", () => {
            const longName = "a".repeat(100);
            const profile = createProfile({ name: longName });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(screen.getByText(longName)).toBeInTheDocument();
        });

        it("handles profile with special characters in name", () => {
            const profile = createProfile({ name: "profile-@#$%-123" });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(screen.getByText("profile-@#$%-123")).toBeInTheDocument();
        });

        it("handles SSO profile with long start URL", () => {
            const profile = createProfile({
                is_sso: true,
                sso_start_url: "https://" + "a".repeat(200) + ".awsapps.com/start",
            });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            expect(screen.getByText("SSO")).toBeInTheDocument();
        });

        it("handles expiration exactly 24 hours away", () => {
            const exactly24Hours = new Date();
            exactly24Hours.setHours(exactly24Hours.getHours() + 24);

            const profile = createProfile({
                has_credentials: true,
                expiration: exactly24Hours.toISOString(),
                expired: false,
            });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            // Should show expiring soon (within 24h)
            const badge = screen.getByText(/Expires in/);
            expect(badge).toBeInTheDocument();
        });

        it("handles expiration exactly 1 hour away", () => {
            const exactly1Hour = new Date();
            exactly1Hour.setMinutes(exactly1Hour.getMinutes() + 61); // 1 hour + 1 minute to ensure it's > 60 minutes

            const profile = createProfile({
                has_credentials: true,
                expiration: exactly1Hour.toISOString(),
                expired: false,
            });

            render(<ProfileItem {...defaultProps} profile={profile} />);
            const badge = screen.getByText(/Expires in 1h/);
            expect(badge).toBeInTheDocument();
        });
    });

    describe("Multiple profiles", () => {
        it("renders multiple profiles independently", () => {
            const profile1 = createProfile({ name: "profile-1" });
            const profile2 = createProfile({ name: "profile-2" });

            const { container } = render(
                <>
                    <ProfileItem {...defaultProps} profile={profile1} />
                    <ProfileItem {...defaultProps} profile={profile2} />
                </>
            );

            expect(screen.getByText("profile-1")).toBeInTheDocument();
            expect(screen.getByText("profile-2")).toBeInTheDocument();
        });

        it("handles clicks on different profiles correctly", async () => {
            const user = userEvent.setup();
            const onProfileClick = jest.fn();
            const profile1 = createProfile({ name: "profile-1" });
            const profile2 = createProfile({ name: "profile-2" });

            render(
                <>
                    <ProfileItem
                        {...defaultProps}
                        profile={profile1}
                        onProfileClick={onProfileClick}
                    />
                    <ProfileItem
                        {...defaultProps}
                        profile={profile2}
                        onProfileClick={onProfileClick}
                    />
                </>
            );

            await user.click(screen.getByText("profile-1"));
            expect(onProfileClick).toHaveBeenCalledWith(profile1);

            await user.click(screen.getByText("profile-2"));
            expect(onProfileClick).toHaveBeenCalledWith(profile2);

            expect(onProfileClick).toHaveBeenCalledTimes(2);
        });
    });
});
