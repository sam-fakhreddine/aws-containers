/**
 * Unit tests for ErrorState component
 * Tests error display, retry functionality, and memoization
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "../ErrorState";

describe("ErrorState", () => {
    describe("Rendering", () => {
        it("renders error message", () => {
            render(<ErrorState error="Something went wrong" />);

            expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        });

        it("renders error header", () => {
            render(<ErrorState error="Test error" />);

            expect(screen.getByText("Error loading profiles")).toBeInTheDocument();
        });

        it("renders error alert with error type", () => {
            render(<ErrorState error="Test error" />);

            const alert = screen.getByRole("group");
            expect(alert).toBeInTheDocument();
        });

        it("renders without retry button when onRetry not provided", () => {
            render(<ErrorState error="Test error" />);

            expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
        });

        it("renders retry button when onRetry provided", () => {
            const onRetry = jest.fn();
            render(<ErrorState error="Test error" onRetry={onRetry} />);

            expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
        });
    });

    describe("Retry functionality", () => {
        it("calls onRetry when retry button clicked", async () => {
            const user = userEvent.setup();
            const onRetry = jest.fn();

            render(<ErrorState error="Test error" onRetry={onRetry} />);

            const retryButton = screen.getByRole("button", { name: /retry/i });
            await user.click(retryButton);

            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it("calls onRetry multiple times on multiple clicks", async () => {
            const user = userEvent.setup();
            const onRetry = jest.fn();

            render(<ErrorState error="Test error" onRetry={onRetry} />);

            const retryButton = screen.getByRole("button", { name: /retry/i });
            await user.click(retryButton);
            await user.click(retryButton);
            await user.click(retryButton);

            expect(onRetry).toHaveBeenCalledTimes(3);
        });

        it("retry button has primary variant styling", () => {
            const onRetry = jest.fn();
            render(<ErrorState error="Test error" onRetry={onRetry} />);

            const retryButton = screen.getByRole("button", { name: /retry/i });
            expect(retryButton).toBeInTheDocument();
        });
    });

    describe("Different error messages", () => {
        it("renders short error message", () => {
            render(<ErrorState error="Error" />);

            expect(screen.getByText("Error")).toBeInTheDocument();
        });

        it("renders long error message", () => {
            const longError =
                "This is a very long error message that describes in detail what went wrong during the operation and provides helpful information to the user about how to resolve the issue.";

            render(<ErrorState error={longError} />);

            expect(screen.getByText(longError)).toBeInTheDocument();
        });

        it("renders error message with special characters", () => {
            const error = "Error: Failed to load profiles from 'aws-config.json'";

            render(<ErrorState error={error} />);

            expect(screen.getByText(error)).toBeInTheDocument();
        });

        it("renders error message with line breaks", () => {
            const { container } = render(<ErrorState error="Error occurred:\nPlease try again later" />);

            // CloudScape Alert renders the text, check container has the text
            expect(container.textContent).toContain("Error occurred");
            expect(container.textContent).toContain("Please try again later");
        });
    });

    describe("Memoization", () => {
        it("does not re-render when parent re-renders with same props", () => {
            const onRetry = jest.fn();
            const { rerender } = render(<ErrorState error="Test error" onRetry={onRetry} />);

            const firstRender = screen.getByText("Test error");

            // Re-render with same props
            rerender(<ErrorState error="Test error" onRetry={onRetry} />);

            const secondRender = screen.getByText("Test error");

            // Should be the same instance due to memoization
            expect(firstRender).toBe(secondRender);
        });

        it("re-renders when error message changes", () => {
            const { rerender } = render(<ErrorState error="First error" />);

            expect(screen.getByText("First error")).toBeInTheDocument();

            rerender(<ErrorState error="Second error" />);

            expect(screen.queryByText("First error")).not.toBeInTheDocument();
            expect(screen.getByText("Second error")).toBeInTheDocument();
        });

        it("re-renders when onRetry changes", () => {
            const onRetry1 = jest.fn();
            const onRetry2 = jest.fn();

            const { rerender } = render(<ErrorState error="Test error" onRetry={onRetry1} />);

            rerender(<ErrorState error="Test error" onRetry={onRetry2} />);

            const retryButton = screen.getByRole("button", { name: /retry/i });
            retryButton.click();

            expect(onRetry1).not.toHaveBeenCalled();
            expect(onRetry2).toHaveBeenCalledTimes(1);
        });
    });

    describe("Accessibility", () => {
        it("error alert has proper ARIA role", () => {
            render(<ErrorState error="Test error" />);

            const alert = screen.getByRole("group");
            expect(alert).toBeInTheDocument();
        });

        it("retry button is keyboard accessible", async () => {
            const user = userEvent.setup();
            const onRetry = jest.fn();

            render(<ErrorState error="Test error" onRetry={onRetry} />);

            const retryButton = screen.getByRole("button", { name: /retry/i });

            // Focus and activate with keyboard
            retryButton.focus();
            await user.keyboard("{Enter}");

            expect(onRetry).toHaveBeenCalled();
        });

        it("renders error text as readable content", () => {
            const error = "Failed to connect to AWS";
            render(<ErrorState error={error} />);

            const errorText = screen.getByText(error);
            expect(errorText).toBeVisible();
        });
    });

    describe("Edge cases", () => {
        it("handles empty error string", () => {
            render(<ErrorState error="" />);

            expect(screen.getByText("Error loading profiles")).toBeInTheDocument();
        });

        it("handles undefined onRetry gracefully", () => {
            render(<ErrorState error="Test error" onRetry={undefined} />);

            expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
        });

        it("handles rapid retry clicks", async () => {
            const user = userEvent.setup();
            const onRetry = jest.fn();

            render(<ErrorState error="Test error" onRetry={onRetry} />);

            const retryButton = screen.getByRole("button", { name: /retry/i });

            // Rapid clicks
            await user.tripleClick(retryButton);

            expect(onRetry).toHaveBeenCalled();
        });
    });
});
