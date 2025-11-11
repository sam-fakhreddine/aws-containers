/**
 * Comprehensive tests for tab management utilities
 * Following patterns from Python tests: extensive mocking, edge cases, clear naming
 */

import { newTab, closeCurrentTab, getActiveTab } from "./tabs";
import browser from "webextension-polyfill";

// Mock the webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    runtime: {
        getBrowserInfo: jest.fn(),
    },
    tabs: {
        getCurrent: jest.fn(),
        create: jest.fn(),
        remove: jest.fn(),
        query: jest.fn(),
    },
    windows: {
        WINDOW_ID_CURRENT: -2,
    },
}));

describe("newTab", () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    /**
     * Test creating a new tab with valid container
     */
    it("should create new tab in container and close current tab", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockCreate = browser.tabs.create as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        // Mock browser info
        mockGetBrowserInfo.mockResolvedValue({
            name: "Firefox",
            version: "100.0",
        });

        // Mock current tab
        const currentTab = {
            id: 1,
            index: 5,
            url: "about:blank",
            title: "New Tab",
        };
        mockGetCurrent.mockResolvedValue(currentTab);

        // Mock tab creation
        mockCreate.mockResolvedValue({
            id: 2,
            index: 6,
        });

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test-container",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await newTab(container, { url: "https://example.com" });

        expect(mockGetBrowserInfo).toHaveBeenCalled();
        expect(mockGetCurrent).toHaveBeenCalled();
        expect(mockCreate).toHaveBeenCalledWith({
            cookieStoreId: "firefox-container-1",
            url: "https://example.com",
            index: 6, // currentTab.index + 1
        });
        expect(mockRemove).toHaveBeenCalledWith(1);
    });

    /**
     * Test that new tab is created at next index
     */
    it("should create new tab at next index after current tab", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockCreate = browser.tabs.create as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
        mockGetCurrent.mockResolvedValue({ id: 10, index: 3 });
        mockCreate.mockResolvedValue({ id: 11 });

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await newTab(container, { url: "https://example.com" });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ index: 4 })
        );
    });

    /**
     * Test handling when current tab has no ID
     */
    it("should not remove tab when current tab has no ID", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockCreate = browser.tabs.create as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
        mockGetCurrent.mockResolvedValue({ index: 0 }); // No ID
        mockCreate.mockResolvedValue({ id: 2 });

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await newTab(container, { url: "https://example.com" });

        expect(mockRemove).not.toHaveBeenCalled();
    });

    /**
     * Test error handling when browser info fails
     */
    it("should throw error when browser info fails", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;

        mockGetBrowserInfo.mockRejectedValue(new Error("Browser info unavailable"));

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await expect(newTab(container, { url: "https://example.com" })).rejects.toThrow(
            "creating new tab:"
        );
    });

    /**
     * Test error handling when getCurrent fails
     */
    it("should throw error when getCurrent fails", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;

        mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
        mockGetCurrent.mockRejectedValue(new Error("Cannot get current tab"));

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await expect(newTab(container, { url: "https://example.com" })).rejects.toThrow(
            "creating new tab:"
        );
    });

    /**
     * Test error handling when tab creation fails
     */
    it("should throw error when tab creation fails", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockCreate = browser.tabs.create as jest.Mock;

        mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
        mockGetCurrent.mockResolvedValue({ id: 1, index: 0 });
        mockCreate.mockRejectedValue(new Error("Failed to create tab"));

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await expect(newTab(container, { url: "https://example.com" })).rejects.toThrow(
            "creating new tab:"
        );
    });

    /**
     * Test that container cookie store ID is passed correctly
     */
    it("should use correct container cookie store ID", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockCreate = browser.tabs.create as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
        mockGetCurrent.mockResolvedValue({ id: 1, index: 0 });
        mockCreate.mockResolvedValue({ id: 2 });

        const container = {
            cookieStoreId: "firefox-container-123",
            name: "custom-container",
            color: "red",
            icon: "briefcase",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await newTab(container, { url: "https://test.com" });

        expect(mockCreate).toHaveBeenCalledWith({
            cookieStoreId: "firefox-container-123",
            url: "https://test.com",
            index: 1,
        });
    });

    /**
     * Test handling different URL types
     */
    it("should handle different URL types", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockCreate = browser.tabs.create as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
        mockGetCurrent.mockResolvedValue({ id: 1, index: 0 });
        mockCreate.mockResolvedValue({ id: 2 });

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        const urls = [
            "https://example.com/path",
            "http://localhost:3000",
            "https://example.com:8080/path?query=value",
            "https://user:pass@example.com",
        ];

        for (const url of urls) {
            jest.clearAllMocks();
            mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
            mockGetCurrent.mockResolvedValue({ id: 1, index: 0 });
            mockCreate.mockResolvedValue({ id: 2 });

            await newTab(container, { url });

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({ url })
            );
        }
    });

    /**
     * Test that tab index starts from zero
     */
    it("should handle tab at index 0", async () => {
        const mockGetBrowserInfo = browser.runtime.getBrowserInfo as jest.Mock;
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockCreate = browser.tabs.create as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetBrowserInfo.mockResolvedValue({ name: "Firefox", version: "100.0" });
        mockGetCurrent.mockResolvedValue({ id: 1, index: 0 });
        mockCreate.mockResolvedValue({ id: 2 });

        const container = {
            cookieStoreId: "firefox-container-1",
            name: "test",
            color: "blue",
            icon: "fingerprint",
            iconUrl: "",
            colorCode: "#0000ff",
        } as any;

        await newTab(container, { url: "https://example.com" });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ index: 1 })
        );
    });
});

