/**
 * LoadingState Component
 * Displays a loading indicator
 * Memoized for performance
 */

import React, { FunctionComponent, memo } from "react";

interface LoadingStateProps {
    message?: string;
}

/**
 * LoadingState - Shows loading indicator
 * Memoized as it rarely changes
 */
const LoadingStateComponent: FunctionComponent<LoadingStateProps> = ({
    message = "Loading profiles...",
}) => {
    return (
        <div style={{ padding: "30px", textAlign: "center", fontSize: "16px" }}>
            {message}
        </div>
    );
};

/**
 * Memoized LoadingState - re-renders only when message changes
 */
export const LoadingState = memo(LoadingStateComponent);
