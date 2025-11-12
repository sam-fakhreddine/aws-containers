/**
 * ThemeSelector Component
 * Allows users to switch between light, dark, and system theme modes
 */

import React, { FunctionComponent, memo } from "react";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import { ThemeMode } from "../hooks";

interface ThemeSelectorProps {
    mode: ThemeMode;
    onModeChange: (mode: ThemeMode) => void;
}

/**
 * ThemeSelector - Dropdown for theme selection
 * Memoized to prevent unnecessary re-renders
 */
const ThemeSelectorComponent: FunctionComponent<ThemeSelectorProps> = ({
    mode,
    onModeChange,
}) => {
    const getIconName = (currentMode: ThemeMode): "status-positive" | "status-negative" | "settings" => {
        switch (currentMode) {
            case "light":
                return "status-positive";
            case "dark":
                return "status-negative";
            case "system":
            default:
                return "settings";
        }
    };

    const getLabel = (currentMode: ThemeMode): string => {
        switch (currentMode) {
            case "light":
                return "Light";
            case "dark":
                return "Dark";
            case "system":
                return "System";
            default:
                return "System";
        }
    };

    return (
        <ButtonDropdown
            items={[
                {
                    id: "light",
                    text: "Light",
                    iconName: "status-positive",
                },
                {
                    id: "dark",
                    text: "Dark",
                    iconName: "status-negative",
                },
                {
                    id: "system",
                    text: "System",
                    iconName: "settings",
                },
            ]}
            onItemClick={(e) => onModeChange(e.detail.id as ThemeMode)}
        >
            Theme: {getLabel(mode)}
        </ButtonDropdown>
    );
};

/**
 * Memoized ThemeSelector component
 */
export const ThemeSelector = memo(ThemeSelectorComponent);
