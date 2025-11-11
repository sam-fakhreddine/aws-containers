import React, { FunctionComponent, useEffect, useState, useMemo } from "react";
import browser, { type ContextualIdentities } from "webextension-polyfill";
import {
    CACHE_DURATION_MS,
    MAX_RECENT_PROFILES,
    POPUP_WIDTH_THRESHOLD,
    MILLISECONDS_PER_MINUTE,
    MINUTES_PER_HOUR,
    MINUTES_PER_DAY,
    NATIVE_MESSAGING_HOST_NAME,
    STORAGE_KEYS,
} from "./constants";
import {
    AWSProfile,
    StorageData,
    NativeMessagingResponse,
    isProfileListResponse,
    isConsoleUrlResponse,
    isErrorResponse,
    isStringArray,
    isAWSProfileArray,
} from "./types";

// Container management utilities
export async function lookupContainer(name: string) {
    const containers = await browser.contextualIdentities.query({ name });
    return containers.length >= 1 ? containers[0] : null;
}

export async function prepareContainer(name: string, color: string, icon: string) {
    const container = await lookupContainer(name);
    if (!container) {
        const created = await browser.contextualIdentities.create({
            name,
            color,
            icon,
        });
        await saveContainerId(created.cookieStoreId);
        return created;
    } else {
        // Update the existing container if the color or icon have changed
        await browser.contextualIdentities.update(container.cookieStoreId, {
            color,
            icon,
        });
        return container;
    }
}

export async function saveContainerId(id: string) {
    const obj = await browser.storage.local.get(STORAGE_KEYS.CONTAINERS);
    const exists = STORAGE_KEYS.CONTAINERS in obj;
    if (exists) {
        const containers = (obj.containers as string[]) || [];
        await browser.storage.local.set({
            [STORAGE_KEYS.CONTAINERS]: [...containers, id],
        });
    } else {
        await browser.storage.local.set({ [STORAGE_KEYS.CONTAINERS]: [id] });
    }
}

