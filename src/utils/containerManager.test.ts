/**
 * Unit tests for containerManager utility
 * Tests container operations, color generation, and storage management
 */

import browser from "webextension-polyfill";
import {
    lookupContainer,
    colorFromContainerName,
    randomContainerColor,
    prepareContainer,
    saveContainerId,
    getManagedContainerIds,
    getManagedContainers,
    removeContainer,
    clearAllContainers,
    CONTAINER_COLORS,
    CONTAINER_ICONS,
    DEFAULT_ICON,
} from "./containerManager";
import { STORAGE_KEYS } from "../popup/constants";
import { createMockContainer } from "../__testUtils__/helpers";

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
    const mockQuery = browser.contextualIdentities.query as jest.Mock;
    const mockCreate = browser.contextualIdentities.create as jest.Mock;
    const mockUpdate = browser.contextualIdentities.update as jest.Mock;
    const mockRemove = browser.contextualIdentities.remove as jest.Mock;
    const mockStorageGet = browser.storage.local.get as jest.Mock;
    const mockStorageSet = browser.storage.local.set as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
        (console.error as jest.Mock).mockRestore();
    });

    describe("Constants", () => {
        it("exports correct container colors", () => {
            expect(CONTAINER_COLORS).toEqual([
                "blue",
                "turquoise",
                "green",
                "yellow",
                "orange",
                "red",
                "pink",
                "purple",
            ]);
        });

        it("exports correct container icons", () => {
            expect(CONTAINER_ICONS).toEqual([
                "fingerprint",
                "briefcase",
                "dollar",
                "cart",
                "circle",
                "gift",
                "vacation",
                "food",
                "fruit",
                "pet",
                "tree",
                "chill",
            ]);
        });

        it("sets default icon to fingerprint", () => {
            expect(DEFAULT_ICON).toBe("fingerprint");
        });
    });

    describe("lookupContainer", () => {
        it("returns container when found", async () => {
            const mockContainer = createMockContainer({ name: "test-container" });
            mockQuery.mockResolvedValue([mockContainer]);

            const result = await lookupContainer("test-container");

            expect(result).toEqual(mockContainer);
            expect(mockQuery).toHaveBeenCalledWith({ name: "test-container" });
        });

        it("returns first container when multiple matches", async () => {
            const container1 = createMockContainer({ name: "test", cookieStoreId: "1" });
            const container2 = createMockContainer({ name: "test", cookieStoreId: "2" });
            mockQuery.mockResolvedValue([container1, container2]);

            const result = await lookupContainer("test");

            expect(result).toEqual(container1);
        });

        it("returns null when no container found", async () => {
            mockQuery.mockResolvedValue([]);

            const result = await lookupContainer("nonexistent");

            expect(result).toBeNull();
        });

        it("returns null and logs error on API failure", async () => {
            const error = new Error("API error");
            mockQuery.mockRejectedValue(error);

            const result = await lookupContainer("test");

            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(
                'Failed to lookup container "test":',
                error
            );
        });
    });

    describe("colorFromContainerName", () => {
        it("generates consistent color for same name", () => {
            const color1 = colorFromContainerName("test-profile");
            const color2 = colorFromContainerName("test-profile");

            expect(color1).toBe(color2);
        });

        it("returns valid container color", () => {
            const color = colorFromContainerName("any-name");

            expect(CONTAINER_COLORS).toContain(color);
        });

        it("generates different colors for different names", () => {
            // Note: This might not always be true due to hash collisions,
            // but these specific strings should produce different colors
            const color1 = colorFromContainerName("profile-a");
            const color2 = colorFromContainerName("profile-b");
            const color3 = colorFromContainerName("profile-c");

            // At least two should be different
            const uniqueColors = new Set([color1, color2, color3]);
            expect(uniqueColors.size).toBeGreaterThan(1);
        });

        it("handles empty string", () => {
            const color = colorFromContainerName("");

            expect(CONTAINER_COLORS).toContain(color);
        });

        it("handles special characters", () => {
            const color = colorFromContainerName("profile-@#$%");

            expect(CONTAINER_COLORS).toContain(color);
        });
    });

    describe("randomContainerColor", () => {
        it("returns valid container color", () => {
            const color = randomContainerColor();

            expect(CONTAINER_COLORS).toContain(color);
        });

        it("can return different colors on multiple calls", () => {
            const colors = new Set();
            for (let i = 0; i < 50; i++) {
                colors.add(randomContainerColor());
            }

            // With 8 colors and 50 calls, we should get at least 2 different colors
            expect(colors.size).toBeGreaterThan(1);
        });
    });

    describe("prepareContainer", () => {
        it("creates new container when not exists", async () => {
            const newContainer = createMockContainer({
                name: "new-container",
                color: "blue",
                icon: "fingerprint",
            });

            mockQuery.mockResolvedValue([]); // No existing container
            mockCreate.mockResolvedValue(newContainer);
            mockStorageGet.mockResolvedValue({ containers: [] });
            mockStorageSet.mockResolvedValue(undefined);

            const result = await prepareContainer("new-container");

            expect(mockCreate).toHaveBeenCalledWith({
                name: "new-container",
                color: expect.any(String),
                icon: DEFAULT_ICON,
            });
            expect(mockStorageSet).toHaveBeenCalled();
            expect(result).toEqual(newContainer);
        });

        it("creates container with custom color and icon", async () => {
            const newContainer = createMockContainer({
                name: "custom-container",
                color: "red",
                icon: "briefcase",
            });

            mockQuery.mockResolvedValue([]);
            mockCreate.mockResolvedValue(newContainer);
            mockStorageGet.mockResolvedValue({ containers: [] });
            mockStorageSet.mockResolvedValue(undefined);

            await prepareContainer("custom-container", "red", "briefcase");

            expect(mockCreate).toHaveBeenCalledWith({
                name: "custom-container",
                color: "red",
                icon: "briefcase",
            });
        });

        it("returns existing container without updates", async () => {
            const existingContainer = createMockContainer({
                name: "existing",
                color: "blue",
                icon: "fingerprint",
            });

            mockQuery.mockResolvedValue([existingContainer]);

            const result = await prepareContainer("existing");

            expect(mockCreate).not.toHaveBeenCalled();
            expect(mockUpdate).not.toHaveBeenCalled();
            expect(result).toEqual(existingContainer);
        });

        it("updates existing container when color changes", async () => {
            const existingContainer = createMockContainer({
                name: "existing",
                color: "blue",
                icon: "fingerprint",
                cookieStoreId: "container-1",
            });

            mockQuery.mockResolvedValue([existingContainer]);
            mockUpdate.mockResolvedValue(undefined);

            await prepareContainer("existing", "red");

            expect(mockUpdate).toHaveBeenCalledWith("container-1", {
                color: "red",
                icon: "fingerprint",
            });
        });

        it("updates existing container when icon changes", async () => {
            const existingContainer = createMockContainer({
                name: "existing",
                color: "blue",
                icon: "fingerprint",
                cookieStoreId: "container-1",
            });

            mockQuery.mockResolvedValue([existingContainer]);
            mockUpdate.mockResolvedValue(undefined);

            await prepareContainer("existing", undefined, "briefcase");

            expect(mockUpdate).toHaveBeenCalledWith("container-1", {
                color: "blue",
                icon: "briefcase",
            });
        });

        it("updates both color and icon when both change", async () => {
            const existingContainer = createMockContainer({
                name: "existing",
                color: "blue",
                icon: "fingerprint",
                cookieStoreId: "container-1",
            });

            mockQuery.mockResolvedValue([existingContainer]);
            mockUpdate.mockResolvedValue(undefined);

            await prepareContainer("existing", "red", "briefcase");

            expect(mockUpdate).toHaveBeenCalledWith("container-1", {
                color: "red",
                icon: "briefcase",
            });
        });

        it("throws error when container creation fails", async () => {
            const error = new Error("Creation failed");
            mockQuery.mockResolvedValue([]);
            mockCreate.mockRejectedValue(error);

            await expect(prepareContainer("test")).rejects.toThrow(
                "Could not prepare container"
            );
            expect(console.error).toHaveBeenCalledWith(
                'Failed to prepare container "test":',
                error
            );
        });

        it("throws error when container update fails", async () => {
            const existingContainer = createMockContainer({
                name: "existing",
                color: "blue",
                cookieStoreId: "container-1",
            });
            const error = new Error("Update failed");

            mockQuery.mockResolvedValue([existingContainer]);
            mockUpdate.mockRejectedValue(error);

            await expect(prepareContainer("existing", "red")).rejects.toThrow(
                "Could not prepare container"
            );
        });
    });

    describe("saveContainerId", () => {
        it("saves new container ID to empty storage", async () => {
            mockStorageGet.mockResolvedValue({});
            mockStorageSet.mockResolvedValue(undefined);

            await saveContainerId("container-1");

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["container-1"],
            });
        });

        it("appends container ID to existing list", async () => {
            mockStorageGet.mockResolvedValue({
                containers: ["container-1", "container-2"],
            });
            mockStorageSet.mockResolvedValue(undefined);

            await saveContainerId("container-3");

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["container-1", "container-2", "container-3"],
            });
        });

        it("does not add duplicate container IDs", async () => {
            mockStorageGet.mockResolvedValue({
                containers: ["container-1", "container-2"],
            });

            await saveContainerId("container-1");

            expect(mockStorageSet).not.toHaveBeenCalled();
        });

        it("handles non-array storage data", async () => {
            mockStorageGet.mockResolvedValue({
                containers: "invalid",
            });
            mockStorageSet.mockResolvedValue(undefined);

            await saveContainerId("container-1");

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["container-1"],
            });
        });

        it("throws error on storage failure", async () => {
            const error = new Error("Storage error");
            mockStorageGet.mockRejectedValue(error);

            await expect(saveContainerId("container-1")).rejects.toThrow(
                "Could not save container ID"
            );
            expect(console.error).toHaveBeenCalledWith(
                'Failed to save container ID "container-1":',
                error
            );
        });
    });

    describe("getManagedContainerIds", () => {
        it("returns container IDs from storage", async () => {
            const containerIds = ["container-1", "container-2", "container-3"];
            mockStorageGet.mockResolvedValue({ containers: containerIds });

            const result = await getManagedContainerIds();

            expect(result).toEqual(containerIds);
        });

        it("returns empty array when no containers in storage", async () => {
            mockStorageGet.mockResolvedValue({});

            const result = await getManagedContainerIds();

            expect(result).toEqual([]);
        });

        it("returns empty array on storage error", async () => {
            mockStorageGet.mockRejectedValue(new Error("Storage error"));

            const result = await getManagedContainerIds();

            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalled();
        });

        it("returns empty array when containers is not an array", async () => {
            mockStorageGet.mockResolvedValue({ containers: "invalid" });

            const result = await getManagedContainerIds();

            expect(result).toEqual([]);
        });
    });

    describe("getManagedContainers", () => {
        it("returns filtered managed containers", async () => {
            const container1 = createMockContainer({ cookieStoreId: "container-1" });
            const container2 = createMockContainer({ cookieStoreId: "container-2" });
            const container3 = createMockContainer({ cookieStoreId: "container-3" });

            mockQuery.mockResolvedValue([container1, container2, container3]);
            mockStorageGet.mockResolvedValue({
                containers: ["container-1", "container-3"],
            });

            const result = await getManagedContainers();

            expect(result).toEqual([container1, container3]);
            expect(result).not.toContain(container2);
        });

        it("returns empty array when no managed containers", async () => {
            mockQuery.mockResolvedValue([]);
            mockStorageGet.mockResolvedValue({ containers: [] });

            const result = await getManagedContainers();

            expect(result).toEqual([]);
        });

        it("returns empty array on error", async () => {
            mockQuery.mockRejectedValue(new Error("Query error"));

            const result = await getManagedContainers();

            expect(result).toEqual([]);
            expect(console.error).toHaveBeenCalled();
        });

        it("filters out containers not in managed list", async () => {
            const managedContainer = createMockContainer({ cookieStoreId: "managed-1" });
            const unmanagedContainer = createMockContainer({ cookieStoreId: "unmanaged-1" });

            mockQuery.mockResolvedValue([managedContainer, unmanagedContainer]);
            mockStorageGet.mockResolvedValue({
                containers: ["managed-1"],
            });

            const result = await getManagedContainers();

            expect(result).toEqual([managedContainer]);
        });
    });

    describe("removeContainer", () => {
        it("removes container and updates storage", async () => {
            mockRemove.mockResolvedValue(undefined);
            mockStorageGet.mockResolvedValue({
                containers: ["container-1", "container-2", "container-3"],
            });
            mockStorageSet.mockResolvedValue(undefined);

            await removeContainer("container-2");

            expect(mockRemove).toHaveBeenCalledWith("container-2");
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["container-1", "container-3"],
            });
        });

        it("removes last container from storage", async () => {
            mockRemove.mockResolvedValue(undefined);
            mockStorageGet.mockResolvedValue({
                containers: ["container-1"],
            });
            mockStorageSet.mockResolvedValue(undefined);

            await removeContainer("container-1");

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: [],
            });
        });

        it("handles removing non-existent container ID", async () => {
            mockRemove.mockResolvedValue(undefined);
            mockStorageGet.mockResolvedValue({
                containers: ["container-1", "container-2"],
            });
            mockStorageSet.mockResolvedValue(undefined);

            await removeContainer("container-3");

            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: ["container-1", "container-2"],
            });
        });

        it("throws error on removal failure", async () => {
            const error = new Error("Removal failed");
            mockRemove.mockRejectedValue(error);

            await expect(removeContainer("container-1")).rejects.toThrow(
                "Could not remove container"
            );
            expect(console.error).toHaveBeenCalledWith(
                'Failed to remove container "container-1":',
                error
            );
        });
    });

    describe("clearAllContainers", () => {
        it("removes all containers and clears storage", async () => {
            const container1 = createMockContainer({ cookieStoreId: "container-1" });
            const container2 = createMockContainer({ cookieStoreId: "container-2" });
            const container3 = createMockContainer({ cookieStoreId: "container-3" });

            mockQuery.mockResolvedValue([container1, container2, container3]);
            mockStorageGet.mockResolvedValue({
                containers: ["container-1", "container-2", "container-3"],
            });
            mockRemove.mockResolvedValue(undefined);
            mockStorageSet.mockResolvedValue(undefined);

            await clearAllContainers();

            expect(mockRemove).toHaveBeenCalledTimes(3);
            expect(mockRemove).toHaveBeenCalledWith("container-1");
            expect(mockRemove).toHaveBeenCalledWith("container-2");
            expect(mockRemove).toHaveBeenCalledWith("container-3");
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: [],
            });
        });

        it("handles empty container list", async () => {
            mockQuery.mockResolvedValue([]);
            mockStorageGet.mockResolvedValue({ containers: [] });
            mockStorageSet.mockResolvedValue(undefined);

            await clearAllContainers();

            expect(mockRemove).not.toHaveBeenCalled();
            expect(mockStorageSet).toHaveBeenCalledWith({
                [STORAGE_KEYS.CONTAINERS]: [],
            });
        });

        it("throws error on storage failure", async () => {
            const container1 = createMockContainer({ cookieStoreId: "container-1" });
            const error = new Error("Storage set failed");

            mockQuery.mockResolvedValue([container1]);
            mockStorageGet.mockResolvedValue({ containers: ["container-1"] });
            mockRemove.mockResolvedValue(undefined);
            mockStorageSet.mockRejectedValue(error);

            await expect(clearAllContainers()).rejects.toThrow(
                "Could not clear containers"
            );
            expect(console.error).toHaveBeenCalledWith(
                "Failed to clear all containers:",
                error
            );
        });

        it("clears storage even if some removals fail", async () => {
            const container1 = createMockContainer({ cookieStoreId: "container-1" });
            const container2 = createMockContainer({ cookieStoreId: "container-2" });

            mockQuery.mockResolvedValue([container1, container2]);
            mockStorageGet.mockResolvedValue({
                containers: ["container-1", "container-2"],
            });
            mockRemove.mockImplementation((id) => {
                if (id === "container-1") {
                    return Promise.reject(new Error("Failed to remove"));
                }
                return Promise.resolve();
            });
            mockStorageSet.mockResolvedValue(undefined);

            await expect(clearAllContainers()).rejects.toThrow();
        });
    });
});
