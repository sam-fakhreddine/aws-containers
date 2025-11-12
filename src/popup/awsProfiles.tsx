/**
 * AWS Profiles Popup - Main Component
 * Orchestrates all hooks and components for the popup interface
 * Refactored to use custom hooks and extracted components
 */

import React, { FunctionComponent, useEffect, useState, useMemo, useCallback } from "react";
import browser from "webextension-polyfill";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Alert from "@cloudscape-design/components/alert";
import Modal from "@cloudscape-design/components/modal";
import Link from "@cloudscape-design/components/link";
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
        enrichSSOProfiles,
    } = useProfiles();

    const { favorites, toggleFavorite } = useFavorites();
    const { containers, clearContainers } = useContainers();
    const { recentProfiles, addRecentProfile } = useRecentProfiles();
    const { selectedRegion, setRegion } = useRegion();

    // Local UI state
    const [searchFilter, setSearchFilter] = useState("");
    const [debouncedSearchFilter, setDebouncedSearchFilter] = useState("");
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
     * Debounce search filter to reduce re-renders during typing
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchFilter(searchFilter);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchFilter]);

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
     * Uses debounced search filter to reduce re-renders during typing
     */
    const filteredProfiles = useMemo(() => {
        // If a specific org is selected, filter to only that org
        if (selectedOrgTab !== "all") {
            const selectedOrg = organizations.get(selectedOrgTab);
            if (!selectedOrg) return [];

            return selectedOrg.profiles.filter((p) =>
                p.name.toLowerCase().includes(debouncedSearchFilter.toLowerCase())
            );
        }

        // Otherwise show all profiles with search filter
        const lowerSearch = debouncedSearchFilter.toLowerCase();
        return profiles.filter((p) => p.name.toLowerCase().includes(lowerSearch));
    }, [profiles, organizations, selectedOrgTab, debouncedSearchFilter]);

    /**
     * Open a profile in a container
     * Memoized to prevent child component re-renders
     */
    const handleOpenProfile = useCallback(async (profile: AWSProfile) => {
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
    }, [addRecentProfile, selectedRegion]);

    /**
     * Handle favorite toggle
     * Memoized to prevent child component re-renders
     */
    const handleFavoriteToggle = useCallback(async (profileName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleFavorite(profileName);
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
        }
    }, [toggleFavorite]);

    /**
     * Handle container clearing
     * Memoized for performance
     */
    const handleClearContainers = useCallback(async () => {
        try {
            await clearContainers();
            setIsRemoving(false);
        } catch (err) {
            console.error("Failed to clear containers:", err);
            setIsRemoving(false);
        }
    }, [clearContainers]);

    // Installation instructions view
    if (!nativeMessagingAvailable && !profilesLoading) {
        return (
            <Container header={<Header variant="h2">Setup Required</Header>} variant="default">
                <SpaceBetween size="l">
                    <Alert type="warning" header="AWS Profile Bridge Not Found">
                        The native messaging host is required to read AWS credentials from
                        your system.
                    </Alert>

                    <Box variant="p">
                        <strong>Installation Steps:</strong>
                    </Box>

                    <Box>
                        <ol>
                            <li>Open a terminal in the extension directory</li>
                            <li>Run the installation script:</li>
                        </ol>
                        <Box
                            margin={{ top: "s", bottom: "s" }}
                            padding="s"
                            fontSize="body-s"
                        >
                            <pre
                                style={{
                                    background: "#232f3e",
                                    color: "#00ff00",
                                    padding: "12px",
                                    borderRadius: "4px",
                                    overflow: "auto",
                                    fontFamily: "monospace",
                                }}
                            >
                                ./install.sh
                            </pre>
                        </Box>
                        <Box variant="small" color="text-body-secondary">
                            This will install the native messaging bridge and set up
                            permissions.
                        </Box>
                    </Box>

                    <Box variant="p">
                        After installation, restart Firefox and click Retry Connection below.
                    </Box>

                    <Button variant="primary" onClick={() => loadProfiles(true)}>
                        Retry Connection
                    </Button>

                    <Box variant="small" color="text-body-secondary">
                        Need help? Check the{" "}
                        <Link
                            href="https://github.com/sam-fakhreddine/aws-containers"
                            external
                        >
                            documentation
                        </Link>
                    </Box>
                </SpaceBetween>
            </Container>
        );
    }


    // Main view
    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Container
                header={<Header variant="h2">AWS Profile Containers</Header>}
                variant="default"
            >
                {profilesLoading ? (
                    <LoadingState />
                ) : profilesError || openProfileError ? (
                    <ErrorState
                        error={profilesError || openProfileError || ""}
                        onRetry={() => refreshProfiles()}
                    />
                ) : (
                    <SpaceBetween size="m">
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

                        <div
                            style={{
                                flex: "1",
                                overflowY: "auto",
                                minHeight: "200px",
                                maxHeight: "calc(100vh - 250px)",
                            }}
                        >
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

                        <SpaceBetween size="s">
                            {selectedOrgTab !== "all" && selectedOrgTab !== "credentials" && (
                                <Box padding={{ top: "s" }}>
                                    <Button
                                        variant="normal"
                                        onClick={() => {
                                            const selectedOrg = organizations.get(selectedOrgTab);
                                            if (selectedOrg) {
                                                const ssoProfileNames = selectedOrg.profiles.map(p => p.name);
                                                enrichSSOProfiles(ssoProfileNames);
                                            }
                                        }}
                                        fullWidth
                                    >
                                        Load Entitlements
                                    </Button>
                                </Box>
                            )}
                            <Box padding={{ top: "s" }}>
                                <Button
                                    variant="primary"
                                    onClick={() => refreshProfiles()}
                                    fullWidth
                                >
                                    Refresh Profiles
                                </Button>
                            </Box>
                        </SpaceBetween>
                    </SpaceBetween>
                )}
            </Container>

            <Modal
                visible={isRemoving}
                onDismiss={() => setIsRemoving(false)}
                header="Clear Containers"
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={() => setIsRemoving(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleClearContainers}>
                                Confirm
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
            >
                Are you sure you want to clear all AWS containers?
            </Modal>
        </div>
    );
};
