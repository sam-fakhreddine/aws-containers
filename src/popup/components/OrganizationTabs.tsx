/**
 * OrganizationTabs Component
 * Displays tabs for filtering profiles by organization (SSO groups)
 * Memoized for performance
 */

import React, { FunctionComponent, memo } from "react";
import Tabs from "@cloudscape-design/components/tabs";
import { AWSProfile } from "../types";

interface Organization {
    name: string;
    profiles: AWSProfile[];
}

interface OrganizationTabsProps {
    organizations: Map<string, Organization>;
    selectedTab: string;
    onTabChange: (tabKey: string) => void;
    totalProfiles: number;
}

/**
 * OrganizationTabs - Tab navigation for profile organizations
 * Memoized to prevent unnecessary re-renders
 */
const OrganizationTabsComponent: FunctionComponent<OrganizationTabsProps> = ({
    organizations,
    selectedTab,
    onTabChange,
    totalProfiles,
}) => {
    // Don't show tabs if there's only one organization or less
    if (organizations.size <= 1) {
        return null;
    }

    const tabs = [
        {
            id: "all",
            label: `All (${totalProfiles})`,
            content: null,
        },
        ...Array.from(organizations.entries()).map(([key, org]) => ({
            id: key,
            label: `${org.name} (${org.profiles.length})`,
            content: null,
        })),
    ];

    return (
        <div style={{ padding: "8px 8px 0 8px" }}>
            <Tabs
                tabs={tabs}
                activeTabId={selectedTab}
                onChange={(event) => onTabChange(event.detail.activeTabId)}
            />
        </div>
    );
};

/**
 * Memoized OrganizationTabs component
 */
export const OrganizationTabs = memo(OrganizationTabsComponent);
