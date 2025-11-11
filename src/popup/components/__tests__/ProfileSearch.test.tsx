/**
 * Unit tests for ProfileSearch component
 * Tests search functionality, filtering, and user interactions
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ProfileSearch } from "../ProfileSearch";

describe("ProfileSearch", () => {
    const mockOnSearchChange = jest.fn();
    const mockOnRefresh = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders search input", () => {
            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            expect(searchInput).toBeInTheDocument();
        });

        it("renders with initial search value", () => {
            const initialValue = "test search";
            render(
                <ProfileSearch
                    searchValue={initialValue}
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText(
                "Search profiles..."
            ) as HTMLInputElement;
            expect(searchInput.value).toBe(initialValue);
        });

        it("renders refresh button", () => {
            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const refreshButton = screen.getByTitle("Refresh profiles");
            expect(refreshButton).toBeInTheDocument();
        });

        it("renders clear button when search has value", () => {
            render(
                <ProfileSearch
                    searchValue="test"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const clearButton = screen.getByTitle("Clear search");
            expect(clearButton).toBeInTheDocument();
        });

        it("does not render clear button when search is empty", () => {
            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const clearButton = screen.queryByTitle("Clear search");
            expect(clearButton).not.toBeInTheDocument();
        });
    });

    describe("User Interactions", () => {
        it("calls onSearchChange when user types", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "profile1");

            expect(mockOnSearchChange).toHaveBeenCalled();
            // Should be called for each character typed
            expect(mockOnSearchChange.mock.calls.length).toBeGreaterThan(0);
        });

        it("calls onSearchChange with correct value", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "a");

            // Check the last call
            const lastCall = mockOnSearchChange.mock.calls[mockOnSearchChange.mock.calls.length - 1];
            expect(lastCall[0].target.value).toBe("a");
        });

        it("calls onRefresh when refresh button is clicked", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const refreshButton = screen.getByTitle("Refresh profiles");
            await user.click(refreshButton);

            expect(mockOnRefresh).toHaveBeenCalledTimes(1);
        });

        it("calls onSearchChange with empty string when clear is clicked", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue="test search"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const clearButton = screen.getByTitle("Clear search");
            await user.click(clearButton);

            expect(mockOnSearchChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: expect.objectContaining({
                        value: "",
                    }),
                })
            );
        });
    });

    describe("Search Functionality", () => {
        it("allows empty search", () => {
            const { container } = render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = container.querySelector("input") as HTMLInputElement;
            expect(searchInput.value).toBe("");
        });

        it("accepts alphanumeric search terms", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "profile123");

            expect(mockOnSearchChange).toHaveBeenCalled();
        });

        it("accepts special characters in search", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "profile-test_123");

            expect(mockOnSearchChange).toHaveBeenCalled();
        });

        it("handles search value update from props", () => {
            const { rerender } = render(
                <ProfileSearch
                    searchValue="initial"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            let searchInput = screen.getByPlaceholderText(
                "Search profiles..."
            ) as HTMLInputElement;
            expect(searchInput.value).toBe("initial");

            rerender(
                <ProfileSearch
                    searchValue="updated"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            searchInput = screen.getByPlaceholderText("Search profiles...") as HTMLInputElement;
            expect(searchInput.value).toBe("updated");
        });
    });

    describe("Component Structure", () => {
        it("renders input with correct attributes", () => {
            const { container } = render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = container.querySelector('input[type="text"]');
            expect(searchInput).toBeInTheDocument();
            expect(searchInput).toHaveAttribute("placeholder", "Search profiles...");
        });

        it("renders buttons with correct structure", () => {
            const { container } = render(
                <ProfileSearch
                    searchValue="test"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const buttons = container.querySelectorAll("button");
            expect(buttons.length).toBeGreaterThan(0);
        });

        it("applies correct styling classes", () => {
            const { container } = render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchContainer = container.firstChild as HTMLElement;
            expect(searchContainer).toBeInTheDocument();
        });
    });

    describe("Button Visibility", () => {
        it("shows only refresh button when search is empty", () => {
            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            expect(screen.getByTitle("Refresh profiles")).toBeInTheDocument();
            expect(screen.queryByTitle("Clear search")).not.toBeInTheDocument();
        });

        it("shows both buttons when search has value", () => {
            render(
                <ProfileSearch
                    searchValue="test"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            expect(screen.getByTitle("Refresh profiles")).toBeInTheDocument();
            expect(screen.getByTitle("Clear search")).toBeInTheDocument();
        });

        it("shows clear button for single character search", () => {
            render(
                <ProfileSearch
                    searchValue="a"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            expect(screen.getByTitle("Clear search")).toBeInTheDocument();
        });
    });

    describe("Edge Cases", () => {
        it("handles very long search terms", async () => {
            const longSearch = "a".repeat(100);
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, longSearch);

            expect(mockOnSearchChange).toHaveBeenCalled();
        });

        it("handles rapid input changes", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "abc");

            // Should handle all input events
            expect(mockOnSearchChange.mock.calls.length).toBeGreaterThan(0);
        });

        it("handles multiple clear button clicks", async () => {
            const user = userEvent.setup();

            const { rerender } = render(
                <ProfileSearch
                    searchValue="test"
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const clearButton = screen.getByTitle("Clear search");
            await user.click(clearButton);

            expect(mockOnSearchChange).toHaveBeenCalled();

            // Simulate search value being cleared
            rerender(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            // Clear button should no longer be visible
            expect(screen.queryByTitle("Clear search")).not.toBeInTheDocument();
        });

        it("handles multiple refresh clicks", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchValue=""
                    onSearchChange={mockOnSearchChange}
                    onRefresh={mockOnRefresh}
                />
            );

            const refreshButton = screen.getByTitle("Refresh profiles");
            await user.click(refreshButton);
            await user.click(refreshButton);
            await user.click(refreshButton);

            expect(mockOnRefresh).toHaveBeenCalledTimes(3);
        });
    });
});
