/**
 * ProfileItem Component
 * Renders a single AWS profile in the list
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { FunctionComponent, memo } from "react";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
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
            padding={{ vertical: "xs", horizontal: "s" }}
            margin={{ bottom: "xxxs" }}
        >
            <div
                onClick={() => onProfileClick(profile)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "8px",
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
                        gap: "4px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <Box fontSize="body-m" fontWeight="bold">
                            {profile.name}
                        </Box>
                        {profile.is_sso && <Badge color="blue">SSO</Badge>}
                    </div>
                    {profile.expiration && (
                        <Box
                            fontSize="body-s"
                            color={profile.expired ? "text-status-error" : "text-body-secondary"}
                        >
                            {formatExpiration(profile.expiration, profile.expired)}
                        </Box>
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
