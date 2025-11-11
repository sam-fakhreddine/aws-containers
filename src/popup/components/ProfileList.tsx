/**
 * ProfileList Component
 * Displays a list of AWS profiles with favorites support
 */

import React, { FunctionComponent } from "react";
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
 */
export const ProfileList: FunctionComponent<ProfileListProps> = ({
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
