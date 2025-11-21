/**
 * Tests for shared constants module
 */

import {
    CONTAINER_COLORS,
    CONTAINER_ICONS,
    DEFAULT_ICON,
    CUSTOM_PROTOCOL_PREFIX,
    AWS_REGIONS,
    DEFAULT_REGION,
    PROFILE_CACHE_DURATION,
    MAX_RECENT_PROFILES,
    NATIVE_MESSAGING_HOST,
    ContainerColor,
    ContainerIcon,
} from "./index";

describe("Container Colors", () => {
    /**
     * Test that CONTAINER_COLORS contains all Firefox container colors
     */
    it("should contain all valid Firefox container colors", () => {
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

    /**
     * Test that CONTAINER_COLORS is a readonly array
     */
    it("should be a readonly array", () => {
        expect(Array.isArray(CONTAINER_COLORS)).toBe(true);
        expect(CONTAINER_COLORS.length).toBe(8);
    });

    /**
     * Test that all colors are strings
     */
    it("should contain only string values", () => {
        CONTAINER_COLORS.forEach((color) => {
            expect(typeof color).toBe("string");
        });
    });
});

describe("Container Icons", () => {
    /**
     * Test that CONTAINER_ICONS contains all Firefox container icons
     */
    it("should contain all valid Firefox container icons", () => {
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

    /**
     * Test that CONTAINER_ICONS is a readonly array
     */
    it("should be a readonly array", () => {
        expect(Array.isArray(CONTAINER_ICONS)).toBe(true);
        expect(CONTAINER_ICONS.length).toBe(12);
    });

    /**
     * Test that all icons are strings
     */
    it("should contain only string values", () => {
        CONTAINER_ICONS.forEach((icon) => {
            expect(typeof icon).toBe("string");
        });
    });
});

describe("Default Icon", () => {
    /**
     * Test that DEFAULT_ICON is a valid container icon
     */
    it('should be "fingerprint"', () => {
        expect(DEFAULT_ICON).toBe("fingerprint");
    });

    /**
     * Test that DEFAULT_ICON is in CONTAINER_ICONS
     */
    it("should be a valid container icon", () => {
        expect(CONTAINER_ICONS).toContain(DEFAULT_ICON);
    });
});

describe("Custom Protocol Prefix", () => {
    /**
     * Test the custom protocol prefix value
     */
    it('should be "ext+container:"', () => {
        expect(CUSTOM_PROTOCOL_PREFIX).toBe("ext+container:");
    });

    /**
     * Test that it can be used in URL construction
     */
    it("should be usable in URL construction", () => {
        const testUrl = `${CUSTOM_PROTOCOL_PREFIX}test`;
        expect(testUrl).toBe("ext+container:test");
    });
});

describe("AWS Regions", () => {
    /**
     * Test that AWS_REGIONS contains expected regions
     */
    it("should contain all configured AWS regions", () => {
        expect(AWS_REGIONS).toHaveLength(29);
    });

    /**
     * Test that each region has required properties
     */
    it("should have code and name for each region", () => {
        AWS_REGIONS.forEach((region) => {
            expect(region).toHaveProperty("code");
            expect(region).toHaveProperty("name");
            expect(typeof region.code).toBe("string");
            expect(typeof region.name).toBe("string");
        });
    });

    /**
     * Test specific regions
     */
    it("should contain us-east-1 region", () => {
        const usEast1 = AWS_REGIONS.find((r) => r.code === "us-east-1");
        expect(usEast1).toBeDefined();
        expect(usEast1?.name).toBe("US East (N. Virginia)");
    });

    it("should contain eu-west-1 region", () => {
        const euWest1 = AWS_REGIONS.find((r) => r.code === "eu-west-1");
        expect(euWest1).toBeDefined();
        expect(euWest1?.name).toBe("Europe (Ireland)");
    });

    it("should contain ap-southeast-1 region", () => {
        const apSoutheast1 = AWS_REGIONS.find(
            (r) => r.code === "ap-southeast-1",
        );
        expect(apSoutheast1).toBeDefined();
        expect(apSoutheast1?.name).toBe("Asia Pacific (Singapore)");
    });

    /**
     * Test that all region codes are unique
     */
    it("should have unique region codes", () => {
        const codes = AWS_REGIONS.map((r) => r.code);
        const uniqueCodes = new Set(codes);
        expect(uniqueCodes.size).toBe(codes.length);
    });

    /**
     * Test that all region codes follow AWS format
     */
    it("should have valid AWS region code format", () => {
        const regionCodePattern = /^[a-z]{2}-[a-z]+-\d+$/;
        AWS_REGIONS.forEach((region) => {
            expect(region.code).toMatch(regionCodePattern);
        });
    });
});

describe("Default Region", () => {
    /**
     * Test the default region value
     */
    it('should be "us-east-1"', () => {
        expect(DEFAULT_REGION).toBe("us-east-1");
    });

    /**
     * Test that DEFAULT_REGION exists in AWS_REGIONS
     */
    it("should be a valid AWS region", () => {
        const regionCodes = AWS_REGIONS.map((r) => r.code);
        expect(regionCodes).toContain(DEFAULT_REGION);
    });
});

describe("Profile Cache Duration", () => {
    /**
     * Test that cache duration is 5 minutes in milliseconds
     */
    it("should be 5 minutes in milliseconds", () => {
        const expectedDuration = 5 * 60 * 1000; // 300,000 ms
        expect(PROFILE_CACHE_DURATION).toBe(expectedDuration);
        expect(PROFILE_CACHE_DURATION).toBe(300000);
    });

    /**
     * Test that cache duration is a positive number
     */
    it("should be a positive number", () => {
        expect(PROFILE_CACHE_DURATION).toBeGreaterThan(0);
        expect(typeof PROFILE_CACHE_DURATION).toBe("number");
    });
});

describe("Max Recent Profiles", () => {
    /**
     * Test the maximum recent profiles value
     */
    it("should be 10", () => {
        expect(MAX_RECENT_PROFILES).toBe(10);
    });

    /**
     * Test that it's a positive integer
     */
    it("should be a positive integer", () => {
        expect(MAX_RECENT_PROFILES).toBeGreaterThan(0);
        expect(Number.isInteger(MAX_RECENT_PROFILES)).toBe(true);
    });
});

describe("Native Messaging Host", () => {
    /**
     * Test the native messaging host name
     */
    it('should be "aws_profile_bridge"', () => {
        expect(NATIVE_MESSAGING_HOST).toBe("aws_profile_bridge");
    });

    /**
     * Test that it's a valid identifier
     */
    it("should be a valid identifier (no spaces or special chars)", () => {
        expect(NATIVE_MESSAGING_HOST).toMatch(/^[a-z_]+$/);
    });
});

describe("TypeScript Type Safety", () => {
    /**
     * Test that ContainerColor type works correctly
     */
    it("should enforce ContainerColor type", () => {
        const validColor: ContainerColor = "blue";
        expect(CONTAINER_COLORS).toContain(validColor);
    });

    /**
     * Test that ContainerIcon type works correctly
     */
    it("should enforce ContainerIcon type", () => {
        const validIcon: ContainerIcon = "fingerprint";
        expect(CONTAINER_ICONS).toContain(validIcon);
    });
});
