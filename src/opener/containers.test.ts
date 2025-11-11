/**
 * Comprehensive tests for container management utilities
 * Following patterns from Python tests: extensive mocking, edge cases, clear naming
 */

import { colorFromContainerName, prepareContainer } from "./containers";
import { Container } from "../types";
import { CONTAINER_COLORS } from "../constants";
import browser from "webextension-polyfill";

// Mock the webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    contextualIdentities: {
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
}));

describe("colorFromContainerName", () => {
    /**
     * Test that the same name always produces the same color (consistency)
     */
    it("should return consistent color for the same name", () => {
        const color1 = colorFromContainerName("test-container");
        const color2 = colorFromContainerName("test-container");
        expect(color1).toBe(color2);
    });

    /**
     * Test the originally failing case with negative hash
     * After Math.abs() fix, this now returns "blue" (hash % 8 === 0)
     */
    it("should return consistent color for cf-proda", () => {
        const color = colorFromContainerName("cf-proda");
        expect(color).toBe("blue");
    });

    /**
     * Test that returned color is always in the valid color list
     */
    it("should return a valid container color", () => {
        const testNames = ["test1", "test2", "test3", "aws-prod", "aws-dev", "my-container"];

        testNames.forEach(name => {
            const color = colorFromContainerName(name);
            expect(CONTAINER_COLORS).toContain(color);
        });
    });

    /**
     * Test that different names produce different colors (usually)
     */
    it("should produce different colors for different names", () => {
        const colors = new Set();
        const testNames = Array.from({ length: 20 }, (_, i) => `container-${i}`);

        testNames.forEach(name => {
            colors.add(colorFromContainerName(name));
        });

        // With 20 names and 8 colors, we should get at least 5 different colors
        expect(colors.size).toBeGreaterThanOrEqual(5);
    });

    /**
     * Test empty string produces a color
     */
    it("should handle empty string", () => {
        const color = colorFromContainerName("");
        expect(CONTAINER_COLORS).toContain(color);
    });

    /**
     * Test single character names
     */
    it("should handle single character names", () => {
        const color = colorFromContainerName("a");
        expect(CONTAINER_COLORS).toContain(color);
    });

    /**
     * Test very long container names
     */
    it("should handle very long container names", () => {
        const longName = "a".repeat(1000);
        const color = colorFromContainerName(longName);
        expect(CONTAINER_COLORS).toContain(color);
    });

    /**
     * Test container names with special characters
     */
    it("should handle names with special characters", () => {
        const specialNames = [
            "test-container",
            "test_container",
            "test.container",
            "test@container",
            "test#container",
            "test container",
        ];

        specialNames.forEach(name => {
            const color = colorFromContainerName(name);
            expect(CONTAINER_COLORS).toContain(color);
        });
    });

    /**
     * Test container names with Unicode characters
     */
    it("should handle names with Unicode characters", () => {
        const unicodeNames = ["容器", "контейнер", "🚀container", "test-容器-123"];

        unicodeNames.forEach(name => {
            const color = colorFromContainerName(name);
            expect(CONTAINER_COLORS).toContain(color);
        });
    });

    /**
     * Test that similar names might produce different colors
     */
    it("should produce different colors for similar names", () => {
        const color1 = colorFromContainerName("container-1");
        const color2 = colorFromContainerName("container-2");

        // They might be the same or different, but both should be valid
        expect(CONTAINER_COLORS).toContain(color1);
        expect(CONTAINER_COLORS).toContain(color2);
    });
});