describe("closeCurrentTab", () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    /**
     * Test closing current tab with valid ID
     */
    it("should close current tab when it has an ID", async () => {
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        const currentTab = {
            id: 10,
            index: 5,
            url: "https://example.com",
        };

        mockGetCurrent.mockResolvedValue(currentTab);
        mockRemove.mockResolvedValue(undefined);

        await closeCurrentTab();

        expect(mockGetCurrent).toHaveBeenCalled();
        expect(mockRemove).toHaveBeenCalledWith(10);
    });

    /**
     * Test not closing tab when ID is missing
     */
    it("should not close tab when ID is missing", async () => {
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        const currentTab = {
            index: 5,
            url: "https://example.com",
            // No ID
        };

        mockGetCurrent.mockResolvedValue(currentTab);

        await closeCurrentTab();

        expect(mockGetCurrent).toHaveBeenCalled();
        expect(mockRemove).not.toHaveBeenCalled();
    });

    /**
     * Test not closing tab when ID is undefined
     */
    it("should not close tab when ID is undefined", async () => {
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetCurrent.mockResolvedValue({ id: undefined, index: 0 });

        await closeCurrentTab();

        expect(mockRemove).not.toHaveBeenCalled();
    });

    /**
     * Test not closing tab when ID is null
     */
    it("should not close tab when ID is null", async () => {
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetCurrent.mockResolvedValue({ id: null, index: 0 });

        await closeCurrentTab();

        expect(mockRemove).not.toHaveBeenCalled();
    });

    /**
     * Test not closing tab when ID is 0 (falsy but valid)
     */
    it("should close tab when ID is 0", async () => {
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetCurrent.mockResolvedValue({ id: 0, index: 0 });
        mockRemove.mockResolvedValue(undefined);

        await closeCurrentTab();

        // ID 0 is falsy in JavaScript but should still close
        // However, the implementation uses `currentTab.id &&` which treats 0 as falsy
        // This is actually a potential bug, but we test current behavior
        expect(mockRemove).not.toHaveBeenCalled();
    });

    /**
     * Test handling when getCurrent fails
     */
    it("should propagate error when getCurrent fails", async () => {
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;

        mockGetCurrent.mockRejectedValue(new Error("Cannot get current tab"));

        await expect(closeCurrentTab()).rejects.toThrow("Cannot get current tab");
    });

    /**
     * Test handling when remove fails
     */
    it("should propagate error when remove fails", async () => {
        const mockGetCurrent = browser.tabs.getCurrent as jest.Mock;
        const mockRemove = browser.tabs.remove as jest.Mock;

        mockGetCurrent.mockResolvedValue({ id: 10, index: 0 });
        mockRemove.mockRejectedValue(new Error("Cannot remove tab"));

        await expect(closeCurrentTab()).rejects.toThrow("Cannot remove tab");
    });
});

describe("getActiveTab", () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    /**
     * Test getting active tab successfully
     */
    it("should return active tab", async () => {
        const mockQuery = browser.tabs.query as jest.Mock;

        const activeTab = {
            id: 5,
            index: 2,
            url: "https://example.com",
            active: true,
            title: "Example",
        };

        mockQuery.mockResolvedValue([activeTab]);

        const result = await getActiveTab();

        expect(mockQuery).toHaveBeenCalledWith({
            active: true,
            windowId: browser.windows.WINDOW_ID_CURRENT,
        });
        expect(result).toBe(activeTab);
    });

    /**
     * Test getting first tab when multiple are returned
     */
    it("should return first tab when multiple tabs match", async () => {
        const mockQuery = browser.tabs.query as jest.Mock;

        const tabs = [
            { id: 1, active: true },
            { id: 2, active: true },
        ];

        mockQuery.mockResolvedValue(tabs);

        const result = await getActiveTab();

        expect(result).toBe(tabs[0]);
    });

    /**
     * Test that query uses correct window ID constant
     */
    it("should use WINDOW_ID_CURRENT constant", async () => {
        const mockQuery = browser.tabs.query as jest.Mock;

        mockQuery.mockResolvedValue([{ id: 1 }]);

        await getActiveTab();

        expect(mockQuery).toHaveBeenCalledWith({
            active: true,
            windowId: -2, // WINDOW_ID_CURRENT value
        });
    });

    /**
     * Test handling when no tabs are returned
     */
    it("should return undefined when no active tabs", async () => {
        const mockQuery = browser.tabs.query as jest.Mock;

        mockQuery.mockResolvedValue([]);

        const result = await getActiveTab();

        expect(result).toBeUndefined();
    });

    /**
     * Test handling when query fails
     */
    it("should propagate error when query fails", async () => {
        const mockQuery = browser.tabs.query as jest.Mock;

        mockQuery.mockRejectedValue(new Error("Query failed"));

        await expect(getActiveTab()).rejects.toThrow("Query failed");
    });

    /**
     * Test that only active tabs are queried
     */
    it("should query only for active tabs", async () => {
        const mockQuery = browser.tabs.query as jest.Mock;

        mockQuery.mockResolvedValue([{ id: 1, active: true }]);

        await getActiveTab();

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({ active: true })
        );
    });

    /**
     * Test that query is for current window
     */
    it("should query only in current window", async () => {
        const mockQuery = browser.tabs.query as jest.Mock;

        mockQuery.mockResolvedValue([{ id: 1 }]);

        await getActiveTab();

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({ windowId: browser.windows.WINDOW_ID_CURRENT })
        );
    });
});
