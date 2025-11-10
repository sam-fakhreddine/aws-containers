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

export const AWSProfilesPopup: FunctionComponent = () => {
    const [profiles, setProfiles] = useState<AWSProfile[]>([]);
    const [containers, setContainers] = useState<ContextualIdentities.ContextualIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<"profiles" | "containers">("profiles");
    const [isRemoving, setIsRemoving] = useState(false);
    const [nativeMessagingAvailable, setNativeMessagingAvailable] = useState(false);

    useEffect(() => {
        browser.runtime.sendMessage({ popupMounted: true });
        loadProfiles();
        refreshContainers();
    }, []);

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
                    setProfiles(response.profiles);
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
            const port = browser.runtime.connectNative("aws_profile_bridge");

            port.onMessage.addListener(async (response: any) => {
                if (response.action === "consoleUrl") {
                    // Build the container URL
                    const encodedUrl = encodeURIComponent(response.url);
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
                    <div className="scrollable identities-list">
                        <table className="menu" id="identities-list">
                            {profiles.length === 0 ? (
                                <tr>
                                    <td style={{ padding: "20px", textAlign: "center" }}>
                                        No AWS profiles found in ~/.aws/credentials
                                    </td>
                                </tr>
                            ) : (
                                profiles.map((profile) => (
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
                                            <div style={{ display: "flex", flexDirection: "column" }}>
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
                                        </td>
                                    </tr>
                                ))
                            )}
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
