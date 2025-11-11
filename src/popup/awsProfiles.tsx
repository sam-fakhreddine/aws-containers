/**
 * AWS Profiles Popup - Main Component
 * Orchestrates all hooks and components for the popup interface
 * Refactored to use custom hooks and extracted components
 */

import React, { FunctionComponent, useEffect, useState, useMemo } from "react";
import browser from "webextension-polyfill";
import { POPUP_WIDTH_THRESHOLD, NATIVE_MESSAGING_HOST_NAME } from "./constants";
import { AWSProfile, isConsoleUrlResponse, isErrorResponse } from "./types";
import { prepareContainer } from "../utils/containerManager";

// Custom hooks
import {
    useProfiles,
    useFavorites,
    useContainers,
    useRecentProfiles,
    useRegion,
} from "./hooks";

// UI Components
import {
    ProfileList,
    ProfileSearch,
    OrganizationTabs,
    LoadingState,
    ErrorState,
} from "./components";

/**
 * Complete list of AWS commercial regions
 */
const AWS_REGIONS = [
    // US Regions
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "us-east-2", name: "US East (Ohio)" },
    { code: "us-west-1", name: "US West (N. California)" },
    { code: "us-west-2", name: "US West (Oregon)" },
    // Canada
    { code: "ca-central-1", name: "Canada (Central)" },
    { code: "ca-west-1", name: "Canada (Calgary)" },
    // South America
    { code: "sa-east-1", name: "South America (São Paulo)" },
    // Europe
    { code: "eu-central-1", name: "Europe (Frankfurt)" },
    { code: "eu-central-2", name: "Europe (Zurich)" },
    { code: "eu-west-1", name: "Europe (Ireland)" },
    { code: "eu-west-2", name: "Europe (London)" },
    { code: "eu-west-3", name: "Europe (Paris)" },
    { code: "eu-south-1", name: "Europe (Milan)" },
    { code: "eu-south-2", name: "Europe (Spain)" },
    { code: "eu-north-1", name: "Europe (Stockholm)" },
    // Asia Pacific
    { code: "ap-east-1", name: "Asia Pacific (Hong Kong)" },
    { code: "ap-south-1", name: "Asia Pacific (Mumbai)" },
    { code: "ap-south-2", name: "Asia Pacific (Hyderabad)" },
    { code: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
    { code: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
    { code: "ap-southeast-3", name: "Asia Pacific (Jakarta)" },
    { code: "ap-southeast-4", name: "Asia Pacific (Melbourne)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
    { code: "ap-northeast-2", name: "Asia Pacific (Seoul)" },
    { code: "ap-northeast-3", name: "Asia Pacific (Osaka)" },
    // Middle East
    { code: "me-south-1", name: "Middle East (Bahrain)" },
    { code: "me-central-1", name: "Middle East (UAE)" },
    // Africa
    { code: "af-south-1", name: "Africa (Cape Town)" },
    // Israel
    { code: "il-central-1", name: "Israel (Tel Aviv)" },
];

/**
 * Main AWS Profiles Popup Component
 */
export const AWSProfilesPopup: FunctionComponent = () => {
    // Custom hooks for state management
    const {
        profiles,
        loading: profilesLoading,
        error: profilesError,
        nativeMessagingAvailable,
        loadProfiles,
        refreshProfiles,
    } = useProfiles();

    const { favorites, toggleFavorite } = useFavorites();
    const { containers, clearContainers } = useContainers();
    const { recentProfiles, addRecentProfile } = useRecentProfiles();
    const { selectedRegion, setRegion } = useRegion();

    // Local UI state
    const [searchFilter, setSearchFilter] = useState("");
    const [selectedOrgTab, setSelectedOrgTab] = useState<string>("all");
    const [isRemoving, setIsRemoving] = useState(false);
    const [openProfileError, setOpenProfileError] = useState<string | null>(null);

    /**
     * Notify background page that popup mounted
     */
    useEffect(() => {
        browser.runtime.sendMessage({ popupMounted: true });
        loadProfiles();
    }, [loadProfiles]);

    /**
     * Memoize organizations grouping
     */
    const organizations = useMemo(() => {
        const orgs = new Map<string, { name: string; profiles: AWSProfile[] }>();

        // Credential accounts group
        const credentialProfiles = profiles.filter((p) => !p.is_sso);
        if (credentialProfiles.length > 0) {
            orgs.set("credentials", {
                name: "Credential Accounts",
                profiles: credentialProfiles,
            });
        }

        // Group SSO profiles by start URL
        const ssoProfiles = profiles.filter((p) => p.is_sso);
        const ssoGroups = new Map<string, AWSProfile[]>();

        ssoProfiles.forEach((profile) => {
            const startUrl = profile.sso_start_url || "unknown";
            if (!ssoGroups.has(startUrl)) {
                ssoGroups.set(startUrl, []);
            }
            ssoGroups.get(startUrl)!.push(profile);
        });

        // Create organization entries for each SSO group
        ssoGroups.forEach((profileList, startUrl) => {
            let orgName = "SSO Organization";
            try {
                const url = new URL(startUrl);
                const hostname = url.hostname;
                const match = hostname.match(/^([^.]+)/);
                if (match) {
                    orgName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
                }
            } catch (e) {
                // Keep default name
            }

            orgs.set(startUrl, {
                name: orgName,
                profiles: profileList,
            });
        });

        return orgs;
    }, [profiles]);

    /**
     * Memoize filtered profiles
     */
    const filteredProfiles = useMemo(() => {
        // If a specific org is selected, filter to only that org
        if (selectedOrgTab !== "all") {
            const selectedOrg = organizations.get(selectedOrgTab);
            if (!selectedOrg) return [];

            return selectedOrg.profiles.filter((p) =>
                p.name.toLowerCase().includes(searchFilter.toLowerCase())
            );
        }

        // Otherwise show all profiles with search filter
        const lowerSearch = searchFilter.toLowerCase();
        return profiles.filter((p) => p.name.toLowerCase().includes(lowerSearch));
    }, [profiles, organizations, selectedOrgTab, searchFilter]);

    /**
     * Open a profile in a container
     */
    const handleOpenProfile = async (profile: AWSProfile) => {
        try {
            setOpenProfileError(null);

            // Track in recent profiles
            await addRecentProfile(profile.name);

            // Connect to native messaging host
            const port = browser.runtime.connectNative(NATIVE_MESSAGING_HOST_NAME);

            port.onMessage.addListener(async (response: unknown) => {
                try {
                    if (isConsoleUrlResponse(response)) {
                        // Add region to the console URL
                        let consoleUrl = response.url;
                        if (consoleUrl.includes("console.aws.amazon.com")) {
                            const urlObj = new URL(consoleUrl);
                            urlObj.searchParams.set("region", selectedRegion);
                            consoleUrl = urlObj.toString();
                        }

                        // Create or get the container
                        const container = await prepareContainer(
                            response.profileName,
                            response.color,
                            response.icon
                        );

                        // Open tab in the container
                        await browser.tabs.create({
                            url: consoleUrl,
                            cookieStoreId: container.cookieStoreId,
                        });

                        // Close popup if in popup mode (not sidebar)
                        if (window.innerWidth < POPUP_WIDTH_THRESHOLD) {
                            window.close();
                        }
                    } else if (isErrorResponse(response)) {
                        setOpenProfileError(response.message);
                    } else {
                        setOpenProfileError("Received invalid response");
                    }
                } catch (err) {
                    console.error("Error handling open profile response:", err);
                    setOpenProfileError(`Failed to open profile: ${err}`);
                }
            });

            port.postMessage({
                action: "openProfile",
                profileName: profile.name,
            });
        } catch (err) {
            console.error("Failed to open profile:", err);
            setOpenProfileError(`Failed to open profile: ${err}`);
        }
    };

    /**
     * Handle favorite toggle
     */
    const handleFavoriteToggle = async (profileName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleFavorite(profileName);
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
        }
    };

    /**
     * Handle container clearing
     */
    const handleClearContainers = async () => {
        try {
            await clearContainers();
            setIsRemoving(false);
        } catch (err) {
            console.error("Failed to clear containers:", err);
            setIsRemoving(false);
        }
    };

    // Installation instructions view
    if (!nativeMessagingAvailable && !profilesLoading) {
        return (
            <div className="panel menu-panel container-panel" id="container-panel">
                <h3 className="title">⚠️ Setup Required</h3>
                <hr />
                <div className="panel-content">
                    <p style={{ padding: "10px", fontSize: "14px", fontWeight: "600", color: "#d70022" }}>
                        AWS Profile Bridge Not Found
                    </p>
                    <p style={{ padding: "10px", fontSize: "12px", lineHeight: "1.6" }}>
                        The native messaging host is required to read AWS credentials from your system.
                    </p>
                    <div style={{ background: "#f0f0f0", padding: "12px", margin: "10px", borderRadius: "4px" }}>
                        <p style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px" }}>
                            📋 Installation Steps:
                        </p>
                        <ol style={{ fontSize: "11px", paddingLeft: "20px", lineHeight: "1.8" }}>
                            <li>Open a terminal in the extension directory</li>
                            <li>Run the installation script:</li>
                        </ol>
                        <pre
                            style={{
                                padding: "10px",
                                background: "#2a2a2a",
                                color: "#00ff00",
                                fontSize: "11px",
                                overflowX: "auto",
                                margin: "10px 0",
                                borderRadius: "4px",
                                fontFamily: "monospace",
                            }}
                        >
                            ./install.sh
                        </pre>
                        <p style={{ fontSize: "10px", color: "#666", fontStyle: "italic" }}>
                            This will install the native messaging bridge and set up permissions.
                        </p>
                    </div>
                    <p style={{ padding: "10px", fontSize: "11px", color: "#666" }}>
                        After installation, restart Firefox and click Retry Connection below.
                    </p>
                    <button
                        onClick={() => loadProfiles(true)}
                        style={{
                            margin: "10px",
                            padding: "10px 20px",
                            fontSize: "13px",
                            background: "#0060df",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "600"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#003eaa"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#0060df"}
                    >
                        🔄 Retry Connection
                    </button>
                    <p style={{ padding: "10px", fontSize: "10px", color: "#999" }}>
                        Need help? Check the{" "}
                        <a
                            href="https://github.com/sam-fakhreddine/aws-containers"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0060df" }}
                        >
                            documentation
                        </a>
                    </p>
                </div>
            </div>
        );
    }

    // Delete confirmation view
    if (isRemoving) {
        return (
            <div className="panel delete-container-panel" id="delete-container-panel">
                <h3 className="title">Clear Containers</h3>
                <button
                    className="btn-return arrow-left controller"
                    onClick={() => setIsRemoving(false)}
                />
                <hr />
                <div className="panel-content delete-container-confirm">
                    <p className="delete-warning">
                        Are you sure you want to clear all AWS containers?
                    </p>
                </div>
                <div className="panel-footer">
                    <a
                        href="#"
                        className="button expanded secondary footer-button cancel-button"
                        onClick={() => setIsRemoving(false)}
                    >
                        Back
                    </a>
                    <a
                        href="#"
                        className="button expanded primary footer-button"
                        onClick={handleClearContainers}
                    >
                        Confirm
                    </a>
                </div>
            </div>
        );
    }

    // Main view
    return (
        <div className="panel menu-panel container-panel" id="container-panel">
            <h3 className="title" style={{ fontSize: "18px", padding: "12px" }}>
                AWS Profile Containers
            </h3>
            <hr />

            {profilesLoading ? (
                <LoadingState />
            ) : profilesError || openProfileError ? (
                <ErrorState
                    error={profilesError || openProfileError || ""}
                    onRetry={() => refreshProfiles()}
                />
            ) : (
                <>
                    <ProfileSearch
                        searchFilter={searchFilter}
                        onSearchChange={setSearchFilter}
                        selectedRegion={selectedRegion}
                        onRegionChange={setRegion}
                        regions={AWS_REGIONS}
                    />

                    <OrganizationTabs
                        organizations={organizations}
                        selectedTab={selectedOrgTab}
                        onTabChange={setSelectedOrgTab}
                        totalProfiles={profiles.length}
                    />

                    <div className="scrollable identities-list">
                        <ProfileList
                            profiles={filteredProfiles}
                            favorites={favorites}
                            onProfileClick={handleOpenProfile}
                            onFavoriteToggle={handleFavoriteToggle}
                            emptyMessage={
                                profiles.length === 0
                                    ? "No AWS profiles found in ~/.aws/credentials or ~/.aws/config"
                                    : "No profiles match your search"
                            }
                        />
                    </div>

                    <div className="v-padding-hack-footer" />
                    <div style={{ display: "flex", gap: "8px", padding: "8px" }}>
                        <div
                            className="bottom-btn keyboard-nav controller"
                            tabIndex={0}
                            onClick={() => refreshProfiles()}
                            style={{
                                flex: 1,
                                textAlign: "center",
                                fontSize: "16px",
                                padding: "12px",
                                fontWeight: "600",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "white",
                                borderRadius: "6px",
                                boxShadow: "0 4px 8px rgba(102,126,234,0.3)",
                                transition: "all 0.3s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow =
                                    "0 6px 12px rgba(102,126,234,0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                    "0 4px 8px rgba(102,126,234,0.3)";
                            }}
                        >
                            Refresh
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
