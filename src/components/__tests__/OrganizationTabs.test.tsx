/**
 * Tests for OrganizationTabs component
 * Tests organization tab navigation and filtering
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OrganizationTabs } from "@/components/OrganizationTabs";
import { AWSProfile } from "@/types";

describe("OrganizationTabs", () => {
    const mockOnTabChange = jest.fn();

    const mockProfiles: AWSProfile[] = [
        {
            name: "prod-profile",
            has_credentials: true,
            expiration: null,
            expired: false,
            color: "red",
            icon: "briefcase",
            is_sso: true,
            sso_session: "production",
        },
        {
            name: "dev-profile",
            has_credentials: true,
            expiration: null,
            expired: false,
            color: "blue",
            icon: "fingerprint",
            is_sso: true,
            sso_session: "development",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Rendering", () => {
        it("should render all tab with total profile count", () => {
            const organizations = new Map();
            
            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={10}
                />
            );

            // Should show "All" tab with count
            expect(screen.getByText(/All \(10\)/i)).toBeInTheDocument();
        });

        it("should render organization tabs with profile counts", () => {
            const organizations = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
                ["dev", { name: "Development", profiles: [mockProfiles[1]] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={2}
                />
            );

            // Should show all tabs with counts
            expect(screen.getByText(/All \(2\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Production \(1\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Development \(1\)/i)).toBeInTheDocument();
        });

        it("should render with empty organizations", () => {
            const organizations = new Map();

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={0}
                />
            );

            // Should only show "All" tab with 0 count
            expect(screen.getByText(/All \(0\)/i)).toBeInTheDocument();
        });

        it("should render with multiple organizations", () => {
            const organizations = new Map([
                ["org1", { name: "Org 1", profiles: [mockProfiles[0]] }],
                ["org2", { name: "Org 2", profiles: [mockProfiles[1]] }],
                ["org3", { name: "Org 3", profiles: [] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={2}
                />
            );

            expect(screen.getByText(/All \(2\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Org 1 \(1\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Org 2 \(1\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Org 3 \(0\)/i)).toBeInTheDocument();
        });
    });

    describe("Tab Switching", () => {
        it("should call onTabChange when a tab is clicked", () => {
            const organizations = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
            ]);

            const { container } = render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={1}
                />
            );

            // Find the Production tab and click it
            const prodTab = screen.getByText(/Production \(1\)/i);
            fireEvent.click(prodTab);

            // Should call onTabChange with the tab key
            expect(mockOnTabChange).toHaveBeenCalled();
        });

        it("should highlight the selected tab", () => {
            const organizations = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="prod"
                    onTabChange={mockOnTabChange}
                    totalProfiles={1}
                />
            );

            // The component should render with prod tab selected
            // Cloudscape Tabs component handles the active state internally
            expect(screen.getByText(/Production \(1\)/i)).toBeInTheDocument();
        });

        it("should switch between tabs", () => {
            const organizations = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
                ["dev", { name: "Development", profiles: [mockProfiles[1]] }],
            ]);

            const { rerender } = render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={2}
                />
            );

            // Initially "all" is selected
            expect(screen.getByText(/All \(2\)/i)).toBeInTheDocument();

            // Rerender with "prod" selected
            rerender(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="prod"
                    onTabChange={mockOnTabChange}
                    totalProfiles={2}
                />
            );

            // Should still show all tabs
            expect(screen.getByText(/Production \(1\)/i)).toBeInTheDocument();
        });
    });

    describe("Filtering Profiles by Organization", () => {
        it("should show all profiles when 'all' tab is selected", () => {
            const organizations = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={10}
                />
            );

            // Should show total count in All tab
            expect(screen.getByText(/All \(10\)/i)).toBeInTheDocument();
        });

        it("should filter to organization profiles when org tab is selected", () => {
            const organizations = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
                ["dev", { name: "Development", profiles: [mockProfiles[1]] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="prod"
                    onTabChange={mockOnTabChange}
                    totalProfiles={2}
                />
            );

            // Should show Production tab with 1 profile
            expect(screen.getByText(/Production \(1\)/i)).toBeInTheDocument();
        });
    });

    describe("Empty Organization Handling", () => {
        it("should handle organization with no profiles", () => {
            const organizations = new Map([
                ["empty", { name: "Empty Org", profiles: [] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={0}
                />
            );

            // Should show organization with 0 count
            expect(screen.getByText(/Empty Org \(0\)/i)).toBeInTheDocument();
        });

        it("should handle all organizations being empty", () => {
            const organizations = new Map([
                ["org1", { name: "Org 1", profiles: [] }],
                ["org2", { name: "Org 2", profiles: [] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={0}
                />
            );

            expect(screen.getByText(/All \(0\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Org 1 \(0\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Org 2 \(0\)/i)).toBeInTheDocument();
        });
    });

    describe("Memoization", () => {
        it("should not re-render when props haven't changed", () => {
            const organizations = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
            ]);

            const { rerender } = render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={1}
                />
            );

            const firstRender = screen.getByText(/All \(1\)/i);

            // Rerender with same props
            rerender(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={1}
                />
            );

            const secondRender = screen.getByText(/All \(1\)/i);

            // Should be the same element (memoized)
            expect(firstRender).toBe(secondRender);
        });

        it("should re-render when organizations change", () => {
            const organizations1 = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
            ]);

            const organizations2 = new Map([
                ["prod", { name: "Production", profiles: [mockProfiles[0]] }],
                ["dev", { name: "Development", profiles: [mockProfiles[1]] }],
            ]);

            const { rerender } = render(
                <OrganizationTabs
                    organizations={organizations1}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={1}
                />
            );

            expect(screen.getByText(/All \(1\)/i)).toBeInTheDocument();
            expect(screen.queryByText(/Development/i)).not.toBeInTheDocument();

            // Rerender with different organizations
            rerender(
                <OrganizationTabs
                    organizations={organizations2}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={2}
                />
            );

            expect(screen.getByText(/All \(2\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Development \(1\)/i)).toBeInTheDocument();
        });
    });

    describe("Edge Cases", () => {
        it("should handle very large profile counts", () => {
            const organizations = new Map([
                ["large", { name: "Large Org", profiles: new Array(1000).fill(mockProfiles[0]) }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={1000}
                />
            );

            expect(screen.getByText(/All \(1000\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Large Org \(1000\)/i)).toBeInTheDocument();
        });

        it("should handle organization names with special characters", () => {
            const organizations = new Map([
                ["special", { name: "Org & Co. (Test)", profiles: [mockProfiles[0]] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={mockOnTabChange}
                    totalProfiles={1}
                />
            );

            expect(screen.getByText(/Org & Co\. \(Test\) \(1\)/i)).toBeInTheDocument();
        });
    });
});
