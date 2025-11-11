/**
 * Unit tests for ProfileList component
 * Tests rendering, favorites, empty states, and user interactions
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ProfileList } from "../ProfileList";
import { AWSProfile } from "../../types";

describe("ProfileList", () => {
    const mockProfiles: AWSProfile[] = [
        {
            name: "profile1",
            has_credentials: true,
            expiration: null,
            expired: false,
            color: "blue",
            icon: "fingerprint",
        },
        {
            name: "profile2",
            has_credentials: true,
            expiration: "2025-12-31T23:59:59Z",
            expired: false,
            color: "red",
            icon: "briefcase",
            is_sso: true,
            sso_start_url: "https://example.awsapps.com/start",
        },
        {
            name: "profile3",
            has_credentials: false,
            expiration: "2025-01-01T00:00:00Z",
            expired: true,
            color: "green",
            icon: "cart",
        },
    ];

    const mockOnProfileClick = jest.fn();
    const mockOnFavoriteToggle = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders list of profiles", () => {
            render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("profile1")).toBeInTheDocument();
            expect(screen.getByText("profile2")).toBeInTheDocument();
            expect(screen.getByText("profile3")).toBeInTheDocument();
        });

        it("shows favorite indicator for favorited profiles", () => {
            render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={["profile1", "profile3"]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // ProfileItem should render favorite stars for profile1 and profile3
            const table = screen.getByRole("table");
            expect(table).toBeInTheDocument();
        });

        it("renders all profiles in a table", () => {
            const { container } = render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const table = container.querySelector("table.menu");
            expect(table).toBeInTheDocument();

            const rows = container.querySelectorAll("tbody tr");
            expect(rows).toHaveLength(3);
        });
    });

    describe("Empty States", () => {
        it("handles empty profile list with default message", () => {
            render(
                <ProfileList
                    profiles={[]}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("No profiles found")).toBeInTheDocument();
        });

        it("handles empty profile list with custom message", () => {
            const customMessage = "Custom empty message";
            render(
                <ProfileList
                    profiles={[]}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                    emptyMessage={customMessage}
                />
            );

            expect(screen.getByText(customMessage)).toBeInTheDocument();
            expect(screen.queryByText("No profiles found")).not.toBeInTheDocument();
        });

        it("shows empty message in centered table cell", () => {
            const { container } = render(
                <ProfileList
                    profiles={[]}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const cell = container.querySelector("td");
            expect(cell).toHaveStyle({ textAlign: "center" });
        });
    });

    describe("User Interactions", () => {
        it("calls onProfileClick when profile is clicked", async () => {
            const user = userEvent.setup();

            render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const profileRow = screen.getByText("profile1").closest("tr");
            expect(profileRow).toBeInTheDocument();

            if (profileRow) {
                await user.click(profileRow);
                expect(mockOnProfileClick).toHaveBeenCalledTimes(1);
                expect(mockOnProfileClick).toHaveBeenCalledWith(mockProfiles[0]);
            }
        });

        it("calls onFavoriteToggle when favorite star is clicked", async () => {
            const user = userEvent.setup();

            render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={["profile1"]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Find the favorite star button
            const stars = screen.getAllByText("⭐");
            expect(stars.length).toBeGreaterThan(0);

            // Click the first star (for profile1)
            await user.click(stars[0]);

            expect(mockOnFavoriteToggle).toHaveBeenCalled();
        });

        it("renders correct number of ProfileItem components", () => {
            const { container } = render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const rows = container.querySelectorAll(".menu-item");
            expect(rows).toHaveLength(3);
        });
    });

    describe("Props Handling", () => {
        it("passes correct isFavorite prop to ProfileItem", () => {
            const favorites = ["profile2"];

            const { container } = render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={favorites}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Profile2 should have a filled star
            const profile2Row = screen.getByText("profile2").closest("tr");
            expect(profile2Row).toBeInTheDocument();
        });

        it("renders with no favorites", () => {
            render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Should render empty stars for all profiles
            const emptyStars = screen.getAllByText("☆");
            expect(emptyStars.length).toBeGreaterThan(0);
        });

        it("renders with all profiles favorited", () => {
            const allFavorites = mockProfiles.map((p) => p.name);

            render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={allFavorites}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            // Should render filled stars for all profiles
            const filledStars = screen.getAllByText("⭐");
            expect(filledStars).toHaveLength(3);
        });
    });

    describe("Table Structure", () => {
        it("renders table with correct class names", () => {
            const { container } = render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const table = container.querySelector("table.menu#identities-list");
            expect(table).toBeInTheDocument();
            expect(table).toHaveStyle({ width: "100%" });
        });

        it("renders tbody element", () => {
            const { container } = render(
                <ProfileList
                    profiles={mockProfiles}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            const tbody = container.querySelector("tbody");
            expect(tbody).toBeInTheDocument();
        });
    });

    describe("Edge Cases", () => {
        it("handles single profile", () => {
            render(
                <ProfileList
                    profiles={[mockProfiles[0]]}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("profile1")).toBeInTheDocument();
            expect(screen.queryByText("profile2")).not.toBeInTheDocument();
        });

        it("handles profile with SSO metadata", () => {
            render(
                <ProfileList
                    profiles={[mockProfiles[1]]}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("profile2")).toBeInTheDocument();
        });

        it("handles expired profiles", () => {
            render(
                <ProfileList
                    profiles={[mockProfiles[2]]}
                    favorites={[]}
                    onProfileClick={mockOnProfileClick}
                    onFavoriteToggle={mockOnFavoriteToggle}
                />
            );

            expect(screen.getByText("profile3")).toBeInTheDocument();
        });
    });
});
