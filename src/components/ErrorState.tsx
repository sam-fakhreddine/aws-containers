/**
 * ErrorState Component
 * Displays an error message with retry button
 * Memoized for performance
 */

import React, { FunctionComponent, memo } from "react";
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";

interface ErrorStateProps {
    error: string;
    onRetry?: () => void;
}

/**
 * ErrorState - Shows error message with optional retry button
 * Memoized to prevent unnecessary re-renders
 */
const ErrorStateComponent: FunctionComponent<ErrorStateProps> = ({
    error,
    onRetry,
}) => {
    return (
        <Box padding="m">
            <Alert
                type="error"
                header="Error loading profiles"
                action={
                    onRetry ? (
                        <Button onClick={onRetry} variant="primary">
                            Retry
                        </Button>
                    ) : undefined
                }
            >
                {error}
            </Alert>
        </Box>
    );
};

/**
 * Memoized ErrorState - re-renders only when error message changes
 */
export const ErrorState = memo(ErrorStateComponent);
