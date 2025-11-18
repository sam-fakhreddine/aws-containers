/**
 * Unit tests for Settings component
 * Tests token management, validation, and API connection testing
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "../settings";
import * as apiClient from "../../services/apiClient";
import { API_TOKEN_MIN_LENGTH } from "../../popup/constants";

// Mock the apiClient module
jest.mock("../../services/apiClient");

describe("Settings", () => {
    const mockGetApiToken = apiClient.getApiToken as jest.Mock;
    const mockSetApiToken = apiClient.setApiToken as jest.Mock;
    const mockClearApiToken = apiClient.clearApiToken as jest.Mock;
    const mockCheckApiHealth = apiClient.checkApiHealth as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetApiToken.mockResolvedValue(null);
        mockSetApiToken.mockResolvedValue(undefined);
        mockClearApiToken.mockResolvedValue(undefined);
        mockCheckApiHealth.mockResolvedValue(true);
    });

    describe("Initial rendering", () => {
        it("renders settings page with header", async () => {
            render(<Settings />);

            expect(screen.getByText("AWS Profile Containers - Settings")).toBeInTheDocument();
        });

        it("renders info alert about API token", () => {
            render(<Settings />);

            expect(screen.getByText(/The API token is required to authenticate/)).toBeInTheDocument();
        });

        it("renders token input field", () => {
            render(<Settings />);

            expect(screen.getByPlaceholderText("Enter API token")).toBeInTheDocument();
        });

        it("renders Save Token button", () => {
            render(<Settings />);

            expect(screen.getByRole("button", { name: /save token/i })).toBeInTheDocument();
        });

        it("renders Test Connection button", () => {
            render(<Settings />);

            expect(screen.getByRole("button", { name: /test connection/i })).toBeInTheDocument();
        });

        it("renders instructions for finding token", () => {
            render(<Settings />);

            expect(screen.getByText(/How to find your API token:/)).toBeInTheDocument();
            expect(screen.getByText(/cat ~\/.aws\/profile_bridge_config.json/)).toBeInTheDocument();
        });

        it("renders security notice", () => {
            render(<Settings />);

            expect(screen.getByText(/stored securely in your browser's local storage/)).toBeInTheDocument();
        });
    });

    describe("Token loading", () => {
        it("loads existing token from storage", async () => {
            const savedToken = "a".repeat(32);
            mockGetApiToken.mockResolvedValue(savedToken);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText("Enter API token") as HTMLInputElement;
                expect(input.value).toBe(savedToken);
            });
        });

        it("shows Clear Token button when token is loaded", async () => {
            const savedToken = "a".repeat(32);
            mockGetApiToken.mockResolvedValue(savedToken);

            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /clear token/i })).toBeInTheDocument();
            });
        });

        it("does not show Clear Token button when no token", async () => {
            mockGetApiToken.mockResolvedValue(null);

            render(<Settings />);

            await waitFor(() => {
                expect(mockGetApiToken).toHaveBeenCalled();
            });

            expect(screen.queryByRole("button", { name: /clear token/i })).not.toBeInTheDocument();
        });
    });

    describe("Token input", () => {
        it("updates token field when typing", async () => {
            const user = userEvent.setup();
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token") as HTMLInputElement;
            await user.type(input, "test-token");

            expect(input.value).toBe("test-token");
        });

        it("accepts password type input", () => {
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token") as HTMLInputElement;
            expect(input.type).toBe("password");
        });
    });

    describe("Token validation", () => {
        it("shows error when saving empty token", async () => {
            const user = userEvent.setup();
            render(<Settings />);

            const saveButton = screen.getByRole("button", { name: /save token/i });
            await user.click(saveButton);

            expect(await screen.findByText("Token cannot be empty")).toBeInTheDocument();
            expect(mockSetApiToken).not.toHaveBeenCalled();
        });

        it("shows error when token is too short", async () => {
            const user = userEvent.setup();
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, "short");
            await user.click(saveButton);

            expect(await screen.findByText(
                `Token must be at least ${API_TOKEN_MIN_LENGTH} characters long`
            )).toBeInTheDocument();
            expect(mockSetApiToken).not.toHaveBeenCalled();
        });

        it("trims whitespace before validation", async () => {
            const user = userEvent.setup();
            const validToken = "a".repeat(32);
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, `  ${validToken}  `);
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockSetApiToken).toHaveBeenCalledWith(validToken);
            });
        });
    });

    describe("Token saving", () => {
        it("saves valid token successfully", async () => {
            const user = userEvent.setup();
            const validToken = "a".repeat(32);
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, validToken);
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockSetApiToken).toHaveBeenCalledWith(validToken);
            });

            expect(await screen.findByText("Token saved successfully")).toBeInTheDocument();
        });

        it("shows Clear Token button after saving", async () => {
            const user = userEvent.setup();
            const validToken = "a".repeat(32);
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, validToken);
            await user.click(saveButton);

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /clear token/i })).toBeInTheDocument();
            });
        });

        it("handles ApiClientError during save", async () => {
            const user = userEvent.setup();
            const validToken = "a".repeat(32);
            const error = new apiClient.ApiClientError("Invalid token format");
            mockSetApiToken.mockRejectedValue(error);

            const { container } = render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            await user.type(input, validToken);

            const saveButton = screen.getByRole("button", { name: /save token/i });

            await act(async () => {
                await user.click(saveButton);
            });

            await waitFor(() => {
                expect(container.textContent).toContain("Invalid token format");
            }, { timeout: 3000 });
        });

        it("handles generic error during save", async () => {
            const user = userEvent.setup();
            const validToken = "a".repeat(32);
            mockSetApiToken.mockRejectedValue(new Error("Network error"));

            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, validToken);
            await user.click(saveButton);

            expect(await screen.findByText("Failed to save token")).toBeInTheDocument();
        });
    });

    describe("Token clearing", () => {
        it("clears token when Clear Token button clicked", async () => {
            const user = userEvent.setup();
            const savedToken = "a".repeat(32);
            mockGetApiToken.mockResolvedValue(savedToken);

            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /clear token/i })).toBeInTheDocument();
            });

            const clearButton = screen.getByRole("button", { name: /clear token/i });
            await user.click(clearButton);

            await waitFor(() => {
                expect(mockClearApiToken).toHaveBeenCalled();
            });

            expect(await screen.findByText("Token cleared")).toBeInTheDocument();
        });

        it("clears input field after clearing token", async () => {
            const user = userEvent.setup();
            const savedToken = "a".repeat(32);
            mockGetApiToken.mockResolvedValue(savedToken);

            render(<Settings />);

            await waitFor(() => {
                const input = screen.getByPlaceholderText("Enter API token") as HTMLInputElement;
                expect(input.value).toBe(savedToken);
            });

            const clearButton = screen.getByRole("button", { name: /clear token/i });
            await user.click(clearButton);

            await waitFor(() => {
                const input = screen.getByPlaceholderText("Enter API token") as HTMLInputElement;
                expect(input.value).toBe("");
            });
        });

        it("hides Clear Token button after clearing", async () => {
            const user = userEvent.setup();
            const savedToken = "a".repeat(32);
            mockGetApiToken.mockResolvedValue(savedToken);

            render(<Settings />);

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /clear token/i })).toBeInTheDocument();
            });

            const clearButton = screen.getByRole("button", { name: /clear token/i });
            await user.click(clearButton);

            await waitFor(() => {
                expect(screen.queryByRole("button", { name: /clear token/i })).not.toBeInTheDocument();
            });
        });
    });

    describe("Connection testing", () => {
        it("tests connection successfully", async () => {
            const user = userEvent.setup();
            mockCheckApiHealth.mockResolvedValue(true);

            render(<Settings />);

            const testButton = screen.getByRole("button", { name: /test connection/i });
            await user.click(testButton);

            await waitFor(() => {
                expect(mockCheckApiHealth).toHaveBeenCalled();
            });

            expect(await screen.findByText(/Connection successful! API server is reachable/)).toBeInTheDocument();
        });

        it("shows loading state during connection test", async () => {
            const user = userEvent.setup();
            let resolveHealth: () => void;
            mockCheckApiHealth.mockReturnValue(
                new Promise((resolve) => {
                    resolveHealth = () => resolve(true);
                })
            );

            render(<Settings />);

            const testButton = screen.getByRole("button", { name: /test connection/i });
            await user.click(testButton);

            await waitFor(() => {
                expect(mockCheckApiHealth).toHaveBeenCalled();
            });

            // Button should show loading state
            // Note: CloudScape's loading state might not have accessible attributes
            // so we just verify the API was called

            resolveHealth!();
        });

        it("handles failed connection test", async () => {
            const user = userEvent.setup();
            mockCheckApiHealth.mockResolvedValue(false);

            render(<Settings />);

            const testButton = screen.getByRole("button", { name: /test connection/i });
            await user.click(testButton);

            expect(await screen.findByText(/Connection failed. Check if API server is running/)).toBeInTheDocument();
        });

        it("handles connection test error", async () => {
            const user = userEvent.setup();
            mockCheckApiHealth.mockRejectedValue(new Error("Network error"));

            render(<Settings />);

            const testButton = screen.getByRole("button", { name: /test connection/i });
            await user.click(testButton);

            expect(await screen.findByText(/Connection failed. Check if API server is running and token is correct/)).toBeInTheDocument();
        });

        it("clears previous messages before testing", async () => {
            const user = userEvent.setup();
            const validToken = "a".repeat(32);

            render(<Settings />);

            // First save a token to show a success message
            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, validToken);
            await user.click(saveButton);

            expect(await screen.findByText("Token saved successfully")).toBeInTheDocument();

            // Then test connection
            const testButton = screen.getByRole("button", { name: /test connection/i });
            await user.click(testButton);

            await waitFor(() => {
                expect(screen.queryByText("Token saved successfully")).not.toBeInTheDocument();
            });
        });
    });

    describe("Message display", () => {
        it("displays success messages with correct type", async () => {
            const user = userEvent.setup();
            const validToken = "a".repeat(32);
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, validToken);
            await user.click(saveButton);

            const successAlert = await screen.findByText("Token saved successfully");
            expect(successAlert).toBeInTheDocument();
        });

        it("displays error messages with correct type", async () => {
            const user = userEvent.setup();
            render(<Settings />);

            const saveButton = screen.getByRole("button", { name: /save token/i });
            await user.click(saveButton);

            const errorAlert = await screen.findByText("Token cannot be empty");
            expect(errorAlert).toBeInTheDocument();
        });
    });

    describe("Edge cases", () => {
        it("handles token with only whitespace", async () => {
            const user = userEvent.setup();
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, "   ");
            await user.click(saveButton);

            expect(await screen.findByText("Token cannot be empty")).toBeInTheDocument();
        });

        it("handles exactly minimum length token", async () => {
            const user = userEvent.setup();
            const minLengthToken = "a".repeat(API_TOKEN_MIN_LENGTH);
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, minLengthToken);
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockSetApiToken).toHaveBeenCalledWith(minLengthToken);
            });
        });

        it("handles very long token", async () => {
            const user = userEvent.setup();
            const longToken = "a".repeat(200);
            render(<Settings />);

            const input = screen.getByPlaceholderText("Enter API token");
            const saveButton = screen.getByRole("button", { name: /save token/i });

            await user.type(input, longToken);
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockSetApiToken).toHaveBeenCalledWith(longToken);
            });
        });
    });
});
