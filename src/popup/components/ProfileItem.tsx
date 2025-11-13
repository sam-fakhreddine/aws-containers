/**
 * ProfileItem Component
 * Renders a single AWS profile in the list
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { FunctionComponent, memo } from "react";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import Icon from "@cloudscape-design/components/icon";
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
function formatExpiration(expiration: string | null, expired: boolean): { text: string; icon: string } | null {
    if (!expiration) return null;

    if (expired) {
        return { text: "Expired", icon: "status-warning" };
    }

    const expDate = new Date(expiration);
    const now = new Date();
    const diffMinutes = Math.floor(
        (expDate.getTime() - now.getTime()) / MILLISECONDS_PER_MINUTE
    );

    if (diffMinutes < MINUTES_PER_HOUR) {
        return { text: `${diffMinutes}m`, icon: "status-in-progress" };
    } else if (diffMinutes < MINUTES_PER_DAY) {
        const hours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
        return { text: `${hours}h`, icon: "status-in-progress" };
    } else {
        return { text: "Valid", icon: "status-positive" };
    }
}

/**
 * ProfileItem - Renders a single AWS profile
 * Memoized to prevent re-renders when props haven't changed
 */
const ProfileItemComponent: FunctionComponent<ProfileItemProps> = ({
    profile,
    isFavorite,
    onProfileClick,
    onFavoriteToggle,
}) => {
    return (
        <Box
            padding={{ vertical: "xxxs", horizontal: "s" }}
            margin={{ bottom: "n" }}
        >
            <div
                onClick={() => onProfileClick(profile)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: "6px",
                    transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f2f3f3";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
            >
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
                        gap: "2px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <Box fontSize="body-m" fontWeight="bold">
                            {profile.name}
                        </Box>
                        {profile.is_sso && <Badge color="blue">SSO</Badge>}
                    </div>
                    {profile.expiration && (() => {
                        const expirationInfo = formatExpiration(profile.expiration, profile.expired);
                        if (!expirationInfo) return null;
                        return (
                            <Box
                                fontSize="body-s"
                                color={profile.expired ? "text-status-error" : "text-body-secondary"}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                    <Icon name={expirationInfo.icon as any} size="small" />
                                    <span>{expirationInfo.text}</span>
                                </div>
                            </Box>
                        );
                    })()}
                </div>
                <div
                    onClick={(e) => onFavoriteToggle(profile.name, e)}
                    style={{
                        padding: "2px 6px",
                        cursor: "pointer",
                    }}
                >
                    <Icon name={isFavorite ? "star-filled" : "star"} />
                </div>
            </div>
        </Box>
    );
};

/**
 * Custom comparison function for ProfileItem
 * Only re-render if profile name, expiration, or favorite status changed
 */
function areProfileItemPropsEqual(
    prevProps: Readonly<ProfileItemProps>,
    nextProps: Readonly<ProfileItemProps>
): boolean {
    return (
        prevProps.profile.name === nextProps.profile.name &&
        prevProps.profile.expired === nextProps.profile.expired &&
        prevProps.profile.expiration === nextProps.profile.expiration &&
        prevProps.isFavorite === nextProps.isFavorite
    );
}

/**
 * Memoized ProfileItem component
 */
export const ProfileItem = memo(ProfileItemComponent, areProfileItemPropsEqual);
