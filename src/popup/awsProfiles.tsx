/**
 * AWS Profiles Popup - Main Component
 * Orchestrates all hooks and components for the popup interface
 * Refactored to use custom hooks and extracted components
 */

// React
import React, { FunctionComponent, useEffect, useState, useMemo, useCallback } from "react";

// External libraries
import browser from "webextension-polyfill";

// Cloudscape components
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";

// Internal - hooks
import {
    useProfiles,
    useFavorites,
    useRecentProfiles,
    useRegion,
    useTheme,
    useEnabledRegions,
} from "@/hooks";

// Internal - components
import {
    ProfileList,
    ProfileSearch,
    OrganizationTabs,
    LoadingState,
    ErrorState,
    ThemeSelector,
} from "@/components";

// Internal - services
import * as apiClient from "@/services/apiClient";

// Internal - utils
import { prepareContainer, clearAllContainers } from "@/utils/containerManager";

// Types
import { AWSProfile } from "./types";

// Constants
import { POPUP_WIDTH_THRESHOLD, SEARCH_DEBOUNCE_MS } from "./constants";

/**
 * Main AWS Profiles Popup Component
 */
export const AWSProfilesPopup: FunctionComponent = () => {
    // Custom hooks for state management
    const {
        profiles,
        loading: profilesLoading,
        error: profilesError,
        apiAvailable,
        loadProfiles,
        refreshProfiles,
        enrichSSOProfiles,
    } = useProfiles();

    const { favorites, toggleFavorite } = useFavorites();
    const { addRecentProfile } = useRecentProfiles();
    const { selectedRegion, setRegion } = useRegion();
    const { mode: themeMode, setMode: setThemeMode } = useTheme();
    const { regions: enabledRegions } = useEnabledRegions();

    // Local UI state
    const [searchFilter, setSearchFilter] = useState("");
    const [debouncedSearchFilter, setDebouncedSearchFilter] = useState("");
    const [selectedOrgTab, setSelectedOrgTab] = useState<string>("all");
    const [isRemoving, setIsRemoving] = useState(false);
    const [openProfileError, setOpenProfileError] = useState<string | null>(null);
    const [separateRegions, setSeparateRegions] = useState(false);

    /**
     * Notify background page that popup mounted and cleanup on unmount
     */
    useEffect(() => {
        browser.runtime.sendMessage({ popupMounted: true }).catch((err) => {
            // Ignore errors if background page isn't ready
            if (process.env.NODE_ENV === 'development') {
                console.error('Error sending popupMounted message:', err);
            }
        });
        loadProfiles();

        // Load separate regions setting
        browser.storage.local.get("separateRegionsInContainers").then((result) => {
            setSeparateRegions((result.separateRegionsInContainers as boolean | undefined) || false);
        });

        // Cleanup on unmount
        return () => {
            browser.runtime.sendMessage({ popupUnmounted: true }).catch(() => {});
        };
    }, [loadProfiles]);

    /**
     * Debounce search filter to reduce re-renders during typing
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchFilter(searchFilter);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [searchFilter]);

    /**
     * Memoize organizations grouping
     */
    const organizations = useMemo(() => {
        const orgs = new Map<string, { name: string; profiles: AWSProfile[] }>();

        // Guard against undefined profiles
        if (!profiles || !Array.isArray(profiles)) {
            return orgs;
        }

        // Credentials group (from ~/.aws/credentials)
        const credentialProfiles = profiles.filter((p) => !p.is_sso);
        if (credentialProfiles.length > 0) {
            orgs.set("credentials", {
                name: "Credentials",
                profiles: credentialProfiles,
            });
        }

        // Group SSO profiles by sso_session
        const ssoProfiles = profiles.filter((p: AWSProfile) => p.is_sso);
        const ssoGroups = new Map<string, AWSProfile[]>();

        ssoProfiles.forEach((profile: AWSProfile) => {
            // Use sso_session if available, fallback to sso_start_url for legacy profiles
            const sessionKey = profile.sso_session || profile.sso_start_url || "unknown";
            if (!ssoGroups.has(sessionKey)) {
                ssoGroups.set(sessionKey, []);
            }
            ssoGroups.get(sessionKey)!.push(profile);
        });

        // Create organization entries for each SSO session
        ssoGroups.forEach((profileList, sessionKey) => {
            let orgName = "SSO Organization";

            // If we have an sso_session, use it as the organization name
            const firstProfile = profileList[0];
            if (firstProfile?.sso_session) {
                // Capitalize first letter of sso_session
                orgName = firstProfile.sso_session.charAt(0).toUpperCase() +
                         firstProfile.sso_session.slice(1);
            } else if (firstProfile?.sso_start_url) {
                // Fallback: extract from start_url for legacy profiles
                try {
                    const url = new URL(firstProfile.sso_start_url);
                    const hostname = url.hostname;
                    const match = hostname.match(/^([^.]+)/);
                    if (match) {
                        orgName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
                    }
                } catch {
                    // Keep default name
                }
            }

            orgs.set(sessionKey, {
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

            return selectedOrg.profiles.filter((p: AWSProfile) =>
                p.name.toLowerCase().includes(debouncedSearchFilter.toLowerCase())
            );
        }

        // Otherwise show all profiles with search filter
        const lowerSearch = debouncedSearchFilter.toLowerCase();
        return profiles.filter((p: AWSProfile) => p.name.toLowerCase().includes(lowerSearch));
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

            // Get console URL from API
            const response = await apiClient.getConsoleUrl(profile.name);

            // Add region to the console URL
            let consoleUrl = response.url;
            if (consoleUrl.includes("console.aws.amazon.com")) {
                const urlObj = new URL(consoleUrl);
                urlObj.searchParams.set("region", selectedRegion);
                consoleUrl = urlObj.toString();
            }

            // Create or get the container (with optional region suffix)
            const containerName = separateRegions 
                ? `${response.profileName} [${selectedRegion}]`
                : response.profileName;
            const container = await prepareContainer(
                containerName,
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
        } catch (err) {
            console.error("Failed to open profile:", err);
            if (err instanceof apiClient.ApiClientError) {
                setOpenProfileError(err.message);
            } else {
                setOpenProfileError(`Failed to open profile: ${err}`);
            }
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
            await clearAllContainers();
            setIsRemoving(false);
        } catch (err) {
            console.error("Failed to clear containers:", err);
            setIsRemoving(false);
        }
    }, []);

    // Installation instructions view
    if (!apiAvailable && !profilesLoading) {
        const isAuthError = profilesError?.includes("401") || profilesError?.includes("Unauthorized");
        
        return (
            <Container header={<Header variant="h2">Setup Required</Header>} variant="default">
                <SpaceBetween size="l">
                    <Alert type="warning" header={isAuthError ? "Authentication Required" : "API Server Not Running"}>
                        {isAuthError 
                            ? "Invalid or missing API token. Please configure your token in settings."
                            : "The AWS Profile Bridge API server is required to read AWS credentials from your system."
                        }
                    </Alert>

                    <Box variant="p">
                        <strong>Installation Steps:</strong>
                    </Box>

                    <Box>
                        <ol>
                            <li>Open a terminal in the extension directory</li>
                            <li>Run the API service installation script:</li>
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
                                ./scripts/install-api-service.sh
                            </pre>
                        </Box>
                        <Box variant="small" color="text-body-secondary">
                            This will install and start the API server as a system service.
                        </Box>
                    </Box>

                    <Box variant="p">
                        After installation, click Retry Connection below.
                    </Box>

                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="primary" onClick={() => loadProfiles(true)}>
                            Retry Connection
                        </Button>
                        <Button 
                            iconName="settings"
                            onClick={() => browser.runtime.openOptionsPage()}
                        >
                            Open Settings
                        </Button>
                    </SpaceBetween>

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
        <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px" }}>
            <SpaceBetween size="m">
                <Header
                    variant="h2"
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button 
                                variant="icon" 
                                iconName="settings"
                                onClick={() => browser.runtime.openOptionsPage()}
                            />
                            <ThemeSelector
                                mode={themeMode}
                                onModeChange={setThemeMode}
                            />
                        </SpaceBetween>
                    }
                >
                    AWS Profile Containers ({__BUILD_TIMESTAMP__})
                </Header>
                <Button
                    variant="primary"
                    onClick={() => refreshProfiles()}
                    iconName="refresh"
                    fullWidth
                    loading={profilesLoading}
                    disabled={profilesLoading}
                >
                    {profilesLoading ? `Loading... (${profiles.length} loaded)` : `Refresh Profiles (${profiles.length})`}
                </Button>

                {profilesLoading && profiles.length === 0 ? (
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
                            regions={[...enabledRegions]}
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

                        {selectedOrgTab !== "all" && selectedOrgTab !== "credentials" && (
                            <Button
                                variant="normal"
                                onClick={() => enrichSSOProfiles()}
                                fullWidth
                            >
                                Load Entitlements
                            </Button>
                        )}
                    </>
                )}
            </SpaceBetween>

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
