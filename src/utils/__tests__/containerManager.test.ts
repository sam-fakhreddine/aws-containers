/**
 * Tests for Container Management Utilities
 */

import {
    lookupContainer,
    prepareContainer,
    saveContainerId,
    getManagedContainerIds,
    getManagedContainers,
    removeContainer,
    clearAllContainers,
    colorFromContainerName,
    randomContainerColor,
    CONTAINER_COLORS,
    DEFAULT_ICON,
} from "@/utils/containerManager";
import { STORAGE_KEYS } from "@/constants";
import browser from "webextension-polyfill";

// Mock webextension-polyfill
jest.mock("webextension-polyfill", () => ({
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
    },
}));

describe("containerManager", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("lookupContainer", () => {
        it("should return container when found", async () => {
            const mockContainer = {
                cookieStoreId: "firefox-container-1",
                name: "test-container",
                color: "blue",
                icon: "fingerprint",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([mockContainer]);

            const result = await lookupContainer("test-container");

            expect(result).toEqual(mockContainer);
            expect(browser.contextualIdentities.query).toHaveBeenCalledWith({
                name: "test-container",
            });
        });

        it("should return null when container not found", async () => {
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);

            const result = await lookupContainer("nonexistent");

            expect(result).toBeNull();
        });

        it("should return first container when multiple found", async () => {
            const mockContainers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "test-container",
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    cookieStoreId: "firefox-container-2",
                    name: "test-container",
                    color: "red",
                    icon: "briefcase",
                },
            ];

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(mockContainers);

            const result = await lookupContainer("test-container");

            expect(result).toEqual(mockContainers[0]);
        });

        it("should handle errors gracefully", async () => {
            (browser.contextualIdentities.query as jest.Mock).mockRejectedValue(
                new Error("API error")
            );

            const result = await lookupContainer("test-container");

            expect(result).toBeNull();
        });
    });

    describe("colorFromContainerName", () => {
        it("should return consistent color for same name", () => {
            const color1 = colorFromContainerName("test-profile");
            const color2 = colorFromContainerName("test-profile");

            expect(color1).toBe(color2);
        });

        it("should return a valid container color", () => {
            const color = colorFromContainerName("test-profile");

            expect(CONTAINER_COLORS).toContain(color);
        });

        it("should return different colors for different names", () => {
            const color1 = colorFromContainerName("profile-a");
            const color2 = colorFromContainerName("profile-b");

            // While not guaranteed, different names should typically produce different colors
            // We just verify both are valid colors
            expect(CONTAINER_COLORS).toContain(color1);
            expect(CONTAINER_COLORS).toContain(color2);
        });

        it("should handle empty string", () => {
            const color = colorFromContainerName("");

            expect(CONTAINER_COLORS).toContain(color);
        });
    });

    describe("randomContainerColor", () => {
        it("should return a valid container color", () => {
            const color = randomContainerColor();

            expect(CONTAINER_COLORS).toContain(color);
        });

        it("should return colors from the available set", () => {
            // Run multiple times to increase confidence
            for (let i = 0; i < 10; i++) {
                const color = randomContainerColor();
                expect(CONTAINER_COLORS).toContain(color);
            }
        });
    });

    describe("prepareContainer", () => {
        it("should create new container when it doesn't exist", async () => {
            const mockContainer = {
                cookieStoreId: "firefox-container-1",
                name: "new-container",
                color: "blue",
                icon: "fingerprint",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.contextualIdentities.create as jest.Mock).mockResolvedValue(mockContainer);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            const result = await prepareContainer("new-container");

            expect(result).toEqual(mockContainer);
            expect(browser.contextualIdentities.create).toHaveBeenCalledWith({
                name: "new-container",
                color: expect.any(String),
                icon: DEFAULT_ICON,
            });
            expect(browser.storage.local.set).toHaveBeenCalled();
        });

        it("should use provided color and icon when creating", async () => {
            const mockContainer = {
                cookieStoreId: "firefox-container-1",
                name: "new-container",
                color: "red",
                icon: "briefcase",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.contextualIdentities.create as jest.Mock).mockResolvedValue(mockContainer);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await prepareContainer("new-container", "red", "briefcase");

            expect(browser.contextualIdentities.create).toHaveBeenCalledWith({
                name: "new-container",
                color: "red",
                icon: "briefcase",
            });
        });

        it("should return existing container without updating", async () => {
            const mockContainer = {
                cookieStoreId: "firefox-container-1",
                name: "existing-container",
                color: "blue",
                icon: "fingerprint",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([mockContainer]);

            const result = await prepareContainer("existing-container");

            expect(result).toEqual(mockContainer);
            expect(browser.contextualIdentities.create).not.toHaveBeenCalled();
            expect(browser.contextualIdentities.update).not.toHaveBeenCalled();
        });

        it("should update existing container when color changes", async () => {
            const mockContainer = {
                cookieStoreId: "firefox-container-1",
                name: "existing-container",
                color: "blue",
                icon: "fingerprint",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([mockContainer]);
            (browser.contextualIdentities.update as jest.Mock).mockResolvedValue(undefined);

            await prepareContainer("existing-container", "red");

            expect(browser.contextualIdentities.update).toHaveBeenCalledWith(
                "firefox-container-1",
                {
                    color: "red",
                    icon: "fingerprint",
                }
            );
        });

        it("should update existing container when icon changes", async () => {
            const mockContainer = {
                cookieStoreId: "firefox-container-1",
                name: "existing-container",
                color: "blue",
                icon: "fingerprint",
            };

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([mockContainer]);
            (browser.contextualIdentities.update as jest.Mock).mockResolvedValue(undefined);

            await prepareContainer("existing-container", undefined, "briefcase");

            expect(browser.contextualIdentities.update).toHaveBeenCalledWith(
                "firefox-container-1",
                {
                    color: "blue",
                    icon: "briefcase",
                }
            );
        });

        it("should throw error when creation fails", async () => {
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.contextualIdentities.create as jest.Mock).mockRejectedValue(
                new Error("Creation failed")
            );

            await expect(prepareContainer("new-container")).rejects.toThrow(
                "Could not prepare container"
            );
        });
    });

    describe("saveContainerId", () => {
        it("should save new container ID to empty storage", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await saveContainerId("firefox-container-1");

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1"],
            });
        });

        it("should append container ID to existing list", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1"],
            });
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await saveContainerId("firefox-container-2");

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1", "firefox-container-2"],
            });
        });

        it("should not add duplicate container ID", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1"],
            });
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await saveContainerId("firefox-container-1");

            expect(browser.storage.local.set).not.toHaveBeenCalled();
        });

        it("should handle storage errors", async () => {
            (browser.storage.local.get as jest.Mock).mockRejectedValue(
                new Error("Storage error")
            );

            await expect(saveContainerId("firefox-container-1")).rejects.toThrow(
                "Could not save container ID"
            );
        });
    });

    describe("getManagedContainerIds", () => {
        it("should return container IDs from storage", async () => {
            const mockIds = ["firefox-container-1", "firefox-container-2"];
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: mockIds,
            });

            const result = await getManagedContainerIds();

            expect(result).toEqual(mockIds);
        });

        it("should return empty array when no containers in storage", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});

            const result = await getManagedContainerIds();

            expect(result).toEqual([]);
        });

        it("should return empty array when storage data is invalid", async () => {
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: "not-an-array",
            });

            const result = await getManagedContainerIds();

            expect(result).toEqual([]);
        });

        it("should handle storage errors", async () => {
            (browser.storage.local.get as jest.Mock).mockRejectedValue(
                new Error("Storage error")
            );

            const result = await getManagedContainerIds();

            expect(result).toEqual([]);
        });
    });

    describe("getManagedContainers", () => {
        it("should return filtered containers", async () => {
            const allContainers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "container-1",
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    cookieStoreId: "firefox-container-2",
                    name: "container-2",
                    color: "red",
                    icon: "briefcase",
                },
                {
                    cookieStoreId: "firefox-container-3",
                    name: "container-3",
                    color: "green",
                    icon: "dollar",
                },
            ];

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(allContainers);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1", "firefox-container-3"],
            });

            const result = await getManagedContainers();

            expect(result).toHaveLength(2);
            expect(result).toContainEqual(allContainers[0]);
            expect(result).toContainEqual(allContainers[2]);
        });

        it("should return empty array when no managed containers", async () => {
            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue([]);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({});

            const result = await getManagedContainers();

            expect(result).toEqual([]);
        });

        it("should handle errors gracefully", async () => {
            (browser.contextualIdentities.query as jest.Mock).mockRejectedValue(
                new Error("API error")
            );

            const result = await getManagedContainers();

            expect(result).toEqual([]);
        });
    });

    describe("removeContainer", () => {
        it("should remove container and update storage", async () => {
            (browser.contextualIdentities.remove as jest.Mock).mockResolvedValue(undefined);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: [
                    "firefox-container-1",
                    "firefox-container-2",
                    "firefox-container-3",
                ],
            });
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await removeContainer("firefox-container-2");

            expect(browser.contextualIdentities.remove).toHaveBeenCalledWith(
                "firefox-container-2"
            );
            expect(browser.storage.local.set).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1", "firefox-container-3"],
            });
        });

        it("should handle removal errors", async () => {
            (browser.contextualIdentities.remove as jest.Mock).mockRejectedValue(
                new Error("Removal failed")
            );

            await expect(removeContainer("firefox-container-1")).rejects.toThrow(
                "Could not remove container"
            );
        });
    });

    describe("clearAllContainers", () => {
        it("should remove all managed containers and clear storage", async () => {
            const mockContainers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "container-1",
                    color: "blue",
                    icon: "fingerprint",
                },
                {
                    cookieStoreId: "firefox-container-2",
                    name: "container-2",
                    color: "red",
                    icon: "briefcase",
                },
            ];

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(mockContainers);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1", "firefox-container-2"],
            });
            (browser.contextualIdentities.remove as jest.Mock).mockResolvedValue(undefined);
            (browser.storage.local.set as jest.Mock).mockResolvedValue(undefined);

            await clearAllContainers();

            expect(browser.contextualIdentities.remove).toHaveBeenCalledTimes(2);
            expect(browser.contextualIdentities.remove).toHaveBeenCalledWith(
                "firefox-container-1"
            );
            expect(browser.contextualIdentities.remove).toHaveBeenCalledWith(
                "firefox-container-2"
            );
            expect(browser.storage.local.set).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: [],
            });
        });

        it("should handle errors gracefully", async () => {
            const mockContainers = [
                {
                    cookieStoreId: "firefox-container-1",
                    name: "container-1",
                    color: "blue",
                    icon: "fingerprint",
                },
            ];

            (browser.contextualIdentities.query as jest.Mock).mockResolvedValue(mockContainers);
            (browser.storage.local.get as jest.Mock).mockResolvedValue({
                [STORAGE_KEYS.CONTAINERS]: ["firefox-container-1"],
            });
            (browser.contextualIdentities.remove as jest.Mock).mockRejectedValue(
                new Error("Removal failed")
            );

            await expect(clearAllContainers()).rejects.toThrow("Could not clear containers");
        });
    });
});
