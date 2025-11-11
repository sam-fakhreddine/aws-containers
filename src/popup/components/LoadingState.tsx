/**
 * LoadingState Component
 * Displays a loading indicator
 */

import React, { FunctionComponent } from "react";

interface LoadingStateProps {
    message?: string;
}

/**
 * LoadingState - Shows loading indicator
 */
export const LoadingState: FunctionComponent<LoadingStateProps> = ({
    message = "Loading profiles...",
}) => {
    return (
        <div style={{ padding: "30px", textAlign: "center", fontSize: "16px" }}>
            {message}
        </div>
    );
};
