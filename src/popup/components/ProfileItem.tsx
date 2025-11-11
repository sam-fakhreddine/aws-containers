/**
 * ProfileItem Component
 * Renders a single AWS profile in the list
 */

import React, { FunctionComponent } from "react";
import { AWSProfile } from "../types";
import {
    MILLISECONDS_PER_MINUTE,
    MINUTES_PER_HOUR,
    MINUTES_PER_DAY,
} from "../constants";

interface ProfileItemProps {
    profile: AWSProfile;
    isFavorite: boolean;
    onProfileClick: (profile: AWSProfile) => void;
    onFavoriteToggle: (profileName: string, e: React.MouseEvent) => void;
}

/**
 * Format expiration time for display
 */
function formatExpiration(expiration: string | null, expired: boolean): string {
    if (!expiration) return "";

    if (expired) {
        return "⚠️ Expired";
    }

    const expDate = new Date(expiration);
    const now = new Date();
    const diffMinutes = Math.floor(
        (expDate.getTime() - now.getTime()) / MILLISECONDS_PER_MINUTE
    );

    if (diffMinutes < MINUTES_PER_HOUR) {
        return `⏰ ${diffMinutes}m`;
    } else if (diffMinutes < MINUTES_PER_DAY) {
        const hours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
        return `⏰ ${hours}h`;
    } else {
        return `✓ Valid`;
    }
}

/**
 * ProfileItem - Renders a single AWS profile
 */
export const ProfileItem: FunctionComponent<ProfileItemProps> = ({
    profile,
    isFavorite,
    onProfileClick,
    onFavoriteToggle,
}) => {
    return (
        <tr
            className="menu-item hover-highlight"
            onClick={() => onProfileClick(profile)}
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
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "2px",
                            }}
                        >
                            <span style={{ fontSize: "16px", fontWeight: "500" }}>
                                {profile.name}
                            </span>
                            {profile.is_sso && (
                                <span
                                    style={{
                                        fontSize: "11px",
                                        background: "#0060df",
                                        color: "white",
                                        padding: "3px 6px",
                                        borderRadius: "3px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    SSO
                                </span>
                            )}
                        </div>
                        {profile.expiration && (
                            <span
                                style={{
                                    fontSize: "13px",
                                    color: profile.expired ? "#d70022" : "#666",
                                }}
                            >
                                {formatExpiration(profile.expiration, profile.expired)}
                            </span>
                        )}
                    </div>
                    <div
                        onClick={(e) => onFavoriteToggle(profile.name, e)}
                        style={{
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontSize: "20px",
                        }}
                    >
                        {isFavorite ? "★" : "☆"}
                    </div>
                </div>
            </td>
        </tr>
    );
};
