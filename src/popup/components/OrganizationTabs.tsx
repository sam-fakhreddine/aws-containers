/**
 * OrganizationTabs Component
 * Displays tabs for filtering profiles by organization (SSO groups)
 */

import React, { FunctionComponent } from "react";
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
 */
export const OrganizationTabs: FunctionComponent<OrganizationTabsProps> = ({
    organizations,
    selectedTab,
    onTabChange,
    totalProfiles,
}) => {
    // Don't show tabs if there's only one organization or less
    if (organizations.size <= 1) {
        return null;
    }

    return (
        <div className="org-tabs-container">
            <button
                className={`org-tab ${selectedTab === "all" ? "org-tab-active" : ""}`}
                onClick={() => onTabChange("all")}
            >
                All ({totalProfiles})
            </button>
            {Array.from(organizations.entries()).map(([key, org]) => (
                <button
                    key={key}
                    className={`org-tab ${selectedTab === key ? "org-tab-active" : ""}`}
                    onClick={() => onTabChange(key)}
                >
                    {org.name} ({org.profiles.length})
                </button>
            ))}
        </div>
    );
};
