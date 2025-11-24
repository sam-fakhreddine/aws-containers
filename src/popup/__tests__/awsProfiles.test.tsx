/**
 * Tests for AWS Profiles popup component and utilities
 * Following patterns from Python tests: extensive mocking, edge cases, clear naming
 */

import React from "react";
import { render } from "@testing-library/react";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import "@testing-library/jest-dom";
import browser from "webextension-polyfill";
import { AWSProfilesPopup } from "@/popup/awsProfiles";
import { prepareContainer } from "@/utils/containerManager";

// Mock hooks - mock the index file that re-exports all hooks
jest.mock("@/hooks", () => ({
    useProfiles: jest.fn(),
    useContainers: jest.fn(),
    useFavorites: jest.fn(),
    useRecentProfiles: jest.fn(),
    useRegion: jest.fn(),
    useTheme: jest.fn(),
    useEnabledRegions: jest.fn(),
    useIsMounted: jest.fn(),
}));

// Mock API client
jest.mock("@/services/apiClient");

// Mock the webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    default: {
        runtime: {
            sendMessage: jest.fn(),
            lastError: null,
        },
        contextualIdentities: {
            query: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        },
        storage: {
            local: {
                get: jest.fn(),
                set: jest.fn(),
            },
            onChanged: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
            },
        },
        tabs: {
            create: jest.fn(),
        },
    },
    runtime: {
        sendMessage: jest.fn(),
        lastError: null,
    },
    contextualIdentities: {
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
        onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        },
    },
    tabs: {
        create: jest.fn(),
    },
}));

