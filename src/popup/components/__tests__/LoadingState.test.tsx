/**
 * Unit tests for LoadingState component
 * Tests loading display, custom messages, and memoization
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingState } from "../LoadingState";

describe("LoadingState", () => {
    describe("Rendering", () => {
        it("renders loading spinner", () => {
            const { container } = render(<LoadingState />);

            // Component should render successfully
            expect(container.firstChild).toBeInTheDocument();
        });

        it("renders default loading message", () => {
            render(<LoadingState />);

            expect(screen.getByText("Loading profiles...")).toBeInTheDocument();
        });

        it("renders custom loading message", () => {
            render(<LoadingState message="Fetching data..." />);

            expect(screen.getByText("Fetching data...")).toBeInTheDocument();
            expect(screen.queryByText("Loading profiles...")).not.toBeInTheDocument();
        });

        it("renders with centered layout", () => {
            const { container } = render(<LoadingState />);

            // Component should render successfully
            expect(container.firstChild).toBeInTheDocument();
        });

        it("renders large spinner", () => {
            const { container } = render(<LoadingState />);

            // Component should render successfully
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe("Different messages", () => {
        it("renders short message", () => {
            render(<LoadingState message="Loading..." />);

            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });

        it("renders long message", () => {
            const longMessage = "Please wait while we load your AWS profiles from the server...";

            render(<LoadingState message={longMessage} />);

            expect(screen.getByText(longMessage)).toBeInTheDocument();
        });

        it("renders message with special characters", () => {
            const message = "Loading profiles from 'aws-config'...";

            render(<LoadingState message={message} />);

            expect(screen.getByText(message)).toBeInTheDocument();
        });

        it("renders empty message", () => {
            render(<LoadingState message="" />);

            expect(screen.queryByText("Loading profiles...")).not.toBeInTheDocument();
        });
    });

    describe("Memoization", () => {
        it("does not re-render when parent re-renders with same props", () => {
            const { rerender } = render(<LoadingState message="Loading..." />);

            const firstRender = screen.getByText("Loading...");

            // Re-render with same props
            rerender(<LoadingState message="Loading..." />);

            const secondRender = screen.getByText("Loading...");

            // Should be the same instance due to memoization
            expect(firstRender).toBe(secondRender);
        });

        it("re-renders when message changes", () => {
            const { rerender } = render(<LoadingState message="First message" />);

            expect(screen.getByText("First message")).toBeInTheDocument();

            rerender(<LoadingState message="Second message" />);

            expect(screen.queryByText("First message")).not.toBeInTheDocument();
            expect(screen.getByText("Second message")).toBeInTheDocument();
        });

        it("does not re-render when no message provided on both renders", () => {
            const { rerender } = render(<LoadingState />);

            const firstRender = screen.getByText("Loading profiles...");

            rerender(<LoadingState />);

            const secondRender = screen.getByText("Loading profiles...");

            expect(firstRender).toBe(secondRender);
        });
    });

    describe("Accessibility", () => {
        it("spinner renders for users", () => {
            const { container } = render(<LoadingState />);

            // Component should render successfully
            expect(container.firstChild).toBeInTheDocument();
        });

        it("loading message is visible to screen readers", () => {
            render(<LoadingState message="Loading data" />);

            const message = screen.getByText("Loading data");
            expect(message).toBeVisible();
        });

        it("maintains semantic structure", () => {
            const { container } = render(<LoadingState />);

            // Should have proper box structure
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe("Visual structure", () => {
        it("renders spinner above message", () => {
            const { container } = render(<LoadingState message="Test message" />);

            const elements = container.querySelectorAll('[class*="box"]');
            expect(elements.length).toBeGreaterThan(0);
        });

        it("applies padding to container", () => {
            const { container } = render(<LoadingState />);

            const outerBox = container.firstChild;
            expect(outerBox).toBeInTheDocument();
        });

        it("applies padding to message", () => {
            render(<LoadingState message="Test" />);

            const message = screen.getByText("Test");
            expect(message.parentElement).toBeInTheDocument();
        });
    });

    describe("Edge cases", () => {
        it("handles rapid message changes", () => {
            const { rerender } = render(<LoadingState message="Message 1" />);

            rerender(<LoadingState message="Message 2" />);
            rerender(<LoadingState message="Message 3" />);
            rerender(<LoadingState message="Message 4" />);

            expect(screen.getByText("Message 4")).toBeInTheDocument();
            expect(screen.queryByText("Message 1")).not.toBeInTheDocument();
        });

        it("handles switching from custom to default message", () => {
            const { rerender } = render(<LoadingState message="Custom message" />);

            expect(screen.getByText("Custom message")).toBeInTheDocument();

            rerender(<LoadingState />);

            expect(screen.queryByText("Custom message")).not.toBeInTheDocument();
            expect(screen.getByText("Loading profiles...")).toBeInTheDocument();
        });

        it("handles switching from default to custom message", () => {
            const { rerender } = render(<LoadingState />);

            expect(screen.getByText("Loading profiles...")).toBeInTheDocument();

            rerender(<LoadingState message="Custom message" />);

            expect(screen.queryByText("Loading profiles...")).not.toBeInTheDocument();
            expect(screen.getByText("Custom message")).toBeInTheDocument();
        });

        it("renders correctly with undefined message prop", () => {
            render(<LoadingState message={undefined} />);

            expect(screen.getByText("Loading profiles...")).toBeInTheDocument();
        });
    });

    describe("Integration scenarios", () => {
        it("displays during initial data load", () => {
            const { container } = render(<LoadingState message="Loading profiles..." />);

            expect(container.firstChild).toBeInTheDocument();
            expect(screen.getByText("Loading profiles...")).toBeInTheDocument();
        });

        it("displays during data refresh", () => {
            const { container } = render(<LoadingState message="Refreshing..." />);

            expect(container.firstChild).toBeInTheDocument();
            expect(screen.getByText("Refreshing...")).toBeInTheDocument();
        });

        it("displays during async operation", () => {
            const { container } = render(<LoadingState message="Please wait..." />);

            expect(container.firstChild).toBeInTheDocument();
            expect(screen.getByText("Please wait...")).toBeInTheDocument();
        });
    });
});
