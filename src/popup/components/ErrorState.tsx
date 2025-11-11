/**
 * ErrorState Component
 * Displays an error message with retry button
 * Memoized for performance
 */

import React, { FunctionComponent, memo } from "react";

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
        <div style={{ padding: "16px", color: "red", fontSize: "15px" }}>
            {error}
            {onRetry && (
                <button
                    onClick={onRetry}
                    style={{
                        marginTop: "12px",
                        padding: "12px 18px",
                        fontSize: "16px",
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        boxShadow: "0 4px 8px rgba(240,147,251,0.3)",
                        transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                            "0 6px 12px rgba(240,147,251,0.4)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                            "0 4px 8px rgba(240,147,251,0.3)";
                    }}
                >
                    Retry
                </button>
            )}
        </div>
    );
};

/**
 * Memoized ErrorState - re-renders only when error message changes
 */
export const ErrorState = memo(ErrorStateComponent);
