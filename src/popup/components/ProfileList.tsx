/**
 * ProfileList Component
 * Displays a list of AWS profiles with favorites support
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { FunctionComponent, memo } from "react";
import { AWSProfile } from "../types";
import { ProfileItem } from "./ProfileItem";

interface ProfileListProps {
    profiles: AWSProfile[];
    favorites: string[];
    onProfileClick: (profile: AWSProfile) => void;
    onFavoriteToggle: (profileName: string, e: React.MouseEvent) => void;
    emptyMessage?: string;
}

/**
 * ProfileList - Renders a list of AWS profiles
 * Memoized to prevent re-renders when props haven't changed
 */
const ProfileListComponent: FunctionComponent<ProfileListProps> = ({
    profiles,
    favorites,
    onProfileClick,
    onFavoriteToggle,
    emptyMessage = "No profiles found",
}) => {
    if (profiles.length === 0) {
        return (
            <table className="menu" id="identities-list" style={{ width: "100%" }}>
                <tbody>
                    <tr>
                        <td
                            style={{
                                padding: "20px",
                                textAlign: "center",
                                fontSize: "15px",
                            }}
                        >
                            {emptyMessage}
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }

    return (
        <table className="menu" id="identities-list" style={{ width: "100%" }}>
            <tbody>
                {profiles.map((profile) => (
                    <ProfileItem
                        key={profile.name}
                        profile={profile}
                        isFavorite={favorites.includes(profile.name)}
                        onProfileClick={onProfileClick}
                        onFavoriteToggle={onFavoriteToggle}
                    />
                ))}
            </tbody>
        </table>
    );
};

/**
 * Custom comparison function for ProfileList memoization
 * Only re-render if profiles array or favorites array actually changed
 */
function arePropsEqual(
    prevProps: Readonly<ProfileListProps>,
    nextProps: Readonly<ProfileListProps>
): boolean {
    // Check if profiles array length changed
    if (prevProps.profiles.length !== nextProps.profiles.length) {
        return false;
    }

    // Check if favorites array length changed
    if (prevProps.favorites.length !== nextProps.favorites.length) {
        return false;
    }

    // Check if profile names changed (shallow comparison sufficient)
    for (let i = 0; i < prevProps.profiles.length; i++) {
        if (prevProps.profiles[i].name !== nextProps.profiles[i].name) {
            return false;
        }
        if (prevProps.profiles[i].expired !== nextProps.profiles[i].expired) {
            return false;
        }
    }

    // Check if favorites changed
    for (let i = 0; i < prevProps.favorites.length; i++) {
        if (prevProps.favorites[i] !== nextProps.favorites[i]) {
            return false;
        }
    }

    // Check if empty message changed
    if (prevProps.emptyMessage !== nextProps.emptyMessage) {
        return false;
    }

    // Props are equal, don't re-render
    return true;
}

/**
 * Memoized ProfileList component
 * Prevents unnecessary re-renders when props haven't changed
 */
export const ProfileList = memo(ProfileListComponent, arePropsEqual);