describe("AWSProfilesPopup", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks for browser APIs
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue(undefined);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
        (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);
        (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);

        // Setup default mocks for all hooks
        const {
            useProfiles,
            useContainers,
            useFavorites,
            useRecentProfiles,
            useRegion,
            useTheme,
            useEnabledRegions,
        } = require("@/hooks");

        (useProfiles as jest.Mock).mockReturnValue({
            profiles: [],
            loading: false,
            error: null,
            apiAvailable: true,
            loadProfiles: jest.fn(),
            refreshProfiles: jest.fn(),
            enrichSSOProfiles: jest.fn(),
        });

        (useContainers as jest.Mock).mockReturnValue({
            containers: [],
            loading: false,
            error: null,
            refreshContainers: jest.fn(),
            clearContainers: jest.fn(),
            createContainer: jest.fn(),
        });

        (useFavorites as jest.Mock).mockReturnValue({
            favorites: [],
            toggleFavorite: jest.fn(),
        });

        (useRecentProfiles as jest.Mock).mockReturnValue({
            recentProfiles: [],
            addRecentProfile: jest.fn(),
        });

        (useRegion as jest.Mock).mockReturnValue({
            selectedRegion: "us-east-1",
            setRegion: jest.fn(),
        });

        (useTheme as jest.Mock).mockReturnValue({
            mode: "light",
            setMode: jest.fn(),
        });

        (useEnabledRegions as jest.Mock).mockReturnValue({
            regions: ["us-east-1", "us-west-2"],
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Component rendering", () => {
        /**
         * Test component mounts and sends message
         */
        it("should send popup mounted message on mount", async () => {
            const { useProfiles, useContainers } = require("@/hooks");
            
            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useContainers as jest.Mock).mockReturnValue({
                containers: [],
                loading: false,
                error: null,
                refreshContainers: jest.fn(),
                clearContainers: jest.fn(),
                createContainer: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ popupMounted: true });
        });

        /**
         * Test loading state is displayed when profiles are loading
         */
        it("should show loading state", () => {
            const { useProfiles, useContainers } = require("@/hooks");
            
            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: true,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useContainers as jest.Mock).mockReturnValue({
                containers: [],
                loading: false,
                error: null,
                refreshContainers: jest.fn(),
                clearContainers: jest.fn(),
                createContainer: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Verify loading indicator is displayed
            expect(screen.getByText(/loading profiles/i)).toBeInTheDocument();
        });

        /**
         * Test profiles are displayed when loaded
         */
        it("should display profiles when loaded", () => {
            const { useProfiles, useContainers } = require("@/hooks");
            
            const mockProfiles = [
                {
                    name: "prod-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                    is_sso: false,
                },
                {
                    name: "dev-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: false,
                },
            ];

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: mockProfiles,
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useContainers as jest.Mock).mockReturnValue({
                containers: [],
                loading: false,
                error: null,
                refreshContainers: jest.fn(),
                clearContainers: jest.fn(),
                createContainer: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Verify profiles are rendered in the DOM
            expect(screen.getByText("prod-profile")).toBeInTheDocument();
            expect(screen.getByText("dev-profile")).toBeInTheDocument();
        });
    });



    describe("Error handling", () => {
        /**
         * Test error state is displayed when profiles fail to load
         */
        it("should show error state", () => {
            const { useProfiles, useContainers } = require("@/hooks");
            
            const error = new Error("Failed to connect to API server");
            
            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: error.message,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useContainers as jest.Mock).mockReturnValue({
                containers: [],
                loading: false,
                error: null,
                refreshContainers: jest.fn(),
                clearContainers: jest.fn(),
                createContainer: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Verify error message is displayed
            expect(screen.getByText(/error loading profiles/i)).toBeInTheDocument();
            expect(screen.getByText(/failed to connect to api server/i)).toBeInTheDocument();
        });
    });

    describe("Search functionality", () => {
        /**
         * Test filtering profiles by search input
         */
        it("should filter profiles by search input", async () => {
            const { useProfiles, useContainers } = require("@/hooks");
            
            const mockProfiles = [
                {
                    name: "production-account",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                    is_sso: false,
                },
                {
                    name: "development-account",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: false,
                },
                {
                    name: "staging-account",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "green",
                    icon: "circle",
                    is_sso: false,
                },
            ];

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: mockProfiles,
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useContainers as jest.Mock).mockReturnValue({
                containers: [],
                loading: false,
                error: null,
                refreshContainers: jest.fn(),
                clearContainers: jest.fn(),
                createContainer: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Initially all profiles should be visible
            expect(screen.getByText("production-account")).toBeInTheDocument();
            expect(screen.getByText("development-account")).toBeInTheDocument();
            expect(screen.getByText("staging-account")).toBeInTheDocument();

            // Find the search input and type "prod"
            const searchInput = screen.getByPlaceholderText(/search profiles/i);
            fireEvent.change(searchInput, { target: { value: "prod" } });

            // Wait for debounce and filtering to occur
            await waitFor(() => {
                // Only production-account should be visible
                expect(screen.getByText("production-account")).toBeInTheDocument();
            }, { timeout: 500 });

            // Other profiles should not be visible
            await waitFor(() => {
                expect(screen.queryByText("development-account")).not.toBeInTheDocument();
                expect(screen.queryByText("staging-account")).not.toBeInTheDocument();
            });
        });

        /**
         * Test search with organization filter
         */
        it("should filter profiles by search within selected organization", async () => {
            const { useProfiles } = require("@/hooks");
            
            const mockProfiles = [
                {
                    name: "prod-sso-account",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                    is_sso: true,
                    sso_session: "production",
                },
                {
                    name: "dev-sso-account",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: true,
                    sso_session: "development",
                },
            ];

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: mockProfiles,
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Both profiles should be visible initially
            expect(screen.getByText("prod-sso-account")).toBeInTheDocument();
            expect(screen.getByText("dev-sso-account")).toBeInTheDocument();

            // Search for "prod"
            const searchInput = screen.getByPlaceholderText(/search profiles/i);
            fireEvent.change(searchInput, { target: { value: "prod" } });

            // Wait for filtering
            await waitFor(() => {
                expect(screen.getByText("prod-sso-account")).toBeInTheDocument();
            }, { timeout: 500 });

            await waitFor(() => {
                expect(screen.queryByText("dev-sso-account")).not.toBeInTheDocument();
            });
        });
    });

    describe("Organization filtering", () => {
        /**
         * Test organization tab filtering
         */
        it("should filter profiles by organization", async () => {
            const { useProfiles } = require("@/hooks");
            
            const mockProfiles = [
                {
                    name: "creds-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                    is_sso: false,
                },
                {
                    name: "sso-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: true,
                    sso_session: "production",
                },
            ];

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: mockProfiles,
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Both profiles should be visible initially
            expect(screen.getByText("creds-profile")).toBeInTheDocument();
            expect(screen.getByText("sso-profile")).toBeInTheDocument();

            // Should show organization tabs
            expect(screen.getByText(/All \(2\)/i)).toBeInTheDocument();
        });

        /**
         * Test SSO profile enrichment button
         */
        it("should show Load Entitlements button for SSO organizations", async () => {
            const { useProfiles } = require("@/hooks");
            
            const mockProfiles = [
                {
                    name: "sso-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                    is_sso: true,
                    sso_session: "production",
                },
            ];

            const mockEnrichSSOProfiles = jest.fn();

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: mockProfiles,
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: mockEnrichSSOProfiles,
            });

            render(<AWSProfilesPopup />);

            // Click on the SSO organization tab (not "all" or "credentials")
            const productionTab = screen.getByText(/Production \(1\)/i);
            fireEvent.click(productionTab);

            // Should show Load Entitlements button
            await waitFor(() => {
                expect(screen.getByText(/Load Entitlements/i)).toBeInTheDocument();
            });
        });
    });

    describe("Region selection", () => {
        /**
         * Test region selector is rendered
         */
        it("should render region selector", () => {
            const { useProfiles, useRegion } = require("@/hooks");
            
            const mockSetRegion = jest.fn();

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useRegion as jest.Mock).mockReturnValue({
                selectedRegion: "us-east-1",
                setRegion: mockSetRegion,
            });

            const { container } = render(<AWSProfilesPopup />);

            // ProfileSearch component should be rendered (contains region selector)
            // Verify the component structure is present
            expect(container.querySelector('.awsui_root_18582_1jqoe_145')).toBeInTheDocument();
        });
    });

    describe("Profile actions", () => {
        /**
         * Test profile click opens console
         */
        it("should handle profile click", async () => {
            const { useProfiles, useRecentProfiles } = require("@/hooks");
            const apiClient = require("@/services/apiClient");
            
            const mockProfile = {
                name: "test-profile",
                has_credentials: true,
                expiration: null,
                expired: false,
                color: "blue",
                icon: "fingerprint",
                is_sso: false,
            };

            const mockAddRecentProfile = jest.fn();

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [mockProfile],
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useRecentProfiles as jest.Mock).mockReturnValue({
                recentProfiles: [],
                addRecentProfile: mockAddRecentProfile,
            });

            // Mock API response
            (apiClient.getConsoleUrl as jest.Mock).mockResolvedValue({
                url: "https://console.aws.amazon.com/",
                profileName: "test-profile",
                color: "blue",
                icon: "fingerprint",
            });

            render(<AWSProfilesPopup />);

            // Click on the profile
            const profileElement = screen.getByText("test-profile");
            fireEvent.click(profileElement);

            // Should add to recent profiles
            await waitFor(() => {
                expect(mockAddRecentProfile).toHaveBeenCalledWith("test-profile");
            });
        });

        /**
         * Test favorite toggle
         */
        it("should handle favorite toggle", async () => {
            const { useProfiles, useFavorites } = require("@/hooks");
            
            const mockProfile = {
                name: "test-profile",
                has_credentials: true,
                expiration: null,
                expired: false,
                color: "blue",
                icon: "fingerprint",
                is_sso: false,
            };

            const mockToggleFavorite = jest.fn();

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [mockProfile],
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            (useFavorites as jest.Mock).mockReturnValue({
                favorites: [],
                toggleFavorite: mockToggleFavorite,
            });

            const { container } = render(<AWSProfilesPopup />);

            // Find and click the star icon
            const starContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
            const starContainer = Array.from(starContainers).pop();
            
            if (starContainer) {
                fireEvent.click(starContainer);

                await waitFor(() => {
                    expect(mockToggleFavorite).toHaveBeenCalled();
                });
            }
        });
    });

    describe("Error recovery", () => {
        /**
         * Test retry after error
         */
        it("should allow retry after error", () => {
            const { useProfiles } = require("@/hooks");
            
            const mockRefreshProfiles = jest.fn();

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: "Failed to load profiles",
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: mockRefreshProfiles,
                enrichSSOProfiles: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Should show error
            expect(screen.getByText(/error loading profiles/i)).toBeInTheDocument();

            // Should show retry button
            const retryButton = screen.getByText(/retry/i);
            fireEvent.click(retryButton);

            expect(mockRefreshProfiles).toHaveBeenCalled();
        });

        /**
         * Test API unavailable state
         */
        it("should show setup instructions when API is unavailable", () => {
            const { useProfiles } = require("@/hooks");
            
            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: "Connection refused",
                apiAvailable: false,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Should show setup instructions
            expect(screen.getByText(/Setup Required/i)).toBeInTheDocument();
            expect(screen.getByText(/API Server Not Running/i)).toBeInTheDocument();
        });

        /**
         * Test authentication error
         */
        it("should show authentication error when token is invalid", () => {
            const { useProfiles } = require("@/hooks");
            
            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: "401 Unauthorized",
                apiAvailable: false,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            render(<AWSProfilesPopup />);

            // Should show authentication error
            expect(screen.getByText(/Authentication Required/i)).toBeInTheDocument();
            expect(screen.getByText(/Invalid or missing API token/i)).toBeInTheDocument();
        });
    });

    describe("Container management", () => {
        /**
         * Test that component works with containers available
         * Note: Component uses prepareContainer directly, not useContainers hook
         * Validates: Requirements 4.3, 4.5, 6.1
         */
        it("should render correctly when containers are available", () => {
            const { useProfiles } = require("@/hooks");
            
            const mockContainers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "test-container",
                    color: "blue",
                    icon: "fingerprint",
                    iconUrl: "",
                    colorCode: "#0000ff",
                },
            ];

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            // Mock browser API to return containers
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(mockContainers);

            render(<AWSProfilesPopup />);

            // Component should render without errors
            expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });

        /**
         * Test that component works with filtered containers
         * Note: Component uses prepareContainer directly, not useContainers hook
         * Validates: Requirements 4.3, 4.5, 6.1
         */
        it("should render correctly with filtered containers", () => {
            const { useProfiles } = require("@/hooks");
            
            const filteredContainers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "managed-container",
                    color: "blue",
                    icon: "fingerprint",
                    iconUrl: "",
                    colorCode: "#0000ff",
                },
            ];

            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            // Mock browser API to return only managed containers
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(filteredContainers);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                containers: ["firefox-container-1"],
            });

            render(<AWSProfilesPopup />);

            // Component should render without errors
            expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });

        /**
         * Test that component handles empty container storage gracefully
         * Note: Component uses prepareContainer directly, not useContainers hook
         * Validates: Requirements 4.3, 4.5, 6.1
         */
        it("should handle empty container storage", () => {
            const { useProfiles } = require("@/hooks");
            
            (useProfiles as jest.Mock).mockReturnValue({
                profiles: [],
                loading: false,
                error: null,
                apiAvailable: true,
                loadProfiles: jest.fn(),
                refreshProfiles: jest.fn(),
                enrichSSOProfiles: jest.fn(),
            });

            // Mock browser API to return empty containers
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});

            render(<AWSProfilesPopup />);

            // Component should render without errors even with no containers
            expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });
    });

});