const AWS_REGIONS = [
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "us-east-2", name: "US East (Ohio)" },
    { code: "us-west-1", name: "US West (N. California)" },
    { code: "us-west-2", name: "US West (Oregon)" },
    { code: "eu-west-1", name: "EU (Ireland)" },
    { code: "eu-west-2", name: "EU (London)" },
    { code: "eu-central-1", name: "EU (Frankfurt)" },
    { code: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
    { code: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
];

export const AWSProfilesPopup: FunctionComponent = () => {
    const [profiles, setProfiles] = useState<AWSProfile[]>([]);
    const [containers, setContainers] = useState<ContextualIdentities.ContextualIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<"profiles" | "containers">("profiles");
    const [isRemoving, setIsRemoving] = useState(false);
    const [nativeMessagingAvailable, setNativeMessagingAvailable] = useState(false);
    const [searchFilter, setSearchFilter] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("us-east-1");
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recentProfiles, setRecentProfiles] = useState<string[]>([]);
    const [selectedOrgTab, setSelectedOrgTab] = useState<string>("all");

    useEffect(() => {
        browser.runtime.sendMessage({ popupMounted: true });
        loadSettings();
        loadProfiles();
        refreshContainers();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await browser.storage.local.get([
                STORAGE_KEYS.FAVORITES,
                STORAGE_KEYS.RECENT_PROFILES,
                STORAGE_KEYS.SELECTED_REGION,
                STORAGE_KEYS.CACHED_PROFILES,
                STORAGE_KEYS.PROFILES_CACHE_TIME,
            ]);

            // Validate and load favorites with type guard
            if (data.favorites && isStringArray(data.favorites)) {
                setFavorites(data.favorites);
            }

            // Validate and load recent profiles with type guard
            if (data.recentProfiles && isStringArray(data.recentProfiles)) {
                setRecentProfiles(data.recentProfiles);
            }

            // Validate and load selected region
            if (data.selectedRegion && typeof data.selectedRegion === 'string') {
                setSelectedRegion(data.selectedRegion);
            }

            // Load cached profiles if available, recent, and valid
            if (data.cachedProfiles && data.profilesCacheTime) {
                if (typeof data.profilesCacheTime === 'number' && isAWSProfileArray(data.cachedProfiles)) {
                    const cacheAge = Date.now() - data.profilesCacheTime;
                    if (cacheAge < CACHE_DURATION_MS) {
                        setProfiles(data.cachedProfiles);
                        setLoading(false);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load settings from storage:", err);
            // Continue with default settings if storage fails
        }
    };

    const loadProfiles = async (forceRefresh: boolean = false) => {
        // If not forcing refresh and we have profiles, don't reload
        if (!forceRefresh && profiles.length > 0) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Try to connect to native messaging host
            const port = browser.runtime.connectNative(NATIVE_MESSAGING_HOST_NAME);
            setNativeMessagingAvailable(true);

            // Set up message listener with proper types
            port.onMessage.addListener(async (response: unknown) => {
                try {
                    if (isProfileListResponse(response)) {
                        // Sort profiles alphabetically by name
                        const sortedProfiles = response.profiles.sort((a: AWSProfile, b: AWSProfile) =>
                            a.name.localeCompare(b.name)
                        );
                        setProfiles(sortedProfiles);
                        setLoading(false);

                        // Cache the profiles with timestamp
                        await browser.storage.local.set({
                            [STORAGE_KEYS.CACHED_PROFILES]: sortedProfiles,
                            [STORAGE_KEYS.PROFILES_CACHE_TIME]: Date.now()
                        });
                    } else if (isErrorResponse(response)) {
                        setError(response.message);
                        setLoading(false);
                    } else {
                        setError("Received invalid response from native messaging host");
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("Error handling profile list response:", err);
                    setError("Failed to process profile list");
                    setLoading(false);
                }
            });

            // Set up disconnect listener
            port.onDisconnect.addListener(() => {
                if (browser.runtime.lastError) {
                    setError(`Native messaging error: ${browser.runtime.lastError.message}`);
                    setNativeMessagingAvailable(false);
                }
                setLoading(false);
            });

            // Request profile list
            port.postMessage({ action: "getProfiles" });
        } catch (err) {
            setError(`Failed to connect to native messaging host: ${err}`);
            setNativeMessagingAvailable(false);
            setLoading(false);
        }
    };

    const refreshContainers = async () => {
        try {
            const [identities, storageData] = await Promise.all([
                browser.contextualIdentities.query({}),
                browser.storage.local.get(STORAGE_KEYS.CONTAINERS),
            ]);

            // Validate containerIds with type guard
            let containerIds: string[] = [];
            if (STORAGE_KEYS.CONTAINERS in storageData && isStringArray(storageData.containers)) {
                containerIds = storageData.containers;
            }

            setContainers(
                identities.filter((i) => containerIds.includes(i.cookieStoreId))
            );
        } catch (err) {
            console.error("Failed to refresh containers:", err);
            // Continue with empty containers list on error
            setContainers([]);
        }
    };

    const openProfile = async (profile: AWSProfile) => {
        try {
            // Track in recent profiles
            const updatedRecent = [
                profile.name,
                ...recentProfiles.filter(p => p !== profile.name)
            ].slice(0, MAX_RECENT_PROFILES);
            setRecentProfiles(updatedRecent);
            await browser.storage.local.set({ [STORAGE_KEYS.RECENT_PROFILES]: updatedRecent });

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

                        // Create or get the container using native Firefox API
                        const container = await prepareContainer(
                            response.profileName,
                            response.color,
                            response.icon
                        );

                        // Open tab directly in the container
                        await browser.tabs.create({
                            url: consoleUrl,
                            cookieStoreId: container.cookieStoreId,
                        });

                        // Close popup only if in popup mode, not sidebar
                        // Sidebar detection: popup windows are typically smaller
                        if (window.innerWidth < POPUP_WIDTH_THRESHOLD) {
                            window.close();
                        }
                    } else if (isErrorResponse(response)) {
                        setError(response.message);
                    } else {
                        setError("Received invalid response from native messaging host");
                    }
                } catch (err) {
                    console.error("Error handling open profile response:", err);
                    setError(`Failed to open profile: ${err}`);
                }
            });

            port.postMessage({
                action: "openProfile",
                profileName: profile.name,
            });
        } catch (err) {
            setError(`Failed to open profile: ${err}`);
        }
    };

    const toggleFavorite = async (profileName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const updatedFavorites = favorites.includes(profileName)
                ? favorites.filter(f => f !== profileName)
                : [...favorites, profileName];
            setFavorites(updatedFavorites);
            await browser.storage.local.set({ [STORAGE_KEYS.FAVORITES]: updatedFavorites });
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
            // Revert state change on error
            setFavorites([...favorites]);
        }
    };

    const handleRegionChange = async (region: string) => {
        try {
            setSelectedRegion(region);
            await browser.storage.local.set({ [STORAGE_KEYS.SELECTED_REGION]: region });
        } catch (err) {
            console.error("Failed to save region selection:", err);
            // State already updated, no need to revert
        }
    };

    // Memoize organizations to avoid recalculating on every render
    const organizations = useMemo(() => {
        const orgs = new Map<string, { name: string, profiles: AWSProfile[] }>();

        // Credential accounts group
        // No need to sort - profiles array is already sorted alphabetically
        const credentialProfiles = profiles.filter(p => !p.is_sso);
        if (credentialProfiles.length > 0) {
            orgs.set("credentials", {
                name: "Credential Accounts",
                profiles: credentialProfiles
            });
        }

        // Group SSO profiles by start URL
        const ssoProfiles = profiles.filter(p => p.is_sso);
        const ssoGroups = new Map<string, AWSProfile[]>();

        ssoProfiles.forEach(profile => {
            const startUrl = profile.sso_start_url || "unknown";
            if (!ssoGroups.has(startUrl)) {
                ssoGroups.set(startUrl, []);
            }
            ssoGroups.get(startUrl)!.push(profile);
        });

        // Create organization entries for each SSO group
        // No need to sort - profiles maintain their sorted order from the filter
        ssoGroups.forEach((profileList, startUrl) => {
            // Extract org name from URL (e.g., "my-org" from "https://my-org.awsapps.com/start")
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
                profiles: profileList
            });
        });

        return orgs;
    }, [profiles]);

    // Memoize filtered profiles to avoid recalculating on every render
    const filteredProfiles = useMemo(() => {
        // If a specific org is selected, filter to only that org
        if (selectedOrgTab !== "all") {
            const selectedOrg = organizations.get(selectedOrgTab);
            if (!selectedOrg) return [];

            return selectedOrg.profiles.filter(p =>
                p.name.toLowerCase().includes(searchFilter.toLowerCase())
            );
        }

        // Otherwise show all profiles with search filter
        // No need to sort again - profiles are already sorted in organizations
        const lowerSearch = searchFilter.toLowerCase();
        return profiles.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }, [profiles, organizations, selectedOrgTab, searchFilter]);

    const clearContainers = async () => {
        await Promise.all(
            containers.map((container) =>
                browser.contextualIdentities.remove(container.cookieStoreId)
            )
        );
        await refreshContainers();
        setIsRemoving(false);
    };

    const formatExpiration = (expiration: string | null, expired: boolean) => {
        if (!expiration) return "";

        if (expired) {
            return "⚠️ Expired";
        }

        const expDate = new Date(expiration);
        const now = new Date();
        const diffMinutes = Math.floor((expDate.getTime() - now.getTime()) / MILLISECONDS_PER_MINUTE);

        if (diffMinutes < MINUTES_PER_HOUR) {
            return `⏰ ${diffMinutes}m`;
        } else if (diffMinutes < MINUTES_PER_DAY) {
            const hours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
            return `⏰ ${hours}h`;
        } else {
            return `✓ Valid`;
        }
    };

    // Installation instructions view
    if (!nativeMessagingAvailable && !loading) {
        return (
            <div className="panel menu-panel container-panel" id="container-panel">
                <h3 className="title">Setup Required</h3>
                <hr />
                <div className="panel-content">
                    <p style={{ padding: "10px", fontSize: "12px" }}>
                        Native messaging host not configured.
                    </p>
                    <p style={{ padding: "10px", fontSize: "11px", color: "#666" }}>
                        Run the installation script to set up the native messaging bridge:
                    </p>
                    <pre style={{
                        padding: "8px",
                        background: "#f5f5f5",
                        fontSize: "10px",
                        overflowX: "auto",
                        margin: "10px"
                    }}>
                        ./install.sh
                    </pre>
                    <button
                        onClick={() => loadProfiles(true)}
                        style={{ margin: "10px", padding: "8px 16px" }}
                    >
                        Retry Connection
                    </button>
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
                ></button>
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
                        onClick={clearContainers}
                    >
                        Confirm
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="panel menu-panel container-panel" id="container-panel">
            <h3 className="title" style={{ fontSize: "18px", padding: "12px" }}>AWS Profile Containers</h3>
            <hr />

            {loading ? (
                <div style={{ padding: "30px", textAlign: "center", fontSize: "16px" }}>
                    Loading profiles...
                </div>
            ) : error ? (
                <div style={{ padding: "16px", color: "red", fontSize: "15px" }}>
                    {error}
                    <button onClick={() => loadProfiles(true)} style={{
                        marginTop: "12px",
                        padding: "12px 18px",
                        fontSize: "16px",
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        boxShadow: "0 4px 8px rgba(240,147,251,0.3)",
                        transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 12px rgba(240,147,251,0.4)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(240,147,251,0.3)";
                    }}>
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    {/* Search and Region Controls */}
                    <div style={{ padding: "8px" }}>
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px 14px",
                                fontSize: "17px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                marginBottom: "8px"
                            }}
                        />
                        <select
                            value={selectedRegion}
                            onChange={(e) => handleRegionChange(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px 14px",
                                fontSize: "17px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                            }}
                        >
                            {AWS_REGIONS.map(region => (
                                <option key={region.code} value={region.code}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Organization Tabs */}
                    {organizations.size > 1 && (
                        <div className="org-tabs-container">
                            <button
                                className={`org-tab ${selectedOrgTab === "all" ? "org-tab-active" : ""}`}
                                onClick={() => setSelectedOrgTab("all")}
                            >
                                All ({profiles.length})
                            </button>
                            {Array.from(organizations.entries()).map(([key, org]) => (
                                <button
                                    key={key}
                                    className={`org-tab ${selectedOrgTab === key ? "org-tab-active" : ""}`}
                                    onClick={() => setSelectedOrgTab(key)}
                                >
                                    {org.name} ({org.profiles.length})
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="scrollable identities-list">
                        <table className="menu" id="identities-list" style={{ width: "100%" }}>
                            {profiles.length === 0 ? (
                                <tr>
                                    <td style={{ padding: "20px", textAlign: "center", fontSize: "15px" }}>
                                        No AWS profiles found in ~/.aws/credentials or ~/.aws/config
                                    </td>
                                </tr>
                            ) : (() => {
                                const renderProfile = (profile: AWSProfile) => (
                                    <tr
                                        key={profile.name}
                                        className="menu-item hover-highlight"
                                        onClick={() => openProfile(profile)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td style={{ padding: "12px 8px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <div className="menu-icon hover-highlight">
                                                    <div
                                                        className="usercontext-icon"
                                                        data-identity-icon={profile.icon}
                                                        data-identity-color={profile.color}
                                                        style={{ width: "24px", height: "24px" }}
                                                    ></div>
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                                        <span style={{ fontSize: "16px", fontWeight: "500" }}>
                                                            {profile.name}
                                                        </span>
                                                        {profile.is_sso && (
                                                            <span style={{
                                                                fontSize: "11px",
                                                                background: "#0060df",
                                                                color: "white",
                                                                padding: "3px 6px",
                                                                borderRadius: "3px",
                                                                fontWeight: "bold"
                                                            }}>
                                                                SSO
                                                            </span>
                                                        )}
                                                    </div>
                                                    {profile.expiration && (
                                                        <span style={{
                                                            fontSize: "13px",
                                                            color: profile.expired ? "#d70022" : "#666"
                                                        }}>
                                                            {formatExpiration(profile.expiration, profile.expired)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    onClick={(e) => toggleFavorite(profile.name, e)}
                                                    style={{
                                                        padding: "6px 10px",
                                                        cursor: "pointer",
                                                        fontSize: "20px"
                                                    }}
                                                >
                                                    {favorites.includes(profile.name) ? "★" : "☆"}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );

                                if (filteredProfiles.length === 0) {
                                    return (
                                        <tr>
                                            <td style={{ padding: "20px", textAlign: "center", fontSize: "15px" }}>
                                                No profiles match your search
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <>
                                        {filteredProfiles.map(renderProfile)}
                                    </>
                                );
                            })()}
                        </table>
                    </div>
                    <div className="v-padding-hack-footer" />
                    <div style={{ display: "flex", gap: "8px", padding: "8px" }}>
                        <div
                            className="bottom-btn keyboard-nav controller"
                            tabIndex={0}
                            onClick={() => loadProfiles(true)}
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
                                transition: "all 0.3s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 6px 12px rgba(102,126,234,0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(102,126,234,0.3)";
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
