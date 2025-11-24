/**
 * Tests for Settings component
 * Tests settings UI, token management, and region configuration
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Settings } from "@/settings/settings";
import * as apiClient from "@/services/apiClient";
import { browser } from "@/services/browserUtils";
import { STORAGE_KEYS } from "@/constants";

// Mock the apiClient module
jest.mock("@/services/apiClient", () => ({
    getApiToken: jest.fn(),
    setApiToken: jest.fn(),
    clearApiToken: jest.fn(),
    checkApiHealth: jest.fn(),
    getRegions: jest.fn(),
    isLegacyToken: jest.fn(),
    ApiClientError: class ApiClientError extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
            super(message);
            this.name = "ApiClientError";
            this.statusCode = statusCode;
        }
    },
}));

// Mock browser storage
jest.mock("@/services/browserUtils", () => ({
    browser: {
        storage: {
            local: {
                get: jest.fn(),
                set: jest.fn(),
            },
        },
    },
}));

describe("Settings", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mock implementations
        (apiClient.getApiToken as jest.Mock).mockResolvedValue(null);
        (apiClient.isLegacyToken as jest.Mock).mockReturnValue(false);
        (apiClient.getRegions as jest.Mock).mockResolvedValue({
            regions: [
                { code: "us-east-1", name: "US East (N. Virginia)" },
                { code: "us-west-2", name: "US West (Oregon)" },
                { code: "eu-west-1", name: "Europe (Ireland)" },
            ],
        });
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
    });

    describe("Rendering", () => {
        it("should render settings page with main sections", async () => {
            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByText(/AWS Profile Containers - Settings/i)).toBeInTheDocument();
            });

            // Should show token input
            expect(screen.getByPlaceholderText(/Enter API token/i)).toBeInTheDocument();
            
            // Should show regions heading
            expect(screen.getByText(/Enabled Regions/i)).toBeInTheDocument();
        });

        it("should render token input field", async () => {
            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i);
                expect(input).toBeInTheDocument();
                expect(input).toHaveAttribute("type", "password");
            });
        });

        it("should render action buttons", async () => {
            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /Save Token/i })).toBeInTheDocument();
                expect(screen.getByRole("button", { name: /Test Connection/i })).toBeInTheDocument();
            });
        });
    });

    describe("Token Loading", () => {
        it("should load saved token on mount", async () => {
            const savedToken = "test_token_123";
            (apiClient.getApiToken as jest.Mock).mockResolvedValue(savedToken);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i) as HTMLInputElement;
                expect(input.value).toBe(savedToken);
            });
        });

        it("should show legacy token warning when token is legacy format", async () => {
            const legacyToken = "old_format_token_12345678901234567890";
            (apiClient.getApiToken as jest.Mock).mockResolvedValue(legacyToken);
            (apiClient.isLegacyToken as jest.Mock).mockReturnValue(true);

            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByText(/Legacy Token Format Detected/i)).toBeInTheDocument();
            });
        });

        it("should not show legacy warning for new format tokens", async () => {
            const newToken = "awspc_abc123def456_xyz789";
            (apiClient.getApiToken as jest.Mock).mockResolvedValue(newToken);
            (apiClient.isLegacyToken as jest.Mock).mockReturnValue(false);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i);
                expect(input).toBeInTheDocument();
            });

            // Should not show legacy warning
            expect(screen.queryByText(/Legacy Token Format Detected/i)).not.toBeInTheDocument();
        });
    });

    describe("Token Saving", () => {
        it("should save token when Save Token button is clicked", async () => {
            (apiClient.setApiToken as jest.Mock).mockResolvedValue(undefined);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i);
                fireEvent.change(input, { target: { value: "new_token_123" } });
            });

            const saveButton = screen.getByRole("button", { name: /Save Token/i });
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(apiClient.setApiToken).toHaveBeenCalledWith("new_token_123");
                expect(screen.getByText(/Token saved successfully/i)).toBeInTheDocument();
            });
        });

        it("should show error when trying to save empty token", async () => {
            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i);
                fireEvent.change(input, { target: { value: "   " } });
            });

            const saveButton = screen.getByRole("button", { name: /Save Token/i });
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(screen.getByText(/Token cannot be empty/i)).toBeInTheDocument();
            });

            expect(apiClient.setApiToken).not.toHaveBeenCalled();
        });

        it("should show warning when saving legacy token", async () => {
            (apiClient.setApiToken as jest.Mock).mockResolvedValue(undefined);
            (apiClient.isLegacyToken as jest.Mock).mockReturnValue(true);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i);
                fireEvent.change(input, { target: { value: "legacy_token_format" } });
            });

            const saveButton = screen.getByRole("button", { name: /Save Token/i });
            fireEvent.click(saveButton);

            await waitFor(() => {
                // Check that the token was saved
                expect(apiClient.setApiToken).toHaveBeenCalledWith("legacy_token_format");
                // Check for warning about rotating token
                expect(screen.getByText(/rotate to the new format/i)).toBeInTheDocument();
            });
        });

        it("should handle API errors when saving token", async () => {
            const error = new (apiClient as any).ApiClientError("Invalid token", 400);
            (apiClient.setApiToken as jest.Mock).mockRejectedValue(error);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i);
                fireEvent.change(input, { target: { value: "invalid_token" } });
            });

            const saveButton = screen.getByRole("button", { name: /Save Token/i });
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(screen.getByText(/Invalid token/i)).toBeInTheDocument();
            });
        });
    });

    describe("Token Testing", () => {
        it("should test connection when Test Connection button is clicked", async () => {
            (apiClient.checkApiHealth as jest.Mock).mockResolvedValue(true);

            render(<Settings />);

            await waitFor(() => {
                const testButton = screen.getByRole("button", { name: /Test Connection/i });
                fireEvent.click(testButton);
            });

            await waitFor(() => {
                expect(apiClient.checkApiHealth).toHaveBeenCalled();
                expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
            });
        });

        it("should show error when connection test fails", async () => {
            (apiClient.checkApiHealth as jest.Mock).mockResolvedValue(false);

            render(<Settings />);

            await waitFor(() => {
                const testButton = screen.getByRole("button", { name: /Test Connection/i });
                fireEvent.click(testButton);
            });

            await waitFor(() => {
                expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
            });
        });

        it("should handle exceptions during connection test", async () => {
            (apiClient.checkApiHealth as jest.Mock).mockRejectedValue(new Error("Network error"));

            render(<Settings />);

            await waitFor(() => {
                const testButton = screen.getByRole("button", { name: /Test Connection/i });
                fireEvent.click(testButton);
            });

            await waitFor(() => {
                expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
            });
        });
    });

    describe("Token Clearing", () => {
        it("should show Clear Token button when token is saved", async () => {
            (apiClient.getApiToken as jest.Mock).mockResolvedValue("saved_token");

            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /Clear Token/i })).toBeInTheDocument();
            });
        });

        it("should not show Clear Token button when no token is saved", async () => {
            (apiClient.getApiToken as jest.Mock).mockResolvedValue(null);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/Enter API token/i);
                expect(input).toBeInTheDocument();
            });

            expect(screen.queryByRole("button", { name: /Clear Token/i })).not.toBeInTheDocument();
        });

        it("should clear token when Clear Token button is clicked", async () => {
            (apiClient.getApiToken as jest.Mock).mockResolvedValue("saved_token");
            (apiClient.clearApiToken as jest.Mock).mockResolvedValue(undefined);

            render(<Settings />);

            await waitFor(() => {
                const clearButton = screen.getByRole("button", { name: /Clear Token/i });
                fireEvent.click(clearButton);
            });

            await waitFor(() => {
                expect(apiClient.clearApiToken).toHaveBeenCalled();
                expect(screen.getByText(/Token cleared/i)).toBeInTheDocument();
            });
        });
    });

    describe("Region Loading", () => {
        it("should load regions on mount", async () => {
            render(<Settings />);

            await waitFor(() => {
                expect(apiClient.getRegions).toHaveBeenCalled();
            });
        });

        it("should display loaded regions", async () => {
            render(<Settings />);

            await waitFor(() => {
                // Check that regions are rendered as checkboxes
                const checkboxes = screen.getAllByRole("checkbox");
                // Should have at least 4 checkboxes (3 regions + 1 for separate regions setting)
                expect(checkboxes.length).toBeGreaterThanOrEqual(4);
            });
        });

        it("should show loading state while regions are loading", async () => {
            let resolveRegions: any;
            (apiClient.getRegions as jest.Mock).mockReturnValue(
                new Promise((resolve) => {
                    resolveRegions = resolve;
                })
            );

            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByText(/Loading regions/i)).toBeInTheDocument();
            });

            // Resolve the promise
            resolveRegions({
                regions: [{ code: "us-east-1", name: "US East (N. Virginia)" }],
            });

            await waitFor(() => {
                expect(screen.queryByText(/Loading regions/i)).not.toBeInTheDocument();
            });
        });

        it("should show warning when regions fail to load", async () => {
            (apiClient.getRegions as jest.Mock).mockRejectedValue(new Error("Failed to load"));

            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByText(/Unable to load regions/i)).toBeInTheDocument();
            });
        });
    });

    describe("Region Selection", () => {
        it("should load enabled regions from storage", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.ENABLED_REGIONS]: ["us-east-1", "eu-west-1"],
            });

            render(<Settings />);

            await waitFor(() => {
                expect(browser.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.ENABLED_REGIONS);
            });
        });

        it("should handle Select All button click", async () => {
            render(<Settings />);

            // Wait for regions to load
            await waitFor(() => {
                const checkboxes = screen.getAllByRole("checkbox");
                expect(checkboxes.length).toBeGreaterThan(0);
            });

            // Get all Select All buttons and click the first one (regions section)
            const selectAllButtons = screen.getAllByRole("button", { name: /Select All/i });
            fireEvent.click(selectAllButtons[0]);

            await waitFor(() => {
                expect(browser.storage.local.set).toHaveBeenCalledWith({
                    [STORAGE_KEYS.ENABLED_REGIONS]: expect.arrayContaining(["us-east-1", "us-west-2", "eu-west-1"]),
                });
            }, { timeout: 2000 });
        });

        it("should handle Deselect All button click", async () => {
            (browser.storage.local.get as jest.Mock).mockImplementation((key) => {
                if (key === STORAGE_KEYS.ENABLED_REGIONS) {
                    return Promise.resolve({ [STORAGE_KEYS.ENABLED_REGIONS]: ["us-east-1"] });
                }
                return Promise.resolve({});
            });

            render(<Settings />);

            // Wait for regions to load and button to be enabled
            await waitFor(() => {
                const deselectAllButtons = screen.getAllByRole("button", { name: /Deselect All/i });
                expect(deselectAllButtons[0]).not.toBeDisabled();
            });

            // Get all Deselect All buttons and click the first one (regions section)
            const deselectAllButtons = screen.getAllByRole("button", { name: /Deselect All/i });
            fireEvent.click(deselectAllButtons[0]);

            await waitFor(() => {
                expect(browser.storage.local.set).toHaveBeenCalledWith({
                    [STORAGE_KEYS.ENABLED_REGIONS]: [],
                });
            }, { timeout: 2000 });
        });
    });

    describe("Separate Regions Setting", () => {
        it("should load separate regions setting from storage", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.SEPARATE_REGIONS_IN_CONTAINERS]: true,
            });

            render(<Settings />);

            await waitFor(() => {
                expect(browser.storage.local.get).toHaveBeenCalledWith(
                    STORAGE_KEYS.SEPARATE_REGIONS_IN_CONTAINERS
                );
            });
        });

        it("should save separate regions setting when toggled", async () => {
            render(<Settings />);

            await waitFor(() => {
                const checkbox = screen.getByText(/Open each region in a separate container/i);
                fireEvent.click(checkbox);
            });

            await waitFor(() => {
                expect(browser.storage.local.set).toHaveBeenCalledWith({
                    [STORAGE_KEYS.SEPARATE_REGIONS_IN_CONTAINERS]: true,
                });
            });
        });
    });
});
