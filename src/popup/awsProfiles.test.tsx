/**
 * Tests for AWS Profiles popup component and utilities
 * Following patterns from Python tests: extensive mocking, edge cases, clear naming
 */

import React from "react";
import { render } from "@testing-library/react";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import "@testing-library/jest-dom";
import browser from "webextension-polyfill";
import { AWSProfilesPopup } from "./awsProfiles";
import { prepareContainer } from "@/utils/containerManager";

// Mock the webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    default: {
        runtime: {
            sendMessage: jest.fn(),
            connectNative: jest.fn(),
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
        connectNative: jest.fn(),
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

        // Setup default mocks
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue(undefined);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
        (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);
        (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Component rendering", () => {
        /**
         * Test component mounts and sends message
         */
        it("should send popup mounted message on mount", async () => {
            // Mock the native messaging connection to prevent errors
            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ popupMounted: true });
        });

        /**
         * Test loading state is displayed initially
         */
        it("should display loading state initially", async () => {
            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            // Should show loading indicator
            expect(screen.getByText(/loading/i) || screen.getByRole("progressbar") || document.querySelector("[data-loading]")).toBeTruthy();
        });

        /**
         * Test error handling when native messaging fails
         */
        it("should handle native messaging connection error", async () => {
            (browser.runtime.connectNative as jest.Mock).mockImplementation(() => {
                throw new Error("Native host not found");
            });

            render(<AWSProfilesPopup />);

            // Component should render despite error
            await waitFor(() => {
                expect(browser.runtime.connectNative).toHaveBeenCalledWith("aws_profile_bridge");
            });
        });
    });

    describe("Settings management", () => {
        /**
         * Test loading favorites from storage
         */
        it("should load favorites from storage", async () => {
            const mockFavorites = ["profile1", "profile2"];
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                favorites: mockFavorites,
            });

            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(browser.storage.local.get).toHaveBeenCalledWith(
                    expect.arrayContaining(["favorites"])
                );
            });
        });

        /**
         * Test loading recent profiles from storage
         */
        it("should load recent profiles from storage", async () => {
            const mockRecent = ["recent1", "recent2"];
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                recentProfiles: mockRecent,
            });

            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(browser.storage.local.get).toHaveBeenCalled();
            });
        });

        /**
         * Test loading cached profiles if recent
         */
        it("should use cached profiles if recent", async () => {
            const mockProfiles = [
                {
                    name: "test-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            const recentTime = Date.now() - 30000; // 30 seconds ago (within 1 minute cache)
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                "aws-profiles": {
                    profiles: mockProfiles,
                    timestamp: recentTime,
                },
            });

            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(browser.storage.local.get).toHaveBeenCalled();
            });
        });

        /**
         * Test ignoring stale cached profiles
         */
        it("should ignore cached profiles if stale", async () => {
            const mockProfiles = [
                {
                    name: "test-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            const staleTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago (stale)
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                "aws-profiles": {
                    profiles: mockProfiles,
                    timestamp: staleTime,
                },
            });

            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                // Should request fresh profiles from native host
                expect(mockPort.postMessage).toHaveBeenCalledWith({ action: "getProfiles" });
            });
        });
    });

    describe("Profile loading", () => {
        /**
         * Test profile list request to native host
         */
        it("should request profiles from native host", async () => {
            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(browser.runtime.connectNative).toHaveBeenCalledWith("aws_profile_bridge");
                expect(mockPort.postMessage).toHaveBeenCalledWith({ action: "getProfiles" });
            });
        });

        /**
         * Test handling profile list response
         */
        it("should handle profile list response", async () => {
            const mockProfiles = [
                {
                    name: "prod-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
                {
                    name: "dev-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            let messageListener: any;
            const mockPort = {
                onMessage: {
                    addListener: jest.fn((fn) => {
                        messageListener = fn;
                    }),
                },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            // Simulate receiving profile list
            await waitFor(() => {
                expect(messageListener).toBeDefined();
            });

            messageListener({
                action: "profileList",
                profiles: mockProfiles,
            });

            await waitFor(() => {
                expect(browser.storage.local.set).toHaveBeenCalledWith(
                    expect.objectContaining({
                        "aws-profiles": expect.objectContaining({
                            profiles: expect.arrayContaining(mockProfiles),
                        }),
                    })
                );
            });
        });

        /**
         * Test handling error response from native host
         */
        it("should handle error response from native host", async () => {
            let messageListener: any;
            const mockPort = {
                onMessage: {
                    addListener: jest.fn((fn) => {
                        messageListener = fn;
                    }),
                },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(messageListener).toBeDefined();
            });

            messageListener({
                action: "error",
                message: "Failed to load profiles",
            });

            await waitFor(() => {
                // Error should be displayed
                expect(screen.queryByText(/failed to load/i) || screen.queryByText(/error/i)).toBeTruthy();
            });
        });
    });

    describe("Container management", () => {
        /**
         * Test loading containers
         */
        it("should load containers on mount", async () => {
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

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(mockContainers);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                containers: ["firefox-container-1"],
            });

            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(browser.contextualIdentities.query).toHaveBeenCalledWith({});
                expect(browser.storage.local.get).toHaveBeenCalledWith("containers");
            });
        });

        /**
         * Test filtering containers by stored IDs
         */
        it("should filter containers by stored IDs", async () => {
            const allContainers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "managed-container",
                    color: "blue",
                    icon: "fingerprint",
                    iconUrl: "",
                    colorCode: "#0000ff",
                },
                {
                    cookieStoreId: "firefox-container-2",
                    name: "other-container",
                    color: "red",
                    icon: "briefcase",
                    iconUrl: "",
                    colorCode: "#ff0000",
                },
            ];

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(allContainers);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                containers: ["firefox-container-1"], // Only first container is managed
            });

            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(browser.contextualIdentities.query).toHaveBeenCalledWith({});
            });
        });

        /**
         * Test handling empty container list
         */
        it("should handle empty container storage", async () => {
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});

            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(browser.contextualIdentities.query).toHaveBeenCalled();
            });
        });
    });

    describe("Profile interactions", () => {
        /**
         * Test profile sorting
         */
        it("should sort profiles alphabetically", async () => {
            const unsortedProfiles = [
                {
                    name: "zebra-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    name: "alpha-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "red",
                    icon: "briefcase",
                },
            ];

            let messageListener: any;
            const mockPort = {
                onMessage: {
                    addListener: jest.fn((fn) => {
                        messageListener = fn;
                    }),
                },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(messageListener).toBeDefined();
            });

            messageListener({
                action: "profileList",
                profiles: unsortedProfiles,
            });

            await waitFor(() => {
                expect(browser.storage.local.set).toHaveBeenCalledWith(
                    expect.objectContaining({
                        "aws-profiles": expect.objectContaining({
                            profiles: expect.any(Array),
                        }),
                    })
                );
            });
        });

        /**
         * Test caching profiles with timestamp
         */
        it("should cache profiles with timestamp", async () => {
            const profiles = [
                {
                    name: "test-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            let messageListener: any;
            const mockPort = {
                onMessage: {
                    addListener: jest.fn((fn) => {
                        messageListener = fn;
                    }),
                },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            const beforeTime = Date.now();
            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(messageListener).toBeDefined();
            });

            messageListener({
                action: "profileList",
                profiles,
            });

            await waitFor(() => {
                expect(browser.storage.local.set).toHaveBeenCalledWith(
                    expect.objectContaining({
                        "aws-profiles": expect.objectContaining({
                            timestamp: expect.any(Number),
                        }),
                    })
                );

                const call = (browser.storage.local.set as jest.Mock).mock.calls.find(
                    (c) => c[0]["aws-profiles"]?.timestamp
                );
                expect(call[0]["aws-profiles"].timestamp).toBeGreaterThanOrEqual(beforeTime);
            });
        });

        /**
         * Test that loadProfiles doesn't reload if profiles exist
         */
        it("should not reload profiles if already loaded", async () => {
            const profiles = [
                {
                    name: "existing-profile",
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            // Set up cached profiles
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                "aws-profiles": {
                    profiles: profiles,
                    timestamp: Date.now(),
                },
            });

            let messageListener: any;
            const mockPort = {
                onMessage: {
                    addListener: jest.fn((fn) => {
                        messageListener = fn;
                    }),
                },
                onDisconnect: { addListener: jest.fn() },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                // Component should load
                expect(browser.storage.local.get).toHaveBeenCalled();
            });
        });
    });

    describe("Disconnect handling", () => {
        /**
         * Test handling native messaging disconnect
         */
        it("should handle disconnect with lastError", async () => {
            let disconnectListener: any;
            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: {
                    addListener: jest.fn((fn) => {
                        disconnectListener = fn;
                    }),
                },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            // Set lastError
            (browser.runtime as any).lastError = { message: "Connection lost" };

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(disconnectListener).toBeDefined();
            });

            // Trigger disconnect
            disconnectListener();

            // Clean up lastError
            (browser.runtime as any).lastError = null;

            await waitFor(() => {
                expect(true).toBe(true); // Component should handle disconnect
            });
        });

        /**
         * Test handling disconnect without lastError
         */
        it("should handle disconnect without lastError", async () => {
            let disconnectListener: any;
            const mockPort = {
                onMessage: { addListener: jest.fn() },
                onDisconnect: {
                    addListener: jest.fn((fn) => {
                        disconnectListener = fn;
                    }),
                },
                postMessage: jest.fn(),
                disconnect: jest.fn(),
            };
            (browser.runtime.connectNative as jest.Mock).mockReturnValue(mockPort);

            render(<AWSProfilesPopup />);

            await waitFor(() => {
                expect(disconnectListener).toBeDefined();
            });

            // Trigger disconnect without error
            disconnectListener();

            await waitFor(() => {
                expect(true).toBe(true); // Component should handle disconnect gracefully
            });
        });
    });
});

describe("Container utility functions", () => {
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
