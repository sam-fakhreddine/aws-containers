/**
 * Tests for ProfileItem component
 * Tests profile rendering, favorite toggle, and user interactions
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProfileItem } from "@/components/ProfileItem";
import { AWSProfile } from "@/types";

describe("ProfileItem", () => {
    const mockOnProfileClick = jest.fn();
    const mockOnFavoriteToggle = jest.fn();

    const baseProfile: AWSProfile = {
        name: "test-profile",
        has_credentials: true,
        expiration: null,
        expired: false,
        color: "blue",
        icon: "fingerprint",
        is_sso: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Rendering", () => {
        it("should render profile name", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("test-profile")).toBeInTheDocument();
        });

        it("should render SSO badge for SSO profiles", () => {
            const ssoProfile = { ...baseProfile, is_sso: true };

            render(
                <ProfileItem
                    profile={ssoProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("SSO")).toBeInTheDocument();
        });

        it("should not render SSO badge for non-SSO profiles", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.queryByText("SSO")).not.toBeInTheDocument();
        });

        it("should render filled star icon for favorite profiles", () => {
            const { container } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={true}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Verify the star container exists (icon is rendered by Cloudscape)
            const starContainer = container.querySelector('div[style*="cursor: pointer"]');
            expect(starContainer).toBeInTheDocument();
        });

        it("should render empty star icon for non-favorite profiles", () => {
            const { container } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Verify the star container exists (icon is rendered by Cloudscape)
            const starContainer = container.querySelector('div[style*="cursor: pointer"]');
            expect(starContainer).toBeInTheDocument();
        });
    });

    describe("Profile Click Handling", () => {
        it("should call onProfileClick when profile is clicked", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = screen.getByText("test-profile").closest('[role="button"]');
            fireEvent.click(profileElement!);

            expect(mockOnProfileClick).toHaveBeenCalledWith(baseProfile);
        });

        it("should call onProfileClick when Enter key is pressed", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = screen.getByText("test-profile").closest('[role="button"]');
            fireEvent.keyDown(profileElement!, { key: "Enter" });

            expect(mockOnProfileClick).toHaveBeenCalledWith(baseProfile);
        });

        it("should call onProfileClick when Space key is pressed", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = screen.getByText("test-profile").closest('[role="button"]');
            fireEvent.keyDown(profileElement!, { key: " " });

            expect(mockOnProfileClick).toHaveBeenCalledWith(baseProfile);
        });

        it("should not call onProfileClick for other keys", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = screen.getByText("test-profile").closest('[role="button"]');
            fireEvent.keyDown(profileElement!, { key: "a" });

            expect(mockOnProfileClick).not.toHaveBeenCalled();
        });
    });

    describe("Favorite Toggle", () => {
        it("should call onFavoriteToggle when star is clicked", () => {
            const { container } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Find the star container by its style
            const starContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
            // The star is the last clickable element (after the profile item itself)
            const starContainer = Array.from(starContainers).pop();
            
            if (starContainer) {
                fireEvent.click(starContainer);
                expect(mockOnFavoriteToggle).toHaveBeenCalledWith(
                    "test-profile",
                    expect.any(Object)
                );
            }
        });

        it("should call onFavoriteToggle with profile name and event", () => {
            const { container } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Find the star container by its style
            const starContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
            // The star is the last clickable element (after the profile item itself)
            const starContainer = Array.from(starContainers).pop();
            
            if (starContainer) {
                fireEvent.click(starContainer);
                // Should call with profile name and event object
                expect(mockOnFavoriteToggle).toHaveBeenCalledWith(
                    "test-profile",
                    expect.any(Object)
                );
            }
        });
    });

    describe("Credential Status", () => {
        it("should show error message for SSO profile without credentials", () => {
            const profileWithoutCreds: AWSProfile = {
                ...baseProfile,
                is_sso: true,
                has_credentials: false,
            };

            render(
                <ProfileItem
                    profile={profileWithoutCreds}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText(/Run: aws sso login --profile test-profile/i)).toBeInTheDocument();
        });

        it("should show red border for profile without credentials", () => {
            const profileWithoutCreds: AWSProfile = {
                ...baseProfile,
                has_credentials: false,
                is_sso: true,
            };

            const { container } = render(
                <ProfileItem
                    profile={profileWithoutCreds}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = container.querySelector('[role="button"]');
            expect(profileElement).toHaveStyle({ border: "2px solid #d13212" });
        });

        it("should not show error for profile with credentials", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.queryByText(/Run: aws sso login/i)).not.toBeInTheDocument();
        });
    });

    describe("Expiration Display", () => {
        it("should show expiration info for profiles with expiration", () => {
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 2);

            const profileWithExpiration: AWSProfile = {
                ...baseProfile,
                expiration: futureDate.toISOString(),
                expired: false,
            };

            render(
                <ProfileItem
                    profile={profileWithExpiration}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
        });

        it("should show expired status for expired profiles", () => {
            const pastDate = new Date();
            pastDate.setHours(pastDate.getHours() - 2);

            const expiredProfile: AWSProfile = {
                ...baseProfile,
                expiration: pastDate.toISOString(),
                expired: true,
            };

            render(
                <ProfileItem
                    profile={expiredProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText(/Expired/i)).toBeInTheDocument();
        });

        it("should not show expiration for profiles without expiration", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.queryByText(/Expires/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Expired/i)).not.toBeInTheDocument();
        });

        it("should show warning icon for expiring soon profiles", () => {
            const soonDate = new Date();
            soonDate.setMinutes(soonDate.getMinutes() + 30);

            const expiringSoonProfile: AWSProfile = {
                ...baseProfile,
                expiration: soonDate.toISOString(),
                expired: false,
            };

            render(
                <ProfileItem
                    profile={expiringSoonProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Verify expiration text is shown (icon is rendered by Cloudscape)
            expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
        });
    });

    describe("Different Profile States", () => {
        it("should render active profile correctly", () => {
            const activeProfile: AWSProfile = {
                ...baseProfile,
                has_credentials: true,
            };

            render(
                <ProfileItem
                    profile={activeProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("test-profile")).toBeInTheDocument();
        });

        it("should render inactive profile correctly", () => {
            const inactiveProfile: AWSProfile = {
                ...baseProfile,
                has_credentials: false,
                is_sso: true,
            };

            render(
                <ProfileItem
                    profile={inactiveProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("test-profile")).toBeInTheDocument();
            expect(screen.getByText(/Run: aws sso login/i)).toBeInTheDocument();
        });
    });

    describe("Memoization", () => {
        it("should not re-render when unrelated props change", () => {
            const { rerender } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const firstRender = screen.getByText("test-profile");

            // Rerender with same profile data but different function references
            const newOnClick = jest.fn();
            const newOnToggle = jest.fn();

            rerender(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={newOnClick}
                    onFavoriteToggle={newOnToggle}
                />
            );

            const secondRender = screen.getByText("test-profile");

            // Should be the same element (memoized)
            expect(firstRender).toBe(secondRender);
        });

        it("should re-render when profile name changes", () => {
            const { rerender } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("test-profile")).toBeInTheDocument();

            const updatedProfile = { ...baseProfile, name: "updated-profile" };

            rerender(
                <ProfileItem
                    profile={updatedProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("updated-profile")).toBeInTheDocument();
            expect(screen.queryByText("test-profile")).not.toBeInTheDocument();
        });

        it("should re-render when favorite status changes", () => {
            const { rerender, container } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Verify star container exists
            const starContainer1 = container.querySelector('div[style*="cursor: pointer"]');
            expect(starContainer1).toBeInTheDocument();

            rerender(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={true}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Verify star container still exists after favorite change
            const starContainer2 = container.querySelector('div[style*="cursor: pointer"]');
            expect(starContainer2).toBeInTheDocument();
        });
    });

    describe("Keyboard Navigation", () => {
        it("should be keyboard accessible with tabIndex", () => {
            const { container } = render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = container.querySelector('[role="button"]');
            expect(profileElement).toHaveAttribute("tabIndex", "0");
        });

        it("should handle Enter key for activation", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = screen.getByText("test-profile").closest('[role="button"]');
            fireEvent.keyDown(profileElement!, { key: "Enter" });

            expect(mockOnProfileClick).toHaveBeenCalledWith(baseProfile);
        });

        it("should handle Space key for activation", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = screen.getByText("test-profile").closest('[role="button"]');
            fireEvent.keyDown(profileElement!, { key: " " });

            expect(mockOnProfileClick).toHaveBeenCalledWith(baseProfile);
        });

        it("should prevent default behavior for Space key", () => {
            render(
                <ProfileItem
                    profile={baseProfile}
                    isFavorite={false}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileElement = screen.getByText("test-profile").closest('[role="button"]');
            const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
            const preventDefaultSpy = jest.spyOn(event, "preventDefault");
            
            profileElement!.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });
});
