/**
 * LoadingState Component
 * Displays a loading indicator
 * Memoized for performance
 */

import React, { FunctionComponent, memo } from "react";
import Spinner from "@cloudscape-design/components/spinner";
import Box from "@cloudscape-design/components/box";

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
        <Box textAlign="center" padding="xxl">
            <Spinner size="large" />
            <Box variant="p" padding={{ top: "s" }}>
                {message}
            </Box>
        </Box>
    );
};

/**
 * Memoized LoadingState - re-renders only when message changes
 */
export const LoadingState = memo(LoadingStateComponent);
