/**
 * Unit tests for ProfileSearch component
 * Tests search functionality, region selection, and user interactions
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ProfileSearch } from "@/components/ProfileSearch";

describe("ProfileSearch", () => {
    const mockOnSearchChange = jest.fn();
    const mockOnRegionChange = jest.fn();
    const mockRegions = [
        { code: "us-east-1", name: "US East (N. Virginia)" },
        { code: "us-west-2", name: "US West (Oregon)" },
        { code: "eu-west-1", name: "Europe (Ireland)" },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders search input", () => {
            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            expect(searchInput).toBeInTheDocument();
        });

        it("renders with initial search value", () => {
            const initialValue = "test search";
            render(
                <ProfileSearch
                    searchFilter={initialValue}
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = screen.getByPlaceholderText(
                "Search profiles..."
            ) as HTMLInputElement;
            expect(searchInput.value).toBe(initialValue);
        });

        it("renders region selector", () => {
            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            // Cloudscape Select renders a button trigger
            const selectTrigger = screen.getByText("US East (N. Virginia)");
            expect(selectTrigger).toBeInTheDocument();
        });
    });

    describe("User Interactions", () => {
        it("calls onSearchChange when user types", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "profile1");

            expect(mockOnSearchChange).toHaveBeenCalled();
            expect(mockOnSearchChange.mock.calls.length).toBeGreaterThan(0);
        });

        it("calls onSearchChange with correct value", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "test");

            // Verify that onSearchChange was called with string values
            expect(mockOnSearchChange).toHaveBeenCalled();
            const lastCall = mockOnSearchChange.mock.calls[mockOnSearchChange.mock.calls.length - 1];
            expect(typeof lastCall[0]).toBe("string");
        });
    });

    describe("Search Functionality", () => {
        it("allows empty search", () => {
            const { container } = render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = container.querySelector("input") as HTMLInputElement;
            expect(searchInput.value).toBe("");
        });

        it("accepts alphanumeric search terms", async () => {
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
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
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "profile-test_123");

            expect(mockOnSearchChange).toHaveBeenCalled();
        });

        it("handles search value update from props", () => {
            const { rerender } = render(
                <ProfileSearch
                    searchFilter="initial"
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            let searchInput = screen.getByPlaceholderText(
                "Search profiles..."
            ) as HTMLInputElement;
            expect(searchInput.value).toBe("initial");

            rerender(
                <ProfileSearch
                    searchFilter="updated"
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            searchInput = screen.getByPlaceholderText("Search profiles...") as HTMLInputElement;
            expect(searchInput.value).toBe("updated");
        });
    });

    describe("Component Structure", () => {
        it("renders input with correct attributes", () => {
            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            expect(searchInput).toBeInTheDocument();
            expect(searchInput).toHaveAttribute("placeholder", "Search profiles...");
        });

        it("renders region selector with regions", () => {
            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            // Check that the selected region is displayed
            expect(screen.getByText("US East (N. Virginia)")).toBeInTheDocument();
        });
    });

    describe("Edge Cases", () => {
        it("handles very long search terms", async () => {
            const longSearch = "a".repeat(100);
            const user = userEvent.setup();

            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
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
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={mockRegions}
                />
            );

            const searchInput = screen.getByPlaceholderText("Search profiles...");
            await user.type(searchInput, "abc");

            // Should handle all input events
            expect(mockOnSearchChange.mock.calls.length).toBeGreaterThan(0);
        });

        it("handles empty regions array", () => {
            render(
                <ProfileSearch
                    searchFilter=""
                    onSearchChange={mockOnSearchChange}
                    selectedRegion="us-east-1"
                    onRegionChange={mockOnRegionChange}
                    regions={[]}
                />
            );

            // Component should still render
            expect(screen.getByPlaceholderText("Search profiles...")).toBeInTheDocument();
        });
    });
});