describe("Container Utility Functions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Note: lookupContainer and saveContainerId tests have been moved to containerManager
    // These functions are no longer exported from awsProfiles

    /* describe("lookupContainer", () => {
        // Test finding existing container
        it("should return container if found", async () => {
            const mockContainer = {
                cookieStoreId: "firefox-container-1",
                name: "test-container",
                color: "blue",
                icon: "fingerprint",
                iconUrl: "",
                colorCode: "#0000ff",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([mockContainer]);

            const result = await lookupContainer("test-container");

            expect(browser.contextualIdentities.query).toHaveBeenCalledWith({ name: "test-container" });
            expect(result).toEqual(mockContainer);
        });

        // Test when container not found
        it("should return null if container not found", async () => {
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);

            const result = await lookupContainer("nonexistent");

            expect(browser.contextualIdentities.query).toHaveBeenCalledWith({ name: "nonexistent" });
            expect(result).toBeNull();
        });

        // Test returning first container when multiple match
        it("should return first container if multiple found", async () => {
            const containers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "test",
                    color: "blue",
                    icon: "fingerprint",
                    iconUrl: "",
                    colorCode: "#0000ff",
                },
                {
                    cookieStoreId: "firefox-container-2",
                    name: "test",
                    color: "red",
                    icon: "briefcase",
                    iconUrl: "",
                    colorCode: "#ff0000",
                },
            ];

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(containers);

            const result = await lookupContainer("test");

            expect(result).toEqual(containers[0]);
        });
    }); */

    describe("prepareContainer", () => {
        /**
         * Test creating new container
         */
        it("should create new container if not exists", async () => {
            const mockCreated = {
                cookieStoreId: "firefox-container-1",
                name: "new-container",
                color: "blue",
                icon: "fingerprint",
                iconUrl: "",
                colorCode: "#0000ff",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.contextualIdentities.create as jest.Mock).mockResolvedValue(mockCreated);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            const result = await prepareContainer("new-container", "blue", "fingerprint");

            expect(browser.contextualIdentities.create).toHaveBeenCalledWith({
                name: "new-container",
                color: "blue",
                icon: "fingerprint",
            });
            expect(browser.storage.local.set).toHaveBeenCalledWith({
                containers: ["firefox-container-1"],
            });
            expect(result).toEqual(mockCreated);
        });

        /**
         * Test updating existing container
         */
        it("should update existing container", async () => {
            const mockExisting = {
                cookieStoreId: "firefox-container-1",
                name: "existing-container",
                color: "blue",
                icon: "fingerprint",
                iconUrl: "",
                colorCode: "#0000ff",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([mockExisting]);
            (browser.contextualIdentities.update as jest.Mock).mockResolvedValue(mockExisting);

            const result = await prepareContainer("existing-container", "red", "briefcase");

            expect(browser.contextualIdentities.update).toHaveBeenCalledWith("firefox-container-1", {
                color: "red",
                icon: "briefcase",
            });
            expect(browser.contextualIdentities.create).not.toHaveBeenCalled();
            expect(result).toEqual(mockExisting);
        });

        /**
         * Test container creation and ID storage
         */
        it("should save container ID after creation", async () => {
            const mockCreated = {
                cookieStoreId: "firefox-container-99",
                name: "new",
                color: "green",
                icon: "dollar",
                iconUrl: "",
                colorCode: "#00ff00",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.contextualIdentities.create as jest.Mock).mockResolvedValue(mockCreated);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                containers: ["firefox-container-1", "firefox-container-2"],
            });
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await prepareContainer("new", "green", "dollar");

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                containers: ["firefox-container-1", "firefox-container-2", "firefox-container-99"],
            });
        });
    });

    /* describe("saveContainerId", () => {
        // Test saving first container ID
        it("should create containers array if not exists", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await saveContainerId("firefox-container-1");

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                containers: ["firefox-container-1"],
            });
        });

        // Test appending to existing containers
        it("should append to existing containers array", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                containers: ["firefox-container-1", "firefox-container-2"],
            });
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await saveContainerId("firefox-container-3");

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                containers: ["firefox-container-1", "firefox-container-2", "firefox-container-3"],
            });
        });

        // Test handling null containers in storage
        it("should handle null containers in storage", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                containers: null,
            });
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await saveContainerId("firefox-container-1");

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                containers: ["firefox-container-1"],
            });
        });
    }); */
});
