/**
 * Tests for API Client
 */

import {
    ApiClientError,
    validateTokenFormat,
    isLegacyToken,
    getApiToken,
    setApiToken,
    clearApiToken,
    checkApiHealth,
    getProfiles,
    getProfilesEnriched,
    getConsoleUrl,
    getApiVersion,
    getRegions,
} from "./apiClient";
import { browser } from "./browserUtils";

jest.mock("./browserUtils", () => ({
    browser: {
        storage: {
            local: {
                get: jest.fn(),
                set: jest.fn(),
                remove: jest.fn(),
            },
            onChanged: {
                addListener: jest.fn(),
            },
        },
    },
}));

global.fetch = jest.fn();

describe("ApiClientError", () => {
    it("should create error with message and status code", () => {
        const error = new ApiClientError("Test error", 404);
        expect(error.message).toBe("Test error");
        expect(error.statusCode).toBe(404);
        expect(error.name).toBe("ApiClientError");
    });
});

describe("validateTokenFormat", () => {
    it("should reject empty token", () => {
        expect(validateTokenFormat("")).toBe(false);
    });

    it("should accept legacy token format", () => {
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
        expect(validateTokenFormat("a".repeat(32))).toBe(true);
        consoleWarnSpy.mockRestore();
    });

    it("should reject token with wrong checksum", () => {
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
        expect(validateTokenFormat("awspc_abc123_wrong0")).toBe(false);
        consoleWarnSpy.mockRestore();
    });

    it("should reject token with wrong parts", () => {
        expect(validateTokenFormat("awspc_abc123")).toBe(false);
    });
});

describe("isLegacyToken", () => {
    it("should return true for legacy token", () => {
        expect(isLegacyToken("a".repeat(32))).toBe(true);
    });

    it("should return false for new format", () => {
        expect(isLegacyToken("awspc_abc123_1a2b3c")).toBe(false);
    });
});

describe("getApiToken", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await clearApiToken();
    });

    it("should retrieve token from storage", async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test-token" });
        expect(await getApiToken()).toBe("test-token");
    });

    it("should return null when no token", async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
        expect(await getApiToken()).toBeNull();
    });

    it("should return cached token", async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "cached" });
        await getApiToken();
        await getApiToken();
        expect(browser.storage.local.get).toHaveBeenCalledTimes(1);
    });

    it("should return null for non-string", async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: 123 });
        expect(await getApiToken()).toBeNull();
    });
});

describe("setApiToken", () => {
    beforeEach(async () => {
        await clearApiToken();
    });

    it("should store valid token", async () => {
        await setApiToken("a".repeat(32));
        expect(browser.storage.local.set).toHaveBeenCalled();
    });

    it("should throw for invalid token", async () => {
        await expect(setApiToken("invalid")).rejects.toThrow(/Invalid token format/);
    });
});

describe("clearApiToken", () => {
    it("should remove token", async () => {
        await clearApiToken();
        expect(browser.storage.local.remove).toHaveBeenCalled();
    });
});

describe("checkApiHealth", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
    });

    it("should return true when healthy", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        expect(await checkApiHealth()).toBe(true);
    });

    it("should return false on error", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error());
        expect(await checkApiHealth()).toBe(false);
    });
});

describe("getProfiles", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test" });
    });

    it("should fetch profiles", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ profiles: [] }),
        });
        expect(await getProfiles()).toEqual({ profiles: [] });
    });

    it("should throw on 401", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
        await expect(getProfiles()).rejects.toThrow(/Authentication failed/);
    });

    it("should throw on 429", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });
        await expect(getProfiles()).rejects.toThrow(/Rate limit/);
    });

    it("should handle timeout", async () => {
        (global.fetch as jest.Mock).mockImplementation(() => {
            const error = new Error();
            error.name = "AbortError";
            return Promise.reject(error);
        });
        await expect(getProfiles()).rejects.toThrow(/timed out/);
    });

    it("should handle connection error", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new TypeError("fetch failed"));
        await expect(getProfiles()).rejects.toThrow(/Cannot connect/);
    });

    it("should handle error action", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ action: "error" }),
        });
        await expect(getProfiles()).rejects.toThrow(/Server returned error/);
    });
});

describe("getProfilesEnriched", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test" });
    });

    it("should fetch enriched profiles", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ profiles: [] }),
        });
        expect(await getProfilesEnriched()).toEqual({ profiles: [] });
    });
});

describe("getConsoleUrl", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test" });
    });

    it("should fetch console URL", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://console.aws.amazon.com" }),
        });
        expect(await getConsoleUrl("test")).toEqual({ url: "https://console.aws.amazon.com" });
    });

    it("should throw on 404", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
        await expect(getConsoleUrl("missing")).rejects.toThrow(/not found/);
    });

    it("should encode profile name", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://console.aws.amazon.com" }),
        });
        await getConsoleUrl("profile with spaces");
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("profile%20with%20spaces"),
            expect.any(Object)
        );
    });
});

describe("getApiVersion", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
    });

    it("should fetch version", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ version: "1.0.0" }),
        });
        expect(await getApiVersion()).toEqual({ version: "1.0.0" });
    });
});

describe("getRegions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "test" });
    });

    it("should fetch regions", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ regions: [{ code: "us-east-1", name: "US East" }] }),
        });
        const result = await getRegions();
        expect(result.regions).toHaveLength(1);
    });
});

describe("storage change listener", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await clearApiToken();
    });

    it("should invalidate cache on token change", async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "token1" });
        await getApiToken();
        
        const addListenerMock = browser.storage.onChanged.addListener as jest.Mock;
        if (addListenerMock.mock.calls.length > 0) {
            const listener = addListenerMock.mock.calls[0][0];
            listener({ apiToken: { newValue: "token2" } }, "local");

            (browser.storage.local.get as jest.Mock).mockResolvedValue({ apiToken: "token2" });
            expect(await getApiToken()).toBe("token2");
        }
    });
});
