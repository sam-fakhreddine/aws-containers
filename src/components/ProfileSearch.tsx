/**
 * ProfileSearch Component
 * Provides search and region filtering controls
 * Memoized for performance
 */

// React
import React, { FunctionComponent, memo, useMemo } from "react";

// Cloudscape components
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";

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
 * Memoized to prevent unnecessary re-renders
 */
const ProfileSearchComponent: FunctionComponent<ProfileSearchProps> = ({
    searchFilter,
    onSearchChange,
    selectedRegion,
    onRegionChange,
    regions,
}) => {
    const regionOptions = useMemo(() => regions.map((region) => ({
        label: region.name,
        value: region.code,
    })), [regions]);

    const selectedOption = useMemo(() => 
        regionOptions.find((opt) => opt.value === selectedRegion) ||
        regionOptions[0],
        [regionOptions, selectedRegion]
    );

    return (
        <div style={{ padding: "8px" }}>
            <SpaceBetween size="s" direction="vertical">
                <Input
                    type="search"
                    placeholder="Search profiles..."
                    value={searchFilter}
                    onChange={(event) => onSearchChange(event.detail.value)}
                    clearAriaLabel="Clear search"
                />
                <Select
                    selectedOption={selectedOption}
                    onChange={(event) =>
                        onRegionChange(event.detail.selectedOption.value || "")
                    }
                    options={regionOptions}
                    placeholder="Select region"
                    selectedAriaLabel="Selected"
                />
            </SpaceBetween>
        </div>
    );
};

/**
 * Memoized ProfileSearch component
 */
export const ProfileSearch = memo(ProfileSearchComponent);
