import React, { FunctionComponent, useEffect, useState } from "react";
import { browser, ContextualIdentities } from "webextension-polyfill-ts";

interface AWSProfile {
    name: string;
    has_credentials: boolean;
    expiration: string | null;
    expired: boolean;
    color: string;
    icon: string;
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

    useEffect(() => {
        browser.runtime.sendMessage({ popupMounted: true });
        loadSettings();
        loadProfiles();
        refreshContainers();
    }, []);

    const loadSettings = async () => {
        const data = await browser.storage.local.get(["favorites", "recentProfiles", "selectedRegion"]);
        if (data.favorites) setFavorites(data.favorites);
        if (data.recentProfiles) setRecentProfiles(data.recentProfiles);
        if (data.selectedRegion) setSelectedRegion(data.selectedRegion);
    };

    const loadProfiles = async () => {
        setLoading(true);
        setError(null);

        try {
            // Try to connect to native messaging host
            const port = browser.runtime.connectNative("aws_profile_bridge");
            setNativeMessagingAvailable(true);

            // Set up message listener
            port.onMessage.addListener((response: any) => {
                if (response.action === "profileList") {
                    // Sort profiles alphabetically by name
                    const sortedProfiles = response.profiles.sort((a: AWSProfile, b: AWSProfile) =>
                        a.name.localeCompare(b.name)
                    );
                    setProfiles(sortedProfiles);
                    setLoading(false);
                } else if (response.action === "error") {
                    setError(response.message);
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
        const [identities, storageData] = await Promise.all([
            browser.contextualIdentities.query({}),
            browser.storage.local.get("containers"),
        ]);
        const containerIds: string[] =
            "containers" in storageData ? storageData.containers : [];

        setContainers(
            identities.filter((i) => containerIds.includes(i.cookieStoreId))
        );
    };

    const openProfile = async (profile: AWSProfile) => {
        try {
            // Track in recent profiles
            const updatedRecent = [
                profile.name,
                ...recentProfiles.filter(p => p !== profile.name)
            ].slice(0, 10);
            setRecentProfiles(updatedRecent);
            await browser.storage.local.set({ recentProfiles: updatedRecent });

            const port = browser.runtime.connectNative("aws_profile_bridge");

            port.onMessage.addListener(async (response: any) => {
                if (response.action === "consoleUrl") {
                    // Add region to the console URL
                    let consoleUrl = response.url;
                    if (consoleUrl.includes("console.aws.amazon.com")) {
                        const urlObj = new URL(consoleUrl);
                        urlObj.searchParams.set("region", selectedRegion);
                        consoleUrl = urlObj.toString();
                    }

                    // Build the container URL
                    const encodedUrl = encodeURIComponent(consoleUrl);
                    const encodedName = encodeURIComponent(response.profileName);
                    const fullUrl = `ext+container:url=${encodedUrl}&name=${encodedName}&color=${response.color}&icon=${response.icon}`;

                    // Open in new tab with the protocol handler
                    await browser.tabs.create({ url: fullUrl });

                    // Close popup
                    window.close();
                } else if (response.action === "error") {
                    setError(response.message);
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
        const updatedFavorites = favorites.includes(profileName)
            ? favorites.filter(f => f !== profileName)
            : [...favorites, profileName];
        setFavorites(updatedFavorites);
        await browser.storage.local.set({ favorites: updatedFavorites });
    };

    const handleRegionChange = async (region: string) => {
        setSelectedRegion(region);
        await browser.storage.local.set({ selectedRegion: region });
    };

    const getFilteredAndSortedProfiles = () => {
        // Filter by search term
        const filtered = profiles.filter(p =>
            p.name.toLowerCase().includes(searchFilter.toLowerCase())
        );

        // Separate into favorites, recent, and others
        const favoriteProfiles = filtered.filter(p => favorites.includes(p.name));
        const recentProfilesList = filtered.filter(p =>
            recentProfiles.includes(p.name) && !favorites.includes(p.name)
        );
        const otherProfiles = filtered.filter(p =>
            !favorites.includes(p.name) && !recentProfiles.includes(p.name)
        );

        // Sort each group
        favoriteProfiles.sort((a, b) => a.name.localeCompare(b.name));
        recentProfilesList.sort((a, b) =>
            recentProfiles.indexOf(a.name) - recentProfiles.indexOf(b.name)
        );
        otherProfiles.sort((a, b) => a.name.localeCompare(b.name));

        return { favoriteProfiles, recentProfilesList, otherProfiles };
    };

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
        const diffMinutes = Math.floor((expDate.getTime() - now.getTime()) / 60000);

        if (diffMinutes < 60) {
            return `⏰ ${diffMinutes}m`;
        } else if (diffMinutes < 1440) {
            const hours = Math.floor(diffMinutes / 60);
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
                        onClick={loadProfiles}
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
            <h3 className="title">AWS Profile Containers</h3>
            <div style={{ display: "flex", justifyContent: "center", gap: "5px", padding: "5px" }}>
                <button
                    onClick={() => setView("profiles")}
                    style={{
                        flex: 1,
                        padding: "5px",
                        background: view === "profiles" ? "#0060df" : "#f5f5f5",
                        color: view === "profiles" ? "white" : "black",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "12px"
                    }}
                >
                    AWS Profiles
                </button>
                <button
                    onClick={() => setView("containers")}
                    style={{
                        flex: 1,
                        padding: "5px",
                        background: view === "containers" ? "#0060df" : "#f5f5f5",
                        color: view === "containers" ? "white" : "black",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "12px"
                    }}
                >
                    Containers ({containers.length})
                </button>
            </div>
            <hr />

            {loading ? (
                <div style={{ padding: "20px", textAlign: "center" }}>
                    Loading profiles...
                </div>
            ) : error ? (
                <div style={{ padding: "10px", color: "red", fontSize: "12px" }}>
                    {error}
                    <button onClick={loadProfiles} style={{ marginTop: "10px" }}>
                        Retry
                    </button>
                </div>
            ) : view === "profiles" ? (
                <>
                    {/* Search and Region Controls */}
                    <div style={{ padding: "5px" }}>
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "6px 8px",
                                fontSize: "12px",
                                border: "1px solid #ccc",
                                borderRadius: "3px",
                                marginBottom: "5px"
                            }}
                        />
                        <select
                            value={selectedRegion}
                            onChange={(e) => handleRegionChange(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "6px 8px",
                                fontSize: "12px",
                                border: "1px solid #ccc",
                                borderRadius: "3px"
                            }}
                        >
                            {AWS_REGIONS.map(region => (
                                <option key={region.code} value={region.code}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="scrollable identities-list">
                        <table className="menu" id="identities-list">
                            {profiles.length === 0 ? (
                                <tr>
                                    <td style={{ padding: "20px", textAlign: "center" }}>
                                        No AWS profiles found in ~/.aws/credentials
                                    </td>
                                </tr>
                            ) : (() => {
                                const { favoriteProfiles, recentProfilesList, otherProfiles } = getFilteredAndSortedProfiles();

                                const renderProfile = (profile: AWSProfile) => (
                                    <tr
                                        key={profile.name}
                                        className="menu-item hover-highlight"
                                        onClick={() => openProfile(profile)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td>
                                            <div className="menu-icon hover-highlight">
                                                <div
                                                    className="usercontext-icon"
                                                    data-identity-icon={profile.icon}
                                                    data-identity-color={profile.color}
                                                ></div>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                                <span className="menu-text">
                                                    {profile.name}
                                                </span>
                                                {profile.expiration && (
                                                    <span style={{
                                                        fontSize: "10px",
                                                        color: profile.expired ? "#d70022" : "#666",
                                                        marginLeft: "32px"
                                                    }}>
                                                        {formatExpiration(profile.expiration, profile.expired)}
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                onClick={(e) => toggleFavorite(profile.name, e)}
                                                style={{
                                                    marginLeft: "auto",
                                                    padding: "4px 8px",
                                                    cursor: "pointer",
                                                    fontSize: "14px"
                                                }}
                                            >
                                                {favorites.includes(profile.name) ? "★" : "☆"}
                                            </div>
                                        </td>
                                    </tr>
                                );

                                const renderSection = (title: string, profilesList: AWSProfile[]) => {
                                    if (profilesList.length === 0) return null;
                                    return (
                                        <>
                                            <tr>
                                                <td style={{
                                                    padding: "4px 8px",
                                                    fontSize: "10px",
                                                    fontWeight: "bold",
                                                    color: "#666",
                                                    background: "#f5f5f5",
                                                    textTransform: "uppercase"
                                                }}>
                                                    {title}
                                                </td>
                                            </tr>
                                            {profilesList.map(renderProfile)}
                                        </>
                                    );
                                };

                                if (favoriteProfiles.length === 0 && recentProfilesList.length === 0 && otherProfiles.length === 0) {
                                    return (
                                        <tr>
                                            <td style={{ padding: "20px", textAlign: "center" }}>
                                                No profiles match your search
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <>
                                        {renderSection("Favorites", favoriteProfiles)}
                                        {renderSection("Recent", recentProfilesList)}
                                        {renderSection("All Profiles", otherProfiles)}
                                    </>
                                );
                            })()}
                        </table>
                    </div>
                    <div className="v-padding-hack-footer" />
                    <div style={{ display: "flex", gap: "5px", padding: "5px" }}>
                        <div
                            className="bottom-btn keyboard-nav controller"
                            tabIndex={0}
                            onClick={loadProfiles}
                            style={{ flex: 1, textAlign: "center" }}
                        >
                            ↻ Refresh
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="scrollable identities-list">
                        <table className="menu" id="identities-list">
                            {containers.length === 0 ? (
                                <tr>
                                    <td style={{ padding: "20px", textAlign: "center" }}>
                                        No active containers
                                    </td>
                                </tr>
                            ) : (
                                containers.map((container) => (
                                    <tr key={container.cookieStoreId} className="menu-item hover-highlight">
                                        <td>
                                            <div className="menu-icon hover-highlight">
                                                <div
                                                    className="usercontext-icon"
                                                    data-identity-icon={container.icon}
                                                    data-identity-color={container.color}
                                                ></div>
                                            </div>
                                            <span className="menu-text">
                                                {container.name}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </table>
                    </div>
                    <div className="v-padding-hack-footer" />
                    <div
                        className="bottom-btn keyboard-nav controller"
                        tabIndex={0}
                        onClick={() => setIsRemoving(true)}
                        style={{ textAlign: "center" }}
                    >
                        Clear Containers
                    </div>
                </>
            )}
        </div>
    );
};
