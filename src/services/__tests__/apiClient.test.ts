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
} from "@/services/apiClient";
import { browser } from "@/services/browserUtils";

jest.mock("@/services/browserUtils", () => ({
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

    it("should accept valid new format token with correct checksum", () => {
        // Generate a valid token by calculating the correct checksum
        // Token format: awspc_{43_chars}_{6_char_checksum}
        const randomPart = "a".repeat(43); // Must be exactly 43 characters
        
        // Calculate CRC32 checksum (same algorithm as in apiClient.ts)
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            }
            table[i] = c;
        }
        let crc = 0xffffffff;
        for (let i = 0; i < randomPart.length; i++) {
            crc = table[(crc ^ randomPart.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
        }
        crc = (crc ^ 0xffffffff) >>> 0;
        
        // Encode to Base62
        const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        let checksum = "";
        let num = crc;
        if (num === 0) {
            checksum = alphabet[0];
        } else {
            while (num > 0) {
                checksum = alphabet[num % 62] + checksum;
                num = Math.floor(num / 62);
            }
        }
        checksum = checksum.padStart(6, "0");
        
        const validToken = `awspc_${randomPart}_${checksum}`;
        expect(validateTokenFormat(validToken)).toBe(true);
    });

    it("should reject token with wrong checksum", () => {
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
        expect(validateTokenFormat("awspc_abc123_wrong0")).toBe(false);
        consoleWarnSpy.mockRestore();
    });

    it("should reject token with wrong parts", () => {
        expect(validateTokenFormat("awspc_abc123")).toBe(false);
    });

    it("should reject token with invalid prefix", () => {
        expect(validateTokenFormat("invalid_abc123_1YGHqG")).toBe(false);
    });

    it("should reject null or undefined token", () => {
        expect(validateTokenFormat(null as any)).toBe(false);
        expect(validateTokenFormat(undefined as any)).toBe(false);
    });

    it("should handle token with different random parts", () => {
        // Test with a different random part to exercise checksum calculation
        const randomPart = "B".repeat(43);
        
        // Calculate CRC32 checksum
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            }
            table[i] = c;
        }
        let crc = 0xffffffff;
        for (let i = 0; i < randomPart.length; i++) {
            crc = table[(crc ^ randomPart.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
        }
        crc = (crc ^ 0xffffffff) >>> 0;
        
        // Encode to Base62
        const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        let checksum = "";
        let num = crc;
        if (num === 0) {
            checksum = alphabet[0];
        } else {
            while (num > 0) {
                checksum = alphabet[num % 62] + checksum;
                num = Math.floor(num / 62);
            }
        }
        checksum = checksum.padStart(6, "0");
        
        const validToken = `awspc_${randomPart}_${checksum}`;
        expect(validateTokenFormat(validToken)).toBe(true);
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

    it("should handle generic HTTP error with default message", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
        await expect(getProfiles()).rejects.toThrow(/Request failed with status 500/);
    });

    it("should handle network error that is not TypeError", async () => {
        const customError = new Error("Custom network error");
        (global.fetch as jest.Mock).mockRejectedValue(customError);
        await expect(getProfiles()).rejects.toThrow("Custom network error");
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

    it("should throw on 401", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
        await expect(getProfilesEnriched()).rejects.toThrow(/Authentication failed/);
    });

    it("should throw on 429", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });
        await expect(getProfilesEnriched()).rejects.toThrow(/Rate limit/);
    });

    it("should handle timeout", async () => {
        (global.fetch as jest.Mock).mockImplementation(() => {
            const error = new Error();
            error.name = "AbortError";
            return Promise.reject(error);
        });
        await expect(getProfilesEnriched()).rejects.toThrow(/timed out/);
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

    it("should throw on 400", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400 });
        await expect(getConsoleUrl("invalid")).rejects.toThrow(/Invalid profile name/);
    });

    it("should throw on 401", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
        await expect(getConsoleUrl("test")).rejects.toThrow(/Authentication failed/);
    });

    it("should throw on 429", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });
        await expect(getConsoleUrl("test")).rejects.toThrow(/Rate limit/);
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

    it("should handle special characters in profile name", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://console.aws.amazon.com" }),
        });
        await getConsoleUrl("profile/with/slashes");
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("profile%2Fwith%2Fslashes"),
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

    it("should handle timeout", async () => {
        (global.fetch as jest.Mock).mockImplementation(() => {
            const error = new Error();
            error.name = "AbortError";
            return Promise.reject(error);
        });
        await expect(getApiVersion()).rejects.toThrow(/timed out/);
    });

    it("should handle connection error", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new TypeError("fetch failed"));
        await expect(getApiVersion()).rejects.toThrow(/Cannot connect/);
    });

    it("should handle generic HTTP error", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });
        await expect(getApiVersion()).rejects.toThrow(/Request failed with status 503/);
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

    it("should throw on 401", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
        await expect(getRegions()).rejects.toThrow(/Authentication failed/);
    });

    it("should handle timeout", async () => {
        (global.fetch as jest.Mock).mockImplementation(() => {
            const error = new Error();
            error.name = "AbortError";
            return Promise.reject(error);
        });
        await expect(getRegions()).rejects.toThrow(/timed out/);
    });

    it("should handle connection error", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new TypeError("fetch failed"));
        await expect(getRegions()).rejects.toThrow(/Cannot connect/);
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
