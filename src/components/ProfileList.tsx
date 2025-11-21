/**
 * ProfileList Component
 * Displays a list of AWS profiles with favorites support
 * Optimized with React.memo to prevent unnecessary re-renders
 */

// React
import React, { FunctionComponent, memo } from "react";

// Cloudscape components
import Box from "@cloudscape-design/components/box";

// Internal - components
import { ProfileItem } from "./ProfileItem";

// Types
import { AWSProfile } from "@/types";

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
            <Box padding="l" textAlign="center">
                {emptyMessage}
            </Box>
        );
    }

    return (
        <div id="identities-list" style={{ width: "100%" }}>
            {profiles.map((profile) => (
                <ProfileItem
                    key={profile.name}
                    profile={profile}
                    isFavorite={favorites.includes(profile.name)}
                    onProfileClick={onProfileClick}
                    onFavoriteToggle={onFavoriteToggle}
                />
            ))}
        </div>
    );
};

/**
 * Memoized ProfileList component
 * Relies on reference equality for profiles array (already memoized in parent)
 */
export const ProfileList = memo(ProfileListComponent);