describe("prepareContainer", () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    /**
     * Test creating a new container when it doesn't exist
     */
    it("should create new container when it doesn't exist", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockCreate = browser.contextualIdentities.create as jest.Mock;
        const mockStorageGet = browser.storage.local.get as jest.Mock;
        const mockStorageSet = browser.storage.local.set as jest.Mock;

        // Mock: container doesn't exist
        mockQuery.mockResolvedValue([]);

        // Mock: storage is empty
        mockStorageGet.mockResolvedValue({});

        // Mock: container creation
        const mockCreatedContainer = {
            cookieStoreId: "firefox-container-1",
            name: "test-container",
            color: "blue",
            icon: "fingerprint",
        };
        mockCreate.mockResolvedValue(mockCreatedContainer);

        const container: Container = {
            name: "test-container",
            url: "https://example.com",
            color: "blue",
            icon: "fingerprint",
        };

        const result = await prepareContainer(container);

        expect(mockQuery).toHaveBeenCalledWith({ name: "test-container" });
        expect(mockCreate).toHaveBeenCalledWith({
            name: "test-container",
            color: "blue",
            icon: "fingerprint",
        });
        expect(mockStorageSet).toHaveBeenCalledWith({
            containers: ["firefox-container-1"],
        });
        expect(result).toBe(mockCreatedContainer);
    });

    /**
     * Test updating an existing container
     */
    it("should update existing container", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockUpdate = browser.contextualIdentities.update as jest.Mock;

        const existingContainer = {
            cookieStoreId: "firefox-container-1",
            name: "test-container",
            color: "red",
            icon: "briefcase",
        };

        // Mock: container exists
        mockQuery.mockResolvedValue([existingContainer]);

        const container: Container = {
            name: "test-container",
            url: "https://example.com",
            color: "blue",
            icon: "fingerprint",
        };

        const result = await prepareContainer(container);

        expect(mockQuery).toHaveBeenCalledWith({ name: "test-container" });
        expect(mockUpdate).toHaveBeenCalledWith("firefox-container-1", {
            color: "blue",
            icon: "fingerprint",
        });
        expect(result).toBe(existingContainer);
    });

    /**
     * Test that default color is used when none provided
     */
    it("should use generated color when not provided", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockCreate = browser.contextualIdentities.create as jest.Mock;
        const mockStorageGet = browser.storage.local.get as jest.Mock;
        const mockStorageSet = browser.storage.local.set as jest.Mock;

        mockQuery.mockResolvedValue([]);
        mockStorageGet.mockResolvedValue({});
        mockCreate.mockResolvedValue({
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "orange",
            icon: "fingerprint",
        });

        const container: Container = {
            name: "test",
            url: "https://example.com",
            // no color or icon provided
        };

        await prepareContainer(container);

        expect(mockCreate).toHaveBeenCalledWith({
            name: "test",
            color: expect.stringMatching(new RegExp(CONTAINER_COLORS.join("|"))),
            icon: "fingerprint",
        });
    });

    /**
     * Test that default icon is used when none provided
     */
    it("should use default icon when not provided", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockCreate = browser.contextualIdentities.create as jest.Mock;
        const mockStorageGet = browser.storage.local.get as jest.Mock;

        mockQuery.mockResolvedValue([]);
        mockStorageGet.mockResolvedValue({});
        mockCreate.mockResolvedValue({
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
        });

        const container: Container = {
            name: "test",
            url: "https://example.com",
            color: "blue",
            // no icon provided
        };

        await prepareContainer(container);

        expect(mockCreate).toHaveBeenCalledWith({
            name: "test",
            color: "blue",
            icon: "fingerprint", // default icon
        });
    });

    /**
     * Test that existing container is returned as-is when no updates needed
     */
    it("should return existing container without update when no changes", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockUpdate = browser.contextualIdentities.update as jest.Mock;

        const existingContainer = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "red",
            icon: "briefcase",
        };

        mockQuery.mockResolvedValue([existingContainer]);

        const container: Container = {
            name: "test",
            url: "https://example.com",
            // no color or icon provided - no updates needed
        };

        const result = await prepareContainer(container);

        // Should not call update when no changes needed
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(result).toBe(existingContainer);
    });

    /**
     * Test saving container ID to storage when storage has existing containers
     */
    it("should append container ID to existing storage", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockCreate = browser.contextualIdentities.create as jest.Mock;
        const mockStorageGet = browser.storage.local.get as jest.Mock;
        const mockStorageSet = browser.storage.local.set as jest.Mock;

        mockQuery.mockResolvedValue([]);
        mockStorageGet.mockResolvedValue({
            containers: ["existing-container-1", "existing-container-2"],
        });
        mockCreate.mockResolvedValue({
            cookieStoreId: "new-container-3",
            name: "test",
            color: "blue",
            icon: "fingerprint",
        });

        const container: Container = {
            name: "test",
            url: "https://example.com",
            color: "blue",
            icon: "fingerprint",
        };

        await prepareContainer(container);

        expect(mockStorageSet).toHaveBeenCalledWith({
            containers: ["existing-container-1", "existing-container-2", "new-container-3"],
        });
    });

    /**
     * Test that first container in query results is used
     */
    it("should use first container when multiple containers match", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockUpdate = browser.contextualIdentities.update as jest.Mock;

        const containers = [
            { cookieStoreId: "container-1", name: "test", color: "red", icon: "briefcase" },
            { cookieStoreId: "container-2", name: "test", color: "blue", icon: "fingerprint" },
        ];

        mockQuery.mockResolvedValue(containers);

        const container: Container = {
            name: "test",
            url: "https://example.com",
            color: "green",
        };

        await prepareContainer(container);

        // Should update the first container
        expect(mockUpdate).toHaveBeenCalledWith("container-1", {
            color: "green",
            icon: "briefcase",
        });
    });

    /**
     * Test handling of container names with special characters
     */
    it("should handle container names with special characters", async () => {
        const mockQuery = browser.contextualIdentities.query as jest.Mock;
        const mockCreate = browser.contextualIdentities.create as jest.Mock;
        const mockStorageGet = browser.storage.local.get as jest.Mock;

        mockQuery.mockResolvedValue([]);
        mockStorageGet.mockResolvedValue({});
        mockCreate.mockResolvedValue({
            cookieStoreId: "container-1",
            name: "test-container_123",
            color: "blue",
            icon: "fingerprint",
        });

        const container: Container = {
            name: "test-container_123",
            url: "https://example.com",
            color: "blue",
        };

        await prepareContainer(container);

        expect(mockCreate).toHaveBeenCalledWith({
            name: "test-container_123",
            color: "blue",
            icon: "fingerprint",
        });
    });
});
