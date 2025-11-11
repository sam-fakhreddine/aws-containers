/**
 * ProfileSearch Component
 * Provides search and region filtering controls
 */

import React, { FunctionComponent } from "react";

interface AWSRegion {
    code: string;
    name: string;
}

interface ProfileSearchProps {
    searchFilter: string;
    onSearchChange: (search: string) => void;
    selectedRegion: string;
    onRegionChange: (region: string) => void;
    regions: AWSRegion[];
}

/**
 * ProfileSearch - Search and region selection controls
 */
export const ProfileSearch: FunctionComponent<ProfileSearchProps> = ({
    searchFilter,
    onSearchChange,
    selectedRegion,
    onRegionChange,
    regions,
}) => {
    return (
        <div style={{ padding: "8px" }}>
            <input
                type="text"
                placeholder="Search profiles..."
                value={searchFilter}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: "17px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    marginBottom: "8px",
                }}
            />
            <select
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: "17px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                }}
            >
                {regions.map((region) => (
                    <option key={region.code} value={region.code}>
                        {region.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
