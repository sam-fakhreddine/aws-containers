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
 * Format expiration time for display with natural language
 */
function formatExpiration(expiration: string | null, expired: boolean): {
    text: string;
    fullText: string;
    icon: string;
    color: string;
    severity: "expired" | "expiring-soon" | "expiring-today" | "valid";
} | null {
    if (!expiration) return null;

    const expDate = new Date(expiration);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / MILLISECONDS_PER_MINUTE);
    const diffHours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
    const diffDays = Math.floor(diffMinutes / MINUTES_PER_DAY);

    // Format the full date/time for tooltip
    const fullText = expDate.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    if (expired) {
        // Calculate how long ago it expired
        const absDiffMinutes = Math.abs(diffMinutes);
        const absDiffHours = Math.abs(diffHours);
        const absDiffDays = Math.abs(diffDays);

        let text: string;
        if (absDiffMinutes < 60) {
            text = `Expired ${absDiffMinutes}m ago`;
        } else if (absDiffHours < 24) {
            text = `Expired ${absDiffHours}h ago`;
        } else if (absDiffDays === 1) {
            text = "Expired 1 day ago";
        } else {
            text = `Expired ${absDiffDays} days ago`;
        }

        return {
            text,
            fullText,
            icon: "status-negative",
            color: "text-status-error",
            severity: "expired",
        };
    }

    // Expiring very soon (< 1 hour)
    if (diffMinutes < MINUTES_PER_HOUR) {
        return {
            text: diffMinutes <= 1 ? "Expires in <1m" : `Expires in ${diffMinutes}m`,
            fullText,
            icon: "status-warning",
            color: "text-status-warning",
            severity: "expiring-soon",
        };
    }

    // Expiring today (< 24 hours)
    if (diffHours < 24) {
        return {
            text: diffHours === 1 ? "Expires in 1h" : `Expires in ${diffHours}h`,
            fullText,
            icon: "status-info",
            color: "text-status-info",
            severity: "expiring-today",
        };
    }

    // Expiring in the near future (< 7 days)
    if (diffDays < 7) {
        return {
            text: diffDays === 1 ? "Expires in 1 day" : `Expires in ${diffDays} days`,
            fullText,
            icon: "status-positive",
            color: "text-status-success",
            severity: "valid",
        };
    }

    // Valid for a while
    return {
        text: `Expires ${expDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        fullText,
        icon: "status-positive",
        color: "text-status-success",
        severity: "valid",
    };
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
                    {profile.expiration && (() => {
                        const expirationInfo = formatExpiration(profile.expiration, profile.expired);
                        if (!expirationInfo) return null;
                        return (
                            <Box
                                fontSize="body-s"
                                color={expirationInfo.color as any}
                            >
                                <div
                                    style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                    title={expirationInfo.fullText}
                                >
                                    <Icon name={expirationInfo.icon as any} size="small" />
                                    <span style={{ fontWeight: expirationInfo.severity === "expiring-soon" ? "bold" : "normal" }}>
                                        {expirationInfo.text}
                                    </span>
                                </div>
                            </Box>
                        );
                    })()}
                </div>
                <div
                    onClick={(e) => onFavoriteToggle(profile.name, e)}
                    style={{
                        padding: "6px 10px",
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
