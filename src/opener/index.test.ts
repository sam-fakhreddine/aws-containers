/**
 * Comprehensive tests for opener entry point
 * Following patterns from Python tests: extensive mocking, edge cases, clear naming
 */

// Mock all dependencies before importing
jest.mock("./containers");
jest.mock("./parser");
jest.mock("./tabs");

import { prepareContainer } from "./containers";
import { parseOpenerParams } from "./parser";
import { newTab } from "./tabs";
import { error, openTabInContainer, main } from "./index";

describe("opener module", () => {
    let mockPrepareContainer: jest.MockedFunction<typeof prepareContainer>;
    let mockParseOpenerParams: jest.MockedFunction<typeof parseOpenerParams>;
    let mockNewTab: jest.MockedFunction<typeof newTab>;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Get typed mock references
        mockPrepareContainer = prepareContainer as jest.MockedFunction<typeof prepareContainer>;
        mockParseOpenerParams = parseOpenerParams as jest.MockedFunction<typeof parseOpenerParams>;
        mockNewTab = newTab as jest.MockedFunction<typeof newTab>;

        // Set up DOM elements for error display
        document.body.innerHTML = `
            <div id="internalErrorContainer" class="hidden">
                <p id="internalErrorBody"></p>
            </div>
        `;

        // Clear console mocks
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("error function", () => {
        /**
         * Test that error displays message in DOM
         */
        it("should display error message in DOM", () => {
            const errorMessage = "Test error message";

            error(errorMessage);

            const errorBody = document.getElementById("internalErrorBody");
            const errorWrapper = document.getElementById("internalErrorContainer");

            expect(errorBody?.textContent).toBe(errorMessage);
            expect(errorWrapper?.classList.contains("hidden")).toBe(false);
        });

        /**
         * Test that error logs to console
         */
        it("should log error to console", () => {
            const errorMessage = "Console error test";
            const consoleSpy = jest.spyOn(console, "error");

            error(errorMessage);

            expect(consoleSpy).toHaveBeenCalledWith(errorMessage);
        });

        /**
         * Test handling when error body element is missing
         */
        it("should handle missing error body element", () => {
            document.body.innerHTML = `
                <div id="internalErrorContainer" class="hidden"></div>
            `;

            expect(() => error("test")).not.toThrow();
        });

        /**
         * Test handling when error wrapper element is missing
         */
        it("should handle missing error wrapper element", () => {
            document.body.innerHTML = `
                <p id="internalErrorBody"></p>
            `;

            expect(() => error("test")).not.toThrow();
        });

        /**
         * Test handling when both elements are missing
         */
        it("should handle missing DOM elements gracefully", () => {
            document.body.innerHTML = "";

            expect(() => error("test")).not.toThrow();
        });

        /**
         * Test error with different data types
         */
        it("should handle different error types", () => {
            const errorBody = document.getElementById("internalErrorBody");

            // String error
            error("string error");
            expect(errorBody?.textContent).toBe("string error");

            // Number error
            error(404);
            expect(errorBody?.textContent).toBe("404");

            // Object error
            const objError = { message: "object error" };
            error(objError);
            expect(errorBody?.textContent).toBe(objError.toString());

            // Error object
            const errObj = new Error("Error object");
            error(errObj);
            expect(errorBody?.textContent).toContain("Error");
        });

        /**
         * Test that error removes hidden class
         */
        it("should remove hidden class from error container", () => {
            const errorWrapper = document.getElementById("internalErrorContainer");
            expect(errorWrapper?.classList.contains("hidden")).toBe(true);

            error("test");

            expect(errorWrapper?.classList.contains("hidden")).toBe(false);
        });
    });

    describe("openTabInContainer function", () => {
        /**
         * Test successful container opening
         */
        it("should prepare container and open new tab", async () => {
            const container = {
                name: "test-container",
                url: "https://example.com",
                color: "blue",
                icon: "fingerprint",
            };

            const preparedContainer = {
                cookieStoreId: "firefox-container-1",
                name: "test-container",
                color: "blue",
                icon: "fingerprint",
                iconUrl: "",
                colorCode: "#0000ff",
            } as any;

            mockPrepareContainer.mockResolvedValue(preparedContainer);
            mockNewTab.mockResolvedValue(undefined);

            await openTabInContainer(container);

            expect(mockPrepareContainer).toHaveBeenCalledWith(container);
            expect(mockNewTab).toHaveBeenCalledWith(preparedContainer, container);
        });

        /**
         * Test error handling when prepareContainer fails
         */
        it("should propagate error when prepareContainer fails", async () => {
            const container = {
                name: "test-container",
                url: "https://example.com",
            };

            mockPrepareContainer.mockRejectedValue(new Error("Failed to prepare container"));

            await expect(openTabInContainer(container)).rejects.toThrow("Failed to prepare container");
        });

        /**
         * Test error handling when newTab fails
         */
        it("should propagate error when newTab fails", async () => {
            const container = {
                name: "test-container",
                url: "https://example.com",
            };

            const preparedContainer = {
                cookieStoreId: "firefox-container-1",
                name: "test-container",
            } as any;

            mockPrepareContainer.mockResolvedValue(preparedContainer);
            mockNewTab.mockRejectedValue(new Error("Failed to create tab"));

            await expect(openTabInContainer(container)).rejects.toThrow("Failed to create tab");
        });

        /**
         * Test that functions are called in correct order
         */
        it("should call prepareContainer before newTab", async () => {
            const container = {
                name: "test-container",
                url: "https://example.com",
            };

            const preparedContainer = {
                cookieStoreId: "firefox-container-1",
            } as any;

            const callOrder: string[] = [];

            mockPrepareContainer.mockImplementation(async () => {
                callOrder.push("prepareContainer");
                return preparedContainer;
            });

            mockNewTab.mockImplementation(async () => {
                callOrder.push("newTab");
            });

            await openTabInContainer(container);

            expect(callOrder).toEqual(["prepareContainer", "newTab"]);
        });
    });

    describe("main function", () => {
        let originalHash: string;

        beforeEach(() => {
            // Store original hash
            originalHash = window.location.hash;
        });

        afterEach(() => {
            // Restore original hash
            window.location.hash = originalHash;
        });

        /**
         * Test successful main execution
         */
        it("should parse params and open container", async () => {
            const container = {
                name: "test-container",
                url: "https://example.com",
            };

            const preparedContainer = {
                cookieStoreId: "firefox-container-1",
            } as any;

            // Set window hash
            window.location.hash = "#name=test&url=https://example.com";

            mockParseOpenerParams.mockReturnValue(container);
            mockPrepareContainer.mockResolvedValue(preparedContainer);
            mockNewTab.mockResolvedValue(undefined);

            await main();

            expect(mockParseOpenerParams).toHaveBeenCalled();
            expect(mockPrepareContainer).toHaveBeenCalledWith(container);
            expect(mockNewTab).toHaveBeenCalledWith(preparedContainer, container);
        });

        /**
         * Test error handling in main
         */
        it("should display error when parsing fails", async () => {
            window.location.hash = "#invalid";

            const parseError = new Error("Invalid parameters");
            mockParseOpenerParams.mockImplementation(() => {
                throw parseError;
            });

            await main();

            const errorBody = document.getElementById("internalErrorBody");
            expect(errorBody?.textContent).toBe(parseError.toString());
        });

        /**
         * Test error handling when container preparation fails
         */
        it("should display error when container preparation fails", async () => {
            const container = {
                name: "test-container",
                url: "https://example.com",
            };

            window.location.hash = "#name=test&url=https://example.com";

            mockParseOpenerParams.mockReturnValue(container);
            mockPrepareContainer.mockRejectedValue(new Error("Container preparation failed"));

            await main();

            const errorBody = document.getElementById("internalErrorBody");
            expect(errorBody?.textContent).toContain("Container preparation failed");
        });

        /**
         * Test error handling when tab creation fails
         */
        it("should display error when tab creation fails", async () => {
            const container = {
                name: "test-container",
                url: "https://example.com",
            };

            const preparedContainer = {
                cookieStoreId: "firefox-container-1",
            } as any;

            window.location.hash = "#name=test&url=https://example.com";

            mockParseOpenerParams.mockReturnValue(container);
            mockPrepareContainer.mockResolvedValue(preparedContainer);
            mockNewTab.mockRejectedValue(new Error("Tab creation failed"));

            await main();

            const errorBody = document.getElementById("internalErrorBody");
            expect(errorBody?.textContent).toContain("Tab creation failed");
        });

        /**
         * Test that main handles empty hash
         */
        it("should handle empty hash gracefully", async () => {
            window.location.hash = "";

            mockParseOpenerParams.mockImplementation(() => {
                throw new Error("Empty hash");
            });

            await main();

            const errorWrapper = document.getElementById("internalErrorContainer");
            expect(errorWrapper?.classList.contains("hidden")).toBe(false);
        });

        /**
         * Test that error in main returns early
         */
        it("should return early after error", async () => {
            window.location.hash = "#invalid";

            mockParseOpenerParams.mockImplementation(() => {
                throw new Error("Parse error");
            });

            const result = await main();

            expect(result).toBeUndefined();
            // Should not call these functions after error
            expect(mockPrepareContainer).not.toHaveBeenCalled();
            expect(mockNewTab).not.toHaveBeenCalled();
        });
    });
});
