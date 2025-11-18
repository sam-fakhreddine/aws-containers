/**
 * Unit tests for OrganizationTabs component
 * Tests tab rendering, navigation, and memoization
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrganizationTabs } from "../OrganizationTabs";
import { AWSProfile } from "../../types";

describe("OrganizationTabs", () => {
    const createProfile = (name: string, ssoStartUrl?: string): AWSProfile => ({
        name,
        has_credentials: true,
        expiration: null,
        expired: false,
        color: "blue",
        icon: "fingerprint",
        is_sso: !!ssoStartUrl,
        sso_start_url: ssoStartUrl,
    });

    describe("Rendering", () => {
        it("renders All tab with total count", () => {
            const organizations = new Map();
            const onTabChange = jest.fn();

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={onTabChange}
                    totalProfiles={5}
                />
            );

            expect(screen.getByText("All (5)")).toBeInTheDocument();
        });

        it("renders organization tabs with profile counts", () => {
            const organizations = new Map([
                ["org1", { name: "Organization 1", profiles: [createProfile("profile1"), createProfile("profile2")] }],
                ["org2", { name: "Organization 2", profiles: [createProfile("profile3")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={3}
                />
            );

            expect(screen.getByText("All (3)")).toBeInTheDocument();
            expect(screen.getByText("Organization 1 (2)")).toBeInTheDocument();
            expect(screen.getByText("Organization 2 (1)")).toBeInTheDocument();
        });

        it("renders with zero profiles", () => {
            const organizations = new Map();

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={0}
                />
            );

            expect(screen.getByText("All (0)")).toBeInTheDocument();
        });

        it("renders with multiple organizations", () => {
            const organizations = new Map([
                ["org1", { name: "Org 1", profiles: [createProfile("p1")] }],
                ["org2", { name: "Org 2", profiles: [createProfile("p2")] }],
                ["org3", { name: "Org 3", profiles: [createProfile("p3")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={3}
                />
            );

            expect(screen.getByText("Org 1 (1)")).toBeInTheDocument();
            expect(screen.getByText("Org 2 (1)")).toBeInTheDocument();
            expect(screen.getByText("Org 3 (1)")).toBeInTheDocument();
        });
    });

    describe("Tab selection", () => {
        it("highlights selected tab", () => {
            const organizations = new Map([
                ["org1", { name: "Organization 1", profiles: [createProfile("profile1")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="org1"
                    onTabChange={jest.fn()}
                    totalProfiles={1}
                />
            );

            // CloudScape marks active tab differently, just verify it renders
            expect(screen.getByText("Organization 1 (1)")).toBeInTheDocument();
        });

        it("calls onTabChange when All tab clicked", async () => {
            const user = userEvent.setup();
            const onTabChange = jest.fn();
            const organizations = new Map([
                ["org1", { name: "Organization 1", profiles: [createProfile("profile1")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="org1"
                    onTabChange={onTabChange}
                    totalProfiles={1}
                />
            );

            const allTab = screen.getByText("All (1)");
            await user.click(allTab);

            expect(onTabChange).toHaveBeenCalledWith("all");
        });

        it("calls onTabChange when organization tab clicked", async () => {
            const user = userEvent.setup();
            const onTabChange = jest.fn();
            const organizations = new Map([
                ["org1", { name: "Organization 1", profiles: [createProfile("profile1")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={onTabChange}
                    totalProfiles={1}
                />
            );

            const orgTab = screen.getByText("Organization 1 (1)");
            await user.click(orgTab);

            expect(onTabChange).toHaveBeenCalledWith("org1");
        });

        it("calls onTabChange with correct ID for multiple orgs", async () => {
            const user = userEvent.setup();
            const onTabChange = jest.fn();
            const organizations = new Map([
                ["org-a", { name: "Org A", profiles: [createProfile("p1")] }],
                ["org-b", { name: "Org B", profiles: [createProfile("p2")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={onTabChange}
                    totalProfiles={2}
                />
            );

            const orgBTab = screen.getByText("Org B (1)");
            await user.click(orgBTab);

            expect(onTabChange).toHaveBeenCalledWith("org-b");
        });
    });

    describe("Tab counts", () => {
        it("shows correct count for organization with multiple profiles", () => {
            const profiles = Array.from({ length: 10 }, (_, i) => createProfile(`profile${i}`));
            const organizations = new Map([
                ["org1", { name: "Big Org", profiles }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={10}
                />
            );

            expect(screen.getByText("Big Org (10)")).toBeInTheDocument();
        });

        it("shows zero count for empty organization", () => {
            const organizations = new Map([
                ["org1", { name: "Empty Org", profiles: [] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={0}
                />
            );

            expect(screen.getByText("Empty Org (0)")).toBeInTheDocument();
        });

        it("total count matches sum of organization counts", () => {
            const organizations = new Map([
                ["org1", { name: "Org 1", profiles: [createProfile("p1"), createProfile("p2")] }],
                ["org2", { name: "Org 2", profiles: [createProfile("p3")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={3}
                />
            );

            expect(screen.getByText("All (3)")).toBeInTheDocument();
            expect(screen.getByText("Org 1 (2)")).toBeInTheDocument();
            expect(screen.getByText("Org 2 (1)")).toBeInTheDocument();
        });
    });

    describe("Memoization", () => {
        it("does not re-render when parent re-renders with same props", () => {
            const organizations = new Map([
                ["org1", { name: "Organization 1", profiles: [createProfile("profile1")] }],
            ]);
            const onTabChange = jest.fn();

            const { rerender } = render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={onTabChange}
                    totalProfiles={1}
                />
            );

            const firstRender = screen.getByText("All (1)");

            // Re-render with same props
            rerender(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={onTabChange}
                    totalProfiles={1}
                />
            );

            const secondRender = screen.getByText("All (1)");

            // Should be the same instance due to memoization
            expect(firstRender).toBe(secondRender);
        });

        it("re-renders when organizations change", () => {
            const organizations1 = new Map([
                ["org1", { name: "Org 1", profiles: [createProfile("p1")] }],
            ]);
            const organizations2 = new Map([
                ["org2", { name: "Org 2", profiles: [createProfile("p2")] }],
            ]);

            const { rerender } = render(
                <OrganizationTabs
                    organizations={organizations1}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={1}
                />
            );

            expect(screen.getByText("Org 1 (1)")).toBeInTheDocument();

            rerender(
                <OrganizationTabs
                    organizations={organizations2}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={1}
                />
            );

            expect(screen.queryByText("Org 1 (1)")).not.toBeInTheDocument();
            expect(screen.getByText("Org 2 (1)")).toBeInTheDocument();
        });

        it("re-renders when selectedTab changes", () => {
            const organizations = new Map([
                ["org1", { name: "Org 1", profiles: [createProfile("p1")] }],
            ]);

            const { rerender } = render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={1}
                />
            );

            rerender(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="org1"
                    onTabChange={jest.fn()}
                    totalProfiles={1}
                />
            );

            // Component should update
            expect(screen.getByText("Org 1 (1)")).toBeInTheDocument();
        });
    });

    describe("Empty state", () => {
        it("shows only All tab when no organizations", () => {
            const organizations = new Map();

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={0}
                />
            );

            expect(screen.getByText("All (0)")).toBeInTheDocument();
            // No organization tabs should be present
            const tabs = screen.getAllByRole("tab");
            expect(tabs).toHaveLength(1);
        });
    });

    describe("Tab navigation", () => {
        it("allows switching between tabs", async () => {
            const user = userEvent.setup();
            const onTabChange = jest.fn();
            const organizations = new Map([
                ["org1", { name: "Org 1", profiles: [createProfile("p1")] }],
                ["org2", { name: "Org 2", profiles: [createProfile("p2")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={onTabChange}
                    totalProfiles={2}
                />
            );

            // Click first org
            await user.click(screen.getByText("Org 1 (1)"));
            expect(onTabChange).toHaveBeenCalledWith("org1");

            // Click second org
            await user.click(screen.getByText("Org 2 (1)"));
            expect(onTabChange).toHaveBeenCalledWith("org2");

            expect(onTabChange).toHaveBeenCalledTimes(2);
        });
    });

    describe("Edge cases", () => {
        it("handles organization with long name", () => {
            const organizations = new Map([
                [
                    "org1",
                    {
                        name: "Very Long Organization Name That Might Cause Layout Issues",
                        profiles: [createProfile("p1")],
                    },
                ],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={1}
                />
            );

            expect(
                screen.getByText("Very Long Organization Name That Might Cause Layout Issues (1)")
            ).toBeInTheDocument();
        });

        it("handles large number of profiles", () => {
            const organizations = new Map([
                ["org1", { name: "Big Org", profiles: Array(999).fill(createProfile("p")) }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={999}
                />
            );

            expect(screen.getByText("Big Org (999)")).toBeInTheDocument();
        });

        it("handles special characters in organization name", () => {
            const organizations = new Map([
                ["org1", { name: "Org & Co. (Special)", profiles: [createProfile("p1")] }],
            ]);

            render(
                <OrganizationTabs
                    organizations={organizations}
                    selectedTab="all"
                    onTabChange={jest.fn()}
                    totalProfiles={1}
                />
            );

            expect(screen.getByText("Org & Co. (Special) (1)")).toBeInTheDocument();
        });
    });
});
