/**
 * Comprehensive tests for background page message handler
 * Following patterns from Python tests: extensive mocking, edge cases, clear naming
 */

import browser from "webextension-polyfill";

// Mock the webextension-polyfill
jest.mock("webextension-polyfill", () => ({
    runtime: {
        onMessage: {
            addListener: jest.fn(),
        },
    },
}));

// Mock console.log to verify logging
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

describe("backgroundPage", () => {
    let messageListener: ((request: unknown) => void) | null = null;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        messageListener = null;

        // Capture the message listener when it's added
        const mockAddListener = browser.runtime.onMessage.addListener as jest.Mock;
        mockAddListener.mockImplementation((listener) => {
            messageListener = listener;
        });

        // Re-import the module to trigger the listener setup
        jest.isolateModules(() => {
            require("@/backgroundPage");
        });
    });

    afterAll(() => {
        // Restore console.log
        mockConsoleLog.mockRestore();
    });

    /**
     * Test that message listener is registered
     */
    it("should register message listener on load", () => {
        const mockAddListener = browser.runtime.onMessage.addListener as jest.Mock;
        expect(mockAddListener).toHaveBeenCalled();
    });

    /**
     * Test handling popupMounted message
     */
    it("should log message when popupMounted is true", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { popupMounted: true };
        messageListener(request);

        expect(mockConsoleLog).toHaveBeenCalledWith(
            "backgroundPage notified that Popup.tsx has mounted."
        );
    });

    /**
     * Test that popupMounted: false doesn't log
     */
    it("should not log when popupMounted is false", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { popupMounted: false };
        messageListener(request);

        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test that missing popupMounted doesn't log
     */
    it("should not log when popupMounted is missing", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { otherField: "value" };
        messageListener(request);

        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test handling empty object
     */
    it("should handle empty object without error", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = {};
        expect(() => messageListener!(request)).not.toThrow();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test handling null request
     */
    it("should handle null request without error", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        expect(() => messageListener!(null)).not.toThrow();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test handling undefined request
     */
    it("should handle undefined request without error", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        expect(() => messageListener!(undefined)).not.toThrow();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test handling string request
     */
    it("should handle string request without error", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        expect(() => messageListener!("string message")).not.toThrow();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test handling number request
     */
    it("should handle number request without error", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        expect(() => messageListener!(123)).not.toThrow();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test handling array request
     */
    it("should handle array request without error", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        expect(() => messageListener!([1, 2, 3])).not.toThrow();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test that popupMounted with other fields still logs
     */
    it("should log when popupMounted is true regardless of other fields", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = {
            popupMounted: true,
            otherField: "value",
            anotherField: 123,
        };
        messageListener(request);

        expect(mockConsoleLog).toHaveBeenCalledWith(
            "backgroundPage notified that Popup.tsx has mounted."
        );
    });

    /**
     * Test handling popupMounted with truthy non-boolean values
     */
    it("should log when popupMounted is truthy string", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { popupMounted: "yes" };
        messageListener(request);

        // String "yes" is truthy
        expect(mockConsoleLog).toHaveBeenCalled();
    });

    /**
     * Test handling popupMounted with truthy number
     */
    it("should log when popupMounted is truthy number", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { popupMounted: 1 };
        messageListener(request);

        // Number 1 is truthy
        expect(mockConsoleLog).toHaveBeenCalled();
    });

    /**
     * Test handling popupMounted: 0 (falsy number)
     */
    it("should not log when popupMounted is 0", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { popupMounted: 0 };
        messageListener(request);

        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test handling popupMounted: empty string (falsy)
     */
    it("should not log when popupMounted is empty string", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { popupMounted: "" };
        messageListener(request);

        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    /**
     * Test that listener doesn't return a value (synchronous)
     */
    it("should not return a value from listener", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = { popupMounted: true };
        const result = messageListener(request);

        expect(result).toBeUndefined();
    });

    /**
     * Test multiple calls to listener
     */
    it("should handle multiple sequential messages", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        messageListener({ popupMounted: true });
        messageListener({ popupMounted: false });
        messageListener({ popupMounted: true });

        expect(mockConsoleLog).toHaveBeenCalledTimes(2);
    });

    /**
     * Test that listener handles nested objects
     */
    it("should handle nested objects in request", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        const request = {
            popupMounted: true,
            nested: {
                field: "value",
                deep: {
                    value: 123,
                },
            },
        };

        expect(() => messageListener!(request)).not.toThrow();
        expect(mockConsoleLog).toHaveBeenCalled();
    });

    /**
     * Test case sensitivity of popupMounted field
     */
    it("should be case sensitive for popupMounted field name", () => {
        if (!messageListener) {
            throw new Error("Message listener was not registered");
        }

        // Wrong case variations
        const requests = [
            { PopupMounted: true },
            { popupmounted: true },
            { POPUPMOUNTED: true },
            { popup_mounted: true },
        ];

        requests.forEach((request) => {
            mockConsoleLog.mockClear();
            messageListener!(request);
            expect(mockConsoleLog).not.toHaveBeenCalled();
        });
    });
});
