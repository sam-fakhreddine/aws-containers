/**
 * OrganizationTabs Component
 * Displays tabs for filtering profiles by organization (SSO groups)
 * Memoized for performance
 */

import React, { FunctionComponent, memo, useMemo } from "react";
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
    const tabs = useMemo(() => [
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
    ], [organizations, totalProfiles]);

    return (
        <Tabs
            tabs={tabs}
            activeTabId={selectedTab}
            onChange={(event) => onTabChange(event.detail.activeTabId)}
            variant="container"
        />
    );
};

/**
 * Memoized OrganizationTabs component
 */
export const OrganizationTabs = memo(OrganizationTabsComponent);
